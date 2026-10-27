-- Segurança: fecha o acesso público direto às tabelas. As páginas públicas
-- (cadastro de profissional, escala, confirmação) passam a usar funções que
-- devolvem só o necessário e validam cada operação.
--
-- Depende de 20261028_planos.sql (plano da empresa).
--
-- Também prepara: link individual por pessoa escalada (token), aceite/recusa,
-- check-in/check-out, termo aceito, área do profissional e consentimento LGPD.

-- ---------------------------------------------------------------------------
-- 1. Colunas novas
-- ---------------------------------------------------------------------------
alter table public.evento_escalas
  add column if not exists token uuid not null default gen_random_uuid(),
  add column if not exists resposta text not null default 'pendente',
  add column if not exists respondido_em timestamptz,
  add column if not exists motivo_recusa text,
  add column if not exists termo_aceito_em timestamptz,
  add column if not exists termo_ip text,
  add column if not exists checkin_em timestamptz,
  add column if not exists checkin_lat numeric,
  add column if not exists checkin_lng numeric,
  add column if not exists checkout_em timestamptz,
  add column if not exists checkout_lat numeric,
  add column if not exists checkout_lng numeric;

alter table public.evento_escalas drop constraint if exists evento_escalas_resposta_check;
alter table public.evento_escalas add constraint evento_escalas_resposta_check
  check (resposta in ('pendente', 'confirmado', 'recusado'));
create unique index if not exists evento_escalas_token_key on public.evento_escalas (token);

update public.evento_escalas
   set resposta = 'confirmado', respondido_em = coalesce(confirmado_em, now())
 where confirmado and resposta = 'pendente';

alter table public.freelancers
  add column if not exists token_acesso uuid not null default gen_random_uuid(),
  add column if not exists consentimento_em timestamptz,
  add column if not exists documentos jsonb not null default '{}'::jsonb;
create unique index if not exists freelancers_token_acesso_key on public.freelancers (token_acesso);

-- ---------------------------------------------------------------------------
-- 2. Funções auxiliares (security definer evita recursão nas políticas)
-- ---------------------------------------------------------------------------
create or replace function public.get_company_id()
returns uuid language sql stable security definer set search_path = public as $$
  select company_id from profiles where id = auth.uid()
$$;

create or replace function public.get_role()
returns text language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

-- Data de hoje no fuso de Brasília (check-in e prazos de resposta).
create or replace function public.hoje_br()
returns date language sql stable as $$
  select (now() at time zone 'America/Sao_Paulo')::date
$$;

-- ---------------------------------------------------------------------------
-- 3. Políticas: remove as abertas e endurece as da empresa
-- ---------------------------------------------------------------------------
drop policy if exists companies_public_read on public.companies;
drop policy if exists freelancers_public_read on public.freelancers;
drop policy if exists freelancers_public_insert on public.freelancers;
drop policy if exists eventos_public_read on public.eventos;
drop policy if exists slots_public_read on public.evento_slots;
drop policy if exists escalas_public_read on public.evento_escalas;
drop policy if exists escalas_public_confirm on public.evento_escalas;
drop policy if exists callsheets_public_read on public.call_sheets;

-- Tabela sem uso no app, com acesso público aberto e chave estrangeira errada.
drop table if exists public.call_sheet_confirmacoes;

-- Empresa: todos os membros leem; só administradores alteram.
drop policy if exists companies_own on public.companies;
drop policy if exists companies_select on public.companies;
drop policy if exists companies_update on public.companies;
create policy companies_select on public.companies for select using (id = get_company_id());
create policy companies_update on public.companies for update
  using (id = get_company_id() and get_role() in ('admin', 'super_admin'))
  with check (id = get_company_id());

