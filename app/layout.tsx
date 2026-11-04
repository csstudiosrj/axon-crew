import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Sans, Syne } from "next/font/google";
import "./globals.css";
import SystemLayout from "@/components/SystemLayout";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });
const syne = Syne({ variable: "--font-syne", subsets: ["latin"], weight: ["700", "800"] });

const title = "ARXUM Crew: gestão de equipes e freelancers para qualquer segmento";
const description =
  "Base de profissionais, escalas, confirmação pelo WhatsApp, check-in e pagamento por PIX em um só lugar. Para eventos, saúde, gastronomia, construção, segurança e outros segmentos. Comece grátis.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.arxum.com.br"),
  title: { default: title, template: "%s | ARXUM Crew" },
  description,
  alternates: { canonical: "/crew" },
  openGraph: { type: "website", locale: "pt_BR", siteName: "ARXUM Crew", url: "/crew", title, description },
  twitter: { card: "summary_large_image", title, description },
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