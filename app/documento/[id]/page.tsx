"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Printer } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/auth-context";
import { clausulasTermo, VERSAO_TERMO } from "../../../lib/termo";
import { dataBR, formatarBRL, formatarCPF } from "../../../lib/validacao";

interface Escala {
  id: string;
  resposta: string;
  termo_aceito_em: string | null;
  termo_ip: string | null;
  checkin_em: string | null;
  checkout_em: string | null;
  status_pagamento: string;
  data_pagamento: string | null;
  freelancers: { nome: string; cpf: string | null; chave_pix: string | null; documentos: Record<string, { numero?: string }> | null } | null;
  evento_slots: { especialidade: string; cache_base: number } | null;
  eventos: { titulo: string; data: string; horario_inicio: string | null; local: string } | null;
}

const umDe = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);
const dataHora = (iso: string) => new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export default function DocumentoPage() {
  return <Suspense><Documento /></Suspense>;
}

// Termo aceito e recibo de pagamento, prontos para imprimir ou salvar em PDF.
function Documento() {
  const params = useParams();
  const tipo = useSearchParams().get("tipo") === "recibo" ? "recibo" : "termo";
  const id = typeof params.id === "string" ? params.id : "";
  const { company, termos, ready } = useAuth();
  const [escala, setEscala] = useState<Escala | null | undefined>(undefined);
  const [inss, setInss] = useState("");
  const [irrf, setIrrf] = useState("");
  const [iss, setIss] = useState("");

  useEffect(() => {
    if (!ready || !id) return;
    supabase.from("evento_escalas")
      .select("id, resposta, termo_aceito_em, termo_ip, checkin_em, checkout_em, status_pagamento, data_pagamento, freelancers(nome, cpf, chave_pix, documentos), evento_slots(especialidade, cache_base), eventos(titulo, data, horario_inicio, local)")
      .eq("id", id).maybeSingle()
      .then(({ data }) => {
        const e = data as unknown as Escala | null;
        setEscala(e && { ...e, freelancers: umDe(e.freelancers), evento_slots: umDe(e.evento_slots), eventos: umDe(e.eventos) });
      });
  }, [ready, id]);

  if (escala === undefined) return <p className="p-10 text-gray-500">Carregando...</p>;
  if (!escala || !escala.freelancers || !escala.eventos || !escala.evento_slots) return <p className="p-10 text-gray-500">Documento não encontrado.</p>;

  const f = escala.freelancers;
  const ev = escala.eventos;
  const bruto = Number(escala.evento_slots.cache_base);
  const descontos = [inss, irrf, iss].reduce((s, v) => s + (Number(v.replace(",", ".")) || 0), 0);
  const mei = f.documentos?.mei?.numero;

  return (
    <div className="min-h-screen bg-white text-[#111] print:bg-white">
      <div className="mx-auto max-w-[760px] px-8 py-10 font-dm">
        <div className="mb-8 flex items-center justify-between print:hidden">
          <button onClick={() => history.back()} className="text-sm text-gray-500 hover:text-black">← Voltar</button>
          <button onClick={() => window.print()} className="flex items-center gap-2 rounded-lg bg-[#7c3aed] px-4 py-2 text-sm font-semibold text-white">
            <Printer size={16} /> Imprimir / salvar PDF
          </button>
        </div>

        <p className="text-sm text-gray-500">{company?.name}</p>
        {tipo === "termo" ? (
          <>
            <h1 className="mt-1 text-2xl font-bold">Termo de prestação de serviço</h1>
            <ol className="mt-6 list-decimal space-y-3 pl-5 text-[15px] leading-relaxed">
              {clausulasTermo({
                empresa: company?.name ?? "", profissional: f.nome, cpfFinal: f.cpf?.slice(-4), funcao: escala.evento_slots.especialidade,
                trabalho: termos.job, titulo: ev.titulo, data: ev.data, horario: ev.horario_inicio, local: ev.local, valor: bruto,
              }).map((c, i) => <li key={i}>{c}</li>)}
            </ol>
            <div className="mt-8 rounded-lg border border-gray-300 p-4 text-sm">
              {escala.termo_aceito_em ? (
                <>
                  <p><strong>Aceito eletronicamente</strong> por {f.nome} em {dataHora(escala.termo_aceito_em)}.</p>
                  {escala.termo_ip && <p className="mt-1 text-gray-600">IP de origem: {escala.termo_ip}</p>}
                  <p className="mt-1 text-gray-600">Aceite feito pelo link individual enviado ao profissional. Versão do termo: {VERSAO_TERMO}.</p>
                </>
              ) : (
                <p className="text-gray-600">Este termo ainda não foi aceito pelo profissional.</p>
              )}
              {escala.checkin_em && <p className="mt-2 text-gray-600">Chegada registrada: {dataHora(escala.checkin_em)}{escala.checkout_em ? ` · saída: ${dataHora(escala.checkout_em)}` : ""}</p>}
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-1 text-2xl font-bold">Recibo de pagamento — serviço autônomo</h1>
            <p className="mt-6 text-[15px] leading-relaxed">
              Eu, <strong>{f.nome}</strong>{f.cpf ? `, CPF ${formatarCPF(f.cpf)}` : ""}{mei ? `, CNPJ MEI ${mei}` : ""}, declaro ter recebido
              de <strong>{company?.name}</strong> o valor abaixo pelo serviço de {escala.evento_slots.especialidade} prestado
              em {dataBR(ev.data)} no {termos.job} &quot;{ev.titulo}&quot;, em {ev.local}.
            </p>
            <table className="mt-6 w-full text-[15px]">
              <tbody className="divide-y divide-gray-200">
                <tr><td className="py-2">Valor do serviço</td><td className="py-2 text-right tabular-nums">{formatarBRL(bruto)}</td></tr>
                {[["INSS retido", inss, setInss], ["IRRF retido", irrf, setIrrf], ["ISS retido", iss, setIss]].map(([rotulo, valor, set]) => (
                  <tr key={rotulo as string}>
                    <td className="py-2">{rotulo as string}</td>
                    <td className="py-2 text-right">
                      <input value={valor as string} onChange={(e) => (set as (v: string) => void)(e.target.value)} placeholder="0,00" inputMode="decimal"
                        className="w-28 border-b border-gray-300 text-right tabular-nums outline-none print:border-0" />
                    </td>
                  </tr>
                ))}
                <tr className="font-bold"><td className="py-2">Valor líquido recebido</td><td className="py-2 text-right tabular-nums">{formatarBRL(bruto - descontos)}</td></tr>
              </tbody>
            </table>
            <p className="mt-4 text-sm text-gray-600">
              Pagamento {escala.status_pagamento === "pago" && escala.data_pagamento ? `realizado em ${dataBR(escala.data_pagamento)}` : "ainda não registrado como pago"}
              {f.chave_pix ? ` via PIX (chave ${f.chave_pix})` : ""}.
            </p>
            <p className="mt-2 text-xs text-gray-500 print:hidden">
              As retenções (INSS, IRRF, ISS) dependem do caso de cada profissional e da cidade. Confirme os valores com a sua contabilidade antes de emitir.
            </p>
            <div className="mt-16 grid grid-cols-2 gap-10 text-center text-sm">
              <div className="border-t border-gray-400 pt-2">{f.nome}</div>
              <div className="border-t border-gray-400 pt-2">{company?.name}</div>
            </div>
          </>
        )}
        <p className="mt-10 text-center text-xs text-gray-400">Gerado pelo ARXUM Crew em {new Date().toLocaleDateString("pt-BR")}</p>
      </div>
    </div>
  );
}
