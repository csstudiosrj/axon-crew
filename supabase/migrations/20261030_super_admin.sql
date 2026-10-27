-- Painel de super admin da ARXUM (/crew/admin).
-- Só quem está em admins_plataforma enxerga todas as empresas, troca planos
-- e suspende contas. Tudo passa por funções que conferem isso no banco.

create table if not exists public.admins_plataforma (
  user_id uuid primary key references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now()
);
alter table public.admins_plataforma enable row level security;
-- Sem políticas: ninguém lê ou altera esta tabela pela API.
revoke all on public.admins_plataforma from anon, authenticated;

alter table public.companies
  add column if not exists suspensa boolean not null default false,
  add column if not exists suspensa_em timestamptz,
  add column if not exists observacao_admin text;

create or replace function public.eh_admin_plataforma()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins_plataforma where user_id = auth.uid())
$$;

-- Empresa suspensa: os usuários dela deixam de enxergar qualquer dado
-- (todas as políticas passam por get_company_id).
create or replace function public.get_company_id()
returns uuid language sql stable security definer set search_path = public as $$
  select p.company_id from profiles p join companies c on c.id = p.company_id
  where p.id = auth.uid() and not c.suspensa
$$;

-- Diz ao app se a conta do usuário está suspensa (para mostrar o aviso certo).
create or replace function public.minha_empresa_suspensa()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select c.suspensa from profiles p join companies c on c.id = p.company_id
                    where p.id = auth.uid()), false)
$$;

-- O link público de cadastro de profissionais fica fora do ar na suspensão.
create or replace function public.empresa_publica(p_slug text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'name', name,
    'logo_url', case when tem_marca_propria(plano) then logo_url end,
    'primary_color', case when tem_marca_propria(plano) then primary_color else '#8b5cf6' end,
    'especialidades', especialidades, 'segmento', segmento)
  from companies where slug = lower(trim(p_slug)) and not suspensa
$$;

-- ---------------------------------------------------------------------------
-- Funções do painel (todas recusam quem não é admin da plataforma)
-- ---------------------------------------------------------------------------
create or replace function public.admin_exigir()
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not eh_admin_plataforma() then
    raise exception 'Acesso restrito à equipe ARXUM.' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.admin_empresas()
returns table (
  id uuid, name text, slug text, segmento text, plano text, suspensa boolean,
  observacao_admin text, created_at timestamptz, plano_atualizado_em timestamptz,
  whatsapp text, email_admin text, ultimo_acesso timestamptz,
  usuarios bigint, profissionais bigint, trabalhos_mes bigint, trabalhos_total bigint
) language plpgsql stable security definer set search_path = public as $$
begin
  perform admin_exigir();
  return query
  select c.id, c.name, c.slug, c.segmento, c.plano, c.suspensa, c.observacao_admin,
         c.created_at, c.plano_atualizado_em, c.whatsapp,
         (select u.email::text from profiles p join auth.users u on u.id = p.id
           where p.company_id = c.id order by (p.role in ('admin', 'super_admin')) desc, p.created_at limit 1),
         (select max(u.last_sign_in_at) from profiles p join auth.users u on u.id = p.id where p.company_id = c.id),
         (select count(*) from profiles p where p.company_id = c.id),
         (select count(*) from freelancers f where f.company_id = c.id),
         (select count(*) from eventos e where e.company_id = c.id
           and date_trunc('month', e.data) = date_trunc('month', hoje_br())),
         (select count(*) from eventos e where e.company_id = c.id)
  from companies c
  order by c.created_at desc;
end;
$$;

create or replace function public.admin_alterar_plano(p_company uuid, p_plano text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform admin_exigir();
  if p_plano not in ('gratis', 'essencial', 'profissional', 'empresa') then
    raise exception 'Plano inválido.';
  end if;
  update companies set plano = p_plano where id = p_company;
end;
$$;

create or replace function public.admin_suspender(p_company uuid, p_suspensa boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform admin_exigir();
  update companies
     set suspensa = p_suspensa,
         suspensa_em = case when p_suspensa then now() else null end
   where id = p_company;
end;
$$;

create or replace function public.admin_salvar_observacao(p_company uuid, p_texto text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform admin_exigir();
  update companies set observacao_admin = nullif(left(trim(p_texto), 1000), '') where id = p_company;
end;
$$;

revoke execute on function
  public.eh_admin_plataforma(), public.minha_empresa_suspensa(), public.admin_exigir(),
  public.admin_empresas(), public.admin_alterar_plano(uuid, text),
  public.admin_suspender(uuid, boolean), public.admin_salvar_observacao(uuid, text)
from public, anon;
grant execute on function
  public.eh_admin_plataforma(), public.minha_empresa_suspensa(),
  public.admin_empresas(), public.admin_alterar_plano(uuid, text),
  public.admin_suspender(uuid, boolean), public.admin_salvar_observacao(uuid, text)
to authenticated;
grant execute on function public.empresa_publica(text) to anon, authenticated;
grant execute on function public.get_company_id() to authenticated;

-- Para se tornar admin, rode uma vez (trocando o e-mail pelo da sua conta):
-- insert into public.admins_plataforma (user_id)
--   select id from auth.users where email = 'SEU_EMAIL_AQUI'
-- on conflict do nothing;
