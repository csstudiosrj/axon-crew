-- Planos do ARXUM Crew e limites garantidos pelo banco.
--   gratis       R$ 0    até 20 profissionais, 3 trabalhos/mês, 1 usuário
--   essencial    R$ 69   profissionais ilimitados, 15 trabalhos/mês, 1 usuário
--   profissional R$ 149  ilimitado, marca própria, exportação CSV, 1 usuário
--   empresa      R$ 349  tudo do profissional, até 10 usuários
-- A troca de plano é feita pela ARXUM (SQL editor / painel do Supabase);
-- o usuário da empresa não consegue alterar o próprio plano.

-- Empresas que já existiam antes dos planos entram no Profissional.
-- (Só na primeira execução: rodar de novo não mexe em quem está no Grátis.)
do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'companies' and column_name = 'plano') then
    alter table public.companies add column plano text not null default 'gratis';
    update public.companies set plano = 'profissional';
  end if;
end $$;

alter table public.companies add column if not exists plano_atualizado_em timestamptz;

alter table public.companies drop constraint if exists companies_plano_check;
alter table public.companies add constraint companies_plano_check
  check (plano in ('gratis', 'essencial', 'profissional', 'empresa'));

create or replace function public.limite_plano(p_plano text, p_recurso text)
returns integer language sql immutable as $$
  select case p_recurso
    when 'profissionais' then case p_plano when 'gratis' then 20 else null end
    when 'trabalhos_mes' then case p_plano when 'gratis' then 3 when 'essencial' then 15 else null end
    when 'usuarios'      then case p_plano when 'empresa' then 10 else 1 end
  end
$$;

-- Marca própria (cor e logo nas páginas públicas) a partir do Profissional.
create or replace function public.tem_marca_propria(p_plano text)
returns boolean language sql immutable as $$
  select p_plano in ('profissional', 'empresa')
$$;

create or replace function public.checar_limite_profissionais()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_max integer;
begin
  select limite_plano(plano, 'profissionais') into v_max from companies where id = new.company_id;
  if v_max is not null and (select count(*) from freelancers where company_id = new.company_id) >= v_max then
    raise exception 'LIMITE_PLANO: a base de profissionais chegou ao limite do plano (%).', v_max;
  end if;
  return new;
end;
$$;

create or replace function public.checar_limite_trabalhos()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_max integer;
begin
  if tg_op = 'UPDATE' and date_trunc('month', new.data) = date_trunc('month', old.data) then
    return new;
  end if;
  select limite_plano(plano, 'trabalhos_mes') into v_max from companies where id = new.company_id;
  if v_max is not null and (
    select count(*) from eventos
     where company_id = new.company_id and id <> new.id
       and date_trunc('month', data) = date_trunc('month', new.data)) >= v_max then
    raise exception 'LIMITE_PLANO: o plano permite % trabalhos por mês.', v_max;
  end if;
  return new;
end;
$$;

create or replace function public.checar_limite_usuarios()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_max integer;
begin
  select limite_plano(plano, 'usuarios') into v_max from companies where id = new.company_id;
  if (select count(*) from profiles where company_id = new.company_id) >= v_max then
    raise exception 'LIMITE_PLANO: o plano permite % usuário(s).', v_max;
  end if;
  return new;
end;
$$;

create or replace function public.proteger_plano()
returns trigger language plpgsql as $$
begin
  if new.plano is distinct from old.plano then
    if current_user in ('authenticated', 'anon') then
      raise exception 'O plano só pode ser alterado pela ARXUM.';
    end if;
    new.plano_atualizado_em := now();
  end if;
  return new;
end;
$$;

drop trigger if exists limite_profissionais on public.freelancers;
create trigger limite_profissionais before insert on public.freelancers
  for each row execute function public.checar_limite_profissionais();

drop trigger if exists limite_trabalhos on public.eventos;
create trigger limite_trabalhos before insert or update of data on public.eventos
  for each row execute function public.checar_limite_trabalhos();

drop trigger if exists limite_usuarios on public.profiles;
create trigger limite_usuarios before insert on public.profiles
  for each row execute function public.checar_limite_usuarios();

drop trigger if exists proteger_plano on public.companies;
create trigger proteger_plano before update on public.companies
  for each row execute function public.proteger_plano();
