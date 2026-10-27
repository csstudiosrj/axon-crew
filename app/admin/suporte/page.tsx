"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Send, Loader2, CheckCheck, MessagesSquare, Building2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { chamarApi } from "@/lib/api";
import { card, campo, botaoPrimario, Carregando, Vazio, dataHora, usePainelAdmin } from "@/components/admin/ui";
import { STATUS_CHAMADO, type ChamadoResumo } from "@/components/admin/tipos";

interface Conversa {
  chamado: { id: string; numero: number; assunto: string; status: ChamadoResumo["status"]; company_id: string; empresa: string; criado_em: string };
  mensagens: { id: string; texto: string; arxum: boolean; autor: string; criado_em: string; lida_em: string | null }[];
}

export default function AdminSuportePage() {
  return <Suspense fallback={<Carregando />}><AdminSuporte /></Suspense>;
}

// Conversas com as empresas. A empresa escreve pelo Suporte do painel dela;
// cada resposta daqui aparece lá e também vai por e-mail.
function AdminSuporte() {
  const params = useSearchParams();
  const router = useRouter();
  const { avisar, atualizarContadores } = usePainelAdmin();
  const selecionado = params.get("chamado");
  const [chamados, setChamados] = useState<ChamadoResumo[] | null>(null);
  const [conversa, setConversa] = useState<Conversa | null>(null);
  const [filtro, setFiltro] = useState<"aguardando" | "todos">("aguardando");
  const [busca, setBusca] = useState("");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fim = useRef<HTMLDivElement>(null);

  const carregarLista = useCallback(async () => {
    const { data } = await supabase.rpc("admin_chamados");
    setChamados((data as ChamadoResumo[]) ?? []);
  }, []);

  const carregarConversa = useCallback(async (id: string) => {
    const { data } = await supabase.rpc("admin_chamado", { p_chamado: id });
    setConversa(data as Conversa);
  }, []);

  useEffect(() => { Promise.resolve().then(carregarLista); }, [carregarLista]);

  useEffect(() => {
    if (!selecionado) return;
    Promise.resolve(selecionado).then(carregarConversa).then(() => { carregarLista(); atualizarContadores(); });
  }, [selecionado, carregarConversa, carregarLista, atualizarContadores]);

  // Atualiza sozinho enquanto a tela está aberta.
  useEffect(() => {
    const t = setInterval(() => {
      carregarLista();
      if (selecionado) carregarConversa(selecionado);
    }, 20_000);
    return () => clearInterval(t);
  }, [selecionado, carregarLista, carregarConversa]);

  const quantidade = conversa?.mensagens.length ?? 0;
  useEffect(() => { fim.current?.scrollIntoView({ block: "end" }); }, [quantidade]);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (chamados ?? []).filter((c) =>
      (filtro === "todos" || c.status === "aberto") &&
      (!termo || [c.empresa, c.assunto, String(c.numero)].some((v) => v.toLowerCase().includes(termo))));
  }, [chamados, filtro, busca]);

  const responder = async (status: ChamadoResumo["status"]) => {
    if (!conversa) return;
    setEnviando(true);
    const { error } = await supabase.rpc("admin_responder_chamado", { p_chamado: conversa.chamado.id, p_texto: texto, p_status: status });
    setEnviando(false);
    if (error) { avisar("Não foi possível enviar. Tente de novo."); return; }
    if (texto.trim()) chamarApi("/api/suporte/notificar", { chamado_id: conversa.chamado.id });
    setTexto("");
    avisar(status === "resolvido" ? "Chamado marcado como resolvido." : "Resposta enviada.");
    carregarConversa(conversa.chamado.id);
    carregarLista();
    atualizarContadores();
  };

  const conversaAtual = conversa && conversa.chamado.id === selecionado ? conversa : null;

  return (
    <div className="grid gap-4 lg:h-[calc(100vh-170px)] lg:grid-cols-[380px_1fr]">
      <aside className={`${card} flex min-h-0 flex-col`}>
        <div className="space-y-3 border-b border-white/10 p-4">
          <div className="flex gap-2">
            {(["aguardando", "todos"] as const).map((f) => (
              <button key={f} onClick={() => setFiltro(f)}
                className={`flex-1 rounded-lg border px-3 py-1.5 text-[13px] ${filtro === f ? "border-arx-crew/40 bg-arx-crew/15 text-white" : "border-white/10 text-arx-mist hover:text-white"}`}>
                {f === "aguardando" ? `Aguardando (${(chamados ?? []).filter((c) => c.status === "aberto").length})` : "Todos"}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-arx-slate" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar" className={`${campo} py-2 pl-9`} />
          </div>
        </div>
        <ul className="min-h-0 flex-1 divide-y divide-white/5 overflow-y-auto">
          {!chamados && <Carregando />}
          {chamados && lista.length === 0 && <Vazio>{filtro === "aguardando" ? "Nenhum chamado aguardando resposta." : "Nenhum chamado ainda."}</Vazio>}
          {lista.map((c) => (
            <li key={c.id}>
              <button onClick={() => router.replace(`/admin/suporte?chamado=${c.id}`)}
                className={`block w-full px-4 py-3 text-left hover:bg-white/[0.03] ${c.id === selecionado ? "bg-arx-crew/10" : ""}`}>
                <p className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="truncate font-medium text-white">{c.empresa}</span>
                  <span className="shrink-0 text-[11px] text-arx-slate">{dataHora(c.ultima_msg_em)}</span>
                </p>
                <p className="mt-0.5 flex items-center gap-2 text-[13px] text-arx-frost">
                  <span className="truncate">nº {c.numero} · {c.assunto}</span>
                  {Number(c.nao_lidas) > 0 && <span className="shrink-0 rounded-full bg-arx-crew-strong px-1.5 text-[11px] font-semibold text-white">{c.nao_lidas}</span>}
                </p>
                <p className="mt-0.5 truncate text-[12px] text-arx-slate">{c.ultima_msg}</p>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className={`${card} flex min-h-[520px] flex-col`}>
        {!selecionado ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-arx-slate">
            <MessagesSquare size={36} className="mb-3" />
            <p className="text-[14px]">Escolha uma conversa. Para falar com uma empresa que ainda não escreveu, abra a ficha dela em Empresas e clique em “Conversar”.</p>
          </div>
        ) : !conversaAtual ? <Carregando /> : (
          <>
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-3.5">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-white">nº {conversaAtual.chamado.numero} · {conversaAtual.chamado.assunto}</p>
                <Link href={`/admin/empresas/${conversaAtual.chamado.company_id}`} className="inline-flex items-center gap-1.5 text-[13px] text-arx-mist hover:text-arx-crew-soft">
                  <Building2 size={13} /> {conversaAtual.chamado.empresa}
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_CHAMADO[conversaAtual.chamado.status].cor}`}>{STATUS_CHAMADO[conversaAtual.chamado.status].nome}</span>
                {conversaAtual.chamado.status !== "resolvido" && (
                  <button onClick={() => responder("resolvido")} disabled={enviando}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[13px] text-emerald-300 hover:bg-white/5">
                    <CheckCheck size={14} /> Resolver
                  </button>
                )}
              </div>
            </header>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-5">
              {conversaAtual.mensagens.map((m) => (
                <div key={m.id} className={`flex ${m.arxum ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${m.arxum ? "rounded-br-sm bg-arx-crew-strong/90 text-white" : "rounded-bl-sm bg-arx-surface-2 text-arx-frost"}`}>
                    <p className="whitespace-pre-wrap break-words">{m.texto}</p>
                    <p className={`mt-1 text-[11px] ${m.arxum ? "text-white/60" : "text-arx-slate"}`}>
                      {m.arxum ? "ARXUM" : m.autor} · {dataHora(m.criado_em)}{m.arxum && m.lida_em ? " · lida" : ""}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={fim} />
            </div>

            <footer className="border-t border-white/10 p-4">
              <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} placeholder="Escreva a resposta. A empresa vê no painel e recebe por e-mail."
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && texto.trim()) responder("respondido"); }}
                className={campo} />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[12px] text-arx-slate">Ctrl + Enter envia</span>
                <div className="flex gap-2">
                  <button onClick={() => responder("resolvido")} disabled={enviando || !texto.trim()}
                    className="rounded-lg border border-white/10 px-4 py-2.5 text-[14px] text-arx-frost hover:bg-white/5 disabled:opacity-50">Responder e resolver</button>
                  <button onClick={() => responder("respondido")} disabled={enviando || !texto.trim()} className={botaoPrimario}>
                    {enviando ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Responder
                  </button>
                </div>
              </div>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
