-- Estado do banco em produção em 27/10/2026, reconstruído a partir da
-- consulta de estrutura (tabelas, restrições, políticas, funções).
-- Já aplicado em produção: NÃO rodar de novo no Supabase. Serve de
-- referência e de base para testar as migrações seguintes.

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  primary_color text default '#22c55e',
  created_at timestamptz default now(),
  whatsapp text,
  especialidades jsonb default '["Técnico de Áudio", "Iluminador(a)", "Técnico de Vídeo", "Roadie", "Produtor(a)", "Cenógrafo(a)", "Carregador", "Recepcionista"]'::jsonb
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  nome text,
  role text not null default 'admin' check (role in ('super_admin', 'admin', 'financeiro', 'operacional')),
  created_at timestamptz default now()
);

create table public.freelancers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  nome text not null,
  especialidade text not null,
  telefone text not null,
  diaria numeric not null default 0,
  chave_pix text,
  status text not null default 'disponivel' check (status in ('disponivel', 'em_job', 'indisponivel')),
  avaliacao numeric not null default 5.0 check (avaliacao >= 0 and avaliacao <= 5),
  created_at timestamptz default now(),
  cpf text,
  email text
);

create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  titulo text not null,
  data date not null,
  horario_inicio time,
  local text not null,
  status text not null default 'orcamento' check (status in ('orcamento', 'confirmado', 'montagem', 'encerrado')),
  created_at timestamptz default now()
);

create table public.evento_slots (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos(id) on delete cascade,
  especialidade text not null,
  quantidade integer not null default 1,
  cache_base numeric not null default 0
);

create table public.evento_escalas (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos(id) on delete cascade,
  slot_id uuid not null references public.evento_slots(id) on delete cascade,
  freelancer_id uuid not null references public.freelancers(id) on delete cascade,
  status_pagamento text not null default 'pendente' check (status_pagamento in ('pendente', 'pago')),
  data_pagamento timestamptz,
  confirmado boolean default false,
  confirmado_em timestamptz,
  unique (slot_id, freelancer_id)
);

create table public.call_sheets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  evento_id uuid not null references public.eventos(id) on delete cascade,
  publicado boolean default false,
  publicado_em timestamptz,
  created_at timestamptz default now()
);

create table public.call_sheet_confirmacoes (
  id uuid primary key default gen_random_uuid(),
  call_sheet_id uuid,
  freelancer_id uuid,
  confirmado_em timestamptz default now(),
  company_id uuid references auth.users(id) on delete cascade,
  unique (call_sheet_id, freelancer_id)
);

create or replace function public.get_company_id()
returns uuid language sql stable as $$
  select company_id from profiles where id = auth.uid()
$$;

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.freelancers enable row level security;
alter table public.eventos enable row level security;
alter table public.evento_slots enable row level security;
alter table public.evento_escalas enable row level security;
alter table public.call_sheets enable row level security;
alter table public.call_sheet_confirmacoes enable row level security;

create policy companies_own on public.companies for all using (id = get_company_id());
create policy companies_public_read on public.companies for select using (true);
-- profiles_self foi trocada por profiles_select_self em 27/10/2026
create policy profiles_select_self on public.profiles for select using (id = auth.uid());
create policy freelancers_company on public.freelancers for all using (company_id = get_company_id());
create policy freelancers_public_insert on public.freelancers for insert with check (true);
create policy freelancers_public_read on public.freelancers for select using (true);
create policy eventos_company on public.eventos for all using (company_id = get_company_id());
create policy eventos_public_read on public.eventos for select using (true);
create policy slots_company on public.evento_slots for all
  using (evento_id in (select eventos.id from eventos where eventos.company_id = get_company_id()));
create policy slots_public_read on public.evento_slots for select using (true);
create policy escalas_company on public.evento_escalas for all
  using (evento_id in (select eventos.id from eventos where eventos.company_id = get_company_id()));
create policy escalas_public_confirm on public.evento_escalas for update using (true) with check (true);
create policy escalas_public_read on public.evento_escalas for select using (true);
create policy callsheets_company on public.call_sheets for all using (company_id = get_company_id());
create policy callsheets_public_read on public.call_sheets for select using (publicado = true);
create policy confirmacoes_delete_owner on public.call_sheet_confirmacoes for delete using (company_id = auth.uid());
create policy confirmacoes_insert_public on public.call_sheet_confirmacoes for insert with check (true);
create policy confirmacoes_select_public on public.call_sheet_confirmacoes for select using (true);
create policy confirmacoes_update_public on public.call_sheet_confirmacoes for update using (true);

-- Criada em 27/10/2026 para o cadastro self-service de empresas.
create or replace function public.criar_empresa(p_nome text, p_slug text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_company uuid;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado';
  end if;
  if exists (select 1 from profiles where id = auth.uid()) then
    raise exception 'Este usuário já possui uma empresa';
  end if;
  insert into companies (name, slug) values (trim(p_nome), lower(trim(p_slug))) returning id into v_company;
  insert into profiles (id, company_id, nome, role) values (auth.uid(), v_company, trim(p_nome), 'admin');
  return v_company;
end;
$$;
revoke execute on function public.criar_empresa(text, text) from public, anon;
grant execute on function public.criar_empresa(text, text) to authenticated;
