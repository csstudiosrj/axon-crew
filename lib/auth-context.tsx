"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useRouter } from "next/navigation";
import { BASE_PATH } from "./base-path";
import { getSegmento, type Segmento } from "./segmentos";

interface Profile {
  id: string;
  company_id: string;
  nome: string;
  role: string;
}

interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  whatsapp: string | null;
  especialidades: string[];
  segmento?: string | null;
  plano?: string | null;
}

type Resultado =
  | { tipo: "ok"; profile: Profile; company: Company | null }
  | { tipo: "redirecionar"; para: string };

// A página e o layout chamam useAuth ao mesmo tempo; a carga é feita uma vez
// só e compartilhada (também evita criar a empresa duas vezes no 1º acesso).
let carga: Promise<Resultado> | null = null;

async function carregar(): Promise<Resultado> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return { tipo: "redirecionar", para: "/login" };

  const buscarPerfil = async () =>
    (await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle()).data as Profile | null;

  let p = await buscarPerfil();

  // Conta nova: a empresa é criada no primeiro acesso, com os dados
  // informados em /criar-conta (guardados nos metadados do usuário).
  if (!p) {
    const meta = session.user.user_metadata ?? {};
    if (meta.convite_token) {
      // Convidado para a equipe de uma empresa existente.
      await supabase.rpc("aceitar_convite_equipe", { p_token: meta.convite_token });
      p = await buscarPerfil();
    } else if (meta.empresa_nome && meta.empresa_slug) {
      await supabase.rpc("criar_empresa", { p_nome: meta.empresa_nome, p_slug: meta.empresa_slug });
      p = await buscarPerfil();
      if (p && meta.empresa_segmento) {
        const seg = getSegmento(meta.empresa_segmento);
        await supabase.from("companies")
          .update({ segmento: seg.id, especialidades: seg.especialidades })
          .eq("id", p.company_id);
      }
    }
  }

  if (!p) return { tipo: "redirecionar", para: "/login?erro=sem-empresa" };

  const { data: c } = await supabase.from("companies").select("*").eq("id", p.company_id).single();
  return { tipo: "ok", profile: p, company: c };
}

export function useAuth() {
  const [companyId, setCompanyId]         = useState<string | null>(null);
  const [profile, setProfile]             = useState<Profile | null>(null);
  const [company, setCompany]             = useState<Company | null>(null);
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [ready, setReady]                 = useState(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    carga ??= carregar();
    carga.then((r) => {
      if (!mounted) return;
      if (r.tipo === "redirecionar") { carga = null; router.push(r.para); return; }
      setProfile(r.profile);
      setCompanyId(r.profile.company_id);
      if (r.company) {
        setCompany(r.company);
        setEspecialidades(Array.isArray(r.company.especialidades) ? r.company.especialidades : []);
      }
      setReady(true);
    });
    return () => { mounted = false; };
  }, [router]);

  const signOut = async () => {
    carga = null;
    await supabase.auth.signOut();
    window.location.href = `${BASE_PATH}/login`;
  };

  const segmento: Segmento = getSegmento(company?.segmento);

  return { companyId, profile, company, especialidades, segmento, termos: segmento.termos, papel: profile?.role, ready, signOut };
}

// Depois de salvar as Configurações, força recarregar a empresa.
export function invalidarEmpresa() {
  carga = null;
}
