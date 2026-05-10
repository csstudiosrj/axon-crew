"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
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
  const [userId, setUserId]   = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
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
      async (_event, session) => {
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setUserId(null); setProfile(null); setCompany(null);
          setIsLoading(false);
          router.push("/login");
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

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

  const signOut = async () => {
    await supabase.auth.signOut();
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