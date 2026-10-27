"use client";

import { useEffect, useState } from "react";
import { Users, Save } from "lucide-react";
import { supabase } from "../../lib/supabase";

interface Equipe { id: string; nome: string; membros: string[] }
interface Pessoa { id: string; especialidade: string }
interface SlotEscala { id: string; especialidade: string; quantidade: number; designados: Pessoa[]; recusados?: Pessoa[] }

// Salva quem está escalado como uma equipe e aplica equipes salvas nas vagas
// livres de outro trabalho (cada pessoa entra numa vaga da sua função).
export default function EquipesSalvas({ companyId, eventoId, slots, todos, aoMudar, avisar }: {
  companyId: string;
  eventoId: string;
  slots: SlotEscala[];
  todos: Pessoa[];
  aoMudar: () => void;
  avisar: (msg: string, tipo: "sucesso" | "erro") => void;
}) {
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    supabase.from("equipes").select("id, nome, membros").eq("company_id", companyId).order("nome")
      .then(({ data }) => setEquipes((data as Equipe[]) ?? []));
  }, [companyId]);

  const escalados = slots.flatMap((s) => s.designados.map((d) => d.id));

  const salvar = async () => {
    if (!nome.trim() || escalados.length === 0) return;
    setSalvando(true);
    const { data, error } = await supabase.from("equipes")
      .insert({ company_id: companyId, nome: nome.trim(), membros: escalados }).select("id, nome, membros").single();
    setSalvando(false);
    if (error) { avisar("Não foi possível salvar a equipe", "erro"); return; }
    setEquipes([...equipes, data as Equipe].sort((a, b) => a.nome.localeCompare(b.nome)));
    setNome("");
    avisar(`Equipe "${data.nome}" salva com ${escalados.length} pessoas`, "sucesso");
  };

  const aplicar = async (equipe: Equipe) => {
    const noEvento = new Set(slots.flatMap((s) => [...s.designados, ...(s.recusados ?? [])].map((d) => d.id)));
    const livres = new Map(slots.map((s) => [s.id, s.quantidade - s.designados.length]));
    const novos: { evento_id: string; slot_id: string; freelancer_id: string; status_pagamento: string }[] = [];
    let semVaga = 0;
    for (const id of equipe.membros) {
      if (noEvento.has(id)) continue;
      const pessoa = todos.find((p) => p.id === id);
      const slot = pessoa && slots.find((s) => s.especialidade === pessoa.especialidade && (livres.get(s.id) ?? 0) > 0);
      if (!slot) { semVaga++; continue; }
      livres.set(slot.id, (livres.get(slot.id) ?? 0) - 1);
      novos.push({ evento_id: eventoId, slot_id: slot.id, freelancer_id: id, status_pagamento: "pendente" });
    }
    if (novos.length === 0) { avisar(semVaga ? "Não há vagas livres para as funções desta equipe" : "Essa equipe já está toda escalada", "erro"); return; }
    const { error } = await supabase.from("evento_escalas").insert(novos);
    if (error) { avisar("Não foi possível aplicar a equipe", "erro"); return; }
    avisar(`${novos.length} escalado(s)${semVaga ? `, ${semVaga} sem vaga da função` : ""}`, "sucesso");
    aoMudar();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-3 rounded-xl border border-[#222] bg-[#121212] p-4 mb-6">
      <div className="flex-1">
        <p className="text-xs text-gray-500 mb-2 flex items-center gap-1.5"><Users size={13} /> Equipes salvas</p>
        {equipes.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma ainda. Salve a escala atual para reaproveitar depois.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {equipes.map((e) => (
              <button key={e.id} onClick={() => aplicar(e)} title="Escalar esta equipe nas vagas livres"
                className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-200 hover:bg-violet-500/20">
                {e.nome} · {e.membros.length}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2 lg:w-80">
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da equipe" maxLength={80}
          className="flex-1 bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none" />
        <button onClick={salvar} disabled={salvando || !nome.trim() || escalados.length === 0}
          title={escalados.length === 0 ? "Escale alguém primeiro" : "Salvar quem está escalado"}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm text-white hover:bg-violet-500 disabled:opacity-40">
          <Save size={14} /> Salvar
        </button>
      </div>
    </div>
  );
}