-- Escalas: a pessoa e a vaga precisam ser da mesma empresa do evento.
drop policy if exists escalas_company on public.evento_escalas;
create policy escalas_company on public.evento_escalas for all
  using (evento_id in (select id from eventos where company_id = get_company_id()))
  with check (
    evento_id in (select id from eventos where company_id = get_company_id())
    and slot_id in (select id from evento_slots where evento_id = evento_escalas.evento_id)
    and freelancer_id in (select id from freelancers where company_id = get_company_id())
  );

drop policy if exists slots_company on public.evento_slots;
create policy slots_company on public.evento_slots for all
  using (evento_id in (select id from eventos where company_id = get_company_id()))
  with check (evento_id in (select id from eventos where company_id = get_company_id()));

drop policy if exists freelancers_company on public.freelancers;
create policy freelancers_company on public.freelancers for all
  using (company_id = get_company_id()) with check (company_id = get_company_id());

drop policy if exists eventos_company on public.eventos;
create policy eventos_company on public.eventos for all
  using (company_id = get_company_id()) with check (company_id = get_company_id());

drop policy if exists callsheets_company on public.call_sheets;
create policy callsheets_company on public.call_sheets for all
  using (company_id = get_company_id()) with check (company_id = get_company_id()
    and evento_id in (select id from eventos where company_id = get_company_id()));

-- Membros da empresa se enxergam (tela de equipe).
drop policy if exists profiles_select_company on public.profiles;
create policy profiles_select_company on public.profiles for select using (company_id = get_company_id());

-- ---------------------------------------------------------------------------
-- 4. Permissões: visitante anônimo não acessa tabelas, só as funções abaixo
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;
alter default privileges in schema public revoke all on tables from anon;
revoke execute on all functions in schema public from public, anon;
alter default privileges in schema public revoke execute on functions from public, anon;

-- ---------------------------------------------------------------------------
-- 5. Funções públicas
-- ---------------------------------------------------------------------------

-- Dados de vitrine da empresa para o link de cadastro.
create or replace function public.empresa_publica(p_slug text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'name', name,
    'logo_url', case when tem_marca_propria(plano) then logo_url end,
    'primary_color', case when tem_marca_propria(plano) then primary_color else '#8b5cf6' end,
    'especialidades', especialidades, 'segmento', segmento)
  from companies where slug = lower(trim(p_slug))
$$;

create or replace function public.slug_disponivel(p_slug text)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (select 1 from companies where slug = lower(trim(p_slug)))
$$;

-- Cadastro do profissional pelo link da empresa.
-- Retorna: ok | empresa_nao_encontrada | consentimento | dados_invalidos | cpf_duplicado
create or replace function public.cadastrar_profissional(
  p_slug text, p_nome text, p_telefone text, p_cpf text, p_email text,
  p_especialidade text, p_diaria numeric, p_chave_pix text,
  p_consentimento boolean, p_documentos jsonb default '{}'::jsonb
) returns text language plpgsql security definer set search_path = public as $$
declare
  v_company uuid;
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_tel text := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');
begin
  select id into v_company from companies where slug = lower(trim(p_slug));
  if v_company is null then return 'empresa_nao_encontrada'; end if;
  if not coalesce(p_consentimento, false) then return 'consentimento'; end if;
  if length(trim(coalesce(p_nome, ''))) not between 3 and 120
     or length(v_cpf) <> 11 or length(v_tel) not between 10 and 11
     or length(trim(coalesce(p_especialidade, ''))) not between 2 and 80
     or p_diaria is null or p_diaria <= 0 or p_diaria > 100000
     or length(coalesce(p_email, '')) > 160 or length(coalesce(p_chave_pix, '')) > 140
     or jsonb_typeof(coalesce(p_documentos, '{}'::jsonb)) <> 'object'
     or length(coalesce(p_documentos, '{}'::jsonb)::text) > 4000 then
    return 'dados_invalidos';
  end if;
  if exists (select 1 from freelancers where company_id = v_company and cpf = v_cpf) then
    return 'cpf_duplicado';
  end if;

  insert into freelancers (company_id, nome, telefone, cpf, email, especialidade, diaria,
                           chave_pix, status, avaliacao, consentimento_em, documentos)
  values (v_company, trim(p_nome), v_tel, v_cpf, nullif(trim(p_email), ''), trim(p_especialidade),
          p_diaria, nullif(trim(p_chave_pix), ''), 'disponivel', 5.0, now(),
          coalesce(p_documentos, '{}'::jsonb));
  return 'ok';
