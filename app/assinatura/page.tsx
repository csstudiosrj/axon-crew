"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Gem, Receipt, CheckCircle2, Clock, AlertTriangle, LifeBuoy, CreditCard, Loader2, QrCode, CalendarClock, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { chamarApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { PLANOS, getPlano, type PlanoId } from "@/lib/planos";
import { invalidarEmpresa } from "@/lib/auth-context";
import { dataBR, formatarBRL } from "@/lib/validacao";
import PagarPix from "@/components/PagarPix";

interface Fatura {
  id: string;
  numero: number;
  descricao: string;
  valor: number;
  vencimento: string;
  status: "pendente" | "paga" | "cancelada";
  pago_em: string | null;
  valor_pago: number | null;
  plano_destino: PlanoId | null;
}

interface MinhaEmpresa {
  plano: PlanoId;
  dia_vencimento: number | null;
  plano_proximo: PlanoId | null;
  plano_proximo_em: string | null;
  pago_ate: string | null;
}

const hojeISO = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

// Mensagem ao voltar do checkout do Mercado Pago (?pagamento=... na URL).
const MENSAGEM_RETORNO: Record<string, string> = {
  sucesso: "Pagamento recebido! Estamos confirmando com o Mercado Pago, leva só alguns instantes.",
  pendente: "Pagamento em processamento. Quando o Mercado Pago confirmar, a fatura é baixada sozinha.",
  falha: "O pagamento não foi concluído. Você pode tentar de novo.",
};

