"use client";

import React from "react";
import { DollarSign, ArrowUpRight, ArrowDownRight, Wallet, Download, Search, Filter, CheckCircle2 } from "lucide-react";

export default function FinanceiroPage() {
  const mockPagamentos =[
    { id: 1, freela: "Carlos Silva", evento: "Congresso de Tecnologia", data: "25 Abr 2026", valor: 350, status: "pendente", chavePix: "11999999999" },
    { id: 2, freela: "Ana Souza", evento: "Congresso de Tecnologia", data: "25 Abr 2026", valor: 400, status: "pendente", chavePix: "ana@email.com" },
    { id: 3, freela: "Marcos 'Carioca'", evento: "Casamento Marina & João", data: "02 Mai 2026", valor: 200, status: "pago", chavePix: "123.456.789-00" },
    { id: 4, freela: "Juliana Mendes", evento: "Casamento Marina & João", data: "02 Mai 2026", valor: 500, status: "atrasado", chavePix: "juliana@pix.com" },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Financeiro & PIX</h2>
          <p className="text-sm text-gray-400 mt-1">Gestão de pagamentos de diárias, cachês e reembolsos de staff.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-[#121212] border border-[#222] text-gray-300 hover:text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            <Download size={18} /> Exportar Relatório
          </button>
          <button className="bg-green-600 hover:bg-green-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-green-900/20">
            <Wallet size={18} /> Gerar Lote PIX
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#121212] border border-[#222] p-6 rounded-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign size={64} /></div>
          <p className="text-sm text-gray-400 font-medium mb-1">Total a Pagar (Próx. 7 dias)</p>
          <p className="text-3xl font-bold text-white mb-2">R$ 4.250,00</p>
          <p className="text-xs text-yellow-500 flex items-center gap-1"><ArrowUpRight size={14}/> 12 diárias pendentes</p>
        </div>
        <div className="bg-[#121212] border border-[#222] p-6 rounded-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><CheckCircle2 size={64} /></div>
          <p className="text-sm text-gray-400 font-medium mb-1">Total Pago (Este Mês)</p>
          <p className="text-3xl font-bold text-white mb-2">R$ 12.800,00</p>
          <p className="text-xs text-green-500 flex items-center gap-1"><ArrowDownRight size={14}/> 45 diárias quitadas</p>
        </div>
        <div className="bg-red-500/5 border border-red-500/20 p-6 rounded-xl relative overflow-hidden">
          <p className="text-sm text-red-400 font-medium mb-1">Pagamentos Atrasados</p>
          <p className="text-3xl font-bold text-red-500 mb-2">R$ 500,00</p>
          <p className="text-xs text-red-400">1 diária pendente de regularização</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input type="text" placeholder="Buscar por freelancer ou evento..." className="w-full bg-[#121212] border border-[#222] rounded-lg py-2.5 pl-10 pr-4 text-sm text-gray-200 focus:outline-none focus:border-green-500" />
        </div>
        <select className="bg-[#121212] border border-[#222] text-gray-300 text-sm rounded-lg py-2.5 px-4 focus:outline-none focus:border-green-500 cursor-pointer">
          <option value="todos">Todos os Eventos</option>
          <option value="1">Congresso de Tecnologia</option>
          <option value="2">Casamento Marina & João</option>
        </select>
        <button className="bg-[#121212] border border-[#222] hover:bg-[#1a1a1a] px-4 py-2.5 rounded-lg text-sm text-gray-300 flex items-center gap-2">
          <Filter size={16} /> Status
        </button>
      </div>

      <div className="bg-[#121212] border border-[#222] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#161616] text-gray-400 border-b border-[#222]">
              <tr>
                <th className="px-6 py-4 font-medium w-12"><input type="checkbox" className="accent-green-500 rounded bg-[#222] border-[#333]" /></th>
                <th className="px-6 py-4 font-medium">Freelancer</th>
                <th className="px-6 py-4 font-medium">Evento / Job</th>
                <th className="px-6 py-4 font-medium">Valor</th>
                <th className="px-6 py-4 font-medium">Chave PIX</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {mockPagamentos.map((pagamento) => (
                <tr key={pagamento.id} className="hover:bg-[#161616]/50 transition-colors">
                  <td className="px-6 py-4"><input type="checkbox" className="accent-green-500 rounded bg-[#222] border-[#333]" /></td>
                  <td className="px-6 py-4 font-medium text-gray-200">{pagamento.freela}</td>
                  <td className="px-6 py-4 text-gray-400">
                    <p className="text-gray-300">{pagamento.evento}</p>
                    <p className="text-xs text-gray-500">{pagamento.data}</p>
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
                      <button className="bg-transparent border border-[#333] hover:border-green-500 hover:text-green-500 text-gray-400 px-3 py-1.5 rounded-md text-xs font-medium transition-colors">
                        Marcar Pago
                      </button>
                    ) : (
                      <button className="bg-transparent text-gray-600 px-3 py-1.5 rounded-md text-xs font-medium cursor-not-allowed">
                        Comprovante
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}