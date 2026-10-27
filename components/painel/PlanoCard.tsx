"use client";

import { useEffect, useState } from "react";
import { Gem, ArrowUpRight } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { PLANOS, getPlano, linkAssinar } from "../../lib/planos";

function Uso({ rotulo, usado, max }: { rotulo: string; usado: number; max: number | null }) {
  const pct = max ? Math.min(100, Math.round((usado / max) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-400 mb-1.5">
        <span>{rotulo}</span>
        <span className="text-gray-300">{usado}{max ? ` de ${max}` : " · ilimitado"}</span>
      </div>
      <div className="h-1.5 rounded-full bg-[#222] overflow-hidden">
        <div className={`h-full rounded-full ${pct >= 90 ? "bg-red-500" : "bg-violet-500"}`} style={{ width: max ? `${pct}%` : "100%", opacity: max ? 1 : 0.25 }} />
      </div>
    </div>
  );
}

// Plano atual, uso dos limites e atalhos para mudar de plano.
export default function PlanoCard({ companyId, plano, empresa }: { companyId: string; plano?: string | null; empresa: string }) {
  const atual = getPlano(plano);
  const [uso, setUso] = useState({ profissionais: 0, trabalhos: 0, usuarios: 1 });

  useEffect(() => {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10);
    Promise.all([
      supabase.from("freelancers").select("id", { count: "exact", head: true }).eq("company_id", companyId),
      supabase.from("eventos").select("id", { count: "exact", head: true }).eq("company_id", companyId).gte("data", inicio).lte("data", fim),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("company_id", companyId),
    ]).then(([f, e, u]) => setUso({ profissionais: f.count ?? 0, trabalhos: e.count ?? 0, usuarios: u.count ?? 1 }));
  }, [companyId]);

  const proximos = PLANOS.filter((p) => p.preco > atual.preco);

  return (
    <div className="bg-[#121212] border border-[#222] rounded-xl p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2"><Gem size={18} className="text-violet-400" /> Plano {atual.nome}</h3>
          <p className="text-sm text-gray-500 mt-1">{atual.preco === 0 ? "Gratuito" : `R$ ${atual.preco}/mês`} · {atual.descricao}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Uso rotulo="Profissionais na base" usado={uso.profissionais} max={atual.maxProfissionais} />
        <Uso rotulo="Trabalhos neste mês" usado={uso.trabalhos} max={atual.maxTrabalhosMes} />
        <Uso rotulo="Usuários do painel" usado={uso.usuarios} max={atual.maxUsuarios} />
      </div>
      {proximos.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {proximos.map((p) => (
            <a key={p.id} href={linkAssinar(p, empresa)} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs font-medium text-violet-200 hover:bg-violet-500/20">
              Mudar para {p.nome} · R$ {p.preco}/mês <ArrowUpRight size={13} />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
