import Image from "next/image";
import { BASE_PATH } from "../../lib/base-path";

// Moldura de navegador para as capturas das telas do sistema.
export function JanelaNavegador({
  src, alt, url = "arxum.com.br/crew", prioridade = false, children,
}: {
  src: string; alt: string; url?: string; prioridade?: boolean; children?: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-arx-surface shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]">
      <div className="flex h-10 items-center gap-3 border-b border-white/10 px-4">
        <div className={`gap-1.5 ${children ? "hidden sm:flex" : "flex"}`} aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        </div>
        <span className="hidden truncate rounded-md bg-arx-obsidian px-3 py-1 text-[12px] text-arx-slate sm:block">{url}</span>
        {children && <div className="min-w-0 sm:ml-auto">{children}</div>}
      </div>
      <Image src={`${BASE_PATH}${src}`} alt={alt} width={2400} height={1500}
        sizes="(min-width: 1200px) 1136px, 100vw" priority={prioridade} className="block h-auto w-full" />
    </div>
  );
}

// Moldura de celular para as telas que o freelancer usa.
export function JanelaCelular({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="mx-auto w-[260px] rounded-[2.2rem] border border-white/15 bg-black p-2.5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
      <div className="overflow-hidden rounded-[1.7rem]">
        <Image src={`${BASE_PATH}${src}`} alt={alt} width={780} height={1688}
          sizes="260px" className="block h-auto w-full" />
      </div>
    </div>
  );
}
