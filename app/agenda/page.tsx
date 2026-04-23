"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar as CalendarIcon, Plus, MapPin, Users, Clock,
  ChevronRight, MoreHorizontal, X, AlertTriangle, Trash2,
  CheckCircle2, Search, UserPlus, ChevronLeft, Edit, MessageCircle
} from "lucide-react";
import { supabase } from "../../lib/supabase";

const ESPECIALIDADES = [
  "Técnico de Áudio", "Iluminador(a)", "Técnico de Vídeo",
  "Roadie", "Produtor(a)", "Cenógrafo(a)", "Carregador", "Recepcionista"
];

export default function AgendaPage() {
  // ================= ESTADOS =================
  const [eventos, setEventos] = useState<any[]>([]);
  const [todosFreelancers, setTodosFreelancers] = useState<any[]>([]);   // Todos — para montar designados
  const [freelancersDisponiveis, setFreelancersDisponiveis] = useState<any[]>([]); // Só disponíveis — para escalar
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [menuAberto, setMenuAberto] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; tipo: 'sucesso' | 'erro' } | null>(null);

  // Calendário
  const [mesAtual, setMesAtual] = useState(new Date());

  // Modais
  const [modalNovoEvento, setModalNovoEvento] = useState(false);
  const [modalEditarEvento, setModalEditarEvento] = useState<any | null>(null);
  const [modalEscala, setModalEscala] = useState<any | null>(null);
  const [modalSelecionarFreela, setModalSelecionarFreela] = useState<{ eventoId: string; slotId: string; especialidade: string; cacheBase: number } | null>(null);
  const [modalDelete, setModalDelete] = useState<string | null>(null);

  // Forms
  const [novoEvento, setNovoEvento] = useState({ titulo: '', data: '', horario_inicio: '', local: '' });
  const [necessidades, setNecessidades] = useState([{ id: Date.now().toString(), especialidade: ESPECIALIDADES[0], quantidade: 1, cacheBase: '' }]);

  // Edit: slots novos a adicionar
  const [slotsEditando, setSlotsEditando] = useState<any[]>([]);

  // Busca freela
  const [buscaFreela, setBuscaFreela] = useState("");

  // ================= CARREGAMENTO =================
  useEffect(() => { carregarTudo(); }, []);

  const carregarTudo = async () => {
    setIsLoading(true);
    try {
      const [resEv, resSlots, resEscalas, resTodosF, resDisponiveisF] = await Promise.all([
        supabase.from('eventos').select('*').order('data', { ascending: true }),
        supabase.from('evento_slots').select('*'),
        supabase.from('evento_escalas').select('*'),
        supabase.from('freelancers').select('*'),                             // TODOS para montar designados
        supabase.from('freelancers').select('*').eq('status', 'disponivel'),  // Disponíveis para escalar
      ]);

      if (resTodosF.data) setTodosFreelancers(resTodosF.data);
      if (resDisponiveisF.data) setFreelancersDisponiveis(resDisponiveisF.data);

      if (resEv.data) {
        const eventosMontados = resEv.data.map(ev => {
          const slotsDoEvento = (resSlots.data || [])
            .filter(s => s.evento_id === ev.id)
            .map(slot => {
              const escalasDoSlot = (resEscalas.data || []).filter(esc => esc.slot_id === slot.id);
              const designados = escalasDoSlot.map(esc => {
                // Usa TODOS os freelancers para não perder os que mudaram de status
                const f = (resTodosF.data || []).find(fr => fr.id === esc.freelancer_id);
                return f ? { ...f, escala_id: esc.id } : null;
              }).filter(Boolean);
              return { ...slot, designados };
            });
          return { ...ev, slots: slotsDoEvento };
        });

        setEventos(eventosMontados);

        // Atualiza o modal de escala se estiver aberto
        if (modalEscala) {
          const atualizado = eventosMontados.find(e => e.id === modalEscala.id);
          if (atualizado) setModalEscala(atualizado);
        }
      }
    } catch {
      mostrarToast("Erro ao carregar dados", "erro");
    }
    setIsLoading(false);
  };

  const mostrarToast = (msg: string, tipo: 'sucesso' | 'erro') => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3500);
  };

  // ================= ALERTAS INTELIGENTES =================
  const alertas = useMemo(() => {
    const novosAlertas: any[] = [];
    const faltasPorEvento: Record<string, { titulo: string; faltas: string[] }> = {};
    const alocacoes: Record<string, { freela: any; eventos: string[] }> = {};

    eventos.forEach(evento => {
      evento.slots.forEach((slot: any) => {
        const faltam = slot.quantidade - slot.designados.length;
        if (faltam > 0) {
          if (!faltasPorEvento[evento.id]) faltasPorEvento[evento.id] = { titulo: evento.titulo, faltas: [] };
          faltasPorEvento[evento.id].faltas.push(`${faltam} ${slot.especialidade}`);
        }

        slot.designados.forEach((freela: any) => {
          // Chave inclui horário se disponível — evita falso positivo em horários diferentes
          const horario = evento.horario_inicio || 'sem-horario';
          const key = `${freela.id}_${evento.data}_${horario}`;
          if (!alocacoes[key]) alocacoes[key] = { freela, eventos: [] };
          if (!alocacoes[key].eventos.includes(evento.titulo)) {
            alocacoes[key].eventos.push(evento.titulo);
          }
        });
      });
    });

    Object.values(faltasPorEvento).forEach(f => {
      novosAlertas.push({ id: `falta-${f.titulo}`, tipo: 'falta', titulo: `Equipe Incompleta: ${f.titulo}`, desc: `Falta: ${f.faltas.join(', ')}` });
    });

    Object.values(alocacoes).forEach(aloc => {
      if (aloc.eventos.length > 1) {
        novosAlertas.push({ id: `conflito-${aloc.freela.id}`, tipo: 'conflito', titulo: `Conflito: ${aloc.freela.nome}`, desc: `Escalado no mesmo horário em: ${aloc.eventos.join(' e ')}` });
      }
    });

    return novosAlertas;
  }, [eventos]);

  // ================= AÇÕES DE EVENTO =================
  const handleSalvarEvento = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: evData, error: evError } = await supabase.from('eventos').insert([{
      titulo: novoEvento.titulo,
      data: novoEvento.data,
      horario_inicio: novoEvento.horario_inicio || null,
      local: novoEvento.local,
      status: 'orcamento'
    }]).select();

    if (evError || !evData) { mostrarToast("Erro ao criar evento", "erro"); return; }

    const eventoId = evData[0].id;
    const slotsParaInserir = necessidades.map(n => ({
      evento_id: eventoId,
      especialidade: n.especialidade,
      quantidade: Number(n.quantidade),
      cache_base: Number(n.cacheBase) || 0
    }));

    const { error: slotsError } = await supabase.from('evento_slots').insert(slotsParaInserir);

    if (slotsError) {
      mostrarToast("Evento criado, mas erro ao salvar vagas", "erro");
    } else {
      mostrarToast("Evento criado com sucesso!", "sucesso");
      setModalNovoEvento(false);
      setNovoEvento({ titulo: '', data: '', horario_inicio: '', local: '' });
      setNecessidades([{ id: Date.now().toString(), especialidade: ESPECIALIDADES[0], quantidade: 1, cacheBase: '' }]);
      carregarTudo();
    }
  };

  const handleAtualizarEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalEditarEvento) return;

    const { error } = await supabase.from('eventos').update({
      titulo: modalEditarEvento.titulo,
      data: modalEditarEvento.data,
      horario_inicio: modalEditarEvento.horario_inicio || null,
      local: modalEditarEvento.local
    }).eq('id', modalEditarEvento.id);

    if (error) { mostrarToast("Erro ao atualizar evento", "erro"); return; }

    // Salva slots novos que foram adicionados no modal de edição
    if (slotsEditando.length > 0) {
      const novosSlots = slotsEditando.map(s => ({
        evento_id: modalEditarEvento.id,
        especialidade: s.especialidade,
        quantidade: Number(s.quantidade),
        cache_base: Number(s.cacheBase) || 0
      }));
      await supabase.from('evento_slots').insert(novosSlots);
    }

    mostrarToast("Evento atualizado!", "sucesso");
    setModalEditarEvento(null);
    setSlotsEditando([]);
    carregarTudo();
  };

  const handleDeleteEvento = async () => {
    if (!modalDelete) return;
    const { error } = await supabase.from('eventos').delete().eq('id', modalDelete);
    if (!error) {
      mostrarToast("Evento excluído", "sucesso");
      setModalDelete(null);
      setMenuAberto(null);
      carregarTudo();
    } else {
      mostrarToast("Erro ao excluir", "erro");
    }
  };

  const handleMudarStatusEvento = async (eventoId: string, novoStatus: string) => {
    const { error } = await supabase.from('eventos').update({ status: novoStatus }).eq('id', eventoId);
    if (!error) { mostrarToast("Status atualizado", "sucesso"); setMenuAberto(null); carregarTudo(); }
  };

  // ================= AÇÕES DE ESCALA =================
  const handleAtribuirFreela = async (freela: any) => {
    if (!modalSelecionarFreela) return;

    const { error } = await supabase.from('evento_escalas').insert([{
      evento_id: modalSelecionarFreela.eventoId,
      slot_id: modalSelecionarFreela.slotId,
      freelancer_id: freela.id,
      status_pagamento: 'pendente'  // ← ESSENCIAL para o financeiro funcionar
    }]);

    if (error) {
      mostrarToast("Profissional já escalado nesta vaga", "erro");
    } else {
      mostrarToast(`${freela.nome} escalado(a)!`, "sucesso");
      setModalSelecionarFreela(null);
      setBuscaFreela("");
      carregarTudo();
    }
  };

  const handleRemoverFreela = async (escalaId: string) => {
    const { error } = await supabase.from('evento_escalas').delete().eq('id', escalaId);
    if (!error) { mostrarToast("Profissional removido da escala", "sucesso"); carregarTudo(); }
  };

  // ================= WHATSAPP =================
  const gerarLinkWhatsApp = (freela: any, slot: any, evento: any) => {
    const tel = freela.telefone?.replace(/\D/g, '');
    if (!tel) return null;

    const data = formatarDataInputParaBR(evento.data);
    const horario = evento.horario_inicio ? ` às ${evento.horario_inicio.substring(0, 5)}` : '';

    const msg = encodeURIComponent(
      `Olá ${freela.nome}! 👋\n\n` +
      `Você está na escala do evento *${evento.titulo}*.\n\n` +
      `📅 Data: ${data}${horario}\n` +
      `📍 Local: ${evento.local}\n` +
      `💼 Função: ${slot.especialidade}\n` +
      `💰 Cachê: R$ ${slot.cache_base},00\n\n` +
      `Por favor, confirme sua presença respondendo esta mensagem.\n\n` +
      `_AXON Crew_`
    );

    return `https://wa.me/55${tel}?text=${msg}`;
  };

  // ================= HELPERS =================
  const irParaMesAnterior = () => setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1, 1));
  const irParaProximoMes = () => setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 1));

  const formatarDataInputParaBR = (dataIso: string) => {
    if (!dataIso) return "";
    const [ano, mes, dia] = dataIso.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const diasNoMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0).getDate();
  const primeiroDia = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1).getDay();
  const diasArray = Array.from({ length: diasNoMes }, (_, i) => i + 1);
  const espacosVazios = Array.from({ length: primeiroDia }, (_, i) => i);

  // ================= RENDER =================
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full relative">

      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl animate-in slide-in-from-bottom-5 ${toast.tipo === 'sucesso' ? 'bg-green-900/90 border border-green-500 text-green-100' : 'bg-red-900/90 border border-red-500 text-red-100'}`}>
          {toast.tipo === 'sucesso' ? <CheckCircle2 size={20} className="text-green-400" /> : <AlertTriangle size={20} className="text-red-400" />}
          <p className="text-sm font-medium">{toast.msg}</p>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Agenda & Jobs</h2>
          <p className="text-sm text-gray-400 mt-1">Gerencie eventos e a escala da sua equipe.</p>
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

        <div className="lg:col-span-2 space-y-4">
          {viewMode === 'list' ? (
            <>
              <h3 className="text-lg font-medium text-white mb-4">Próximos Eventos</h3>
              {isLoading ? (
                <div className="text-center py-12 text-gray-500">Carregando eventos...</div>
              ) : eventos.length === 0 ? (
                <div className="bg-[#121212] border border-[#222] border-dashed rounded-xl p-12 text-center">
                  <CalendarIcon size={48} className="mx-auto text-gray-600 mb-4" />
                  <p className="text-gray-400">Nenhum evento cadastrado.</p>
                  <button onClick={() => setModalNovoEvento(true)} className="mt-4 text-green-500 hover:text-green-400 text-sm font-medium">Criar meu primeiro evento</button>
                </div>
              ) : (
                eventos.map(evento => {
                  const vagasTotais = evento.slots.reduce((acc: number, s: any) => acc + s.quantidade, 0);
                  const vagasPreenchidas = evento.slots.reduce((acc: number, s: any) => acc + s.designados.length, 0);
                  const progresso = vagasTotais > 0 ? (vagasPreenchidas / vagasTotais) * 100 : 0;

                  return (
                    <div key={evento.id} className="bg-[#121212] border border-[#222] rounded-xl p-5 hover:border-[#333] transition-colors">
                      <div className="flex justify-between items-start mb-4 relative">
                        <div>
                          <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <h4 className="text-lg font-bold text-gray-100">{evento.titulo}</h4>
                            {evento.status === 'confirmado' && <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-2 py-0.5 rounded text-xs font-medium">Confirmado</span>}
                            {evento.status === 'montagem' && <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded text-xs font-medium">Em Montagem</span>}
                            {evento.status === 'orcamento' && <span className="bg-gray-800 text-gray-400 border border-[#333] px-2 py-0.5 rounded text-xs font-medium">Orçamento</span>}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                            <span className="flex items-center gap-1.5"><CalendarIcon size={14} /> {formatarDataInputParaBR(evento.data)}</span>
                            {evento.horario_inicio && <span className="flex items-center gap-1.5"><Clock size={14} /> {evento.horario_inicio.substring(0, 5)}</span>}
                            <span className="flex items-center gap-1.5"><MapPin size={14} /> {evento.local}</span>
                          </div>
                        </div>

                        <button onClick={() => setMenuAberto(menuAberto === evento.id ? null : evento.id)} className="text-gray-500 hover:text-white p-1">
                          <MoreHorizontal size={20} />
                        </button>

                        {menuAberto === evento.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuAberto(null)}></div>
                            <div className="absolute right-0 top-8 w-52 bg-[#1a1a1a] border border-[#333] rounded-lg shadow-2xl z-20 py-1 overflow-hidden animate-in fade-in">
                              <button onClick={() => { setMenuAberto(null); setSlotsEditando([]); setModalEditarEvento(evento); }} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#222] flex items-center gap-2"><Edit size={14} /> Editar Evento & Vagas</button>
                              <div className="h-px bg-[#333] my-1"></div>
                              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Mudar Status</div>
                              <button onClick={() => handleMudarStatusEvento(evento.id, 'orcamento')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#222]">Orçamento</button>
                              <button onClick={() => handleMudarStatusEvento(evento.id, 'confirmado')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#222]">Confirmado</button>
                              <button onClick={() => handleMudarStatusEvento(evento.id, 'montagem')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#222]">Em Montagem</button>
                              <div className="h-px bg-[#333] my-1"></div>
                              <button onClick={() => { setMenuAberto(null); setModalDelete(evento.id); }} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"><Trash2 size={14} /> Excluir Evento</button>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#1a1a1a] flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-2">
                            <span className="text-gray-400 flex items-center gap-1.5"><Users size={14} /> Escala de Staff</span>
                            <span className={vagasPreenchidas === vagasTotais && vagasTotais > 0 ? "text-green-500 font-medium" : "text-yellow-500 font-medium"}>
                              {vagasPreenchidas} / {vagasTotais} Vagas
                            </span>
                          </div>
                          <div className="w-full bg-[#222] rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full transition-all duration-500 ${vagasPreenchidas === vagasTotais && vagasTotais > 0 ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ width: `${progresso}%` }}></div>
                          </div>
                        </div>
                        <div className="ml-6 pl-6 border-l border-[#222]">
                          <button onClick={() => setModalEscala(evento)} className="text-sm font-medium text-green-500 hover:text-green-400 flex items-center gap-1 py-2">
                            Gerenciar Escala <ChevronRight size={16} />
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
                  {mesAtual.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                </h3>
                <div className="flex gap-2">
                  <button onClick={irParaMesAnterior} className="p-1.5 bg-[#1a1a1a] rounded hover:bg-[#222] text-gray-400 transition-colors"><ChevronLeft size={18} /></button>
                  <button onClick={irParaProximoMes} className="p-1.5 bg-[#1a1a1a] rounded hover:bg-[#222] text-gray-400 transition-colors"><ChevronRight size={18} /></button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-px bg-[#222] border border-[#222] rounded-lg overflow-hidden">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                  <div key={d} className="bg-[#1a1a1a] py-2 text-center text-xs font-medium text-gray-500">{d}</div>
                ))}
                {espacosVazios.map(v => <div key={`vazio-${v}`} className="bg-[#121212] min-h-[100px]"></div>)}
                {diasArray.map(dia => {
                  const dataStr = `${mesAtual.getFullYear()}-${String(mesAtual.getMonth() + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                  const evs = eventos.filter(e => e.data === dataStr);
                  const hoje = new Date();
                  const isHoje = dia === hoje.getDate() && mesAtual.getMonth() === hoje.getMonth() && mesAtual.getFullYear() === hoje.getFullYear();
                  return (
                    <div key={dia} className={`bg-[#121212] min-h-[100px] p-2 border-t border-[#222] hover:bg-[#161616] ${isHoje ? 'ring-1 ring-inset ring-green-500/50' : ''}`}>
                      <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isHoje ? 'bg-green-500 text-white' : 'text-gray-400'}`}>{dia}</span>
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

        {/* Alertas */}
        <div className="space-y-6">
          <div className="bg-[#121212] border border-[#222] rounded-xl p-5 sticky top-6">
            <h3 className="text-base font-medium text-white mb-4 flex items-center gap-2">
              <Clock size={18} className="text-green-500" /> Alertas de Escala
            </h3>
            <div className="space-y-3">
              {alertas.length === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle2 size={32} className="mx-auto text-green-500/50 mb-2" />
                  <p className="text-sm text-gray-500">Tudo sob controle.</p>
                </div>
              ) : (
                alertas.map(alerta => (
                  <div key={alerta.id} className={`border rounded-lg p-3 ${alerta.tipo === 'falta' ? 'bg-yellow-500/5 border-yellow-500/10' : 'bg-red-500/5 border-red-500/10'}`}>
                    <p className={`text-sm font-medium mb-1 flex items-center gap-1.5 ${alerta.tipo === 'falta' ? 'text-yellow-500' : 'text-red-500'}`}>
                      <AlertTriangle size={14} /> {alerta.titulo}
                    </p>
                    <p className="text-xs text-gray-400">{alerta.desc}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ======================= MODAIS ======================= */}

      {/* Modal: Novo Evento */}
      {modalNovoEvento && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#222] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-[#222]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><CalendarIcon size={18} className="text-green-500" /> Criar Novo Evento</h3>
              <button onClick={() => setModalNovoEvento(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <form id="form-evento" onSubmit={handleSalvarEvento} className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-white mb-3 border-b border-[#222] pb-2">1. Dados do Job</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs text-gray-400 mb-1">Nome do Evento / Job *</label>
                      <input required type="text" value={novoEvento.titulo} onChange={e => setNovoEvento({ ...novoEvento, titulo: e.target.value })} className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-2.5 text-sm text-white focus:border-green-500 focus:outline-none" placeholder="Ex: Lançamento Produto X" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Data *</label>
                      <input required type="date" value={novoEvento.data} onChange={e => setNovoEvento({ ...novoEvento, data: e.target.value })} className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-2.5 text-sm text-white focus:border-green-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Horário de Início</label>
                      <input type="time" value={novoEvento.horario_inicio} onChange={e => setNovoEvento({ ...novoEvento, horario_inicio: e.target.value })} className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-2.5 text-sm text-white focus:border-green-500 focus:outline-none" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-gray-400 mb-1">Local *</label>
                      <input required type="text" value={novoEvento.local} onChange={e => setNovoEvento({ ...novoEvento, local: e.target.value })} className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-2.5 text-sm text-white focus:border-green-500 focus:outline-none" placeholder="Ex: Expo Center Norte" />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3 border-b border-[#222] pb-2">
                    <h4 className="text-sm font-medium text-white">2. Necessidade de Staff (Vagas)</h4>
                    <button type="button" onClick={() => setNecessidades([...necessidades, { id: Date.now().toString(), especialidade: ESPECIALIDADES[0], quantidade: 1, cacheBase: '' }])} className="text-xs text-green-500 hover:text-green-400 font-medium flex items-center gap-1">
                      <Plus size={14} /> Adicionar Função
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

      {/* Modal: Editar Evento (com vagas) */}
      {modalEditarEvento && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#222] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-[#222]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Edit size={18} className="text-green-500" /> Editar Evento</h3>
              <button onClick={() => { setModalEditarEvento(null); setSlotsEditando([]); }} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <form id="form-editar-evento" onSubmit={handleAtualizarEvento} className="space-y-6">
                {/* Dados principais */}
                <div>
                  <h4 className="text-sm font-medium text-white mb-3 border-b border-[#222] pb-2">Dados do Evento</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs text-gray-400 mb-1">Nome do Evento / Job *</label>
                      <input required type="text" value={modalEditarEvento.titulo} onChange={e => setModalEditarEvento({ ...modalEditarEvento, titulo: e.target.value })} className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-2.5 text-sm text-white focus:border-green-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Data *</label>
                      <input required type="date" value={modalEditarEvento.data} onChange={e => setModalEditarEvento({ ...modalEditarEvento, data: e.target.value })} className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-2.5 text-sm text-white focus:border-green-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Horário de Início</label>
                      <input type="time" value={modalEditarEvento.horario_inicio || ''} onChange={e => setModalEditarEvento({ ...modalEditarEvento, horario_inicio: e.target.value })} className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-2.5 text-sm text-white focus:border-green-500 focus:outline-none" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-gray-400 mb-1">Local *</label>
                      <input required type="text" value={modalEditarEvento.local} onChange={e => setModalEditarEvento({ ...modalEditarEvento, local: e.target.value })} className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-2.5 text-sm text-white focus:border-green-500 focus:outline-none" />
                    </div>
                  </div>
                </div>

                {/* Vagas existentes (read-only) */}
                {modalEditarEvento.slots && modalEditarEvento.slots.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-white mb-3 border-b border-[#222] pb-2">Vagas Atuais</h4>
                    <div className="space-y-2">
                      {modalEditarEvento.slots.map((slot: any) => (
                        <div key={slot.id} className="flex items-center justify-between bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-2.5">
                          <span className="text-sm text-gray-300">{slot.especialidade}</span>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{slot.quantidade} vaga(s)</span>
                            <span>R$ {slot.cache_base},00</span>
                            <span className={slot.designados.length >= slot.quantidade ? 'text-green-500' : 'text-yellow-500'}>
                              {slot.designados.length}/{slot.quantidade} escalados
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Adicionar novas vagas */}
                <div>
                  <div className="flex justify-between items-center mb-3 border-b border-[#222] pb-2">
                    <h4 className="text-sm font-medium text-white">Adicionar Novas Vagas</h4>
                    <button type="button" onClick={() => setSlotsEditando([...slotsEditando, { id: Date.now().toString(), especialidade: ESPECIALIDADES[0], quantidade: 1, cacheBase: '' }])} className="text-xs text-green-500 hover:text-green-400 font-medium flex items-center gap-1">
                      <Plus size={14} /> Adicionar Função
                    </button>
                  </div>
                  {slotsEditando.length === 0 ? (
                    <p className="text-xs text-gray-600 text-center py-2">Clique em "Adicionar Função" para incluir novas vagas a este evento.</p>
                  ) : (
                    <div className="space-y-3">
                      {slotsEditando.map((s, i) => (
                        <div key={s.id} className="flex items-end gap-3 bg-[#0a0a0a] p-3 rounded-lg border border-[#222]">
                          <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Especialidade</label>
                            <select value={s.especialidade} onChange={e => setSlotsEditando(slotsEditando.map(x => x.id === s.id ? { ...x, especialidade: e.target.value } : x))} className="w-full bg-[#121212] border border-[#333] rounded-md p-2 text-sm text-white focus:border-green-500 focus:outline-none cursor-pointer">
                              {ESPECIALIDADES.map(esp => <option key={esp} value={esp}>{esp}</option>)}
                            </select>
                          </div>
                          <div className="w-24">
                            <label className="block text-xs text-gray-500 mb-1">Qtd</label>
                            <input type="number" min="1" value={s.quantidade} onChange={e => setSlotsEditando(slotsEditando.map(x => x.id === s.id ? { ...x, quantidade: Number(e.target.value) } : x))} className="w-full bg-[#121212] border border-[#333] rounded-md p-2 text-sm text-white focus:border-green-500 focus:outline-none text-center" />
                          </div>
                          <div className="w-32">
                            <label className="block text-xs text-gray-500 mb-1">Cachê (R$)</label>
                            <input type="number" placeholder="Ex: 300" value={s.cacheBase} onChange={e => setSlotsEditando(slotsEditando.map(x => x.id === s.id ? { ...x, cacheBase: e.target.value } : x))} className="w-full bg-[#121212] border border-[#333] rounded-md p-2 text-sm text-white focus:border-green-500 focus:outline-none" />
                          </div>
                          <button type="button" onClick={() => setSlotsEditando(slotsEditando.filter(x => x.id !== s.id))} className="p-2 text-gray-500 hover:text-red-500 mb-0.5"><Trash2 size={18} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            </div>

            <div className="p-5 border-t border-[#222] flex justify-end gap-3 bg-[#121212]">
              <button onClick={() => { setModalEditarEvento(null); setSlotsEditando([]); }} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancelar</button>
              <button type="submit" form="form-editar-evento" className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg text-sm font-medium">Salvar Alterações</button>
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
                <div className="flex items-center gap-4 text-sm text-gray-400 flex-wrap">
                  <span className="flex items-center gap-1.5"><CalendarIcon size={14} /> {formatarDataInputParaBR(modalEscala.data)}</span>
                  {modalEscala.horario_inicio && <span className="flex items-center gap-1.5"><Clock size={14} /> {modalEscala.horario_inicio.substring(0, 5)}</span>}
                  <span className="flex items-center gap-1.5"><MapPin size={14} /> {modalEscala.local}</span>
                </div>
              </div>
              <button onClick={() => setModalEscala(null)} className="p-2 bg-[#222] hover:bg-[#333] rounded-full text-gray-400 hover:text-white"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-[#0a0a0a]">
              {modalEscala.slots.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <Users size={40} className="mx-auto mb-3 opacity-30" />
                  <p>Nenhuma vaga cadastrada para este evento.</p>
                  <p className="text-xs mt-1">Use "Editar Evento" para adicionar vagas.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {modalEscala.slots.map((slot: any) => (
                    <div key={slot.id} className="bg-[#121212] border border-[#222] rounded-xl overflow-hidden">
                      <div className="bg-[#1a1a1a] px-5 py-3 border-b border-[#222] flex justify-between items-center">
                        <div>
                          <h4 className="text-white font-medium">{slot.especialidade}</h4>
                          <p className="text-xs text-gray-500">Cachê Base: R$ {slot.cache_base},00</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-sm font-medium ${slot.designados.length >= slot.quantidade ? 'text-green-500' : 'text-yellow-500'}`}>
                            {slot.designados.length} / {slot.quantidade} Vagas
                          </span>
                          {slot.designados.length < slot.quantidade && (
                            <button
                              onClick={() => setModalSelecionarFreela({ eventoId: modalEscala.id, slotId: slot.id, especialidade: slot.especialidade, cacheBase: slot.cache_base })}
                              className="bg-green-600/20 text-green-500 hover:bg-green-600 hover:text-white border border-green-500/30 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5"
                            >
                              <UserPlus size={14} /> Escalar Profissional
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="p-5">
                        {slot.designados.length === 0 ? (
                          <div className="text-center py-6 border border-dashed border-[#333] rounded-lg bg-[#0a0a0a]">
                            <p className="text-sm text-gray-500">Nenhum profissional escalado ainda.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {slot.designados.map((freela: any) => {
                              const waLink = gerarLinkWhatsApp(freela, slot, modalEscala);
                              return (
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
                                  <div className="flex items-center gap-1">
                                    {waLink && (
                                      <a
                                        href={waLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Enviar convite pelo WhatsApp"
                                        className="p-1.5 text-gray-500 hover:text-green-400 hover:bg-green-500/10 rounded transition-colors"
                                      >
                                        <MessageCircle size={16} />
                                      </a>
                                    )}
                                    <button
                                      onClick={() => handleRemoverFreela(freela.escala_id)}
                                      className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                      title="Remover da escala"
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Selecionar Freela */}
      {modalSelecionarFreela && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#222] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-[#222] flex justify-between items-center">
              <div>
                <h3 className="text-white font-medium">Escalar: {modalSelecionarFreela.especialidade}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Cachê: R$ {modalSelecionarFreela.cacheBase},00</p>
              </div>
              <button onClick={() => { setModalSelecionarFreela(null); setBuscaFreela(""); }} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>

            <div className="p-4 border-b border-[#222] bg-[#0a0a0a]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  type="text"
                  placeholder="Buscar profissional disponível..."
                  value={buscaFreela}
                  onChange={e => setBuscaFreela(e.target.value)}
                  className="w-full bg-[#121212] border border-[#333] rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:border-green-500 focus:outline-none"
                  autoFocus
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-2">
              {(() => {
                const filtrados = freelancersDisponiveis.filter(f =>
                  f.especialidade === modalSelecionarFreela.especialidade &&
                  f.nome.toLowerCase().includes(buscaFreela.toLowerCase())
                );

                if (filtrados.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-500">Nenhum profissional disponível.</p>
                      <p className="text-xs text-gray-600 mt-1">Especialidade: {modalSelecionarFreela.especialidade}</p>
                    </div>
                  );
                }

                return filtrados.map(freela => (
                  <div key={freela.id} className="flex items-center justify-between p-3 hover:bg-[#1a1a1a] rounded-lg transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-200">{freela.nome}</p>
                      <p className="text-xs text-gray-500">{freela.telefone} · {freela.avaliacao}⭐</p>
                    </div>
                    <button
                      onClick={() => handleAtribuirFreela(freela)}
                      className="bg-[#222] text-white hover:bg-green-600 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                    >
                      Escalar
                    </button>
                  </div>
                ));
              })()}
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
            <p className="text-sm text-gray-400 mb-6">Esta ação remove o evento, todas as vagas e escalas associadas.</p>
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