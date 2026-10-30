-- Mercado Pago: as empresas pagam as faturas online (Checkout Pro: Pix, cartão
-- e demais formas) e o webhook dá baixa sozinho na fatura. O PIX manual com
-- "Já paguei" continua funcionando em paralelo.
--
-- Fluxo:
--   1. a empresa clica em "Pagar online" -> a rota cria uma preferência no
--      Mercado Pago com external_reference = id da fatura;
--   2. o Mercado Pago avisa o webhook a cada mudança do pagamento;
--   3. o webhook busca o pagamento na API e chama servico_registrar_pagamento_mp,
--      que dá baixa na fatura (uma vez só, mesmo se o aviso chegar repetido).

alter table public.faturas
  add column if not exists mp_preference_id text,
  add column if not exists mp_payment_id text;

-- Histórico de cada pagamento visto no Mercado Pago. A chave é o id do
-- pagamento, o que torna o processamento idempotente.
create table if not exists public.mp_pagamentos (
  payment_id text primary key,
  fatura_id uuid references public.faturas(id) on delete set null,
  status text not null,
  status_detail text,
  valor numeric(10, 2),
  forma text,
  resultado text,
  baixado boolean not null default false,
  recebido_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists mp_pagamentos_fatura on public.mp_pagamentos (fatura_id);
alter table public.mp_pagamentos enable row level security;
revoke all on public.mp_pagamentos from anon, authenticated;

-- Registra o pagamento e, se foi aprovado e cobre a fatura, dá baixa nela.
-- Só o servidor (chave de serviço) executa. Retorna o que aconteceu:
--   baixada | ja_paga | fatura_cancelada | valor_menor | registrado | fatura_desconhecida
create or replace function public.servico_registrar_pagamento_mp(
  p_fatura uuid,
  p_payment_id text,
  p_status text,
  p_status_detail text,
  p_valor numeric,
  p_forma text,
  p_aprovado_em timestamptz default null
) returns text language plpgsql security definer set search_path = public as $$
declare
  v_fatura faturas%rowtype;
  v_resultado text;
begin
  -- Trava a linha para que dois avisos simultâneos não deem baixa duas vezes.
  select * into v_fatura from faturas where id = p_fatura for update;

  if not found then
    v_resultado := 'fatura_desconhecida';
  elsif p_status <> 'approved' then
    v_resultado := 'registrado';
  elsif v_fatura.status = 'paga' then
    v_resultado := 'ja_paga';
  elsif v_fatura.status <> 'pendente' then
    v_resultado := 'fatura_cancelada';
  elsif coalesce(p_valor, 0) < v_fatura.valor then
    v_resultado := 'valor_menor';
  else
    update faturas
       set status = 'paga',
           pago_em = coalesce(p_aprovado_em, now()),
           valor_pago = p_valor,
           forma_pagamento = 'mercado_pago' || coalesce(' ' || nullif(p_forma, ''), ''),
           mp_payment_id = p_payment_id
     where id = v_fatura.id;

    -- Reativa a empresa suspensa por falta de pagamento quando não resta
    -- nenhuma fatura vencida em aberto.
    if not exists (select 1 from faturas
                    where company_id = v_fatura.company_id and status = 'pendente' and vencimento < hoje_br()) then
      update companies set suspensa = false, suspensa_em = null
       where id = v_fatura.company_id and suspensa;
    end if;

    v_resultado := 'baixada';
  end if;

  insert into mp_pagamentos (payment_id, fatura_id, status, status_detail, valor, forma, resultado, baixado)
  values (p_payment_id, case when v_fatura.id is null then null else p_fatura end, p_status, p_status_detail,
          p_valor, p_forma, v_resultado, v_resultado = 'baixada')
  on conflict (payment_id) do update
     set status = excluded.status,
         status_detail = excluded.status_detail,
         valor = excluded.valor,
         forma = excluded.forma,
         resultado = excluded.resultado,
         baixado = mp_pagamentos.baixado or excluded.baixado,
         atualizado_em = now();

  return v_resultado;
end;
$$;

revoke execute on function public.servico_registrar_pagamento_mp(uuid, text, text, text, numeric, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.servico_registrar_pagamento_mp(uuid, text, text, text, numeric, text, timestamptz)
  to service_role;
