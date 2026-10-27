import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Sans, Syne } from "next/font/google";
import "./globals.css";
import SystemLayout from "@/components/SystemLayout";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });
const syne = Syne({ variable: "--font-syne", subsets: ["latin"], weight: ["700", "800"] });

export const metadata: Metadata = {
  title: "ARXUM Crew — Gestão de equipes e freelancers para eventos",
  description: "Banco de freelancers, agenda de jobs, escala por função, call sheet com confirmação pelo WhatsApp e pagamentos via PIX em um só lugar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} ${dmSans.variable} ${syne.variable} antialiased`}>
      <body style={{ margin: 0, padding: 0, background: "#0a0a0a", color: "#e5e5e5" }}>
        <SystemLayout>
          {children}
        </SystemLayout>
      </body>
    </html>
  );
}