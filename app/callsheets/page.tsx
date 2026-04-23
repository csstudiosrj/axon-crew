"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ClipboardList, Send, CheckCircle2, Clock, AlertTriangle,
  ChevronRight, Users, Calendar, MapPin, User, Phone,
  Shirt, FileText, X, Copy, ExternalLink, RefreshCw,
  Loader2, Radio, Check, MessageCircle, Info
} from "lucide-react";
import { supabase } from "../../lib/supabase";

// ============================================================
// HELPERS
// ============================================================
const formatDataBR = (iso?: string | null): string => {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("T")[0].split("-");
  return `${dia}/${mes}/${ano}`;
};

const formatTel = (t: string) => {
  const v = t.replace(/\D/g, "").slice(0, 11);
  if (v.length > 6) return v.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
  if (v.length > 2) return v.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
  return v;
};

const getBaseUrl = () =>
  typeof window !== "undefined" ? window.location.origin : "https://axoncrew.app";

// ============================================================
// TIPOS
// ============================================================
interface EventoComEscala {
  id: string;
  titulo: string;
  data: string;
  horario_inicio: string | null;
  local: string | null;
  totalEscalados: number;
  callSheetId: string | null;
  publicado: boolean;
}

interface CallSheetForm {
  call_time: string;
  end_time: string;
  dress_code: string;
  produtor_nome: string;
  produtor_telefone: string;
  observacoes: string;
}

const FORM_VAZIO: CallSheetForm = {
  call_time: "",
  end_time: "",
  dress_code: "",
  produtor_nome: "",
  produtor_telefone: "",
  observacoes: "",
};