end;
$$;

-- Escala publicada (visão da equipe, sem botões de confirmação).
create or replace function public.ver_roteiro(p_id uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'empresa', json_build_object('name', c.name, 'logo_url', case when tem_marca_propria(c.plano) then c.logo_url end,
                                 'primary_color', case when tem_marca_propria(c.plano) then c.primary_color else '#8b5cf6' end, 'segmento', c.segmento),
    'evento', json_build_object('titulo', e.titulo, 'data', e.data,
                                'horario_inicio', e.horario_inicio, 'local', e.local),
    'equipe', coalesce((
      select json_agg(json_build_object('nome', f.nome, 'especialidade', s.especialidade,
                                        'resposta', x.resposta) order by s.especialidade, f.nome)
      from evento_escalas x
      join freelancers f on f.id = x.freelancer_id
      join evento_slots s on s.id = x.slot_id
      where x.evento_id = e.id and x.resposta <> 'recusado'), '[]'::json))
  from call_sheets cs
  join eventos e on e.id = cs.evento_id
  join companies c on c.id = cs.company_id
  where cs.id = p_id and cs.publicado
$$;

-- Convite individual: o que a pessoa escalada vê pelo próprio link.
create or replace function public.ver_convite(p_token uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'empresa', json_build_object('name', c.name, 'logo_url', case when tem_marca_propria(c.plano) then c.logo_url end, 'primary_color', case when tem_marca_propria(c.plano) then c.primary_color else '#8b5cf6' end,
                                 'segmento', c.segmento, 'whatsapp', c.whatsapp),
    'evento', json_build_object('titulo', e.titulo, 'data', e.data,
                                'horario_inicio', e.horario_inicio, 'local', e.local, 'status', e.status),
    'profissional', json_build_object('nome', f.nome, 'cpf_final', right(coalesce(f.cpf, ''), 4),
                                      'token_acesso', f.token_acesso),
    'funcao', s.especialidade,
    'valor', s.cache_base,
    'resposta', x.resposta,
    'respondido_em', x.respondido_em,
    'termo_aceito_em', x.termo_aceito_em,
    'checkin_em', x.checkin_em,
    'checkout_em', x.checkout_em,
    'hoje', hoje_br())
  from evento_escalas x
  join eventos e on e.id = x.evento_id
  join companies c on c.id = e.company_id
  join freelancers f on f.id = x.freelancer_id
  join evento_slots s on s.id = x.slot_id
  where x.token = p_token
$$;

-- Resposta ao convite. Confirmar exige aceitar o termo.
-- Retorna: ok | nao_encontrado | prazo_encerrado | termo | resposta_invalida
create or replace function public.responder_convite(
  p_token uuid, p_resposta text, p_aceite_termo boolean default false, p_motivo text default null
) returns text language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_data date;
  v_ip text;
begin
  if p_resposta not in ('confirmado', 'recusado') then return 'resposta_invalida'; end if;
  select x.id, e.data into v_id, v_data
    from evento_escalas x join eventos e on e.id = x.evento_id
   where x.token = p_token;
  if v_id is null then return 'nao_encontrado'; end if;
  if v_data < hoje_br() then return 'prazo_encerrado'; end if;
  if p_resposta = 'confirmado' and not coalesce(p_aceite_termo, false) then return 'termo'; end if;

  begin
    v_ip := split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1);
  exception when others then v_ip := null;
  end;

  update evento_escalas set
    resposta        = p_resposta,
    confirmado      = (p_resposta = 'confirmado'),
    confirmado_em   = case when p_resposta = 'confirmado' then now() else null end,
    respondido_em   = now(),
    motivo_recusa   = case when p_resposta = 'recusado' then left(p_motivo, 300) else null end,
    termo_aceito_em = case when p_resposta = 'confirmado' then now() else null end,
    termo_ip        = case when p_resposta = 'confirmado' then v_ip else null end
  where id = v_id;
  return 'ok';
