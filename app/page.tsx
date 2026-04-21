"use client";

import React, { useState, useMemo } from "react";
import { 
  UserPlus, 
  MessageCircle, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  MoreVertical, 
  Star,
  ShieldAlert
} from "lucide-react";

// MOCK DE DADOS (Será substituído pela chamada ao Supabase)
const mockFreelancers =[
  { id: 1, nome: "Carlos Silva", especialidade: "Técnico de Áudio", telefone: "5511999999999", diaria: 350, status: "disponivel", avaliacao: 5 },
  { id: 2, nome: "Ana Souza", especialidade: "Iluminadora", telefone: "5511988888888", diaria: 400, status: "em_job", avaliacao: 4.8 },
  { id: 3, nome: "Marcos 'Carioca'", especialidade: "Roadie", telefone: "5511977777777", diaria: 200, status: "disponivel", avaliacao: 4.5 },
  { id: 4, nome: "Juliana Mendes", especialidade: "Produtora", telefone: "5511966666666", diaria: 500, status: "indisponivel", avaliacao: 5 },
  { id: 5, nome: "Roberto Almeida", especialidade: "Técnico de Áudio", telefone: "5511955555555", diaria: 300, status: "disponivel", avaliacao: 4.2 },
];

export default function CrewDashboard() {
  // ESTADOS DA PÁGINA
  const[busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  // SIMULAÇÃO DE ESTADO GLOBAL (RBAC - Role Based Access Control)
  // No futuro, isso virá de um Contexto ou Zustand (ex: const { role } = useAuth())
  const currentUserRole = "admin"; // Pode ser "admin", "produtor", "logistica"
  const canViewFinancials = currentUserRole === "admin" || currentUserRole === "financeiro";

  // LÓGICA DE BUSCA E FILTRO (Front-end funcional)
  const freelancersFiltrados = useMemo(() => {
    return mockFreelancers.filter((freela) => {
      const matchBusca = 
        freela.nome.toLowerCase().includes(busca.toLowerCase()) || 
        freela.especialidade.toLowerCase().includes(busca.toLowerCase());
      
      const matchStatus = filtroStatus === "todos" || freela.status === filtroStatus;

      return matchBusca && matchStatus;
    });
  }, [busca, filtroStatus]);

  // ESTATÍSTICAS DINÂMICAS
  const totalBase = mockFreelancers.length;
  const totalDisponiveis = mockFreelancers.filter(f => f.status === "disponivel").length;
  const totalEmJob = mockFreelancers.filter(f => f.status === "em_job").length;

  // FUNÇÃO DE AÇÃO
  const convidarParaJob = (freela: any) => {
    const mensagem = `Fala ${freela.nome.split(' ')[0]}, tudo bem? Temos um job de ${freela.especialidade} para os próximos dias. A diária base é R$ ${freela.diaria}. Tem disponibilidade?`;
    const url = `https://wa.me/${freela.telefone}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Banco de Talentos</h2>
          <p className="text-sm text-gray-400 mt-1">Gerencie seus freelancers e dispare convites rápidos via WhatsApp.</p>
        </div>
        <button className="bg-green-600 hover:bg-green-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-green-900/20">
          <UserPlus size={18} />
          Cadastrar Freela
        </button>
      </div>

      {/* CARDS DE ESTATÍSTICAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#121212] border border-[#222] p-6 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-gray-800/50 rounded-lg text-gray-300">
            <UserPlus size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-400 font-medium">Total na Base</p>
            <p className="text-2xl font-bold text-white">{totalBase}</p>
          </div>
        </div>
        <div className="bg-[#121212] border border-[#222] p-6 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-green-500/10 rounded-lg text-green-500">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-400 font-medium">Disponíveis Hoje</p>
            <p className="text-2xl font-bold text-white">{totalDisponiveis}</p>
          </div>
        </div>
        <div className="bg-[#121212] border border-[#222] p-6 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-yellow-500/10 rounded-lg text-yellow-500">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-400 font-medium">Em Job Agora</p>
            <p className="text-2xl font-bold text-white">{totalEmJob}</p>
          </div>
        </div>
      </div>

      {/* BARRA DE BUSCA E FILTROS */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou especialidade..." 
            className="w-full bg-[#121212] border border-[#222] rounded-lg py-2.5 pl-10 pr-4 text-sm text-gray-200 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        
        <select 
          className="bg-[#121212] border border-[#222] text-gray-300 text-sm rounded-lg py-2.5 px-4 focus:outline-none focus:border-green-500 cursor-pointer"
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
        >
          <option value="todos">Todos os Status</option>
          <option value="disponivel">Apenas Disponíveis</option>
          <option value="em_job">Em Job Agora</option>
          <option value="indisponivel">Indisponíveis</option>
        </select>

        <button className="bg-[#121212] border border-[#222] hover:bg-[#1a1a1a] px-4 py-2.5 rounded-lg text-sm text-gray-300 flex items-center gap-2 transition-colors">
          <Filter size={16} />
          Mais Filtros
        </button>
      </div>

      {/* TABELA DE FREELANCERS */}
      <div className="bg-[#121212] border border-[#222] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#161616] text-gray-400 border-b border-[#222]">
              <tr>
                <th className="px-6 py-4 font-medium">Profissional</th>
                <th className="px-6 py-4 font-medium">Especialidade</th>
                <th className="px-6 py-4 font-medium">Avaliação</th>
                {canViewFinancials && <th className="px-6 py-4 font-medium">Diária Base</th>}
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {freelancersFiltrados.length > 0 ? (
                freelancersFiltrados.map((freela) => (
                  <tr key={freela.id} className="hover:bg-[#161616]/50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-gray-200">{freela.nome}</td>
                    <td className="px-6 py-4 text-gray-400">{freela.especialidade}</td>
                    <td className="px-6 py-4 text-gray-400">
                      <div className="flex items-center gap-1">
                        <Star size={14} className="text-yellow-500 fill-yellow-500" />
                        <span>{freela.avaliacao}</span>
                      </div>
                    </td>
                    
                    {/* Renderização Condicional baseada no Cargo (RBAC) */}
                    {canViewFinancials && (
                      <td className="px-6 py-4 text-gray-400">R$ {freela.diaria},00</td>
                    )}

                    <td className="px-6 py-4">
                      {freela.status === 'disponivel' && (
                        <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-md text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Disponível
                        </span>
                      )}
                      {freela.status === 'em_job' && (
                        <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-md text-xs font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span> Em Job
                        </span>
                      )}
                      {freela.status === 'indisponivel' && (
                        <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-md text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Indisponível
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button 
                        onClick={() => convidarParaJob(freela)}
                        className="bg-[#25D366] hover:bg-[#20bd5a] text-white px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                        title="Chamar no WhatsApp"
                      >
                        <MessageCircle size={14} />
                        Convidar
                      </button>
                      <button className="text-gray-500 hover:text-gray-300 p-1.5 transition-colors bg-[#1a1a1a] rounded-md border border-[#333] hover:border-[#444]">
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={canViewFinancials ? 6 : 5} className="px-6 py-12 text-center text-gray-500">
                    Nenhum freelancer encontrado com esses filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}