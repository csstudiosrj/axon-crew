"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Mail, Plus, MessageCircle, Ban, RotateCcw, StickyNote, ExternalLink, Users, CalendarDays,
  UserCheck, MapPin, MessagesSquare, Save,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { chamarApi } from "@/lib/api";
import { BASE_PATH } from "@/lib/base-path";
import { PLANOS, getPlano, type PlanoId } from "@/lib/planos";
import { getSegmento } from "@/lib/segmentos";
import { NOME_PAPEL } from "@/lib/permissoes";
import { dataBR, formatarBRL } from "@/lib/validacao";
import {
  card, campo, botaoPrimario, botaoSecundario, COR_PLANO, Kpi, Barras, Modal, BotoesModal, Rotulo, Carregando, Vazio,
  tempoDesde, dataHora, rotuloMes, usePainelAdmin,
} from "@/components/admin/ui";
import { TabelaFaturas, NovaFatura, nomeEmail, type Fatura } from "@/components/admin/Faturas";
import { AcaoEmpresa, type Acao } from "@/components/admin/AcaoEmpresa";
import { STATUS_CHAMADO, type ChamadoResumo } from "@/components/admin/tipos";

interface Detalhe {
  empresa: {
    id: string; name: string; slug: string; segmento: string | null; plano: PlanoId; suspensa: boolean;
    suspensa_em: string | null; whatsapp: string | null; email_cobranca: string | null; dia_vencimento: number | null;
    observacao_admin: string | null; created_at: string; plano_atualizado_em: string | null;
  };
  usuarios: { email: string; nome: string | null; papel: string; criado_em: string; ultimo_acesso: string | null }[];
  totais: { profissionais: number; trabalhos: number; escalas: number; confirmacoes: number; checkins: number };
  atividade: { mes: string; trabalhos: number; profissionais: number; escalas: number }[];
  ultimos_trabalhos: { titulo: string; data: string; status: string; created_at: string; pessoas: number }[];
  emails: { tipo: string; para: string; assunto: string; status: string; erro: string | null; automatico: boolean; enviado_em: string }[];
  chamados: Pick<ChamadoResumo, "id" | "numero" | "assunto" | "status" | "ultima_msg_em">[];
}

const STATUS_TRABALHO: Record<string, string> = { orcamento: "Orçamento", confirmado: "Confirmado", montagem: "Em andamento", encerrado: "Encerrado" };

