"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy } from "lucide-react";
import { pixCopiaECola } from "../../lib/pix";

// QR code e "copia e cola" para pagar um profissional no app do banco.
export default function PixPagamento({ chave, nome, valor, cidade, identificador, aoCopiar }: {
  chave: string; nome: string; valor: number; cidade?: string; identificador?: string; aoCopiar?: () => void;
}) {
  const codigo = pixCopiaECola({ chave, nome, valor, cidade, identificador });
  const [qr, setQr] = useState("");

  useEffect(() => {
    QRCode.toDataURL(codigo, { margin: 1, width: 360, color: { dark: "#000000", light: "#ffffff" } }).then(setQr);
  }, [codigo]);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {qr && <img src={qr} alt={`QR code PIX para ${nome}`} width={180} height={180} className="rounded-lg" />}
      <button onClick={() => { navigator.clipboard.writeText(codigo); aoCopiar?.(); }}
        className="flex items-center gap-1.5 rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-2 text-xs text-gray-200 hover:border-violet-500">
        <Copy size={13} /> Copiar PIX copia e cola
      </button>
      <p className="text-[11px] text-gray-500 text-center">Confira nome e valor no app do banco antes de pagar.</p>
    </div>
  );
}
