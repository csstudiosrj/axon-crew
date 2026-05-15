"use client";

import React, { useState, useEffect } from "react";
import {
  UserPlus, ChevronRight, ChevronLeft, CheckCircle2,
  AlertCircle, Loader2, Camera, FileText
} from "lucide-react";
import { supabase } from "../../../lib/supabase";

interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  especialidades: string[];
}

interface FormData {
  nome: string;
  whatsapp: string;
  cpf: string;
  email: string;
  especialidade: string;
  diaria: string;
  chave_pix: string;
}

const FORM_VAZIO: FormData = {
  nome: "", whatsapp: "", cpf: "", email: "",
  especialidade: "", diaria: "", chave_pix: "",
};

const formatarTelefone = (v: string) => {
  let s = v.replace(/\D/g, "").slice(0, 11);
  if (s.length > 6) s = s.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
  else if (s.length > 2) s = s.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
  else if (s.length > 0) s = s.replace(/^(\d{0,2})/, "($1");
  return s;
};

const formatarCPF = (v: string) => {
  let s = v.replace(/\D/g, "").slice(0, 11);
  if (s.length > 9) s = s.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2})/, "$1.$2.$3-$4");
  else if (s.length > 6) s = s.replace(/^(\d{3})(\d{3})(\d{0,3})/, "$1.$2.$3");
  else if (s.length > 3) s = s.replace(/^(\d{3})(\d{0,3})/, "$1.$2");
  return s;
};

