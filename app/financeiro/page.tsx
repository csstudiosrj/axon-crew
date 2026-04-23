"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  DollarSign, ArrowUpRight, ArrowDownRight, Wallet,
  Download, Search, CheckCircle2, AlertTriangle, X, Check,
  Copy, QrCode, Clock, AlertCircle
} from "lucide-react";
import { supabase } from "../../lib/supabase";

// ============================================================
// HELPERS
// ============================================================

/** Formata número como moeda brasileira: 1350 → "R$ 1.350,00" */
const formatBRL = (valor: number): string =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor ?? 0);

/** Formata data ISO para DD/MM/AAAA */
const formatDataBR = (dataIso?: string | null): string => {
  if (!dataIso) return "—";
  const [ano, mes, dia] = dataIso.split("T")[0].split("-");
  return `${dia}/${mes}/${ano}`;
};

/** Hoje no formato YYYY-MM-DD para comparação */
const hoje = new Date().toISOString().split("T")[0];

// ============================================================
// TIPOS
// ============================================================
interface Pagamento {
  id: string;
  freelaNome: string;
  chavePix: string | null;
  telefone: string;
  eventoTitulo: string;
  eventoData: string;
  valor: number;
  status: "pendente" | "atrasado" | "pago";
  dataPagamento?: string | null;
}

