"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { chamarApi } from "@/lib/api";
import { dataBR, formatarBRL } from "@/lib/validacao";
import { MolduraPublica, Carregando, NaoEncontrado } from "@/components/publico/MolduraPublica";
import { CrewMark } from "@/components/marketing/CrewLogo";
import PagarPix from "@/components/PagarPix";

interface Fatura {
  numero: number;
  empresa: string;
  descricao: string;
  valor: number;
  vencimento: string;
  status: "pendente" | "paga" | "cancelada";
  pago_em: string | null;
}

// Link público de pagamento de uma fatura (vai nos e-mails de cobrança):
// abre o QR Code PIX sem precisar entrar no painel. A baixa é automática.
export default function PagarFaturaPage() {
  const { token } = useParams<{ token: string }>();
  const [fatura, setFatura] = useState<Fatura | null | undefined>(undefined);

  const carregar = useCallback(() => chamarApi<Fatura>("/api/pagamento/fatura", { token })
    .then((r) => setFatura(r.ok ? r : null)), [token]);

  useEffect(() => { Promise.resolve().then(carregar); }, [carregar]);

  if (fatura === undefined) return <Carregando />;
  if (fatura === null) return <NaoEncontrado titulo="Fatura não encontrada" texto="Confira o link do e-mail ou fale com a ARXUM." />;

  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const vencida = fatura.status === "pendente" && fatura.vencimento < hoje;

  return (
    <MolduraPublica>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-arx-surface">
        <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5">
          <CrewMark size={28} />
          <div>
            <p className="font-logo text-[15px] font-extrabold tracking-[-0.03em]"><span className="text-arx-crew">ARXUM</span> <span className="text-white">Crew</span></p>
            <p className="text-[13px] text-arx-mist">Fatura nº {fatura.numero} · {fatura.empresa}</p>
          </div>
        </div>
        <div className="space-y-1 px-6 pt-5 text-[14px]">
          <p className="text-white">{fatura.descricao}</p>
          <p className={`flex items-center gap-1.5 ${vencida ? "text-red-300" : "text-arx-mist"}`}>
            {vencida ? <AlertTriangle size={14} /> : <Clock size={14} />}
            {vencida ? `Venceu em ${dataBR(fatura.vencimento)}` : `Vencimento ${dataBR(fatura.vencimento)}`}
          </p>
        </div>
        <div className="px-6 py-6">
          {fatura.status === "pendente" ? (
            <PagarPix token={token} aoPagar={() => setTimeout(carregar, 2500)} />
          ) : fatura.status === "paga" ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <CheckCircle2 size={44} className="text-emerald-400" />
              <p className="text-lg font-semibold text-white">Fatura paga</p>
              <p className="text-sm text-arx-mist">{formatarBRL(fatura.valor)} · pago em {dataBR(fatura.pago_em)}</p>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-arx-mist">Esta fatura foi cancelada e não precisa ser paga.</p>
          )}
        </div>
      </div>
    </MolduraPublica>
  );
}
