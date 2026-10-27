// E-mails enviados pelo painel da ARXUM: cobrança de uma fatura (com mensagem
// opcional), agradecimento de pagamento e mensagem livre para uma empresa.
import { exigirAdmin, supabaseServico, enviarEmail, configPlataforma } from "@/lib/servidor/servicos";
import { modelos, type Email } from "@/lib/emails/modelos";

export const dynamic = "force-dynamic";

interface Pedido {
  acao: "cobranca" | "agradecimento" | "livre";
  fatura_id?: string;
  company_id?: string;
  assunto?: string;
  mensagem?: string;
}

export async function POST(req: Request) {
  const sessao = await exigirAdmin(req);
  if (!sessao) return Response.json({ erro: "Acesso restrito à equipe ARXUM." }, { status: 403 });

  const pedido = (await req.json().catch(() => null)) as Pedido | null;
  if (!pedido?.acao) return Response.json({ erro: "Pedido inválido." }, { status: 400 });

  const db = supabaseServico();
  const cfg = await configPlataforma(db);
  const pix = { chave: cfg.pix_chave, nome: cfg.pix_nome, cidade: cfg.pix_cidade };

  let email: Email;
  let companyId: string;
  let faturaId: string | null = null;
  let tipo: string = pedido.acao;

  if (pedido.acao === "livre") {
    if (!pedido.company_id || !pedido.assunto?.trim() || !pedido.mensagem?.trim()) {
      return Response.json({ erro: "Preencha o assunto e a mensagem." }, { status: 400 });
    }
    const { data: empresa } = await db.from("companies").select("id, name").eq("id", pedido.company_id).single();
    if (!empresa) return Response.json({ erro: "Empresa não encontrada." }, { status: 404 });
    companyId = empresa.id;
    email = modelos.livre(empresa.name, pedido.assunto.trim(), pedido.mensagem);
  } else {
    const { data: f } = await db.from("faturas")
      .select("id, numero, company_id, descricao, valor, vencimento, status, valor_pago, pago_em, companies(name)")
      .eq("id", pedido.fatura_id ?? "").single();
    if (!f) return Response.json({ erro: "Fatura não encontrada." }, { status: 404 });
    const empresa = (f.companies as unknown as { name: string } | null)?.name ?? "";
    const dados = {
      numero: f.numero, empresa, descricao: f.descricao, valor: Number(f.valor), vencimento: f.vencimento,
      valor_pago: f.valor_pago != null ? Number(f.valor_pago) : null, pago_em: f.pago_em,
    };
    companyId = f.company_id;
    faturaId = f.id;
    if (pedido.acao === "agradecimento") {
      if (f.status !== "paga") return Response.json({ erro: "A fatura ainda não está paga." }, { status: 400 });
      email = modelos.agradecimento(dados);
    } else {
      if (f.status !== "pendente") return Response.json({ erro: "Só faturas em aberto podem ser cobradas." }, { status: 400 });
      const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
      const atraso = Math.max(0, Math.round((Date.parse(hoje) - Date.parse(f.vencimento)) / 86_400_000));
      email = modelos.cobranca(dados, pix, atraso, pedido.mensagem);
      tipo = "cobranca_manual";
    }
  }

  const { data: para } = await db.rpc("email_empresa", { p_company: companyId });
  const envio = await enviarEmail(db, {
    para: (para as string | null) ?? [], email, tipo, companyId, faturaId,
    enviadoPor: sessao.usuario.id, responderPara: cfg.email_suporte,
  });
  return envio.ok
    ? Response.json({ ok: true, para })
    : Response.json({ erro: envio.erro }, { status: 502 });
}
