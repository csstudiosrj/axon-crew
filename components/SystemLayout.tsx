"use client";

import React, { useEffect, useState } from "react";
import {
  Users, CalendarDays, DollarSign, ClipboardList,
  Settings, LogOut, ChevronLeft, ChevronRight, BarChart3, Lock, CreditCard, LifeBuoy, Ban
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { maiuscula } from "@/lib/segmentos";
import { podeAcessar } from "@/lib/permissoes";
import { CrewMark } from "@/components/marketing/CrewLogo";
import { supabase } from "@/lib/supabase";

// Rotas abertas ao público: renderizadas sem a sidebar do sistema.
// /documento usa login, mas é renderizado sem a sidebar para imprimir.
const ROTAS_PUBLICAS = ["/login", "/criar-conta", "/recuperar-senha", "/redefinir-senha", "/cadastro", "/roteiro", "/confirmar", "/p/", "/documento", "/admin"];

const CREW = "#8b5cf6";

// Com a conta suspensa, só estas telas continuam abertas.
const LIBERADAS_NA_SUSPENSAO = ["/assinatura", "/suporte"];

export default function SystemLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Páginas públicas — sem layout, sem restrição de altura
  if (pathname === "/" || ROTAS_PUBLICAS.some((r) => pathname.startsWith(r))) {
    return <>{children}</>;
  }

  return <PainelInterno pathname={pathname}>{children}</PainelInterno>;
}

