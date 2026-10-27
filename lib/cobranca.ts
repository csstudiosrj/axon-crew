// Régua de cobrança: decide qual aviso automático cada fatura deve receber hoje.
// Cada aviso é enviado uma vez só (o tipo fica gravado em emails_enviados), e
// quando a rotina passa um dia sem rodar, o aviso atrasado sai no dia seguinte.

export interface FaturaRegua {
  status: "pendente" | "paga" | "cancelada";
  dias_para_vencer: number; // negativo = dias em atraso
  suspensa: boolean;
  enviados: string[];
}

export interface ReguaConfig {
  lembrete_dias_antes: number;
  cobranca_dias_depois: number[];
  suspender_apos_dias: number | null;
}

export type Aviso =
  | { tipo: "agradecimento" }
  | { tipo: "fatura_nova" }
  | { tipo: "lembrete"; dias: number }
  | { tipo: "vence_hoje" }
  | { tipo: `atraso_${number}`; dias: number }
  | { tipo: "suspensao"; dias: number };

export function proximoAviso(f: FaturaRegua, cfg: ReguaConfig): Aviso | null {
  const ja = (t: string) => f.enviados.includes(t);

  if (f.status === "paga") return ja("agradecimento") ? null : { tipo: "agradecimento" };
  if (f.status !== "pendente") return null;

  const dias = f.dias_para_vencer;
  if (dias > 0) {
    if (dias <= cfg.lembrete_dias_antes) return ja("lembrete") ? null : { tipo: "lembrete", dias };
    return f.enviados.length ? null : { tipo: "fatura_nova" };
  }
  if (dias === 0) return ja("vence_hoje") ? null : { tipo: "vence_hoje" };

  const atraso = -dias;
  if (cfg.suspender_apos_dias && atraso >= cfg.suspender_apos_dias && !f.suspensa && !ja("suspensao")) {
    return { tipo: "suspensao", dias: atraso };
  }
  // O maior marco da régua já alcançado (ex.: régua 1, 5, 10 e 7 dias de atraso → 5).
  const marco = [...cfg.cobranca_dias_depois].sort((a, b) => b - a).find((n) => n > 0 && n <= atraso);
  if (marco && !ja(`atraso_${marco}`)) return { tipo: `atraso_${marco}`, dias: atraso };
  return null;
}
