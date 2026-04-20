"use client";

import React, { useState } from "react";
import { Settings, Plus, Trash2, Save, Link as LinkIcon, Eye, ToggleRight, ToggleLeft, GripVertical } from "lucide-react";

export default function FormBuilderPage() {
  const [camposPadrao, setCamposPadrao] = useState([
    { id: 'nome', label: 'Nome Completo', ativo: true, obrigatorio: true, fixo: true },
    { id: 'whatsapp', label: 'WhatsApp', ativo: true, obrigatorio: true, fixo: true },
    { id: 'email', label: 'E-mail', ativo: true, obrigatorio: false, fixo: false },
    { id: 'cpf', label: 'CPF', ativo: true, obrigatorio: true, fixo: false },
    { id: 'foto', label: 'Foto de Perfil', ativo: true, obrigatorio: true, fixo: false },
  ]);

  const [camposPersonalizados, setCamposPersonalizados] = useState([
    { id: 1, label: 'Especialidade Principal', tipo: 'texto', obrigatorio: true },
    { id: 2, label: 'Tamanho da Camisa (Uniforme)', tipo: 'selecao', obrigatorio: false },
  ]);

  const toggleCampoPadrao = (id: string, propriedade: 'ativo' | 'obrigatorio') => {
    setCamposPadrao(camposPadrao.map(campo => campo.id === id && !campo.fixo ? { ...campo, [propriedade]: !campo[propriedade] } : campo));
  };

  const removerCampoPersonalizado = (id: number) => setCamposPersonalizados(camposPersonalizados.filter(c => c.id !== id));
  
  const adicionarCampo = () => setCamposPersonalizados([...camposPersonalizados, { id: Date.now(), label: 'Novo Campo', tipo: 'texto', obrigatorio: false }]);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Settings className="text-green-500" /> Construtor de Formulário</h2>
          <p className="text-sm text-gray-400 mt-1">Personalize os dados que você exige dos freelancers no cadastro.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-[#121212] border border-[#222] text-gray-300 px-4 py-2 rounded-md text-sm flex items-center gap-2"><Eye size={16} /> Pré-visualizar</button>
          <button className="bg-green-600 text-white px-4 py-2 rounded-md text-sm flex items-center gap-2"><Save size={16} /> Salvar</button>
        </div>
      </div>

      <div className="bg-green-500/10 border border-green-500/20 p-5 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <div>
          <h3 className="text-green-500 font-medium flex items-center gap-2"><LinkIcon size={18} /> Link de Captação</h3>
          <p className="text-sm text-gray-400 mt-1">Envie este link para os freelancers se cadastrarem.</p>
        </div>
        <div className="flex items-center gap-2 bg-[#0a0a0a] border border-[#222] px-4 py-2 rounded-lg">
          <span className="text-sm text-gray-300">axoncrew.com/sua-agencia/cadastro</span>
          <button className="ml-4 text-green-500 text-sm font-medium">Copiar</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-medium text-white mb-4">Dados Pessoais (Padrão)</h3>
          <div className="bg-[#121212] border border-[#222] rounded-xl overflow-hidden">
            <div className="divide-y divide-[#222]">
              {camposPadrao.map((campo) => (
                <div key={campo.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3"><GripVertical size={16} className="text-gray-600" />
                    <div><p className="text-sm font-medium text-gray-200">{campo.label}</p></div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2"><span className="text-xs text-gray-400">Exigir?</span>
                      <button onClick={() => toggleCampoPadrao(campo.id, 'obrigatorio')} disabled={campo.fixo} className={campo.obrigatorio ? 'text-green-500' : 'text-gray-600'}>
                        {campo.obrigatorio ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                      </button>
                    </div>
                    <div className="flex items-center gap-2"><span className="text-xs text-gray-400">Ativo?</span>
                      <button onClick={() => toggleCampoPadrao(campo.id, 'ativo')} disabled={campo.fixo} className={campo.ativo ? 'text-green-500' : 'text-gray-600'}>
                        {campo.ativo ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-white">Campos Específicos (Nicho)</h3>
            <button onClick={adicionarCampo} className="text-sm text-green-500 flex items-center gap-1"><Plus size={16} /> Adicionar</button>
          </div>
          <div className="space-y-3">
            {camposPersonalizados.map((campo) => (
              <div key={campo.id} className="bg-[#121212] border border-[#222] p-4 rounded-xl flex gap-4 items-start">
                <GripVertical size={16} className="text-gray-600 mt-2" />
                <div className="flex-1 space-y-3">
                  <input type="text" defaultValue={campo.label} className="w-full bg-[#0a0a0a] border border-[#333] rounded-md py-1.5 px-3 text-sm text-gray-200" />
                  <div className="flex items-center gap-4">
                    <select className="bg-[#0a0a0a] border border-[#333] rounded-md py-1 px-2 text-xs text-gray-300">
                      <option value="texto">Texto Curto</option>
                      <option value="numero">Número</option>
                      <option value="selecao">Múltipla Escolha</option>
                    </select>
                    <label className="flex items-center gap-2 text-xs text-gray-400"><input type="checkbox" defaultChecked={campo.obrigatorio} className="accent-green-500" /> Obrigatório</label>
                  </div>
                </div>
                <button onClick={() => removerCampoPersonalizado(campo.id)} className="text-gray-600 hover:text-red-500"><Trash2 size={18} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}