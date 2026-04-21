"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  CalendarDays, 
  DollarSign, 
  ClipboardList, 
  Settings, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  User,
  Bell
} from "lucide-react";

export default function SystemLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Fecha o dropdown se clicar fora dele
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-dropdown-container')) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems =[
    { name: "Base de Freelas", icon: Users, path: "/" },
    { name: "Agenda & Jobs", icon: CalendarDays, path: "/agenda" },
    { name: "Financeiro & PIX", icon: DollarSign, path: "/financeiro" },
    { name: "Call Sheets", icon: ClipboardList, path: "/callsheets" },
  ];

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] text-gray-200 overflow-hidden font-sans">
      
      {/* SIDEBAR */}
      <aside 
        className={`relative flex flex-col bg-[#121212] border-r border-[#222] transition-all duration-300 ease-in-out z-20 ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Botão de Recolher/Expandir */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 bg-[#1a1a1a] border border-[#333] text-gray-400 hover:text-white rounded-full p-1 z-30 transition-colors"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Logo */}
        <div className={`p-6 flex items-center ${isCollapsed ? "justify-center px-0" : ""}`}>
          <h1 className="text-xl font-bold flex items-center gap-2 text-white overflow-hidden whitespace-nowrap">
            <span className="text-green-500">AXON</span> {!isCollapsed && "Crew"}
          </h1>
        </div>

        {/* Menu de Navegação */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
          {menuItems.map((item, index) => (
            <a 
              key={index}
              href={item.path} 
              className="flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:text-gray-100 hover:bg-[#1a1a1a] rounded-lg font-medium text-sm transition-colors group"
              title={isCollapsed ? item.name : ""}
            >
              <item.icon size={20} className="min-w-[20px]" />
              {!isCollapsed && <span className="truncate">{item.name}</span>}
            </a>
          ))}
        </nav>
      </aside>

      {/* ÁREA PRINCIPAL (Header + Conteúdo) */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* HEADER SUPERIOR */}
        <header className="h-16 bg-[#121212] border-b border-[#222] flex items-center justify-between px-8 z-10">
          <div className="flex items-center">
            {/* Espaço para Breadcrumbs ou Título da Página no futuro */}
          </div>

          <div className="flex items-center gap-4">
            {/* Notificações */}
            <button className="text-gray-400 hover:text-white transition-colors relative">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></span>
            </button>

            {/* Divisor */}
            <div className="h-6 w-px bg-[#333]"></div>

            {/* Menu do Usuário (Dropdown) */}
            <div className="relative user-dropdown-container">
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-3 hover:bg-[#1a1a1a] p-1.5 pr-3 rounded-full transition-colors border border-transparent hover:border-[#333]"
              >
                <div className="w-8 h-8 rounded-full bg-green-900/30 border border-green-500/30 flex items-center justify-center text-green-500 font-bold text-sm">
                  CS
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-200 leading-none">Usuário AXON</p>
                  <p className="text-xs text-gray-500 mt-1 leading-none">Admin</p>
                </div>
              </button>

              {/* Caixa do Dropdown */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#121212] border border-[#333] rounded-xl shadow-2xl py-2 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-2 border-b border-[#222] mb-2">
                    <p className="text-sm font-medium text-white">CS com Eventos</p>
                    <p className="text-xs text-gray-500">contato@empresa.com.br</p>
                  </div>
                  
                  <a href="#" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-[#1a1a1a] transition-colors">
                    <User size={16} /> Meu Perfil
                  </a>
                  <a href="/configuracoes" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-[#1a1a1a] transition-colors">
                    <Settings size={16} /> Configurações
                  </a>
                  
                  <div className="h-px bg-[#222] my-2"></div>
                  
                  <a href="#" className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
                    <LogOut size={16} /> Sair do Sistema
                  </a>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* CONTEÚDO DA PÁGINA */}
        <main className="flex-1 overflow-y-auto relative">
          {children}
        </main>
      </div>

    </div>
  );
}