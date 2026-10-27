import { formatarBRL, dataBR } from "./validacao";

export const VERSAO_TERMO = "v1";

export interface DadosTermo {
  empresa: string;
  profissional: string;
  cpfFinal?: string;
  funcao: string;
  trabalho: string;      // "evento", "plantão"...
  titulo: string;
  data: string;
  horario?: string | null;
  local: string;
  valor: number;
}

// Termo simples de prestação de serviço autônomo, aceito pelo profissional
// no link individual. É um modelo: a empresa deve revisá-lo com seu jurídico.
export function clausulasTermo(d: DadosTermo): string[] {
  const quando = `${dataBR(d.data)}${d.horario ? `, a partir das ${d.horario.slice(0, 5)}` : ""}`;
  return [
    `${d.profissional}${d.cpfFinal ? ` (CPF final ${d.cpfFinal})` : ""} aceita prestar o serviço de ${d.funcao} para ${d.empresa} no ${d.trabalho} "${d.titulo}", em ${quando}, no local ${d.local}.`,
    `Pelo serviço, ${d.empresa} pagará ${formatarBRL(d.valor)}, pela chave PIX cadastrada ou pela forma combinada entre as partes, após a realização do trabalho.`,
    "A prestação é autônoma e eventual, sem vínculo empregatício, subordinação contínua ou exclusividade.",
    "Se não puder comparecer, o profissional deve avisar a empresa o quanto antes, pelo próprio link ou pelo WhatsApp.",
    "Os dados pessoais são usados apenas para a organização do trabalho e o pagamento, conforme a LGPD.",
  ];
}
