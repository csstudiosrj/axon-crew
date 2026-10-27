"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { BASE_PATH } from "../../lib/base-path";
import CrewLogo from "../../components/marketing/CrewLogo";
import { SEGMENTOS } from "../../lib/segmentos";
import { NOME_PAPEL } from "../../lib/permissoes";

const gerarSlug = (nome: string) =>
  nome
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

const inputClass =
  "w-full rounded-lg border border-white/10 bg-arx-obsidian px-3.5 py-3 text-[15px] text-white placeholder:text-arx-slate focus:border-arx-crew-soft focus:outline-none";

export default function CriarContaPage() {
  return (
    <Suspense>
      <Roteador />
    </Suspense>
  );
}

// /criar-conta cria uma empresa nova; /criar-conta?convite=... entra na
// equipe de uma empresa que convidou a pessoa.
function Roteador() {
  const convite = useSearchParams().get("convite");
  return convite ? <CadastroConvite token={convite} /> : <CadastroEmpresa />;
}

function CadastroEmpresa() {
  const router = useRouter();

  const [empresa, setEmpresa]       = useState("");
  const [slug, setSlug]             = useState("");
  const [slugEditado, setSlugEditado] = useState(false);
  const [segmento, setSegmento]     = useState("");
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
    if (!segmento) { setErro("Escolha o segmento da empresa."); return; }
    if (slugFinal.length < 3) { setErro("O endereço do link precisa ter pelo menos 3 letras ou números."); return; }
    if (senha.length < 8) { setErro("A senha precisa ter pelo menos 8 caracteres."); return; }
    if (!aceite) { setErro("Para continuar, aceite os Termos de Uso e a Política de Privacidade."); return; }

    setEnviando(true);

    const { data: disponivel } = await supabase.rpc("slug_disponivel", { p_slug: slugFinal });
    if (disponivel === false) {
      setErro("Esse endereço de link já está em uso. Escolha outro.");
      setEnviando(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: {
        // Lidos no primeiro acesso por useAuth, que cria a empresa.
        data: { empresa_nome: empresa.trim(), empresa_slug: slugFinal, empresa_segmento: segmento },
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
              Em seguida você já monta sua base de profissionais e organiza o primeiro trabalho.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="empresa" className="mb-1.5 block text-[13px] text-arx-mist">Nome da empresa</label>
                <input id="empresa" required value={empresa} onChange={(e) => alterarEmpresa(e.target.value)}
                  placeholder="Ex.: Palco Produções" autoComplete="organization" className={inputClass} />
              </div>

              <div>
                <label htmlFor="segmento" className="mb-1.5 block text-[13px] text-arx-mist">Segmento</label>
                <select id="segmento" required value={segmento} onChange={(e) => setSegmento(e.target.value)}
                  className={`${inputClass} ${segmento ? "" : "text-arx-slate"}`}>
                  <option value="" disabled>Escolha o que mais se parece com a sua empresa</option>
                  {SEGMENTOS.map((s) => <option key={s.id} value={s.id} className="text-white">{s.nome}</option>)}
                </select>
                <p className="mt-1.5 text-[12px] text-arx-slate">O sistema já vem com as funções e os termos do seu segmento. Dá para mudar depois.</p>
              </div>

              <div>
                <label htmlFor="slug" className="mb-1.5 block text-[13px] text-arx-mist">Endereço do seu link de cadastro de profissionais</label>
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
                <p className="mt-1.5 text-[12px] text-arx-slate">Você envia esse link para os profissionais se cadastrarem na sua base.</p>
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
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-arx-crew-strong py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-arx-crew disabled:opacity-60">
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

interface DadosConvite { empresa: string; email: string; role: string }

function CadastroConvite({ token }: { token: string }) {
  const router = useRouter();
  const [convite, setConvite] = useState<DadosConvite | null | undefined>(undefined);
  const [senha, setSenha] = useState("");
  const [aceite, setAceite] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [aguardandoEmail, setAguardandoEmail] = useState(false);

  useEffect(() => {
    supabase.rpc("ver_convite_equipe", { p_token: token }).then(({ data }) => setConvite((data as DadosConvite) ?? null));
  }, [token]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convite) return;
    if (senha.length < 8) { setErro("A senha precisa ter pelo menos 8 caracteres."); return; }
    if (!aceite) { setErro("Para continuar, aceite os Termos de Uso e a Política de Privacidade."); return; }
    setEnviando(true); setErro("");
    const { data, error } = await supabase.auth.signUp({
      email: convite.email, password: senha,
      options: { data: { convite_token: token }, emailRedirectTo: `${window.location.origin}${BASE_PATH}/login?confirmado=1` },
    });
    setEnviando(false);
    if (error) {
      setErro(error.message.toLowerCase().includes("registered")
        ? "Este e-mail já tem conta no ARXUM Crew. Peça um convite para outro e-mail."
        : "Não foi possível criar a conta. Tente de novo.");
      return;
    }
    if (data.session) { router.push("/freelas"); return; }
    setAguardandoEmail(true);
  };

  return (
    <div className="min-h-screen bg-arx-obsidian font-dm text-arx-frost">
      <header className="border-b border-arx-line">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center px-4 sm:px-8"><CrewLogo /></div>
      </header>
      <main className="mx-auto w-full max-w-[460px] px-4 py-12 sm:py-16">
        {convite === undefined ? (
          <Loader2 size={26} className="mx-auto animate-spin text-arx-slate" />
        ) : convite === null ? (
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-white">Convite inválido</h1>
            <p className="mt-3 text-[15px] text-arx-mist">Este convite já foi usado ou expirou. Peça um novo ao administrador da empresa.</p>
          </div>
        ) : aguardandoEmail ? (
          <div className="rounded-2xl border border-arx-line bg-arx-surface p-8 text-center">
            <MailCheck size={30} className="mx-auto mb-4 text-arx-crew-soft" />
            <h1 className="text-2xl font-semibold text-white">Confira seu e-mail</h1>
            <p className="mt-3 text-[15px] text-arx-mist">Enviamos um link de confirmação para <strong className="text-white">{convite.email}</strong>.</p>
          </div>
        ) : (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-arx-slate">Convite</p>
            <h1 className="mt-3 text-[28px] font-medium leading-tight tracking-[-0.02em] text-white">
              Entrar na equipe da {convite.empresa}
            </h1>
            <p className="mt-3 text-[15px] text-arx-mist">Seu acesso será de <strong className="text-white">{NOME_PAPEL[convite.role] ?? convite.role}</strong>.</p>
            <form onSubmit={enviar} className="mt-8 space-y-5">
              <div>
                <span className="mb-1.5 block text-[13px] text-arx-mist">E-mail</span>
                <p className={`${inputClass} text-arx-mist`}>{convite.email}</p>
              </div>
              <div>
                <label htmlFor="senha-convite" className="mb-1.5 block text-[13px] text-arx-mist">Crie uma senha</label>
                <input id="senha-convite" type="password" required minLength={8} value={senha} onChange={(e) => setSenha(e.target.value)}
                  placeholder="Mínimo de 8 caracteres" autoComplete="new-password" className={inputClass} />
              </div>
              <label className="flex cursor-pointer items-start gap-3 text-[13px] leading-relaxed text-arx-mist">
                <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-arx-crew)]" />
                <span>Li e aceito os <a href="https://www.arxum.com.br/termos-de-uso" target="_blank" rel="noopener noreferrer" className="text-white underline underline-offset-2">Termos de Uso</a> e a <a href="https://www.arxum.com.br/privacidade" target="_blank" rel="noopener noreferrer" className="text-white underline underline-offset-2">Política de Privacidade</a>.</span>
              </label>
              {erro && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-[14px] text-red-300">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" /> {erro}
                </div>
              )}
              <button type="submit" disabled={enviando}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-arx-crew-strong py-3.5 text-[15px] font-semibold text-white hover:bg-arx-crew disabled:opacity-60">
                {enviando ? <><Loader2 size={17} className="animate-spin" /> Criando acesso...</> : <><CheckCircle2 size={17} /> Criar meu acesso</>}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
