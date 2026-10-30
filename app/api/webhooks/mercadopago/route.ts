// Aviso do Mercado Pago a cada mudança de um pagamento (configure a URL em
// Suas integrações > Webhooks, evento "Pagamentos"). Não usa a sessão de
// ninguém: a autenticidade vem da assinatura do aviso (MP_WEBHOOK_SECRET), e o
// pagamento é sempre reconsultado na API antes de qualquer baixa.
//
// Códigos de resposta: 200 quando o aviso foi tratado ou não interessa (o
// Mercado Pago para de reenviar); 401 se a assinatura não confere; 500 quando
// algo falhou do nosso lado, para o Mercado Pago tentar de novo.
import { supabaseServico } from "@/lib/servidor/servicos";
import { assinaturaValida, buscarPagamento } from "@/lib/servidor/mercadopago";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const url = new URL(req.url);
  const corpo = (await req.json().catch(() => ({}))) as { type?: string; action?: string; data?: { id?: string | number } };
  const dataId = url.searchParams.get("data.id");

  if (!assinaturaValida(req, dataId)) return Response.json({ erro: "Assinatura inválida." }, { status: 401 });

  const tipo = url.searchParams.get("type") ?? corpo.type;
  if (tipo !== "payment" || !dataId) return Response.json({ ok: true, ignorado: "evento" });

  try {
    const pagamento = await buscarPagamento(dataId);
    if (!pagamento) return Response.json({ ok: true, ignorado: "pagamento_nao_encontrado" });

    const faturaId = pagamento.external_reference;
    if (!faturaId || !UUID.test(faturaId)) return Response.json({ ok: true, ignorado: "sem_fatura" });

    const { data, error } = await supabaseServico().rpc("servico_registrar_pagamento_mp", {
      p_fatura: faturaId,
      p_payment_id: String(pagamento.id),
      p_status: pagamento.status,
      p_status_detail: pagamento.status_detail,
      p_valor: pagamento.transaction_amount,
      p_forma: pagamento.payment_type_id,
      p_aprovado_em: pagamento.date_approved,
    });
    if (error) throw new Error(error.message);
    return Response.json({ ok: true, resultado: data });
  } catch (e) {
    console.error("mercadopago: webhook", e instanceof Error ? e.message : e);
    return Response.json({ erro: "Falha ao processar o aviso." }, { status: 500 });
  }
}
