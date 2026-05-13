"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "./supabase";
import { useRouter, usePathname } from "next/navigation";

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
}

interface AuthContextType {
  userId: string | null;
  profile: Profile | null;
  company: Company | null;
  companyId: string | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  userId: null, profile: null, company: null, companyId: null,
  isLoading: true, signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId]     = useState<string | null>(null);
  const [profile, setProfile]   = useState<Profile | null>(null);
  const [company, setCompany]   = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initialized = useRef(false);
  const router   = useRouter();
  const pathname = usePathname();

  const loadProfile = async (uid: string) => {
    setUserId(uid);
    const { data: p } = await supabase
      .from("profiles").select("*").eq("id", uid).single();
    if (p) {
      setProfile(p);
      const { data: c } = await supabase
        .from("companies").select("*").eq("id", p.company_id).single();
      if (c) setCompany(c);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        setIsLoading(false);
        if (pathname !== "/login") router.push("/login");
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT") {
          setUserId(null);
          setProfile(null);
          setCompany(null);
          setIsLoading(false);
          router.push("/login");
        }
        // SIGNED_IN só carrega se ainda não tiver profile
        if (event === "SIGNED_IN" && session?.user && !profile) {
          await loadProfile(session.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserId(null);
    setProfile(null);
    setCompany(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{
      userId, profile, company,
      companyId: profile?.company_id ?? null,
      isLoading, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);