"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Building2, Receipt, LifeBuoy, Settings, LogOut, Loader2, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BASE_PATH } from "@/lib/base-path";
import CrewLogo from "@/components/marketing/CrewLogo";
import { PainelAdmin } from "@/components/admin/ui";

// Painel da ARXUM. O acesso é conferido no banco (admins_plataforma): todas as
// funções admin_* recusam quem não é da equipe; esta tela só exibe.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [estado, setEstado] = useState<"carregando" | "negado" | "ok">("carregando");
  const [contadores, setContadores] = useState({ chamados: 0, cobranca: 0 });
  const [aviso, setAviso] = useState("");

  const atualizarContadores = useCallback(() => {
    supabase.rpc("admin_resumo").then(({ data }) => {
      if (!data) return;
      setContadores({ chamados: data.chamados_abertos, cobranca: data.faturas_vencidas + data.pagamentos_informados });
    });
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace(`/login?next=${pathname}`); return; }
      const { data: admin } = await supabase.rpc("eh_admin_plataforma");
      setEstado(admin ? "ok" : "negado");
      if (admin) atualizarContadores();
    });
    // Só na entrada do painel; a troca de abas não refaz a checagem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (estado !== "ok") return;
    const t = setInterval(atualizarContadores, 60_000);
    return () => clearInterval(t);
  }, [estado, atualizarContadores]);

  const avisar = useCallback((msg: string) => {
    setAviso(msg);
    setTimeout(() => setAviso(""), 4000);
  }, []);

  const sair = async () => { await supabase.auth.signOut(); window.location.href = `${BASE_PATH}/login`; };

  if (estado === "carregando") {
    return <div className="flex min-h-screen items-center justify-center bg-arx-obsidian"><Loader2 size={28} className="animate-spin text-arx-slate" /></div>;
  }
  if (estado === "negado") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-arx-obsidian p-4 text-center font-dm">
        <div>
          <ShieldAlert size={40} className="mx-auto mb-4 text-arx-slate" />
          <h1 className="text-xl font-semibold text-white">Acesso restrito à equipe ARXUM</h1>
          <p className="mt-2 text-[14px] text-arx-mist">Esta conta não tem permissão para o painel administrativo.</p>
          <Link href="/freelas" className="mt-6 inline-block text-[14px] text-arx-crew-soft hover:text-white">Ir para o painel da empresa</Link>
        </div>
      </div>
    );
  }

  const abas = [
    { href: "/admin", rotulo: "Visão geral", icone: LayoutDashboard, ativo: pathname === "/admin" },
    { href: "/admin/empresas", rotulo: "Empresas", icone: Building2, ativo: pathname.startsWith("/admin/empresas") },
    { href: "/admin/cobranca", rotulo: "Cobrança", icone: Receipt, ativo: pathname.startsWith("/admin/cobranca"), contador: contadores.cobranca },
    { href: "/admin/suporte", rotulo: "Suporte", icone: LifeBuoy, ativo: pathname.startsWith("/admin/suporte"), contador: contadores.chamados },
    { href: "/admin/configuracoes", rotulo: "Configurações", icone: Settings, ativo: pathname.startsWith("/admin/configuracoes") },
  ];

  return (
    <PainelAdmin.Provider value={{ avisar, atualizarContadores }}>
      <div className="min-h-screen bg-arx-obsidian font-dm text-arx-frost">
        <header className="sticky top-0 z-40 border-b border-arx-line bg-arx-obsidian/95 backdrop-blur">
          <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between px-4 sm:px-8">
            <div className="flex items-center gap-3">
              <CrewLogo />
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-300">Gestão</span>
            </div>
            <button onClick={sair} className="flex items-center gap-2 text-[14px] text-arx-mist hover:text-white"><LogOut size={16} /> Sair</button>
          </div>
          <nav className="mx-auto flex w-full max-w-[1400px] gap-1 overflow-x-auto px-4 sm:px-8">
            {abas.map(({ href, rotulo, icone: Icone, ativo, contador }) => (
              <Link key={href} href={href}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-[14px] transition-colors ${ativo ? "border-arx-crew text-white" : "border-transparent text-arx-mist hover:text-white"}`}>
                <Icone size={16} /> {rotulo}
                {!!contador && <span className="rounded-full bg-arx-crew-strong px-1.5 py-px text-[11px] font-semibold tabular-nums text-white">{contador}</span>}
              </Link>
            ))}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-8">{children}</main>

        {aviso && (
          <div role="status" className="fixed bottom-6 right-6 z-[60] max-w-sm rounded-lg border border-white/10 bg-arx-surface-2 px-4 py-3 text-[14px] text-white shadow-2xl">{aviso}</div>
        )}
      </div>
    </PainelAdmin.Provider>
  );
}
