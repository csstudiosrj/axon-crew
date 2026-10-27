// Rotina diária de cobrança (Vercel Cron, ver vercel.json):
// 1. gera as mensalidades do mês das empresas em plano pago;
// 2. envia os avisos da régua (fatura nova, lembrete, vence hoje, atraso, agradecimento);
// 3. suspende quem passou do prazo, se isso estiver ligado nas configurações.
import { supabaseServico, enviarEmail, configPlataforma } from "@/lib/servidor/servicos";
import { modelos, type FaturaEmail, type Pix } from "@/lib/emails/modelos";
import { proximoAviso, type FaturaRegua } from "@/lib/cobranca";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface FaturaServico extends FaturaRegua {
  id: string;
  numero: number;
  company_id: string;
  empresa: string;
  email: string | null;
  descricao: string;
  valor: number;
  vencimento: string;
  pago_em: string | null;
  valor_pago: number | null;
}

export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return Response.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const db = supabaseServico();
  const cfg = await configPlataforma(db);
  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

  const { data: geradas, error: erroGerar } = await db.rpc("gerar_mensalidades", { p_competencia: hoje });
  if (erroGerar) return Response.json({ erro: erroGerar.message }, { status: 500 });

  const resultado = { geradas: geradas as number, enviados: 0, erros: 0, suspensas: 0 };
  if (!cfg.emails_automaticos) return Response.json({ ...resultado, emails: "desligados" });

  const { data: faturas, error } = await db.rpc("servico_faturas");
  if (error) return Response.json({ erro: error.message }, { status: 500 });

  const pix: Pix = { chave: cfg.pix_chave, nome: cfg.pix_nome, cidade: cfg.pix_cidade };

  for (const f of (faturas ?? []) as FaturaServico[]) {
    const aviso = proximoAviso(f, cfg);
    if (!aviso) continue;

    const dados: FaturaEmail = {
      numero: f.numero, empresa: f.empresa, descricao: f.descricao, valor: Number(f.valor),
      vencimento: f.vencimento, valor_pago: f.valor_pago != null ? Number(f.valor_pago) : null, pago_em: f.pago_em,
    };
    let email;
    switch (aviso.tipo) {
      case "agradecimento": email = modelos.agradecimento(dados); break;
      case "fatura_nova":   email = modelos.fatura_nova(dados, pix); break;
      case "lembrete":      email = modelos.lembrete(dados, pix, aviso.dias); break;
      case "vence_hoje":    email = modelos.vence_hoje(dados, pix); break;
      case "suspensao":
        await db.from("companies").update({ suspensa: true, suspensa_em: new Date().toISOString() }).eq("id", f.company_id);
        resultado.suspensas++;
        email = modelos.suspensao(dados, pix, aviso.dias);
        break;
      default:
        email = modelos.atraso(dados, pix, aviso.dias, cfg.suspender_apos_dias);
    }

    const envio = await enviarEmail(db, {
      para: f.email ?? [], email, tipo: aviso.tipo, companyId: f.company_id, faturaId: f.id,
      automatico: true, responderPara: cfg.email_suporte,
    });
    if (envio.ok) resultado.enviados++;
    else resultado.erros++;
  }

  return Response.json(resultado);
}
