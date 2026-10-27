"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { getSegmento, documentosDoSegmento, maiuscula, um } from "../../../lib/segmentos";
import { cpfValido, formatarCPF, formatarTelefone, somenteDigitos } from "../../../lib/validacao";
import { MolduraPublica, CabecalhoEmpresa, Carregando, NaoEncontrado, campoClasse } from "../../../components/publico/MolduraPublica";

interface Empresa {
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  especialidades: string[] | null;
  segmento: string | null;
}

type Docs = Record<string, { numero: string; validade?: string }>;

const FORM_VAZIO = { nome: "", whatsapp: "", cpf: "", email: "", especialidade: "", diaria: "", chave_pix: "" };

const ERROS: Record<string, string> = {
  consentimento: "Para enviar, autorize o uso dos seus dados.",
  dados_invalidos: "Algum dado está incompleto. Confira nome, WhatsApp, CPF e valor.",
  cpf_duplicado: "Este CPF já está cadastrado nesta empresa.",
  empresa_nao_encontrada: "Este link de cadastro não está mais ativo.",
};

export default function CadastroProfissionalPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";

  const [empresa, setEmpresa]     = useState<Empresa | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [step, setStep]           = useState(1);
  const [form, setForm]           = useState(FORM_VAZIO);
  const [docs, setDocs]           = useState<Docs>({});
  const [consentimento, setConsentimento] = useState(false);
  const [enviando, setEnviando]   = useState(false);
  const [sucesso, setSucesso]     = useState(false);
  const [erro, setErro]           = useState("");

  useEffect(() => {
    if (!slug) return;
    supabase.rpc("empresa_publica", { p_slug: slug }).then(({ data }) => {
      const e = data as Empresa | null;
      setEmpresa(e);
      if (e?.especialidades?.length) setForm((f) => ({ ...f, especialidade: e.especialidades![0] }));
      setCarregando(false);
    });
  }, [slug]);

  if (carregando) return <Carregando />;
  if (!empresa) return <NaoEncontrado titulo="Empresa não encontrada" texto="O link que você acessou não é válido." />;

  const cor = empresa.primary_color ?? "#8b5cf6";
  const termos = getSegmento(empresa.segmento).termos;
  const documentos = documentosDoSegmento(empresa.segmento);
  const set = (campo: keyof typeof FORM_VAZIO, valor: string) => setForm({ ...form, [campo]: valor });

  const validarStep1 = () => {
    if (form.nome.trim().length < 3) return "Informe seu nome completo.";
    if (somenteDigitos(form.whatsapp).length < 10) return "Confira o número de WhatsApp.";
    if (!cpfValido(form.cpf)) return "CPF inválido. Confira os números.";
    return "";
  };
  const validarStep2 = () => {
    if (!form.especialidade) return "Escolha sua função.";
    if (!form.diaria || Number(form.diaria) <= 0) return "Informe o seu valor base.";
    return "";
  };

  const avancar = () => {
    const msg = step === 1 ? validarStep1() : step === 2 ? validarStep2() : "";
    setErro(msg);
    if (!msg) setStep(step + 1);
  };

  const enviar = async () => {
    if (!consentimento) { setErro(ERROS.consentimento); return; }
    setEnviando(true);
    setErro("");
    const docsPreenchidos = Object.fromEntries(
      Object.entries(docs).filter(([, d]) => d.numero.trim() || d.validade)
    );
    const { data, error } = await supabase.rpc("cadastrar_profissional", {
      p_slug: slug, p_nome: form.nome, p_telefone: form.whatsapp, p_cpf: form.cpf,
      p_email: form.email, p_especialidade: form.especialidade, p_diaria: Number(form.diaria),
      p_chave_pix: form.chave_pix, p_consentimento: consentimento, p_documentos: docsPreenchidos,
    });
    setEnviando(false);
    if (error) {
      setErro(error.message.includes("LIMITE_PLANO")
        ? "A base desta empresa está cheia no momento. Avise a empresa pelo WhatsApp."
        : "Não foi possível enviar agora. Tente de novo em instantes.");
      return;
    }
    if (data === "ok") setSucesso(true);
    else setErro(ERROS[data as string] ?? "Não foi possível enviar agora.");
  };

  if (sucesso) {
    return (
      <MolduraPublica>
        <div className="rounded-2xl border border-white/10 bg-arx-surface p-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: `${cor}22` }}>
            <CheckCircle2 size={34} style={{ color: cor }} />
          </div>
          <h1 className="text-[22px] font-semibold text-white">Cadastro enviado!</h1>
          <p className="mt-2 text-[15px] text-arx-mist">
            Você entrou na base da <strong className="text-white">{empresa.name}</strong>. Quando
            houver {um(termos.generoJob)} {termos.job} para você, o convite chega pelo WhatsApp.
          </p>
        </div>
      </MolduraPublica>
    );
  }

  const etapas = ["Seus dados", "Função e valor", "Finalizar"];

  return (
    <MolduraPublica>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-arx-surface">
        <CabecalhoEmpresa nome={empresa.name} logo={empresa.logo_url} cor={cor}
          subtitulo={`Cadastro de ${maiuscula(termos.profissional)}`} />

        <ol className="flex justify-between gap-2 px-6 pt-6">
          {etapas.map((rotulo, i) => (
            <li key={rotulo} className="flex flex-1 flex-col items-center gap-1.5 text-center">
              <span className="flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold"
                style={step > i ? { background: cor, color: "#fff" } : { background: "#182030", color: "#5e7a94" }}>
                {step > i + 1 ? <CheckCircle2 size={15} /> : i + 1}
              </span>
              <span className="text-[11px] text-arx-slate">{rotulo}</span>
            </li>
          ))}
        </ol>

        <div className="space-y-4 px-6 py-6">
          {step === 1 && (
            <>
              <Campo rotulo="Nome completo *">
                <input value={form.nome} onChange={(e) => set("nome", e.target.value)} autoComplete="name"
                  placeholder="Seu nome completo" className={campoClasse} />
              </Campo>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Campo rotulo="WhatsApp *">
                  <input value={form.whatsapp} onChange={(e) => set("whatsapp", formatarTelefone(e.target.value))}
                    inputMode="tel" autoComplete="tel" placeholder="(00) 00000-0000" maxLength={15} className={campoClasse} />
                </Campo>
                <Campo rotulo="CPF *">
                  <input value={form.cpf} onChange={(e) => set("cpf", formatarCPF(e.target.value))}
                    inputMode="numeric" placeholder="000.000.000-00" maxLength={14} className={campoClasse} />
                </Campo>
              </div>
              <Campo rotulo="E-mail (opcional)">
                <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email"
                  placeholder="seu@email.com" className={campoClasse} />
              </Campo>
            </>
          )}

          {step === 2 && (
            <>
              <Campo rotulo="Função principal *">
                <select value={form.especialidade} onChange={(e) => set("especialidade", e.target.value)} className={campoClasse}>
                  {(empresa.especialidades ?? []).map((esp) => <option key={esp} value={esp}>{esp}</option>)}
                </select>
              </Campo>
              <Campo rotulo={`Seu valor base por ${termos.pagamento === "cachê" ? "cachê" : "diária"} (R$) *`}>
                <input type="number" min="1" inputMode="decimal" value={form.diaria}
                  onChange={(e) => set("diaria", e.target.value)} placeholder="Ex.: 250" className={campoClasse} />
              </Campo>
              <Campo rotulo="Chave PIX (opcional)">
                <input value={form.chave_pix} onChange={(e) => set("chave_pix", e.target.value)}
                  placeholder="CPF, e-mail, telefone ou chave aleatória" className={campoClasse} />
              </Campo>

              {documentos.length > 0 && (
                <fieldset className="rounded-xl border border-white/10 p-4">
                  <legend className="px-1 text-[13px] text-arx-mist">Documentos e cursos (opcional)</legend>
                  <div className="space-y-3">
                    {documentos.map((d) => (
                      <div key={d.id} className={d.validade ? "grid grid-cols-[1fr_9.5rem] gap-2" : ""}>
                        <input value={docs[d.id]?.numero ?? ""} aria-label={d.nome} placeholder={d.nome}
                          onChange={(e) => setDocs({ ...docs, [d.id]: { ...docs[d.id], numero: e.target.value } })}
                          className={`${campoClasse} py-2.5 text-[14px]`} />
                        {d.validade && (
                          <input type="date" aria-label={`Validade — ${d.nome}`} value={docs[d.id]?.validade ?? ""}
                            onChange={(e) => setDocs({ ...docs, [d.id]: { numero: docs[d.id]?.numero ?? "", validade: e.target.value } })}
                            className={`${campoClasse} py-2.5 text-[14px]`} />
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[12px] text-arx-slate">Informe o número; nos cursos, a data de validade.</p>
                </fieldset>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-[14px] text-arx-mist">Confira seus dados antes de enviar:</p>
              <dl className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10">
                {[
                  ["Nome", form.nome], ["WhatsApp", form.whatsapp], ["CPF", form.cpf],
                  ["E-mail", form.email || "Não informado"], ["Função", form.especialidade],
                  ["Valor base", `R$ ${form.diaria}`], ["Chave PIX", form.chave_pix || "Não informada"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3 bg-arx-obsidian px-4 py-2.5">
                    <dt className="text-[13px] text-arx-slate">{k}</dt>
                    <dd className="truncate text-[14px] text-arx-frost">{v}</dd>
                  </div>
                ))}
              </dl>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 p-4 text-[13px] leading-relaxed text-arx-mist">
                <input type="checkbox" checked={consentimento} onChange={(e) => setConsentimento(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0" style={{ accentColor: cor }} />
                <span>
                  Autorizo a <strong className="text-white">{empresa.name}</strong> a guardar estes dados para me
                  convidar para trabalhos e fazer pagamentos, conforme a LGPD. Posso pedir a exclusão a qualquer
                  momento direto à empresa. <a href="https://www.arxum.com.br/privacidade" target="_blank" rel="noopener noreferrer" className="text-white underline underline-offset-2">Política de Privacidade</a>
                </span>
              </label>
            </>
          )}

          {erro && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-[14px] text-red-300">
              <AlertCircle size={16} className="mt-0.5 shrink-0" /> {erro}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-white/10 px-6 py-5">
          {step > 1 ? (
            <button onClick={() => { setErro(""); setStep(step - 1); }} className="flex items-center gap-1.5 text-[14px] text-arx-mist hover:text-white">
              <ChevronLeft size={16} /> Voltar
            </button>
          ) : <span />}
          {step < 3 ? (
            <button onClick={avancar} className="flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-[14px] font-semibold text-white" style={{ background: cor }}>
              Próximo <ChevronRight size={16} />
            </button>
          ) : (
            <button onClick={enviar} disabled={enviando}
              className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-[14px] font-semibold text-white disabled:opacity-60" style={{ background: cor }}>
              {enviando ? <><Loader2 size={16} className="animate-spin" /> Enviando...</> : <><CheckCircle2 size={16} /> Enviar cadastro</>}
            </button>
          )}
        </div>
      </div>
    </MolduraPublica>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] text-arx-mist">{rotulo}</span>
      {children}
    </label>
  );
}
