"use client";

import React, { useState } from "react";
import {
  Users, CalendarDays, DollarSign, ClipboardList,
  Settings, LogOut, ChevronLeft, ChevronRight
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { maiuscula } from "@/lib/segmentos";
import { CrewMark } from "@/components/marketing/CrewLogo";

// Rotas abertas ao público: renderizadas sem a sidebar do sistema.
const ROTAS_PUBLICAS = ["/login", "/criar-conta", "/cadastro", "/roteiro"];

const CREW = "#8b5cf6";

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
  const { termos, company, signOut } = useAuth();

  const menuItems = [
    { name: `Base de ${maiuscula(termos.profissionais)}`, icon: Users,         path: "/freelas" },
    { name: `Agenda & ${maiuscula(termos.jobs)}`,         icon: CalendarDays,  path: "/agenda" },
    { name: `Financeiro & PIX`,                           icon: DollarSign,    path: "/financeiro" },
    { name: maiuscula(termos.roteiros),                   icon: ClipboardList, path: "/callsheets" },
    { name: "Configurações",                              icon: Settings,      path: "/configuracoes" },
  ];

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
                {!isCollapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>}
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
          {children}
        </main>
      </div>
    </div>
  );
}
