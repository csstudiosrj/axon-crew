"use client";

import React, { useState } from "react";
import { 
  Calendar as CalendarIcon, Plus, MapPin, Users, Clock, 
  ChevronRight, MoreHorizontal, X, AlertTriangle, Trash2 
} from "lucide-react";

// Mock Inicial de Dados
const mockEventosIniciais =[
  { 
    id: 1, titulo: "Congresso de Tecnologia 2026", data: "25 Abr 2026", local: "Expo Center Norte, SP", status: "confirmado", 
    vagasTotais: 15, vagasPreenchidas: 12 
  },
  { 
    id: 2, titulo: "Casamento Marina & João", data: "02 Mai 2026", local: "Fazenda Vila Rica, Itatiba", status: "montagem", 
    vagasTotais: 8, vagasPreenchidas: 8 
  },
];

const ESPECIALIDADES =["Técnico de Áudio", "Iluminador(a)", "Técnico de Vídeo", "Roadie", "Produtor(a)", "Carregador"];

export default function AgendaPage() {
  const [eventos, setEventos] = useState(mockEventosIniciais);
  const[modalNovoEvento, setModalNovoEvento] = useState(false);
  
  // Estado do formulário de Novo Evento
  const[novoEvento, setNovoEvento] = useState({ titulo: '', data: '', local: '' });
  
  // Estado dinâmico das necessidades de equipe (Slots)
  const [necessidades, setNecessidades] = useState([
    { id: 1, especialidade: ESPECIALIDADES[0], quantidade: 1, cacheBase: '' }
  ]);

  // Funções do Formulário Dinâmico
  const adicionarNecessidade = () => {
    setNecessidades([...necessidades, { id: Date.now(), especialidade: ESPECIALIDADES[0], quantidade: 1, cacheBase: '' }]);
  };

  const removerNecessidade = (id: number) => {
    setNecessidades(necessidades.filter(n => n.id !== id));
  };

  const atualizarNecessidade = (id: number, campo: string, valor: any) => {
    setNecessidades(necessidades.map(n => n.id === id ? { ...n, [campo]: valor } : n));
  };

  const handleSalvarEvento = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calcula o total de vagas baseadas nas necessidades
    const totalVagas = necessidades.reduce((acc, curr) => acc + Number(curr.quantidade), 0);

    const eventoCriado = {
      id: Date.now(),
      titulo: novoEvento.titulo,
      data: novoEvento.data, // Em produção, formataríamos a data bonitinha
      local: novoEvento.local,
      status: 'orcamento',
      vagasTotais: totalVagas,
      vagasPreenchidas: 0 // Começa zerado
    };

    setEventos([eventoCriado, ...eventos]);
    setModalNovoEvento(false);
    
    // Reseta o form
    setNovoEvento({ titulo: '', data: '', local: '' });
    setNecessidades([{ id: 1, especialidade: ESPECIALIDADES[0], quantidade: 1, cacheBase: '' }]);
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Agenda & Jobs</h2>
          <p className="text-sm text-gray-400 mt-1">Gerencie os eventos e a escala da sua equipe de freelancers.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-[#121212] border border-[#222] text-gray-300 hover:text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            <CalendarIcon size={18} /> Ver Calendário
          </button>
          <button 
            onClick={() => setModalNovoEvento(true)}
            className="bg-green-600 hover:bg-green-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-green-900/20"
          >
            <Plus size={18} /> Novo Evento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA ESQUERDA: LISTA DE EVENTOS */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-medium text-white mb-4">Próximos Eventos</h3>
          
          {eventos.map(evento => (
            <div key={evento.id} className="bg-[#121212] border border-[#222] rounded-xl p-5 hover:border-[#333] transition-colors group cursor-pointer">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="text-lg font-bold text-gray-100">{evento.titulo}</h4>
                    {evento.status === 'confirmado' && <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-2 py-0.5 rounded text-xs font-medium">Confirmado</span>}
                    {evento.status === 'montagem' && <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded text-xs font-medium">Em Montagem</span>}
                    {evento.status === 'orcamento' && <span className="bg-gray-800 text-gray-400 border border-[#333] px-2 py-0.5 rounded text-xs font-medium">Orçamento</span>}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5"><CalendarIcon size={14}/> {evento.data}</span>
                    <span className="flex items-center gap-1.5"><MapPin size={14}/> {evento.local}</span>
                  </div>
                </div>
                <button className="text-gray-500 hover:text-white p-1"><MoreHorizontal size={20}/></button>
              </div>

              {/* A MINA DE OURO: BARRA DE PROGRESSO DE STAFF */}
              <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#1a1a1a] flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-gray-400 flex items-center gap-1.5"><Users size={14}/> Escala de Staff</span>
                    <span className={evento.vagasPreenchidas === evento.vagasTotais ? "text-green-500 font-medium" : "text-yellow-500 font-medium"}>
                      {evento.vagasPreenchidas} / {evento.vagasTotais} Vagas Preenchidas
                    </span>
                  </div>
                  <div className="w-full bg-[#222] rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-500 ${evento.vagasPreenchidas === evento.vagasTotais ? 'bg-green-500' : 'bg-yellow-500'}`} 
                      style={{ width: `${evento.vagasTotais > 0 ? (evento.vagasPreenchidas / evento.vagasTotais) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                <div className="ml-6 pl-6 border-l border-[#222]">
                  <button className="text-sm font-medium text-green-500 hover:text-green-400 flex items-center gap-1">
                    Gerenciar Escala <ChevronRight size={16}/>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* COLUNA DIREITA: ALERTAS INTELIGENTES */}
        <div className="space-y-6">
          <div className="bg-[#121212] border border-[#222] rounded-xl p-5 sticky top-6">
            <h3 className="text-base font-medium text-white mb-4 flex items-center gap-2"><Clock size={18} className="text-green-500"/> Alertas de Escala</h3>
            <div className="space-y-3">
              <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-3">
                <p className="text-sm text-yellow-500 font-medium mb-1">Faltam 3 Técnicos de Áudio</p>
                <p className="text-xs text-gray-400">Para o evento "Congresso de Tecnologia 2026"</p>
              </div>
              <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3">
                <p className="text-sm text-red-500 font-medium mb-1 flex items-center gap-1.5"><AlertTriangle size={14}/> Conflito de Agenda</p>
                <p className="text-xs text-gray-400">Carlos Silva está escalado em 2 eventos no dia 02/05.</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ================= MODAL: NOVO EVENTO (FOCO EM STAFF) ================= */}
      {modalNovoEvento && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#222] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-center p-5 border-b border-[#222]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><CalendarIcon size={18} className="text-green-500"/> Criar Novo Evento</h3>
              <button onClick={() => setModalNovoEvento(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="form-evento" onSubmit={handleSalvarEvento} className="space-y-6">
                
                {/* Dados Básicos */}
                <div>
                  <h4 className="text-sm font-medium text-white mb-3 border-b border-[#222] pb-2">1. Dados do Job</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs text-gray-400 mb-1">Nome do Evento / Job *</label>
                      <input required type="text" value={novoEvento.titulo} onChange={e => setNovoEvento({...novoEvento, titulo: e.target.value})} className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-2.5 text-sm text-white focus:border-green-500 focus:outline-none" placeholder="Ex: Lançamento Produto X" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Data *</label>
                      <input required type="date" value={novoEvento.data} onChange={e => setNovoEvento({...novoEvento, data: e.target.value})} className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-2.5 text-sm text-white focus:border-green-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Local *</label>
                      <input required type="text" value={novoEvento.local} onChange={e => setNovoEvento({...novoEvento, local: e.target.value})} className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-2.5 text-sm text-white focus:border-green-500 focus:outline-none" placeholder="Ex: Expo Center Norte" />
                    </div>
                  </div>
                </div>

                {/* Necessidades de Equipe (Slots) */}
                <div>
                  <div className="flex justify-between items-center mb-3 border-b border-[#222] pb-2">
                    <h4 className="text-sm font-medium text-white">2. Necessidade de Staff (Vagas)</h4>
                    <button type="button" onClick={adicionarNecessidade} className="text-xs text-green-500 hover:text-green-400 font-medium flex items-center gap-1">
                      <Plus size={14}/> Adicionar Função
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {necessidades.map((nec, index) => (
                      <div key={nec.id} className="flex items-end gap-3 bg-[#0a0a0a] p-3 rounded-lg border border-[#222]">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">Especialidade</label>
                          <select value={nec.especialidade} onChange={e => atualizarNecessidade(nec.id, 'especialidade', e.target.value)} className="w-full bg-[#121212] border border-[#333] rounded-md p-2 text-sm text-white focus:border-green-500 focus:outline-none cursor-pointer">
                            {ESPECIALIDADES.map(esp => <option key={esp} value={esp}>{esp}</option>)}
                          </select>
                        </div>
                        <div className="w-24">
                          <label className="block text-xs text-gray-500 mb-1">Qtd</label>
                          <input type="number" min="1" value={nec.quantidade} onChange={e => atualizarNecessidade(nec.id, 'quantidade', e.target.value)} className="w-full bg-[#121212] border border-[#333] rounded-md p-2 text-sm text-white focus:border-green-500 focus:outline-none text-center" />
                        </div>
                        <div className="w-32">
                          <label className="block text-xs text-gray-500 mb-1">Cachê (R$)</label>
                          <input type="number" placeholder="Ex: 300" value={nec.cacheBase} onChange={e => atualizarNecessidade(nec.id, 'cacheBase', e.target.value)} className="w-full bg-[#121212] border border-[#333] rounded-md p-2 text-sm text-white focus:border-green-500 focus:outline-none" />
                        </div>
                        {index > 0 && (
                          <button type="button" onClick={() => removerNecessidade(nec.id)} className="p-2 text-gray-500 hover:text-red-500 transition-colors mb-0.5">
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </form>
            </div>

            <div className="p-5 border-t border-[#222] flex justify-end gap-3 bg-[#121212]">
              <button onClick={() => setModalNovoEvento(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancelar</button>
              <button type="submit" form="form-evento" className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg text-sm font-medium">
                Criar Evento & Vagas
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}