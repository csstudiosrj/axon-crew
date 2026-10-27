"use client";

import { createContext, useContext, type ReactNode } from "react";
import { X, Loader2 } from "lucide-react";
import type { PlanoId } from "@/lib/planos";
import { dataBR } from "@/lib/validacao";

// Peças visuais do painel da ARXUM (/admin).

export const card = "rounded-xl border border-white/10 bg-arx-surface";
export const campo =
  "w-full rounded-lg border border-white/10 bg-arx-obsidian px-3 py-2.5 text-[14px] text-white placeholder:text-arx-slate focus:border-arx-crew-soft focus:outline-none";
export const botaoPrimario =
  "flex items-center justify-center gap-2 rounded-lg bg-arx-crew-strong px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-arx-crew disabled:opacity-60";
export const botaoSecundario =
  "flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-[14px] text-arx-frost hover:bg-white/5 disabled:opacity-60";

export const COR_PLANO: Record<PlanoId, string> = {
  gratis: "bg-white/5 text-arx-mist border-white/10",
  essencial: "bg-sky-500/10 text-sky-300 border-sky-500/20",
  profissional: "bg-arx-crew/15 text-arx-crew-soft border-arx-crew/30",
  empresa: "bg-amber-500/10 text-amber-300 border-amber-500/20",
};

const DIA = 24 * 60 * 60 * 1000;

export function tempoDesde(iso: string | null, agora: number) {
  if (!iso) return "nunca";
  const dias = Math.floor((agora - new Date(iso).getTime()) / DIA);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  return dataBR(iso);
}

export const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

// Contexto do painel: avisos rápidos e contador de chamados.
interface Painel {
  avisar: (msg: string) => void;
  atualizarContadores: () => void;
}
export const PainelAdmin = createContext<Painel>({ avisar: () => {}, atualizarContadores: () => {} });
export const usePainelAdmin = () => useContext(PainelAdmin);

export function Kpi({ rotulo, valor, sub, tom = "normal", icone: Icone }: {
  rotulo: string; valor: string; sub?: ReactNode; tom?: "normal" | "bom" | "alerta" | "ruim"; icone?: React.ElementType;
}) {
  const cor = { normal: "text-white", bom: "text-emerald-300", alerta: "text-amber-300", ruim: "text-red-300" }[tom];
  return (
    <div className={`${card} p-5`}>
      <p className="flex items-center gap-2 text-[13px] text-arx-mist">{Icone && <Icone size={15} className="text-arx-crew-soft" />} {rotulo}</p>
      <p className={`mt-2 text-[26px] font-semibold tabular-nums ${cor}`}>{valor}</p>
      {sub && <p className="mt-1 text-[12px] text-arx-slate">{sub}</p>}
    </div>
  );
}

export function Modal({ titulo, aoFechar, children, largura = "max-w-md" }: {
  titulo: string; aoFechar: () => void; children: ReactNode; largura?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={aoFechar}>
      <div className={`max-h-[90vh] w-full ${largura} overflow-y-auto rounded-2xl border border-white/10 bg-arx-surface p-6`}
        onClick={(e) => e.stopPropagation()} role="dialog" aria-label={titulo}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-[18px] font-semibold text-white">{titulo}</h2>
          <button onClick={aoFechar} aria-label="Fechar" className="text-arx-slate hover:text-white"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function BotoesModal({ aoCancelar, aoConfirmar, salvando, rotulo = "Confirmar", perigo = false, desabilitado = false }: {
  aoCancelar: () => void; aoConfirmar: () => void; salvando: boolean; rotulo?: string; perigo?: boolean; desabilitado?: boolean;
}) {
  return (
    <div className="mt-6 flex gap-3">
      <button onClick={aoCancelar} className={`${botaoSecundario} flex-1`}>Cancelar</button>
      <button onClick={aoConfirmar} disabled={salvando || desabilitado}
        className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-[14px] font-semibold text-white disabled:opacity-60 ${perigo ? "bg-red-500/80 hover:bg-red-500" : "bg-arx-crew-strong hover:bg-arx-crew"}`}>
        {salvando && <Loader2 size={15} className="animate-spin" />} {rotulo}
      </button>
    </div>
  );
}

export function Rotulo({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] text-arx-mist">{children}</label>;
}

export function Carregando() {
  return <div className="flex justify-center py-20"><Loader2 size={26} className="animate-spin text-arx-slate" /></div>;
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className="px-5 py-10 text-center text-[14px] text-arx-slate">{children}</p>;
}

// Barras simples (meses no eixo x).
export function Barras({ dados, formatar }: { dados: { rotulo: string; valor: number }[]; formatar: (v: number) => string }) {
  const max = Math.max(1, ...dados.map((d) => d.valor));
  return (
    <div className="flex h-40 items-end gap-2">
      {dados.map((d) => (
        <div key={d.rotulo} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
          <span className="text-[11px] tabular-nums text-arx-mist">{d.valor ? formatar(d.valor) : ""}</span>
          <div className="w-full max-w-[44px] rounded-t-md bg-arx-crew/70" style={{ height: `${Math.max(d.valor ? 4 : 1, (d.valor / max) * 100)}%` }}
            title={`${d.rotulo}: ${formatar(d.valor)}`} />
          <span className="text-[11px] text-arx-slate">{d.rotulo}</span>
        </div>
      ))}
    </div>
  );
}

export const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const rotuloMes = (iso: string) => {
  const [a, m] = iso.split("-");
  return `${MESES[Number(m) - 1]}/${a.slice(2)}`;
};

// Últimos 6 meses (incluindo o atual), no formato AAAA-MM-01.
export function ultimosMeses(agora: number, n = 6) {
  const d = new Date(agora);
  return Array.from({ length: n }, (_, i) => {
    const x = new Date(d.getFullYear(), d.getMonth() - (n - 1 - i), 1);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-01`;
  });
}
