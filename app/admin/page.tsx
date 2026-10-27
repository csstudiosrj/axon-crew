"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2, CircleDollarSign, Sparkles, Users, CalendarDays, Search, Download,
  MessageCircle, Mail, ExternalLink, Ban, RotateCcw, StickyNote, Loader2, ShieldAlert, LogOut, X,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { BASE_PATH } from "../../lib/base-path";
import { PLANOS, getPlano, type PlanoId } from "../../lib/planos";
import { getSegmento } from "../../lib/segmentos";
import { dataBR, formatarBRL } from "../../lib/validacao";
import CrewLogo from "../../components/marketing/CrewLogo";

interface Empresa {
  id: string;
  name: string;
  slug: string;
  segmento: string | null;
  plano: PlanoId;
  suspensa: boolean;
  observacao_admin: string | null;
  created_at: string;
  plano_atualizado_em: string | null;
  whatsapp: string | null;
  email_admin: string | null;
  ultimo_acesso: string | null;
  usuarios: number;
  profissionais: number;
  trabalhos_mes: number;
  trabalhos_total: number;
}

type Acao =
  | { tipo: "plano"; empresa: Empresa; plano: PlanoId }
  | { tipo: "suspender"; empresa: Empresa }
  | { tipo: "observacao"; empresa: Empresa };

const DIA = 24 * 60 * 60 * 1000;
const COR_PLANO: Record<PlanoId, string> = {
  gratis: "bg-white/5 text-arx-mist border-white/10",
  essencial: "bg-sky-500/10 text-sky-300 border-sky-500/20",
  profissional: "bg-arx-crew/15 text-arx-crew-soft border-arx-crew/30",
  empresa: "bg-amber-500/10 text-amber-300 border-amber-500/20",
};

function tempoDesde(iso: string | null, agora: number) {
  if (!iso) return "nunca";
  const dias = Math.floor((agora - new Date(iso).getTime()) / DIA);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  return dataBR(iso);
}

