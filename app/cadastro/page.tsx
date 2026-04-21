"use client";

import React, { useState } from "react";
import { UserPlus, Upload, CheckCircle2, ChevronRight, Camera, FileText } from "lucide-react";

export default function PublicCadastroPage() {
  const [step, setStep] = useState(1);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-2xl bg-[#121212] border border-[#222] rounded-2xl shadow-2xl overflow-hidden">
        
        <div className="bg-[#161616] p-8 text-center border-b border-[#222]">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
            <UserPlus size={32} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Trabalhe Conosco</h1>
          <p className="text-sm text-gray-400 mt-2">Faça parte do nosso banco de talentos para eventos.</p>
        </div>

        <div className="p-8">
          <div className="flex items-center justify-between mb-8 relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-px bg-[#222] z-0"></div>
            <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? 'bg-green-500 text-white' : 'bg-[#222] text-gray-500'}`}>1</div>
            <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? 'bg-green-500 text-white' : 'bg-[#222] text-gray-500'}`}>2</div>
            <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= 3 ? 'bg-green-500 text-white' : 'bg-[#222] text-gray-500'}`}>3</div>
          </div>

          <form className="space-y-6">
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <h2 className="text-lg font-medium text-white mb-4">Dados Pessoais</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Nome Completo *</label>
                    <input type="text" className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-3 text-sm text-white focus:border-green-500 focus:outline-none" placeholder="Digite seu nome" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">WhatsApp *</label>
                    <input type="text" className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-3 text-sm text-white focus:border-green-500 focus:outline-none" placeholder="(00) 00000-0000" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">CPF *</label>
                    <input type="text" className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-3 text-sm text-white focus:border-green-500 focus:outline-none" placeholder="000.000.000-00" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">E-mail</label>
                    <input type="email" className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-3 text-sm text-white focus:border-green-500 focus:outline-none" placeholder="seu@email.com" />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <h2 className="text-lg font-medium text-white mb-4">Especialidade & Valores</h2>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Especialidade Principal *</label>
                  <select className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-3 text-sm text-white focus:border-green-500 focus:outline-none">
                    <option value="">Selecione sua área</option>
                    <option value="audio">Técnico de Áudio</option>
                    <option value="luz">Iluminador(a)</option>
                    <option value="roadie">Roadie</option>
                    <option value="produtor">Produtor(a)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Valor da Diária Base (R$) *</label>
                  <input type="number" className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-3 text-sm text-white focus:border-green-500 focus:outline-none" placeholder="Ex: 350" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Tamanho da Camisa (Uniforme)</label>
                  <div className="flex gap-3 mt-2">
                    {['P', 'M', 'G', 'GG', 'XG'].map(size => (
                      <label key={size} className="flex-1 cursor-pointer">
                        <input type="radio" name="tamanho" className="peer sr-only" />
                        <div className="text-center py-2 border border-[#333] rounded-lg text-sm text-gray-400 peer-checked:bg-green-500/10 peer-checked:border-green-500 peer-checked:text-green-500 transition-colors">
                          {size}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <h2 className="text-lg font-medium text-white mb-4">Fotos & Documentos</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border-2 border-dashed border-[#333] rounded-xl p-6 text-center hover:border-green-500 transition-colors cursor-pointer group">
                    <Camera size={32} className="mx-auto text-gray-500 group-hover:text-green-500 mb-2" />
                    <p className="text-sm text-white font-medium">Foto de Rosto</p>
                    <p className="text-xs text-gray-500 mt-1">Para crachá e identificação</p>
                  </div>
                  <div className="border-2 border-dashed border-[#333] rounded-xl p-6 text-center hover:border-green-500 transition-colors cursor-pointer group">
                    <FileText size={32} className="mx-auto text-gray-500 group-hover:text-green-500 mb-2" />
                    <p className="text-sm text-white font-medium">Documento / DRT</p>
                    <p className="text-xs text-gray-500 mt-1">Opcional (PDF ou JPG)</p>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-6 border-t border-[#222] flex justify-between">
              {step > 1 ? (
                <button type="button" onClick={() => setStep(step - 1)} className="px-6 py-3 text-sm text-gray-400 hover:text-white">Voltar</button>
              ) : <div></div>}
              
              {step < 3 ? (
                <button type="button" onClick={() => setStep(step + 1)} className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-lg text-sm font-medium flex items-center gap-2">Próximo <ChevronRight size={16}/></button>
              ) : (
                <button type="button" className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-lg text-sm font-medium flex items-center gap-2"><CheckCircle2 size={16}/> Enviar Cadastro</button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}