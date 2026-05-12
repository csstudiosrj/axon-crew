"use client";

import React, { useState, useEffect } from "react";
import {
  ClipboardList, Plus, Send, X, Check, Copy, Info,
  Users, MessageCircle, AlertTriangle, ChevronDown, ChevronUp
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth-context";

interface FreelancerEscalado {
  freelancerId: string;
  nome: string;
  especialidade: string;
  telefone: string;
  confirmado: boolean;
  confirmadoEm?: string | null;
}

interface Slot {
  id: string;
  especialidade: string;
  quantidade: number;
  cache_base: number;
  freelancers: FreelancerEscalado[];
}

interface Evento {
  id: string;
  titulo: string;
  data: string;
  horario_inicio?: string;
  local: string;
  status: string;
  slots: Slot[];
}

interface CallSheet {
  id: string;
  evento_id: string;
  publicado: boolean;
  publicado_em?: string | null;
}

export default function CallSheetsPage() {
  const { companyId } = useAuth();

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [callSheets, setCallSheets] = useState<CallSheet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [eventoSelecionado, setEventoSelecionado] = useState<Evento | null>(null);
  const [freelancers, setFreelancers] = useState<FreelancerEscalado[]>([]);
  const [callSheetId, setCallSheetId] = useState<string | null>(null);
  const [publicado, setPublicado] = useState(false);
  const [modalDisparar, setModalDisparar] = useState(false);
  const [eventoAberto, setEventoAberto] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; tipo: "sucesso" | "erro" } | null>(null);

  const totalConfirmados = freelancers.filter(f => f.confirmado).length;
  const totalPendentes   = freelancers.filter(f => !f.confirmado).length;

  useEffect(() => { if (companyId) carregarDados(); }, [companyId]);

  const carregarDados = async () => {
    setIsLoading(true);
    try {
      const [resEv, resSlots, resEscalas, resFreelas, resCS] = await Promise.all([
        supabase.from("eventos").select("*").eq("company_id", companyId!).order("data", { ascending: true }),
        supabase.from("evento_slots").select("*"),
        supabase.from("evento_escalas").select("*"),
        supabase.from("freelancers").select("*").eq("company_id", companyId!),
        supabase.from("call_sheets").select("*").eq("company_id", companyId!),
      ]);

      if (resCS.data) setCallSheets(resCS.data);

      if (resEv.data) {
        const eventosMontados: Evento[] = resEv.data.map(ev => {
          const slotsDoEvento = (resSlots.data || [])
            .filter(s => s.evento_id === ev.id)
            .map(slot => {
              const escalasDoSlot = (resEscalas.data || []).filter(esc => esc.slot_id === slot.id);
              const freelas: FreelancerEscalado[] = escalasDoSlot.map(esc => {
                const f = (resFreelas.data || []).find(fr => fr.id === esc.freelancer_id);
                if (!f) return null;
                return {
                  freelancerId: f.id,
                  nome:         f.nome,
                  especialidade: f.especialidade,
                  telefone:     f.telefone,
                  confirmado:   esc.confirmado ?? false,
                  confirmadoEm: esc.confirmado_em ?? null,
                };
              }).filter(Boolean) as FreelancerEscalado[];
              return { ...slot, freelancers: freelas };
            });
          return { ...ev, slots: slotsDoEvento };
        });
        setEventos(eventosMontados);
      }
    } catch {
      mostrarToast("Erro ao carregar dados", "erro");
    }
    setIsLoading(false);
  };

  const mostrarToast = (msg: string, tipo: "sucesso" | "erro") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3500);
  };

  const getBaseUrl = () => typeof window !== "undefined" ? window.location.origin : "";

  const selecionarEvento = (evento: Evento) => {
    setEventoSelecionado(evento);
    const todasFreelas = evento.slots.flatMap(s => s.freelancers);
    setFreelancers(todasFreelas);
    const cs = callSheets.find(c => c.evento_id === evento.id);
    setCallSheetId(cs?.id ?? null);
    setPublicado(cs?.publicado ?? false);
  };

  const handleCriarOuPublicar = async () => {
    if (!eventoSelecionado) return;

    if (!callSheetId) {
      const { data, error } = await supabase.from("call_sheets").insert([{
        company_id: companyId!,
        evento_id:  eventoSelecionado.id,
        publicado:  true,
        publicado_em: new Date().toISOString(),
      }]).select();

      if (error) { mostrarToast("Erro ao criar call sheet", "erro"); return; }
      if (data) {
        setCallSheetId(data[0].id);
        setPublicado(true);
        setCallSheets([...callSheets, data[0]]);
        mostrarToast("Call Sheet publicado!", "sucesso");
      }
    } else {
      const novoEstado = !publicado;
      const { error } = await supabase.from("call_sheets")
        .update({ publicado: novoEstado, publicado_em: novoEstado ? new Date().toISOString() : null })
        .eq("id", callSheetId);
      if (!error) {
        setPublicado(novoEstado);
        mostrarToast(novoEstado ? "Call Sheet publicado!" : "Call Sheet despublicado", "sucesso");
      }
    }
  };

  const abrirWhatsapp = (freela: FreelancerEscalado) => {
    if (!eventoSelecionado || !callSheetId) return;
    const tel = freela.telefone?.replace(/\D/g, "");
    if (!tel) return;
    const link = `${getBaseUrl()}/roteiro/${callSheetId}`;
    const msg  = encodeURIComponent(
      `OlÃ¡ ${freela.nome.split(" ")[0]}!\n\n` +
      `Segue o roteiro do evento *${eventoSelecionado.titulo}*.\n\n` +
      `Acesse o link abaixo para confirmar sua presenÃ§a:\n${link}\n\n` +
      `ARXUM Crew`
    );
    window.open(`https://wa.me/55${tel}?text=${msg}`, "_blank");
  };

  const formatarData = (dataIso: string) => {
    if (!dataIso) return "";
    const [ano, mes, dia] = dataIso.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full relative">

      {toast && (
        <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl transition-all ${toast.tipo === "sucesso" ? "bg-green-900/90 border border-green-500 text-green-100" : "bg-red-900/90 border border-red-500 text-red-100"}`}>
          {toast.tipo === "sucesso" ? <Check size={20} className="text-green-400" /> : <AlertTriangle size={20} className="text-red-400" />}
          <p className="text-sm font-medium">{toast.msg}</p>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Call Sheets</h2>
          <p className="text-sm text-gray-400 mt-1">Gerencie e dispare roteiros para sua equipe.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LISTA DE EVENTOS */}
        <div>
          <h3 className="text-base font-medium text-white mb-4">Selecione um Evento</h3>
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Carregando eventos...</div>
          ) : eventos.length === 0 ? (
            <div className="bg-[#121212] border border-[#222] border-dashed rounded-xl p-12 text-center">
              <ClipboardList size={48} className="mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400">Nenhum evento com equipe escalada.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {eventos.map(evento => {
                const cs = callSheets.find(c => c.evento_id === evento.id);
                const totalEscalados = evento.slots.reduce((acc, s) => acc + s.freelancers.length, 0);
                const isSelected = eventoSelecionado?.id === evento.id;

                return (
                  <div key={evento.id}
                    onClick={() => selecionarEvento(evento)}
                    className={`bg-[#121212] border rounded-xl p-4 cursor-pointer transition-colors ${isSelected ? "border-green-500/40 bg-green-500/5" : "border-[#222] hover:border-[#333]"}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-semibold text-white">{evento.titulo}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{formatarData(evento.data)} Â· {evento.local}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {cs?.publicado ? (
                          <span className="text-[10px] font-medium text-green-500 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">Publicado</span>
                        ) : (
                          <span className="text-[10px] font-medium text-gray-500 bg-[#1a1a1a] border border-[#333] px-2 py-0.5 rounded-full">Rascunho</span>
                        )}
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Users size={12} /> {totalEscalados}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* PAINEL DO CALL SHEET */}
        <div>
          {!eventoSelecionado ? (
            <div className="bg-[#121212] border border-[#222] border-dashed rounded-xl p-12 text-center h-full flex flex-col items-center justify-center">
              <ClipboardList size={48} className="text-gray-600 mb-4" />
              <p className="text-gray-400 text-sm">Selecione um evento ao lado para gerenciar o call sheet.</p>
            </div>
          ) : (
            <div className="bg-[#121212] border border-[#222] rounded-xl overflow-hidden">

              {/* Header */}
              <div className="p-5 border-b border-[#1a1a1a] bg-[#161616]">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-bold text-white">{eventoSelecionado.titulo}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{formatarData(eventoSelecionado.data)} Â· {eventoSelecionado.local}</p>
                  </div>
                  <div className="flex gap-2">
                    {publicado && freelancers.length > 0 && (
                      <button onClick={() => setModalDisparar(true)}
                        className="bg-[#25D366] hover:bg-[#20bd5a] text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all duration-200 active:scale-95">
                        <Send size={13} /> Disparar
                      </button>
                    )}
                    <button onClick={handleCriarOuPublicar}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all duration-200 active:scale-95 ${publicado ? "bg-[#222] hover:bg-[#333] text-gray-300 border border-[#333]" : "bg-green-600 hover:bg-green-500 text-white"}`}>
                      {publicado ? <><X size={13} /> Despublicar</> : <><Plus size={13} /> Publicar</>}
                    </button>
                  </div>
                </div>
              </div>

              {/* Slots e freelancers */}
              <div className="p-5 space-y-4 max-h-[50vh] overflow-y-auto">
                {eventoSelecionado.slots.length === 0 ? (
                  <div className="text-center py-8">
                    <Users size={28} className="text-gray-700 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Nenhum freelancer escalado.</p>
                  </div>
                ) : (
                  eventoSelecionado.slots.map(slot => (
                    <div key={slot.id}>
                      <button onClick={() => setEventoAberto(eventoAberto === slot.id ? null : slot.id)}
                        className="w-full flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 hover:text-gray-300 transition-colors">
                        <span>{slot.especialidade} ({slot.freelancers.length}/{slot.quantidade})</span>
                        {eventoAberto === slot.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      {(eventoAberto === slot.id || eventoAberto === null) && (
                        <div className="space-y-2">
                          {slot.freelancers.length === 0 ? (
                            <p className="text-xs text-gray-600 pl-2">Nenhum profissional escalado nesta funÃ§Ã£o.</p>
                          ) : (
                            slot.freelancers.map((f) => (
                              <div key={f.freelancerId}
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${f.confirmado ? "bg-green-500/5 border-green-500/15" : "bg-[#0a0a0a] border-[#2a2a2a]"}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${f.confirmado ? "bg-green-500/20 text-green-400" : "bg-[#1a1a1a] text-gray-600"}`}>
                                  {f.confirmado ? <Check size={14} /> : f.nome.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium truncate ${f.confirmado ? "text-white" : "text-gray-300"}`}>{f.nome}</p>
                                  <p className="text-xs text-gray-600 truncate">{f.especialidade}</p>
                                  {f.confirmado && f.confirmadoEm && (
                                    <p className="text-[10px] text-green-600 mt-0.5">
                                      Ciente Ã s {new Date(f.confirmadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {f.confirmado ? (
                                    <span className="text-[10px] font-medium text-green-500 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">Ciente</span>
                                  ) : (
                                    <span className="text-[10px] font-medium text-gray-600 bg-[#1a1a1a] border border-[#2a2a2a] px-2 py-0.5 rounded-full">Aguardando</span>
                                  )}
                                  {publicado && f.telefone && (
                                    <button onClick={() => abrirWhatsapp(f)} title="Enviar roteiro individual"
                                      className="text-gray-600 hover:text-[#25D366] transition-colors p-1">
                                      <MessageCircle size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Resumo */}
              {freelancers.length > 0 && (
                <div className="px-5 pb-4 grid grid-cols-2 gap-3">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-400">{totalConfirmados}</p>
                    <p className="text-xs text-green-600 mt-0.5">Confirmados</p>
                  </div>
                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-gray-400">{totalPendentes}</p>
                    <p className="text-xs text-gray-600 mt-0.5">Aguardando</p>
                  </div>
                </div>
              )}

              {/* Link pÃºblico */}
              {callSheetId && publicado && (
                <div className="px-5 pb-5">
                  <p className="text-xs text-gray-600 mb-1.5">Link pÃºblico do roteiro:</p>
                  <div className="flex items-center gap-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-500 flex-1 truncate font-mono">{getBaseUrl()}/roteiro/{callSheetId}</p>
                    <button onClick={() => { navigator.clipboard.writeText(`${getBaseUrl()}/roteiro/${callSheetId}`); mostrarToast("Link copiado!", "sucesso"); }}
                      className="text-gray-600 hover:text-green-400 transition-colors shrink-0">
                      <Copy size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: DISPARAR EM MASSA */}
      {modalDisparar && eventoSelecionado && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0d0d] border border-[#222] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-[#1a1a1a] bg-[#25D366]/10">
              <div>
                <h3 className="text-base font-bold text-[#25D366] flex items-center gap-2">
                  <Send size={16} /> Disparar Roteiro em Massa
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">{eventoSelecionado.titulo}</p>
              </div>
              <button onClick={() => setModalDisparar(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            <div className="px-5 pt-4 pb-2">
              <div className="flex items-start gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-xs text-gray-400">
                <Info size={13} className="mt-0.5 shrink-0 text-gray-500" />
                Clique em <strong className="text-white mx-1">Enviar</strong> ao lado de cada freelancer para abrir o WhatsApp com a mensagem pronta.
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
              {freelancers.map((f) => (
                <div key={f.freelancerId}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${f.confirmado ? "bg-green-500/5 border-green-500/15" : "bg-[#0a0a0a] border-[#2a2a2a]"}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${f.confirmado ? "bg-green-500/20 text-green-400" : "bg-[#1a1a1a] text-gray-500"}`}>
                    {f.confirmado ? <Check size={13} /> : f.nome.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{f.nome}</p>
                    <p className="text-xs text-gray-600">{f.especialidade}</p>
                  </div>
                  {f.confirmado && (
                    <span className="text-[10px] text-green-500 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full shrink-0">Ciente</span>
                  )}
                  {f.telefone ? (
                    <button onClick={() => abrirWhatsapp(f)}
                      className="shrink-0 bg-[#25D366] hover:bg-[#20bd5a] text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all duration-200 active:scale-95">
                      <MessageCircle size={13} /> Enviar
                    </button>
                  ) : (
                    <span className="text-xs text-red-400 shrink-0 flex items-center gap-1">
                      <AlertTriangle size={11} /> Sem tel.
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="p-5 border-t border-[#1a1a1a] flex items-center justify-between">
              <p className="text-xs text-gray-600">
                {freelancers.filter((f) => f.telefone).length} de {freelancers.length} com WhatsApp cadastrado
              </p>
              <button onClick={() => setModalDisparar(false)}
                className="bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-gray-300 px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}