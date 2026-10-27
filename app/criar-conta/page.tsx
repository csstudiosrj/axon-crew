"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { BASE_PATH } from "../../lib/base-path";
import CrewLogo from "../../components/marketing/CrewLogo";

const gerarSlug = (nome: string) =>
  nome
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

const inputClass =
  "w-full rounded-lg border border-white/10 bg-arx-obsidian px-3.5 py-3 text-[15px] text-white placeholder:text-arx-slate focus:border-arx-crew-soft focus:outline-none";

export default function CriarContaPage() {
  const router = useRouter();

  const [empresa, setEmpresa]       = useState("");
  const [slug, setSlug]             = useState("");
  const [slugEditado, setSlugEditado] = useState(false);
  const [email, setEmail]           = useState("");
  const [senha, setSenha]           = useState("");
  const [verSenha, setVerSenha]     = useState(false);
  const [aceite, setAceite]         = useState(false);
  const [enviando, setEnviando]     = useState(false);
  const [erro, setErro]             = useState("");
  const [aguardandoEmail, setAguardandoEmail] = useState(false);

  const alterarEmpresa = (valor: string) => {
    setEmpresa(valor);
    if (!slugEditado) setSlug(gerarSlug(valor));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");

    const slugFinal = gerarSlug(slug);
    if (empresa.trim().length < 2) { setErro("Informe o nome da empresa."); return; }
    if (slugFinal.length < 3) { setErro("O endereço do link precisa ter pelo menos 3 letras ou números."); return; }
    if (senha.length < 8) { setErro("A senha precisa ter pelo menos 8 caracteres."); return; }
    if (!aceite) { setErro("Para continuar, aceite os Termos de Uso e a Política de Privacidade."); return; }

    setEnviando(true);

    const { data: existente } = await supabase
      .from("companies").select("id").eq("slug", slugFinal).maybeSingle();
    if (existente) {
      setErro("Esse endereço de link já está em uso. Escolha outro.");
      setEnviando(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: {
        // Lidos no primeiro acesso por useAuth, que cria a empresa.
        data: { empresa_nome: empresa.trim(), empresa_slug: slugFinal },
        emailRedirectTo: `${window.location.origin}${BASE_PATH}/login?confirmado=1`,
      },
    });

    if (error) {
      setErro(
        error.message.toLowerCase().includes("registered")
          ? "Já existe uma conta com esse e-mail. Faça login."
          : "Não foi possível criar a conta. Confira os dados e tente novamente."
      );
      setEnviando(false);
      return;
    }

    if (data.session) {
      // Confirmação de e-mail desligada no Supabase: já entra direto.
      router.push("/freelas");
      return;
    }

    setAguardandoEmail(true);
    setEnviando(false);
  };

  return (
    <div className="min-h-screen bg-arx-obsidian font-dm text-arx-frost">
      <header className="border-b border-arx-line">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-4 sm:px-8">
          <CrewLogo />
          <Link href="/login" className="text-[14px] text-arx-mist hover:text-white">
            Já tenho conta
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[460px] px-4 py-12 sm:py-16">
        {aguardandoEmail ? (
          <div className="rounded-2xl border border-arx-line bg-arx-surface p-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-arx-crew/40 bg-arx-crew/15">
              <MailCheck size={26} className="text-arx-crew-soft" />
            </div>
            <h1 className="text-2xl font-semibold text-white">Confira seu e-mail</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-arx-mist">
              Enviamos um link de confirmação para <strong className="text-white">{email}</strong>.
              Clique nele para ativar a conta da <strong className="text-white">{empresa}</strong> e
              entrar no painel.
            </p>
            <p className="mt-5 text-[13px] text-arx-slate">
              Não chegou? Olhe a caixa de spam ou promoções.
            </p>
          </div>
        ) : (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-arx-slate">
              Criar conta
            </p>
            <h1 className="mt-3 text-[32px] font-medium leading-tight tracking-[-0.02em] text-white">
              Cadastre sua empresa
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-arx-mist">
              Em seguida você já monta sua base de freelancers e cria o primeiro job.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="empresa" className="mb-1.5 block text-[13px] text-arx-mist">Nome da empresa</label>
                <input id="empresa" required value={empresa} onChange={(e) => alterarEmpresa(e.target.value)}
                  placeholder="Ex.: Palco Produções" autoComplete="organization" className={inputClass} />
              </div>

              <div>
                <label htmlFor="slug" className="mb-1.5 block text-[13px] text-arx-mist">Endereço do seu link de cadastro de freelas</label>
                <div className="flex items-stretch overflow-hidden rounded-lg border border-white/10 bg-arx-obsidian focus-within:border-arx-crew-soft">
                  <span className="flex items-center whitespace-nowrap border-r border-white/10 bg-arx-surface px-3 text-[13px] text-arx-slate">
                    arxum.com.br/crew/cadastro/
                  </span>
                  <input id="slug" required value={slug}
                    onChange={(e) => { setSlugEditado(true); setSlug(e.target.value.toLowerCase()); }}
                    onBlur={() => setSlug(gerarSlug(slug))}
                    placeholder="sua-empresa"
                    className="min-w-0 flex-1 bg-transparent px-3 py-3 text-[15px] text-white placeholder:text-arx-slate focus:outline-none" />
                </div>
                <p className="mt-1.5 text-[12px] text-arx-slate">Você envia esse link para os freelancers se cadastrarem na sua base.</p>
              </div>

              <div>
                <label htmlFor="email" className="mb-1.5 block text-[13px] text-arx-mist">Seu e-mail</label>
                <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@suaempresa.com.br" autoComplete="email" className={inputClass} />
              </div>

              <div>
                <label htmlFor="senha" className="mb-1.5 block text-[13px] text-arx-mist">Senha</label>
                <div className="relative">
                  <input id="senha" type={verSenha ? "text" : "password"} required minLength={8} value={senha}
                    onChange={(e) => setSenha(e.target.value)} placeholder="Mínimo de 8 caracteres"
                    autoComplete="new-password" className={`${inputClass} pr-11`} />
                  <button type="button" onClick={() => setVerSenha(!verSenha)}
                    aria-label={verSenha ? "Esconder senha" : "Mostrar senha"}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-arx-slate hover:text-white">
                    {verSenha ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-3 text-[13px] leading-relaxed text-arx-mist">
                <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-arx-crew)]" />
                <span>
                  Li e aceito os{" "}
                  <a href="https://www.arxum.com.br/termos-de-uso" target="_blank" rel="noopener noreferrer" className="text-white underline underline-offset-2">Termos de Uso</a>{" "}
                  e a{" "}
                  <a href="https://www.arxum.com.br/privacidade" target="_blank" rel="noopener noreferrer" className="text-white underline underline-offset-2">Política de Privacidade</a>.
                </span>
              </label>

              {erro && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-[14px] text-red-300">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" /> {erro}
                </div>
              )}

              <button type="submit" disabled={enviando}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-arx-crew py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#8b5cf6] disabled:opacity-60">
                {enviando ? <><Loader2 size={17} className="animate-spin" /> Criando conta...</> : <><CheckCircle2 size={17} /> Criar conta</>}
              </button>
            </form>

            <p className="mt-6 text-center text-[14px] text-arx-slate">
              Já tem conta? <Link href="/login" className="text-white hover:underline">Entrar</Link>
            </p>
          </>
        )}
      </main>
    </div>
  );
}
