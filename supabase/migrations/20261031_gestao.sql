-- Gestão da plataforma: faturas, cobrança por e-mail, atividade das empresas
-- e suporte por chat. Enquanto a integração com a Pagar.me não chega, as
-- faturas são pagas por PIX para a ARXUM e baixadas no painel.

-- ---------------------------------------------------------------------------
-- Configuração da plataforma (uma linha só)
-- ---------------------------------------------------------------------------
create table if not exists public.config_plataforma (
  id integer primary key default 1 check (id = 1),
  pix_chave text,
  pix_nome text,
  pix_cidade text not null default 'RIO DE JANEIRO',
  email_suporte text,
  whatsapp text,
  dia_vencimento_padrao integer not null default 10 check (dia_vencimento_padrao between 1 and 28),
  lembrete_dias_antes integer not null default 3 check (lembrete_dias_antes between 0 and 15),
  cobranca_dias_depois integer[] not null default '{1,5,10}',
  suspender_apos_dias integer check (suspender_apos_dias is null or suspender_apos_dias between 1 and 90),
  emails_automaticos boolean not null default true,
  atualizado_em timestamptz not null default now()
);
insert into public.config_plataforma (id) values (1) on conflict do nothing;
alter table public.config_plataforma enable row level security;
revoke all on public.config_plataforma from anon, authenticated;

alter table public.companies
  add column if not exists dia_vencimento integer check (dia_vencimento between 1 and 28),
  add column if not exists email_cobranca text;

-- ---------------------------------------------------------------------------
-- Faturas
-- ---------------------------------------------------------------------------
create table if not exists public.faturas (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity,
  company_id uuid not null references public.companies(id) on delete cascade,
  competencia date,                        -- 1º dia do mês da mensalidade; null em avulsas
  descricao text not null,
  plano text,
  valor numeric(10, 2) not null check (valor > 0),
  vencimento date not null,
  status text not null default 'pendente' check (status in ('pendente', 'paga', 'cancelada')),
  pago_em timestamptz,
  valor_pago numeric(10, 2),
  forma_pagamento text,
  pagamento_informado_em timestamptz,      -- empresa clicou "Já paguei"
  observacao text,
  criado_em timestamptz not null default now(),
  criado_por uuid references auth.users(id) on delete set null
);
create unique index if not exists faturas_mensalidade_unica on public.faturas (company_id, competencia)
  where competencia is not null and status <> 'cancelada';
create index if not exists faturas_status_venc on public.faturas (status, vencimento);
alter table public.faturas enable row level security;

-- Empresa da pessoa logada, mesmo suspensa (para ver faturas e falar com o suporte).
create or replace function public.minha_empresa_id()
returns uuid language sql stable security definer set search_path = public as $$
  select company_id from profiles where id = auth.uid()
$$;

drop policy if exists faturas_empresa on public.faturas;
create policy faturas_empresa on public.faturas for select using (company_id = minha_empresa_id());
revoke all on public.faturas from anon;
revoke insert, update, delete on public.faturas from authenticated;
grant select on public.faturas to authenticated;

