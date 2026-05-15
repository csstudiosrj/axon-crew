"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, MapPin, Clock, Calendar, Loader2, AlertCircle, User } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useParams } from "next/navigation";

interface Evento {
  titulo: string;
  data: string;
  horario_inicio: string | null;
  local: string;
}

interface Slot {
  especialidade: string;
  cache_base: number;
}

interface Freela {
  id: string;
  nome: string;
  especialidade: string;
  escala_id: string;
  confirmado: boolean;
}

interface Company {
  name: string;
  logo_url: string | null;
  primary_color: string;
}

export default function RoteiroPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";

  const [company, setCompany]   = useState<Company | null>(null);
  const [evento, setEvento]     = useState<Evento | null>(null);
  const [freelas, setFreelas]   = useState<Freela[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Confirmação individual
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [confirmado, setConfirmado]   = useState<string | null>(null);
  const [erro, setErro]               = useState("");

  useEffect(() => { if (id) carregarRoteiro(); }, [id]);

  const carregarRoteiro = async () => {
    // Busca o call sheet pelo ID
    const { data: cs, error: csErr } = await supabase
      .from("call_sheets")
      .select("*, companies(name, logo_url, primary_color), eventos(titulo, data, horario_inicio, local)")
      .eq("id", id)
      .single();

    if (csErr || !cs || !cs.publicado) { setNotFound(true); setIsLoading(false); return; }

    const ev = Array.isArray(cs.eventos) ? cs.eventos[0] : cs.eventos;
    const co = Array.isArray(cs.companies) ? cs.companies[0] : cs.companies;
    setEvento(ev);
    setCompany(co);

    // Busca escalas do evento
    const { data: escalas } = await supabase
      .from("evento_escalas")
      .select("id, confirmado, freelancers(id, nome, especialidade), evento_slots(especialidade, cache_base)")
      .eq("evento_id", cs.evento_id);

    if (escalas) {
      const lista: Freela[] = escalas.map((e: any) => {
        const f = Array.isArray(e.freelancers) ? e.freelancers[0] : e.freelancers;
        return {
          id:           f?.id ?? "",
          nome:         f?.nome ?? "",
          especialidade: f?.especialidade ?? "",
          escala_id:    e.id,
          confirmado:   e.confirmado ?? false,
        };
      });
      setFreelas(lista);
    }

    setIsLoading(false);
  };

  const confirmarPresenca = async (escalaId: string, freelaId: string) => {
    setConfirmando(escalaId);
    setErro("");

    const { error } = await supabase
      .from("evento_escalas")
      .update({ confirmado: true, confirmado_em: new Date().toISOString() })
      .eq("id", escalaId);

    if (error) {
      setErro("Erro ao confirmar. Tente novamente.");
    } else {
      setConfirmado(escalaId);
      setFreelas(f => f.map(fr => fr.escala_id === escalaId ? { ...fr, confirmado: true } : fr));
    }
    setConfirmando(null);
  };

  const formatarData = (d: string) => {
    if (!d) return "";
    const [ano, mes, dia] = d.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  const cor = company?.primary_color ?? "#22c55e";

  if (isLoading) return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 size={32} color="#555" className="animate-spin" />
    </div>
  );

  if (notFound || !evento) return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ textAlign: "center" }}>
        <AlertCircle size={48} color="#444" style={{ margin: "0 auto 1rem" }} />
        <h1 style={{ color: "#fff", fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>Roteiro não encontrado</h1>
        <p style={{ color: "#666", fontSize: "0.875rem" }}>Este link é inválido ou o roteiro foi despublicado.</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", overflowY: "auto", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: "32rem", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ background: "#121212", border: "1px solid #222", borderRadius: "1rem", overflow: "hidden", marginBottom: "1rem" }}>
          <div style={{ background: "#161616", padding: "1.5rem", textAlign: "center", borderBottom: "1px solid #222" }}>
            {company?.logo_url ? (
              <img src={company.logo_url} alt={company.name} style={{ height: 40, margin: "0 auto 0.75rem", objectFit: "contain" }} />
            ) : (
              <p style={{ color: "#666", fontSize: "0.75rem", marginBottom: "0.5rem" }}>{company?.name}</p>
            )}
            <h1 style={{ color: "#fff", fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>{evento.titulo}</h1>
            <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.8rem", color: "#999" }}>
                <Calendar size={13} /> {formatarData(evento.data)}
              </span>
              {evento.horario_inicio && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.8rem", color: "#999" }}>
                  <Clock size={13} /> {evento.horario_inicio.substring(0, 5)}
                </span>
              )}
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.8rem", color: "#999" }}>
                <MapPin size={13} /> {evento.local}
              </span>
            </div>
          </div>

          {/* Lista de freelas */}
          <div style={{ padding: "1.25rem" }}>
            <p style={{ fontSize: "0.75rem", color: "#666", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Equipe Escalada
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {freelas.map(f => (
                <div key={f.escala_id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "0.75rem 1rem", borderRadius: "0.75rem",
                  background: f.confirmado ? "rgba(34,197,94,0.05)" : "#0a0a0a",
                  border: f.confirmado ? "1px solid rgba(34,197,94,0.2)" : "1px solid #222",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: f.confirmado ? "rgba(34,197,94,0.15)" : "#1a1a1a",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: f.confirmado ? "#22c55e" : "#555", fontWeight: 700, fontSize: "0.875rem"
                    }}>
                      {f.confirmado ? <CheckCircle2 size={16} /> : <User size={16} />}
                    </div>
                    <div>
                      <p style={{ color: "#e5e5e5", fontSize: "0.875rem", fontWeight: 500, margin: 0 }}>{f.nome}</p>
                      <p style={{ color: "#666", fontSize: "0.75rem", margin: 0 }}>{f.especialidade}</p>
                    </div>
                  </div>
                  {f.confirmado ? (
                    <span style={{ fontSize: "0.7rem", color: "#22c55e", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", padding: "0.25rem 0.625rem", borderRadius: "9999px" }}>
                      Confirmado
                    </span>
                  ) : (
                    <button
                      onClick={() => confirmarPresenca(f.escala_id, f.id)}
                      disabled={confirmando === f.escala_id}
                      style={{
                        fontSize: "0.75rem", fontWeight: 500, color: "#fff",
                        background: cor, border: "none", borderRadius: "0.5rem",
                        padding: "0.375rem 0.75rem", cursor: "pointer", opacity: confirmando === f.escala_id ? 0.6 : 1,
                        display: "flex", alignItems: "center", gap: 4
                      }}>
                      {confirmando === f.escala_id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                      Confirmar
                    </button>
                  )}
                </div>
              ))}
            </div>

            {erro && (
              <p style={{ color: "#f87171", fontSize: "0.8rem", marginTop: "0.75rem", textAlign: "center" }}>{erro}</p>
            )}
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: "0.75rem", color: "#444" }}>
          Powered by <span style={{ color: "#666" }}>ARXUM Crew</span>
        </p>
      </div>
    </div>
  );
}