// Sistema interno — layout fixo com sidebar. Os nomes do menu seguem o
// vocabulário do segmento da empresa.
function PainelInterno({ pathname, children }: { pathname: string; children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { termos, company, papel, suspensa, ready, signOut } = useAuth();
  const [naoLidas, setNaoLidas] = useState(0);

  // Respostas da ARXUM no suporte ainda não lidas.
  useEffect(() => {
    if (!ready) return;
    const contar = () => supabase.from("chamado_mensagens").select("id", { count: "exact", head: true })
      .eq("autor_arxum", true).is("lida_em", null).then(({ count }) => setNaoLidas(count ?? 0));
    contar();
    const t = setInterval(contar, 60_000);
    return () => clearInterval(t);
  }, [ready, pathname]);

  const menuItems = [
    { name: `Base de ${maiuscula(termos.profissionais)}`, icon: Users,         path: "/freelas" },
    { name: `Agenda & ${maiuscula(termos.jobs)}`,         icon: CalendarDays,  path: "/agenda" },
    { name: `Financeiro & PIX`,                           icon: DollarSign,    path: "/financeiro" },
    { name: maiuscula(termos.roteiros),                   icon: ClipboardList, path: "/callsheets" },
    { name: "Relatórios",                                 icon: BarChart3,     path: "/relatorios" },
    { name: "Configurações",                              icon: Settings,      path: "/configuracoes" },
    { name: "Assinatura",                                 icon: CreditCard,    path: "/assinatura" },
    { name: "Suporte",                                    icon: LifeBuoy,      path: "/suporte", contador: naoLidas },
  ].filter((m) => podeAcessar(papel, m.path) && (!suspensa || LIBERADAS_NA_SUSPENSAO.includes(m.path)));
  const semAcesso = ready && !podeAcessar(papel, pathname);
  const bloqueada = ready && suspensa && !LIBERADAS_NA_SUSPENSAO.some((r) => pathname.startsWith(r));

  return (
    <div style={{ display: "flex", height: "100vh", width: "100%", overflow: "hidden", fontFamily: "var(--font-dm-sans), sans-serif" }}>

      {/* SIDEBAR */}
      <aside style={{
        display: "flex", flexDirection: "column",
        width: isCollapsed ? 80 : 256,
        minWidth: isCollapsed ? 80 : 256,
        background: "#111820",
        borderRight: "1px solid rgba(216,228,240,0.08)",
        transition: "width 0.3s ease",
        position: "relative",
        zIndex: 20,
      }}>
        <button onClick={() => setIsCollapsed(!isCollapsed)} aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"} style={{
          position: "absolute", right: -12, top: 24,
          background: "#182030", border: "1px solid #2a3444",
          borderRadius: "50%", width: 24, height: 24,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", zIndex: 30, color: "#9aabbd",
        }}>
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: 10, justifyContent: isCollapsed ? "center" : "flex-start" }}>
          <CrewMark size={24} />
          {!isCollapsed && (
            <span className="font-logo" style={{ fontSize: "0.95rem", fontWeight: 800, letterSpacing: "-0.03em", whiteSpace: "nowrap" }}>
              <span style={{ color: CREW }}>ARXUM</span> <span style={{ color: "#fff" }}>Crew</span>
            </span>
          )}
        </div>

        <nav style={{ flex: 1, padding: "0.5rem 0.75rem", display: "flex", flexDirection: "column", gap: 4, overflowY: "auto" }}>
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link key={item.path} href={item.path} title={isCollapsed ? item.name : ""} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "0.625rem 0.75rem", borderRadius: "0.5rem",
                fontSize: "0.875rem", fontWeight: 500,
                textDecoration: "none",
                background: isActive ? "rgba(139,92,246,0.12)" : "transparent",
                color: isActive ? "#c4b5fd" : "#9aabbd",
                border: isActive ? "1px solid rgba(139,92,246,0.3)" : "1px solid transparent",
                transition: "all 0.15s",
              }}>
                <item.icon size={20} style={{ minWidth: 20 }} />
                {!isCollapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{item.name}</span>}
                {!!item.contador && (
                  <span style={{ background: "#7c3aed", color: "#fff", borderRadius: 999, fontSize: 11, fontWeight: 600, padding: "1px 7px" }}>{item.contador}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: "0.75rem", borderTop: "1px solid rgba(216,228,240,0.08)" }}>
          <button onClick={signOut} title={isCollapsed ? "Sair" : ""} style={{
            display: "flex", alignItems: "center", gap: 12,
            width: "100%", padding: "0.625rem 0.75rem",
            borderRadius: "0.5rem", fontSize: "0.875rem",
            background: "none", border: "none", cursor: "pointer",
            color: "#5e7a94", transition: "all 0.15s",
          }}>
            <LogOut size={20} style={{ minWidth: 20 }} />
            {!isCollapsed && <span>Sair do Sistema</span>}
          </button>
        </div>
      </aside>

      {/* CONTEÚDO */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        <header style={{
          height: 64, minHeight: 64,
          background: "#0b0f14", borderBottom: "1px solid rgba(216,228,240,0.08)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 2rem", zIndex: 10,
        }}>
          <p style={{ fontSize: "0.875rem", color: "#5e7a94", margin: 0 }}>
            {menuItems.find((m) => m.path === pathname)?.name ?? ""}
          </p>
          {company?.name && (
            <p style={{ fontSize: "0.875rem", color: "#9aabbd", margin: 0 }}>{company.name}</p>
          )}
        </header>

        <main style={{ flex: 1, overflowY: "auto", position: "relative" }}>
          {bloqueada ? (
            <div style={{ padding: "4rem 2rem", textAlign: "center", color: "#9aabbd", maxWidth: 520, margin: "0 auto" }}>
              <Ban size={32} style={{ margin: "0 auto 1rem", color: "#f87171" }} />
              <p style={{ color: "#fff", fontWeight: 600, fontSize: "1.1rem", marginBottom: 8 }}>O acesso desta empresa está suspenso</p>
              <p style={{ fontSize: "0.9rem", lineHeight: 1.6 }}>
                Seus dados continuam guardados. Regularize a assinatura para liberar o painel, ou fale com a gente pelo suporte.
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
                {podeAcessar(papel, "/assinatura") && (
                  <Link href="/assinatura" style={{ background: "#7c3aed", color: "#fff", padding: "0.7rem 1.2rem", borderRadius: 8, fontSize: "0.9rem", fontWeight: 600, textDecoration: "none" }}>Ver assinatura</Link>
                )}
                <Link href="/suporte" style={{ border: "1px solid rgba(216,228,240,0.15)", color: "#d8e4f0", padding: "0.7rem 1.2rem", borderRadius: 8, fontSize: "0.9rem", textDecoration: "none" }}>Falar com o suporte</Link>
              </div>
            </div>
          ) : semAcesso ? (
            <div style={{ padding: "4rem 2rem", textAlign: "center", color: "#9aabbd" }}>
              <Lock size={32} style={{ margin: "0 auto 1rem", color: "#5e7a94" }} />
              <p style={{ color: "#fff", fontWeight: 600, marginBottom: 4 }}>Esta área não está liberada para o seu perfil.</p>
              <p style={{ fontSize: "0.875rem" }}>Peça acesso a um administrador da empresa.</p>
            </div>
          ) : children}
        </main>
      </div>
    </div>
  );
}
