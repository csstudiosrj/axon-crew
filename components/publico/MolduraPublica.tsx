import { Loader2, AlertCircle } from "lucide-react";

// Casca das páginas que o profissional abre pelo celular (cadastro, convite,
// área pessoal). Usa a marca da empresa e assina "ARXUM Crew" no rodapé.
export function MolduraPublica({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-arx-obsidian px-4 py-8 font-dm text-arx-frost">
      <div className="mx-auto w-full max-w-[34rem]">
        {children}
        <p className="mt-6 text-center text-[12px] text-arx-slate">
          Powered by <span className="text-arx-mist">ARXUM Crew</span>
        </p>
      </div>
    </div>
  );
}

export function CabecalhoEmpresa({ nome, logo, cor, subtitulo }: {
  nome: string; logo?: string | null; cor: string; subtitulo?: string;
}) {
  return (
    <div className="border-b border-white/10 bg-arx-surface-2/40 px-6 py-6 text-center">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt={nome} className="mx-auto mb-3 h-11 object-contain" />
      ) : (
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl text-[17px] font-bold text-white"
          style={{ background: cor }}>
          {nome.charAt(0).toUpperCase()}
        </div>
      )}
      <h1 className="text-[19px] font-semibold text-white">{nome}</h1>
      {subtitulo && <p className="mt-1 text-[14px] text-arx-mist">{subtitulo}</p>}
    </div>
  );
}

export function Carregando() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-arx-obsidian">
      <Loader2 size={30} className="animate-spin text-arx-slate" />
    </div>
  );
}

export function NaoEncontrado({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-arx-obsidian p-4 font-dm text-center">
      <div>
        <AlertCircle size={44} className="mx-auto mb-4 text-arx-slate" />
        <h1 className="mb-2 text-[20px] font-semibold text-white">{titulo}</h1>
        <p className="text-[14px] text-arx-mist">{texto}</p>
      </div>
    </div>
  );
}

export const campoClasse =
  "w-full rounded-lg border border-white/10 bg-arx-obsidian px-3.5 py-3 text-[15px] text-white placeholder:text-arx-slate focus:outline-none focus:border-white/40";