-- ---------------------------------------------------------------------------
-- E-mails enviados (histórico e controle da régua automática)
-- ---------------------------------------------------------------------------
create table if not exists public.emails_enviados (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  fatura_id uuid references public.faturas(id) on delete cascade,
  chamado_id uuid,
  tipo text not null,
  para text not null,
  assunto text not null,
  status text not null default 'enviado' check (status in ('enviado', 'erro')),
  erro text,
  automatico boolean not null default false,
  enviado_por uuid references auth.users(id) on delete set null,
  enviado_em timestamptz not null default now()
);
create index if not exists emails_fatura_tipo on public.emails_enviados (fatura_id, tipo);
alter table public.emails_enviados enable row level security;
revoke all on public.emails_enviados from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Suporte
-- ---------------------------------------------------------------------------
create table if not exists public.chamados (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity,
  company_id uuid not null references public.companies(id) on delete cascade,
  assunto text not null check (length(trim(assunto)) between 3 and 140),
  status text not null default 'aberto' check (status in ('aberto', 'respondido', 'resolvido')),
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  ultima_msg_em timestamptz not null default now()
);
create table if not exists public.chamado_mensagens (
  id uuid primary key default gen_random_uuid(),
  chamado_id uuid not null references public.chamados(id) on delete cascade,
  autor_id uuid references auth.users(id) on delete set null,
  autor_arxum boolean not null default false,
  texto text not null check (length(trim(texto)) between 1 and 5000),
  criado_em timestamptz not null default now(),
  lida_em timestamptz
);
create index if not exists mensagens_chamado on public.chamado_mensagens (chamado_id, criado_em);
alter table public.chamados enable row level security;
alter table public.chamado_mensagens enable row level security;

drop policy if exists chamados_empresa on public.chamados;
create policy chamados_empresa on public.chamados for select using (company_id = minha_empresa_id());
drop policy if exists mensagens_empresa on public.chamado_mensagens;
create policy mensagens_empresa on public.chamado_mensagens for select
  using (chamado_id in (select id from chamados where company_id = minha_empresa_id()));
revoke all on public.chamados, public.chamado_mensagens from anon;
revoke insert, update, delete on public.chamados, public.chamado_mensagens from authenticated;
grant select on public.chamados, public.chamado_mensagens to authenticated;

-- ---------------------------------------------------------------------------
-- Funções da empresa
-- ---------------------------------------------------------------------------

-- Dados básicos da própria empresa, mesmo suspensa.
create or replace function public.minha_empresa()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('id', c.id, 'name', c.name, 'plano', c.plano, 'suspensa', c.suspensa,
                           'segmento', c.segmento, 'email_cobranca', c.email_cobranca,
                           'dia_vencimento', coalesce(c.dia_vencimento, cfg.dia_vencimento_padrao))
  from profiles p join companies c on c.id = p.company_id cross join config_plataforma cfg
  where p.id = auth.uid()
$$;

-- Dados para pagar a ARXUM por PIX.
create or replace function public.dados_pagamento()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('pix_chave', pix_chave, 'pix_nome', pix_nome, 'pix_cidade', pix_cidade,
                           'whatsapp', whatsapp, 'email_suporte', email_suporte)
  from config_plataforma where auth.uid() is not null
$$;

create or replace function public.informar_pagamento(p_fatura uuid)
returns text language plpgsql security definer set search_path = public as $$
begin
  update faturas set pagamento_informado_em = now()
   where id = p_fatura and company_id = minha_empresa_id() and status = 'pendente';
  return case when found then 'ok' else 'nao_encontrada' end;
end;
$$;

create or replace function public.abrir_chamado(p_assunto text, p_texto text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if minha_empresa_id() is null then raise exception 'Sem empresa.'; end if;
  insert into chamados (company_id, assunto, criado_por) values (minha_empresa_id(), trim(p_assunto), auth.uid())
  returning id into v_id;
  insert into chamado_mensagens (chamado_id, autor_id, texto) values (v_id, auth.uid(), trim(p_texto));
  return v_id;
end;
$$;

create or replace function public.responder_chamado(p_chamado uuid, p_texto text)
returns text language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from chamados where id = p_chamado and company_id = minha_empresa_id()) then
    return 'nao_encontrado';
  end if;
  insert into chamado_mensagens (chamado_id, autor_id, texto) values (p_chamado, auth.uid(), trim(p_texto));
  update chamados set status = 'aberto', ultima_msg_em = now() where id = p_chamado;
  return 'ok';
end;
$$;

-- A empresa leu as respostas da ARXUM.
create or replace function public.marcar_chamado_lido(p_chamado uuid)
returns void language sql security definer set search_path = public as $$
  update chamado_mensagens set lida_em = now()
   where chamado_id = p_chamado and autor_arxum and lida_em is null
     and p_chamado in (select id from chamados where company_id = minha_empresa_id())
