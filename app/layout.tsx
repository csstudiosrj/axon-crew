import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SystemLayout from "@/components/SystemLayout";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ARXUM Crew | Gestão de Freelancers",
  description: "Sistema white label para gestão de equipes e freelancers",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-full bg-[#0a0a0a] text-gray-200 overflow-hidden">
        <SystemLayout>
          {children}
        </SystemLayout>
      </body>
    </html>
  );
}