// Ficha completa de uma empresa cliente: uso, equipe, faturas, e-mails e suporte.
export default function AdminEmpresa() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { avisar, atualizarContadores } = usePainelAdmin();
  const [d, setD] = useState<Detalhe | null>(null);
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [agora, setAgora] = useState(0);
  const [cobranca, setCobranca] = useState({ email: "", dia: "" });
  const [acao, setAcao] = useState<Acao | null>(null);
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [novaFatura, setNovaFatura] = useState(false);
  const [mensagem, setMensagem] = useState<null | { via: "email" | "suporte"; assunto: string; texto: string }>(null);

  const carregar = useCallback(async () => {
    const [det, fat] = await Promise.all([
      supabase.rpc("admin_empresa", { p_company: id }),
      supabase.rpc("admin_faturas", { p_company: id }),
    ]);
    const detalhe = det.data as Detalhe | null;
    setD(detalhe);
    setFaturas((fat.data as Fatura[]) ?? []);
    if (detalhe) setCobranca({ email: detalhe.empresa.email_cobranca ?? "", dia: detalhe.empresa.dia_vencimento ? String(detalhe.empresa.dia_vencimento) : "" });
    setAgora(Date.now());
  }, [id]);

  useEffect(() => { Promise.resolve().then(carregar); }, [carregar]);

  if (!d) return <Carregando />;
  if (!d.empresa) return <Vazio>Empresa não encontrada.</Vazio>;

  const e = d.empresa;
  const plano = getPlano(e.plano);
  const admin = d.usuarios.find((u) => u.papel === "admin" || u.papel === "super_admin") ?? d.usuarios[0];
  const pendentes = faturas.filter((f) => f.status === "pendente");
  const vencido = pendentes.filter((f) => f.dias_atraso > 0).reduce((s, f) => s + Number(f.valor), 0);
  const pago = faturas.filter((f) => f.status === "paga").reduce((s, f) => s + Number(f.valor_pago ?? f.valor), 0);
  const taxaConfirmacao = d.totais.escalas ? Math.round((d.totais.confirmacoes / d.totais.escalas) * 100) : null;

  const confirmarAcao = async () => {
    if (!acao) return;
    setSalvando(true);
    const { error } =
      acao.tipo === "plano"
        ? await supabase.rpc("admin_alterar_plano", { p_company: e.id, p_plano: acao.plano })
        : acao.tipo === "suspender"
          ? await supabase.rpc("admin_suspender", { p_company: e.id, p_suspensa: !e.suspensa })
          : await supabase.rpc("admin_salvar_observacao", { p_company: e.id, p_texto: observacao });
    setSalvando(false);
    if (error) { avisar("Não foi possível salvar. Tente de novo."); return; }
    avisar("Alteração salva.");
    setAcao(null);
    carregar();
    atualizarContadores();
  };

  const salvarCobranca = async () => {
    const dia = cobranca.dia ? Number(cobranca.dia) : null;
    if (dia !== null && (dia < 1 || dia > 28)) { avisar("O dia de vencimento vai de 1 a 28."); return; }
    const { error } = await supabase.rpc("admin_atualizar_empresa", { p_company: e.id, p_email_cobranca: cobranca.email, p_dia_vencimento: dia });
    avisar(error ? "Não foi possível salvar." : "Dados de cobrança salvos.");
    if (!error) carregar();
  };

  const enviarMensagem = async () => {
    if (!mensagem) return;
    setSalvando(true);
    if (mensagem.via === "email") {
      const r = await chamarApi("/api/admin/email", { acao: "livre", company_id: e.id, assunto: mensagem.assunto, mensagem: mensagem.texto });
      setSalvando(false);
      if (!r.ok) { avisar(`E-mail não enviado: ${r.erro}`); return; }
      avisar("E-mail enviado.");
    } else {
      const { data, error } = await supabase.rpc("admin_abrir_chamado", { p_company: e.id, p_assunto: mensagem.assunto, p_texto: mensagem.texto });
      setSalvando(false);
      if (error) { avisar("Não foi possível abrir a conversa."); return; }
      chamarApi("/api/suporte/notificar", { chamado_id: data });
      router.push(`/admin/suporte?chamado=${data}`);
      return;
    }
    setMensagem(null);
    carregar();
  };

  return (
    <div className="space-y-6">
      <Link href="/admin/empresas" className="inline-flex items-center gap-1.5 text-[13px] text-arx-mist hover:text-white"><ArrowLeft size={14} /> Empresas</Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="flex flex-wrap items-center gap-3 text-[26px] font-semibold text-white">
            {e.name}
            <select value={e.plano} aria-label="Plano" onChange={(ev) => setAcao({ tipo: "plano", empresa: e, plano: ev.target.value as PlanoId })}
              className={`rounded-full border px-2.5 py-1 text-[12px] font-normal ${COR_PLANO[e.plano]}`}>
              {PLANOS.map((p) => <option key={p.id} value={p.id} className="bg-arx-surface text-white">{p.nome} · {formatarBRL(p.preco)}</option>)}
            </select>
            {e.suspensa && <span className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase text-red-300">Suspensa desde {dataBR(e.suspensa_em)}</span>}
          </h1>
          <p className="mt-1 text-[14px] text-arx-mist">
            {getSegmento(e.segmento).nome} · cliente desde {dataBR(e.created_at)}
            {e.plano_atualizado_em ? ` · plano alterado em ${dataBR(e.plano_atualizado_em)}` : ""}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-arx-slate">
            {admin && <span>{admin.nome ? `${admin.nome} · ` : ""}{admin.email}</span>}
            {e.whatsapp && <span>{e.whatsapp}</span>}
            <a href={`${BASE_PATH}/cadastro/${e.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-white">/{e.slug} <ExternalLink size={12} /></a>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setMensagem({ via: "suporte", assunto: "", texto: "" })} className={botaoPrimario}><MessagesSquare size={16} /> Conversar</button>
          <button onClick={() => setMensagem({ via: "email", assunto: "", texto: "" })} className={botaoSecundario}><Mail size={16} /> E-mail</button>
          {e.whatsapp && (
            <a href={`https://wa.me/55${e.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className={botaoSecundario}><MessageCircle size={16} /> WhatsApp</a>
          )}
          <button onClick={() => { setObservacao(e.observacao_admin ?? ""); setAcao({ tipo: "observacao", empresa: e }); }} className={botaoSecundario} title="Observação interna"><StickyNote size={16} /></button>
          <button onClick={() => setAcao({ tipo: "suspender", empresa: e })} className={`${botaoSecundario} ${e.suspensa ? "text-emerald-300" : "hover:text-red-300"}`}>
            {e.suspensa ? <><RotateCcw size={16} /> Reativar</> : <><Ban size={16} /> Suspender</>}
          </button>
        </div>
      </div>

      {e.observacao_admin && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-[14px] text-amber-100/90">
          <StickyNote size={15} className="mt-0.5 shrink-0 text-amber-300" /> {e.observacao_admin}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi icone={Users} rotulo="Profissionais" valor={String(d.totais.profissionais)} sub={plano.maxProfissionais ? `limite ${plano.maxProfissionais}` : "sem limite"} />
        <Kpi icone={CalendarDays} rotulo="Trabalhos" valor={String(d.totais.trabalhos)} sub={`${d.totais.escalas} escalações`} />
        <Kpi icone={UserCheck} rotulo="Confirmação" valor={taxaConfirmacao === null ? "—" : `${taxaConfirmacao}%`} sub={`${d.totais.confirmacoes} confirmaram pelo link`} />
        <Kpi icone={MapPin} rotulo="Check-ins" valor={String(d.totais.checkins)} sub="presenças registradas" />
        <Kpi rotulo="Financeiro" valor={vencido > 0 ? formatarBRL(vencido) : "Em dia"} tom={vencido > 0 ? "ruim" : "bom"}
          sub={vencido > 0 ? "vencido" : `${formatarBRL(pago)} pagos no total`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className={`${card} p-5 lg:col-span-2`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-white">Atividade nos últimos 6 meses</h2>
            <span className="text-[12px] text-arx-slate">trabalhos criados por mês</span>
          </div>
          <Barras dados={d.atividade.map((m) => ({ rotulo: rotuloMes(m.mes), valor: Number(m.trabalhos) }))} formatar={String} />
          <div className="mt-4 grid grid-cols-6 gap-2 text-center text-[11px] text-arx-slate">
            {d.atividade.map((m) => (
              <span key={m.mes}>{m.escalas} escal. · {m.profissionais} prof.</span>
            ))}
          </div>
        </section>

        <section className={`${card} space-y-3 p-5`}>
          <h2 className="text-[15px] font-semibold text-white">Dados de cobrança</h2>
          <div>
            <Rotulo htmlFor="email-cobranca">E-mail que recebe as faturas</Rotulo>
            <input id="email-cobranca" type="email" value={cobranca.email} onChange={(ev) => setCobranca({ ...cobranca, email: ev.target.value })}
              placeholder={admin?.email ?? "e-mail do administrador"} className={campo} />
            <p className="mt-1 text-[12px] text-arx-slate">Em branco: usa o e-mail do administrador da conta.</p>
          </div>
          <div>
            <Rotulo htmlFor="dia-venc">Dia de vencimento</Rotulo>
            <input id="dia-venc" type="number" min={1} max={28} value={cobranca.dia} onChange={(ev) => setCobranca({ ...cobranca, dia: ev.target.value })}
              placeholder="padrão da plataforma" className={campo} />
          </div>
          <button onClick={salvarCobranca} className={`${botaoSecundario} w-full`}><Save size={15} /> Salvar</button>
        </section>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[17px] font-semibold text-white">Faturas</h2>
          <button onClick={() => setNovaFatura(true)} className={botaoSecundario}><Plus size={16} /> Nova fatura</button>
        </div>
        <TabelaFaturas faturas={faturas} aoMudar={carregar} mostrarEmpresa={false} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={card}>
          <h2 className="border-b border-white/10 px-5 py-3.5 text-[15px] font-semibold text-white">Usuários ({d.usuarios.length}/{plano.maxUsuarios})</h2>
          <ul className="divide-y divide-white/5">
            {d.usuarios.map((u) => (
              <li key={u.email} className="flex items-center justify-between gap-3 px-5 py-3 text-[14px]">
                <div className="min-w-0">
                  <p className="truncate text-white">{u.nome || u.email}</p>
                  <p className="truncate text-[12px] text-arx-slate">{u.email} · {NOME_PAPEL[u.papel as keyof typeof NOME_PAPEL] ?? u.papel}</p>
                </div>
                <span className="shrink-0 text-[12px] text-arx-mist">acesso {tempoDesde(u.ultimo_acesso, agora)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={card}>
          <h2 className="border-b border-white/10 px-5 py-3.5 text-[15px] font-semibold text-white">Últimos trabalhos</h2>
          {d.ultimos_trabalhos.length === 0 ? <Vazio>Nenhum trabalho criado ainda.</Vazio> : (
            <ul className="divide-y divide-white/5">
              {d.ultimos_trabalhos.map((t, i) => (
                <li key={i} className="flex items-center justify-between gap-3 px-5 py-3 text-[14px]">
                  <div className="min-w-0">
                    <p className="truncate text-white">{t.titulo}</p>
                    <p className="text-[12px] text-arx-slate">{dataBR(t.data)} · {t.pessoas} {t.pessoas === 1 ? "pessoa" : "pessoas"} · criado em {dataBR(t.created_at)}</p>
                  </div>
                  <span className="shrink-0 text-[12px] text-arx-mist">{STATUS_TRABALHO[t.status] ?? t.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={card}>
          <h2 className="border-b border-white/10 px-5 py-3.5 text-[15px] font-semibold text-white">E-mails enviados</h2>
          {d.emails.length === 0 ? <Vazio>Nenhum e-mail enviado para esta empresa.</Vazio> : (
            <ul className="max-h-[420px] divide-y divide-white/5 overflow-y-auto">
              {d.emails.map((m, i) => (
                <li key={i} className="px-5 py-3 text-[14px]">
                  <p className="flex items-center justify-between gap-3">
                    <span className="truncate text-white">{nomeEmail(m.tipo)}</span>
                    <span className="shrink-0 text-[12px] text-arx-slate">{dataHora(m.enviado_em)}</span>
                  </p>
                  <p className="truncate text-[12px] text-arx-slate">
                    {m.automatico ? "automático" : "manual"} · {m.para}
                    {m.status === "erro" && <span className="text-red-300"> · falhou: {m.erro}</span>}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={card}>
          <h2 className="border-b border-white/10 px-5 py-3.5 text-[15px] font-semibold text-white">Suporte</h2>
          {d.chamados.length === 0 ? <Vazio>Nenhuma conversa com esta empresa.</Vazio> : (
            <ul className="divide-y divide-white/5">
              {d.chamados.map((c) => (
                <li key={c.id}>
                  <Link href={`/admin/suporte?chamado=${c.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-[14px] hover:bg-white/[0.02]">
                    <span className="truncate text-white">nº {c.numero} · {c.assunto}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CHAMADO[c.status].cor}`}>{STATUS_CHAMADO[c.status].nome}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {acao && (
        <AcaoEmpresa acao={acao} observacao={observacao} setObservacao={setObservacao}
          salvando={salvando} aoFechar={() => setAcao(null)} aoConfirmar={confirmarAcao} />
      )}

      {novaFatura && <NovaFatura companyId={e.id} aoFechar={() => setNovaFatura(false)} aoCriar={() => { setNovaFatura(false); carregar(); }} />}

      {mensagem && (
        <Modal titulo={mensagem.via === "email" ? `E-mail para ${e.name}` : `Nova conversa com ${e.name}`} aoFechar={() => setMensagem(null)} largura="max-w-lg">
          <p className="mb-4 text-[13px] text-arx-mist">
            {mensagem.via === "email"
              ? <>Vai para {e.email_cobranca || admin?.email}, com o visual dos e-mails do Crew. As respostas chegam no e-mail de suporte.</>
              : <>A mensagem aparece no Suporte do painel da empresa, e a empresa recebe um aviso por e-mail.</>}
          </p>
          <div className="space-y-3">
            <div>
              <Rotulo htmlFor="msg-assunto">Assunto</Rotulo>
              <input id="msg-assunto" value={mensagem.assunto} onChange={(ev) => setMensagem({ ...mensagem, assunto: ev.target.value })} className={campo} maxLength={140} />
            </div>
            <div>
              <Rotulo htmlFor="msg-texto">Mensagem</Rotulo>
              <textarea id="msg-texto" value={mensagem.texto} onChange={(ev) => setMensagem({ ...mensagem, texto: ev.target.value })} rows={7} className={campo} />
            </div>
          </div>
          <BotoesModal aoCancelar={() => setMensagem(null)} aoConfirmar={enviarMensagem} salvando={salvando} rotulo="Enviar"
            desabilitado={mensagem.assunto.trim().length < 3 || !mensagem.texto.trim()} />
        </Modal>
      )}
    </div>
  );
}