interface FreelancerEscalado {
  escalaId: string;
  freelancerId: string;
  nome: string;
  telefone: string;
  especialidade: string;
  confirmado: boolean;
  confirmadoEm: string | null;
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function CallSheetsPage() {
  // ── estado global ──────────────────────────────────────────
  const [eventos, setEventos] = useState<EventoComEscala[]>([]);
  const [loadingEventos, setLoadingEventos] = useState(true);
  const [eventoSelecionado, setEventoSelecionado] = useState<EventoComEscala | null>(null);

  // ── call sheet do evento selecionado ──────────────────────
  const [callSheetId, setCallSheetId] = useState<string | null>(null);
  const [form, setForm] = useState<CallSheetForm>(FORM_VAZIO);
  const [formDirty, setFormDirty] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [publicado, setPublicado] = useState(false);

  // ── freelancers e confirmações ─────────────────────────────
  const [freelancers, setFreelancers] = useState<FreelancerEscalado[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ── modais ─────────────────────────────────────────────────
  const [modalDisparar, setModalDisparar] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tipo: "sucesso" | "erro" | "info" } | null>(null);

  // ── vista mobile ───────────────────────────────────────────
  const [vistaDetalhe, setVistaDetalhe] = useState(false);

  // ============================================================
  // CARREGAR LISTA DE EVENTOS
  // ============================================================
  const carregarEventos = useCallback(async () => {
    setLoadingEventos(true);

    // Busca eventos que têm ao menos uma escala
    const { data: escalasData, error } = await supabase
      .from("evento_escalas")
      .select("evento_id, freelancers(id)");

    if (error) { mostrarToast("Erro ao carregar eventos", "erro"); setLoadingEventos(false); return; }

    // Agrupa contagem por evento_id
    const contagemMap: Record<string, number> = {};
    (escalasData ?? []).forEach((e: any) => {
      contagemMap[e.evento_id] = (contagemMap[e.evento_id] ?? 0) + 1;
    });

    const eventosComEscala = Object.keys(contagemMap);
    if (eventosComEscala.length === 0) { setEventos([]); setLoadingEventos(false); return; }

    // Busca detalhes dos eventos
    const { data: evData } = await supabase
      .from("eventos")
      .select("id, titulo, data, horario_inicio, local")
      .in("id", eventosComEscala)
      .order("data", { ascending: true });

    // Busca call_sheets existentes
    const { data: csData } = await supabase
      .from("call_sheets")
      .select("id, evento_id, publicado")
      .in("evento_id", eventosComEscala);

    const csMap: Record<string, { id: string; publicado: boolean }> = {};
    (csData ?? []).forEach((cs: any) => { csMap[cs.evento_id] = { id: cs.id, publicado: cs.publicado }; });

    const lista: EventoComEscala[] = (evData ?? []).map((ev: any) => ({
      id: ev.id,
      titulo: ev.titulo,
      data: ev.data,
      horario_inicio: ev.horario_inicio,
      local: ev.local,
      totalEscalados: contagemMap[ev.id] ?? 0,
      callSheetId: csMap[ev.id]?.id ?? null,
      publicado: csMap[ev.id]?.publicado ?? false,
    }));

    setEventos(lista);
    setLoadingEventos(false);
  }, []);

  useEffect(() => { carregarEventos(); }, [carregarEventos]);

  // ============================================================
  // SELECIONAR EVENTO → carregar call sheet + freelancers
  // ============================================================
  const selecionarEvento = async (ev: EventoComEscala) => {
    setEventoSelecionado(ev);
    setVistaDetalhe(true);
    setLoadingDetail(true);
    setForm(FORM_VAZIO);
    setCallSheetId(null);
    setPublicado(false);
    setFreelancers([]);
    setFormDirty(false);

    // 1) Busca call_sheet do evento
    const { data: csData } = await supabase
      .from("call_sheets")
      .select("*")
      .eq("evento_id", ev.id)
      .maybeSingle();

    let csId: string | null = null;
    if (csData) {
      csId = csData.id;
      setCallSheetId(csId);
      setPublicado(csData.publicado ?? false);
      setForm({
        call_time:         csData.call_time        ?? "",
        end_time:          csData.end_time          ?? "",
        dress_code:        csData.dress_code        ?? "",
        produtor_nome:     csData.produtor_nome     ?? "",
        produtor_telefone: csData.produtor_telefone ?? "",
        observacoes:       csData.observacoes       ?? "",
      });
    }

    // 2) Busca freelancers escalados
    const { data: escalas } = await supabase
      .from("evento_escalas")
      .select(`
        id,
        freelancers ( id, nome, telefone, especialidade )
      `)
      .eq("evento_id", ev.id);

    // 3) Busca confirmações se já existe call_sheet
    let confirmacoesMap: Record<string, string> = {};
    if (csId) {
      const { data: confs } = await supabase
        .from("call_sheet_confirmacoes")
        .select("freelancer_id, confirmado_em")
        .eq("call_sheet_id", csId);
      (confs ?? []).forEach((c: any) => {
        confirmacoesMap[c.freelancer_id] = c.confirmado_em;
      });
    }

    const lista: FreelancerEscalado[] = (escalas ?? []).map((e: any) => {
      const f = Array.isArray(e.freelancers) ? e.freelancers[0] : e.freelancers;
      return {
        escalaId:    e.id,
        freelancerId: f?.id ?? "",
        nome:         f?.nome ?? "—",
        telefone:     f?.telefone ?? "",
        especialidade: f?.especialidade ?? "",
        confirmado:   !!confirmacoesMap[f?.id],
        confirmadoEm: confirmacoesMap[f?.id] ?? null,
      };
    });

    setFreelancers(lista);
    setLoadingDetail(false);
  };

  // ============================================================
  // ATUALIZAR CONFIRMAÇÕES (polling leve)
  // ============================================================
  const recarregarConfirmacoes = async () => {
    if (!callSheetId) return;
    const { data } = await supabase
      .from("call_sheet_confirmacoes")
      .select("freelancer_id, confirmado_em")
      .eq("call_sheet_id", callSheetId);

    const map: Record<string, string> = {};
    (data ?? []).forEach((c: any) => { map[c.freelancer_id] = c.confirmado_em; });
    setFreelancers((prev) =>
      prev.map((f) => ({ ...f, confirmado: !!map[f.freelancerId], confirmadoEm: map[f.freelancerId] ?? null }))
    );
    mostrarToast("Status atualizado", "info");
  };

  // ============================================================
  // SALVAR / PUBLICAR CALL SHEET
  // ============================================================
  const salvarCallSheet = async (publicarAgora = false) => {
    if (!eventoSelecionado) return;
    setSalvando(true);

    const payload = {
      evento_id:         eventoSelecionado.id,
      call_time:         form.call_time,
      end_time:          form.end_time,
      dress_code:        form.dress_code,
      produtor_nome:     form.produtor_nome,
      produtor_telefone: form.produtor_telefone.replace(/\D/g, ""),
      observacoes:       form.observacoes,
      publicado:         publicarAgora ? true : publicado,
      updated_at:        new Date().toISOString(),
    };

    let id = callSheetId;

    if (id) {
      const { error } = await supabase.from("call_sheets").update(payload).eq("id", id);
      if (error) { mostrarToast("Erro ao salvar", "erro"); setSalvando(false); return; }
    } else {
      const { data, error } = await supabase.from("call_sheets").insert([payload]).select().single();
      if (error) { mostrarToast("Erro ao criar call sheet", "erro"); setSalvando(false); return; }
      id = data.id;
      setCallSheetId(id);
    }

    if (publicarAgora) setPublicado(true);
    setFormDirty(false);

    // Atualiza a lista lateral
    setEventos((prev) =>
      prev.map((ev) =>
        ev.id === eventoSelecionado.id
          ? { ...ev, callSheetId: id, publicado: publicarAgora ? true : publicado }
          : ev
      )
    );

    mostrarToast(publicarAgora ? "Roteiro publicado!" : "Rascunho salvo!", "sucesso");
    setSalvando(false);
  };

  // ============================================================
  // GERAR MENSAGEM WHATSAPP POR FREELANCER
  // ============================================================
  const gerarMensagem = (freela: FreelancerEscalado): string => {
    const ev = eventoSelecionado!;
    const linkConfirmacao = `${getBaseUrl()}/confirmar/${callSheetId}?f=${freela.freelancerId}`;
    const primeiroNome = freela.nome.split(" ")[0];

    return (
      `📋 *CALL SHEET — ${ev.titulo.toUpperCase()}*\n\n` +
      `Olá ${primeiroNome}! Segue o roteiro para o seu job:\n\n` +
      `📅 *Data:* ${formatDataBR(ev.data)}\n` +
      (form.call_time  ? `⏰ *Call Time (chegada):* ${form.call_time}\n` : "") +
      (form.end_time   ? `🏁 *Término previsto:* ${form.end_time}\n`    : "") +
      (ev.local        ? `📍 *Local:* ${ev.local}\n`                     : "") +
      (form.dress_code ? `👔 *Dress Code:* ${form.dress_code}\n`         : "") +
      (form.produtor_nome
        ? `\n👤 *Produtor(a) no local:*\n${form.produtor_nome}` +
          (form.produtor_telefone ? ` · ${formatTel(form.produtor_telefone)}` : "") + "\n"
        : "") +
      (form.observacoes ? `\n📝 *Observações:*\n${form.observacoes}\n` : "") +
      `\n✅ *Confirme sua presença clicando no link abaixo:*\n${linkConfirmacao}`
    );
  };

  const abrirWhatsapp = (freela: FreelancerEscalado) => {
    const msg = gerarMensagem(freela);
    const url = `https://wa.me/55${freela.telefone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  // ============================================================
  // HELPERS UI
  // ============================================================
  const mostrarToast = (msg: string, tipo: "sucesso" | "erro" | "info") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3500);
  };

  const setField = (field: keyof CallSheetForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormDirty(true);
  };

  const totalConfirmados = freelancers.filter((f) => f.confirmado).length;
  const totalPendentes   = freelancers.length - totalConfirmados;
  const podeSalvar = eventoSelecionado !== null;

  // Percentual de confirmação
  const pct = freelancers.length > 0 ? Math.round((totalConfirmados / freelancers.length) * 100) : 0;

  // ============================================================
  // STATUS BADGE DO EVENTO (lista lateral)
  // ============================================================
  const EventoStatusBadge = ({ ev }: { ev: EventoComEscala }) => {
    if (ev.publicado) return (
      <span className="text-[10px] font-medium bg-green-500/15 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
        <Radio size={8} className="fill-green-400" /> Publicado
      </span>
    );
    if (ev.callSheetId) return (
      <span className="text-[10px] font-medium bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full">
        Rascunho
      </span>
    );
    return (
      <span className="text-[10px] font-medium bg-gray-700/50 text-gray-500 border border-gray-700 px-2 py-0.5 rounded-full">
        Sem roteiro
      </span>
    );
  };

  // ============================================================
  // JSX
  // ============================================================
  return (
    <div className="flex h-[calc(100vh-64px)] max-h-screen overflow-hidden bg-[#0a0a0a]">

      {/* TOAST */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl transition-all text-sm font-medium ${
          toast.tipo === "sucesso" ? "bg-green-900/90 border border-green-500 text-green-100"
          : toast.tipo === "erro"  ? "bg-red-900/90 border border-red-500 text-red-100"
          : "bg-[#1a1a1a] border border-[#333] text-gray-300"
        }`}>
          {toast.tipo === "sucesso" ? <CheckCircle2 size={16} className="text-green-400" />
           : toast.tipo === "erro"  ? <AlertTriangle size={16} className="text-red-400" />
           : <Info size={16} className="text-gray-400" />}
          {toast.msg}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          PAINEL ESQUERDO — lista de eventos
      ══════════════════════════════════════════════════════ */}
      <aside className={`
        w-full md:w-80 lg:w-96 shrink-0 border-r border-[#1a1a1a]
        flex flex-col bg-[#0d0d0d]
        ${vistaDetalhe ? "hidden md:flex" : "flex"}
      `}>
        {/* Header */}
        <div className="px-5 py-5 border-b border-[#1a1a1a]">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList size={18} className="text-green-500" />
            <h2 className="text-base font-bold text-white">Call Sheets</h2>
          </div>
          <p className="text-xs text-gray-500">Eventos com equipe escalada</p>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {loadingEventos ? (
            <div className="flex items-center justify-center py-16 gap-2 text-gray-600 text-sm">
              <Loader2 size={16} className="animate-spin" /> Carregando...
            </div>
          ) : eventos.length === 0 ? (
            <div className="p-6 text-center">
              <Users size={32} className="text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Nenhum evento com freelancers escalados.</p>
              <p className="text-xs text-gray-600 mt-1">Acesse a Agenda para escalar a equipe.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1a1a1a]">
              {eventos.map((ev) => {
                const ativo = eventoSelecionado?.id === ev.id;
                return (
                  <button
                    key={ev.id}
                    onClick={() => selecionarEvento(ev)}
                    className={`w-full text-left px-5 py-4 transition-colors hover:bg-[#141414] ${ativo ? "bg-[#141414] border-l-2 border-green-500" : "border-l-2 border-transparent"}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className={`text-sm font-semibold leading-tight ${ativo ? "text-white" : "text-gray-300"}`}>{ev.titulo}</p>
                      <ChevronRight size={14} className={`shrink-0 mt-0.5 ${ativo ? "text-green-500" : "text-gray-600"}`} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-2.5">
                      <span className="flex items-center gap-1"><Calendar size={11} /> {formatDataBR(ev.data)}</span>
                      <span className="flex items-center gap-1"><Users size={11} /> {ev.totalEscalados} freela{ev.totalEscalados !== 1 ? "s" : ""}</span>
                    </div>
                    <EventoStatusBadge ev={ev} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════
          PAINEL DIREITO — editor + confirmações
      ══════════════════════════════════════════════════════ */}
      <main className={`
        flex-1 flex flex-col overflow-hidden
        ${!vistaDetalhe ? "hidden md:flex" : "flex"}
      `}>

        {/* Sem evento selecionado */}
        {!eventoSelecionado && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 rounded-2xl bg-[#141414] border border-[#222] flex items-center justify-center mb-5">
              <ClipboardList size={36} className="text-gray-700" />
            </div>
            <p className="text-white font-semibold text-lg mb-1">Selecione um evento</p>
            <p className="text-sm text-gray-500 max-w-xs">Escolha um evento na lista ao lado para criar ou editar o Call Sheet da equipe.</p>
          </div>
        )}

        {/* Evento selecionado */}
        {eventoSelecionado && (
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* ─── Header do evento ─── */}
            <div className="px-6 py-4 border-b border-[#1a1a1a] bg-[#0d0d0d] flex items-center gap-4">
              {/* Botão voltar (mobile) */}
              <button
                onClick={() => setVistaDetalhe(false)}
                className="md:hidden text-gray-500 hover:text-white"
              >
                <ChevronRight size={18} className="rotate-180" />
              </button>

              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white truncate">{eventoSelecionado.titulo}</h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-0.5">
                  <span className="flex items-center gap-1"><Calendar size={11} /> {formatDataBR(eventoSelecionado.data)}</span>
                  {eventoSelecionado.horario_inicio && <span className="flex items-center gap-1"><Clock size={11} /> {eventoSelecionado.horario_inicio}</span>}
                  {eventoSelecionado.local && <span className="flex items-center gap-1"><MapPin size={11} /> {eventoSelecionado.local}</span>}
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-2 shrink-0">
                {formDirty && (
                  <button
                    onClick={() => salvarCallSheet(false)}
                    disabled={salvando}
                    className="text-xs px-3 py-1.5 rounded-lg border border-[#333] text-gray-400 hover:text-white hover:bg-[#1a1a1a] transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {salvando ? <Loader2 size={13} className="animate-spin" /> : null}
                    Salvar rascunho
                  </button>
                )}

                {callSheetId && !publicado && (
                  <button
                    onClick={() => salvarCallSheet(true)}
                    disabled={salvando}
                    className="text-xs px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Radio size={13} /> Publicar Roteiro
                  </button>
                )}

                {publicado && (
                  <button
                    onClick={() => setModalDisparar(true)}
                    className="text-xs px-3 py-2 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white font-medium transition-colors flex items-center gap-2"
                  >
                    <Send size={13} /> Disparar Roteiro
                    <span className="bg-white/20 text-white px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                      {freelancers.length}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* ─── Corpo em duas colunas ─── */}
            <div className="flex-1 overflow-y-auto">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-16 gap-2 text-gray-600 text-sm">
                  <Loader2 size={16} className="animate-spin" /> Carregando...
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-[#1a1a1a]">

                  {/* ════ COL 1: Formulário Logístico ════ */}
                  <div className="p-6 space-y-5">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText size={15} className="text-green-500" />
                      <h4 className="text-sm font-semibold text-white">Instruções Operacionais</h4>
                      {!callSheetId && (
                        <span className="text-[10px] text-gray-600 ml-auto">Preencha e salve para publicar</span>
                      )}
                    </div>

                    {/* Horários */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                          <Clock size={11} /> Call Time (chegada) *
                        </label>
                        <input
                          type="time" value={form.call_time}
                          onChange={(e) => setField("call_time", e.target.value)}
                          className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                          <Clock size={11} /> Término Previsto
                        </label>
                        <input
                          type="time" value={form.end_time}
                          onChange={(e) => setField("end_time", e.target.value)}
                          className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Dress Code */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                        <Shirt size={11} /> Dress Code / Traje *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Preto básico, Social, Uniforme da empresa"
                        value={form.dress_code}
                        onChange={(e) => setField("dress_code", e.target.value)}
                        className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-2.5 text-sm text-white focus:border-green-500 focus:outline-none placeholder-gray-700"
                      />
                    </div>

                    {/* Produtor Responsável */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                        <User size={11} /> Produtor(a) Responsável no Local
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text" placeholder="Nome completo"
                          value={form.produtor_nome}
                          onChange={(e) => setField("produtor_nome", e.target.value)}
                          className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-2.5 text-sm text-white focus:border-green-500 focus:outline-none placeholder-gray-700"
                        />
                        <input
                          type="text" placeholder="(11) 99999-9999"
                          value={form.produtor_telefone}
                          onChange={(e) => setField("produtor_telefone", formatTel(e.target.value))}
                          maxLength={15}
                          className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-2.5 text-sm text-white focus:border-green-500 focus:outline-none placeholder-gray-700"
                        />
                      </div>
                    </div>

                    {/* Observações */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                        <FileText size={11} /> Observações Gerais
                      </label>
                      <textarea
                        rows={5}
                        placeholder={"Ex: Levar EPI\nAlimentação fornecida no local\nEntrada pela doca 3 (fundo do prédio)\nEstacionamento liberado para staff"}
                        value={form.observacoes}
                        onChange={(e) => setField("observacoes", e.target.value)}
                        className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-2.5 text-sm text-white focus:border-green-500 focus:outline-none placeholder-gray-700 resize-none"
                      />
                    </div>

                    {/* Botão principal de salvar */}
                    {!callSheetId ? (
                      <button
                        onClick={() => salvarCallSheet(false)}
                        disabled={salvando || !podeSalvar}
                        className="w-full py-2.5 rounded-lg bg-[#1a1a1a] border border-[#333] hover:border-green-500/50 text-gray-300 hover:text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
                      >
                        {salvando ? <Loader2 size={15} className="animate-spin" /> : null}
                        Salvar Rascunho
                      </button>
                    ) : (
                      <button
                        onClick={() => salvarCallSheet(false)}
                        disabled={salvando || !formDirty}
                        className="w-full py-2.5 rounded-lg bg-[#1a1a1a] border border-[#333] hover:border-green-500/50 text-gray-300 hover:text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-30"
                      >
                        {salvando ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                        {formDirty ? "Salvar Alterações" : "Salvo"}
                      </button>
                    )}

                    {/* Publicar — aparece quando há rascunho */}
                    {callSheetId && !publicado && (
                      <button
                        onClick={() => salvarCallSheet(true)}
                        disabled={salvando}
                        className="w-full py-2.5 rounded-lg bg-green-700 hover:bg-green-600 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Radio size={15} /> Publicar Roteiro para a Equipe
                      </button>
                    )}

                    {publicado && (
                      <div className="flex items-center gap-2 text-xs text-green-500 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2.5">
                        <CheckCircle2 size={14} className="shrink-0" />
                        Roteiro publicado. Os freelancers já podem acessar o link de confirmação.
                      </div>
                    )}
                  </div>

                  {/* ════ COL 2: Painel de Confirmações ════ */}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Users size={15} className="text-green-500" />
                        <h4 className="text-sm font-semibold text-white">Confirmações da Equipe</h4>
                      </div>
                      {callSheetId && (
                        <button
                          onClick={recarregarConfirmacoes}
                          title="Atualizar status"
                          className="text-gray-600 hover:text-gray-300 transition-colors p-1 rounded"
                        >
                          <RefreshCw size={14} />
                        </button>
                      )}
                    </div>

                    {/* Barra de progresso */}
                    {freelancers.length > 0 && (
                      <div className="mb-5">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-gray-500">{totalConfirmados} de {freelancers.length} confirmados</span>
                          <span className={`font-semibold ${pct === 100 ? "text-green-500" : pct > 50 ? "text-yellow-500" : "text-gray-500"}`}>{pct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? "bg-green-500" : pct > 50 ? "bg-yellow-500" : "bg-gray-600"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Lista de freelancers */}
                    {freelancers.length === 0 ? (
                      <div className="text-center py-8">
                        <Users size={28} className="text-gray-700 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Nenhum freelancer escalado.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {freelancers.map((f) => (
                          <div
                            key={f.freelancerId}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                              f.confirmado
                                ? "bg-green-500/5 border-green-500/15"
                                : "bg-[#0a0a0a] border-[#2a2a2a]"
                            }`}
                          >
                            {/* Status icon */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                              f.confirmado ? "bg-green-500/20 text-green-400" : "bg-[#1a1a1a] text-gray-600"
                            }`}>
                              {f.confirmado ? <Check size={14} /> : f.nome.charAt(0).toUpperCase()}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${f.confirmado ? "text-white" : "text-gray-300"}`}>
                                {f.nome}
                              </p>
                              <p className="text-xs text-gray-600 truncate">{f.especialidade}</p>
                              {f.confirmado && f.confirmadoEm && (
                                <p className="text-[10px] text-green-600 mt-0.5">
                                  Ciente às {new Date(f.confirmadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                </p>
                              )}
                            </div>

                            {/* Status badge + ação */}
                            <div className="flex items-center gap-2 shrink-0">
                              {f.confirmado ? (
                                <span className="text-[10px] font-medium text-green-500 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                                  Ciente ✓
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium text-gray-600 bg-[#1a1a1a] border border-[#2a2a2a] px-2 py-0.5 rounded-full">
                                  Aguardando
                                </span>
                              )}

                              {/* Botão enviar individual */}
                              {publicado && f.telefone && (
                                <button
                                  onClick={() => abrirWhatsapp(f)}
                                  title="Enviar roteiro individual"
                                  className="text-gray-600 hover:text-[#25D366] transition-colors p-1"
                                >
                                  <MessageCircle size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Resumo */}
                    {freelancers.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 gap-3">
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

                    {/* Link do call sheet para copiar */}
                    {callSheetId && publicado && (
                      <div className="mt-4">
                        <p className="text-xs text-gray-600 mb-1.5">Link público do roteiro:</p>
                        <div className="flex items-center gap-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2">
                          <p className="text-xs text-gray-500 flex-1 truncate font-mono">
                            {getBaseUrl()}/roteiro/{callSheetId}
                          </p>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`${getBaseUrl()}/roteiro/${callSheetId}`);
                              mostrarToast("Link copiado!", "sucesso");
                            }}
                            className="text-gray-600 hover:text-green-400 transition-colors shrink-0"
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ══════════════════════════════════════════════════════
          MODAL: DISPARAR ROTEIRO EM MASSA
      ══════════════════════════════════════════════════════ */}
      {modalDisparar && eventoSelecionado && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0d0d] border border-[#222] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b border-[#1a1a1a] bg-[#25D366]/10">
              <div>
                <h3 className="text-base font-bold text-[#25D366] flex items-center gap-2">
                  <Send size={16} /> Disparar Roteiro em Massa
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">{eventoSelecionado.titulo}</p>
              </div>
              <button onClick={() => setModalDisparar(false)} className="text-gray-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* Info */}
            <div className="px-5 pt-4 pb-2">
              <div className="flex items-start gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-xs text-gray-400">
                <Info size={13} className="mt-0.5 shrink-0 text-gray-500" />
                Clique em <strong className="text-white mx-1">Enviar</strong> ao lado de cada freelancer para abrir o WhatsApp com a mensagem pronta. O link de confirmação já está incluso.
              </div>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
              {freelancers.map((f) => (
                <div
                  key={f.freelancerId}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    f.confirmado ? "bg-green-500/5 border-green-500/15" : "bg-[#0a0a0a] border-[#2a2a2a]"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
                    f.confirmado ? "bg-green-500/20 text-green-400" : "bg-[#1a1a1a] text-gray-500"
                  }`}>
                    {f.confirmado ? <Check size={13} /> : f.nome.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{f.nome}</p>
                    <p className="text-xs text-gray-600">{f.especialidade}</p>
                  </div>
                  {f.confirmado && (
                    <span className="text-[10px] text-green-500 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full shrink-0">
                      Ciente ✓
                    </span>
                  )}
                  {f.telefone ? (
                    <button
                      onClick={() => abrirWhatsapp(f)}
                      className="shrink-0 bg-[#25D366] hover:bg-[#20bd5a] text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
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

            {/* Footer */}
            <div className="p-5 border-t border-[#1a1a1a] flex items-center justify-between">
              <p className="text-xs text-gray-600">
                {freelancers.filter((f) => f.telefone).length} de {freelancers.length} com WhatsApp cadastrado
              </p>
              <button
                onClick={() => setModalDisparar(false)}
                className="bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-gray-300 px-5 py-2 rounded-lg text-sm font-medium"
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