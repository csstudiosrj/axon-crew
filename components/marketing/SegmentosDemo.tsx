"use client";

import { useState } from "react";
import { Users, CalendarDays, ClipboardList, Wallet, MessageCircle } from "lucide-react";
import { SEGMENTOS, maiuscula, de } from "../../lib/segmentos";

const LISTA = SEGMENTOS.filter((s) => s.id !== "outro");

// Mostra como o painel muda de vocabulário conforme o segmento escolhido.
export default function SegmentosDemo() {
  const [id, setId] = useState(LISTA[0].id);
  const seg = LISTA.find((s) => s.id === id)!;
  const t = seg.termos;

  const menu = [
    { icone: Users, nome: `Base de ${maiuscula(t.profissionais)}` },
    { icone: CalendarDays, nome: `Agenda & ${maiuscula(t.jobs)}` },
    { icone: ClipboardList, nome: maiuscula(t.roteiros) },
    { icone: Wallet, nome: "Financeiro & PIX" },
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
      <div role="radiogroup" aria-label="Segmentos" className="flex flex-wrap content-start gap-2">
        {LISTA.map((s) => (
          <button key={s.id} role="radio" aria-checked={s.id === id} onClick={() => setId(s.id)}
            className={`rounded-full border px-3.5 py-2 text-[14px] transition-colors ${
              s.id === id
                ? "border-arx-crew/60 bg-arx-crew/15 text-white"
                : "border-white/10 text-arx-mist hover:border-white/20 hover:text-white"
            }`}>
            {s.nome}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-arx-surface">
        <div className="grid sm:grid-cols-[200px_minmax(0,1fr)]">
          <div className="border-b border-white/10 p-4 sm:border-b-0 sm:border-r">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-arx-slate">Menu</p>
            <ul className="space-y-1">
              {menu.map(({ icone: Icone, nome }, i) => (
                <li key={i} className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] ${i === 0 ? "bg-arx-crew/15 text-white" : "text-arx-mist"}`}>
                  <Icone size={15} aria-hidden="true" className={i === 0 ? "text-arx-crew-soft" : ""} /> {nome}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-arx-slate">Funções que já vêm prontas</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {seg.especialidades.slice(0, 9).map((e) => (
                <span key={e} className="rounded-md border border-white/10 bg-arx-obsidian px-2 py-1 text-[12px] text-arx-frost">{e}</span>
              ))}
            </div>
            <p className="mt-6 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-arx-slate">
              <MessageCircle size={13} aria-hidden="true" /> Mensagem no WhatsApp
            </p>
            <div className="mt-3 max-w-[420px] rounded-xl rounded-tl-sm bg-[#1f2c34] px-3.5 py-3 text-[13px] leading-relaxed text-[#e9edef]">
              Olá, Marina! Você está na escala {de(t.job, t.generoJob)} <strong>sábado, 14h</strong>.
              Função: <strong>{seg.especialidades[0]}</strong> · {maiuscula(t.pagamento)}: R$ 250,00.
              Confirme sua presença pelo link.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
