"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn, AlertCircle, CheckCircle2 } from "lucide-react";
import CrewLogo from "../../components/marketing/CrewLogo";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-arx-obsidian px-3.5 py-3 text-[15px] text-white placeholder:text-arx-slate focus:border-arx-crew-soft focus:outline-none";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro]         = useState(
    params.get("erro") === "sem-empresa"
      ? "Não encontramos a empresa ligada a esta conta. Fale com o suporte."
      : ""
  );
  const [aviso, setAviso]       = useState(
    params.get("confirmado") ? "E-mail confirmado! Entre para acessar o painel." : ""
  );
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro("");
    setAviso("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErro(
        error.message.toLowerCase().includes("not confirmed")
          ? "Confirme seu e-mail pelo link que enviamos antes de entrar."
          : "E-mail ou senha inválidos."
      );
      setLoading(false);
    } else {
      router.push("/freelas");
    }
  };

  return (
    <div className="min-h-screen bg-arx-obsidian font-dm text-arx-frost">
      <header className="border-b border-arx-line">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-4 sm:px-8">
          <CrewLogo />
          <Link href="/criar-conta" className="text-[14px] text-arx-mist hover:text-white">
            Criar conta
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[400px] px-4 py-16">
        <h1 className="text-[32px] font-medium tracking-[-0.02em] text-white">Entrar</h1>
        <p className="mt-2 text-[15px] text-arx-mist">Acesse o painel da sua empresa.</p>

        <form onSubmit={handleLogin} className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-[13px] text-arx-mist">E-mail</label>
            <input id="email" type="email" required autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="voce@suaempresa.com.br" className={inputClass} />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="senha" className="text-[13px] text-arx-mist">Senha</label>
              <Link href="/recuperar-senha" className="text-[13px] text-arx-slate hover:text-white">Esqueci minha senha</Link>
            </div>
            <input id="senha" type="password" required autoComplete="current-password"
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" className={inputClass} />
          </div>

          {aviso && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-[14px] text-emerald-300">
              <CheckCircle2 size={16} /> {aviso}
            </div>
          )}
          {erro && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-[14px] text-red-300">
              <AlertCircle size={16} className="mt-0.5 shrink-0" /> {erro}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-arx-crew-strong py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-arx-crew disabled:opacity-60">
            <LogIn size={17} />
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-[14px] text-arx-slate">
          Ainda não tem conta? <Link href="/criar-conta" className="text-white hover:underline">Cadastre sua empresa</Link>
        </p>
      </main>
    </div>
  );
}
