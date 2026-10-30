"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Gem, Receipt, CheckCircle2, Clock, AlertTriangle, ArrowUpRight, LifeBuoy, MessageCircle, Copy, CreditCard, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { chamarApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { PLANOS, getPlano, linkAssinar, WHATSAPP_ARXUM } from "@/lib/planos";
import { dataBR, formatarBRL } from "@/lib/validacao";
import PixPagamento from "@/components/painel/PixPagamento";

interface Fatura {
  id: string;
  numero: number;
  descricao: string;
  valor: number;
  vencimento: string;
  status: "pendente" | "paga" | "cancelada";
  pago_em: string | null;
  valor_pago: number | null;
  pagamento_informado_em: string | null;
}

interface Pagamento {
  pix_chave: string | null;
  pix_nome: string | null;
  pix_cidade: string | null;
  whatsapp: string | null;
  email_suporte: string | null;
}

const hojeISO = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

// Mensagem ao voltar do checkout do Mercado Pago (?pagamento=... na URL).
const MENSAGEM_RETORNO: Record<string, string> = {
  sucesso: "Pagamento recebido! Estamos confirmando com o Mercado Pago, leva só alguns instantes.",
  pendente: "Pagamento em processamento. Quando o Mercado Pago confirmar, a fatura é baixada sozinha.",
  falha: "O pagamento não foi concluído. Você pode tentar de novo.",
};

// Plano da empresa, faturas da ARXUM e pagamento online (Mercado Pago) ou por PIX.
export default function AssinaturaPage() {
  const { company, ready, suspensa } = useAuth();
  const [faturas, setFaturas] = useState<Fatura[] | null>(null);
  const [pagamento, setPagamento] = useState<Pagamento | null>(null);
  const [hoje, setHoje] = useState("");
  const [diaVencimento, setDiaVencimento] = useState<number | null>(null);
  const [aviso, setAviso] = useState("");
  const [pagando, setPagando] = useState<string | null>(null);
  const retorno = useRef<string | null | undefined>(undefined);

  const carregar = useCallback(async () => {
    const [f, p, m] = await Promise.all([
      supabase.from("faturas").select("id, numero, descricao, valor, vencimento, status, pago_em, valor_pago, pagamento_informado_em")
        .neq("status", "cancelada").order("vencimento", { ascending: false }),
      supabase.rpc("dados_pagamento"),
      supabase.rpc("minha_empresa"),
    ]);
    setDiaVencimento(m.data?.dia_vencimento ?? null);
    setFaturas((f.data as Fatura[]) ?? []);
    setPagamento(p.data as Pagamento);
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

  const informar = async (f: Fatura) => {
    const { data } = await supabase.rpc("informar_pagamento", { p_fatura: f.id });
    if (data === "ok") {
      avisar("Obrigado! Vamos conferir o pagamento e confirmar por e-mail.");
      carregar();
    } else {
      avisar("Não foi possível registrar. Tente de novo.");
    }
  };

  if (!ready || !faturas) {
    return <div className="p-8 flex items-center justify-center h-full"><p className="text-gray-500 animate-pulse">Carregando assinatura...</p></div>;
  }

  const plano = getPlano(company?.plano);
  const abertas = faturas.filter((f) => f.status === "pendente").sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const historico = faturas.filter((f) => f.status === "paga");
  const proximos = PLANOS.filter((p) => p.preco > plano.preco);
  const whatsapp = (pagamento?.whatsapp ?? "").replace(/\D/g, "") || WHATSAPP_ARXUM;
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

      <section className="bg-[#121212] border border-[#222] rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2"><Gem size={18} className="text-violet-400" /> Plano {plano.nome}</h3>
            <p className="text-sm text-gray-500 mt-1">{plano.preco === 0 ? "Gratuito" : `${formatarBRL(plano.preco)}/mês`} · {plano.descricao}</p>
          </div>
          {diaVencimento && plano.preco > 0 && (
            <p className="text-sm text-gray-400">Vencimento todo dia <span className="text-white">{diaVencimento}</span></p>
          )}
        </div>
        {proximos.length > 0 && !suspensa && (
          <div className="mt-5 flex flex-wrap gap-2">
            {proximos.map((p) => (
              <a key={p.id} href={linkAssinar(p, company?.name ?? "")} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs font-medium text-violet-200 hover:bg-violet-500/20">
                Mudar para {p.nome} · {formatarBRL(p.preco)}/mês <ArrowUpRight size={13} />
              </a>
            ))}
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
                  <div className="space-y-1.5">
                    <button onClick={() => pagarOnline(f)} disabled={pagando === f.id}
                      className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-60">
                      {pagando === f.id ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />} Pagar online
                    </button>
                    <p className="text-xs text-gray-500">Pix ou cartão pelo Mercado Pago. A fatura é baixada sozinha quando o pagamento é confirmado.</p>
                  </div>
                  {f.pagamento_informado_em ? (
                    <p className="text-sm text-sky-300 flex items-center gap-1.5"><CheckCircle2 size={14} /> Pagamento informado. Estamos conferindo e confirmamos por e-mail.</p>
                  ) : (
                    <button onClick={() => informar(f)}
                      className="rounded-lg border border-[#333] px-4 py-2 text-sm text-gray-200 hover:border-violet-500 hover:text-white">
                      Já paguei
                    </button>
                  )}
                  {pagamento?.pix_chave && (
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      Chave PIX: <span className="text-gray-300">{pagamento.pix_chave}</span>
                      <button onClick={() => { navigator.clipboard.writeText(pagamento.pix_chave ?? ""); avisar("Chave copiada."); }} aria-label="Copiar chave" className="hover:text-white"><Copy size={12} /></button>
                    </p>
                  )}
                </div>
                {pagamento?.pix_chave && pagamento.pix_nome ? (
                  <PixPagamento chave={pagamento.pix_chave} nome={pagamento.pix_nome} cidade={pagamento.pix_cidade ?? undefined}
                    valor={Number(f.valor)} identificador={`CREW${f.numero}`} aoCopiar={() => avisar("Código PIX copiado.")} />
                ) : (
                  <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá! Quero pagar a fatura nº ${f.numero} do ARXUM Crew.`)}`} target="_blank" rel="noopener noreferrer"
                    className="self-center flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500">
                    <MessageCircle size={16} /> Pedir dados de pagamento
                  </a>
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
