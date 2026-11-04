// Dados de uma fatura pelo link público de pagamento (/pagar/<token>).
import { faturaAutorizada } from "@/lib/servidor/pagamento-fatura";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { token } = (await req.json().catch(() => ({}))) as { token?: string };
  const r = await faturaAutorizada(req, { token: token ?? "" });
  if ("erro" in r) return Response.json({ erro: r.erro }, { status: r.status });
  const f = r.fatura;
  return Response.json({
    numero: f.numero, empresa: f.companies?.name ?? "", descricao: f.descricao, valor: Number(f.valor),
    vencimento: f.vencimento, status: f.status, pago_em: f.pago_em,
  });
}
