"use client";

import React, { useState } from "react";
import {
  Users, CalendarDays, DollarSign, ClipboardList,
  Settings, LogOut, ChevronLeft, ChevronRight, Bell
} from "lucide-react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SystemLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const menuItems = [
    { name: "Base de Freelas",  icon: Users,         path: "/" },
    { name: "Agenda & Jobs",    icon: CalendarDays,  path: "/agenda" },
    { name: "Financeiro & PIX", icon: DollarSign,    path: "/financeiro" },
    { name: "Call Sheets",      icon: ClipboardList, path: "/callsheets" },
    { name: "Configurações",    icon: Settings,      path: "/configuracoes" },
  ];

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  // Páginas públicas — sem layout, sem restrição de altura
  if (pathname === "/login" || pathname.startsWith("/cadastro")) {
    return <>{children}</>;
  }

  // Sistema interno — layout fixo com sidebar
  return (
    <div style={{ display: "flex", height: "100vh", width: "100%", overflow: "hidden", fontFamily: "sans-serif" }}>

      {/* SIDEBAR */}
      <aside style={{
        display: "flex", flexDirection: "column",
        width: isCollapsed ? 80 : 256,
        minWidth: isCollapsed ? 80 : 256,
        background: "#121212",
        borderRight: "1px solid #222",
        transition: "width 0.3s ease",
        position: "relative",
        zIndex: 20,
      }}>
        <button onClick={() => setIsCollapsed(!isCollapsed)} style={{
          position: "absolute", right: -12, top: 24,
          background: "#1a1a1a", border: "1px solid #333",
          borderRadius: "50%", width: 24, height: 24,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", zIndex: 30, color: "#999",
        }}>
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div style={{ padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: isCollapsed ? "center" : "flex-start" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", margin: 0 }}>
            <span style={{ color: "#22c55e" }}>ARXUM</span>
            {!isCollapsed && " Crew"}
          </h1>
        </div>

        <nav style={{ flex: 1, padding: "0.5rem 0.75rem", display: "flex", flexDirection: "column", gap: 4, overflowY: "auto" }}>
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <a key={item.path} href={item.path} title={isCollapsed ? item.name : ""} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "0.625rem 0.75rem", borderRadius: "0.5rem",
                fontSize: "0.875rem", fontWeight: 500,
                textDecoration: "none",
                background: isActive ? "rgba(34,197,94,0.1)" : "transparent",
                color: isActive ? "#22c55e" : "#999",
                border: isActive ? "1px solid rgba(34,197,94,0.2)" : "1px solid transparent",
                transition: "all 0.15s",
              }}>
                <item.icon size={20} style={{ minWidth: 20 }} />
                {!isCollapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>}
              </a>
            );
          })}
        </nav>

        <div style={{ padding: "0.75rem", borderTop: "1px solid #222" }}>
          <button onClick={signOut} title={isCollapsed ? "Sair" : ""} style={{
            display: "flex", alignItems: "center", gap: 12,
            width: "100%", padding: "0.625rem 0.75rem",
            borderRadius: "0.5rem", fontSize: "0.875rem",
            background: "none", border: "none", cursor: "pointer",
            color: "#666", transition: "all 0.15s",
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
          background: "#121212", borderBottom: "1px solid #222",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 2rem", zIndex: 10,
        }}>
          <p style={{ fontSize: "0.875rem", color: "#666", margin: 0 }}>
            {menuItems.find((m) => m.path === pathname)?.name ?? ""}
          </p>
          <button style={{ background: "none", border: "none", cursor: "pointer", color: "#999", position: "relative" }}>
            <Bell size={20} />
            <span style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, background: "#22c55e", borderRadius: "50%" }}></span>
          </button>
        </header>

        <main style={{ flex: 1, overflowY: "auto", position: "relative" }}>
          {children}
        </main>
      </div>
    </div>
  );
}