$$;

-- ---------------------------------------------------------------------------
-- Funções do painel da ARXUM
-- ---------------------------------------------------------------------------

-- Valor da mensalidade de cada plano (o mesmo de lib/planos.ts).
create or replace function public.preco_plano(p_plano text)
returns numeric language sql immutable as $$
  select case p_plano when 'essencial' then 69 when 'profissional' then 149 when 'empresa' then 349 else 0 end::numeric
$$;

-- E-mail que recebe a cobrança: o definido no painel ou o do administrador da empresa.
create or replace function public.email_empresa(p_company uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select email_cobranca from companies where id = p_company), (
    select u.email::text from profiles p join auth.users u on u.id = p.id
     where p.company_id = p_company order by (p.role in ('admin', 'super_admin')) desc, p.created_at limit 1))
$$;

create or replace function public.admin_resumo()
returns json language plpgsql stable security definer set search_path = public as $$
declare
  v_ini date := date_trunc('month', hoje_br())::date;
  v_ini_ant date := (date_trunc('month', hoje_br()) - interval '1 month')::date;
begin
  perform admin_exigir();
  return json_build_object(
    'recebido_mes', coalesce((select sum(coalesce(valor_pago, valor)) from faturas
                               where status = 'paga' and pago_em >= v_ini), 0),
    'recebido_mes_anterior', coalesce((select sum(coalesce(valor_pago, valor)) from faturas
                               where status = 'paga' and pago_em >= v_ini_ant and pago_em < v_ini), 0),
    'a_receber', coalesce((select sum(valor) from faturas where status = 'pendente' and vencimento >= hoje_br()), 0),
    'vencido', coalesce((select sum(valor) from faturas where status = 'pendente' and vencimento < hoje_br()), 0),
    'faturas_vencidas', (select count(*) from faturas where status = 'pendente' and vencimento < hoje_br()),
    'empresas_inadimplentes', (select count(distinct company_id) from faturas where status = 'pendente' and vencimento < hoje_br()),
    'pagamentos_informados', (select count(*) from faturas where status = 'pendente' and pagamento_informado_em is not null),
    'mensalidade_contratada', coalesce((select sum(preco_plano(plano)) from companies where not suspensa), 0),
    'empresas_ativas', (select count(*) from companies where not suspensa),
    'empresas_pagantes', (select count(*) from companies where not suspensa and preco_plano(plano) > 0),
    'empresas_suspensas', (select count(*) from companies where suspensa),
    'novas_30d', (select count(*) from companies where created_at > now() - interval '30 days'),
    'chamados_abertos', (select count(*) from chamados where status = 'aberto'),
    'recebido_por_mes', coalesce((
      select json_agg(json_build_object('mes', m, 'valor', v) order by m) from (
        select date_trunc('month', pago_em)::date m, sum(coalesce(valor_pago, valor)) v from faturas
         where status = 'paga' and pago_em >= date_trunc('month', hoje_br()) - interval '5 months'
         group by 1) x), '[]'::json)
  );
end;
$$;

create or replace function public.admin_faturas(p_company uuid default null)
returns table (
  id uuid, numero bigint, company_id uuid, empresa text, email text, competencia date, descricao text,
  plano text, valor numeric, vencimento date, status text, pago_em timestamptz, valor_pago numeric,
  forma_pagamento text, pagamento_informado_em timestamptz, observacao text, criado_em timestamptz,
  dias_atraso integer, ultimo_email_em timestamptz, ultimo_email_tipo text
) language plpgsql stable security definer set search_path = public as $$
begin
  perform admin_exigir();
  return query
  select f.id, f.numero, f.company_id, c.name, email_empresa(c.id),
         f.competencia, f.descricao, f.plano, f.valor, f.vencimento, f.status, f.pago_em, f.valor_pago,
         f.forma_pagamento, f.pagamento_informado_em, f.observacao, f.criado_em,
         case when f.status = 'pendente' and f.vencimento < hoje_br() then hoje_br() - f.vencimento else 0 end,
         (select max(e.enviado_em) from emails_enviados e where e.fatura_id = f.id and e.status = 'enviado'),
         (select e.tipo from emails_enviados e where e.fatura_id = f.id and e.status = 'enviado' order by e.enviado_em desc limit 1)
  from faturas f join companies c on c.id = f.company_id
  where p_company is null or f.company_id = p_company
  order by (f.status = 'pendente') desc, f.vencimento desc, f.numero desc;