// ============================================================
// COMPONENTE
// ============================================================
export default function FinanceiroPage() {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [toast, setToast] = useState<{ msg: string; tipo: "sucesso" | "erro" } | null>(null);

  // Modais
  const [modalPix, setModalPix] = useState(false);
  const [modalConfirmarPgto, setModalConfirmarPgto] = useState<Pagamento | null>(null);

  useEffect(() => { carregarFinanceiro(); }, []);

  // ---------- SUPABASE ----------
  const carregarFinanceiro = async () => {
    setIsLoading(true);

    const { data, error } = await supabase
      .from("evento_escalas")
      .select(`
        id,
        status_pagamento,
        data_pagamento,
        freelancers ( id, nome, chave_pix, telefone ),
        evento_slots ( cache_base ),
        eventos ( titulo, data )
      `);

    if (error) {
      mostrarToast("Erro ao carregar dados financeiros", "erro");
      setIsLoading(false);
      return;
    }

    if (data) {
      const formatados: Pagamento[] = data.map((item: any) => {
        // Supabase pode retornar objeto ou array dependendo do tipo de relação
        const freela  = Array.isArray(item.freelancers)  ? item.freelancers[0]  : item.freelancers;
        const slot    = Array.isArray(item.evento_slots)  ? item.evento_slots[0]  : item.evento_slots;
        const evento  = Array.isArray(item.eventos)       ? item.eventos[0]       : item.eventos;

        const dataEvento: string = evento?.data ?? "";
        let statusReal: Pagamento["status"] = item.status_pagamento ?? "pendente";

        // Considera atrasado se pendente e o evento já passou
        if (statusReal === "pendente" && dataEvento && dataEvento < hoje) {
          statusReal = "atrasado";
        }

        return {
          id: item.id,
          freelaNome:    freela?.nome        ?? "—",
          chavePix:      freela?.chave_pix   ?? null,
          telefone:      freela?.telefone    ?? "",
          eventoTitulo:  evento?.titulo      ?? "—",
          eventoData:    dataEvento,
          valor:         Number(slot?.cache_base ?? 0),
          status:        statusReal,
          dataPagamento: item.data_pagamento ?? null,
        };
      });

      setPagamentos(formatados);
    }
    setIsLoading(false);
  };

  const mostrarToast = (msg: string, tipo: "sucesso" | "erro") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3500);
  };

  // ---------- MARCAR PAGO ----------
  const handleMarcarPago = async () => {
    if (!modalConfirmarPgto) return;

    const { error } = await supabase
      .from("evento_escalas")
      .update({
        status_pagamento: "pago",
        data_pagamento: new Date().toISOString(),
      })
      .eq("id", modalConfirmarPgto.id);

    if (!error) {
      mostrarToast("Pagamento registrado com sucesso!", "sucesso");
      setModalConfirmarPgto(null);
      carregarFinanceiro();
    } else {
      mostrarToast("Erro ao registrar pagamento.", "erro");
    }
  };

  // ---------- COPIAR PIX ----------
  const copiarPix = (chave: string) => {
    navigator.clipboard.writeText(chave);
    mostrarToast("Chave PIX copiada!", "sucesso");
  };

  // ---------- EXPORTAR CSV ----------
  const exportarCSV = () => {
    const linhas = [
      ["Freelancer", "Evento", "Data Evento", "Valor", "Chave PIX", "Status", "Data Pagamento"],
      ...pagamentosFiltrados.map((p) => [
        p.freelaNome,
        p.eventoTitulo,
        formatDataBR(p.eventoData),
        p.valor.toString(),
        p.chavePix ?? "Não cadastrada",
        p.status,
        formatDataBR(p.dataPagamento),
      ]),
    ];

    const csvContent = linhas
      .map((row) => row.map((cell) => `"${cell}"`).join(";"))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `financeiro_axon_${hoje}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    mostrarToast("Relatório exportado!", "sucesso");
  };

  // ---------- CÁLCULOS ----------
  const totais = useMemo(() => {
    let aPagar = 0, pagoTotal = 0, atrasado = 0, qtdPendente = 0, qtdAtrasado = 0;
    pagamentos.forEach((pg) => {
      if (pg.status === "pendente") { aPagar   += pg.valor; qtdPendente++; }
      if (pg.status === "atrasado") { atrasado += pg.valor; qtdAtrasado++; }
      if (pg.status === "pago")     { pagoTotal += pg.valor; }
    });
    return { aPagar, pagoTotal, atrasado, qtdPendente, qtdAtrasado };
  }, [pagamentos]);

  // ---------- FILTROS ----------
  const pagamentosFiltrados = useMemo(() => {
    return pagamentos.filter((pg) => {
      const matchBusca =
        pg.freelaNome.toLowerCase().includes(busca.toLowerCase()) ||
        pg.eventoTitulo.toLowerCase().includes(busca.toLowerCase());
      const matchStatus = filtroStatus === "todos" || pg.status === filtroStatus;
      return matchBusca && matchStatus;
    });
  }, [pagamentos, busca, filtroStatus]);

  const pendentesLote = pagamentos.filter((p) => p.status !== "pago");
  const semPix = pendentesLote.filter((p) => !p.chavePix);

  // ============================================================
  // JSX
  // ============================================================
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full relative">

      {/* TOAST */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl transition-all ${toast.tipo === "sucesso" ? "bg-green-900/90 border border-green-500 text-green-100" : "bg-red-900/90 border border-red-500 text-red-100"}`}>
          {toast.tipo === "sucesso" ? <CheckCircle2 size={20} className="text-green-400" /> : <AlertTriangle size={20} className="text-red-400" />}
          <p className="text-sm font-medium">{toast.msg}</p>
        </div>
      )}

      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Financeiro & PIX</h2>
          <p className="text-sm text-gray-400 mt-1">Gestão de pagamentos de diárias e cachês de staff.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportarCSV}
            className="bg-[#121212] border border-[#222] text-gray-300 hover:text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Download size={18} /> Exportar CSV
          </button>
          <button
            onClick={() => setModalPix(true)}
            className="bg-green-600 hover:bg-green-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-green-900/20"
          >
            <Wallet size={18} /> Lote PIX
            {pendentesLote.length > 0 && (
              <span className="bg-green-400/20 text-green-200 text-xs px-1.5 py-0.5 rounded-full">
                {pendentesLote.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* AVISO: freelancers sem PIX */}
      {semPix.length > 0 && (
        <div className="mb-6 flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
          <AlertCircle size={18} className="text-yellow-500 mt-0.5 shrink-0" />
          <p className="text-sm text-yellow-400">
            <strong>{semPix.length} freelancer{semPix.length > 1 ? "s" : ""}</strong> com pagamento pendente não {semPix.length > 1 ? "têm" : "tem"} chave PIX cadastrada:{" "}
            <span className="text-yellow-300">{semPix.map((p) => p.freelaNome).join(", ")}</span>.
            Acesse o Banco de Talentos para atualizar.
          </p>
        </div>
      )}

      {/* CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* A Pagar */}
        <div className="bg-[#121212] border border-[#222] p-6 rounded-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><DollarSign size={80} /></div>
          <p className="text-sm text-gray-400 font-medium mb-1">A Pagar (Pendentes)</p>
          <p className="text-3xl font-bold text-white mb-2">{formatBRL(totais.aPagar)}</p>
          <p className="text-xs text-yellow-500 flex items-center gap-1">
            <Clock size={13} /> {totais.qtdPendente} pagamento{totais.qtdPendente !== 1 ? "s" : ""} aguardando
          </p>
        </div>
        {/* Pago */}
        <div className="bg-[#121212] border border-[#222] p-6 rounded-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><CheckCircle2 size={80} /></div>
          <p className="text-sm text-gray-400 font-medium mb-1">Total Pago</p>
          <p className="text-3xl font-bold text-white mb-2">{formatBRL(totais.pagoTotal)}</p>
          <p className="text-xs text-green-500 flex items-center gap-1">
            <ArrowDownRight size={13} /> Diárias quitadas
          </p>
        </div>
        {/* Atrasado */}
        <div className={`p-6 rounded-xl relative overflow-hidden border ${totais.atrasado > 0 ? "bg-red-500/5 border-red-500/20" : "bg-[#121212] border-[#222]"}`}>
          <div className="absolute top-0 right-0 p-4 opacity-5"><AlertTriangle size={80} /></div>
          <p className={`text-sm font-medium mb-1 ${totais.atrasado > 0 ? "text-red-400" : "text-gray-400"}`}>
            Atrasados
          </p>
          <p className={`text-3xl font-bold mb-2 ${totais.atrasado > 0 ? "text-red-500" : "text-white"}`}>
            {formatBRL(totais.atrasado)}
          </p>
          {totais.atrasado > 0 ? (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <ArrowUpRight size={13} /> {totais.qtdAtrasado} em atraso — requer atenção
            </p>
          ) : (
            <p className="text-xs text-green-500 flex items-center gap-1">
              <CheckCircle2 size={13} /> Tudo em dia!
            </p>
          )}
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Buscar por freelancer ou evento..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-[#121212] border border-[#222] rounded-lg py-2.5 pl-10 pr-4 text-sm text-gray-200 focus:outline-none focus:border-green-500"
          />
        </div>
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="bg-[#121212] border border-[#222] text-gray-300 text-sm rounded-lg py-2.5 px-4 focus:outline-none focus:border-green-500 cursor-pointer"
        >
          <option value="todos">Todos os Status</option>
          <option value="pendente">Aguardando Pagamento</option>
          <option value="atrasado">Atrasados</option>
          <option value="pago">Pagos</option>
        </select>
      </div>

      {/* TABELA */}
      <div className="bg-[#121212] border border-[#222] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#161616] text-gray-400 border-b border-[#222]">
              <tr>
                <th className="px-6 py-4 font-medium">Freelancer</th>
                <th className="px-6 py-4 font-medium">Evento / Job</th>
                <th className="px-6 py-4 font-medium">Valor</th>
                <th className="px-6 py-4 font-medium">Chave PIX</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Carregando financeiro...
                  </td>
                </tr>
              ) : pagamentosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Nenhum pagamento encontrado.
                  </td>
                </tr>
              ) : (
                pagamentosFiltrados.map((pagamento) => (
                  <tr key={pagamento.id} className="hover:bg-[#161616]/50 transition-colors">
                    {/* Freelancer */}
                    <td className="px-6 py-4 font-medium text-gray-200">{pagamento.freelaNome}</td>

                    {/* Evento */}
                    <td className="px-6 py-4">
                      <p className="text-gray-300">{pagamento.eventoTitulo}</p>
                      <p className="text-xs text-gray-500">{formatDataBR(pagamento.eventoData)}</p>
                    </td>

                    {/* Valor */}
                    <td className="px-6 py-4 font-medium text-white">
                      {formatBRL(pagamento.valor)}
                    </td>

                    {/* Chave PIX */}
                    <td className="px-6 py-4">
                      {pagamento.chavePix ? (
                        <button
                          onClick={() => copiarPix(pagamento.chavePix!)}
                          title="Clique para copiar"
                          className="flex items-center gap-1.5 text-gray-400 hover:text-green-400 transition-colors group"
                        >
                          <QrCode size={13} className="shrink-0" />
                          <span className="font-mono text-xs max-w-[130px] truncate">{pagamento.chavePix}</span>
                          <Copy size={11} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ) : (
                        <span className="flex items-center gap-1 text-yellow-600 text-xs">
                          <AlertCircle size={12} /> Não cadastrada
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      {pagamento.status === "pendente" && (
                        <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-1 rounded text-xs font-medium">
                          Aguardando
                        </span>
                      )}
                      {pagamento.status === "pago" && (
                        <div>
                          <span className="bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-1 rounded text-xs font-medium">
                            Pago
                          </span>
                          {pagamento.dataPagamento && (
                            <p className="text-[10px] text-gray-600 mt-1">{formatDataBR(pagamento.dataPagamento)}</p>
                          )}
                        </div>
                      )}
                      {pagamento.status === "atrasado" && (
                        <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-1 rounded text-xs font-medium">
                          Atrasado
                        </span>
                      )}
                    </td>

                    {/* Ação */}
                    <td className="px-6 py-4 text-right">
                      {pagamento.status !== "pago" ? (
                        <button
                          onClick={() => setModalConfirmarPgto(pagamento)}
                          className="bg-transparent border border-[#333] hover:border-green-500 hover:text-green-500 text-gray-400 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                        >
                          Marcar Pago
                        </button>
                      ) : (
                        <span className="text-green-500 flex items-center justify-end gap-1 text-xs font-medium">
                          <Check size={14} /> Quitado
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================================================================
          MODAIS
      ================================================================ */}

      {/* MODAL: CONFIRMAR PAGAMENTO */}
      {modalConfirmarPgto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#222] rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
              <DollarSign size={32} className="text-green-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Confirmar Pagamento?</h3>
            <div className="bg-[#0a0a0a] border border-[#333] rounded-lg p-3 mb-4 text-left">
              <p className="text-sm text-gray-400">Freelancer: <span className="text-white font-medium">{modalConfirmarPgto.freelaNome}</span></p>
              <p className="text-sm text-gray-400">Evento: <span className="text-white font-medium">{modalConfirmarPgto.eventoTitulo}</span></p>
              <p className="text-sm text-gray-400">Valor: <span className="text-green-400 font-bold">{formatBRL(modalConfirmarPgto.valor)}</span></p>
              {modalConfirmarPgto.chavePix && (
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-gray-400">PIX:</p>
                  <button
                    onClick={() => copiarPix(modalConfirmarPgto.chavePix!)}
                    className="flex items-center gap-1 text-green-400 hover:text-green-300 font-mono text-xs"
                  >
                    {modalConfirmarPgto.chavePix} <Copy size={11} />
                  </button>
                </div>
              )}
              {!modalConfirmarPgto.chavePix && (
                <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
                  <AlertCircle size={11} /> Chave PIX não cadastrada
                </p>
              )}
            </div>
            <p className="text-sm text-gray-400 mb-5">Você confirma que o PIX já foi transferido?</p>
            <div className="flex gap-3">
              <button onClick={() => setModalConfirmarPgto(null)} className="flex-1 py-2.5 rounded-lg border border-[#333] text-gray-300 hover:bg-[#1a1a1a]">
                Cancelar
              </button>
              <button onClick={handleMarcarPago} className="flex-1 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium">
                Sim, Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LOTE PIX */}
      {modalPix && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#222] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-[#222]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Wallet size={18} className="text-green-500" /> Lote de Pagamentos PIX
              </h3>
              <button onClick={() => setModalPix(false)} className="text-gray-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
              {pendentesLote.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 size={40} className="text-green-500 mx-auto mb-3" />
                  <p className="text-green-500 font-medium">Nenhum pagamento pendente!</p>
                  <p className="text-gray-500 text-sm mt-1">Todos os freelancers foram pagos.</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-400">
                    Copie as chaves abaixo para realizar os pagamentos no app do seu banco:
                  </p>

                  {semPix.length > 0 && (
                    <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 text-xs text-yellow-400">
                      <AlertCircle size={13} className="mt-0.5 shrink-0" />
                      {semPix.length} freelancer{semPix.length > 1 ? "s" : ""} sem chave PIX cadastrada.
                    </div>
                  )}

                  {pendentesLote.map((pg) => (
                    <div
                      key={pg.id}
                      className="bg-[#0a0a0a] border border-[#333] p-3 rounded-lg flex justify-between items-start gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{pg.freelaNome}</p>
                        <p className="text-xs text-gray-500 truncate">{pg.eventoTitulo} · {formatDataBR(pg.eventoData)}</p>
                        <p className="text-xs text-green-400 font-medium mt-0.5">{formatBRL(pg.valor)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {pg.chavePix ? (
                          <>
                            <p className="text-xs text-gray-500 mb-1">Chave PIX</p>
                            <button
                              onClick={() => copiarPix(pg.chavePix!)}
                              className="flex items-center gap-1 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] hover:border-green-500 rounded px-2 py-1 text-green-400 text-xs font-mono transition-colors group"
                            >
                              <span className="max-w-[120px] truncate">{pg.chavePix}</span>
                              <Copy size={11} className="shrink-0" />
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-yellow-600 flex items-center gap-1">
                            <AlertCircle size={11} /> Sem PIX
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="p-5 border-t border-[#222] flex justify-between items-center">
              <p className="text-xs text-gray-600">
                Total: <span className="text-white font-medium">{formatBRL(pendentesLote.reduce((s, p) => s + p.valor, 0))}</span>
              </p>
              <button
                onClick={() => setModalPix(false)}
                className="bg-[#222] hover:bg-[#333] text-white px-6 py-2 rounded-lg text-sm font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}