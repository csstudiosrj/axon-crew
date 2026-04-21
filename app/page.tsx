"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  UserPlus, MessageCircle, Search, Filter, CheckCircle2, Clock, 
  MoreVertical, Star, X, Trash2, Edit, User, AlertTriangle, Send, Check
} from "lucide-react";
import { supabase } from "../lib/supabase";

// Lista de Especialidades Padronizadas (Futuramente virá das Configurações)
const ESPECIALIDADES =[
  "Técnico de Áudio", "Iluminador(a)", "Técnico de Vídeo", 
  "Roadie", "Produtor(a)", "Cenógrafo(a)", "Carregador", "Recepcionista"
];

export default function CrewDashboard() {
  // ================= ESTADOS GERAIS =================
  const[freelancers, setFreelancers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroEspecialidade, setFiltroEspecialidade] = useState("todas");
  const [menuAberto, setMenuAberto] = useState<string | null>(null);
  const [toast, setToast] = useState<{msg: string, tipo: 'sucesso' | 'erro'} | null>(null);

  const currentUserRole = "admin"; 
  const canViewFinancials = currentUserRole === "admin" || currentUserRole === "financeiro";

  // ================= ESTADOS DOS MODAIS =================
  const [modalFiltros, setModalFiltros] = useState(false);
  const[filtrosAvancados, setFiltrosAvancados] = useState({ precoMax: 2000, avaliacaoMin: 0 });

  const [modalCadastro, setModalCadastro] = useState(false);
  const [novoFreela, setNovoFreela] = useState({ nome: '', especialidade: ESPECIALIDADES[0], telefone: '', diaria: '' });

  const [modalStatus, setModalStatus] = useState<any | null>(null);
  const [modalDelete, setModalDelete] = useState<any | null>(null);
  const [modalAvaliacao, setModalAvaliacao] = useState<any | null>(null);
  const [novaNota, setNovaNota] = useState(5);
  
  const[modalWhatsapp, setModalWhatsapp] = useState<any | null>(null);
  const [msgWhatsapp, setMsgWhatsapp] = useState("");

  // ================= EFEITOS E SUPABASE =================
  useEffect(() => {
    fetchFreelancers();
  },[]);

  const fetchFreelancers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('freelancers').select('*').order('created_at', { ascending: false });
    if (error) mostrarToast("Erro ao carregar dados do banco", "erro");
    else if (data) setFreelancers(data);
    setIsLoading(false);
  };

  const mostrarToast = (msg: string, tipo: 'sucesso' | 'erro') => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3000);
  };

  // ================= MÁSCARA DE WHATSAPP =================
  const formatarTelefone = (valor: string) => {
    let v = valor.replace(/\D/g, ""); // Remove tudo que não é número
    if (v.length <= 11) {
      v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
      v = v.replace(/(\d{5})(\d{4})$/, "$1-$2");
    }
    return v;
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNovoFreela({ ...novoFreela, telefone: formatarTelefone(e.target.value) });
  };

  // ================= LÓGICA DE FILTROS =================
  const freelancersFiltrados = useMemo(() => {
    return freelancers.filter((freela) => {
      const matchBusca = freela.nome.toLowerCase().includes(busca.toLowerCase());
      const matchStatus = filtroStatus === "todos" || freela.status === filtroStatus;
      const matchEspecialidade = filtroEspecialidade === "todas" || freela.especialidade === filtroEspecialidade;
      const matchPreco = freela.diaria <= filtrosAvancados.precoMax;
      const matchAvaliacao = freela.avaliacao >= filtrosAvancados.avaliacaoMin;
      return matchBusca && matchStatus && matchEspecialidade && matchPreco && matchAvaliacao;
    });
  },[freelancers, busca, filtroStatus, filtroEspecialidade, filtrosAvancados]);

  const totalBase = freelancers.length;
  const totalDisponiveis = freelancers.filter(f => f.status === "disponivel").length;
  const totalEmJob = freelancers.filter(f => f.status === "em_job").length;

  // ================= FUNÇÕES DE AÇÃO (CRUD) =================
  const handleCadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    const telefoneLimpo = novoFreela.telefone.replace(/\D/g, '');
    
    if(telefoneLimpo.length < 10) {
      mostrarToast("Digite um telefone válido", "erro");
      return;
    }

    const { data, error } = await supabase.from('freelancers').insert([{
      nome: novoFreela.nome,
      especialidade: novoFreela.especialidade,
      telefone: telefoneLimpo,
      diaria: Number(novoFreela.diaria),
      status: 'disponivel',
      avaliacao: 5.0
    }]).select();

    if (error) {
      mostrarToast("Erro ao salvar no banco", "erro");
    } else if (data) {
      setFreelancers([data[0], ...freelancers]);
      setModalCadastro(false);
      setNovoFreela({ nome: '', especialidade: ESPECIALIDADES[0], telefone: '', diaria: '' });
      mostrarToast("Freelancer cadastrado com sucesso!", "sucesso");
    }
  };

  const handleMudarStatus = async (id: string, novoStatus: string) => {
    const { error } = await supabase.from('freelancers').update({ status: novoStatus }).eq('id', id);
    if (!error) {
      setFreelancers(freelancers.map(f => f.id === id ? { ...f, status: novoStatus } : f));
      setModalStatus(null);
      mostrarToast("Status atualizado", "sucesso");
    } else {
      mostrarToast("Erro ao atualizar status", "erro");
    }
  };

  const handleAvaliar = async () => {
    if (!modalAvaliacao) return;
    const { error } = await supabase.from('freelancers').update({ avaliacao: novaNota }).eq('id', modalAvaliacao.id);
    if (!error) {
      setFreelancers(freelancers.map(f => f.id === modalAvaliacao.id ? { ...f, avaliacao: novaNota } : f));
      setModalAvaliacao(null);
      mostrarToast("Avaliação atualizada", "sucesso");
    }
  };

  const handleDelete = async () => {
    if (!modalDelete) return;
    const { error } = await supabase.from('freelancers').delete().eq('id', modalDelete.id);
    if (!error) {
      setFreelancers(freelancers.filter(f => f.id !== modalDelete.id));
      setModalDelete(null);
      mostrarToast("Freelancer removido", "sucesso");
    }
  };

  const abrirModalWhatsapp = (freela: any) => {
    const mensagemPadrao = `Fala ${freela.nome.split(' ')[0]}, tudo bem? Temos um job de ${freela.especialidade} para os próximos dias. A diária base é R$ ${freela.diaria}. Tem disponibilidade?`;
    setMsgWhatsapp(mensagemPadrao);
    setModalWhatsapp(freela);
  };

  const enviarWhatsapp = () => {
    const url = `https://wa.me/55${modalWhatsapp.telefone}?text=${encodeURIComponent(msgWhatsapp)}`;
    window.open(url, "_blank");
    setModalWhatsapp(null);
  };

  // ================= RENDERIZAÇÃO =================
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full relative">
      
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl animate-in slide-in-from-bottom-5 ${toast.tipo === 'sucesso' ? 'bg-green-900/90 border border-green-500 text-green-100' : 'bg-red-900/90 border border-red-500 text-red-100'}`}>
          {toast.tipo === 'sucesso' ? <CheckCircle2 size={20} className="text-green-400"/> : <AlertTriangle size={20} className="text-red-400"/>}
          <p className="text-sm font-medium">{toast.msg}</p>
        </div>
      )}

      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Banco de Talentos</h2>
          <p className="text-sm text-gray-400 mt-1">Gerencie seus freelancers e dispare convites rápidos via WhatsApp.</p>
        </div>
        <button onClick={() => setModalCadastro(true)} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-green-900/20">
          <UserPlus size={18} /> Cadastrar Freela
        </button>
      </div>

      {/* CARDS */}
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
          <input type="text" placeholder="Buscar por nome..." className="w-full bg-[#121212] border border-[#222] rounded-lg py-2.5 pl-10 pr-4 text-sm text-gray-200 focus:outline-none focus:border-green-500" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        
        {/* NOVO FILTRO DE ESPECIALIDADE */}
        <select className="bg-[#121212] border border-[#222] text-gray-300 text-sm rounded-lg py-2.5 px-4 focus:outline-none focus:border-green-500 cursor-pointer" value={filtroEspecialidade} onChange={(e) => setFiltroEspecialidade(e.target.value)}>
          <option value="todas">Todas as Especialidades</option>
          {ESPECIALIDADES.map(esp => <option key={esp} value={esp}>{esp}</option>)}
        </select>

        <select className="bg-[#121212] border border-[#222] text-gray-300 text-sm rounded-lg py-2.5 px-4 focus:outline-none focus:border-green-500 cursor-pointer" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
          <option value="todos">Todos os Status</option>
          <option value="disponivel">Apenas Disponíveis</option>
          <option value="em_job">Em Job Agora</option>
          <option value="indisponivel">Indisponíveis</option>
        </select>
        
        <button onClick={() => setModalFiltros(true)} className="bg-[#121212] border border-[#222] hover:bg-[#1a1a1a] px-4 py-2.5 rounded-lg text-sm text-gray-300 flex items-center gap-2">
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
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Carregando base de talentos...</td></tr>
              ) : freelancersFiltrados.length > 0 ? (
                freelancersFiltrados.map((freela) => (
                  <tr key={freela.id} className="hover:bg-[#161616]/50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-gray-200">{freela.nome}</td>
                    <td className="px-6 py-4 text-gray-400">{freela.especialidade}</td>
                    <td className="px-6 py-4 text-gray-400">
                      <div className="flex items-center gap-1"><Star size={14} className="text-yellow-500 fill-yellow-500" /><span>{freela.avaliacao}</span></div>
                    </td>
                    {canViewFinancials && <td className="px-6 py-4 text-gray-400">R$ {freela.diaria},00</td>}
                    <td className="px-6 py-4">
                      <button onClick={() => setModalStatus(freela)} className="hover:opacity-80 transition-opacity">
                        {freela.status === 'disponivel' && <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-md text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Disponível</span>}
                        {freela.status === 'em_job' && <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-md text-xs font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span> Em Job</span>}
                        {freela.status === 'indisponivel' && <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-md text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Indisponível</span>}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2 relative">
                      <button onClick={() => abrirModalWhatsapp(freela)} className="bg-[#25D366] hover:bg-[#20bd5a] text-white px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 shadow-sm"><MessageCircle size={14} /> Convidar</button>
                      
                      {/* Dropdown 3 Pontos */}
                      <button onClick={() => setMenuAberto(menuAberto === freela.id ? null : freela.id)} className="text-gray-500 hover:text-gray-300 p-1.5 bg-[#1a1a1a] rounded-md border border-[#333]">
                        <MoreVertical size={16} />
                      </button>

                      {menuAberto === freela.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuAberto(null)}></div>
                          <div className="absolute right-6 top-12 w-40 bg-[#121212] border border-[#333] rounded-lg shadow-2xl z-20 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2">
                            <button onClick={() => setMenuAberto(null)} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#1a1a1a] hover:text-white flex items-center gap-2"><User size={14}/> Ver Perfil</button>
                            <button onClick={() => { setMenuAberto(null); setModalAvaliacao(freela); setNovaNota(freela.avaliacao); }} className="w-full text-left px-4 py-2 text-sm text-yellow-500 hover:bg-[#1a1a1a] flex items-center gap-2"><Star size={14}/> Avaliar</button>
                            <div className="h-px bg-[#222] my-1"></div>
                            <button onClick={() => { setMenuAberto(null); setModalDelete(freela); }} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"><Trash2 size={14}/> Excluir</button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={canViewFinancials ? 6 : 5} className="px-6 py-12 text-center text-gray-500">Nenhum freelancer encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAIS ================= */}

      {/* Modal de Avaliação */}
      {modalAvaliacao && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#222] rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
            <h3 className="text-lg font-bold text-white mb-2">Avaliar {modalAvaliacao.nome}</h3>
            <p className="text-sm text-gray-400 mb-6">Qual a nota para o desempenho deste profissional?</p>
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((nota) => (
                <button key={nota} onClick={() => setNovaNota(nota)} className="focus:outline-none transition-transform hover:scale-110">
                  <Star size={32} className={`${nota <= novaNota ? 'text-yellow-500 fill-yellow-500' : 'text-gray-600'}`} />
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

      {/* Modal de Cadastro */}
      {modalCadastro && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#222] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-[#222]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><UserPlus size={18} className="text-green-500"/> Novo Freelancer</h3>
              <button onClick={() => setModalCadastro(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleCadastrar} className="p-5 space-y-4">
              <div><label className="block text-xs text-gray-400 mb-1">Nome Completo</label><input required type="text" value={novoFreela.nome} onChange={e => setNovoFreela({...novoFreela, nome: e.target.value})} className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-2.5 text-sm text-white focus:border-green-500 focus:outline-none" /></div>
              
              {/* SELECT DE ESPECIALIDADE */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Especialidade</label>
                <select required value={novoFreela.especialidade} onChange={e => setNovoFreela({...novoFreela, especialidade: e.target.value})} className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-2.5 text-sm text-white focus:border-green-500 focus:outline-none cursor-pointer">
                  {ESPECIALIDADES.map(esp => <option key={esp} value={esp}>{esp}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* INPUT COM MÁSCARA */}
                <div><label className="block text-xs text-gray-400 mb-1">WhatsApp</label><input required type="text" placeholder="(11) 99999-9999" value={novoFreela.telefone} onChange={handleTelefoneChange} maxLength={15} className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-2.5 text-sm text-white focus:border-green-500 focus:outline-none" /></div>
                <div><label className="block text-xs text-gray-400 mb-1">Diária Base (R$)</label><input required type="number" placeholder="350" value={novoFreela.diaria} onChange={e => setNovoFreela({...novoFreela, diaria: e.target.value})} className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-2.5 text-sm text-white focus:border-green-500 focus:outline-none" /></div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setModalCadastro(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancelar</button>
                <button type="submit" className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg text-sm font-medium">Salvar na Base</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Alterar Status */}
      {modalStatus && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#222] rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
            <h3 className="text-lg font-bold text-white mb-2">Alterar Status</h3>
            <p className="text-sm text-gray-400 mb-6">Como está a disponibilidade de <strong className="text-white">{modalStatus.nome}</strong>?</p>
            <div className="space-y-3">
              <button onClick={() => handleMudarStatus(modalStatus.id, 'disponivel')} className="w-full py-3 rounded-lg border border-green-500/30 bg-green-500/10 text-green-500 font-medium hover:bg-green-500/20 transition-colors">Disponível</button>
              <button onClick={() => handleMudarStatus(modalStatus.id, 'em_job')} className="w-full py-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-500 font-medium hover:bg-yellow-500/20 transition-colors">Em Job Agora</button>
              <button onClick={() => handleMudarStatus(modalStatus.id, 'indisponivel')} className="w-full py-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-500 font-medium hover:bg-red-500/20 transition-colors">Indisponível</button>
            </div>
            <button onClick={() => setModalStatus(null)} className="mt-6 text-sm text-gray-500 hover:text-white">Cancelar</button>
          </div>
        </div>
      )}

      {/* Modal de Exclusão */}
      {modalDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#222] rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20"><AlertTriangle size={32} className="text-red-500" /></div>
            <h3 className="text-lg font-bold text-white mb-2">Excluir Freelancer?</h3>
            <p className="text-sm text-gray-400 mb-6">Tem certeza que deseja remover <strong className="text-white">{modalDelete.nome}</strong> da sua base?</p>
            <div className="flex gap-3">
              <button onClick={() => setModalDelete(null)} className="flex-1 py-2.5 rounded-lg border border-[#333] text-gray-300 hover:bg-[#1a1a1a]">Cancelar</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Filtros Avançados */}
      {modalFiltros && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#222] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-[#222]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Filter size={18} className="text-green-500"/> Filtros Avançados</h3>
              <button onClick={() => setModalFiltros(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Diária Máxima: R$ {filtrosAvancados.precoMax}</label>
                <input type="range" min="100" max="2000" step="50" value={filtrosAvancados.precoMax} onChange={(e) => setFiltrosAvancados({...filtrosAvancados, precoMax: Number(e.target.value)})} className="w-full accent-green-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Avaliação Mínima: {filtrosAvancados.avaliacaoMin} Estrelas</label>
                <input type="range" min="0" max="5" step="0.5" value={filtrosAvancados.avaliacaoMin} onChange={(e) => setFiltrosAvancados({...filtrosAvancados, avaliacaoMin: Number(e.target.value)})} className="w-full accent-green-500" />
              </div>
            </div>
            <div className="p-5 border-t border-[#222] flex justify-end">
              <button onClick={() => setModalFiltros(false)} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg text-sm font-medium">Aplicar Filtros</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal WhatsApp */}
      {modalWhatsapp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#222] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-[#222] bg-[#25D366]/10">
              <h3 className="text-lg font-bold text-[#25D366] flex items-center gap-2"><MessageCircle size={18}/> Enviar Convite</h3>
              <button onClick={() => setModalWhatsapp(null)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-5">
              <label className="block text-sm text-gray-400 mb-2">Edite a mensagem antes de enviar para {modalWhatsapp.nome}:</label>
              <textarea rows={5} value={msgWhatsapp} onChange={(e) => setMsgWhatsapp(e.target.value)} className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-3 text-sm text-gray-200 focus:border-[#25D366] focus:outline-none resize-none" />
            </div>
            <div className="p-5 border-t border-[#222] flex justify-end gap-3">
              <button onClick={() => setModalWhatsapp(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancelar</button>
              <button onClick={enviarWhatsapp} className="bg-[#25D366] hover:bg-[#20bd5a] text-white px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><Send size={16} /> Abrir WhatsApp</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}