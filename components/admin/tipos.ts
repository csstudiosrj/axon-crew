import type { PlanoId } from "@/lib/planos";

export interface ChamadoResumo {
  id: string;
  numero: number;
  company_id: string;
  empresa: string;
  assunto: string;
  status: "aberto" | "respondido" | "resolvido";
  criado_em: string;
  ultima_msg_em: string;
  nao_lidas: number;
  ultima_msg: string | null;
}

export interface Empresa {
  id: string;
  name: string;
  slug: string;
  segmento: string | null;
  plano: PlanoId;
  suspensa: boolean;
  observacao_admin: string | null;
  created_at: string;
  plano_atualizado_em: string | null;
  whatsapp: string | null;
  email_admin: string | null;
  ultimo_acesso: string | null;
  usuarios: number;
  profissionais: number;
  trabalhos_mes: number;
  trabalhos_total: number;
}

export const STATUS_CHAMADO: Record<ChamadoResumo["status"], { nome: string; cor: string }> = {
  aberto: { nome: "Aguardando ARXUM", cor: "bg-amber-500/10 text-amber-300" },
  respondido: { nome: "Respondido", cor: "bg-sky-500/15 text-sky-300" },
  resolvido: { nome: "Resolvido", cor: "bg-emerald-500/15 text-emerald-300" },
};
