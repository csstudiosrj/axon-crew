// Rotina diária de cobrança (Vercel Cron, ver vercel.json):
// 1. gera as mensalidades do mês das empresas em plano pago;
// 2. envia os avisos da régua (fatura nova, lembrete, vence hoje, atraso, agradecimento);
// 3. suspende quem passou do prazo, se isso estiver ligado nas configurações.
import { supabaseServico, enviarEmail, configPlataforma } from "@/lib/servidor/servicos";
import { modelos, type FaturaEmail } from "@/lib/emails/modelos";
import { proximoAviso, type FaturaRegua } from "@/lib/cobranca";
import { conferirFatura, CAMPOS_PIX, type FaturaPix } from "@/lib/servidor/pagamento-fatura";
import { mercadoPagoConfigurado } from "@/lib/servidor/mercadopago";

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
  token: string;
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

  const resultado = { geradas: geradas as number, enviados: 0, erros: 0, suspensas: 0, conferidas: 0 };

  // Rede de segurança: PIX pago cujo aviso do Mercado Pago não chegou.
  if (mercadoPagoConfigurado()) {
    const { data: comPix } = await db.from("faturas").select(CAMPOS_PIX).eq("status", "pendente").not("mp_pix_payment_id", "is", null);
    for (const f of comPix ?? []) {
      try {
        if ((await conferirFatura(db, f as unknown as FaturaPix)) === "paga") resultado.conferidas++;
      } catch (e) {
        console.error("cron: conferir pix", e instanceof Error ? e.message : e);
      }
    }
  }
  if (!cfg.emails_automaticos) return Response.json({ ...resultado, emails: "desligados" });

  const { data: faturas, error } = await db.rpc("servico_faturas");
  if (error) return Response.json({ erro: error.message }, { status: 500 });


  for (const f of (faturas ?? []) as FaturaServico[]) {
    const aviso = proximoAviso(f, cfg);
    if (!aviso) continue;

    const dados: FaturaEmail = {
      numero: f.numero, empresa: f.empresa, descricao: f.descricao, valor: Number(f.valor),
      vencimento: f.vencimento, valor_pago: f.valor_pago != null ? Number(f.valor_pago) : null, pago_em: f.pago_em, token: f.token,
    };
    let email;
    switch (aviso.tipo) {
      case "agradecimento": email = modelos.agradecimento(dados); break;
      case "fatura_nova":   email = modelos.fatura_nova(dados); break;
      case "lembrete":      email = modelos.lembrete(dados, aviso.dias); break;
      case "vence_hoje":    email = modelos.vence_hoje(dados); break;
      case "suspensao":
        await db.from("companies").update({ suspensa: true, suspensa_em: new Date().toISOString() }).eq("id", f.company_id);
        resultado.suspensas++;
        email = modelos.suspensao(dados, aviso.dias);
        break;
      default:
        email = modelos.atraso(dados, aviso.dias, cfg.suspender_apos_dias);
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