// Painel da ARXUM: todas as empresas, planos, uso e suspensão de contas.
// O acesso é conferido no banco (admins_plataforma); esta tela só exibe.
export default function AdminPage() {
  const router = useRouter();
  const [estado, setEstado] = useState<"carregando" | "negado" | "ok">("carregando");
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroPlano, setFiltroPlano] = useState<"todos" | PlanoId>("todos");
  const [filtroStatus, setFiltroStatus] = useState<"todas" | "ativas" | "suspensas">("todas");
  const [acao, setAcao] = useState<Acao | null>(null);
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [agora, setAgora] = useState(0);

  const buscar = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_empresas");
    if (error) return false;
    setEmpresas((data as Empresa[]) ?? []);
    setAgora(Date.now());
    return true;
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/login?next=/admin"); return; }
      const { data: admin } = await supabase.rpc("eh_admin_plataforma");
      if (!admin) { setEstado("negado"); return; }
      setEstado((await buscar()) ? "ok" : "negado");
    });
  }, [router, buscar]);

  const avisar = (msg: string) => { setAviso(msg); setTimeout(() => setAviso(""), 3500); };

  const resumo = useMemo(() => {
    const ativas = empresas.filter((e) => !e.suspensa);
    return {
      total: empresas.length,
      ativas: ativas.length,
      suspensas: empresas.length - ativas.length,
      receita: ativas.reduce((s, e) => s + getPlano(e.plano).preco, 0),
      pagantes: ativas.filter((e) => getPlano(e.plano).preco > 0).length,
      novas7: empresas.filter((e) => agora - new Date(e.created_at).getTime() < 7 * DIA).length,
      novas30: empresas.filter((e) => agora - new Date(e.created_at).getTime() < 30 * DIA).length,
      profissionais: empresas.reduce((s, e) => s + Number(e.profissionais), 0),
      trabalhosMes: empresas.reduce((s, e) => s + Number(e.trabalhos_mes), 0),
      porPlano: PLANOS.map((p) => ({ ...p, qtd: ativas.filter((e) => e.plano === p.id).length })),
    };
  }, [empresas, agora]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return empresas.filter((e) =>
      (filtroPlano === "todos" || e.plano === filtroPlano) &&
      (filtroStatus === "todas" || (filtroStatus === "suspensas") === e.suspensa) &&
      (!termo || [e.name, e.slug, e.email_admin ?? ""].some((v) => v.toLowerCase().includes(termo))));
  }, [empresas, busca, filtroPlano, filtroStatus]);

  const confirmar = async () => {
    if (!acao) return;
    setSalvando(true);
    const { error } =
      acao.tipo === "plano"
        ? await supabase.rpc("admin_alterar_plano", { p_company: acao.empresa.id, p_plano: acao.plano })
        : acao.tipo === "suspender"
          ? await supabase.rpc("admin_suspender", { p_company: acao.empresa.id, p_suspensa: !acao.empresa.suspensa })
          : await supabase.rpc("admin_salvar_observacao", { p_company: acao.empresa.id, p_texto: observacao });
    setSalvando(false);
    if (error) { avisar("Não foi possível salvar. Tente de novo."); return; }
    avisar(
      acao.tipo === "plano" ? `${acao.empresa.name} agora está no plano ${getPlano(acao.plano).nome}.`
        : acao.tipo === "suspender" ? `${acao.empresa.name} foi ${acao.empresa.suspensa ? "reativada" : "suspensa"}.`
          : "Observação salva."
    );
    setAcao(null);
    buscar();
  };

  const exportar = () => {
    const linhas = [
      ["Empresa", "Link", "Segmento", "Plano", "Status", "E-mail", "WhatsApp", "Cadastro", "Último acesso", "Usuários", "Profissionais", "Trabalhos no mês", "Trabalhos no total", "Observação"],
      ...filtradas.map((e) => [
        e.name, e.slug, getSegmento(e.segmento).nome, getPlano(e.plano).nome, e.suspensa ? "Suspensa" : "Ativa",
        e.email_admin ?? "", e.whatsapp ?? "", dataBR(e.created_at), e.ultimo_acesso ? dataBR(e.ultimo_acesso) : "",
        String(e.usuarios), String(e.profissionais), String(e.trabalhos_mes), String(e.trabalhos_total), e.observacao_admin ?? "",
      ]),
    ];
    const csv = "﻿" + linhas.map((l) => l.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    a.download = `empresas-crew-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const sair = async () => { await supabase.auth.signOut(); window.location.href = `${BASE_PATH}/login`; };

  if (estado === "carregando") {
    return <div className="flex min-h-screen items-center justify-center bg-arx-obsidian"><Loader2 size={28} className="animate-spin text-arx-slate" /></div>;
  }
  if (estado === "negado") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-arx-obsidian p-4 text-center font-dm">
        <div>
          <ShieldAlert size={40} className="mx-auto mb-4 text-arx-slate" />
          <h1 className="text-xl font-semibold text-white">Acesso restrito à equipe ARXUM</h1>
          <p className="mt-2 text-[14px] text-arx-mist">Esta conta não tem permissão para o painel administrativo.</p>
          <Link href="/freelas" className="mt-6 inline-block text-[14px] text-arx-crew-soft hover:text-white">Ir para o painel da empresa</Link>
        </div>
      </div>
    );
  }

  const card = "rounded-xl border border-white/10 bg-arx-surface";

  return (
    <div className="min-h-screen bg-arx-obsidian font-dm text-arx-frost">
      <header className="border-b border-arx-line">
        <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <CrewLogo />
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-300">Super admin</span>
          </div>
          <button onClick={sair} className="flex items-center gap-2 text-[14px] text-arx-mist hover:text-white"><LogOut size={16} /> Sair</button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {[
            { icone: Building2, rotulo: "Empresas ativas", valor: String(resumo.ativas), sub: `${resumo.suspensas} suspensa${resumo.suspensas === 1 ? "" : "s"} · ${resumo.total} no total` },
            { icone: CircleDollarSign, rotulo: "Receita mensal estimada", valor: formatarBRL(resumo.receita), sub: `${resumo.pagantes} empresa${resumo.pagantes === 1 ? "" : "s"} pagante${resumo.pagantes === 1 ? "" : "s"}` },
            { icone: Sparkles, rotulo: "Novas empresas", valor: String(resumo.novas7), sub: `nos últimos 7 dias · ${resumo.novas30} em 30 dias` },
            { icone: Users, rotulo: "Profissionais cadastrados", valor: resumo.profissionais.toLocaleString("pt-BR"), sub: "em todas as empresas" },
            { icone: CalendarDays, rotulo: "Trabalhos neste mês", valor: resumo.trabalhosMes.toLocaleString("pt-BR"), sub: "em todas as empresas" },
          ].map(({ icone: Icone, rotulo, valor, sub }) => (
            <div key={rotulo} className={`${card} p-5`}>
              <p className="flex items-center gap-2 text-[13px] text-arx-mist"><Icone size={15} className="text-arx-crew-soft" /> {rotulo}</p>
              <p className="mt-2 text-[26px] font-semibold tabular-nums text-white">{valor}</p>
              <p className="mt-1 text-[12px] text-arx-slate">{sub}</p>
            </div>
          ))}
        </div>

        <div className={`${card} mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 text-[13px]`}>
          <span className="text-arx-slate">Empresas ativas por plano:</span>
          {resumo.porPlano.map((p) => (
            <span key={p.id} className="flex items-center gap-2">
              <span className={`rounded-full border px-2 py-0.5 text-[11px] ${COR_PLANO[p.id]}`}>{p.nome}</span>
              <span className="tabular-nums text-white">{p.qtd}</span>
              <span className="text-arx-slate">· {formatarBRL(p.qtd * p.preco)}/mês</span>
            </span>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-arx-slate" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por empresa, link ou e-mail"
              className="w-full rounded-lg border border-white/10 bg-arx-surface py-2.5 pl-9 pr-3 text-[14px] text-white placeholder:text-arx-slate focus:border-arx-crew-soft focus:outline-none" />
          </div>
          <select value={filtroPlano} onChange={(e) => setFiltroPlano(e.target.value as typeof filtroPlano)}
            className="rounded-lg border border-white/10 bg-arx-surface px-3 py-2.5 text-[14px] text-white">
            <option value="todos">Todos os planos</option>
            {PLANOS.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as typeof filtroStatus)}
            className="rounded-lg border border-white/10 bg-arx-surface px-3 py-2.5 text-[14px] text-white">
            <option value="todas">Ativas e suspensas</option>
            <option value="ativas">Só ativas</option>
            <option value="suspensas">Só suspensas</option>
          </select>
          <button onClick={exportar} className="flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-[14px] text-arx-frost hover:bg-white/5">
            <Download size={16} /> CSV
          </button>
        </div>

        <div className={`${card} mt-4 overflow-x-auto`}>
          <table className="w-full min-w-[1100px] text-[14px]">
            <thead className="border-b border-white/10 text-left text-[12px] text-arx-slate">
              <tr>
                <th className="px-5 py-3 font-medium">Empresa</th>
                <th className="px-3 py-3 font-medium">Plano</th>
                <th className="px-3 py-3 font-medium text-right">Profissionais</th>
                <th className="px-3 py-3 font-medium text-right">Trabalhos no mês</th>
                <th className="px-3 py-3 font-medium text-right">Usuários</th>
                <th className="px-3 py-3 font-medium">Cadastro</th>
                <th className="px-3 py-3 font-medium">Último acesso</th>
                <th className="px-5 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtradas.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-arx-slate">Nenhuma empresa encontrada.</td></tr>
              )}
              {filtradas.map((e) => {
                const plano = getPlano(e.plano);
                const perto = (usado: number, max: number | null) => max !== null && usado >= max * 0.8;
                return (
                  <tr key={e.id} className={e.suspensa ? "opacity-60" : ""}>
                    <td className="px-5 py-3.5">
                      <p className="flex items-center gap-2 font-medium text-white">
                        {e.name}
                        {e.suspensa && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-300">Suspensa</span>}
                      </p>
                      <p className="text-[12px] text-arx-slate">{getSegmento(e.segmento).nome} · /{e.slug}{e.email_admin ? ` · ${e.email_admin}` : ""}</p>
                      {e.observacao_admin && <p className="mt-1 flex items-start gap-1.5 text-[12px] text-amber-200/80"><StickyNote size={12} className="mt-0.5 shrink-0" /> {e.observacao_admin}</p>}
                    </td>
                    <td className="px-3 py-3.5">
                      <select value={e.plano} aria-label={`Plano de ${e.name}`}
                        onChange={(ev) => setAcao({ tipo: "plano", empresa: e, plano: ev.target.value as PlanoId })}
                        className={`rounded-full border px-2.5 py-1 text-[12px] ${COR_PLANO[e.plano]}`}>
                        {PLANOS.map((p) => <option key={p.id} value={p.id} className="bg-arx-surface text-white">{p.nome}</option>)}
                      </select>
                    </td>
                    <td className={`px-3 py-3.5 text-right tabular-nums ${perto(e.profissionais, plano.maxProfissionais) ? "text-amber-300" : ""}`}>
                      {e.profissionais}{plano.maxProfissionais ? <span className="text-arx-slate">/{plano.maxProfissionais}</span> : null}
                    </td>
                    <td className={`px-3 py-3.5 text-right tabular-nums ${perto(e.trabalhos_mes, plano.maxTrabalhosMes) ? "text-amber-300" : ""}`}>
                      {e.trabalhos_mes}{plano.maxTrabalhosMes ? <span className="text-arx-slate">/{plano.maxTrabalhosMes}</span> : null}
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums">{e.usuarios}<span className="text-arx-slate">/{plano.maxUsuarios}</span></td>
                    <td className="px-3 py-3.5 text-arx-mist">{dataBR(e.created_at)}</td>
                    <td className="px-3 py-3.5 text-arx-mist">{tempoDesde(e.ultimo_acesso, agora)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {e.whatsapp && (
                          <a href={`https://wa.me/55${e.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" title="WhatsApp da empresa"
                            className="rounded-md p-2 text-arx-slate hover:bg-white/5 hover:text-white"><MessageCircle size={16} /></a>
                        )}
                        {e.email_admin && (
                          <a href={`mailto:${e.email_admin}`} title="Enviar e-mail" className="rounded-md p-2 text-arx-slate hover:bg-white/5 hover:text-white"><Mail size={16} /></a>
                        )}
                        <a href={`${BASE_PATH}/cadastro/${e.slug}`} target="_blank" rel="noopener noreferrer" title="Abrir link de cadastro"
                          className="rounded-md p-2 text-arx-slate hover:bg-white/5 hover:text-white"><ExternalLink size={16} /></a>
                        <button onClick={() => { setObservacao(e.observacao_admin ?? ""); setAcao({ tipo: "observacao", empresa: e }); }} title="Observação interna"
                          className="rounded-md p-2 text-arx-slate hover:bg-white/5 hover:text-white"><StickyNote size={16} /></button>
                        <button onClick={() => setAcao({ tipo: "suspender", empresa: e })} title={e.suspensa ? "Reativar conta" : "Suspender conta"}
                          className={`rounded-md p-2 hover:bg-white/5 ${e.suspensa ? "text-emerald-400" : "text-arx-slate hover:text-red-300"}`}>
                          {e.suspensa ? <RotateCcw size={16} /> : <Ban size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[12px] text-arx-slate">
          Receita estimada pelos preços mensais dos planos das empresas ativas. Números em amarelo: acima de 80% do limite do plano.
        </p>
      </main>

      {acao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-arx-surface p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-[18px] font-semibold text-white">
                {acao.tipo === "plano" ? "Trocar plano" : acao.tipo === "suspender" ? (acao.empresa.suspensa ? "Reativar conta" : "Suspender conta") : "Observação interna"}
              </h2>
              <button onClick={() => setAcao(null)} aria-label="Fechar" className="text-arx-slate hover:text-white"><X size={18} /></button>
            </div>
            {acao.tipo === "plano" && (
              <p className="text-[14px] leading-relaxed text-arx-mist">
                Mudar <strong className="text-white">{acao.empresa.name}</strong> de {getPlano(acao.empresa.plano).nome} para{" "}
                <strong className="text-white">{getPlano(acao.plano).nome}</strong> ({formatarBRL(getPlano(acao.plano).preco)}/mês)?
                Os limites novos valem na hora.
              </p>
            )}
            {acao.tipo === "suspender" && (
              <p className="text-[14px] leading-relaxed text-arx-mist">
                {acao.empresa.suspensa
                  ? <>A equipe da <strong className="text-white">{acao.empresa.name}</strong> volta a acessar o painel e o link de cadastro volta a funcionar.</>
                  : <>A equipe da <strong className="text-white">{acao.empresa.name}</strong> deixa de acessar o painel e o link de cadastro de profissionais sai do ar. Nenhum dado é apagado.</>}
              </p>
            )}
            {acao.tipo === "observacao" && (
              <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={4} maxLength={1000} autoFocus
                placeholder="Ex.: paga por PIX todo dia 10; contato com a Ana"
                className="w-full rounded-lg border border-white/10 bg-arx-obsidian p-3 text-[14px] text-white placeholder:text-arx-slate focus:border-arx-crew-soft focus:outline-none" />
            )}
            <div className="mt-6 flex gap-3">
              <button onClick={() => setAcao(null)} className="flex-1 rounded-lg border border-white/15 py-2.5 text-[14px] text-arx-frost hover:bg-white/5">Cancelar</button>
              <button onClick={confirmar} disabled={salvando}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-[14px] font-semibold text-white disabled:opacity-60 ${acao.tipo === "suspender" && !acao.empresa.suspensa ? "bg-red-500/80 hover:bg-red-500" : "bg-arx-crew-strong hover:bg-arx-crew"}`}>
                {salvando && <Loader2 size={15} className="animate-spin" />} Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {aviso && (
        <div role="status" className="fixed bottom-6 right-6 z-50 rounded-lg border border-white/10 bg-arx-surface-2 px-4 py-3 text-[14px] text-white shadow-2xl">{aviso}</div>
      )}
    </div>
  );
}
