import Link from "next/link";

export function CrewMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <path d="M9 25 L18 10 L27 25 Z" stroke="var(--color-arx-crew-soft)" strokeWidth="2.2" strokeLinejoin="round" opacity="0.55" />
      <circle cx="18" cy="10" r="3.4" fill="var(--color-arx-crew-soft)" />
      <circle cx="9" cy="25" r="3.4" fill="var(--color-arx-crew-soft)" />
      <circle cx="27" cy="25" r="3.4" fill="var(--color-arx-crew-soft)" />
    </svg>
  );
}

export default function CrewLogo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="ARXUM Crew — início">
      <CrewMark />
      <span className="whitespace-nowrap font-logo text-[17px] font-extrabold leading-none tracking-[-0.03em] sm:text-[19px]">
        <span className="text-arx-crew-soft">ARXUM</span> <span className="text-white">Crew</span>
      </span>
    </Link>
  );
}
