"use client";

import React, { useState, useEffect } from "react";
import {
  UserPlus, ChevronRight, ChevronLeft, CheckCircle2,
  AlertCircle, Loader2
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useParams } from "next/navigation";

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

export default function CadastroPublicoPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : Array.isArray(params.slug) ? params.slug[0] : "";

  const [company, setCompany]     = useState<Company | null>(null);
  const [notFound, setNotFound]   = useState(false);
  const [step, setStep]           = useState(1);
  const [form, setForm]           = useState<FormData>(FORM_VAZIO);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sucesso, setSucesso]     = useState(false);
  const [erro, setErro]           = useState("");

  useEffect(() => {
    if (slug) carregarEmpresa();
  }, [slug]);

  const carregarEmpresa = async () => {
    const { data, error } = await supabase
      .from("companies")
      .select("id, name, logo_url, primary_color, especialidades")
      .eq("slug", slug)
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

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={32} color="#555" className="animate-spin" />
      </div>
    );
  }

  if (notFound || !company) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
        <div style={{ textAlign: "center" }}>
          <AlertCircle size={48} color="#444" style={{ margin: "0 auto 1rem" }} />
          <h1 style={{ color: "#fff", fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>Empresa não encontrada</h1>
          <p style={{ color: "#666", fontSize: "0.875rem" }}>O link que você acessou não é válido.</p>
        </div>
      </div>
    );
  }

  if (sucesso) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
        <div style={{ textAlign: "center", maxWidth: "24rem" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: cor + "20", border: `1px solid ${cor}40`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
            <CheckCircle2 size={40} color={cor} />
          </div>
          <h1 style={{ color: "#fff", fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Cadastro Enviado!</h1>
          <p style={{ color: "#999", fontSize: "0.875rem" }}>
            Seu cadastro foi recebido por <strong style={{ color: "#fff" }}>{company.name}</strong>.
            Entraremos em contato pelo WhatsApp quando houver um job disponível.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", overflowY: "auto", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: "32rem", margin: "0 auto" }}>
        <div style={{ background: "#121212", border: "1px solid #222", borderRadius: "1rem", overflow: "hidden" }}>

          {/* Header */}
          <div style={{ background: "#161616", padding: "2rem", textAlign: "center", borderBottom: "1px solid #222" }}>
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.name} style={{ height: 48, margin: "0 auto 1rem", objectFit: "contain" }} />
            ) : (
              <div style={{ width: 48, height: 48, borderRadius: "0.75rem", background: cor + "20", border: `1px solid ${cor}40`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                <UserPlus size={24} color={cor} />
              </div>
            )}
            <h1 style={{ color: "#fff", fontSize: "1.25rem", fontWeight: 700 }}>{company.name}</h1>
            <p style={{ color: "#999", fontSize: "0.875rem", marginTop: "0.25rem" }}>Cadastro de Freelancer</p>
          </div>

          {/* Steps */}
          <div style={{ padding: "1.5rem 2rem 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", position: "relative", marginBottom: "2rem" }}>
              <div style={{ position: "absolute", left: 0, right: 0, top: 16, height: 1, background: "#222", zIndex: 0 }}></div>
              {[1, 2, 3].map(s => (
                <div key={s} style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: step >= s ? cor : "#1a1a1a",
                    border: step >= s ? "none" : "1px solid #333",
                    color: step >= s ? "#fff" : "#555",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.75rem", fontWeight: 700
                  }}>
                    {step > s ? <CheckCircle2 size={14} /> : s}
                  </div>
                  <span style={{ fontSize: "0.625rem", color: "#666", whiteSpace: "nowrap" }}>
                    {s === 1 ? "Dados Pessoais" : s === 2 ? "Especialidade" : "Finalizar"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <div style={{ padding: "0 2rem 1rem" }}>

            {step === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "#999", marginBottom: "0.25rem" }}>Nome Completo *</label>
                  <input type="text" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
                    placeholder="Seu nome completo"
                    style={{ width: "100%", background: "#0a0a0a", border: "1px solid #333", borderRadius: "0.5rem", padding: "0.75rem", fontSize: "0.875rem", color: "#fff", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "#999", marginBottom: "0.25rem" }}>WhatsApp *</label>
                    <input type="text" value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: formatarTelefone(e.target.value) })}
                      placeholder="(00) 00000-0000" maxLength={15}
                      style={{ width: "100%", background: "#0a0a0a", border: "1px solid #333", borderRadius: "0.5rem", padding: "0.75rem", fontSize: "0.875rem", color: "#fff", outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "#999", marginBottom: "0.25rem" }}>CPF *</label>
                    <input type="text" value={form.cpf} onChange={e => setForm({ ...form, cpf: formatarCPF(e.target.value) })}
                      placeholder="000.000.000-00" maxLength={14}
                      style={{ width: "100%", background: "#0a0a0a", border: "1px solid #333", borderRadius: "0.5rem", padding: "0.75rem", fontSize: "0.875rem", color: "#fff", outline: "none", boxSizing: "border-box" }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "#999", marginBottom: "0.25rem" }}>E-mail <span style={{ color: "#555" }}>(opcional)</span></label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="seu@email.com"
                    style={{ width: "100%", background: "#0a0a0a", border: "1px solid #333", borderRadius: "0.5rem", padding: "0.75rem", fontSize: "0.875rem", color: "#fff", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
            )}

            {step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "#999", marginBottom: "0.25rem" }}>Especialidade Principal *</label>
                  <select value={form.especialidade} onChange={e => setForm({ ...form, especialidade: e.target.value })}
                    style={{ width: "100%", background: "#0a0a0a", border: "1px solid #333", borderRadius: "0.5rem", padding: "0.75rem", fontSize: "0.875rem", color: "#fff", outline: "none", cursor: "pointer", boxSizing: "border-box" }}>
                    {company.especialidades.map(esp => <option key={esp} value={esp}>{esp}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "#999", marginBottom: "0.25rem" }}>Valor da Diária Base (R$) *</label>
                  <input type="number" min="1" value={form.diaria} onChange={e => setForm({ ...form, diaria: e.target.value })}
                    placeholder="Ex: 350"
                    style={{ width: "100%", background: "#0a0a0a", border: "1px solid #333", borderRadius: "0.5rem", padding: "0.75rem", fontSize: "0.875rem", color: "#fff", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "#999", marginBottom: "0.25rem" }}>Chave PIX <span style={{ color: "#555" }}>(opcional)</span></label>
                  <input type="text" value={form.chave_pix} onChange={e => setForm({ ...form, chave_pix: e.target.value })}
                    placeholder="CPF, e-mail, telefone ou chave aleatória"
                    style={{ width: "100%", background: "#0a0a0a", border: "1px solid #333", borderRadius: "0.5rem", padding: "0.75rem", fontSize: "0.875rem", color: "#fff", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
            )}

            {step === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <p style={{ fontSize: "0.875rem", color: "#999", marginBottom: "0.5rem" }}>Revise seus dados antes de enviar:</p>
                {[
                  { label: "Nome", value: form.nome },
                  { label: "WhatsApp", value: form.whatsapp },
                  { label: "CPF", value: form.cpf },
                  { label: "E-mail", value: form.email || "Não informado" },
                  { label: "Especialidade", value: form.especialidade },
                  { label: "Diária Base", value: `R$ ${form.diaria},00` },
                  { label: "Chave PIX", value: form.chave_pix || "Não informada" },
                ].map(item => (
                  <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0a0a0a", border: "1px solid #222", borderRadius: "0.5rem", padding: "0.625rem 1rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "#666" }}>{item.label}</span>
                    <span style={{ fontSize: "0.875rem", color: "#e5e5e5", fontWeight: 500 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            )}

            {erro && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1rem", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "0.5rem", padding: "0.625rem 0.75rem", color: "#f87171", fontSize: "0.875rem" }}>
                <AlertCircle size={14} /> {erro}
              </div>
            )}
          </div>

          {/* Nav */}
          <div style={{ padding: "1.5rem 2rem", borderTop: "1px solid #222", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {step > 1 ? (
              <button onClick={voltar} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "#999", background: "none", border: "none", cursor: "pointer" }}>
                <ChevronLeft size={16} /> Voltar
              </button>
            ) : <div />}

            {step < 3 ? (
              <button onClick={avancar} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 1.5rem", borderRadius: "0.5rem", fontSize: "0.875rem", fontWeight: 500, color: "#fff", background: cor, border: "none", cursor: "pointer" }}>
                Próximo <ChevronRight size={16} />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={isSubmitting} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 1.5rem", borderRadius: "0.5rem", fontSize: "0.875rem", fontWeight: 500, color: "#fff", background: cor, border: "none", cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.5 : 1 }}>
                {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Enviando...</> : <><CheckCircle2 size={16} /> Enviar Cadastro</>}
              </button>
            )}
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: "0.75rem", color: "#444", marginTop: "1.5rem" }}>
          Powered by <span style={{ color: "#666" }}>ARXUM Crew</span>
        </p>
      </div>
    </div>
  );
}