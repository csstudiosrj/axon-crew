"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth-context";
import { maiuscula } from "../../lib/segmentos";
import { formatarBRL, dataBR } from "../../lib/validacao";
import { getPlano } from "../../lib/planos";

interface Evento { id: string; titulo: string; data: string }
interface Escala {
  id: string;
  evento_id: string;
  freelancer_id: string;
  resposta: string;
  checkin_em: string | null;
  status_pagamento: string;
  freelancers: { nome: string } | null;
  evento_slots: { cache_base: number; especialidade: string } | null;
}

const umDe = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);
const isoLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function RelatoriosPage() {
  const { companyId, termos, company } = useAuth();
  const [mes, setMes] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    const inicio = isoLocal(mes);
    const fim = isoLocal(new Date(mes.getFullYear(), mes.getMonth() + 1, 0));
    supabase.from("eventos").select("id, titulo, data").eq("company_id", companyId).gte("data", inicio).lte("data", fim).order("data")
      .then(async ({ data: evs }) => {
        const lista = (evs ?? []) as Evento[];
        const { data: esc } = lista.length
          ? await supabase.from("evento_escalas")
              .select("id, evento_id, freelancer_id, resposta, checkin_em, status_pagamento, freelancers(nome), evento_slots(cache_base, especialidade)")
              .in("evento_id", lista.map((e) => e.id))
          : { data: [] };
        setEventos(lista);
        setEscalas(((esc ?? []) as unknown as Escala[]).map((e) => ({ ...e, freelancers: umDe(e.freelancers), evento_slots: umDe(e.evento_slots) })));
        setCarregando(false);
      });
  }, [companyId, mes]);

  const hoje = isoLocal(new Date());
  const dados = useMemo(() => {
    const valer = escalas.filter((e) => e.resposta !== "recusado");
    const valor = (e: Escala) => Number(e.evento_slots?.cache_base ?? 0);
    const dataDe = Object.fromEntries(eventos.map((e) => [e.id, e.data]));
    const usaCheckin = escalas.some((e) => e.checkin_em);
    const respondidos = escalas.filter((e) => e.resposta !== "pendente");
    const passados = valer.filter((e) => dataDe[e.evento_id] < hoje && e.resposta === "confirmado");

    const porEvento = eventos.map((ev) => {
      const doEvento = valer.filter((e) => e.evento_id === ev.id);
      return { ...ev, pessoas: doEvento.length, custo: doEvento.reduce((s, e) => s + valor(e), 0) };
    });

    const porPessoa = new Map<string, { nome: string; trabalhos: number; valor: number }>();
    valer.forEach((e) => {
      const p = porPessoa.get(e.freelancer_id) ?? { nome: e.freelancers?.nome ?? "—", trabalhos: 0, valor: 0 };
      p.trabalhos += 1; p.valor += valor(e);
      porPessoa.set(e.freelancer_id, p);
    });

    return {
      custo: valer.reduce((s, e) => s + valor(e), 0),
      pago: valer.filter((e) => e.status_pagamento === "pago").reduce((s, e) => s + valor(e), 0),
      pessoas: new Set(valer.map((e) => e.freelancer_id)).size,
      aceite: respondidos.length ? Math.round((respondidos.filter((e) => e.resposta === "confirmado").length / respondidos.length) * 100) : null,
      recusas: escalas.filter((e) => e.resposta === "recusado").length,
      faltas: usaCheckin ? passados.filter((e) => !e.checkin_em).length : null,
      porEvento,
      ranking: [...porPessoa.values()].sort((a, b) => b.trabalhos - a.trabalhos || b.valor - a.valor).slice(0, 10),
    };
  }, [escalas, eventos, hoje]);

  const podeExportar = getPlano(company?.plano).exportacao;
  const exportar = () => {
    const linhas = [[maiuscula(termos.job), "Data", "Pessoas", "Custo"], ...dados.porEvento.map((e) => [e.titulo, dataBR(e.data), String(e.pessoas), e.custo.toFixed(2).replace(".", ",")])];
    const blob = new Blob(["﻿" + linhas.map((l) => l.map((c) => `"${c}"`).join(";")).join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `relatorio-${isoLocal(mes).slice(0, 7)}.csv`;
    a.click();
  };

  const nomeMes = maiuscula(mes.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }));
  const card = "bg-[#121212] border border-[#222] rounded-xl";

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Relatórios</h2>
          <p className="text-sm text-gray-400 mt-1">Custos, equipe e presença no mês.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setCarregando(true); setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1)); }} aria-label="Mês anterior" className="p-2 rounded-lg border border-[#333] text-gray-300 hover:bg-[#1a1a1a]"><ChevronLeft size={18} /></button>
          <span className="min-w-[10rem] text-center text-sm text-white">{nomeMes}</span>
          <button onClick={() => { setCarregando(true); setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1)); }} aria-label="Próximo mês" className="p-2 rounded-lg border border-[#333] text-gray-300 hover:bg-[#1a1a1a]"><ChevronRight size={18} /></button>
          {podeExportar && (
            <button onClick={exportar} className="ml-2 flex items-center gap-2 rounded-lg border border-[#333] px-3 py-2 text-sm text-gray-300 hover:bg-[#1a1a1a]"><Download size={16} /> CSV</button>
          )}
        </div>
      </div>

      {carregando ? (
        <p className="text-gray-500 animate-pulse">Carregando...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { rotulo: maiuscula(termos.jobs), valor: String(eventos.length) },
              { rotulo: "Custo da equipe", valor: formatarBRL(dados.custo), sub: `${formatarBRL(dados.pago)} já pago` },
              { rotulo: "Pessoas diferentes", valor: String(dados.pessoas) },
              { rotulo: "Taxa de aceite", valor: dados.aceite === null ? "—" : `${dados.aceite}%`, sub: `${dados.recusas} recusa${dados.recusas === 1 ? "" : "s"}${dados.faltas !== null ? ` · ${dados.faltas} falta${dados.faltas === 1 ? "" : "s"}` : ""}` },
            ].map((k) => (
              <div key={k.rotulo} className={`${card} p-5`}>
                <p className="text-sm text-gray-400">{k.rotulo}</p>
                <p className="mt-1 text-2xl font-bold text-white">{k.valor}</p>
                {k.sub && <p className="mt-1 text-xs text-gray-500">{k.sub}</p>}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
            <div className={`${card} overflow-hidden`}>
              <h3 className="px-5 py-4 text-sm font-medium text-white border-b border-[#222]">Custo por {termos.job}</h3>
              {dados.porEvento.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-gray-500">Nada neste mês.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-500"><tr><th className="px-5 py-2 text-left font-medium">{maiuscula(termos.job)}</th><th className="px-3 py-2 text-right font-medium">Pessoas</th><th className="px-5 py-2 text-right font-medium">Custo</th></tr></thead>
                  <tbody className="divide-y divide-[#1a1a1a]">
                    {dados.porEvento.map((e) => (
                      <tr key={e.id}>
                        <td className="px-5 py-3"><p className="text-gray-200">{e.titulo}</p><p className="text-xs text-gray-500">{dataBR(e.data)}</p></td>
                        <td className="px-3 py-3 text-right text-gray-300 tabular-nums">{e.pessoas}</td>
                        <td className="px-5 py-3 text-right text-gray-200 tabular-nums">{formatarBRL(e.custo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className={`${card} overflow-hidden`}>
              <h3 className="px-5 py-4 text-sm font-medium text-white border-b border-[#222]">Quem mais trabalhou</h3>
              {dados.ranking.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-gray-500">Ninguém escalado neste mês.</p>
              ) : (
                <ol className="divide-y divide-[#1a1a1a]">
                  {dados.ranking.map((p, i) => (
                    <li key={p.nome + i} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                      <span className="flex items-center gap-3 min-w-0"><span className="w-5 text-gray-500 tabular-nums">{i + 1}</span><span className="truncate text-gray-200">{p.nome}</span></span>
                      <span className="shrink-0 text-gray-400 tabular-nums">{p.trabalhos}× · {formatarBRL(p.valor)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
