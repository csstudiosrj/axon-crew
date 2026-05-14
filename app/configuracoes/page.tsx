tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Save, Plus, Trash2, Link as LinkIcon,
  Building2, Palette, Users, CheckCircle2, AlertTriangle,
  ChevronDown, Sparkles
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth-context";

// =====================================================
// PRESETS POR NICHO
// =====================================================
const PRESETS: Record<string, { label: string; icon: string; especialidades: string[] }> = {
  eventos: {
    label: "Produção de Eventos & Shows",
    icon: "🎪",
    especialidades: [
      "Técnico de Áudio", "Iluminador(a)", "Técnico de Vídeo",
      "Roadie", "Produtor(a) Executivo", "Cenógrafo(a)",
      "Carregador", "DJ", "Sonoplasta", "Rigger", "Operador de Palco"
    ],
  },
  audiovisual: {
    label: "Audiovisual & Cinema",
    icon: "🎬",
    especialidades: [
      "Diretor(a)", "Câmera", "Assistente de Câmera", "Iluminador(a)",
      "Maquiador(a)", "Figurinista", "Editor(a)", "Produtor(a) Executivo",
      "Assistente de Produção", "Motion Designer", "Fotógrafo(a)"
    ],
  },
  gastronomia: {
    label: "Gastronomia & Eventos Sociais",
    icon: "🍽️",
    especialidades: [
      "Garçom", "Garçonete", "Bartender", "Copeiro(a)",
      "Cozinheiro(a)", "Auxiliar de Cozinha", "Maître",
      "Recepcionista", "Sommelier", "Churrasqueiro(a)", "Confeiteiro(a)"
    ],
  },
  construcao: {
    label: "Construção & Reformas",
    icon: "🏗️",
    especialidades: [
      "Pedreiro", "Eletricista", "Encanador", "Pintor",
      "Azulejista", "Gesseiro", "Serralheiro", "Carpinteiro",
      "Mestre de Obras", "Auxiliar de Serviços Gerais", "Soldador"
    ],
  },
  seguranca: {
    label: "Segurança & Facilities",
    icon: "🛡️",
    especialidades: [
      "Vigilante", "Porteiro(a)", "Recepcionista",
      "Controlador(a) de Acesso", "Coordenador(a) de Segurança",
      "Brigadista", "Auxiliar de Limpeza", "Supervisor(a) de Turno"
    ],
  },
  trade: {
    label: "Promotoras de Vendas & Trade",
    icon: "📦",
    especialidades: [
      "Promotor(a) de Vendas", "Repositor(a)", "Degustador(a)",
      "Demonstrador(a)", "Supervisor(a) de Campo",
      "Merchandiser", "Impulsionador(a)", "Atendente de PDV"
    ],
  },
};