end;
$$;

-- Gera as mensalidades do mês para as empresas ativas em plano pago.
create or replace function public.gerar_mensalidades(p_competencia date)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_comp date := date_trunc('month', p_competencia)::date;
  v_total integer;
begin
  insert into faturas (company_id, competencia, descricao, plano, valor, vencimento)
  select c.id, v_comp,
         'Mensalidade ARXUM Crew ' || initcap(c.plano) || ' — ' || to_char(v_comp, 'MM/YYYY'),
         c.plano, preco_plano(c.plano),
         -- Primeira fatura gerada depois do dia de vencimento: dá 3 dias para pagar.
         greatest(make_date(extract(year from v_comp)::int, extract(month from v_comp)::int,
                            coalesce(c.dia_vencimento, cfg.dia_vencimento_padrao)), hoje_br() + 3)
  from companies c cross join config_plataforma cfg
  where not c.suspensa and preco_plano(c.plano) > 0
    and not exists (select 1 from faturas f where f.company_id = c.id and f.competencia = v_comp and f.status <> 'cancelada');
  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

create or replace function public.admin_gerar_mensalidades(p_competencia date)
returns integer language plpgsql security definer set search_path = public as $$
begin
  perform admin_exigir();
  return gerar_mensalidades(p_competencia);
end;
$$;