export default async function CadastroPublicoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [company, setCompany]   = useState<Company | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [step, setStep]         = useState(1);
  const [form, setForm]         = useState<FormData>(FORM_VAZIO);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sucesso, setSucesso]   = useState(false);
  const [erro, setErro]         = useState("");

  useEffect(() => {
    carregarEmpresa();
  }, []);

  const carregarEmpresa = async () => {
    const { data, error } = await supabase
      .from("companies")
      .select("id, name, logo_url, primary_color, especialidades")
      .eq("slug", params.slug)
      .single();

    if (error || !data) {
      setNotFound(true);
    } else {
      setCompany(data);
      if (data.especialidades?.length > 0) {
        setForm(f => ({ ...f, especialidade: data.especialidades[0] }));
      }
    }
    setIsLoading(false);
  };

  const cor = company?.primary_color ?? "#22c55e";

  const validarStep1 = () => {
    if (!form.nome.trim()) { setErro("Nome completo é obrigatório"); return false; }
    if (form.whatsapp.replace(/\D/g, "").length < 10) { setErro("WhatsApp inválido"); return false; }
    if (form.cpf.replace(/\D/g, "").length < 11) { setErro("CPF inválido"); return false; }
    setErro(""); return true;
  };

  const validarStep2 = () => {
    if (!form.especialidade) { setErro("Selecione uma especialidade"); return false; }
    if (!form.diaria || Number(form.diaria) <= 0) { setErro("Informe sua diária base"); return false; }
    setErro(""); return true;
  };

  const avancar = () => {
    if (step === 1 && !validarStep1()) return;
    if (step === 2 && !validarStep2()) return;
    setStep(s => s + 1);
  };

  const voltar = () => { setErro(""); setStep(s => s - 1); };

  const handleSubmit = async () => {
    if (!company) return;
    setIsSubmitting(true);
    setErro("");

    // Verifica duplicidade por CPF dentro da mesma empresa
    const cpfLimpo = form.cpf.replace(/\D/g, "");
    const { data: existente } = await supabase
      .from("freelancers")
      .select("id")
      .eq("company_id", company.id)
      .eq("cpf", cpfLimpo)
      .maybeSingle();

    if (existente) {
      setErro("Este CPF já está cadastrado na base desta empresa.");
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.from("freelancers").insert([{
      company_id:    company.id,
      nome:          form.nome.trim(),
      telefone:      form.whatsapp.replace(/\D/g, ""),
      cpf:           cpfLimpo,
      email:         form.email.trim() || null,
      especialidade: form.especialidade,
      diaria:        Number(form.diaria),
      chave_pix:     form.chave_pix.trim() || null,
      status:        "disponivel",
      avaliacao:     5.0,
    }]);

    if (error) {
      setErro("Erro ao enviar cadastro. Tente novamente.");
    } else {
      setSucesso(true);
    }
    setIsSubmitting(false);
  };

  // Estados de carregamento e erro
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 size={32} className="text-gray-500 animate-spin" />
      </div>
    );
  }

  if (notFound || !company) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle size={48} className="text-gray-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Empresa não encontrada</h1>
          <p className="text-gray-500 text-sm">O link que você acessou não é válido.</p>
        </div>
      </div>
    );
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: cor + "20", border: `1px solid ${cor}40` }}>
            <CheckCircle2 size={40} style={{ color: cor }} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Cadastro Enviado!</h1>
          <p className="text-gray-400 text-sm">
            Seu cadastro foi recebido por <strong className="text-white">{company.name}</strong>.
            Entraremos em contato pelo WhatsApp quando houver um job disponível para você.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#121212] border border-[#222] rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-[#161616] p-8 text-center border-b border-[#222]">
          {company.logo_url ? (
            <img src={company.logo_url} alt={company.name}
              className="h-12 mx-auto mb-4 object-contain" />
          ) : (
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: cor + "20", border: `1px solid ${cor}40` }}>
              <UserPlus size={24} style={{ color: cor }} />
            </div>
          )}
          <h1 className="text-xl font-bold text-white">{company.name}</h1>
          <p className="text-sm text-gray-400 mt-1">Cadastro de Freelancer</p>
        </div>

        {/* Indicador de steps */}
        <div className="px-8 pt-6">
          <div className="flex items-center justify-between relative mb-8">
            <div className="absolute left-0 right-0 top-4 h-px bg-[#222] z-0"></div>
            {[1, 2, 3].map(s => (
              <div key={s} className="relative z-10 flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  style={step >= s
                    ? { backgroundColor: cor, color: "#fff" }
                    : { backgroundColor: "#1a1a1a", color: "#555", border: "1px solid #333" }}>
                  {step > s ? <CheckCircle2 size={14} /> : s}
                </div>
                <span className="text-[10px] text-gray-500 whitespace-nowrap">
                  {s === 1 ? "Dados Pessoais" : s === 2 ? "Especialidade" : "Finalizar"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Formulário */}
        <div className="px-8 pb-4">

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Nome Completo *</label>
                  <input type="text" value={form.nome}
                    onChange={e => setForm({ ...form, nome: e.target.value })}
                    placeholder="Seu nome completo"
                    className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-3 text-sm text-white focus:outline-none"
                    style={{ borderColor: form.nome ? cor + "60" : "" }}
                    onFocus={e => e.target.style.borderColor = cor}
                    onBlur={e => e.target.style.borderColor = form.nome ? cor + "60" : "#333"} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">WhatsApp *</label>
                    <input type="text" value={form.whatsapp}
                      onChange={e => setForm({ ...form, whatsapp: formatarTelefone(e.target.value) })}
                      placeholder="(00) 00000-0000" maxLength={15}
                      className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-3 text-sm text-white focus:outline-none"
                      onFocus={e => e.target.style.borderColor = cor}
                      onBlur={e => e.target.style.borderColor = "#333"} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">CPF *</label>
                    <input type="text" value={form.cpf}
                      onChange={e => setForm({ ...form, cpf: formatarCPF(e.target.value) })}
                      placeholder="000.000.000-00" maxLength={14}
                      className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-3 text-sm text-white focus:outline-none"
                      onFocus={e => e.target.style.borderColor = cor}
                      onBlur={e => e.target.style.borderColor = "#333"} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">E-mail <span className="text-gray-600">(opcional)</span></label>
                  <input type="email" value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="seu@email.com"
                    className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-3 text-sm text-white focus:outline-none"
                    onFocus={e => e.target.style.borderColor = cor}
                    onBlur={e => e.target.style.borderColor = "#333"} />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Especialidade Principal *</label>
                <select value={form.especialidade}
                  onChange={e => setForm({ ...form, especialidade: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-3 text-sm text-white focus:outline-none cursor-pointer">
                  {company.especialidades.map(esp => (
                    <option key={esp} value={esp}>{esp}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Valor da Diária Base (R$) *</label>
                <input type="number" min="1" value={form.diaria}
                  onChange={e => setForm({ ...form, diaria: e.target.value })}
                  placeholder="Ex: 350"
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-3 text-sm text-white focus:outline-none"
                  onFocus={e => e.target.style.borderColor = cor}
                  onBlur={e => e.target.style.borderColor = "#333"} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Chave PIX <span className="text-gray-600">(opcional — para receber pagamentos)</span>
                </label>
                <input type="text" value={form.chave_pix}
                  onChange={e => setForm({ ...form, chave_pix: e.target.value })}
                  placeholder="CPF, e-mail, telefone ou chave aleatória"
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-3 text-sm text-white focus:outline-none"
                  onFocus={e => e.target.style.borderColor = cor}
                  onBlur={e => e.target.style.borderColor = "#333"} />
              </div>
            </div>
          )}

          {/* STEP 3 — Revisão */}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400 mb-4">Revise seus dados antes de enviar:</p>
              {[
                { label: "Nome", value: form.nome },
                { label: "WhatsApp", value: form.whatsapp },
                { label: "CPF", value: form.cpf },
                { label: "E-mail", value: form.email || "Não informado" },
                { label: "Especialidade", value: form.especialidade },
                { label: "Diária Base", value: `R$ ${form.diaria},00` },
                { label: "Chave PIX", value: form.chave_pix || "Não informada" },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center bg-[#0a0a0a] border border-[#222] rounded-lg px-4 py-2.5">
                  <span className="text-xs text-gray-500">{item.label}</span>
                  <span className="text-sm text-gray-200 font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Erro */}
          {erro && (
            <div className="flex items-center gap-2 mt-4 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 text-sm text-red-400">
              <AlertCircle size={14} className="shrink-0" /> {erro}
            </div>
          )}
        </div>

        {/* Navegação */}
        <div className="px-8 py-6 border-t border-[#222] flex justify-between items-center">
          {step > 1 ? (
            <button onClick={voltar}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
              <ChevronLeft size={16} /> Voltar
            </button>
          ) : <div />}

          {step < 3 ? (
            <button onClick={avancar}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all duration-200 active:scale-95"
              style={{ backgroundColor: cor }}>
              Próximo <ChevronRight size={16} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all duration-200 active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: cor }}>
              {isSubmitting
                ? <><Loader2 size={16} className="animate-spin" /> Enviando...</>
                : <><CheckCircle2 size={16} /> Enviar Cadastro</>}
            </button>
          )}
        </div>

      </div>

      <p className="text-xs text-gray-600 mt-6 text-center">
        Powered by <span className="text-gray-500">ARXUM Crew</span>
      </p>
    </div>
  );
}