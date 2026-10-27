"use client";

import { useCallback, useEffect, useState } from "react";
import { UserCog, Copy, Trash2, Send } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { BASE_PATH } from "../../lib/base-path";
import { getPlano } from "../../lib/planos";
import { NOME_PAPEL } from "../../lib/permissoes";

interface Membro { id: string; nome: string | null; email: string; role: string }
interface Convite { id: string; email: string; role: string; token: string }

const PAPEIS = [
  { id: "operacional", nome: "Operacional", desc: "escalas e base, sem valores" },
  { id: "financeiro", nome: "Financeiro", desc: "tudo menos Configurações" },
  { id: "admin", nome: "Administrador", desc: "acesso total" },
];

// Usuários do painel: convites, papéis e remoção. Só para administradores.
export default function EquipeCard({ companyId, plano, meuId, avisar }: {
  companyId: string; plano?: string | null; meuId?: string; avisar: (msg: string, tipo: "sucesso" | "erro") => void;
}) {
  const atual = getPlano(plano);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [convites, setConvites] = useState<Convite[]>([]);
  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState("operacional");

  const buscar = useCallback(() => Promise.all([
    supabase.rpc("listar_equipe"),
    supabase.from("convites_equipe").select("id, email, role, token").eq("company_id", companyId).is("aceito_em", null),
  ]), [companyId]);

  const aplicar = useCallback(([m, c]: Awaited<ReturnType<typeof buscar>>) => {
    setMembros((m.data as Membro[]) ?? []);
    setConvites((c.data as Convite[]) ?? []);
  }, []);

  useEffect(() => { buscar().then(aplicar); }, [buscar, aplicar]);
  const recarregar = () => buscar().then(aplicar);

  const linkConvite = (token: string) => `${window.location.origin}${BASE_PATH}/criar-conta?convite=${token}`;
  const vagas = atual.maxUsuarios - membros.length - convites.length;

  const convidar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) { avisar("Informe um e-mail válido", "erro"); return; }
    const { data, error } = await supabase.from("convites_equipe")
      .insert({ company_id: companyId, email: email.trim().toLowerCase(), role: papel }).select("token").single();
    if (error) { avisar("Não foi possível criar o convite", "erro"); return; }
    navigator.clipboard.writeText(linkConvite(data.token));
    avisar("Convite criado. Link copiado: envie para a pessoa.", "sucesso");
    setEmail("");
    recarregar();
  };

  const remover = async (id: string) => {
    const { data } = await supabase.rpc("remover_membro", { p_user: id });
    avisar(data === "ok" ? "Usuário removido" : "Não foi possível remover", data === "ok" ? "sucesso" : "erro");
    recarregar();
  };

  const mudarPapel = async (id: string, role: string) => {
    const { data } = await supabase.rpc("alterar_papel", { p_user: id, p_role: role });
    avisar(data === "ok" ? "Papel atualizado" : "Não foi possível alterar", data === "ok" ? "sucesso" : "erro");
    recarregar();
  };

  const cancelarConvite = async (id: string) => {
    await supabase.from("convites_equipe").delete().eq("id", id);
    recarregar();
  };

  return (
    <div className="bg-[#121212] border border-[#222] rounded-xl p-6">
      <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-1"><UserCog size={18} className="text-violet-400" /> Usuários do Painel</h3>
      <p className="text-sm text-gray-500 mb-4">Quem da sua empresa acessa o ARXUM Crew.</p>

      <ul className="space-y-2 mb-4">
        {membros.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 rounded-lg bg-[#0a0a0a] border border-[#222] px-4 py-2.5">
            <div className="min-w-0">
              <p className="text-sm text-gray-200 truncate">{m.email}{m.id === meuId && <span className="text-gray-500"> (você)</span>}</p>
            </div>
            {m.id === meuId ? (
              <span className="text-xs text-gray-400">{NOME_PAPEL[m.role] ?? m.role}</span>
            ) : (
              <div className="flex items-center gap-2">
                <select value={m.role === "super_admin" ? "admin" : m.role} onChange={(e) => mudarPapel(m.id, e.target.value)}
                  className="bg-[#121212] border border-[#333] rounded-md px-2 py-1 text-xs text-gray-200">
                  {PAPEIS.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
                <button onClick={() => remover(m.id)} title="Remover" className="p-1.5 text-gray-500 hover:text-red-400"><Trash2 size={15} /></button>
              </div>
            )}
          </li>
        ))}
        {convites.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-[#333] px-4 py-2.5">
            <p className="text-sm text-gray-400 truncate">{c.email} · convite pendente ({NOME_PAPEL[c.role]})</p>
            <div className="flex items-center gap-1">
              <button onClick={() => { navigator.clipboard.writeText(linkConvite(c.token)); avisar("Link do convite copiado", "sucesso"); }}
                title="Copiar link" className="p-1.5 text-gray-500 hover:text-white"><Copy size={15} /></button>
              <button onClick={() => cancelarConvite(c.id)} title="Cancelar convite" className="p-1.5 text-gray-500 hover:text-red-400"><Trash2 size={15} /></button>
            </div>
          </li>
        ))}
      </ul>

      {atual.maxUsuarios <= 1 ? (
        <p className="text-sm text-gray-500 rounded-lg bg-[#0a0a0a] border border-[#222] px-4 py-3">
          Vários usuários com permissões fazem parte do plano <strong className="text-gray-300">Empresa</strong>.
        </p>
      ) : vagas <= 0 ? (
        <p className="text-sm text-gray-500">Todas as {atual.maxUsuarios} vagas de usuário estão em uso.</p>
      ) : (
        <form onSubmit={convidar} className="flex flex-col sm:flex-row gap-2">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@suaempresa.com.br"
            className="flex-1 bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white focus:border-violet-500 focus:outline-none" />
          <select value={papel} onChange={(e) => setPapel(e.target.value)} title={PAPEIS.find((p) => p.id === papel)?.desc}
            className="bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-gray-200">
            {PAPEIS.map((p) => <option key={p.id} value={p.id}>{p.nome} — {p.desc}</option>)}
          </select>
          <button type="submit" className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
            <Send size={15} /> Convidar
          </button>
        </form>
      )}
    </div>
  );
}
