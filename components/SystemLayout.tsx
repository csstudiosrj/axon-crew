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

  if (pathname === "/login") return <>{children}</>;

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] text-gray-200 overflow-hidden font-sans">

      <aside className={`relative flex flex-col bg-[#121212] border-r border-[#222] transition-all duration-300 ease-in-out z-20 ${isCollapsed ? "w-20" : "w-64"}`}>

        <button onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 bg-[#1a1a1a] border border-[#333] text-gray-400 hover:text-white rounded-full p-1 z-30 transition-colors">
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className={`p-6 flex items-center ${isCollapsed ? "justify-center px-0" : ""}`}>
          <h1 className="text-xl font-bold flex items-center gap-2 text-white overflow-hidden whitespace-nowrap">
            <span className="text-green-500">ARXUM</span>
            {!isCollapsed && " Crew"}
          </h1>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto overflow-x-hidden">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            const cls = isActive
              ? "bg-green-500/10 text-green-500 border border-green-500/20"
              : "text-gray-400 hover:text-gray-100 hover:bg-[#1a1a1a]";
            return <a key={item.path} href={item.path} title={isCollapsed ? item.name : ""}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors ${cls}`}>
              <item.icon size={20} className="min-w-[20px]" />
              {!isCollapsed && <span className="truncate">{item.name}</span>}
            </a>;
          })}
        </nav>

        <div className="p-3 border-t border-[#222]">
          <button onClick={signOut} title={isCollapsed ? "Sair" : ""}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <LogOut size={20} className="min-w-[20px]" />
            {!isCollapsed && <span>Sair do Sistema</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-[#121212] border-b border-[#222] flex items-center justify-between px-8 z-10">
          <p className="text-sm text-gray-500">
            {menuItems.find((m) => m.path === pathname)?.name ?? ""}
          </p>
          <button className="text-gray-400 hover:text-white transition-colors relative">
            <Bell size={20} />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></span>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto relative">
          {children}
        </main>
      </div>
    </div>
  );
}