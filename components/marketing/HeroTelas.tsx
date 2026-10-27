"use client";

import { useState } from "react";
import { JanelaNavegador } from "./TelaFrame";

const TELAS = [
  { id: "agenda", label: "Agenda", src: "/landing/tela-agenda.webp", alt: "Tela Agenda & Jobs: lista de eventos com a escala de cada um e alertas de equipe incompleta" },
  { id: "freelas", label: "Equipe", src: "/landing/tela-freelas.webp", alt: "Tela Base de Freelas: lista de freelancers com especialidade, avaliação, diária, chave PIX e status" },
  { id: "callsheet", label: "Escala", src: "/landing/tela-callsheets.webp", alt: "Tela Call Sheets: roteiro publicado com quem já confirmou presença e quem está aguardando" },
  { id: "financeiro", label: "Financeiro", src: "/landing/tela-financeiro.webp", alt: "Tela Financeiro & PIX: valores a pagar, pagos e atrasados por freelancer e evento" },
];

export default function HeroTelas() {
  const [ativa, setAtiva] = useState(TELAS[0]);

  return (
    <JanelaNavegador src={ativa.src} alt={ativa.alt} prioridade>
      <div role="tablist" aria-label="Telas do sistema" className="flex rounded-lg border border-white/10 bg-arx-obsidian p-0.5">
        {TELAS.map((t) => (
          <button key={t.id} role="tab" aria-selected={ativa.id === t.id} onClick={() => setAtiva(t)}
            className={`whitespace-nowrap rounded-md px-2 py-1 text-[11px] transition-colors sm:px-2.5 sm:text-[12px] ${
              ativa.id === t.id ? "bg-arx-surface-2 text-white" : "text-arx-slate hover:text-white"
            }`}>
            {t.label}
          </button>
        ))}
      </div>
    </JanelaNavegador>
  );
}