end;
$$;

-- Check-in e check-out pelo link individual, no dia do trabalho
-- (o check-out também vale no dia seguinte, para jornadas que viram a noite).
-- Retorna: ok | nao_encontrado | nao_confirmado | fora_do_dia | sem_checkin | ja_registrado | tipo_invalido
create or replace function public.registrar_presenca(
  p_token uuid, p_tipo text, p_lat numeric default null, p_lng numeric default null
) returns text language plpgsql security definer set search_path = public as $$
declare
  v record;
begin
  select x.*, e.data as data_evento into v
    from evento_escalas x join eventos e on e.id = x.evento_id
   where x.token = p_token;
  if v.id is null then return 'nao_encontrado'; end if;
  if v.resposta <> 'confirmado' then return 'nao_confirmado'; end if;

  if p_tipo = 'checkin' then
    if hoje_br() <> v.data_evento then return 'fora_do_dia'; end if;
    if v.checkin_em is not null then return 'ja_registrado'; end if;
    update evento_escalas set checkin_em = now(), checkin_lat = p_lat, checkin_lng = p_lng where id = v.id;
  elsif p_tipo = 'checkout' then
    if v.checkin_em is null then return 'sem_checkin'; end if;
    if hoje_br() not in (v.data_evento, v.data_evento + 1) then return 'fora_do_dia'; end if;
    if v.checkout_em is not null then return 'ja_registrado'; end if;
    update evento_escalas set checkout_em = now(), checkout_lat = p_lat, checkout_lng = p_lng where id = v.id;
  else
    return 'tipo_invalido';
  end if;
  return 'ok';
end;
$$;

-- Área do profissional: trabalhos e pagamentos pelo link pessoal.
create or replace function public.area_profissional(p_token uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'profissional', json_build_object('nome', f.nome, 'especialidade', f.especialidade),
    'empresa', json_build_object('name', c.name, 'logo_url', case when tem_marca_propria(c.plano) then c.logo_url end, 'primary_color', case when tem_marca_propria(c.plano) then c.primary_color else '#8b5cf6' end,
                                 'segmento', c.segmento, 'whatsapp', c.whatsapp),
    'hoje', hoje_br(),
    'trabalhos', coalesce((
      select json_agg(json_build_object(
               'token', x.token, 'titulo', e.titulo, 'data', e.data, 'horario_inicio', e.horario_inicio,
               'local', e.local, 'funcao', s.especialidade, 'valor', s.cache_base,
               'resposta', x.resposta, 'checkin_em', x.checkin_em, 'checkout_em', x.checkout_em,
               'status_pagamento', x.status_pagamento, 'data_pagamento', x.data_pagamento)
             order by e.data desc)
      from evento_escalas x
      join eventos e on e.id = x.evento_id
      join evento_slots s on s.id = x.slot_id
      where x.freelancer_id = f.id and e.data >= hoje_br() - 120), '[]'::json))
  from freelancers f join companies c on c.id = f.company_id
  where f.token_acesso = p_token
$$;

grant execute on function
  public.empresa_publica(text),
  public.slug_disponivel(text),
  public.cadastrar_profissional(text, text, text, text, text, text, numeric, text, boolean, jsonb),
  public.ver_roteiro(uuid),
  public.ver_convite(uuid),
  public.responder_convite(uuid, text, boolean, text),
  public.registrar_presenca(uuid, text, numeric, numeric),
  public.area_profissional(uuid)
to anon, authenticated;

grant execute on function public.get_company_id(), public.get_role(), public.hoje_br() to authenticated;
grant execute on function public.criar_empresa(text, text) to authenticated;
