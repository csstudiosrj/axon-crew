-- Troca de plano pela própria empresa, na tela Assinatura.
--   Plano maior: gera uma fatura de mudança; o plano novo vale assim que ela é
--   paga (a baixa automática do PIX/cartão aplica o plano).
--   Plano menor ou grátis: fica agendado para o mês seguinte.
--   Plano anual: 12 meses pelo preço de 10, sem mensalidades nesse período.

alter table public.faturas
  add column if not exists plano_destino text check (plano_destino in ('gratis', 'essencial', 'profissional', 'empresa')),
  add column if not exists meses integer not null default 1 check (meses in (1, 12));

alter table public.companies
  add column if not exists plano_proximo text check (plano_proximo in ('gratis', 'essencial', 'profissional', 'empresa')),
  add column if not exists plano_proximo_em date,
  add column if not exists pago_ate date;

-- Pagou a fatura de mudança: aplica o plano. A mensalidade do mês ainda em
-- aberto (do plano antigo) é cancelada, porque a fatura de mudança já cobre o mês.
create or replace function public.aplicar_plano_pago()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_comp date := date_trunc('month', hoje_br())::date;
  v_mes_pago boolean;
begin
  if new.status = 'paga' and old.status <> 'paga' and new.plano_destino is not null then
    update faturas set status = 'cancelada', observacao = 'Substituída pela mudança de plano (fatura nº ' || new.numero || ')'
     where company_id = new.company_id and competencia = v_comp and status = 'pendente' and id <> new.id;

    v_mes_pago := exists (select 1 from faturas where company_id = new.company_id and competencia = v_comp
                                                   and status = 'paga' and id <> new.id);
    if new.competencia is null and not v_mes_pago then
      new.competencia := v_comp;
    end if;

    update companies
       set plano = new.plano_destino, plano_proximo = null, plano_proximo_em = null,
           pago_ate = case when new.meses = 12
                           then ((v_comp + case when v_mes_pago then interval '13 months' else interval '12 months' end) - interval '1 day')::date
                           else pago_ate end
     where id = new.company_id;
  end if;
  return new;
end;
$$;

drop trigger if exists aplicar_plano_pago on public.faturas;
create trigger aplicar_plano_pago before update on public.faturas
  for each row execute function public.aplicar_plano_pago();

-- Pedido de troca feito pela empresa (administrador ou financeiro).
-- Retorna {tipo: 'fatura', fatura_id} | {tipo: 'agendado', a_partir} | {tipo: 'erro', mensagem}.
create or replace function public.pedir_plano(p_plano text, p_anual boolean default false)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_company uuid := minha_empresa_id();
  v_atual text;
  v_pago_ate date;
  v_comp date := date_trunc('month', hoje_br())::date;
  v_preco_novo numeric := preco_plano(p_plano);
  v_preco_atual numeric;
  v_valor numeric;
  v_id uuid;
  v_nomes json := '{"gratis": "Grátis", "essencial": "Essencial", "profissional": "Profissional", "empresa": "Empresa"}';
begin
  if v_company is null then return json_build_object('tipo', 'erro', 'mensagem', 'Conta sem empresa.'); end if;
  if (select role from profiles where id = auth.uid()) not in ('admin', 'super_admin', 'financeiro') then
    return json_build_object('tipo', 'erro', 'mensagem', 'Só o administrador ou o financeiro da empresa pode trocar o plano.');
  end if;
  if p_plano not in ('gratis', 'essencial', 'profissional', 'empresa') then
    return json_build_object('tipo', 'erro', 'mensagem', 'Plano inválido.');
  end if;

  select plano, pago_ate into v_atual, v_pago_ate from companies where id = v_company;
  v_preco_atual := preco_plano(v_atual);

  if v_pago_ate is not null and v_pago_ate >= hoje_br() then
    return json_build_object('tipo', 'erro', 'mensagem', 'Seu plano anual vale até ' || to_char(v_pago_ate, 'DD/MM/YYYY') || '. Para trocar antes disso, fale com o suporte.');
  end if;

  -- Desfaz pedidos anteriores ainda não pagos.
  update faturas set status = 'cancelada', observacao = 'Pedido de mudança de plano substituído'
   where company_id = v_company and plano_destino is not null and status = 'pendente';
  update companies set plano_proximo = null, plano_proximo_em = null where id = v_company;

  if p_plano = v_atual and not p_anual then
    return json_build_object('tipo', 'agendado', 'a_partir', null);
  end if;

  -- Plano menor (sem ser anual): vale a partir do mês seguinte.
  if v_preco_novo < v_preco_atual and not p_anual then
    update companies set plano_proximo = p_plano, plano_proximo_em = (v_comp + interval '1 month')::date where id = v_company;
    return json_build_object('tipo', 'agendado', 'a_partir', (v_comp + interval '1 month')::date);
  end if;

  if v_preco_novo = 0 then
    return json_build_object('tipo', 'erro', 'mensagem', 'O plano grátis não tem opção anual.');
  end if;

  if p_anual then
    v_valor := v_preco_novo * 10;
  elsif exists (select 1 from faturas where company_id = v_company and competencia = v_comp and status = 'paga') then
    -- O mês já foi pago no plano atual: cobra só a diferença.
    v_valor := v_preco_novo - v_preco_atual;
  else
    v_valor := v_preco_novo;
  end if;

  insert into faturas (company_id, descricao, plano, valor, vencimento, plano_destino, meses, criado_por)
  values (v_company,
          'Mudança para o plano ' || (v_nomes ->> p_plano) || case when p_anual then ' anual (12 meses)' else ' — ' || to_char(v_comp, 'MM/YYYY') end,
          p_plano, v_valor, hoje_br() + 3, p_plano, case when p_anual then 12 else 1 end, auth.uid())
  returning id into v_id;
  return json_build_object('tipo', 'fatura', 'fatura_id', v_id);
