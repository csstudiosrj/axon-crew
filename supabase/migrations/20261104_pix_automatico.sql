-- PIX com confirmação automática: cada fatura em aberto ganha uma cobrança
-- PIX do Mercado Pago (QR Code mostrado no próprio painel). Quando o PIX é
-- pago, o webhook (ou a conferência feita pela tela) dá baixa sozinho.
-- O PIX manual com "Já paguei" deixa de existir.

alter table public.faturas
  add column if not exists mp_pix_payment_id text,
  add column if not exists mp_pix_qr text,
  add column if not exists mp_pix_expira_em timestamptz;

drop function if exists public.informar_pagamento(uuid);

-- Link público de pagamento de cada fatura (vai nos e-mails): abre o QR Code
-- sem precisar entrar no painel.
alter table public.faturas add column if not exists token uuid not null default gen_random_uuid();
create unique index if not exists faturas_token on public.faturas (token);

-- servico_faturas passa a devolver o token (muda o retorno, então recria).
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
  where f.status = 'pendente' or (f.status = 'paga' and f.pago_em > now() - interval '10 days')
$$;
revoke execute on function public.servico_faturas() from public, anon, authenticated;
grant execute on function public.servico_faturas() to service_role;
