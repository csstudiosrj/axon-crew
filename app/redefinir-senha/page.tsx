"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, KeyRound, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import CrewLogo from "../../components/marketing/CrewLogo";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-arx-obsidian px-3.5 py-3 text-[15px] text-white placeholder:text-arx-slate focus:border-arx-crew-soft focus:outline-none";

// Destino do link de "Esqueci minha senha". O cliente do Supabase troca o
// código do link por uma sessão temporária; com ela, a pessoa define a nova senha.
export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [pronto, setPronto] = useState<boolean | null>(null);
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if (evento === "PASSWORD_RECOVERY" || sessao) setPronto(true);
    });
    // Se o link já tiver sido processado, a sessão existe; senão, o link é inválido.
    const espera = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setPronto(Boolean(session));
    }, 2500);
    return () => { data.subscription.unsubscribe(); clearTimeout(espera); };
  }, []);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha.length < 8) { setErro("A senha precisa ter pelo menos 8 caracteres."); return; }
    if (senha !== confirmacao) { setErro("As duas senhas não são iguais."); return; }
    setSalvando(true);
    setErro("");
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);
    if (error) {
      setErro(error.message.toLowerCase().includes("different")
        ? "Escolha uma senha diferente da anterior."
        : "Não foi possível salvar a nova senha. Peça um novo link.");
      return;
    }
    router.push("/freelas");
  };

  return (
    <div className="min-h-screen bg-arx-obsidian font-dm text-arx-frost">
      <header className="border-b border-arx-line">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center px-4 sm:px-8"><CrewLogo /></div>
      </header>

      <main className="mx-auto w-full max-w-[400px] px-4 py-16">
        {pronto === null ? (
          <Loader2 size={26} className="mx-auto animate-spin text-arx-slate" />
        ) : !pronto ? (
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-white">Link inválido ou expirado</h1>
            <p className="mt-3 text-[15px] text-arx-mist">
              O link vale por 1 hora e deve ser aberto no mesmo navegador em que você fez o pedido.
            </p>
            <Link href="/recuperar-senha" className="mt-6 inline-block rounded-lg bg-arx-crew-strong px-5 py-3 text-[15px] font-semibold text-white hover:bg-arx-crew">
              Pedir um novo link
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-[32px] font-medium tracking-[-0.02em] text-white">Criar nova senha</h1>
            <form onSubmit={salvar} className="mt-8 space-y-5">
              <div>
                <label htmlFor="senha" className="mb-1.5 block text-[13px] text-arx-mist">Nova senha</label>
                <input id="senha" type="password" required minLength={8} autoComplete="new-password" value={senha}
                  onChange={(e) => setSenha(e.target.value)} placeholder="Mínimo de 8 caracteres" className={inputClass} />
              </div>
              <div>
                <label htmlFor="confirmacao" className="mb-1.5 block text-[13px] text-arx-mist">Repita a nova senha</label>
                <input id="confirmacao" type="password" required autoComplete="new-password" value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)} className={inputClass} />
              </div>
              {erro && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-[14px] text-red-300">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" /> {erro}
                </div>
              )}
              <button type="submit" disabled={salvando}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-arx-crew-strong py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-arx-crew disabled:opacity-60">
                {salvando ? <Loader2 size={17} className="animate-spin" /> : <KeyRound size={17} />} Salvar nova senha
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
