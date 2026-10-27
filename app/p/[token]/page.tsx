"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight, MessageCircle } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { getSegmento, maiuscula } from "../../../lib/segmentos";
import { dataBR, formatarBRL } from "../../../lib/validacao";
import { MolduraPublica, CabecalhoEmpresa, Carregando, NaoEncontrado } from "../../../components/publico/MolduraPublica";

interface Trabalho {
  token: string;
  titulo: string;
  data: string;
  horario_inicio: string | null;
  local: string;
  funcao: string;
  valor: number;
  resposta: "pendente" | "confirmado" | "recusado";
  checkin_em: string | null;
  status_pagamento: "pendente" | "pago";
  data_pagamento: string | null;
}

interface Area {
  profissional: { nome: string; especialidade: string };
  empresa: { name: string; logo_url: string | null; primary_color: string | null; segmento: string | null; whatsapp: string | null };
  hoje: string;
  trabalhos: Trabalho[];
}

const RESPOSTA: Record<Trabalho["resposta"], { rotulo: string; classe: string }> = {
  pendente:   { rotulo: "Responder", classe: "bg-amber-500/10 text-amber-300" },
  confirmado: { rotulo: "Confirmado", classe: "bg-emerald-500/10 text-emerald-300" },
  recusado:   { rotulo: "Recusado", classe: "bg-white/5 text-arx-slate" },
};

// Área pessoal do profissional: convites, agenda e pagamentos na empresa.
export default function AreaProfissionalPage() {
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";
  const [area, setArea] = useState<Area | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!token) return;
    supabase.rpc("area_profissional", { p_token: token }).then(({ data }) => {
      setArea(data as Area | null);
      setCarregando(false);
    });
  }, [token]);

  if (carregando) return <Carregando />;
  if (!area) return <NaoEncontrado titulo="Link não encontrado" texto="Peça um novo link para a empresa." />;

  const cor = area.empresa.primary_color ?? "#8b5cf6";
  const termos = getSegmento(area.empresa.segmento).termos;
  const proximos = area.trabalhos.filter((t) => t.data >= area.hoje).reverse();
  const anteriores = area.trabalhos.filter((t) => t.data < area.hoje && t.resposta === "confirmado");
  const aReceber = anteriores.filter((t) => t.status_pagamento === "pendente").reduce((s, t) => s + Number(t.valor), 0);
  const recebido = anteriores.filter((t) => t.status_pagamento === "pago").reduce((s, t) => s + Number(t.valor), 0);

  return (
    <MolduraPublica>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-arx-surface">
        <CabecalhoEmpresa nome={area.empresa.name} logo={area.empresa.logo_url} cor={cor}
          subtitulo={`Olá, ${area.profissional.nome.split(" ")[0]}`} />

        <div className="grid grid-cols-2 border-b border-white/10">
          <div className="border-r border-white/10 px-5 py-4">
            <p className="text-[12px] text-arx-slate">A receber</p>
            <p className="mt-1 text-[18px] font-semibold text-white">{formatarBRL(aReceber)}</p>
          </div>
          <div className="px-5 py-4">
            <p className="text-[12px] text-arx-slate">Recebido (últimos 4 meses)</p>
            <p className="mt-1 text-[18px] font-semibold text-white">{formatarBRL(recebido)}</p>
          </div>
        </div>

        <Secao titulo={`${termos.generoJob === "f" ? "Próximas" : "Próximos"} ${termos.jobs}`}>
          {proximos.length === 0 ? (
            <p className="px-5 py-6 text-center text-[14px] text-arx-slate">Nenhum convite no momento.</p>
          ) : proximos.map((t) => (
            <Link key={t.token} href={`/confirmar/${t.token}`} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-white/[0.03]">
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-medium text-arx-frost">{t.titulo}</span>
                <span className="block text-[12px] text-arx-slate">{dataBR(t.data)}{t.horario_inicio ? ` · ${t.horario_inicio.slice(0, 5)}` : ""} · {t.funcao} · {formatarBRL(t.valor)}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <span className={`rounded-full px-2.5 py-1 text-[11px] ${RESPOSTA[t.resposta].classe}`}>{RESPOSTA[t.resposta].rotulo}</span>
                <ChevronRight size={15} className="text-arx-slate" />
              </span>
            </Link>
          ))}
        </Secao>

        <Secao titulo={`${maiuscula(termos.jobs)} realizados e pagamentos`}>
          {anteriores.length === 0 ? (
            <p className="px-5 py-6 text-center text-[14px] text-arx-slate">Nada por aqui ainda.</p>
          ) : anteriores.map((t) => (
            <div key={t.token} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <span className="min-w-0">
                <span className="block truncate text-[14px] text-arx-frost">{t.titulo}</span>
                <span className="block text-[12px] text-arx-slate">{dataBR(t.data)} · {formatarBRL(t.valor)}</span>
              </span>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] ${t.status_pagamento === "pago" ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}>
                {t.status_pagamento === "pago" ? `Pago ${t.data_pagamento ? dataBR(t.data_pagamento) : ""}` : "A receber"}
              </span>
            </div>
          ))}
        </Secao>

        {area.empresa.whatsapp && (
          <a href={`https://wa.me/55${area.empresa.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 border-t border-white/10 px-6 py-4 text-[14px] text-arx-mist hover:text-white">
            <MessageCircle size={16} /> Falar com a {area.empresa.name}
          </a>
        )}
      </div>
      <p className="mt-4 text-center text-[12px] text-arx-slate">Este link é pessoal. Não compartilhe.</p>
    </MolduraPublica>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-white/10 last:border-b-0">
      <h2 className="px-5 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-arx-slate">{titulo}</h2>
      <div className="divide-y divide-white/5">{children}</div>
    </section>
  );
}
