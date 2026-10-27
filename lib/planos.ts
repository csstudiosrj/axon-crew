// Planos do ARXUM Crew. Os limites são garantidos no banco
// (supabase/migrations/20261028_planos.sql); aqui ficam os mesmos números
// para exibir na página de preços e no painel.

export type PlanoId = "gratis" | "essencial" | "profissional" | "empresa";

export interface Plano {
  id: PlanoId;
  nome: string;
  preco: number;            // mensal, em reais
  descricao: string;
  maxProfissionais: number | null;
  maxTrabalhosMes: number | null;
  maxUsuarios: number;
  marcaPropria: boolean;
  exportacao: boolean;
  destaque?: boolean;
  itens: string[];
}

export const PLANOS: Plano[] = [
  {
    id: "gratis", nome: "Grátis", preco: 0,
    descricao: "Para testar com a sua equipe de verdade.",
    maxProfissionais: 20, maxTrabalhosMes: 3, maxUsuarios: 1, marcaPropria: false, exportacao: false,
    itens: ["Até 20 profissionais na base", "3 trabalhos por mês", "Link de cadastro e confirmação pelo WhatsApp", "Check-in e termo de aceite"],
  },
  {
    id: "essencial", nome: "Essencial", preco: 69,
    descricao: "Para quem escala toda semana.",
    maxProfissionais: null, maxTrabalhosMes: 15, maxUsuarios: 1, marcaPropria: false, exportacao: false,
    itens: ["Profissionais ilimitados", "15 trabalhos por mês", "Tudo do Grátis", "Financeiro e PIX copia e cola"],
  },
  {
    id: "profissional", nome: "Profissional", preco: 149, destaque: true,
    descricao: "Para a operação que não para.",
    maxProfissionais: null, maxTrabalhosMes: null, maxUsuarios: 1, marcaPropria: true, exportacao: true,
    itens: ["Trabalhos ilimitados", "Sua marca: logo e cor nas páginas públicas", "Exportação em CSV e relatórios", "Tudo do Essencial"],
  },
  {
    id: "empresa", nome: "Empresa", preco: 349,
    descricao: "Para equipes com várias pessoas no painel.",
    maxProfissionais: null, maxTrabalhosMes: null, maxUsuarios: 10, marcaPropria: true, exportacao: true,
    itens: ["Até 10 usuários com permissões", "Tudo do Profissional", "Suporte prioritário", "Implantação assistida"],
  },
];

export const getPlano = (id?: string | null): Plano => PLANOS.find((p) => p.id === id) ?? PLANOS[0];

// Contato comercial da ARXUM para troca de plano.
export const WHATSAPP_ARXUM = "5521967119815";

export const linkAssinar = (plano: Plano, empresa?: string) =>
  `https://wa.me/${WHATSAPP_ARXUM}?text=${encodeURIComponent(
    `Olá! Quero assinar o plano ${plano.nome} do ARXUM Crew${empresa ? ` para a empresa ${empresa}` : ""}.`
  )}`;
