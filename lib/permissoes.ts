// O que cada papel enxerga no painel.
//   admin        tudo
//   financeiro   tudo menos Configurações
//   operacional  escalas e base, sem Financeiro, Relatórios, Configurações e Assinatura
export type Papel = "super_admin" | "admin" | "financeiro" | "operacional";

const BLOQUEIOS: Record<string, string[]> = {
  financeiro: ["/configuracoes"],
  operacional: ["/financeiro", "/relatorios", "/configuracoes", "/assinatura"],
};

export function podeAcessar(papel: string | undefined, rota: string): boolean {
  if (!papel) return true;
  return !(BLOQUEIOS[papel] ?? []).some((r) => rota.startsWith(r));
}

export const NOME_PAPEL: Record<string, string> = {
  super_admin: "Administrador", admin: "Administrador", financeiro: "Financeiro", operacional: "Operacional",
};
