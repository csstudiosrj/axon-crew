-- Segmento da empresa: define o vocabulário das telas e as funções sugeridas.
-- Os valores possíveis estão em lib/segmentos.ts; um valor desconhecido cai
-- no padrão "eventos" no app.
alter table public.companies
  add column if not exists segmento text not null default 'eventos';

-- Cor padrão das páginas públicas para empresas novas: violeta do ARXUM Crew.
alter table public.companies
  alter column primary_color set default '#8b5cf6';
