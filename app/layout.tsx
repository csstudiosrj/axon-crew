import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Users, CalendarDays, DollarSign, Settings, LogOut, Activity, ClipboardList } from "lucide-react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AXON Crew | Gestão de Freelancers",
  description: "Sistema independente para gestão de equipes de eventos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex bg-[#0a0a0a] text-gray-200">
        
        {/* MENU LATERAL (SIDEBAR) */}
        <aside className="w-64 bg-[#121212] border-r border-[#222] hidden md:flex flex-col">
          <div className="p-6">
            <h1 className="text-xl font-bold flex items-center gap-2 text-white">
              <span className="text-green-500">AXON</span> Crew
            </h1>
            <p className="text-xs text-gray-500 mt-1">Gestão de Equipes & Staff</p>
          </div>

          <nav className="flex-1 px-4 space-y-2 mt-4">
            <a href="/" className="flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-gray-200 hover:bg-[#1a1a1a] rounded-md font-medium text-sm transition-colors">
              <Users size={18} />
              Base de Freelas
            </a>
            
            <a href="/agenda" className="flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-gray-200 hover:bg-[#1a1a1a] rounded-md font-medium text-sm transition-colors">
              <CalendarDays size={18} />
              Agenda & Jobs
            </a>

            <a href="/financeiro" className="flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-gray-200 hover:bg-[#1a1a1a] rounded-md font-medium text-sm transition-colors">
              <DollarSign size={18} />
              Financeiro & PIX
            </a>

            <a href="#" className="flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-gray-200 hover:bg-[#1a1a1a] rounded-md font-medium text-sm transition-colors">
              <ClipboardList size={18} />
              Call Sheets
            </a>
          </nav>

          <div className="p-4 border-t border-[#222]">
            <a href="/configuracoes" className="flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-gray-200 hover:bg-[#1a1a1a] rounded-md font-medium text-sm transition-colors">
              <Settings size={18} />
              Configurações
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-md font-medium text-sm transition-colors mt-1">
              <LogOut size={18} />
              Sair
            </a>
          </div>
        </aside>

        {/* ÁREA PRINCIPAL ONDE AS PÁGINAS APARECEM */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

      </body>
    </html>
  );
}