export default function ConfiguracoesPage() {
  const { companyId, ready } = useAuth();

  const [nome, setNome]                   = useState("");
  const [slug, setSlug]                   = useState("");
  const [whatsapp, setWhatsapp]           = useState("");
  const [primaryColor, setPrimaryColor]   = useState("#22c55e");
  const [logoUrl, setLogoUrl]             = useState("");
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [novaEsp, setNovaEsp]             = useState("");
  const [presetAberto, setPresetAberto]   = useState(false);
  const [isLoading, setIsLoading]         = useState(true);
  const [isSaving, setIsSaving]           = useState(false);
  const [toast, setToast]                 = useState<{ msg: string; tipo: "sucesso" | "erro" } | null>(null);

  useEffect(() => {
    if (ready && companyId) carregarConfigs();
  }, [ready, companyId]);

  const carregarConfigs = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("companies").select("*").eq("id", companyId!).single();

    if (data) {
      setNome(data.name ?? "");
      setSlug(data.slug ?? "");
      setWhatsapp(data.whatsapp ?? "");
      setPrimaryColor(data.primary_color ?? "#22c55e");
      setLogoUrl(data.logo_url ?? "");
      setEspecialidades(
        Array.isArray(data.especialidades) && data.especialidades.length > 0
          ? data.especialidades : []
      );
    }
    if (error) mostrarToast("Erro ao carregar configurações", "erro");
    setIsLoading(false);
  };

  const salvar = async () => {
    if (!companyId) return;
    if (!nome.trim()) { mostrarToast("O nome da empresa é obrigatório", "erro"); return; }
    if (!slug.trim()) { mostrarToast("O slug é obrigatório", "erro"); return; }
    if (especialidades.length === 0) { mostrarToast("Adicione ao menos uma especialidade", "erro"); return; }

    setIsSaving(true);
    const { error } = await supabase
      .from("companies")
      .update({
        name:          nome.trim(),
        slug:          slug.trim().toLowerCase().replace(/\s+/g, "-"),
        whatsapp:      whatsapp.trim(),
        primary_color: primaryColor,
        logo_url:      logoUrl.trim(),
        especialidades,
      })
      .eq("id", companyId);

    if (error) {
      mostrarToast("Erro ao salvar configurações", "erro");
    } else {
      mostrarToast("Configurações salvas! Atualize a página para aplicar.", "sucesso");
    }
    setIsSaving(false);
  };

  const mostrarToast = (msg: string, tipo: "sucesso" | "erro") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 4000);
  };

  const aplicarPreset = (key: string) => {
    setEspecialidades(PRESETS[key].especialidades);
    setPresetAberto(false);
    mostrarToast(`Preset "${PRESETS[key].label}" aplicado. Salve para confirmar.`, "sucesso");
  };

  const adicionarEsp = () => {
    const esp = novaEsp.trim();
    if (!esp) return;
    if (especialidades.map(e => e.toLowerCase()).includes(esp.toLowerCase())) {
      mostrarToast("Especialidade já existe", "erro"); return;
    }
    setEspecialidades([...especialidades, esp]);
    setNovaEsp("");
  };

  const removerEsp = (index: number) => {
    setEspecialidades(especialidades.filter((_, i) => i !== index));
  };

  const linkCaptacao = slug
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/cadastro/${slug}`
    : "— configure o slug para gerar o link";

  if (!ready || isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <p className="text-gray-500 animate-pulse">Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto w-full relative">

      {toast && (
        <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl transition-all ${toast.tipo === "sucesso" ? "bg-green-900/90 border border-green-500 text-green-100" : "bg-red-900/90 border border-red-500 text-red-100"}`}>
          {toast.tipo === "sucesso" ? <CheckCircle2 size={20} className="text-green-400" /> : <AlertTriangle size={20} className="text-red-400" />}
          <p className="text-sm font-medium">{toast.msg}</p>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Configurações</h2>
          <p className="text-sm text-gray-400 mt-1">Personalize o sistema para o seu negócio.</p>
        </div>
        <button onClick={salvar} disabled={isSaving}
          className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 flex items-center gap-2 shadow-lg shadow-green-900/20">
          <Save size={16} /> {isSaving ? "Salvando..." : "Salvar Alterações"}
        </button>
      </div>

      <div className="space-y-6">

        {/* DADOS DA EMPRESA */}
        <div className="bg-[#121212] border border-[#222] rounded-xl p-6">
          <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-5">
            <Building2 size={18} className="text-green-500" /> Dados da Empresa
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Nome da Empresa *</label>
              <input type="text" value={nome} onChange={e => setNome(e.target.value)}
                placeholder="Ex: CS com Eventos"
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-3 text-sm text-white focus:border-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Slug * <span className="text-gray-600">— usado nos links públicos</span>
              </label>
              <input type="text" value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                placeholder="ex: cs-eventos"
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-3 text-sm text-white focus:border-green-500 focus:outline-none font-mono" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">WhatsApp da Empresa</label>
              <input type="text" value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                placeholder="(21) 99999-9999"
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-3 text-sm text-white focus:border-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">URL do Logo</label>
              <input type="text" value={logoUrl} onChange={e => setLogoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-3 text-sm text-white focus:border-green-500 focus:outline-none" />
            </div>
          </div>
        </div>

        {/* APARÊNCIA */}
        <div className="bg-[#121212] border border-[#222] rounded-xl p-6">
          <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-5">
            <Palette size={18} className="text-green-500" /> Aparência & White Label
          </h3>
          <div className="flex items-center gap-8 flex-wrap">
            <div>
              <label className="block text-xs text-gray-400 mb-2">Cor Principal</label>
              <div className="flex items-center gap-3">
                <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                  className="w-12 h-12 rounded-lg border border-[#333] bg-transparent cursor-pointer p-1" />
                <div>
                  <p className="text-sm text-white font-mono">{primaryColor}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Botões e destaques</p>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2">Prévia</label>
              <div className="flex gap-2 flex-wrap">
                <div className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                  style={{ backgroundColor: primaryColor }}>
                  Botão Principal
                </div>
                <div className="px-4 py-2 rounded-lg text-sm font-medium border"
                  style={{ color: primaryColor, borderColor: primaryColor + "40", backgroundColor: primaryColor + "15" }}>
                  Badge / Tag
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LINK DE CAPTAÇÃO */}
        <div className="bg-[#121212] border border-[#222] rounded-xl p-6">
          <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-1">
            <LinkIcon size={18} className="text-green-500" /> Link de Captação de Freelancers
          </h3>
          <p className="text-sm text-gray-500 mb-4">Envie para que freelancers se cadastrem diretamente na sua base.</p>
          <div className="flex items-center gap-3 bg-[#0a0a0a] border border-[#333] rounded-lg px-4 py-3">
            <span className="text-sm text-gray-300 flex-1 font-mono truncate">{linkCaptacao}</span>
            {slug && (
              <button onClick={() => { navigator.clipboard.writeText(linkCaptacao); mostrarToast("Link copiado!", "sucesso"); }}
                className="text-green-500 text-sm font-medium hover:text-green-400 shrink-0 transition-colors">
                Copiar
              </button>
            )}
          </div>
        </div>

        {/* ESPECIALIDADES */}
        <div className="bg-[#121212] border border-[#222] rounded-xl p-6">
          <div className="flex items-start justify-between mb-1 flex-wrap gap-3">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Users size={18} className="text-green-500" /> Especialidades do Nicho
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Funções disponíveis em todo o sistema — escalas, cadastros e filtros.
              </p>
            </div>

            {/* PRESET SELECTOR */}
            <div className="relative">
              <button onClick={() => setPresetAberto(!presetAberto)}
                className="flex items-center gap-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95">
                <Sparkles size={15} className="text-yellow-500" />
                Usar Preset de Nicho
                <ChevronDown size={14} className={`transition-transform ${presetAberto ? "rotate-180" : ""}`} />
              </button>

              {presetAberto && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setPresetAberto(false)}></div>
                  <div className="absolute right-0 top-11 w-72 bg-[#161616] border border-[#333] rounded-xl shadow-2xl z-20 py-2 overflow-hidden">
                    <p className="px-4 py-2 text-xs text-gray-500 font-medium uppercase tracking-wider border-b border-[#222] mb-1">
                      Escolha o preset do seu nicho
                    </p>
                    {Object.entries(PRESETS).map(([key, preset]) => (
                      <button key={key} onClick={() => aplicarPreset(key)}
                        className="w-full text-left px-4 py-3 hover:bg-[#222] transition-colors">
                        <p className="text-sm text-gray-200 font-medium">
                          {preset.icon} {preset.label}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {preset.especialidades.length} funções incluídas
                        </p>
                      </button>
                    ))}
                    <div className="border-t border-[#222] mt-1 px-4 py-2">
                      <p className="text-xs text-gray-600">
                        Aplicar um preset substitui a lista atual. Você pode editar depois.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* LISTA DE ESPECIALIDADES */}
          <div className="mt-5 space-y-2 mb-4">
            {especialidades.length === 0 ? (
              <div className="border border-dashed border-[#333] rounded-xl p-8 text-center">
                <Users size={32} className="mx-auto text-gray-600 mb-2" />
                <p className="text-sm text-gray-500">Nenhuma especialidade configurada.</p>
                <p className="text-xs text-gray-600 mt-1">Use um preset ou adicione manualmente.</p>
              </div>
            ) : (
              especialidades.map((esp, index) => (
                <div key={index} className="flex items-center gap-3 bg-[#0a0a0a] border border-[#222] rounded-lg px-4 py-2.5">
                  <span className="text-xs text-gray-600 w-5 text-right shrink-0">{index + 1}</span>
                  <span className="text-sm text-gray-200 flex-1">{esp}</span>
                  <button onClick={() => removerEsp(index)}
                    className="text-gray-600 hover:text-red-500 transition-colors shrink-0 p-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* ADICIONAR */}
          <div className="flex gap-3">
            <input type="text" value={novaEsp} onChange={e => setNovaEsp(e.target.value)}
              onKeyDown={e => e.key === "Enter" && adicionarEsp()}
              placeholder="Adicionar especialidade personalizada..."
              className="flex-1 bg-[#0a0a0a] border border-[#333] rounded-lg p-2.5 text-sm text-white focus:border-green-500 focus:outline-none" />
            <button onClick={adicionarEsp}
              className="bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-gray-300 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 flex items-center gap-2 shrink-0">
              <Plus size={16} /> Adicionar
            </button>
          </div>

          {especialidades.length > 0 && (
            <p className="text-xs text-gray-600 mt-3">
              {especialidades.length} especialidade{especialidades.length > 1 ? "s" : ""} configurada{especialidades.length > 1 ? "s" : ""}.
              Essas funções aparecerão em todo o sistema após salvar.
            </p>
          )}
        </div>

      </div>
    </div>
  );
}