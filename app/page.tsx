"use client";

import React, { useState } from "react";
import { UserPlus, MessageCircle, Search, Filter, CheckCircle2, Clock, MoreVertical, Star } from "lucide-react";

const mockFreelancers =[
  { id: 1, nome: "Carlos Silva", especialidade: "Técnico de Áudio", telefone: "5511999999999", diaria: 350, status: "disponivel", avaliacao: 5 },
  { id: 2, nome: "Ana Souza", especialidade: "Iluminadora", telefone: "5511988888888", diaria: 400, status: "em_job", avaliacao: 4.8 },
  { id: 3, nome: "Marcos 'Carioca'", especialidade: "Roadie", telefone: "5511977777777", diaria: 200, status: "disponivel", avaliacao: 4.5 },
  { id: 4, nome: "Juliana Mendes", especialidade: "Produtora", telefone: "5511966666666", diaria: 500, status: "indisponivel", avaliacao: 5 },
];

export default function CrewDashboard() {
  const[busca, setBusca] = useState("");

  const convidarParaJob = (freela: any) => {
    const mensagem = `Fala ${freela.nome.split(' ')[0]}, tudo bem? Temos um job de ${freela.especialidade} para os próximos dias. A diária base é R$ ${freela.diaria}. Tem disponibilidade?`;
    const url = `https://wa.me/${freela.telefone}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Banco de Talentos</h2>
          <p className="text-sm text-gray-400 mt-1">Gerencie seus freelancers e dispare convites rápidos via WhatsApp.</p>
        </div>
        <button className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-green-900/20">
          <UserPlus size={16} />
          Cadastrar Freela
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#121212] border border-[#222] p-6 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-gray-800/50 rounded-lg text-gray-300"><UserPlus size={24} /></div>
          <div><p className="text-sm text-gray-400 font-medium">Total na Base</p><p className="text-2xl font-bold text-white">142</p></div>
        </div>
        <div className="bg-[#121212] border border-[#222] p-6 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-green-500/10 rounded-lg text-green-500"><CheckCircle2 size={24} /></div>
          <div><p className="text-sm text-gray-400 font-medium">Disponíveis Hoje</p><p className="text-2xl font-bold text-white">98</p></div>
        </div>
        <div className="bg-[#121212] border border-[#222] p-6 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-yellow-500/10 rounded-lg text-yellow-500"><Clock size={24} /></div>
          <div><p className="text-sm text-gray-400 font-medium">Em Job Agora</p><p className="text-2xl font-bold text-white">12</p></div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input type="text" placeholder="Buscar por nome ou especialidade..." className="w-full bg-[#121212] border border-[#222] rounded-lg py-2.5 pl-10 pr-4 text-sm text-gray-200 focus:outline-none focus:border-green-500 transition-all" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <button className="bg-[#121212] border border-[#222] hover:bg-[#1a1a1a] px-4 py-2.5 rounded-lg text-sm text-gray-300 flex items-center gap-2"><Filter size={16} /> Filtros</button>
      </div>

      <div className="bg-[#121212] border border-[#222] rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#161616] text-gray-400 border-b border-[#222]">
            <tr>
              <th className="px-6 py-4 font-medium">Profissional</th>
              <th className="px-6 py-4 font-medium">Especialidade</th>
              <th className="px-6 py-4 font-medium">Avaliação</th>
              <th className="px-6 py-4 font-medium">Diária Base</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222]">
            {mockFreelancers.map((freela) => (
              <tr key={freela.id} className="hover:bg-[#161616]/50 transition-colors group">
                <td className="px-6 py-4 font-medium text-gray-200">{freela.nome}</td>
                <td className="px-6 py-4 text-gray-400">{freela.especialidade}</td>
                <td className="px-6 py-4 text-gray-400 flex items-center gap-1"><Star size={14} className="text-yellow-500 fill-yellow-500" />{freela.avaliacao}</td>
                <td className="px-6 py-4 text-gray-400">R$ {freela.diaria},00</td>
                <td className="px-6 py-4">
                  {freela.status === 'disponivel' && <span className="text-green-500 bg-green-500/10 px-2.5 py-1 rounded-full text-xs">Disponível</span>}
                  {freela.status === 'em_job' && <span className="text-yellow-500 bg-yellow-500/10 px-2.5 py-1 rounded-full text-xs">Em Job</span>}
                  {freela.status === 'indisponivel' && <span className="text-red-500 bg-red-500/10 px-2.5 py-1 rounded-full text-xs">Indisponível</span>}
                </td>
                <td className="px-6 py-4 text-right flex justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => convidarParaJob(freela)} className="bg-[#25D366] hover:bg-[#20bd5a] text-white px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5"><MessageCircle size={14} /> Convidar</button>
                  <button className="text-gray-500 hover:text-gray-300 p-1.5 bg-[#1a1a1a] rounded-md border border-[#333]"><MoreVertical size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}