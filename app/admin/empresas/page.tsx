"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Download, MessageCircle, Ban, RotateCcw, StickyNote, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PLANOS, getPlano, type PlanoId } from "@/lib/planos";
import { getSegmento } from "@/lib/segmentos";
import { dataBR, formatarBRL } from "@/lib/validacao";
import { card, campo, botaoSecundario, COR_PLANO, Carregando, Vazio, tempoDesde, usePainelAdmin } from "@/components/admin/ui";
import type { Empresa } from "@/components/admin/tipos";
import { AcaoEmpresa, type Acao } from "@/components/admin/AcaoEmpresa";
import type { Fatura } from "@/components/admin/Faturas";

interface Financeiro { aberto: number; vencido: number; maiorAtraso: number; informou: boolean }

// Todas as empresas: plano, uso, situação financeira e suspensão.
export default function AdminEmpresas() {
  const { avisar, atualizarContadores } = usePainelAdmin();
  const [empresas, setEmpresas] = useState<Empresa[] | null>(null);
  const [financeiro, setFinanceiro] = useState<Map<string, Financeiro>>(new Map());
  const [busca, setBusca] = useState("");
  const [filtroPlano, setFiltroPlano] = useState<"todos" | PlanoId>("todos");
  const [filtroStatus, setFiltroStatus] = useState<"todas" | "ativas" | "suspensas" | "inadimplentes">("todas");
  const [acao, setAcao] = useState<Acao | null>(null);
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [agora, setAgora] = useState(0);

  const buscar = useCallback(async () => {
    const [e, f] = await Promise.all([supabase.rpc("admin_empresas"), supabase.rpc("admin_faturas")]);
    const mapa = new Map<string, Financeiro>();
    for (const fat of (f.data as Fatura[]) ?? []) {
      if (fat.status !== "pendente") continue;
      const atual = mapa.get(fat.company_id) ?? { aberto: 0, vencido: 0, maiorAtraso: 0, informou: false };
      atual.aberto += Number(fat.valor);
      if (fat.dias_atraso > 0) atual.vencido += Number(fat.valor);
      atual.maiorAtraso = Math.max(atual.maiorAtraso, fat.dias_atraso);
      atual.informou ||= !!fat.pagamento_informado_em;
      mapa.set(fat.company_id, atual);
    }
    setFinanceiro(mapa);
    setEmpresas((e.data as Empresa[]) ?? []);
    setAgora(Date.now());
  }, []);

  useEffect(() => { Promise.resolve().then(buscar); }, [buscar]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (empresas ?? []).filter((e) =>
      (filtroPlano === "todos" || e.plano === filtroPlano) &&
      (filtroStatus === "todas" ||
        (filtroStatus === "inadimplentes" ? (financeiro.get(e.id)?.vencido ?? 0) > 0 : (filtroStatus === "suspensas") === e.suspensa)) &&
      (!termo || [e.name, e.slug, e.email_admin ?? ""].some((v) => v.toLowerCase().includes(termo))));
  }, [empresas, financeiro, busca, filtroPlano, filtroStatus]);

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
    atualizarContadores();
  };

  const exportar = () => {
    const linhas = [
      ["Empresa", "Link", "Segmento", "Plano", "Status", "E-mail", "WhatsApp", "Cadastro", "Último acesso", "Usuários", "Profissionais", "Trabalhos no mês", "Trabalhos no total", "Em aberto", "Vencido", "Observação"],
      ...filtradas.map((e) => [
        e.name, e.slug, getSegmento(e.segmento).nome, getPlano(e.plano).nome, e.suspensa ? "Suspensa" : "Ativa",
        e.email_admin ?? "", e.whatsapp ?? "", dataBR(e.created_at), e.ultimo_acesso ? dataBR(e.ultimo_acesso) : "",
        String(e.usuarios), String(e.profissionais), String(e.trabalhos_mes), String(e.trabalhos_total),
        (financeiro.get(e.id)?.aberto ?? 0).toFixed(2).replace(".", ","), (financeiro.get(e.id)?.vencido ?? 0).toFixed(2).replace(".", ","),
        e.observacao_admin ?? "",
      ]),
    ];
    const csv = "﻿" + linhas.map((l) => l.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    a.download = `empresas-crew-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (!empresas) return <Carregando />;

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-arx-slate" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por empresa, link ou e-mail"
            className={`${campo} bg-arx-surface pl-9`} />
        </div>
        <select value={filtroPlano} onChange={(e) => setFiltroPlano(e.target.value as typeof filtroPlano)}
          className="rounded-lg border border-white/10 bg-arx-surface px-3 py-2.5 text-[14px] text-white">
          <option value="todos">Todos os planos</option>
          {PLANOS.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as typeof filtroStatus)}
          className="rounded-lg border border-white/10 bg-arx-surface px-3 py-2.5 text-[14px] text-white">
          <option value="todas">Todas as empresas</option>
          <option value="ativas">Só ativas</option>
          <option value="suspensas">Só suspensas</option>
          <option value="inadimplentes">Com fatura vencida</option>
        </select>
        <button onClick={exportar} className={botaoSecundario}><Download size={16} /> CSV</button>
      </div>

      <p className="mt-4 text-[13px] text-arx-slate">{filtradas.length} de {empresas.length} empresas</p>

      <div className={`${card} mt-2 overflow-x-auto`}>
        <table className="w-full min-w-[1150px] text-[14px]">
          <thead className="border-b border-white/10 text-left text-[12px] text-arx-slate">
            <tr>
              <th className="px-5 py-3 font-medium">Empresa</th>
              <th className="px-3 py-3 font-medium">Plano</th>
              <th className="px-3 py-3 font-medium">Financeiro</th>
              <th className="px-3 py-3 text-right font-medium">Profissionais</th>
              <th className="px-3 py-3 text-right font-medium">Trabalhos no mês</th>
              <th className="px-3 py-3 text-right font-medium">Usuários</th>
              <th className="px-3 py-3 font-medium">Último acesso</th>
              <th className="px-5 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtradas.length === 0 && <tr><td colSpan={8}><Vazio>Nenhuma empresa encontrada.</Vazio></td></tr>}
            {filtradas.map((e) => {
              const plano = getPlano(e.plano);
              const fin = financeiro.get(e.id);
              const perto = (usado: number, max: number | null) => max !== null && usado >= max * 0.8;
              return (
                <tr key={e.id} className={e.suspensa ? "opacity-60" : ""}>
                  <td className="px-5 py-3.5">
                    <Link href={`/admin/empresas/${e.id}`} className="flex items-center gap-2 font-medium text-white hover:text-arx-crew-soft">
                      {e.name}
                      {e.suspensa && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-300">Suspensa</span>}
                    </Link>
                    <p className="text-[12px] text-arx-slate">{getSegmento(e.segmento).nome} · desde {dataBR(e.created_at)}{e.email_admin ? ` · ${e.email_admin}` : ""}</p>
                    {e.observacao_admin && <p className="mt-1 flex items-start gap-1.5 text-[12px] text-amber-200/80"><StickyNote size={12} className="mt-0.5 shrink-0" /> {e.observacao_admin}</p>}
                  </td>
                  <td className="px-3 py-3.5">
                    <select value={e.plano} aria-label={`Plano de ${e.name}`}
                      onChange={(ev) => setAcao({ tipo: "plano", empresa: e, plano: ev.target.value as PlanoId })}
                      className={`rounded-full border px-2.5 py-1 text-[12px] ${COR_PLANO[e.plano]}`}>
                      {PLANOS.map((p) => <option key={p.id} value={p.id} className="bg-arx-surface text-white">{p.nome}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-3.5 text-[13px]">
                    {!fin ? <span className="text-emerald-300/80">Em dia</span>
                      : fin.vencido > 0
                        ? <span className="text-red-300">{formatarBRL(fin.vencido)} vencido<br /><span className="text-[12px] text-arx-slate">há {fin.maiorAtraso} {fin.maiorAtraso === 1 ? "dia" : "dias"}{fin.informou ? " · informou pagamento" : ""}</span></span>
                        : <span className="text-amber-300">{formatarBRL(fin.aberto)} a vencer{fin.informou ? <><br /><span className="text-[12px] text-sky-300">informou pagamento</span></> : null}</span>}
                  </td>
                  <td className={`px-3 py-3.5 text-right tabular-nums ${perto(e.profissionais, plano.maxProfissionais) ? "text-amber-300" : ""}`}>
                    {e.profissionais}{plano.maxProfissionais ? <span className="text-arx-slate">/{plano.maxProfissionais}</span> : null}
                  </td>
                  <td className={`px-3 py-3.5 text-right tabular-nums ${perto(e.trabalhos_mes, plano.maxTrabalhosMes) ? "text-amber-300" : ""}`}>
                    {e.trabalhos_mes}{plano.maxTrabalhosMes ? <span className="text-arx-slate">/{plano.maxTrabalhosMes}</span> : null}
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums">{e.usuarios}<span className="text-arx-slate">/{plano.maxUsuarios}</span></td>
                  <td className="px-3 py-3.5 text-arx-mist">{tempoDesde(e.ultimo_acesso, agora)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      {e.whatsapp && (
                        <a href={`https://wa.me/55${e.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" title="WhatsApp da empresa"
                          className="rounded-md p-2 text-arx-slate hover:bg-white/5 hover:text-white"><MessageCircle size={16} /></a>
                      )}
                      <button onClick={() => { setObservacao(e.observacao_admin ?? ""); setAcao({ tipo: "observacao", empresa: e }); }} title="Observação interna"
                        className="rounded-md p-2 text-arx-slate hover:bg-white/5 hover:text-white"><StickyNote size={16} /></button>
                      <button onClick={() => setAcao({ tipo: "suspender", empresa: e })} title={e.suspensa ? "Reativar conta" : "Suspender conta"}
                        className={`rounded-md p-2 hover:bg-white/5 ${e.suspensa ? "text-emerald-400" : "text-arx-slate hover:text-red-300"}`}>
                        {e.suspensa ? <RotateCcw size={16} /> : <Ban size={16} />}
                      </button>
                      <Link href={`/admin/empresas/${e.id}`} title="Abrir empresa" className="rounded-md p-2 text-arx-slate hover:bg-white/5 hover:text-white"><ChevronRight size={16} /></Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[12px] text-arx-slate">Números em amarelo: acima de 80% do limite do plano.</p>

      {acao && (
        <AcaoEmpresa acao={acao} observacao={observacao} setObservacao={setObservacao}
          salvando={salvando} aoFechar={() => setAcao(null)} aoConfirmar={confirmar} />
      )}
    </>
  );
}
