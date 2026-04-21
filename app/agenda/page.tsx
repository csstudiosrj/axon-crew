"use client";

import React from "react";
import { Calendar as CalendarIcon, Plus, MapPin, Users, Clock, ChevronRight, MoreHorizontal } from "lucide-react";

export default function AgendaPage() {
  const mockEventos =[
    { id: 1, titulo: "Congresso de Tecnologia 2026", data: "25 Abr 2026", local: "Expo Center Norte, SP", status: "confirmado", staffTotal: 15, staffPreenchido: 12 },
    { id: 2, titulo: "Casamento Marina & João", data: "02 Mai 2026", local: "Fazenda Vila Rica, Itatiba", status: "montagem", staffTotal: 8, staffPreenchido: 8 },
    { id: 3, titulo: "Lançamento Produto X", data: "10 Mai 2026", local: "WTC Events Center, SP", status: "orcamento", staffTotal: 25, staffPreenchido: 5 },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Agenda & Jobs</h2>
          <p className="text-sm text-gray-400 mt-1">Gerencie os eventos e a escala da sua equipe de freelancers.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-[#121212] border border-[#222] text-gray-300 hover:text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            <CalendarIcon size={18} /> Ver Calendário
          </button>
          <button className="bg-green-600 hover:bg-green-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-green-900/20">
            <Plus size={18} /> Novo Evento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-medium text-white mb-4">Próximos Eventos</h3>
          
          {mockEventos.map(evento => (
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

              <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#1a1a1a] flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-gray-400 flex items-center gap-1.5"><Users size={14}/> Escala de Staff</span>
                    <span className={evento.staffPreenchido === evento.staffTotal ? "text-green-500 font-medium" : "text-yellow-500 font-medium"}>
                      {evento.staffPreenchido} / {evento.staffTotal} Vagas
                    </span>
                  </div>
                  <div className="w-full bg-[#222] rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full ${evento.staffPreenchido === evento.staffTotal ? 'bg-green-500' : 'bg-yellow-500'}`} 
                      style={{ width: `${(evento.staffPreenchido / evento.staffTotal) * 100}%` }}
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

        <div className="space-y-6">
          <div className="bg-[#121212] border border-[#222] rounded-xl p-5">
            <h3 className="text-base font-medium text-white mb-4 flex items-center gap-2"><Clock size={18} className="text-green-500"/> Alertas de Escala</h3>
            <div className="space-y-3">
              <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-3">
                <p className="text-sm text-yellow-500 font-medium mb-1">Faltam 3 Técnicos de Áudio</p>
                <p className="text-xs text-gray-400">Para o evento "Lançamento Produto X"</p>
              </div>
              <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3">
                <p className="text-sm text-red-500 font-medium mb-1">Conflito de Agenda</p>
                <p className="text-xs text-gray-400">Carlos Silva está escalado em 2 eventos no dia 02/05.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}