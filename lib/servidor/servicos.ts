// Uso exclusivo das rotas de API (nunca importar em componentes do navegador):
// usa a chave de serviço do Supabase e a chave da Resend.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Email } from "../emails/modelos";

const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON!;

export function supabaseServico(): SupabaseClient {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chave) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");
  return createClient(URL_SUPABASE, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Cliente com a sessão de quem chamou a rota (Authorization: Bearer <token>).
// As políticas do banco valem normalmente para ele.
export async function usuarioDaRequisicao(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const cliente = createClient(URL_SUPABASE, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data } = await cliente.auth.getUser(token);
  if (!data.user) return null;
  return { cliente, usuario: data.user };
}

export async function exigirAdmin(req: Request) {
  const sessao = await usuarioDaRequisicao(req);
  if (!sessao) return null;
  const { data } = await sessao.cliente.rpc("eh_admin_plataforma");
  return data === true ? sessao : null;
}

export interface Envio {
  para: string | string[];
  email: Email;
  tipo: string;
  companyId?: string | null;
  faturaId?: string | null;
  chamadoId?: string | null;
  automatico?: boolean;
  enviadoPor?: string | null;
  responderPara?: string | null;
}

// Envia pela API da Resend e registra no histórico (enviado ou erro).
export async function enviarEmail(db: SupabaseClient, envio: Envio): Promise<{ ok: boolean; erro?: string }> {
  const para = (Array.isArray(envio.para) ? envio.para : [envio.para]).filter(Boolean);
  let erro: string | undefined;
  if (!para.length) {
    erro = "Empresa sem e-mail cadastrado.";
  } else if (!process.env.RESEND_API_KEY) {
    erro = "RESEND_API_KEY não configurada.";
  } else {
    try {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.EMAIL_REMETENTE || "ARXUM Crew <crew@arxum.com.br>",
          to: para,
          subject: envio.email.assunto,
          html: envio.email.html,
          ...(envio.responderPara ? { reply_to: envio.responderPara } : {}),
        }),
      });
      if (!resp.ok) erro = `Resend ${resp.status}: ${(await resp.text()).slice(0, 300)}`;
    } catch (e) {
      erro = e instanceof Error ? e.message : String(e);
    }
  }
  await db.from("emails_enviados").insert({
    company_id: envio.companyId ?? null,
    fatura_id: envio.faturaId ?? null,
    chamado_id: envio.chamadoId ?? null,
    tipo: envio.tipo,
    para: para.join(", ") || "-",
    assunto: envio.email.assunto,
    status: erro ? "erro" : "enviado",
    erro: erro ?? null,
    automatico: envio.automatico ?? false,
    enviado_por: envio.enviadoPor ?? null,
  });
  return erro ? { ok: false, erro } : { ok: true };
}

export async function configPlataforma(db: SupabaseClient) {
  const { data } = await db.from("config_plataforma").select("*").eq("id", 1).single();
  return data as {
    pix_chave: string | null; pix_nome: string | null; pix_cidade: string | null;
    email_suporte: string | null; whatsapp: string | null;
    lembrete_dias_antes: number; cobranca_dias_depois: number[];
    suspender_apos_dias: number | null; emails_automaticos: boolean;
  };
}
