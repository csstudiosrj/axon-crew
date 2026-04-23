"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  UserPlus, MessageCircle, Search, Filter, CheckCircle2, Clock,
  MoreVertical, Star, X, Trash2, User, AlertTriangle, Send,
  Copy, Phone, Briefcase, DollarSign, QrCode
} from "lucide-react";
import { supabase } from "../lib/supabase";

// ============================================================
// CONSTANTES
// ============================================================
const ESPECIALIDADES = [
  "Técnico de Áudio", "Iluminador(a)", "Técnico de Vídeo",
  "Roadie", "Produtor(a)", "Cenógrafo(a)", "Carregador", "Recepcionista"
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  disponivel:   { label: "Disponível",   color: "text-green-500",  bg: "bg-green-500/10",  border: "border-green-500/20",  dot: "bg-green-500" },
  em_job:       { label: "Em Job",       color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20", dot: "bg-yellow-500" },
  indisponivel: { label: "Indisponível", color: "text-red-500",    bg: "bg-red-500/10",    border: "border-red-500/20",    dot: "bg-red-500" },
};

// ============================================================
// TIPOS
// ============================================================
interface Freelancer {
  id: string;
  nome: string;
  especialidade: string;
  telefone: string; // armazenado SEM máscara (só dígitos)
  diaria: number;
  chave_pix: string;
  status: "disponivel" | "em_job" | "indisponivel";
  avaliacao: number;
  created_at?: string;
}

interface NovoFreela {
  nome: string;
  especialidade: string;
  telefone: string;  // com máscara para exibição
  diaria: string;
  chave_pix: string;
}

// ============================================================
// HELPERS
// ============================================================
const formatarTelefone = (valor: string): string => {
  let v = valor.replace(/\D/g, "").slice(0, 11);
  if (v.length > 6) v = v.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
  else if (v.length > 2) v = v.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
  else if (v.length > 0) v = v.replace(/^(\d{0,2})/, "($1");
  return v;
};

const telefoneLimpo = (t: string) => t.replace(/\D/g, "");
const telefoneDisplay = (t: string) => formatarTelefone(t);

const FREELA_VAZIO: NovoFreela = {
  nome: "", especialidade: ESPECIALIDADES[0], telefone: "", diaria: "", chave_pix: ""
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function CrewDashboard() {

  // ---------- ESTADO ----------
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroEspecialidade, setFiltroEspecialidade] = useState("todas");
  const [menuAberto, setMenuAberto] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; tipo: "sucesso" | "erro" } | null>(null);

  const currentUserRole = "admin";
  const canViewFinancials = currentUserRole === "admin" || currentUserRole === "financeiro";

  // Modais
  const [modalFiltros, setModalFiltros] = useState(false);
  const [filtrosAvancados, setFiltrosAvancados] = useState({ precoMax: 2000, avaliacaoMin: 0 });
  const [modalCadastro, setModalCadastro] = useState(false);
  const [novoFreela, setNovoFreela] = useState<NovoFreela>(FREELA_VAZIO);
  const [modalStatus, setModalStatus] = useState<Freelancer | null>(null);
  const [modalDelete, setModalDelete] = useState<Freelancer | null>(null);
  const [modalAvaliacao, setModalAvaliacao] = useState<Freelancer | null>(null);
  const [novaNota, setNovaNota] = useState(5);
  const [modalWhatsapp, setModalWhatsapp] = useState<Freelancer | null>(null);
  const [msgWhatsapp, setMsgWhatsapp] = useState("");
  const [modalPerfil, setModalPerfil] = useState<Freelancer | null>(null);

  // ---------- SUPABASE ----------
  useEffect(() => { fetchFreelancers(); }, []);

  const fetchFreelancers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("freelancers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) mostrarToast("Erro ao carregar dados do banco", "erro");
    else if (data) setFreelancers(data as Freelancer[]);
    setIsLoading(false);
  };

  const mostrarToast = (msg: string, tipo: "sucesso" | "erro") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3500);
  };

  // ---------- FILTROS ----------
  const freelancersFiltrados = useMemo(() => {
    return freelancers.filter((f) => {
      const matchBusca = f.nome.toLowerCase().includes(busca.toLowerCase());
      const matchStatus = filtroStatus === "todos" || f.status === filtroStatus;
      const matchEsp = filtroEspecialidade === "todas" || f.especialidade === filtroEspecialidade;
      const matchPreco = f.diaria <= filtrosAvancados.precoMax;
      const matchAval = f.avaliacao >= filtrosAvancados.avaliacaoMin;
      return matchBusca && matchStatus && matchEsp && matchPreco && matchAval;
    });
  }, [freelancers, busca, filtroStatus, filtroEspecialidade, filtrosAvancados]);

  const totalBase = freelancers.length;
  const totalDisponiveis = freelancers.filter((f) => f.status === "disponivel").length;
  const totalEmJob = freelancers.filter((f) => f.status === "em_job").length;

  // ---------- CRUD ----------
  const handleCadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    const tel = telefoneLimpo(novoFreela.telefone);
    if (tel.length < 10) { mostrarToast("Digite um telefone válido com DDD", "erro"); return; }
    if (!novoFreela.nome.trim()) { mostrarToast("Digite o nome completo", "erro"); return; }
    if (!novoFreela.diaria || Number(novoFreela.diaria) <= 0) { mostrarToast("Digite uma diária válida", "erro"); return; }

    const { data, error } = await supabase.from("freelancers").insert([{
      nome: novoFreela.nome.trim(),
      especialidade: novoFreela.especialidade,
      telefone: tel,            // salva SOMENTE dígitos
      diaria: Number(novoFreela.diaria),
      chave_pix: novoFreela.chave_pix.trim(),
      status: "disponivel",
      avaliacao: 5.0,
    }]).select();

    if (error) {
      mostrarToast("Erro ao salvar no banco de dados", "erro");
    } else if (data) {
      setFreelancers([data[0] as Freelancer, ...freelancers]);
      setModalCadastro(false);
      setNovoFreela(FREELA_VAZIO);
      mostrarToast("Freelancer cadastrado com sucesso!", "sucesso");
    }
  };

  const handleMudarStatus = async (id: string, novoStatus: string) => {
    const { error } = await supabase.from("freelancers").update({ status: novoStatus }).eq("id", id);
    if (!error) {
      setFreelancers(freelancers.map((f) => (f.id === id ? { ...f, status: novoStatus as Freelancer["status"] } : f)));
      setModalStatus(null);
      mostrarToast("Status atualizado!", "sucesso");
    } else {
      mostrarToast("Erro ao atualizar status", "erro");
    }
  };

  const handleAvaliar = async () => {
    if (!modalAvaliacao) return;
    const { error } = await supabase.from("freelancers").update({ avaliacao: novaNota }).eq("id", modalAvaliacao.id);
    if (!error) {
      setFreelancers(freelancers.map((f) => (f.id === modalAvaliacao.id ? { ...f, avaliacao: novaNota } : f)));
      setModalAvaliacao(null);
      mostrarToast("Avaliação salva!", "sucesso");
    } else {
      mostrarToast("Erro ao salvar avaliação", "erro");
    }
  };

  const handleDelete = async () => {
    if (!modalDelete) return;
    const { error } = await supabase.from("freelancers").delete().eq("id", modalDelete.id);
    if (!error) {
      setFreelancers(freelancers.filter((f) => f.id !== modalDelete.id));
      setModalDelete(null);
      mostrarToast("Freelancer removido da base", "sucesso");
    } else {
      mostrarToast("Erro ao remover freelancer", "erro");
    }
  };

  const abrirWhatsapp = (freela: Freelancer) => {
    const primeiroNome = freela.nome.split(" ")[0];
    setMsgWhatsapp(
      `Olá ${primeiroNome}, tudo bem? 👋\n\nSomos da equipe AXON e temos um job de *${freela.especialidade}* para os próximos dias.\n\nA diária base é *R$ ${freela.diaria},00*. Você tem disponibilidade?\n\nAguardamos seu retorno! 🙂`
    );
    setModalWhatsapp(freela);
  };

  const enviarWhatsapp = () => {
    if (!modalWhatsapp) return;
    const url = `https://wa.me/55${modalWhatsapp.telefone}?text=${encodeURIComponent(msgWhatsapp)}`;
    window.open(url, "_blank");
    setModalWhatsapp(null);
  };

  const copiarPix = (chave: string) => {
    navigator.clipboard.writeText(chave);
    mostrarToast("Chave PIX copiada!", "sucesso");
  };

  // ---------- RENDER HELPERS ----------
  const StatusBadge = ({ status }: { status: string }) => {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.indisponivel;
    return (
      <span className={`inline-flex items-center gap-1.5 py-1 px-2.5 rounded-md text-xs font-medium ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
        {cfg.label}
      </span>
    );
  };

  // ============================================================
  // JSX
  // ============================================================
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full relative">

      {/* TOAST */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl transition-all ${toast.tipo === "sucesso" ? "bg-green-900/90 border border-green-500 text-green-100" : "bg-red-900/90 border border-red-500 text-red-100"}`}>
          {toast.tipo === "sucesso" ? <CheckCircle2 size={20} className="text-green-400" /> : <AlertTriangle size={20} className="text-red-400" />}
          <p className="text-sm font-medium">{toast.msg}</p>
        </div>
      )}

      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Banco de Talentos</h2>
          <p className="text-sm text-gray-400 mt-1">Gerencie seus freelancers e dispare convites rápidos via WhatsApp.</p>
        </div>
        <button
          onClick={() => setModalCadastro(true)}
          className="bg-green-600 hover:bg-green-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-green-900/20"
        >
          <UserPlus size={18} /> Cadastrar Freela
        </button>
      </div>

      {/* CARDS RESUMO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#121212] border border-[#222] p-6 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-gray-800/50 rounded-lg text-gray-300"><UserPlus size={24} /></div>
          <div><p className="text-sm text-gray-400 font-medium">Total na Base</p><p className="text-2xl font-bold text-white">{totalBase}</p></div>
        </div>
        <div className="bg-[#121212] border border-[#222] p-6 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-green-500/10 rounded-lg text-green-500"><CheckCircle2 size={24} /></div>
          <div><p className="text-sm text-gray-400 font-medium">Disponíveis Hoje</p><p className="text-2xl font-bold text-white">{totalDisponiveis}</p></div>
        </div>
        <div className="bg-[#121212] border border-[#222] p-6 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-yellow-500/10 rounded-lg text-yellow-500"><Clock size={24} /></div>
          <div><p className="text-sm text-gray-400 font-medium">Em Job Agora</p><p className="text-2xl font-bold text-white">{totalEmJob}</p></div>
        </div>
      </div>

      {/* BARRA DE BUSCA E FILTROS */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text" placeholder="Buscar por nome..."
            className="w-full bg-[#121212] border border-[#222] rounded-lg py-2.5 pl-10 pr-4 text-sm text-gray-200 focus:outline-none focus:border-green-500"
            value={busca} onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <select
          className="bg-[#121212] border border-[#222] text-gray-300 text-sm rounded-lg py-2.5 px-4 focus:outline-none focus:border-green-500 cursor-pointer"
          value={filtroEspecialidade} onChange={(e) => setFiltroEspecialidade(e.target.value)}
        >
          <option value="todas">Todas as Especialidades</option>
          {ESPECIALIDADES.map((esp) => <option key={esp} value={esp}>{esp}</option>)}
        </select>
        <select
          className="bg-[#121212] border border-[#222] text-gray-300 text-sm rounded-lg py-2.5 px-4 focus:outline-none focus:border-green-500 cursor-pointer"
          value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}
        >
          <option value="todos">Todos os Status</option>
          <option value="disponivel">Apenas Disponíveis</option>
          <option value="em_job">Em Job Agora</option>
          <option value="indisponivel">Indisponíveis</option>
        </select>
        <button
          onClick={() => setModalFiltros(true)}
          className="bg-[#121212] border border-[#222] hover:bg-[#1a1a1a] px-4 py-2.5 rounded-lg text-sm text-gray-300 flex items-center gap-2"
        >
          <Filter size={16} /> Mais Filtros
        </button>
      </div>

      {/* TABELA */}
      <div className="bg-[#121212] border border-[#222] rounded-xl overflow-visible shadow-sm pb-24">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#161616] text-gray-400 border-b border-[#222]">
              <tr>
                <th className="px-6 py-4 font-medium">Profissional</th>
                <th className="px-6 py-4 font-medium">Especialidade</th>
                <th className="px-6 py-4 font-medium">Avaliação</th>
                {canViewFinancials && <th className="px-6 py-4 font-medium">Diária Base</th>}
                {canViewFinancials && <th className="px-6 py-4 font-medium">Chave PIX</th>}
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {isLoading ? (
                <tr>
                  <td colSpan={canViewFinancials ? 7 : 5} className="px-6 py-12 text-center text-gray-500">
                    Carregando base de talentos...
                  </td>
                </tr>
              ) : freelancersFiltrados.length > 0 ? (
                freelancersFiltrados.map((freela) => (
                  <tr key={freela.id} className="hover:bg-[#161616]/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-200">{freela.nome}</td>
                    <td className="px-6 py-4 text-gray-400">{freela.especialidade}</td>
                    <td className="px-6 py-4 text-gray-400">
                      <div className="flex items-center gap-1">
                        <Star size={14} className="text-yellow-500 fill-yellow-500" />
                        <span>{Number(freela.avaliacao).toFixed(1)}</span>
                      </div>
                    </td>
                    {canViewFinancials && (
                      <td className="px-6 py-4 text-gray-400">R$ {freela.diaria},00</td>
                    )}
                    {canViewFinancials && (
                      <td className="px-6 py-4">
                        {freela.chave_pix ? (
                          <button
                            onClick={() => copiarPix(freela.chave_pix)}
                            title="Clique para copiar"
                            className="flex items-center gap-1.5 text-gray-400 hover:text-green-400 transition-colors group"
                          >
                            <QrCode size={13} className="shrink-0" />
                            <span className="max-w-[120px] truncate text-xs">{freela.chave_pix}</span>
                            <Copy size={11} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ) : (
                          <span className="text-gray-600 text-xs italic">Não informado</span>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <button onClick={() => setModalStatus(freela)} className="hover:opacity-80 transition-opacity">
                        <StatusBadge status={freela.status} />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => abrirWhatsapp(freela)}
                          className="bg-[#25D366] hover:bg-[#20bd5a] text-white px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 shadow-sm"
                        >
                          <MessageCircle size={14} /> Convidar
                        </button>
                        <button
                          onClick={() => setMenuAberto(menuAberto === freela.id ? null : freela.id)}
                          className="text-gray-500 hover:text-gray-300 p-1.5 bg-[#1a1a1a] rounded-md border border-[#333]"
                        >
                          <MoreVertical size={16} />
                        </button>
                        {menuAberto === freela.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuAberto(null)}></div>
                            <div className="absolute right-0 top-10 w-40 bg-[#121212] border border-[#333] rounded-lg shadow-2xl z-20 py-1 overflow-hidden">
                              <button
                                onClick={() => { setMenuAberto(null); setModalPerfil(freela); }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#1a1a1a] hover:text-white flex items-center gap-2"
                              >
                                <User size={14} /> Ver Perfil
                              </button>
                              <button
                                onClick={() => { setMenuAberto(null); setModalAvaliacao(freela); setNovaNota(freela.avaliacao); }}
                                className="w-full text-left px-4 py-2 text-sm text-yellow-500 hover:bg-[#1a1a1a] flex items-center gap-2"
                              >
                                <Star size={14} /> Avaliar
                              </button>
                              <div className="h-px bg-[#222] my-1"></div>
                              <button
                                onClick={() => { setMenuAberto(null); setModalDelete(freela); }}
                                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                              >
                                <Trash2 size={14} /> Excluir
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={canViewFinancials ? 7 : 5} className="px-6 py-12 text-center text-gray-500">
                    Nenhum freelancer encontrado com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================================================================
          MODAIS
      ================================================================ */}

      {/* MODAL: CADASTRO */}
      {modalCadastro && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#222] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-[#222]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus size={18} className="text-green-500" /> Novo Freelancer
              </h3>
              <button onClick={() => { setModalCadastro(false); setNovoFreela(FREELA_VAZIO); }} className="text-gray-500 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCadastrar} className="p-5 space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nome Completo *</label>
                <input
                  required type="text" placeholder="Ex: João da Silva"
                  value={novoFreela.nome}
                  onChange={(e) => setNovoFreela({ ...novoFreela, nome: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
                />
              </div>
              {/* Especialidade */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Especialidade *</label>
                <select
                  required value={novoFreela.especialidade}
                  onChange={(e) => setNovoFreela({ ...novoFreela, especialidade: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-2.5 text-sm text-white focus:border-green-500 focus:outline-none cursor-pointer"
                >
                  {ESPECIALIDADES.map((esp) => <option key={esp} value={esp}>{esp}</option>)}
                </select>
              </div>
              {/* Telefone e Diária */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">WhatsApp *</label>
                  <input
                    required type="text" placeholder="(11) 99999-9999"
                    value={novoFreela.telefone}
                    onChange={(e) => setNovoFreela({ ...novoFreela, telefone: formatarTelefone(e.target.value) })}
                    maxLength={15}
                    className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Diária Base (R$) *</label>
                  <input
                    required type="number" placeholder="350" min="1"
                    value={novoFreela.diaria}
                    onChange={(e) => setNovoFreela({ ...novoFreela, diaria: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
                  />
                </div>
              </div>
              {/* Chave PIX */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Chave PIX <span className="text-gray-600">(CPF, e-mail, telefone ou chave aleatória)</span>
                </label>
                <input
                  type="text" placeholder="Ex: 123.456.789-00 ou email@email.com"
                  value={novoFreela.chave_pix}
                  onChange={(e) => setNovoFreela({ ...novoFreela, chave_pix: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
                />
              </div>

              <p className="text-xs text-gray-600">* Campos obrigatórios</p>

              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => { setModalCadastro(false); setNovoFreela(FREELA_VAZIO); }} className="px-4 py-2 text-sm text-gray-400 hover:text-white">
                  Cancelar
                </button>
                <button type="submit" className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg text-sm font-medium">
                  Salvar na Base
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VER PERFIL */}
      {modalPerfil && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#222] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-[#222]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <User size={18} className="text-gray-400" /> Perfil do Profissional
              </h3>
              <button onClick={() => setModalPerfil(null)} className="text-gray-500 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Avatar placeholder */}
              <div className="flex flex-col items-center gap-3 pb-4 border-b border-[#222]">
                <div className="w-16 h-16 rounded-full bg-[#222] flex items-center justify-center text-2xl font-bold text-gray-400">
                  {modalPerfil.nome.charAt(0).toUpperCase()}
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-lg">{modalPerfil.nome}</p>
                  <StatusBadge status={modalPerfil.status} />
                </div>
              </div>

              {/* Detalhes */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Briefcase size={15} className="text-gray-500 shrink-0" />
                  <div>
                    <p className="text-gray-500 text-xs">Especialidade</p>
                    <p className="text-gray-200">{modalPerfil.especialidade}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Star size={15} className="text-yellow-500 shrink-0" />
                  <div>
                    <p className="text-gray-500 text-xs">Avaliação</p>
                    <p className="text-gray-200">{Number(modalPerfil.avaliacao).toFixed(1)} / 5.0</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone size={15} className="text-gray-500 shrink-0" />
                  <div>
                    <p className="text-gray-500 text-xs">WhatsApp</p>
                    <p className="text-gray-200">{telefoneDisplay(modalPerfil.telefone)}</p>
                  </div>
                </div>
                {canViewFinancials && (
                  <>
                    <div className="flex items-center gap-3 text-sm">
                      <DollarSign size={15} className="text-gray-500 shrink-0" />
                      <div>
                        <p className="text-gray-500 text-xs">Diária Base</p>
                        <p className="text-gray-200">R$ {modalPerfil.diaria},00</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <QrCode size={15} className="text-gray-500 shrink-0" />
                      <div>
                        <p className="text-gray-500 text-xs">Chave PIX</p>
                        {modalPerfil.chave_pix ? (
                          <button
                            onClick={() => copiarPix(modalPerfil.chave_pix)}
                            className="text-green-400 hover:text-green-300 flex items-center gap-1 transition-colors"
                          >
                            {modalPerfil.chave_pix}
                            <Copy size={12} />
                          </button>
                        ) : (
                          <p className="text-gray-600 italic">Não informado</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  onClick={() => { setModalPerfil(null); abrirWhatsapp(modalPerfil); }}
                  className="flex-1 py-2.5 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white text-sm font-medium flex items-center justify-center gap-2"
                >
                  <MessageCircle size={15} /> Convidar
                </button>
                <button onClick={() => setModalPerfil(null)} className="flex-1 py-2.5 rounded-lg border border-[#333] text-gray-300 hover:bg-[#1a1a1a] text-sm">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ALTERAR STATUS */}
      {modalStatus && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#222] rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
            <h3 className="text-lg font-bold text-white mb-2">Alterar Status</h3>
            <p className="text-sm text-gray-400 mb-6">
              Como está a disponibilidade de <strong className="text-white">{modalStatus.nome}</strong>?
            </p>
            <div className="space-y-3">
              <button onClick={() => handleMudarStatus(modalStatus.id, "disponivel")} className="w-full py-3 rounded-lg border border-green-500/30 bg-green-500/10 text-green-500 font-medium hover:bg-green-500/20 transition-colors">✅ Disponível</button>
              <button onClick={() => handleMudarStatus(modalStatus.id, "em_job")} className="w-full py-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-500 font-medium hover:bg-yellow-500/20 transition-colors">🎯 Em Job Agora</button>
              <button onClick={() => handleMudarStatus(modalStatus.id, "indisponivel")} className="w-full py-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-500 font-medium hover:bg-red-500/20 transition-colors">🔴 Indisponível</button>
            </div>
            <button onClick={() => setModalStatus(null)} className="mt-6 text-sm text-gray-500 hover:text-white">Cancelar</button>
          </div>
        </div>
      )}

      {/* MODAL: AVALIAÇÃO */}
      {modalAvaliacao && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#222] rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
            <h3 className="text-lg font-bold text-white mb-2">Avaliar {modalAvaliacao.nome}</h3>
            <p className="text-sm text-gray-400 mb-6">Qual a nota para o desempenho deste profissional?</p>
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((nota) => (
                <button key={nota} onClick={() => setNovaNota(nota)} className="focus:outline-none transition-transform hover:scale-110">
                  <Star size={32} className={nota <= novaNota ? "text-yellow-500 fill-yellow-500" : "text-gray-600"} />
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModalAvaliacao(null)} className="flex-1 py-2.5 rounded-lg border border-[#333] text-gray-300 hover:bg-[#1a1a1a]">Cancelar</button>
              <button onClick={handleAvaliar} className="flex-1 py-2.5 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white font-medium">Salvar Nota</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR EXCLUSÃO */}
      {modalDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#222] rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <AlertTriangle size={32} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Excluir Freelancer?</h3>
            <p className="text-sm text-gray-400 mb-6">
              Tem certeza que deseja remover <strong className="text-white">{modalDelete.nome}</strong> da sua base? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setModalDelete(null)} className="flex-1 py-2.5 rounded-lg border border-[#333] text-gray-300 hover:bg-[#1a1a1a]">Cancelar</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FILTROS AVANÇADOS */}
      {modalFiltros && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#222] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-[#222]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Filter size={18} className="text-green-500" /> Filtros Avançados
              </h3>
              <button onClick={() => setModalFiltros(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-6">
              <div>
                <label className="block text-sm text-gray-400 mb-3">
                  Diária Máxima: <span className="text-white font-medium">R$ {filtrosAvancados.precoMax}</span>
                </label>
                <input
                  type="range" min="100" max="2000" step="50"
                  value={filtrosAvancados.precoMax}
                  onChange={(e) => setFiltrosAvancados({ ...filtrosAvancados, precoMax: Number(e.target.value) })}
                  className="w-full accent-green-500"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>R$ 100</span><span>R$ 2.000</span>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-3">
                  Avaliação Mínima: <span className="text-white font-medium">{filtrosAvancados.avaliacaoMin} estrelas</span>
                </label>
                <input
                  type="range" min="0" max="5" step="0.5"
                  value={filtrosAvancados.avaliacaoMin}
                  onChange={(e) => setFiltrosAvancados({ ...filtrosAvancados, avaliacaoMin: Number(e.target.value) })}
                  className="w-full accent-green-500"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>Qualquer</span><span>5 ★</span>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-[#222] flex justify-between">
              <button
                onClick={() => setFiltrosAvancados({ precoMax: 2000, avaliacaoMin: 0 })}
                className="text-sm text-gray-500 hover:text-white"
              >
                Resetar filtros
              </button>
              <button
                onClick={() => setModalFiltros(false)}
                className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg text-sm font-medium"
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: WHATSAPP */}
      {modalWhatsapp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#222] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-[#222] bg-[#25D366]/10">
              <h3 className="text-lg font-bold text-[#25D366] flex items-center gap-2">
                <MessageCircle size={18} /> Enviar Convite
              </h3>
              <button onClick={() => setModalWhatsapp(null)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-400 mb-3">
                Editando mensagem para <strong className="text-white">{modalWhatsapp.nome}</strong>
                {" "}· <span className="text-gray-500">{telefoneDisplay(modalWhatsapp.telefone)}</span>
              </p>
              <textarea
                rows={6}
                value={msgWhatsapp}
                onChange={(e) => setMsgWhatsapp(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-3 text-sm text-gray-200 focus:border-[#25D366] focus:outline-none resize-none"
              />
            </div>
            <div className="p-5 border-t border-[#222] flex justify-end gap-3">
              <button onClick={() => setModalWhatsapp(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancelar</button>
              <button onClick={enviarWhatsapp} className="bg-[#25D366] hover:bg-[#20bd5a] text-white px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                <Send size={16} /> Abrir WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}