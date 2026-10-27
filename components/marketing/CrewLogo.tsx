import Link from "next/link";

// Símbolo do ARXUM Crew: crachá de equipe (credencial do freelancer).
// Mesmo estilo do símbolo do Zelo: traço na cor do produto e
// preenchimento translúcido a 12%.
export function CrewMark({ size = 26, cor = "#8b5cf6" }: { size?: number; cor?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect x="4.5" y="5.5" width="15" height="16" rx="3" fill={cor} fillOpacity="0.12" stroke={cor} strokeWidth="1.8" />
      <path d="M9.5 5.5 V3.8 a1.3 1.3 0 0 1 1.3 -1.3 h2.4 a1.3 1.3 0 0 1 1.3 1.3 V5.5" stroke={cor} strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="12" cy="11.4" r="2.3" stroke={cor} strokeWidth="1.8" />
      <path d="M8.3 18.2 a3.7 3.7 0 0 1 7.4 0" stroke={cor} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function CrewWordmark({ tamanho = "text-[16px] sm:text-[19px]" }: { tamanho?: string }) {
  return (
    <span className={`whitespace-nowrap font-logo font-extrabold leading-none tracking-[-0.03em] ${tamanho}`}>
      <span className="text-arx-crew">ARXUM</span> <span className="text-white">Crew</span>
    </span>
  );
}

export default function CrewLogo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="ARXUM Crew — início">
      <CrewMark size={24} />
      <CrewWordmark />
    </Link>
  );
}