end;
$$;

create or replace function public.desistir_troca_plano()
returns void language sql security definer set search_path = public as $$
  update faturas set status = 'cancelada', observacao = 'Pedido de mudança de plano desfeito pela empresa'
   where company_id = minha_empresa_id() and plano_destino is not null and status = 'pendente';
  update companies set plano_proximo = null, plano_proximo_em = null where id = minha_empresa_id();
$$;

-- Dados da própria empresa, agora com a troca agendada e o plano anual.
create or replace function public.minha_empresa()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('id', c.id, 'name', c.name, 'plano', c.plano, 'suspensa', c.suspensa,
                           'segmento', c.segmento, 'email_cobranca', c.email_cobranca,
                           'dia_vencimento', coalesce(c.dia_vencimento, cfg.dia_vencimento_padrao),
                           'plano_proximo', c.plano_proximo, 'plano_proximo_em', c.plano_proximo_em, 'pago_ate', c.pago_ate)
  from profiles p join companies c on c.id = p.company_id cross join config_plataforma cfg
  where p.id = auth.uid()
$$;

-- Mensalidades: aplica as trocas agendadas, expira pedidos de mudança não
-- pagos (7 dias) e não cobra quem está no período do plano anual.
create or replace function public.gerar_mensalidades(p_competencia date)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_comp date := date_trunc('month', p_competencia)::date;
  v_total integer;
begin
  update companies set plano = plano_proximo, plano_proximo = null, plano_proximo_em = null
   where plano_proximo is not null and plano_proximo_em <= v_comp;

  update faturas set status = 'cancelada', observacao = 'Pedido de mudança de plano não pago em 7 dias'
   where plano_destino is not null and status = 'pendente' and criado_em < now() - interval '7 days';

  insert into faturas (company_id, competencia, descricao, plano, valor, vencimento)
  select c.id, v_comp,
         'Mensalidade ARXUM Crew ' || initcap(c.plano) || ' — ' || to_char(v_comp, 'MM/YYYY'),
         c.plano, preco_plano(c.plano),
         greatest(make_date(extract(year from v_comp)::int, extract(month from v_comp)::int,
                            coalesce(c.dia_vencimento, cfg.dia_vencimento_padrao)), hoje_br() + 3)
  from companies c cross join config_plataforma cfg
  where not c.suspensa and preco_plano(c.plano) > 0
    and (c.pago_ate is null or c.pago_ate < v_comp)
    and not exists (select 1 from faturas f where f.company_id = c.id and f.competencia = v_comp and f.status <> 'cancelada');
  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

-- A régua de cobrança não persegue pedidos de mudança de plano: se a empresa
-- não pagar, o pedido só expira.
drop function if exists public.servico_faturas();
create function public.servico_faturas()
returns table (
  id uuid, numero bigint, company_id uuid, empresa text, email text, descricao text, valor numeric,
  vencimento date, status text, pago_em timestamptz, valor_pago numeric, dias_para_vencer integer,
  suspensa boolean, criado_em timestamptz, enviados text[], token uuid
) language sql stable security definer set search_path = public as $$
  select f.id, f.numero, f.company_id, c.name, email_empresa(c.id), f.descricao, f.valor, f.vencimento,
         f.status, f.pago_em, f.valor_pago, f.vencimento - hoje_br(), c.suspensa, f.criado_em,
         coalesce((select array_agg(distinct e.tipo) from emails_enviados e
                    where e.fatura_id = f.id and e.status = 'enviado'), '{}'),
         f.token
  from faturas f join companies c on c.id = f.company_id
  where (f.status = 'pendente' and f.plano_destino is null)
     or (f.status = 'paga' and f.pago_em > now() - interval '10 days')
$$;

revoke execute on function public.aplicar_plano_pago(), public.servico_faturas(), public.gerar_mensalidades(date)
  from public, anon, authenticated;
grant execute on function public.servico_faturas(), public.gerar_mensalidades(date) to service_role;
revoke execute on function public.pedir_plano(text, boolean), public.desistir_troca_plano(), public.minha_empresa()
  from public, anon;
grant execute on function public.pedir_plano(text, boolean), public.desistir_troca_plano(), public.minha_empresa()
  to authenticated;
