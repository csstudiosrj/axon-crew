-- Vários usuários por empresa (plano Empresa) e equipes salvas.
-- Papéis: admin (tudo), financeiro (pagamentos, sem configurações),
-- operacional (escalas, sem ver valores).

-- ---------------------------------------------------------------------------
-- Convites para a equipe interna
-- ---------------------------------------------------------------------------
create table if not exists public.convites_equipe (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  role text not null default 'operacional' check (role in ('admin', 'financeiro', 'operacional')),
  token uuid not null unique default gen_random_uuid(),
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  aceito_em timestamptz
);
alter table public.convites_equipe enable row level security;

drop policy if exists convites_admin on public.convites_equipe;
create policy convites_admin on public.convites_equipe for all
  using (company_id = get_company_id() and get_role() in ('admin', 'super_admin'))
  with check (company_id = get_company_id() and get_role() in ('admin', 'super_admin'));

-- Público: o que a pessoa convidada vê antes de criar a conta.
create or replace function public.ver_convite_equipe(p_token uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('empresa', c.name, 'email', v.email, 'role', v.role)
  from convites_equipe v join companies c on c.id = v.company_id
  where v.token = p_token and v.aceito_em is null and v.criado_em > now() - interval '14 days'
$$;

-- Usuário recém-criado entra na empresa que o convidou.
-- Retorna: ok | invalido | email_diferente | ja_tem_empresa
create or replace function public.aceitar_convite_equipe(p_token uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v convites_equipe;
  v_email text;
begin
  if auth.uid() is null then return 'invalido'; end if;
  if exists (select 1 from profiles where id = auth.uid()) then return 'ja_tem_empresa'; end if;
  select * into v from convites_equipe
   where token = p_token and aceito_em is null and criado_em > now() - interval '14 days';
  if v.id is null then return 'invalido'; end if;
  select email into v_email from auth.users where id = auth.uid();
  if lower(trim(v_email)) <> lower(trim(v.email)) then return 'email_diferente'; end if;

  insert into profiles (id, company_id, nome, role) values (auth.uid(), v.company_id, split_part(v_email, '@', 1), v.role);
  update convites_equipe set aceito_em = now() where id = v.id;
  return 'ok';
end;
$$;

-- Admin remove alguém da equipe (não a si mesmo).
create or replace function public.remover_membro(p_user uuid)
returns text language plpgsql security definer set search_path = public as $$
begin
  if get_role() not in ('admin', 'super_admin') then return 'sem_permissao'; end if;
  if p_user = auth.uid() then return 'proprio_usuario'; end if;
  delete from profiles where id = p_user and company_id = get_company_id();
  return 'ok';
end;
$$;

-- Admin muda o papel de alguém da equipe.
create or replace function public.alterar_papel(p_user uuid, p_role text)
returns text language plpgsql security definer set search_path = public as $$
begin
  if get_role() not in ('admin', 'super_admin') then return 'sem_permissao'; end if;
  if p_role not in ('admin', 'financeiro', 'operacional') then return 'papel_invalido'; end if;
  if p_user = auth.uid() then return 'proprio_usuario'; end if;
  update profiles set role = p_role where id = p_user and company_id = get_company_id();
  return 'ok';
end;
$$;

-- Lista da equipe com e-mail (o e-mail fica em auth.users).
create or replace function public.listar_equipe()
returns table (id uuid, nome text, email text, role text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.nome, u.email, p.role, p.created_at
  from profiles p join auth.users u on u.id = p.id
  where p.company_id = get_company_id()
  order by p.created_at
$$;

-- ---------------------------------------------------------------------------
-- Equipes salvas (grupos de profissionais reaproveitados nas escalas)
-- ---------------------------------------------------------------------------
create table if not exists public.equipes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  nome text not null check (length(trim(nome)) between 1 and 80),
  membros uuid[] not null default '{}',
  criado_em timestamptz not null default now()
);
alter table public.equipes enable row level security;

drop policy if exists equipes_company on public.equipes;
create policy equipes_company on public.equipes for all
  using (company_id = get_company_id()) with check (company_id = get_company_id());

-- ---------------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------------
revoke all on public.convites_equipe, public.equipes from anon;
grant select, insert, update, delete on public.convites_equipe, public.equipes to authenticated;

revoke execute on function
  public.ver_convite_equipe(uuid), public.aceitar_convite_equipe(uuid),
  public.remover_membro(uuid), public.alterar_papel(uuid, text), public.listar_equipe()
from public, anon;
grant execute on function public.ver_convite_equipe(uuid) to anon, authenticated;
grant execute on function
  public.aceitar_convite_equipe(uuid), public.remover_membro(uuid),
  public.alterar_papel(uuid, text), public.listar_equipe()
to authenticated;
