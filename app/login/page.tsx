"use client";

import React, { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import { LogIn, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro]         = useState("");
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErro("E-mail ou senha inválidos.");
      setLoading(false);
    } else {
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">
            <span className="text-green-500">ARXUM</span> Crew
          </h1>
          <p className="text-gray-500 text-sm mt-2">Gestão de Freelancers</p>
        </div>

        <div className="bg-[#121212] border border-[#222] rounded-2xl p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">E-mail</label>
              <input
                type="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-3 text-sm text-white focus:border-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Senha</label>
              <input
                type="password" required
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-3 text-sm text-white focus:border-green-500 focus:outline-none"
              />
            </div>

            {erro && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-sm text-red-400">
                <AlertCircle size={14} /> {erro}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white py-3 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
            >
              <LogIn size={16} />
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}