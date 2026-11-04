"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Check, Loader2, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { chamarApi } from "@/lib/api";
import { formatarBRL } from "@/lib/validacao";

type Estado =
  | { tipo: "gerando" }
  | { tipo: "erro"; msg: string }
  | { tipo: "aguardando"; qr: string; imagem: string; valor: number; expira: string }
  | { tipo: "pago" };

// QR Code PIX do Mercado Pago de uma fatura. Fica conferindo o pagamento
// enquanto está na tela e avisa quando a fatura é baixada.
// Recebe o id da fatura (quem está logado) ou o token do link público.
export default function PagarPix({ faturaId, token, aoPagar }: { faturaId?: string; token?: string; aoPagar?: () => void }) {
  const [estado, setEstado] = useState<Estado>({ tipo: "gerando" });
  const [copiado, setCopiado] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    chamarApi<{ qr: string; expira_em: string; valor: number }>("/api/pagamento/pix", { fatura_id: faturaId, token }).then(async (r) => {
      if (!ativo) return;
      if (!r.ok) { setEstado({ tipo: "erro", msg: r.erro }); return; }
      const imagem = await QRCode.toDataURL(r.qr, { margin: 1, width: 440, color: { dark: "#000000", light: "#ffffff" } });
      if (ativo) setEstado({ tipo: "aguardando", qr: r.qr, imagem, valor: r.valor, expira: r.expira_em });
    });
    return () => { ativo = false; };
  }, [faturaId, token, tentativa]);

  const aguardando = estado.tipo === "aguardando";
  useEffect(() => {
    if (!aguardando) return;
    const t = setInterval(async () => {
      const r = await chamarApi<{ status: string }>("/api/pagamento/status", { fatura_id: faturaId, token });
      if (r.ok && r.status === "paga") {
        clearInterval(t);
        setEstado({ tipo: "pago" });
        aoPagar?.();
      }
    }, 4000);
    return () => clearInterval(t);
  }, [aguardando, faturaId, token, aoPagar]);

  if (estado.tipo === "gerando") {
    return <div className="flex flex-col items-center gap-3 py-10 text-sm text-gray-400"><Loader2 size={24} className="animate-spin" /> Gerando o PIX...</div>;
  }
  if (estado.tipo === "erro") {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center text-sm text-red-300">
        <AlertTriangle size={24} /> {estado.msg}
        <button onClick={() => { setEstado({ tipo: "gerando" }); setTentativa((n) => n + 1); }}
          className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs text-gray-200 hover:bg-white/5"><RefreshCw size={13} /> Tentar de novo</button>
      </div>
    );
  }
  if (estado.tipo === "pago") {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <CheckCircle2 size={44} className="text-emerald-400" />
        <p className="text-lg font-semibold text-white">Pagamento confirmado!</p>
        <p className="text-sm text-gray-400">A fatura foi baixada e o comprovante vai por e-mail.</p>
      </div>
    );
  }

  const copiar = () => {
    navigator.clipboard.writeText(estado.qr);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };
  const expira = new Date(estado.expira).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-2xl font-bold tabular-nums text-white">{formatarBRL(estado.valor)}</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={estado.imagem} alt="QR Code PIX" width={220} height={220} className="rounded-xl bg-white p-2" />
      <button onClick={copiar}
        className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-sm text-gray-100 hover:border-violet-500">
        {copiado ? <><Check size={14} className="text-emerald-400" /> Código copiado</> : <><Copy size={14} /> Copiar PIX copia e cola</>}
      </button>
      <p className="flex items-center gap-2 text-xs text-gray-400"><Loader2 size={12} className="animate-spin" /> Aguardando o pagamento. A confirmação é automática.</p>
      <p className="text-[11px] text-gray-500">Código válido até {expira}.</p>
    </div>
  );
}
