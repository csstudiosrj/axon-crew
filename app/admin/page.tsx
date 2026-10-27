"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Wallet, Clock, AlertTriangle, Repeat, LifeBuoy, ArrowRight, BellRing, Info } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatarBRL, dataBR } from "@/lib/validacao";
import { card, Kpi, Barras, Carregando, Vazio, rotuloMes, ultimosMeses, dataHora } from "@/components/admin/ui";
import { SituacaoFatura, type Fatura } from "@/components/admin/Faturas";
import type { ChamadoResumo } from "@/components/admin/tipos";

interface Resumo {
  recebido_mes: number;
  recebido_mes_anterior: number;
  a_receber: number;
  vencido: number;
  faturas_vencidas: number;
  empresas_inadimplentes: number;
  pagamentos_informados: number;
  mensalidade_contratada: number;
  empresas_ativas: number;
  empresas_pagantes: number;
  empresas_suspensas: number;
  novas_30d: number;
  chamados_abertos: number;
  recebido_por_mes: { mes: string; valor: number }[];
}

// Visão geral: números tirados das faturas registradas (nada estimado).
export default function AdminVisaoGeral() {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [chamados, setChamados] = useState<ChamadoResumo[]>([]);
  const [agora, setAgora] = useState(0);

  const carregar = useCallback(async () => {
    const [r, f, c] = await Promise.all([
      supabase.rpc("admin_resumo"),
      supabase.rpc("admin_faturas"),
      supabase.rpc("admin_chamados"),
    ]);
    setResumo(r.data as Resumo);
    setFaturas((f.data as Fatura[]) ?? []);
    setChamados((c.data as ChamadoResumo[]) ?? []);
    setAgora(Date.now());
  }, []);

  useEffect(() => { Promise.resolve().then(carregar); }, [carregar]);

  if (!resumo) return <Carregando />;

  const n = Number;
  const anterior = n(resumo.recebido_mes_anterior);
  const variacao = anterior > 0 ? Math.round(((n(resumo.recebido_mes) - anterior) / anterior) * 100) : null;
  const porMes = new Map(resumo.recebido_por_mes.map((m) => [m.mes, n(m.valor)]));
  const grafico = ultimosMeses(agora).map((m) => ({ rotulo: rotuloMes(m), valor: porMes.get(m) ?? 0 }));
  const plural = (q: number, s: string, p = `${s}s`) => `${q} ${q === 1 ? s : p}`;

  const atencao = faturas
    .filter((f) => f.status === "pendente" && (f.dias_atraso > 0 || f.pagamento_informado_em))
    .sort((a, b) => Number(!!b.pagamento_informado_em) - Number(!!a.pagamento_informado_em) || b.dias_atraso - a.dias_atraso)
    .slice(0, 8);
  const proximas = faturas
    .filter((f) => f.status === "pendente" && f.dias_atraso === 0 && !f.pagamento_informado_em)
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
    .slice(0, 6);
  const abertos = chamados.filter((c) => c.status === "aberto").slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icone={Wallet} rotulo="Recebido neste mês" valor={formatarBRL(n(resumo.recebido_mes))} tom="bom"
          sub={variacao === null ? `mês anterior: ${formatarBRL(anterior)}` : `${variacao >= 0 ? "+" : ""}${variacao}% sobre o mês anterior (${formatarBRL(anterior)})`} />
        <Kpi icone={Clock} rotulo="A receber no prazo" valor={formatarBRL(n(resumo.a_receber))} sub="faturas em aberto que ainda não venceram" />
        <Kpi icone={AlertTriangle} rotulo="Vencido" valor={formatarBRL(n(resumo.vencido))} tom={n(resumo.vencido) > 0 ? "ruim" : "normal"}
          sub={`${plural(resumo.faturas_vencidas, "fatura")} · ${plural(resumo.empresas_inadimplentes, "empresa")}`} />
        <Kpi icone={Repeat} rotulo="Mensalidade contratada" valor={formatarBRL(n(resumo.mensalidade_contratada))}
          sub={`soma dos planos de ${plural(resumo.empresas_pagantes, "empresa pagante", "empresas pagantes")}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className={`${card} p-5 lg:col-span-2`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[15px] font-semibold text-white">Recebido por mês</h2>
            <span className="text-[12px] text-arx-slate">faturas pagas, pela data do pagamento</span>
          </div>
          <Barras dados={grafico} formatar={(v) => formatarBRL(v).replace(",00", "")} />
        </div>
        <div className={`${card} space-y-4 p-5`}>
          <h2 className="text-[15px] font-semibold text-white">Base de clientes</h2>
          {[
            { rotulo: "Empresas ativas", valor: resumo.empresas_ativas, href: "/admin/empresas" },
            { rotulo: "Em plano pago", valor: resumo.empresas_pagantes, href: "/admin/empresas" },
            { rotulo: "Novas nos últimos 30 dias", valor: resumo.novas_30d, href: "/admin/empresas" },
            { rotulo: "Suspensas", valor: resumo.empresas_suspensas, href: "/admin/empresas" },
            { rotulo: "Pagamentos informados", valor: resumo.pagamentos_informados, href: "/admin/cobranca" },
            { rotulo: "Chamados aguardando", valor: resumo.chamados_abertos, href: "/admin/suporte" },
          ].map((l) => (
            <Link key={l.rotulo} href={l.href} className="flex items-center justify-between text-[14px] text-arx-mist hover:text-white">
              {l.rotulo} <span className="tabular-nums text-white">{l.valor}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={card}>
          <header className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-white"><AlertTriangle size={16} className="text-red-300" /> Precisa de atenção</h2>
            <Link href="/admin/cobranca" className="flex items-center gap-1 text-[13px] text-arx-crew-soft hover:text-white">Cobrança <ArrowRight size={14} /></Link>
          </header>
          {atencao.length === 0 ? <Vazio>Nenhuma fatura vencida. Tudo em dia.</Vazio> : (
            <ul className="divide-y divide-white/5">
              {atencao.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <Link href={`/admin/empresas/${f.company_id}`} className="font-medium text-white hover:text-arx-crew-soft">{f.empresa}</Link>
                    <p className="truncate text-[12px] text-arx-slate">nº {f.numero} · venceu {dataBR(f.vencimento)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="tabular-nums text-white">{formatarBRL(Number(f.valor))}</span>
                    <SituacaoFatura f={f} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={card}>
          <header className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-white"><LifeBuoy size={16} className="text-arx-crew-soft" /> Suporte aguardando resposta</h2>
            <Link href="/admin/suporte" className="flex items-center gap-1 text-[13px] text-arx-crew-soft hover:text-white">Suporte <ArrowRight size={14} /></Link>
          </header>
          {abertos.length === 0 ? <Vazio>Nenhum chamado aguardando.</Vazio> : (
            <ul className="divide-y divide-white/5">
              {abertos.map((c) => (
                <li key={c.id}>
                  <Link href={`/admin/suporte?chamado=${c.id}`} className="block px-5 py-3 hover:bg-white/[0.02]">
                    <p className="flex items-center justify-between gap-3 text-[14px]">
                      <span className="truncate font-medium text-white">{c.empresa} · {c.assunto}</span>
                      <span className="shrink-0 text-[12px] text-arx-slate">{dataHora(c.ultima_msg_em)}</span>
                    </p>
                    <p className="mt-0.5 truncate text-[13px] text-arx-mist">{c.ultima_msg}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className={card}>
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-white"><BellRing size={16} className="text-amber-300" /> Próximos vencimentos</h2>
        </header>
        {proximas.length === 0 ? <Vazio>Nenhuma fatura em aberto no prazo.</Vazio> : (
          <ul className="divide-y divide-white/5">
            {proximas.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 px-5 py-3 text-[14px]">
                <Link href={`/admin/empresas/${f.company_id}`} className="text-white hover:text-arx-crew-soft">{f.empresa}</Link>
                <span className="text-arx-mist">{dataBR(f.vencimento)} · <span className="tabular-nums text-white">{formatarBRL(Number(f.valor))}</span></span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="flex items-start gap-2 text-[12px] leading-relaxed text-arx-slate">
        <Info size={14} className="mt-0.5 shrink-0" />
        <span>
          “Recebido” soma as faturas marcadas como pagas, pela data do pagamento. “A receber” e “Vencido” somam as faturas em aberto.
          “Mensalidade contratada” é a soma dos preços dos planos das empresas ativas: o que deveria entrar por mês, não o que entrou.
        </span>
      </p>
    </div>
  );
}
