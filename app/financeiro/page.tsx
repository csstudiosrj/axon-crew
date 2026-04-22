"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  DollarSign, ArrowUpRight, ArrowDownRight, Wallet, 
  Download, Search, Filter, CheckCircle2, AlertTriangle, X, Check
} from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function FinanceiroPage() {
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const[busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [toast, setToast] = useState<{msg: string, tipo: 'sucesso' | 'erro'} | null>(null);

  // Modais
  const [modalPix, setModalPix] = useState(false);
  const [modalConfirmarPgto, setModalConfirmarPgto] = useState<string | null>(null);

  useEffect(() => {
    carregarFinanceiro();
  },[]);

  const carregarFinanceiro = async () => {
    setIsLoading(true);
    // Puxa a escala cruzando com os dados do Freela, do Slot (valor) e do Evento (data/nome)
    const { data, error } = await supabase
      .from('evento_escalas')
      .select(`
        id,
        status_pagamento,
        data_pagamento,
        freelancers ( id, nome, chave_pix, telefone ),
        evento_slots ( cache_base ),
        eventos ( titulo, data )
      `);

    if (data) {
      // Formata os dados para a tabela e calcula atrasos
      const hoje = new Date().toISOString().split('T')[0];
      const formatados = data.map((item: any) => {
        let statusReal = item.status_pagamento;
        // Se está pendente e a data do evento já passou, está atrasado
        if (statusReal === 'pendente' && item.eventos.data < hoje) {
          statusReal = 'atrasado';
        }
        return {
          id: item.id,
          freelaNome: item.freelancers.nome,
          chavePix: item.freelancers.chave_pix || 'Não cadastrada',
          telefone: item.freelancers.telefone,
          eventoTitulo: item.eventos.titulo,
          eventoData: item.eventos.data,
          valor: item.evento_slots.cache_base,
          status: statusReal
        };
      });
      setPagamentos(formatados);
    }
    setIsLoading(false);
  };

  const mostrarToast = (msg: string, tipo: 'sucesso' | 'erro') => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3000);
  };

  const handleMarcarPago = async () => {
    if (!modalConfirmarPgto) return;
    
    const { error } = await supabase
      .from('evento_escalas')
      .update({ 
        status_pagamento: 'pago', 
        data_pagamento: new Date().toISOString() 
      })
      .eq('id', modalConfirmarPgto);

    if (!error) {
      mostrarToast("Pagamento registrado com sucesso!", "sucesso");
      carregarFinanceiro();
      setModalConfirmarPgto(null);
    } else {
      mostrarToast("Erro ao registrar pagamento.", "erro");
    }
  };

  // ================= CÁLCULOS DOS CARDS =================
  const totais = useMemo(() => {
    let aPagar = 0;
    let pagoMes = 0;
    let atrasado = 0;

    pagamentos.forEach(pg => {
      if (pg.status === 'pendente') aPagar += pg.valor;
      if (pg.status === 'atrasado') atrasado += pg.valor;
      if (pg.status === 'pago') pagoMes += pg.valor; // Simplificado para o MVP
    });

    return { aPagar, pagoMes, atrasado };
  }, [pagamentos]);

  // ================= FILTROS =================
  const pagamentosFiltrados = useMemo(() => {
    return pagamentos.filter(pg => {
      const matchBusca = pg.freelaNome.toLowerCase().includes(busca.toLowerCase()) || pg.eventoTitulo.toLowerCase().includes(busca.toLowerCase());
      const matchStatus = filtroStatus === "todos" || pg.status === filtroStatus;
      return matchBusca && matchStatus;
    });
  },[pagamentos, busca, filtroStatus]);

  const formatarDataBR = (dataIso: string) => {
    if (!dataIso) return "";
    const [ano, mes, dia] = dataIso.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full relative">
      
      {/* TOAST */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl animate-in slide-in-from-bottom-5 ${toast.tipo === 'sucesso' ? 'bg-green-900/90 border border-green-500 text-green-100' : 'bg-red-900/90 border border-red-500 text-red-100'}`}>
          {toast.tipo === 'sucesso' ? <CheckCircle2 size={20} className="text-green-400"/> : <AlertTriangle size={20} className="text-red-400"/>}
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
          <button className="bg-[#121212] border border-[#222] text-gray-300 hover:text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            <Download size={18} /> Exportar Relatório
          </button>
          <button 
            onClick={() => setModalPix(true)}
            className="bg-green-600 hover:bg-green-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-green-900/20"
          >
            <Wallet size={18} /> Gerar Lote PIX
          </button>
        </div>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#121212] border border-[#222] p-6 rounded-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign size={64} /></div>
          <p className="text-sm text-gray-400 font-medium mb-1">Total a Pagar (Pendentes)</p>
          <p className="text-3xl font-bold text-white mb-2">R$ {totais.aPagar},00</p>
          <p className="text-xs text-yellow-500 flex items-center gap-1"><ArrowUpRight size={14}/> Agendados</p>
        </div>
        <div className="bg-[#121212] border border-[#222] p-6 rounded-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><CheckCircle2 size={64} /></div>
          <p className="text-sm text-gray-400 font-medium mb-1">Total Pago</p>
          <p className="text-3xl font-bold text-white mb-2">R$ {totais.pagoMes},00</p>
          <p className="text-xs text-green-500 flex items-center gap-1"><ArrowDownRight size={14}/> Diárias quitadas</p>
        </div>
        <div className="bg-red-500/5 border border-red-500/20 p-6 rounded-xl relative overflow-hidden">
          <p className="text-sm text-red-400 font-medium mb-1">Pagamentos Atrasados</p>
          <p className="text-3xl font-bold text-red-500 mb-2">R$ {totais.atrasado},00</p>
          <p className="text-xs text-red-400">Requer atenção imediata</p>
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
            onChange={e => setBusca(e.target.value)}
            className="w-full bg-[#121212] border border-[#222] rounded-lg py-2.5 pl-10 pr-4 text-sm text-gray-200 focus:outline-none focus:border-green-500" 
          />
        </div>
        <select 
          value={filtroStatus}
          onChange={e => setFiltroStatus(e.target.value)}
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
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Carregando financeiro...</td></tr>
              ) : pagamentosFiltrados.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Nenhum pagamento encontrado.</td></tr>
              ) : (
                pagamentosFiltrados.map((pagamento) => (
                  <tr key={pagamento.id} className="hover:bg-[#161616]/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-200">{pagamento.freelaNome}</td>
                    <td className="px-6 py-4 text-gray-400">
                      <p className="text-gray-300">{pagamento.eventoTitulo}</p>
                      <p className="text-xs text-gray-500">{formatarDataBR(pagamento.eventoData)}</p>
                    </td>
                    <td className="px-6 py-4 font-medium text-white">R$ {pagamento.valor},00</td>
                    <td className="px-6 py-4 text-gray-400 font-mono text-xs">{pagamento.chavePix}</td>
                    <td className="px-6 py-4">
                      {pagamento.status === 'pendente' && <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-1 rounded text-xs font-medium">Aguardando</span>}
                      {pagamento.status === 'pago' && <span className="bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-1 rounded text-xs font-medium">Pago</span>}
                      {pagamento.status === 'atrasado' && <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-1 rounded text-xs font-medium">Atrasado</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {pagamento.status !== 'pago' ? (
                        <button 
                          onClick={() => setModalConfirmarPgto(pagamento.id)}
                          className="bg-transparent border border-[#333] hover:border-green-500 hover:text-green-500 text-gray-400 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                        >
                          Marcar Pago
                        </button>
                      ) : (
                        <span className="text-green-500 flex items-center justify-end gap-1 text-xs font-medium">
                          <Check size={14}/> Quitado
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

      {/* MODAL: CONFIRMAR PAGAMENTO */}
      {modalConfirmarPgto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#222] rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20"><DollarSign size={32} className="text-green-500" /></div>
            <h3 className="text-lg font-bold text-white mb-2">Confirmar Pagamento?</h3>
            <p className="text-sm text-gray-400 mb-6">Você confirma que o PIX já foi transferido para a conta deste freelancer?</p>
            <div className="flex gap-3">
              <button onClick={() => setModalConfirmarPgto(null)} className="flex-1 py-2.5 rounded-lg border border-[#333] text-gray-300 hover:bg-[#1a1a1a]">Cancelar</button>
              <button onClick={handleMarcarPago} className="flex-1 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium">Sim, Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LOTE PIX (Copia e Cola) */}
      {modalPix && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#222] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-[#222]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Wallet size={18} className="text-green-500"/> Lote de Pagamentos (PIX)</h3>
              <button onClick={() => setModalPix(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-5 max-h-[60vh] overflow-y-auto">
              <p className="text-sm text-gray-400 mb-4">Copie as chaves abaixo para realizar os pagamentos no app do seu banco:</p>
              <div className="space-y-3">
                {pagamentos.filter(p => p.status !== 'pago').length === 0 ? (
                  <p className="text-center text-green-500 py-4">Nenhum pagamento pendente!</p>
                ) : (
                  pagamentos.filter(p => p.status !== 'pago').map(pg => (
                    <div key={pg.id} className="bg-[#0a0a0a] border border-[#333] p-3 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-white">{pg.freelaNome}</p>
                        <p className="text-xs text-gray-500">R$ {pg.valor},00 - {pg.eventoTitulo}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400 mb-1">Chave PIX:</p>
                        <code className="bg-[#222] px-2 py-1 rounded text-green-400 text-xs select-all">{pg.chavePix}</code>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="p-5 border-t border-[#222] flex justify-end">
              <button onClick={() => setModalPix(false)} className="bg-[#222] hover:bg-[#333] text-white px-6 py-2 rounded-lg text-sm font-medium">Fechar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}