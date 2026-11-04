// Situação de uma fatura enquanto o QR Code está na tela. Se o aviso do
// Mercado Pago ainda não chegou, confere o PIX direto na API e dá baixa.
import { faturaAutorizada, conferirFatura } from "@/lib/servidor/pagamento-fatura";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const pedido = (await req.json().catch(() => ({}))) as { fatura_id?: string; token?: string };
  const r = await faturaAutorizada(req, pedido);
  if ("erro" in r) return Response.json({ erro: r.erro }, { status: r.status });
  try {
    return Response.json({ status: await conferirFatura(r.db, r.fatura) });
  } catch (e) {
    console.error("pix: conferir", e instanceof Error ? e.message : e);
    return Response.json({ status: r.fatura.status });
  }
}
