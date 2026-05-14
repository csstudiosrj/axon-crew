tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useRouter } from "next/navigation";

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

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      if (!session?.user) { router.push("/login"); return; }

      const { data: p } = await supabase
        .from("profiles").select("*").eq("id", session.user.id).single();

      if (!mounted) return;
      if (!p) { router.push("/login"); return; }

      setProfile(p);
      setCompanyId(p.company_id);

      const { data: c } = await supabase
        .from("companies").select("*").eq("id", p.company_id).single();

      if (mounted && c) {
        setCompany(c);
        setEspecialidades(
          Array.isArray(c.especialidades) && c.especialidades.length > 0
            ? c.especialidades
            : []
        );
      }
      if (mounted) setReady(true);
    });

    return () => { mounted = false; };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return { companyId, profile, company, especialidades, ready, signOut };
}