"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Calendar as CalendarIcon, Plus, MapPin, Users, Clock, 
  ChevronRight, MoreHorizontal, X, AlertTriangle, Trash2, 
  CheckCircle2, Search, UserPlus, Edit, ChevronLeft
} from "lucide-react";
import { supabase } from "../../lib/supabase";

const ESPECIALIDADES =[
  "Técnico de Áudio", "Iluminador(a)", "Técnico de Vídeo", 
  "Roadie", "Produtor(a)", "Cenógrafo(a)", "Carregador", "Recepcionista"
];

type Freela = { id: string, nome: string, especialidade: string, telefone: string, diaria: number, avaliacao: number };
type Slot = { id: string, especialidade: string, quantidade: number, cacheBase: number, designados: Freela[] };
type Evento = { id: string, titulo: string, data: string, local: string, status: string, slots: Slot[] };

export default function AgendaPage() {
  const[eventos, setEventos] = useState<Evento[]>([]);
  const[freelancersDb, setFreelancersDb] = useState<Freela[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [menuAberto, setMenuAberto] = useState<string | null>(null);

  // Modais
  const [modalNovoEvento, setModalNovoEvento] = useState(false);
  const [modalEscala, setModalEscala] = useState<Evento | null>(null);
  const[modalSelecionarFreela, setModalSelecionarFreela] = useState<{eventoId: string, slotId: string, especialidade: string} | null>(null);
  const[modalDelete, setModalDelete] = useState<string | null>(null);

  // Form Novo Evento
  const[novoEvento, setNovoEvento] = useState({ titulo: '', data: '', local: '' });
  const[necessidades, setNecessidades] = useState([{ id: Date.now().toString(), especialidade: ESPECIALIDADES[0], quantidade: 1, cacheBase: '' }]);
  const[buscaFreela, setBuscaFreela] = useState("");

  useEffect(() => {
    fetchFreelancers();
  },[]);

  const fetchFreelancers = async () => {
    const { data } = await supabase.from('freelancers').select('*').eq('status', 'disponivel');
    if (data) setFreelancersDb(data);
  };

  // ================= LÓGICA DE ALERTAS DINÂMICOS =================
  const alertas = useMemo(() => {
    const novosAlertas: any[] =[];
    const alocacoes: Record<string, { freela: Freela, eventos: string[] }> = {};

    eventos.forEach(evento => {
      evento.slots.forEach(slot => {
        if (slot.designados.length < slot.quantidade) {
          novosAlertas.push({
            id: `falta-${evento.id}-${slot.id}`,
            tipo: 'falta',
            titulo: `Faltam ${slot.quantidade - slot.designados.length} ${slot.especialidade}(s)`,
            desc: `Para o evento "${evento.titulo}"`
          });
        }

        slot.designados.forEach(freela => {
          const key = `${freela.id}_${evento.data}`;
          if (!alocacoes[key]) alocacoes[key] = { freela, eventos: [] };
          if (!alocacoes[key].eventos.includes(evento.titulo)) {
            alocacoes[key].eventos.push(evento.titulo);
          }
        });
      });
    });

    Object.values(alocacoes).forEach(aloc => {
      if (aloc.eventos.length > 1) {
        novosAlertas.push({
          id: `conflito-${aloc.freela.id}`,
          tipo: 'conflito',
          titulo: 'Conflito de Agenda',
          desc: `${aloc.freela.nome} está escalado(a) em ${aloc.eventos.length} eventos no dia.`
        });
      }
    });

    return novosAlertas;
  }, [eventos]);

  // ================= AÇÕES DE EVENTO =================
  const handleSalvarEvento = (e: React.FormEvent) => {
    e.preventDefault();
    const eventoCriado: Evento = {
      id: Date.now().toString(),
      titulo: novoEvento.titulo,
      data: novoEvento.data,
      local: novoEvento.local,
      status: 'orcamento',
      slots: necessidades.map(n => ({
        id: n.id,
        especialidade: n.especialidade,
        quantidade: Number(n.quantidade),
        cacheBase: Number(n.cacheBase),
        designados:[]
      }))
    };

    setEventos([eventoCriado, ...eventos]);
    setModalNovoEvento(false);
    setNovoEvento({ titulo: '', data: '', local: '' });
    setNecessidades([{ id: Date.now().toString(), especialidade: ESPECIALIDADES[0], quantidade: 1, cacheBase: '' }]);
  };

  const handleDeleteEvento = () => {
    if (modalDelete) {
      setEventos(eventos.filter(e => e.id !== modalDelete));
      setModalDelete(null);
      setMenuAberto(null);
    }
  };

  const handleMudarStatusEvento = (eventoId: string, novoStatus: string) => {
    setEventos(eventos.map(e => e.id === eventoId ? { ...e, status: novoStatus } : e));
    setMenuAberto(null);
  };

  // ================= AÇÕES DE ESCALA =================
  const handleAtribuirFreela = (freela: Freela) => {
    if (!modalSelecionarFreela) return;
    
    setEventos(eventos.map(ev => {
      if (ev.id === modalSelecionarFreela.eventoId) {
        return {
          ...ev,
          slots: ev.slots.map(slot => {
            if (slot.id === modalSelecionarFreela.slotId) {
              if (slot.designados.find(f => f.id === freela.id)) return slot;
              return { ...slot, designados:[...slot.designados, freela] };
            }
            return slot;
          })
        };
      }
      return ev;
    }));

    setModalEscala(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        slots: prev.slots.map(slot => {
          if (slot.id === modalSelecionarFreela.slotId) {
            if (slot.designados.find(f => f.id === freela.id)) return slot;
            return { ...slot, designados: [...slot.designados, freela] };
          }
          return slot;
        })
      };
    });

    setModalSelecionarFreela(null);
    setBuscaFreela("");
  };

  const handleRemoverFreela = (eventoId: string, slotId: string, freelaId: string) => {
    setEventos(eventos.map(ev => {
      if (ev.id === eventoId) {
        return {
          ...ev,
          slots: ev.slots.map(slot => {
            if (slot.id === slotId) {
              return { ...slot, designados: slot.designados.filter(f => f.id !== freelaId) };
            }
            return slot;
          })
        };
      }
      return ev;
    }));

    setModalEscala(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        slots: prev.slots.map(slot => {
          if (slot.id === slotId) {
            return { ...slot, designados: slot.designados.filter(f => f.id !== freelaId) };
          }
          return slot;
        })
      };
    });
  };

  // ================= CALENDÁRIO LÓGICA =================
  const hoje = new Date();
  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1).getDay();
  const diasArray = Array.from({ length: diasNoMes }, (_, i) => i + 1);
  const espacosVazios = Array.from({ length: primeiroDia }, (_, i) => i);

  const formatarDataInputParaBR = (dataIso: string) => {
    if (!dataIso) return "";
    const[ano, mes, dia] = dataIso.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const getEventosDoDia = (dia: number) => {
    const dataStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    return eventos.filter(e => e.data === dataStr);
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full relative">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Agenda & Jobs</h2>
          <p className="text-sm text-gray-400 mt-1">Gerencie os eventos e a escala da sua equipe de freelancers.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
            className="bg-[#121212] border border-[#222] text-gray-300 hover:text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            {viewMode === 'list' ? <CalendarIcon size={18} /> : <Clock size={18} />}
            {viewMode === 'list' ? 'Ver Calendário' : 'Ver Lista'}
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
        
        {/* COLUNA ESQUERDA: CONTEÚDO PRINCIPAL (LISTA OU CALENDÁRIO) */}
        <div className="lg:col-span-2 space-y-4">
          
          {viewMode === 'list' ? (
            <>
              <h3 className="text-lg font-medium text-white mb-4">Próximos Eventos</h3>
              {eventos.length === 0 ? (
                <div className="bg-[#121212] border border-[#222] border-dashed rounded-xl p-12 text-center">
                  <CalendarIcon size={48} className="mx-auto text-gray-600 mb-4" />
                  <p className="text-gray-400">Nenhum evento cadastrado.</p>
                  <button onClick={() => setModalNovoEvento(true)} className="mt-4 text-green-500 hover:text-green-400 text-sm font-medium">Criar meu primeiro evento</button>
                </div>
              ) : (
                eventos.map(evento => {
                  const vagasTotais = evento.slots.reduce((acc, slot) => acc + slot.quantidade, 0);
                  const vagasPreenchidas = evento.slots.reduce((acc, slot) => acc + slot.designados.length, 0);
                  const progresso = vagasTotais > 0 ? (vagasPreenchidas / vagasTotais) * 100 : 0;

                  return (
                    <div key={evento.id} className="bg-[#121212] border border-[#222] rounded-xl p-5 hover:border-[#333] transition-colors">
                      <div className="flex justify-between items-start mb-4 relative">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="text-lg font-bold text-gray-100">{evento.titulo}</h4>
                            {evento.status === 'confirmado' && <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-2 py-0.5 rounded text-xs font-medium">Confirmado</span>}
                            {evento.status === 'montagem' && <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded text-xs font-medium">Em Montagem</span>}
                            {evento.status === 'orcamento' && <span className="bg-gray-800 text-gray-400 border border-[#333] px-2 py-0.5 rounded text-xs font-medium">Orçamento</span>}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1.5"><CalendarIcon size={14}/> {formatarDataInputParaBR(evento.data)}</span>
                            <span className="flex items-center gap-1.5"><MapPin size={14}/> {evento.local}</span>
                          </div>
                        </div>
                        
                        <button onClick={() => setMenuAberto(menuAberto === evento.id ? null : evento.id)} className="text-gray-500 hover:text-white p-1">
                          <MoreHorizontal size={20}/>
                        </button>

                        {menuAberto === evento.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuAberto(null)}></div>
                            <div className="absolute right-0 top-8 w-48 bg-[#1a1a1a] border border-[#333] rounded-lg shadow-2xl z-20 py-1 overflow-hidden animate-in fade-in">
                              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Mudar Status</div>
                              <button onClick={() => handleMudarStatusEvento(evento.id, 'orcamento')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#222]">Orçamento</button>
                              <button onClick={() => handleMudarStatusEvento(evento.id, 'confirmado')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#222]">Confirmado</button>
                              <button onClick={() => handleMudarStatusEvento(evento.id, 'montagem')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#222]">Em Montagem</button>
                              <div className="h-px bg-[#333] my-1"></div>
                              <button onClick={() => { setMenuAberto(null); setModalDelete(evento.id); }} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"><Trash2 size={14}/> Excluir Evento</button>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#1a1a1a] flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-2">
                            <span className="text-gray-400 flex items-center gap-1.5"><Users size={14}/> Escala de Staff</span>
                            <span className={vagasPreenchidas === vagasTotais ? "text-green-500 font-medium" : "text-yellow-500 font-medium"}>
                              {vagasPreenchidas} / {vagasTotais} Vagas Preenchidas
                            </span>
                          </div>
                          <div className="w-full bg-[#222] rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full transition-all duration-500 ${vagasPreenchidas === vagasTotais ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ width: `${progresso}%` }}></div>
                          </div>
                        </div>
                        <div className="ml-6 pl-6 border-l border-[#222]">
                          <button onClick={() => setModalEscala(evento)} className="text-sm font-medium text-green-500 hover:text-green-400 flex items-center gap-1 py-2">
                            Gerenciar Escala <ChevronRight size={16}/>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          ) : (
            <div className="bg-[#121212] border border-[#222] rounded-xl p-6 animate-in fade-in">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white capitalize">
                  {hoje.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                </h3>
                <div className="flex gap-2">
                  <button className="p-1.5 bg-[#1a1a1a] rounded hover:bg-[#222] text-gray-400"><ChevronLeft size={18}/></button>
                  <button className="p-1.5 bg-[#1a1a1a] rounded hover:bg-[#222] text-gray-400"><ChevronRight size={18}/></button>
                </div>
              </div>
              
              <div className="grid grid-cols-7 gap-px bg-[#222] border border-[#222] rounded-lg overflow-hidden">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dia => (
                  <div key={dia} className="bg-[#1a1a1a] py-2 text-center text-xs font-medium text-gray-500">{dia}</div>
                ))}
                
                {espacosVazios.map(v => <div key={`vazio-${v}`} className="bg-[#121212] min-h-[100px]"></div>)}
                
                {diasArray.map(dia => {
                  const evs = getEventosDoDia(dia);
                  const isHoje = dia === hoje.getDate();
                  return (
                    <div key={dia} className={`bg-[#121212] min-h-[100px] p-2 border-t border-[#222] transition-colors hover:bg-[#161616] ${isHoje ? 'ring-1 ring-inset ring-green-500/50' : ''}`}>
                      <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isHoje ? 'bg-green-500 text-white' : 'text-gray-400'}`}>
                        {dia}
                      </span>
                      <div className="space-y-1">
                        {evs.map(e => (
                          <div key={e.id} onClick={() => setModalEscala(e)} className="text-[10px] bg-green-500/10 text-green-500 border border-green-500/20 p-1 rounded truncate cursor-pointer hover:bg-green-500/20">
                            {e.titulo}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* COLUNA DIREITA: ALERTAS INTELIGENTES */}
        <div className="space-y-6">
          <div className="bg-[#121212] border border-[#222] rounded-xl p-5 sticky top-6">
            <h3 className="text-base font-medium text-white mb-4 flex items-center gap-2">
              <Clock size={18} className="text-green-500"/> Alertas de Escala
            </h3>
            
            <div className="space-y-3">
              {alertas.length === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle2 size={32} className="mx-auto text-green-500/50 mb-2" />
                  <p className="text-sm text-gray-500">Tudo sob controle.<br/>Nenhum alerta no momento.</p>
                </div>
              ) : (
                alertas.map(alerta => (
                  <div key={alerta.id} className={`border rounded-lg p-3 ${alerta.tipo === 'falta' ? 'bg-yellow-500/5 border-yellow-500/10' : 'bg-red-500/5 border-red-500/10'}`}>
                    <p className={`text-sm font-medium mb-1 flex items-center gap-1.5 ${alerta.tipo === 'falta' ? 'text-yellow-500' : 'text-red-500'}`}>
                      {alerta.tipo === 'conflito' && <AlertTriangle size={14}/>}
                      {alerta.titulo}
                    </p>
                    <p className="text-xs text-gray-400">{alerta.desc}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ================= MODAIS ================= */}

      {/* Modal: Novo Evento */}
      {modalNovoEvento && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#222] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-[#222]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><CalendarIcon size={18} className="text-green-500"/> Criar Novo Evento</h3>
              <button onClick={() => setModalNovoEvento(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="form-evento" onSubmit={handleSalvarEvento} className="space-y-6">
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

                <div>
                  <div className="flex justify-between items-center mb-3 border-b border-[#222] pb-2">
                    <h4 className="text-sm font-medium text-white">2. Necessidade de Staff (Vagas)</h4>
                    <button type="button" onClick={() => setNecessidades([...necessidades, { id: Date.now().toString(), especialidade: ESPECIALIDADES[0], quantidade: 1, cacheBase: '' }])} className="text-xs text-green-500 hover:text-green-400 font-medium flex items-center gap-1">
                      <Plus size={14}/> Adicionar Função
                    </button>
                  </div>
                  <div className="space-y-3">
                    {necessidades.map((nec, index) => (
                      <div key={nec.id} className="flex items-end gap-3 bg-[#0a0a0a] p-3 rounded-lg border border-[#222]">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">Especialidade</label>
                          <select value={nec.especialidade} onChange={e => setNecessidades(necessidades.map(n => n.id === nec.id ? { ...n, especialidade: e.target.value } : n))} className="w-full bg-[#121212] border border-[#333] rounded-md p-2 text-sm text-white focus:border-green-500 focus:outline-none cursor-pointer">
                            {ESPECIALIDADES.map(esp => <option key={esp} value={esp}>{esp}</option>)}
                          </select>
                        </div>
                        <div className="w-24">
                          <label className="block text-xs text-gray-500 mb-1">Qtd</label>
                          <input type="number" min="1" value={nec.quantidade} onChange={e => setNecessidades(necessidades.map(n => n.id === nec.id ? { ...n, quantidade: Number(e.target.value) } : n))} className="w-full bg-[#121212] border border-[#333] rounded-md p-2 text-sm text-white focus:border-green-500 focus:outline-none text-center" />
                        </div>
                        <div className="w-32">
                          <label className="block text-xs text-gray-500 mb-1">Cachê (R$)</label>
                          <input type="number" placeholder="Ex: 300" value={nec.cacheBase} onChange={e => setNecessidades(necessidades.map(n => n.id === nec.id ? { ...n, cacheBase: e.target.value } : n))} className="w-full bg-[#121212] border border-[#333] rounded-md p-2 text-sm text-white focus:border-green-500 focus:outline-none" />
                        </div>
                        {index > 0 && (
                          <button type="button" onClick={() => setNecessidades(necessidades.filter(n => n.id !== nec.id))} className="p-2 text-gray-500 hover:text-red-500 mb-0.5"><Trash2 size={18} /></button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            </div>

            <div className="p-5 border-t border-[#222] flex justify-end gap-3 bg-[#121212]">
              <button onClick={() => setModalNovoEvento(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancelar</button>
              <button type="submit" form="form-evento" className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg text-sm font-medium">Criar Evento & Vagas</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Gerenciar Escala */}
      {modalEscala && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#222] rounded-2xl w-full max-w-5xl shadow-2xl h-[85vh] flex flex-col">
            
            <div className="p-6 border-b border-[#222] flex justify-between items-start bg-[#161616] rounded-t-2xl">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">{modalEscala.titulo}</h2>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1.5"><CalendarIcon size={14}/> {formatarDataInputParaBR(modalEscala.data)}</span>
                  <span className="flex items-center gap-1.5"><MapPin size={14}/> {modalEscala.local}</span>
                </div>
              </div>
              <button onClick={() => setModalEscala(null)} className="p-2 bg-[#222] hover:bg-[#333] rounded-full text-gray-400 hover:text-white transition-colors"><X size={20}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-[#0a0a0a]">
              <div className="space-y-6">
                {modalEscala.slots.map((slot: any) => (
                  <div key={slot.id} className="bg-[#121212] border border-[#222] rounded-xl overflow-hidden">
                    <div className="bg-[#1a1a1a] px-5 py-3 border-b border-[#222] flex justify-between items-center">
                      <div>
                        <h4 className="text-white font-medium">{slot.especialidade}</h4>
                        <p className="text-xs text-gray-500">Cachê Base: R$ {slot.cacheBase},00</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`text-sm font-medium ${slot.designados.length === slot.quantidade ? 'text-green-500' : 'text-yellow-500'}`}>
                          {slot.designados.length} / {slot.quantidade} Vagas
                        </span>
                        {slot.designados.length < slot.quantidade && (
                          <button 
                            onClick={() => setModalSelecionarFreela({ eventoId: modalEscala.id, slotId: slot.id, especialidade: slot.especialidade })}
                            className="bg-green-600/20 text-green-500 hover:bg-green-600 hover:text-white border border-green-500/30 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5"
                          >
                            <UserPlus size={14}/> Escalar Profissional
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-5">
                      {slot.designados.length === 0 ? (
                        <div className="text-center py-6 border border-dashed border-[#333] rounded-lg bg-[#0a0a0a]">
                          <p className="text-sm text-gray-500">Nenhum profissional escalado para esta vaga ainda.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {slot.designados.map((freela: any) => (
                            <div key={freela.id} className="flex items-center justify-between bg-[#0a0a0a] border border-[#222] p-3 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#222] flex items-center justify-center text-gray-400 text-xs font-bold">
                                  {freela.nome.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-200">{freela.nome}</p>
                                  <p className="text-xs text-gray-500">{freela.telefone}</p>
                                </div>
                              </div>
                              <button 
                                onClick={() => handleRemoverFreela(modalEscala.id, slot.id, freela.id)}
                                className="text-gray-500 hover:text-red-500 p-1.5 hover:bg-red-500/10 rounded transition-colors"
                                title="Remover da escala"
                              >
                                <X size={16}/>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Selecionar Freela do Banco */}
      {modalSelecionarFreela && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#222] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-[#222] flex justify-between items-center">
              <h3 className="text-white font-medium">Escalar: {modalSelecionarFreela.especialidade}</h3>
              <button onClick={() => setModalSelecionarFreela(null)} className="text-gray-500 hover:text-white"><X size={20}/></button>
            </div>
            
            <div className="p-4 border-b border-[#222] bg-[#0a0a0a]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar profissional disponível..." 
                  value={buscaFreela}
                  onChange={(e) => setBuscaFreela(e.target.value)}
                  className="w-full bg-[#121212] border border-[#333] rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:border-green-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-2">
              {freelancersDb.filter(f => 
                f.especialidade === modalSelecionarFreela.especialidade && 
                f.nome.toLowerCase().includes(buscaFreela.toLowerCase())
              ).length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-8">Nenhum profissional disponível encontrado.</p>
              ) : (
                freelancersDb
                  .filter(f => f.especialidade === modalSelecionarFreela.especialidade && f.nome.toLowerCase().includes(buscaFreela.toLowerCase()))
                  .map(freela => (
                    <div key={freela.id} className="flex items-center justify-between p-3 hover:bg-[#1a1a1a] rounded-lg transition-colors group">
                      <div>
                        <p className="text-sm font-medium text-gray-200">{freela.nome}</p>
                        <p className="text-xs text-gray-500">Avaliação: {freela.avaliacao} ⭐</p>
                      </div>
                      <button 
                        onClick={() => handleAtribuirFreela(freela)}
                        className="bg-[#222] text-white hover:bg-green-600 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                      >
                        Escalar
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Excluir Evento */}
      {modalDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#222] rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20"><AlertTriangle size={32} className="text-red-500" /></div>
            <h3 className="text-lg font-bold text-white mb-2">Excluir Evento?</h3>
            <p className="text-sm text-gray-400 mb-6">Esta ação removerá o evento e toda a escala de staff associada a ele.</p>
            <div className="flex gap-3">
              <button onClick={() => setModalDelete(null)} className="flex-1 py-2.5 rounded-lg border border-[#333] text-gray-300 hover:bg-[#1a1a1a]">Cancelar</button>
              <button onClick={handleDeleteEvento} className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}