import { cpfValido, somenteDigitos } from "./validacao";

// Gera o "PIX copia e cola" (BR Code estático do Banco Central) para pagar
// um profissional pela chave cadastrada, já com o valor preenchido.

const campo = (id: string, valor: string) => `${id}${String(valor.length).padStart(2, "0")}${valor}`;

// Sem acento e só caracteres aceitos no BR Code.
const limpar = (t: string, max: number) =>
  t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9 ]/g, "").trim().slice(0, max) || "Recebedor";

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

// Coloca a chave no formato que o PIX exige: telefone com +55, CPF/CNPJ só
// números, e-mail minúsculo, chave aleatória como está.
export function normalizarChave(chave: string): string {
  const c = chave.trim();
  if (c.includes("@")) return c.toLowerCase();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c)) return c.toLowerCase();
  const d = somenteDigitos(c);
  if (c.startsWith("+")) return `+${d}`;
  if (d.length === 14) return d;                                      // CNPJ
  if (d.length === 11 && (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(c) || cpfValido(d))) return d; // CPF
  if (d.length === 10 || d.length === 11) return `+55${d}`;           // celular/fixo com DDD
  if (d.length === 12 || d.length === 13) return `+${d}`;             // já com 55
  return c;
}

export function pixCopiaECola({ chave, nome, valor, cidade = "BRASIL", identificador = "CREW" }: {
  chave: string; nome: string; valor: number; cidade?: string; identificador?: string;
}): string {
  const conta = campo("00", "br.gov.bcb.pix") + campo("01", normalizarChave(chave));
  const txid = identificador === "***" ? "***" : limpar(identificador, 25).replace(/ /g, "");
  const payload =
    campo("00", "01") +
    campo("26", conta) +
    campo("52", "0000") +
    campo("53", "986") +
    (valor > 0 ? campo("54", valor.toFixed(2)) : "") +
    campo("58", "BR") +
    campo("59", limpar(nome, 25)) +
    campo("60", limpar(cidade, 15)) +
    campo("62", campo("05", txid)) +
    "6304";
  return payload + crc16(payload);
}