create or replace function public.admin_criar_fatura(p_company uuid, p_descricao text, p_valor numeric, p_vencimento date)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  perform admin_exigir();
  insert into faturas (company_id, descricao, valor, vencimento, criado_por)
  values (p_company, trim(p_descricao), p_valor, p_vencimento, auth.uid()) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.admin_baixar_fatura(p_fatura uuid, p_pago_em date, p_valor_pago numeric, p_forma text, p_observacao text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform admin_exigir();
  update faturas set status = 'paga', pago_em = (p_pago_em::timestamp at time zone 'America/Sao_Paulo') + interval '12 hours',
                     valor_pago = p_valor_pago, forma_pagamento = p_forma,
                     observacao = coalesce(nullif(trim(p_observacao), ''), observacao)
   where id = p_fatura and status = 'pendente';
end;
$$;

create or replace function public.admin_cancelar_fatura(p_fatura uuid, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform admin_exigir();
  update faturas set status = 'cancelada', observacao = nullif(trim(p_motivo), '') where id = p_fatura and status = 'pendente';
end;
$$;

create or replace function public.admin_reabrir_fatura(p_fatura uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform admin_exigir();
  update faturas set status = 'pendente', pago_em = null, valor_pago = null, forma_pagamento = null where id = p_fatura;
end;
$$;

create or replace function public.admin_empresa(p_company uuid)
returns json language plpgsql stable security definer set search_path = public as $$
begin
  perform admin_exigir();
  return (
    select json_build_object(
      'empresa', json_build_object('id', c.id, 'name', c.name, 'slug', c.slug, 'segmento', c.segmento,
                 'plano', c.plano, 'suspensa', c.suspensa, 'suspensa_em', c.suspensa_em, 'whatsapp', c.whatsapp,
                 'email_cobranca', c.email_cobranca, 'dia_vencimento', c.dia_vencimento,
                 'observacao_admin', c.observacao_admin, 'created_at', c.created_at, 'plano_atualizado_em', c.plano_atualizado_em),
      'usuarios', coalesce((select json_agg(json_build_object('email', u.email, 'nome', p.nome, 'papel', p.role,
                   'criado_em', p.created_at, 'ultimo_acesso', u.last_sign_in_at) order by p.created_at)
                   from profiles p join auth.users u on u.id = p.id where p.company_id = c.id), '[]'::json),
      'totais', json_build_object(
                 'profissionais', (select count(*) from freelancers where company_id = c.id),
                 'trabalhos', (select count(*) from eventos where company_id = c.id),
                 'escalas', (select count(*) from evento_escalas x join eventos e on e.id = x.evento_id where e.company_id = c.id),
                 'confirmacoes', (select count(*) from evento_escalas x join eventos e on e.id = x.evento_id where e.company_id = c.id and x.resposta = 'confirmado'),
                 'checkins', (select count(*) from evento_escalas x join eventos e on e.id = x.evento_id where e.company_id = c.id and x.checkin_em is not null)),
      'atividade', coalesce((select json_agg(json_build_object('mes', m.mes,
                   'trabalhos', (select count(*) from eventos e where e.company_id = c.id and date_trunc('month', e.created_at) = m.mes),
                   'profissionais', (select count(*) from freelancers f where f.company_id = c.id and date_trunc('month', f.created_at) = m.mes),
                   'escalas', (select count(*) from evento_escalas x join eventos e on e.id = x.evento_id
                               where e.company_id = c.id and date_trunc('month', e.data) = m.mes)) order by m.mes)
                   from (select generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') mes) m), '[]'::json),
      'ultimos_trabalhos', coalesce((select json_agg(t) from (
                   select e.titulo, e.data, e.status, e.created_at,
                          (select count(*) from evento_escalas x where x.evento_id = e.id) pessoas
                   from eventos e where e.company_id = c.id order by e.created_at desc limit 8) t), '[]'::json),
      'emails', coalesce((select json_agg(m) from (
                   select tipo, para, assunto, status, erro, automatico, enviado_em from emails_enviados
                    where company_id = c.id order by enviado_em desc limit 30) m), '[]'::json),
      'chamados', coalesce((select json_agg(h) from (
                   select id, numero, assunto, status, ultima_msg_em from chamados
                    where company_id = c.id order by ultima_msg_em desc limit 20) h), '[]'::json))
    from companies c where c.id = p_company);
end;
$$;

create or replace function public.admin_atualizar_empresa(p_company uuid, p_email_cobranca text, p_dia_vencimento integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform admin_exigir();
  update companies set email_cobranca = nullif(trim(p_email_cobranca), ''), dia_vencimento = p_dia_vencimento where id = p_company;
end;
$$;

create or replace function public.admin_chamados()
returns table (id uuid, numero bigint, company_id uuid, empresa text, assunto text, status text,
               criado_em timestamptz, ultima_msg_em timestamptz, nao_lidas bigint, ultima_msg text)
language plpgsql stable security definer set search_path = public as $$
begin
  perform admin_exigir();
  return query
  select h.id, h.numero, h.company_id, c.name, h.assunto, h.status, h.criado_em, h.ultima_msg_em,
         (select count(*) from chamado_mensagens m where m.chamado_id = h.id and not m.autor_arxum and m.lida_em is null),
         (select left(m.texto, 140) from chamado_mensagens m where m.chamado_id = h.id order by m.criado_em desc limit 1)
  from chamados h join companies c on c.id = h.company_id
  order by (h.status = 'aberto') desc, h.ultima_msg_em desc;
end;
$$;

create or replace function public.admin_chamado(p_chamado uuid)
returns json language plpgsql security definer set search_path = public as $$
begin
  perform admin_exigir();
  update chamado_mensagens set lida_em = now() where chamado_id = p_chamado and not autor_arxum and lida_em is null;
  return (select json_build_object(
    'chamado', json_build_object('id', h.id, 'numero', h.numero, 'assunto', h.assunto, 'status', h.status,
               'company_id', h.company_id, 'empresa', c.name, 'criado_em', h.criado_em),
    'mensagens', coalesce((select json_agg(json_build_object('id', m.id, 'texto', m.texto, 'arxum', m.autor_arxum,
               'autor', coalesce(u.email::text, ''), 'criado_em', m.criado_em, 'lida_em', m.lida_em) order by m.criado_em)
               from chamado_mensagens m left join auth.users u on u.id = m.autor_id where m.chamado_id = h.id), '[]'::json))
    from chamados h join companies c on c.id = h.company_id where h.id = p_chamado);
end;
$$;

create or replace function public.admin_responder_chamado(p_chamado uuid, p_texto text, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform admin_exigir();
  if p_status not in ('aberto', 'respondido', 'resolvido') then raise exception 'Status inválido.'; end if;
  if nullif(trim(coalesce(p_texto, '')), '') is not null then
    insert into chamado_mensagens (chamado_id, autor_id, autor_arxum, texto) values (p_chamado, auth.uid(), true, trim(p_texto));
  end if;
  update chamados set status = p_status, ultima_msg_em = case when nullif(trim(coalesce(p_texto, '')), '') is not null then now() else ultima_msg_em end
   where id = p_chamado;
end;
$$;

-- A ARXUM inicia uma conversa com a empresa (fica aguardando a empresa).
create or replace function public.admin_abrir_chamado(p_company uuid, p_assunto text, p_texto text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  perform admin_exigir();
  insert into chamados (company_id, assunto, status, criado_por) values (p_company, trim(p_assunto), 'respondido', auth.uid())
  returning id into v_id;
  insert into chamado_mensagens (chamado_id, autor_id, autor_arxum, texto) values (v_id, auth.uid(), true, trim(p_texto));
  return v_id;
end;
$$;

create or replace function public.admin_config()
returns json language plpgsql stable security definer set search_path = public as $$
begin
  perform admin_exigir();
  return (select row_to_json(c) from config_plataforma c where id = 1);
end;
$$;

create or replace function public.admin_salvar_config(
  p_pix_chave text, p_pix_nome text, p_pix_cidade text, p_email_suporte text, p_whatsapp text,
  p_dia_vencimento integer, p_lembrete_dias_antes integer, p_cobranca_dias_depois integer[],
  p_suspender_apos_dias integer, p_emails_automaticos boolean
) returns void language plpgsql security definer set search_path = public as $$
begin
  perform admin_exigir();
  update config_plataforma set
    pix_chave = nullif(trim(p_pix_chave), ''), pix_nome = nullif(trim(p_pix_nome), ''),
    pix_cidade = coalesce(nullif(trim(p_pix_cidade), ''), 'RIO DE JANEIRO'),
    email_suporte = nullif(trim(p_email_suporte), ''), whatsapp = nullif(trim(p_whatsapp), ''),
    dia_vencimento_padrao = p_dia_vencimento, lembrete_dias_antes = p_lembrete_dias_antes,
    cobranca_dias_depois = coalesce(p_cobranca_dias_depois, '{}'), suspender_apos_dias = p_suspender_apos_dias,
    emails_automaticos = p_emails_automaticos, atualizado_em = now()
  where id = 1;
end;
$$;


-- ---------------------------------------------------------------------------
-- Funções do servidor (rotina diária e envio de e-mails, com a chave de serviço)
-- ---------------------------------------------------------------------------

-- Faturas em aberto e pagas há pouco, com os e-mails já enviados de cada uma.
create or replace function public.servico_faturas()
returns table (
  id uuid, numero bigint, company_id uuid, empresa text, email text, descricao text, valor numeric,
  vencimento date, status text, pago_em timestamptz, valor_pago numeric, dias_para_vencer integer,
  suspensa boolean, criado_em timestamptz, enviados text[]
) language sql stable security definer set search_path = public as $$
  select f.id, f.numero, f.company_id, c.name, email_empresa(c.id), f.descricao, f.valor, f.vencimento,
         f.status, f.pago_em, f.valor_pago, f.vencimento - hoje_br(), c.suspensa, f.criado_em,
         coalesce((select array_agg(distinct e.tipo) from emails_enviados e
                    where e.fatura_id = f.id and e.status = 'enviado'), '{}')
  from faturas f join companies c on c.id = f.company_id
  where f.status = 'pendente' or (f.status = 'paga' and f.pago_em > now() - interval '10 days')
$$;

-- Quem recebe os avisos de um chamado: a empresa (e-mail de cobrança/administrador
-- e quem abriu o chamado) ou a ARXUM (e-mail de suporte configurado).
create or replace function public.servico_chamado(p_chamado uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('id', h.id, 'numero', h.numero, 'assunto', h.assunto, 'company_id', h.company_id,
         'empresa', c.name, 'email_empresa', email_empresa(c.id),
         'email_autor', (select u.email::text from auth.users u join profiles p on p.id = u.id
                         where u.id = h.criado_por and p.company_id = h.company_id),
         'email_suporte', cfg.email_suporte,
         'ultima', (select json_build_object('texto', m.texto, 'arxum', m.autor_arxum, 'autor_id', m.autor_id)
                      from chamado_mensagens m where m.chamado_id = h.id order by m.criado_em desc limit 1))
  from chamados h join companies c on c.id = h.company_id cross join config_plataforma cfg
  where h.id = p_chamado
$$;

-- ---------------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------------
revoke execute on function
  public.minha_empresa_id(), public.minha_empresa(), public.dados_pagamento(), public.informar_pagamento(uuid),
  public.abrir_chamado(text, text), public.responder_chamado(uuid, text), public.marcar_chamado_lido(uuid),
  public.email_empresa(uuid), public.servico_faturas(), public.servico_chamado(uuid),
  public.admin_resumo(), public.admin_faturas(uuid), public.gerar_mensalidades(date),
  public.admin_gerar_mensalidades(date), public.admin_criar_fatura(uuid, text, numeric, date),
  public.admin_baixar_fatura(uuid, date, numeric, text, text), public.admin_cancelar_fatura(uuid, text),
  public.admin_reabrir_fatura(uuid), public.admin_empresa(uuid), public.admin_atualizar_empresa(uuid, text, integer),
  public.admin_chamados(), public.admin_chamado(uuid), public.admin_responder_chamado(uuid, text, text),
  public.admin_abrir_chamado(uuid, text, text), public.admin_config(), public.admin_salvar_config(text, text, text, text, text, integer, integer, integer[], integer, boolean)
from public, anon, authenticated;

grant execute on function
  public.minha_empresa_id(), public.minha_empresa(), public.dados_pagamento(), public.informar_pagamento(uuid),
  public.abrir_chamado(text, text), public.responder_chamado(uuid, text), public.marcar_chamado_lido(uuid),
  public.admin_resumo(), public.admin_faturas(uuid), public.admin_gerar_mensalidades(date),
  public.admin_criar_fatura(uuid, text, numeric, date), public.admin_baixar_fatura(uuid, date, numeric, text, text),
  public.admin_cancelar_fatura(uuid, text), public.admin_reabrir_fatura(uuid), public.admin_empresa(uuid),
  public.admin_atualizar_empresa(uuid, text, integer), public.admin_chamados(), public.admin_chamado(uuid),
  public.admin_responder_chamado(uuid, text, text), public.admin_abrir_chamado(uuid, text, text), public.admin_config(),
  public.admin_salvar_config(text, text, text, text, text, integer, integer, integer[], integer, boolean)
to authenticated;
-- Só o servidor (rotina diária e envio de e-mails, com a chave de serviço).
grant execute on function public.gerar_mensalidades(date), public.email_empresa(uuid),
  public.servico_faturas(), public.servico_chamado(uuid) to service_role;
