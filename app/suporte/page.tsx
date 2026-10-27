"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LifeBuoy, Plus, Send, Loader2, ArrowLeft, MessageCircle, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { chamarApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { WHATSAPP_ARXUM } from "@/lib/planos";

interface Chamado {
  id: string;
  numero: number;
  assunto: string;
  status: "aberto" | "respondido" | "resolvido";
  criado_em: string;
  ultima_msg_em: string;
}

interface Mensagem {
  id: string;
  texto: string;
  autor_arxum: boolean;
  criado_em: string;
  lida_em: string | null;
}

const STATUS: Record<Chamado["status"], { nome: string; cor: string }> = {
  aberto: { nome: "Aguardando ARXUM", cor: "bg-amber-500/10 text-amber-300" },
  respondido: { nome: "Respondido", cor: "bg-violet-500/15 text-violet-200" },
  resolvido: { nome: "Resolvido", cor: "bg-green-500/10 text-green-300" },
};

const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

// Conversa da empresa com a equipe ARXUM.
export default function SuportePage() {
  const { ready } = useAuth();
  const [chamados, setChamados] = useState<Chamado[] | null>(null);
  const [naoLidas, setNaoLidas] = useState<Map<string, number>>(new Map());
  const [aberto, setAberto] = useState<string | "novo" | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [novo, setNovo] = useState({ assunto: "", texto: "" });
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [contato, setContato] = useState<{ whatsapp: string | null; email_suporte: string | null } | null>(null);
  const fim = useRef<HTMLDivElement>(null);

  const carregarLista = useCallback(async () => {
    const [c, m] = await Promise.all([
      supabase.from("chamados").select("id, numero, assunto, status, criado_em, ultima_msg_em").order("ultima_msg_em", { ascending: false }),
      supabase.from("chamado_mensagens").select("chamado_id").eq("autor_arxum", true).is("lida_em", null),
    ]);
    setChamados((c.data as Chamado[]) ?? []);
    const mapa = new Map<string, number>();
    for (const x of (m.data as { chamado_id: string }[]) ?? []) mapa.set(x.chamado_id, (mapa.get(x.chamado_id) ?? 0) + 1);
    setNaoLidas(mapa);
  }, []);

  const carregarMensagens = useCallback(async (id: string) => {
    const { data } = await supabase.from("chamado_mensagens").select("id, texto, autor_arxum, criado_em, lida_em")
      .eq("chamado_id", id).order("criado_em");
    setMensagens((data as Mensagem[]) ?? []);
    await supabase.rpc("marcar_chamado_lido", { p_chamado: id });
  }, []);

  useEffect(() => {
    if (!ready) return;
    Promise.resolve().then(carregarLista);
    supabase.rpc("dados_pagamento").then(({ data }) => setContato(data));
  }, [ready, carregarLista]);

  useEffect(() => {
    if (!aberto || aberto === "novo") return;
    Promise.resolve(aberto).then(carregarMensagens).then(carregarLista);
    const t = setInterval(() => carregarMensagens(aberto), 20_000);
    return () => clearInterval(t);
  }, [aberto, carregarMensagens, carregarLista]);

  useEffect(() => { fim.current?.scrollIntoView({ block: "end" }); }, [mensagens.length]);

  const abrirChamado = async () => {
    setEnviando(true);
    const { data, error } = await supabase.rpc("abrir_chamado", { p_assunto: novo.assunto, p_texto: novo.texto });
    setEnviando(false);
    if (error) return;
    chamarApi("/api/suporte/notificar", { chamado_id: data });
    setNovo({ assunto: "", texto: "" });
    await carregarLista();
    setAberto(data as string);
  };

  const responder = async () => {
    if (!aberto || aberto === "novo" || !texto.trim()) return;
    setEnviando(true);
    const { data } = await supabase.rpc("responder_chamado", { p_chamado: aberto, p_texto: texto });
    setEnviando(false);
    if (data !== "ok") return;
    chamarApi("/api/suporte/notificar", { chamado_id: aberto });
    setTexto("");
    carregarMensagens(aberto);
    carregarLista();
  };

  if (!ready || !chamados) {
    return <div className="p-8 flex items-center justify-center h-full"><p className="text-gray-500 animate-pulse">Carregando suporte...</p></div>;
  }

  const atual = chamados.find((c) => c.id === aberto);
  const whatsapp = (contato?.whatsapp ?? "").replace(/\D/g, "") || WHATSAPP_ARXUM;
  const caixa = "w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-violet-500 focus:outline-none";

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto w-full space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2"><LifeBuoy size={22} className="text-violet-400" /> Suporte</h2>
          <p className="text-sm text-gray-500 mt-1">Fale com a equipe ARXUM. Respondemos por aqui e avisamos por e-mail.</p>
        </div>
        {aberto !== "novo" && (
          <button onClick={() => setAberto("novo")} className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500">
            <Plus size={16} /> Nova conversa
          </button>
        )}
      </div>

      {aberto === "novo" && (
        <section className="bg-[#121212] border border-[#222] rounded-xl p-6 space-y-4">
          <button onClick={() => setAberto(null)} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white"><ArrowLeft size={14} /> Voltar</button>
          <div>
            <label htmlFor="assunto" className="block text-sm text-gray-400 mb-1.5">Assunto</label>
            <input id="assunto" value={novo.assunto} onChange={(e) => setNovo({ ...novo, assunto: e.target.value })} maxLength={140}
              placeholder="Ex.: Profissional não recebe o link de confirmação" className={caixa} />
          </div>
          <div>
            <label htmlFor="mensagem" className="block text-sm text-gray-400 mb-1.5">Mensagem</label>
            <textarea id="mensagem" value={novo.texto} onChange={(e) => setNovo({ ...novo, texto: e.target.value })} rows={6}
              placeholder="Conte o que aconteceu e, se puder, em qual tela." className={caixa} />
          </div>
          <button onClick={abrirChamado} disabled={enviando || novo.assunto.trim().length < 3 || !novo.texto.trim()}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50">
            {enviando ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Enviar
          </button>
        </section>
      )}

      {atual && (
        <section className="bg-[#121212] border border-[#222] rounded-xl overflow-hidden flex flex-col">
          <header className="px-5 py-4 border-b border-[#222] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <button onClick={() => setAberto(null)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white mb-1"><ArrowLeft size={12} /> Conversas</button>
              <p className="text-white font-medium truncate">nº {atual.numero} · {atual.assunto}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS[atual.status].cor}`}>{STATUS[atual.status].nome}</span>
          </header>
          <div className="px-5 py-5 space-y-3 max-h-[55vh] overflow-y-auto">
            {mensagens.map((m) => (
              <div key={m.id} className={`flex ${m.autor_arxum ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.autor_arxum ? "bg-[#1c1c1c] text-gray-100 rounded-bl-sm" : "bg-violet-600 text-white rounded-br-sm"}`}>
                  <p className="whitespace-pre-wrap break-words">{m.texto}</p>
                  <p className={`text-[11px] mt-1 ${m.autor_arxum ? "text-gray-500" : "text-white/60"}`}>{m.autor_arxum ? "Equipe ARXUM" : "Você"} · {quando(m.criado_em)}</p>
                </div>
              </div>
            ))}
            <div ref={fim} />
          </div>
          <footer className="border-t border-[#222] p-4 flex gap-2 items-end">
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={2} className={caixa}
              placeholder={atual.status === "resolvido" ? "Escreva para reabrir a conversa" : "Escreva sua mensagem"}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) responder(); }} />
            <button onClick={responder} disabled={enviando || !texto.trim()} aria-label="Enviar"
              className="rounded-lg bg-violet-600 p-3 text-white hover:bg-violet-500 disabled:opacity-50">
              {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </footer>
        </section>
      )}

      {!aberto && (
        <section className="bg-[#121212] border border-[#222] rounded-xl overflow-hidden">
          {chamados.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500">Nenhuma conversa ainda. Clique em “Nova conversa” para falar com a gente.</p>
          ) : (
            <ul className="divide-y divide-[#222]">
              {chamados.map((c) => (
                <li key={c.id}>
                  <button onClick={() => setAberto(c.id)} className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-white/[0.02]">
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-white text-sm font-medium">
                        <span className="truncate">nº {c.numero} · {c.assunto}</span>
                        {!!naoLidas.get(c.id) && <span className="shrink-0 rounded-full bg-violet-600 px-1.5 text-[11px] font-semibold">{naoLidas.get(c.id)}</span>}
                      </span>
                      <span className="block text-xs text-gray-500 mt-0.5">última mensagem {quando(c.ultima_msg_em)}</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS[c.status].cor}`}>{STATUS[c.status].nome}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
        <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-white"><MessageCircle size={15} /> WhatsApp</a>
        {contato?.email_suporte && <a href={`mailto:${contato.email_suporte}`} className="flex items-center gap-1.5 hover:text-white"><Mail size={15} /> {contato.email_suporte}</a>}
      </div>
    </div>
  );
}
