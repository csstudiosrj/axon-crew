// Uso exclusivo das rotas de API (nunca importar em componentes do navegador):
// usa o token de acesso e o segredo do webhook do Mercado Pago.
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const API = "https://api.mercadopago.com";

export const mercadoPagoConfigurado = () => !!process.env.MP_ACCESS_TOKEN;

function token(): string {
  const t = process.env.MP_ACCESS_TOKEN;
  if (!t) throw new Error("MP_ACCESS_TOKEN não configurada.");
  return t;
}

export interface PreferenciaEntrada {
  faturaId: string;
  companyId: string;
  titulo: string;
  valor: number;
  emailPagador?: string | null;
  // Endereço público do app já com o prefixo, ex.: https://www.arxum.com.br/crew
  urlBase: string;
}

// Cria o checkout (Checkout Pro) de uma fatura e devolve o link para pagar.
// O id da fatura vai em external_reference: é por ele que o webhook sabe
// qual fatura baixar.
export async function criarPreferencia(e: PreferenciaEntrada): Promise<{ id: string; url: string }> {
  const retorno = (resultado: string) => `${e.urlBase}/assinatura?pagamento=${resultado}`;
  const resp = await fetch(`${API}/checkout/preferences`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ id: e.faturaId, title: e.titulo, quantity: 1, currency_id: "BRL", unit_price: Number(e.valor.toFixed(2)) }],
      external_reference: e.faturaId,
      metadata: { fatura_id: e.faturaId, company_id: e.companyId },
      ...(e.emailPagador ? { payer: { email: e.emailPagador } } : {}),
      back_urls: { success: retorno("sucesso"), pending: retorno("pendente"), failure: retorno("falha") },
      auto_return: "approved",
      notification_url: `${e.urlBase}/api/webhooks/mercadopago`,
      statement_descriptor: "ARXUM CREW",
    }),
  });
  if (!resp.ok) throw new Error(`Mercado Pago ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  const json = (await resp.json()) as { id?: string; init_point?: string };
  if (!json.id || !json.init_point) throw new Error("Mercado Pago não devolveu o link de pagamento.");
  return { id: json.id, url: json.init_point };
}

export interface PixEntrada {
  faturaId: string;
  companyId: string;
  descricao: string;
  valor: number;
  emailPagador: string;
  urlBase: string;
  horasValidade?: number;
}

// Cria uma cobrança PIX direto na API de pagamentos: devolve o código copia e
// cola para mostrar o QR Code no painel. O id da fatura vai em
// external_reference, como no Checkout Pro, e o webhook dá baixa do mesmo jeito.
export async function criarPix(e: PixEntrada): Promise<{ id: string; qr: string; expiraEm: string }> {
  // Horário de Brasília com fuso explícito, formato aceito pelo Mercado Pago.
  const expira = new Date(Date.now() + (e.horasValidade ?? 24) * 3_600_000 - 3 * 3_600_000)
    .toISOString().replace("Z", "-03:00");
  const resp = await fetch(`${API}/v1/payments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json", "X-Idempotency-Key": randomUUID() },
    body: JSON.stringify({
      transaction_amount: Number(e.valor.toFixed(2)),
      description: e.descricao,
      payment_method_id: "pix",
      payer: { email: e.emailPagador },
      external_reference: e.faturaId,
      metadata: { fatura_id: e.faturaId, company_id: e.companyId },
      notification_url: `${e.urlBase}/api/webhooks/mercadopago`,
      date_of_expiration: expira,
    }),
  });
  if (!resp.ok) throw new Error(`Mercado Pago ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  const json = (await resp.json()) as {
    id?: number | string; date_of_expiration?: string;
    point_of_interaction?: { transaction_data?: { qr_code?: string } };
  };
  const qr = json.point_of_interaction?.transaction_data?.qr_code;
  if (!json.id || !qr) throw new Error("Mercado Pago não devolveu o código PIX. Confira se a conta tem chave PIX cadastrada.");
  return { id: String(json.id), qr, expiraEm: json.date_of_expiration ?? expira };
}

export interface PagamentoMP {
  id: number | string;
  status: string;
  status_detail: string | null;
  transaction_amount: number;
  payment_type_id: string | null;
  external_reference: string | null;
  date_approved: string | null;
}

// Consulta o pagamento direto na API: o aviso do webhook só traz o id, e o
// que vale é o que o Mercado Pago responde aqui. Devolve null se não existe
// (é o caso do "simular notificação" do painel, que manda um id de teste).
export async function buscarPagamento(id: string): Promise<PagamentoMP | null> {
  const resp = await fetch(`${API}/v1/payments/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token()}` },
    cache: "no-store",
  });
  if (resp.status === 404) return null;
  if (!resp.ok) throw new Error(`Mercado Pago ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  return (await resp.json()) as PagamentoMP;
}

// Confere a assinatura do aviso (cabeçalho x-signature). O texto assinado é
// "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" e a chave é o segredo do
// webhook (MP_WEBHOOK_SECRET). Partes ausentes saem do texto.
export function assinaturaValida(req: Request, dataId: string | null): boolean {
  const segredo = process.env.MP_WEBHOOK_SECRET;
  if (!segredo) return false;

  const partes = new Map<string, string>();
  for (const trecho of (req.headers.get("x-signature") ?? "").split(",")) {
    const i = trecho.indexOf("=");
    if (i > 0) partes.set(trecho.slice(0, i).trim(), trecho.slice(i + 1).trim());
  }
  const ts = partes.get("ts");
  const v1 = partes.get("v1");
  if (!ts || !v1) return false;

  const requestId = req.headers.get("x-request-id");
  // Ids alfanuméricos entram em minúsculas no texto assinado.
  const id = dataId && /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
  const manifesto = `${id ? `id:${id};` : ""}${requestId ? `request-id:${requestId};` : ""}ts:${ts};`;

  const esperado = createHmac("sha256", segredo).update(manifesto).digest("hex");
  const recebido = Buffer.from(v1, "hex");
  const calculado = Buffer.from(esperado, "hex");
  return recebido.length === calculado.length && timingSafeEqual(recebido, calculado);
}
