"use client";

import { BellRing, MessageCircle } from "lucide-react";
import { BASE_PATH } from "../../lib/base-path";
import { de, type Termos } from "../../lib/segmentos";

const isoLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Lista quem trabalha hoje e amanhã, com o lembrete pronto para o WhatsApp.
// Envio manual: o envio automático depende da API oficial do WhatsApp.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Lembretes({ eventos, termos }: { eventos: any[]; termos: Termos }) {
  const hoje = new Date();
  const amanha = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
  const dias = { [isoLocal(hoje)]: "hoje", [isoLocal(amanha)]: "amanhã" };

  const itens = eventos
    .filter((e) => dias[e.data])
    .flatMap((e) => e.slots.flatMap((s: { especialidade: string; designados: { escala_id: string; nome: string; telefone?: string; token: string; resposta: string }[] }) =>
      s.designados.map((p) => ({ evento: e, funcao: s.especialidade, pessoa: p }))));

  if (itens.length === 0) return null;

  const link = (it: (typeof itens)[number]) => {
    const tel = it.pessoa.telefone?.replace(/\D/g, "");
    if (!tel) return null;
    const quando = dias[it.evento.data];
    const hora = it.evento.horario_inicio ? ` às ${it.evento.horario_inicio.slice(0, 5)}` : "";
    const confirmar = it.pessoa.resposta === "confirmado"
      ? "Chegando lá, registre a chegada pelo seu link:"
      : "Você ainda não confirmou. Confirme pelo seu link:";
    const msg = `Olá ${it.pessoa.nome.split(" ")[0]}! Lembrete ${de(termos.job, termos.generoJob)} *${it.evento.titulo}* ${quando}${hora}, em ${it.evento.local} (${it.funcao}).\n\n${confirmar}\n${window.location.origin}${BASE_PATH}/confirmar/${it.pessoa.token}`;
    return `https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="bg-[#121212] border border-[#222] rounded-xl p-5">
      <h3 className="text-base font-medium text-white mb-1 flex items-center gap-2">
        <BellRing size={18} className="text-violet-400" /> Lembretes
      </h3>
      <p className="text-xs text-gray-500 mb-4">Quem trabalha hoje e amanhã.</p>
      <ul className="space-y-2">
        {itens.map((it) => {
          const href = link(it);
          return (
            <li key={it.pessoa.escala_id} className="flex items-center justify-between gap-2 rounded-lg bg-[#0a0a0a] border border-[#222] px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm text-gray-200">{it.pessoa.nome}</p>
                <p className="truncate text-xs text-gray-500">{dias[it.evento.data]} · {it.evento.titulo}</p>
              </div>
              {href && (
                <a href={href} target="_blank" rel="noopener noreferrer" title="Enviar lembrete pelo WhatsApp"
                  className="shrink-0 rounded-md p-1.5 text-gray-500 hover:bg-green-500/10 hover:text-green-400">
                  <MessageCircle size={16} />
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
