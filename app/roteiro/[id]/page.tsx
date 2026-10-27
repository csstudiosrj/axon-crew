"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Calendar, Clock, MapPin, CheckCircle2, User } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { getSegmento, maiuscula, de } from "../../../lib/segmentos";
import { dataBR } from "../../../lib/validacao";
import { MolduraPublica, CabecalhoEmpresa, Carregando, NaoEncontrado } from "../../../components/publico/MolduraPublica";

interface Roteiro {
  empresa: { name: string; logo_url: string | null; primary_color: string | null; segmento: string | null };
  evento: { titulo: string; data: string; horario_inicio: string | null; local: string };
  equipe: { nome: string; especialidade: string; resposta: string }[];
}

// Visão da equipe escalada. A confirmação de presença é feita pelo link
// individual de cada pessoa (/confirmar/[token]).
export default function RoteiroPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [roteiro, setRoteiro] = useState<Roteiro | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase.rpc("ver_roteiro", { p_id: id }).then(({ data }) => {
      setRoteiro(data as Roteiro | null);
      setCarregando(false);
    });
  }, [id]);

  if (carregando) return <Carregando />;
  if (!roteiro) return <NaoEncontrado titulo="Link não encontrado" texto="Este link é inválido ou foi despublicado pela empresa." />;

  const { empresa, evento, equipe } = roteiro;
  const cor = empresa.primary_color ?? "#8b5cf6";
  const termos = getSegmento(empresa.segmento).termos;

  return (
    <MolduraPublica>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-arx-surface">
        <CabecalhoEmpresa nome={empresa.name} logo={empresa.logo_url} cor={cor}
          subtitulo={`${maiuscula(termos.roteiro)} ${de(termos.job, termos.generoJob)}`} />
        <div className="border-b border-white/10 px-6 py-5 text-center">
          <h2 className="text-[20px] font-semibold text-white">{evento.titulo}</h2>
          <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[13px] text-arx-mist">
            <span className="flex items-center gap-1.5"><Calendar size={13} /> {dataBR(evento.data)}</span>
            {evento.horario_inicio && <span className="flex items-center gap-1.5"><Clock size={13} /> {evento.horario_inicio.slice(0, 5)}</span>}
            <span className="flex items-center gap-1.5"><MapPin size={13} /> {evento.local}</span>
          </div>
        </div>
        <div className="p-5">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-arx-slate">Equipe escalada</p>
          <ul className="space-y-2">
            {equipe.map((p, i) => {
              const ok = p.resposta === "confirmado";
              return (
                <li key={i} className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${ok ? "border-emerald-500/20 bg-emerald-500/5" : "border-white/10 bg-arx-obsidian"}`}>
                  <span className="flex items-center gap-3">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-full ${ok ? "bg-emerald-500/15 text-emerald-400" : "bg-arx-surface-2 text-arx-slate"}`}>
                      {ok ? <CheckCircle2 size={16} /> : <User size={16} />}
                    </span>
                    <span>
                      <span className="block text-[14px] font-medium text-arx-frost">{p.nome}</span>
                      <span className="block text-[12px] text-arx-slate">{p.especialidade}</span>
                    </span>
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] ${ok ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-arx-mist"}`}>
                    {ok ? "Confirmado" : "Aguardando"}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-center text-[12px] text-arx-slate">
            Para confirmar a sua presença, use o link individual que você recebeu no WhatsApp.
          </p>
        </div>
      </div>
    </MolduraPublica>
  );
}
