"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AlertCircle, Loader2, MailCheck, Send } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { BASE_PATH } from "../../lib/base-path";
import CrewLogo from "../../components/marketing/CrewLogo";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-arx-obsidian px-3.5 py-3 text-[15px] text-white placeholder:text-arx-slate focus:border-arx-crew-soft focus:outline-none";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setErro("");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}${BASE_PATH}/redefinir-senha`,
    });
    setEnviando(false);
    // Mesmo sem conta com esse e-mail, a resposta é igual: não revela quem é cliente.
    if (error && error.status === 429) {
      setErro("Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.");
      return;
    }
    setEnviado(true);
  };

  return (
    <div className="min-h-screen bg-arx-obsidian font-dm text-arx-frost">
      <header className="border-b border-arx-line">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-4 sm:px-8">
          <CrewLogo />
          <Link href="/login" className="text-[14px] text-arx-mist hover:text-white">Entrar</Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[400px] px-4 py-16">
        {enviado ? (
          <div className="rounded-2xl border border-arx-line bg-arx-surface p-8 text-center">
            <MailCheck size={30} className="mx-auto mb-4 text-arx-crew-soft" />
            <h1 className="text-2xl font-semibold text-white">Confira seu e-mail</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-arx-mist">
              Se houver uma conta com <strong className="text-white">{email}</strong>, você vai receber um link
              para criar uma nova senha. O link vale por 1 hora.
            </p>
            <p className="mt-5 text-[13px] text-arx-slate">Abra o link no mesmo navegador em que fez o pedido.</p>
          </div>
        ) : (
          <>
            <h1 className="text-[32px] font-medium tracking-[-0.02em] text-white">Esqueceu a senha?</h1>
            <p className="mt-2 text-[15px] text-arx-mist">Informe o e-mail da sua conta e enviaremos um link para criar uma nova.</p>
            <form onSubmit={enviar} className="mt-8 space-y-5">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-[13px] text-arx-mist">E-mail</label>
                <input id="email" type="email" required autoComplete="email" value={email}
                  onChange={(e) => setEmail(e.target.value)} placeholder="voce@suaempresa.com.br" className={inputClass} />
              </div>
              {erro && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-[14px] text-red-300">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" /> {erro}
                </div>
              )}
              <button type="submit" disabled={enviando}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-arx-crew-strong py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-arx-crew disabled:opacity-60">
                {enviando ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />} Enviar link
              </button>
            </form>
            <p className="mt-6 text-center text-[14px] text-arx-slate">
              Lembrou? <Link href="/login" className="text-white hover:underline">Entrar</Link>
            </p>
          </>
        )}
      </main>
    </div>
  );
}
