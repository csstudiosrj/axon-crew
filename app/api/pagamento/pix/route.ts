// Gera (ou reaproveita) o PIX do Mercado Pago de uma fatura e devolve o código
// copia e cola para o QR Code. Usado na Assinatura da empresa e no painel ARXUM.
import { faturaAutorizada, pixDaFatura } from "@/lib/servidor/pagamento-fatura";
import { mercadoPagoConfigurado } from "@/lib/servidor/mercadopago";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const pedido = (await req.json().catch(() => ({}))) as { fatura_id?: string; token?: string };
  const r = await faturaAutorizada(req, pedido);
  if ("erro" in r) return Response.json({ erro: r.erro }, { status: r.status });
  if (r.fatura.status !== "pendente") return Response.json({ erro: "Esta fatura não está em aberto." }, { status: 409 });
  if (!mercadoPagoConfigurado()) return Response.json({ erro: "O pagamento por PIX não está disponível agora." }, { status: 503 });

  try {
    const pix = await pixDaFatura(r.db, r.fatura, r.usuario?.email);
    return Response.json({ ...pix, valor: Number(r.fatura.valor) });
  } catch (e) {
    console.error("pix: gerar", e instanceof Error ? e.message : e);
    return Response.json({ erro: "Não foi possível gerar o PIX. Tente de novo em instantes." }, { status: 502 });
  }
}
