"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Plus, CalendarPlus, Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatarBRL, dataBR } from "@/lib/validacao";
import { card, campo, botaoPrimario, botaoSecundario, Modal, BotoesModal, Carregando, Rotulo, usePainelAdmin, MESES } from "@/components/admin/ui";
import { TabelaFaturas, NovaFatura, type Fatura } from "@/components/admin/Faturas";

type Filtro = "abertas" | "vencidas" | "informadas" | "pagas" | "canceladas" | "todas";

const FILTROS: { id: Filtro; nome: string; teste: (f: Fatura) => boolean }[] = [
  { id: "abertas", nome: "Em aberto", teste: (f) => f.status === "pendente" },
  { id: "vencidas", nome: "Vencidas", teste: (f) => f.status === "pendente" && f.dias_atraso > 0 },
  { id: "informadas", nome: "Pagamento informado", teste: (f) => f.status === "pendente" && !!f.pagamento_informado_em },
  { id: "pagas", nome: "Pagas", teste: (f) => f.status === "paga" },
  { id: "canceladas", nome: "Canceladas", teste: (f) => f.status === "cancelada" },
  { id: "todas", nome: "Todas", teste: () => true },
];

// Faturas de todas as empresas: cobrar, dar baixa, cancelar e gerar mensalidades.
export default function AdminCobranca() {
  const { avisar, atualizarContadores } = usePainelAdmin();
  const [faturas, setFaturas] = useState<Fatura[] | null>(null);
  const [empresas, setEmpresas] = useState<{ id: string; name: string }[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("abertas");
  const [busca, setBusca] = useState("");
  const [novaFatura, setNovaFatura] = useState(false);
  const [gerar, setGerar] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    const [f, e] = await Promise.all([supabase.rpc("admin_faturas"), supabase.rpc("admin_empresas")]);
    setFaturas((f.data as Fatura[]) ?? []);
    setEmpresas(((e.data as { id: string; name: string }[]) ?? []).sort((a, b) => a.name.localeCompare(b.name)));
  }, []);

  useEffect(() => { Promise.resolve().then(carregar); }, [carregar]);

  const contagem = useMemo(() => new Map(FILTROS.map((x) => [x.id, (faturas ?? []).filter(x.teste)])), [faturas]);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (contagem.get(filtro) ?? []).filter((f) =>
      !termo || [f.empresa, f.email ?? "", f.descricao, String(f.numero)].some((v) => v.toLowerCase().includes(termo)));
  }, [contagem, filtro, busca]);

  const total = lista.reduce((s, f) => s + Number(f.status === "paga" ? f.valor_pago ?? f.valor : f.valor), 0);

  // Próximos meses para gerar (o atual e o seguinte).
  const competencias = useMemo(() => {
    const d = new Date();
    return [0, 1].map((i) => {
      const x = new Date(d.getFullYear(), d.getMonth() + i, 1);
      return { valor: `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-01`, nome: `${MESES[x.getMonth()]}/${x.getFullYear()}` };
    });
  }, []);

  const gerarMensalidades = async () => {
    if (!gerar) return;
    setSalvando(true);
    const { data, error } = await supabase.rpc("admin_gerar_mensalidades", { p_competencia: gerar });
    setSalvando(false);
    setGerar(null);
    if (error) { avisar("Não foi possível gerar as mensalidades."); return; }
    avisar(data ? `${data} mensalidade${data === 1 ? "" : "s"} gerada${data === 1 ? "" : "s"}.` : "Todas as empresas em plano pago já têm a mensalidade desse mês.");
    carregar();
    atualizarContadores();
  };

  const exportar = () => {
    const linhas = [
      ["Nº", "Empresa", "E-mail", "Descrição", "Valor", "Vencimento", "Situação", "Pago em", "Valor pago", "Forma", "Observação"],
      ...lista.map((f) => [
        String(f.numero), f.empresa, f.email ?? "", f.descricao, Number(f.valor).toFixed(2).replace(".", ","), dataBR(f.vencimento),
        f.status === "pendente" ? (f.dias_atraso > 0 ? `Vencida (${f.dias_atraso} dias)` : "Em aberto") : f.status === "paga" ? "Paga" : "Cancelada",
        f.pago_em ? dataBR(f.pago_em) : "", f.valor_pago != null ? Number(f.valor_pago).toFixed(2).replace(".", ",") : "", f.forma_pagamento ?? "", f.observacao ?? "",
      ]),
    ];
    const csv = "﻿" + linhas.map((l) => l.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    a.download = `faturas-crew-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (!faturas) return <Carregando />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTROS.map((x) => (
            <button key={x.id} onClick={() => setFiltro(x.id)}
              className={`rounded-full border px-3.5 py-1.5 text-[13px] ${filtro === x.id ? "border-arx-crew/40 bg-arx-crew/15 text-white" : "border-white/10 text-arx-mist hover:text-white"}`}>
              {x.nome} <span className="tabular-nums text-arx-slate">{contagem.get(x.id)?.length ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setGerar(competencias[0].valor)} className={botaoSecundario}><CalendarPlus size={16} /> Gerar mensalidades</button>
          <button onClick={() => setNovaFatura(true)} className={botaoPrimario}><Plus size={16} /> Nova fatura</button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-arx-slate" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por empresa, e-mail, descrição ou número" className={`${campo} bg-arx-surface pl-9`} />
        </div>
        <p className="text-[13px] text-arx-mist">{lista.length} fatura{lista.length === 1 ? "" : "s"} · <span className="tabular-nums text-white">{formatarBRL(total)}</span></p>
        <button onClick={exportar} className={botaoSecundario}><Download size={16} /> CSV</button>
      </div>

      <TabelaFaturas faturas={lista} aoMudar={() => { carregar(); }} />

      <div className={`${card} px-5 py-4 text-[13px] leading-relaxed text-arx-mist`}>
        <p className="font-medium text-white">Como a cobrança funciona</p>
        <p className="mt-1">
          Todo dia às 9h a rotina automática gera as mensalidades do mês das empresas em plano pago e envia os avisos por e-mail:
          fatura disponível, lembrete antes do vencimento, aviso no dia, cobranças depois do vencimento e agradecimento quando você registra o pagamento.
          Os prazos ficam em Configurações. Quando a empresa paga por PIX, ela pode clicar em “Já paguei”: a fatura aparece aqui como “Informou pagamento” para você conferir no extrato e dar baixa.
        </p>
      </div>

      {novaFatura && <NovaFatura empresas={empresas} aoFechar={() => setNovaFatura(false)} aoCriar={() => { setNovaFatura(false); carregar(); }} />}

      {gerar && (
        <Modal titulo="Gerar mensalidades" aoFechar={() => setGerar(null)}>
          <p className="text-[14px] text-arx-mist">Cria a fatura do mês para cada empresa ativa em plano pago que ainda não tem. Quem já tem não recebe outra.</p>
          <div className="mt-4">
            <Rotulo htmlFor="competencia">Mês</Rotulo>
            <select id="competencia" value={gerar} onChange={(e) => setGerar(e.target.value)} className={campo}>
              {competencias.map((c) => <option key={c.valor} value={c.valor}>{c.nome}</option>)}
            </select>
          </div>
          <BotoesModal aoCancelar={() => setGerar(null)} aoConfirmar={gerarMensalidades} salvando={salvando} rotulo="Gerar" />
        </Modal>
      )}
    </div>
  );
}
