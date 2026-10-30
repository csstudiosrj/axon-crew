// Abre o pagamento de uma fatura no Mercado Pago (Checkout Pro). Quem chama
// precisa estar logado e a fatura precisa ser da empresa dele: a consulta usa
// a sessão do usuário, então as políticas do banco já limitam o que ele vê.
// Vale também para empresa suspensa, que assim consegue pagar e voltar.
import { usuarioDaRequisicao, supabaseServico } from "@/lib/servidor/servicos";
import { criarPreferencia, mercadoPagoConfigurado } from "@/lib/servidor/mercadopago";
import { SITE } from "@/lib/emails/modelos";
import { formatarBRL } from "@/lib/validacao";

export const dynamic = "force-dynamic";

interface Fatura {
  id: string;
  numero: number;
  company_id: string;
  descricao: string;
  valor: number;
  status: "pendente" | "paga" | "cancelada";
}

export async function POST(req: Request) {
  const sessao = await usuarioDaRequisicao(req);
  if (!sessao) return Response.json({ erro: "Entre novamente." }, { status: 401 });

  const { fatura_id } = (await req.json().catch(() => ({}))) as { fatura_id?: string };
  if (!fatura_id || typeof fatura_id !== "string") return Response.json({ erro: "Pedido inválido." }, { status: 400 });

  if (!mercadoPagoConfigurado()) {
    return Response.json({ erro: "O pagamento online não está disponível agora. Use o PIX ou fale com o suporte." }, { status: 503 });
  }

  const { data } = await sessao.cliente.from("faturas")
    .select("id, numero, company_id, descricao, valor, status").eq("id", fatura_id).maybeSingle();
  const fatura = data as Fatura | null;
  if (!fatura) return Response.json({ erro: "Fatura não encontrada." }, { status: 404 });
  if (fatura.status !== "pendente") return Response.json({ erro: "Esta fatura não está em aberto." }, { status: 409 });

  try {
    const preferencia = await criarPreferencia({
      faturaId: fatura.id,
      companyId: fatura.company_id,
      titulo: `ARXUM Crew · fatura nº ${fatura.numero} (${formatarBRL(Number(fatura.valor))})`,
      valor: Number(fatura.valor),
      emailPagador: sessao.usuario.email,
      urlBase: process.env.SITE_URL ?? SITE,
    });
    await supabaseServico().from("faturas").update({ mp_preference_id: preferencia.id }).eq("id", fatura.id);
    return Response.json({ url: preferencia.url });
  } catch (e) {
    console.error("mercadopago: criar preferência", e instanceof Error ? e.message : e);
    return Response.json({ erro: "Não foi possível abrir o pagamento. Tente de novo ou use o PIX." }, { status: 502 });
  }
}
