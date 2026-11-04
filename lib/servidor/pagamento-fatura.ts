// Pagamento das faturas por PIX do Mercado Pago, com baixa automática.
// Uso exclusivo das rotas de API.
import type { SupabaseClient } from "@supabase/supabase-js";
import { usuarioDaRequisicao, supabaseServico, enviarEmail, configPlataforma } from "./servicos";
import { criarPix, buscarPagamento } from "./mercadopago";
import { modelos, SITE } from "../emails/modelos";

export const urlBase = () => process.env.SITE_URL ?? SITE;

export interface FaturaPix {
  id: string;
  numero: number;
  company_id: string;
  descricao: string;
  valor: number;
  vencimento: string;
  status: "pendente" | "paga" | "cancelada";
  pago_em: string | null;
  valor_pago: number | null;
  mp_pix_payment_id: string | null;
  mp_pix_qr: string | null;
  mp_pix_expira_em: string | null;
  token: string;
  companies: { name: string } | null;
}

export const CAMPOS_PIX = "id, numero, company_id, descricao, valor, vencimento, status, pago_em, valor_pago, mp_pix_payment_id, mp_pix_qr, mp_pix_expira_em, token, companies(name)";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Quem chama precisa ser da empresa dona da fatura (as políticas do banco só
// mostram as faturas da própria empresa) ou da equipe ARXUM. Sem login, vale
// o link público da fatura (o token que vai nos e-mails).
export async function faturaAutorizada(req: Request, pedido: { fatura_id?: unknown; token?: unknown }) {
  const db = supabaseServico();
  if (typeof pedido.token === "string") {
    if (!UUID.test(pedido.token)) return { erro: "Link inválido.", status: 404 } as const;
    const { data } = await db.from("faturas").select(CAMPOS_PIX).eq("token", pedido.token).maybeSingle();
    if (!data) return { erro: "Fatura não encontrada.", status: 404 } as const;
    return { db, fatura: data as unknown as FaturaPix, usuario: null };
  }

  const faturaId = pedido.fatura_id;
  if (typeof faturaId !== "string" || !UUID.test(faturaId)) return { erro: "Pedido inválido.", status: 400 } as const;
  const sessao = await usuarioDaRequisicao(req);
  if (!sessao) return { erro: "Entre novamente.", status: 401 } as const;
  const { data: admin } = await sessao.cliente.rpc("eh_admin_plataforma");
  if (admin !== true) {
    const { data } = await sessao.cliente.from("faturas").select("id").eq("id", faturaId).maybeSingle();
    if (!data) return { erro: "Fatura não encontrada.", status: 404 } as const;
  }
  const { data: fatura } = await db.from("faturas").select(CAMPOS_PIX).eq("id", faturaId).maybeSingle();
  if (!fatura) return { erro: "Fatura não encontrada.", status: 404 } as const;
  return { db, fatura: fatura as unknown as FaturaPix, usuario: sessao.usuario };
}

// Devolve o PIX da fatura, reaproveitando o que já foi gerado enquanto ele
// valer por mais de 10 minutos; senão cria outro no Mercado Pago.
export async function pixDaFatura(db: SupabaseClient, f: FaturaPix, emailReserva: string | undefined) {
  const valido = f.mp_pix_qr && f.mp_pix_expira_em && Date.parse(f.mp_pix_expira_em) > Date.now() + 10 * 60_000;
  if (valido) return { qr: f.mp_pix_qr!, expira_em: f.mp_pix_expira_em! };

  const { data: email } = await db.rpc("email_empresa", { p_company: f.company_id });
  const pix = await criarPix({
    faturaId: f.id,
    companyId: f.company_id,
    descricao: `ARXUM Crew · fatura nº ${f.numero}`,
    valor: Number(f.valor),
    emailPagador: (email as string | null) ?? emailReserva ?? "financeiro@arxum.com.br",
    urlBase: urlBase(),
  });
  await db.from("faturas").update({ mp_pix_payment_id: pix.id, mp_pix_qr: pix.qr, mp_pix_expira_em: pix.expiraEm }).eq("id", f.id);
  return { qr: pix.qr, expira_em: pix.expiraEm };
}

// Registra um pagamento do Mercado Pago na fatura. Se ele deu baixa agora,
// manda o e-mail de agradecimento na hora.
export async function registrarPagamento(db: SupabaseClient, faturaId: string, pagamento: {
  id: number | string; status: string; status_detail: string | null; transaction_amount: number;
  payment_type_id: string | null; date_approved: string | null;
}) {
  const { data, error } = await db.rpc("servico_registrar_pagamento_mp", {
    p_fatura: faturaId,
    p_payment_id: String(pagamento.id),
    p_status: pagamento.status,
    p_status_detail: pagamento.status_detail,
    p_valor: pagamento.transaction_amount,
    p_forma: pagamento.payment_type_id,
    p_aprovado_em: pagamento.date_approved,
  });
  if (error) throw new Error(error.message);
  if (data === "baixada") await agradecer(db, faturaId);
  return data as string;
}

// Conferência ativa: se o aviso do Mercado Pago ainda não chegou, pergunta
// direto à API se o PIX da fatura foi pago.
export async function conferirFatura(db: SupabaseClient, f: FaturaPix) {
  if (f.status !== "pendente" || !f.mp_pix_payment_id) return f.status;
  const pagamento = await buscarPagamento(f.mp_pix_payment_id);
  if (pagamento?.status === "approved") {
    const resultado = await registrarPagamento(db, f.id, pagamento);
    if (resultado === "baixada" || resultado === "ja_paga") return "paga";
  }
  return f.status;
}

async function agradecer(db: SupabaseClient, faturaId: string) {
  const { data: f } = await db.from("faturas").select(CAMPOS_PIX).eq("id", faturaId).single();
  if (!f) return;
  const fatura = f as unknown as FaturaPix;
  const [{ data: para }, cfg] = await Promise.all([db.rpc("email_empresa", { p_company: fatura.company_id }), configPlataforma(db)]);
  await enviarEmail(db, {
    para: (para as string | null) ?? [],
    email: modelos.agradecimento({
      numero: fatura.numero, empresa: fatura.companies?.name ?? "", descricao: fatura.descricao, valor: Number(fatura.valor),
      vencimento: fatura.vencimento, token: fatura.token, valor_pago: fatura.valor_pago != null ? Number(fatura.valor_pago) : null, pago_em: fatura.pago_em,
    }),
    tipo: "agradecimento", companyId: fatura.company_id, faturaId: fatura.id, automatico: true, responderPara: cfg.email_suporte,
  });
}