// Plano da empresa e faturas da ARXUM, pagas por PIX ou cartão (Mercado Pago)
// com baixa automática.
export default function AssinaturaPage() {
  const { company, ready, suspensa } = useAuth();
  const [faturas, setFaturas] = useState<Fatura[] | null>(null);
  const [hoje, setHoje] = useState("");
  const [empresa, setEmpresa] = useState<MinhaEmpresa | null>(null);
  const [anual, setAnual] = useState(false);
  const [trocando, setTrocando] = useState<PlanoId | null>(null);
  const [aviso, setAviso] = useState("");
  const [pagando, setPagando] = useState<string | null>(null);
  const [pix, setPix] = useState<string | null>(null);
  const retorno = useRef<string | null | undefined>(undefined);

  const carregar = useCallback(async () => {
    const [f, m] = await Promise.all([
      supabase.from("faturas").select("id, numero, descricao, valor, vencimento, status, pago_em, valor_pago, plano_destino")
        .neq("status", "cancelada").order("vencimento", { ascending: false }),
      supabase.rpc("minha_empresa"),
    ]);
    setEmpresa(m.data as MinhaEmpresa);
    setFaturas((f.data as Fatura[]) ?? []);
    setHoje(hojeISO());
  }, []);

  useEffect(() => { if (ready) Promise.resolve().then(carregar); }, [ready, carregar]);

  // Voltando do checkout: mostra o resultado e, como o aviso do Mercado Pago
  // pode chegar alguns segundos depois, confere as faturas de novo algumas vezes.
  useEffect(() => {
    if (!ready) return;
    if (retorno.current === undefined) {
      retorno.current = new URLSearchParams(window.location.search).get("pagamento");
      window.history.replaceState(null, "", window.location.pathname);
    }
    const resultado = retorno.current;
    if (!resultado || !MENSAGEM_RETORNO[resultado]) return;
    Promise.resolve().then(() => {
      setAviso(MENSAGEM_RETORNO[resultado]);
      setTimeout(() => setAviso(""), 8000);
    });
    if (resultado === "falha") return;
    let tentativas = 0;
    const timer = setInterval(() => { carregar(); if (++tentativas >= 6) clearInterval(timer); }, 5000);
    return () => clearInterval(timer);
  }, [ready, carregar]);

  const avisar = (msg: string) => { setAviso(msg); setTimeout(() => setAviso(""), 3500); };

  // Plano maior gera uma fatura de mudança (o QR Code abre na hora); plano
  // menor fica agendado para o mês seguinte.
  const trocarPlano = async (destino: PlanoId) => {
    setTrocando(destino);
    const { data, error } = await supabase.rpc("pedir_plano", { p_plano: destino, p_anual: anual });
    setTrocando(null);
    if (error || !data) { avisar("Não foi possível pedir a troca. Tente de novo."); return; }
    if (data.tipo === "erro") { avisar(data.mensagem); return; }
    await carregar();
    if (data.tipo === "fatura") {
      setPix(data.fatura_id);
      avisar("Pague a fatura abaixo: o plano novo é liberado assim que o pagamento cair.");
    } else if (data.a_partir) {
      avisar(`Pronto. O plano ${getPlano(destino).nome} vale a partir de ${dataBR(data.a_partir)}.`);
    }
  };

  const desistir = async () => {
    await supabase.rpc("desistir_troca_plano");
    setPix(null);
    await carregar();
    avisar("Pedido de troca de plano desfeito.");
  };

  const aoPagar = () => {
    invalidarEmpresa();
    setTimeout(carregar, 2500);
  };

  const pagarOnline = async (f: Fatura) => {
    setPagando(f.id);
    const r = await chamarApi<{ url: string }>("/api/pagamento/mercadopago", { fatura_id: f.id });
    if (r.ok) {
      window.location.assign(r.url);
      return;
    }
    setPagando(null);
    avisar(r.erro);
  };

  if (!ready || !faturas) {
    return <div className="p-8 flex items-center justify-center h-full"><p className="text-gray-500 animate-pulse">Carregando assinatura...</p></div>;
  }

  const plano = getPlano(empresa?.plano ?? company?.plano);
  const abertas = faturas.filter((f) => f.status === "pendente").sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const historico = faturas.filter((f) => f.status === "paga");
  const anualAte = empresa?.pago_ate && empresa.pago_ate >= hoje ? empresa.pago_ate : null;
  const atraso = (f: Fatura) => Math.round((Date.parse(hoje) - Date.parse(f.vencimento)) / 86_400_000);

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto w-full space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Assinatura</h2>
        <p className="text-sm text-gray-500 mt-1">Seu plano no ARXUM Crew, faturas e pagamento.</p>
      </div>

      {suspensa && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-300" />
          <p>O acesso da empresa está suspenso. Assim que o pagamento for confirmado, o painel volta a funcionar com todos os seus dados.</p>
        </div>
      )}

      <section className="bg-[#121212] border border-[#222] rounded-xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2"><Gem size={18} className="text-violet-400" /> Plano {plano.nome}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {plano.preco === 0 ? "Gratuito" : anualAte ? `Anual, pago até ${dataBR(anualAte)}` : `${formatarBRL(plano.preco)}/mês`} · {plano.descricao}
            </p>
          </div>
          {empresa?.dia_vencimento && plano.preco > 0 && !anualAte && (
            <p className="text-sm text-gray-400">Vencimento todo dia <span className="text-white">{empresa.dia_vencimento}</span></p>
          )}
        </div>

        {empresa?.plano_proximo && empresa.plano_proximo_em && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <span className="flex items-center gap-2"><CalendarClock size={16} /> Seu plano muda para {getPlano(empresa.plano_proximo).nome} em {dataBR(empresa.plano_proximo_em)}.</span>
            <button onClick={desistir} className="text-xs underline underline-offset-2 hover:text-white">Manter o plano atual</button>
          </div>
        )}

        {!suspensa && !anualAte && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">Trocar de plano</p>
              <div className="flex rounded-lg border border-[#333] p-0.5 text-xs">
                {[false, true].map((a) => (
                  <button key={String(a)} onClick={() => setAnual(a)}
                    className={`rounded-md px-3 py-1.5 ${anual === a ? "bg-violet-600 text-white" : "text-gray-400 hover:text-white"}`}>
                    {a ? "Anual · 2 meses grátis" : "Mensal"}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {PLANOS.map((p) => {
                const atual = p.id === plano.id && !anual;
                const menor = p.preco < plano.preco && !anual;
                const indisponivel = anual && p.preco === 0;
                return (
                  <div key={p.id} className={`flex flex-col rounded-xl border p-4 ${atual ? "border-violet-500/50 bg-violet-500/10" : "border-[#222] bg-[#0d0d0d]"}`}>
                    <p className="text-sm font-semibold text-white">{p.nome}</p>
                    <p className="mt-1 text-lg font-bold tabular-nums text-white">
                      {p.preco === 0 ? "Grátis" : anual ? formatarBRL(p.preco * 10) : formatarBRL(p.preco)}
                      {p.preco > 0 && <span className="text-xs font-normal text-gray-500">{anual ? "/ano" : "/mês"}</span>}
                    </p>
                    <ul className="mt-2 flex-1 space-y-1 text-xs text-gray-400">
                      {p.itens.slice(0, 3).map((it) => <li key={it} className="flex gap-1.5"><Check size={12} className="mt-0.5 shrink-0 text-violet-400" /> {it}</li>)}
                    </ul>
                    {atual ? (
                      <p className="mt-3 text-center text-xs font-medium text-violet-200">Seu plano</p>
                    ) : indisponivel ? (
                      <p className="mt-3 text-center text-xs text-gray-600">Sem opção anual</p>
                    ) : (
                      <button onClick={() => trocarPlano(p.id)} disabled={trocando !== null}
                        className={`mt-3 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-60 ${menor ? "border border-[#333] text-gray-300 hover:border-violet-500" : "bg-violet-600 text-white hover:bg-violet-500"}`}>
                        {trocando === p.id && <Loader2 size={13} className="animate-spin" />}
                        {menor ? "Mudar no próximo mês" : p.id === plano.id ? "Pagar anual" : "Mudar agora"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Plano maior: vale assim que o pagamento é confirmado. Se o mês atual já foi pago, você paga só a diferença.
              Plano menor: vale a partir do mês seguinte, sem multa.
            </p>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Receipt size={18} className="text-violet-400" /> Faturas em aberto</h3>
        {abertas.length === 0 ? (
          <p className="bg-[#121212] border border-[#222] rounded-xl p-6 text-sm text-gray-400 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-green-400" /> Nenhuma fatura em aberto. Tudo em dia.
          </p>
        ) : abertas.map((f) => {
          const dias = atraso(f);
          return (
            <div key={f.id} className={`bg-[#121212] border rounded-xl p-6 ${dias > 0 ? "border-red-500/40" : "border-[#222]"}`}>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">Fatura nº {f.numero}</p>
                    <p className="text-white font-medium">{f.descricao}</p>
                  </div>
                  <p className="text-3xl font-bold text-white tabular-nums">{formatarBRL(Number(f.valor))}</p>
                  <p className={`text-sm flex items-center gap-1.5 ${dias > 0 ? "text-red-300" : "text-gray-400"}`}>
                    {dias > 0 ? <AlertTriangle size={14} /> : <Clock size={14} />}
                    {dias > 0 ? `Venceu em ${dataBR(f.vencimento)} (${dias} ${dias === 1 ? "dia" : "dias"} em atraso)` : dias === 0 ? "Vence hoje" : `Vence em ${dataBR(f.vencimento)}`}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button onClick={() => setPix(pix === f.id ? null : f.id)}
                      className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500">
                      <QrCode size={16} /> Pagar com PIX
                    </button>
                    <button onClick={() => pagarOnline(f)} disabled={pagando === f.id}
                      className="flex items-center gap-2 rounded-lg border border-[#333] px-4 py-2.5 text-sm text-gray-200 hover:border-violet-500 hover:text-white disabled:opacity-60">
                      {pagando === f.id ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />} Cartão
                    </button>
                    {f.plano_destino && (
                      <button onClick={desistir} className="px-2 text-sm text-gray-500 underline underline-offset-2 hover:text-white">Desistir da troca</button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">O pagamento é confirmado sozinho, na hora. Não precisa mandar comprovante.</p>
                </div>
                {pix === f.id && (
                  <div className="md:w-[300px] md:border-l md:border-[#222] md:pl-6">
                    <PagarPix faturaId={f.id} aoPagar={aoPagar} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {historico.length > 0 && (
        <section className="bg-[#121212] border border-[#222] rounded-xl overflow-hidden">
          <h3 className="px-6 py-4 border-b border-[#222] text-base font-semibold text-white">Pagamentos</h3>
          <ul className="divide-y divide-[#222]">
            {historico.map((f) => (
              <li key={f.id} className="px-6 py-3 flex items-center justify-between gap-3 text-sm">
                <span className="text-gray-300">{f.descricao}<span className="block text-xs text-gray-500">Fatura nº {f.numero}</span></span>
                <span className="text-right">
                  <span className="text-white tabular-nums">{formatarBRL(Number(f.valor_pago ?? f.valor))}</span>
                  <span className="block text-xs text-green-400">pago em {dataBR(f.pago_em)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-sm text-gray-500 flex items-center gap-2">
        <LifeBuoy size={15} /> Dúvidas sobre cobrança? <Link href="/suporte" className="text-violet-300 hover:text-white">Fale com o suporte</Link>
      </p>

      {aviso && (
        <div role="status" className="fixed bottom-6 right-6 z-[200] rounded-lg border border-violet-500/40 bg-[#181818] px-4 py-3 text-sm text-white shadow-2xl">{aviso}</div>
      )}
    </div>
  );
}
