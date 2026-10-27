"use client";

import { useState } from "react";
import Link from "next/link";
import { Send, CheckCircle2, XCircle, RotateCcw, Heart, BellRing, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { chamarApi } from "@/lib/api";
import { dataBR, formatarBRL } from "@/lib/validacao";
import { Modal, BotoesModal, Rotulo, Vazio, campo, card, dataHora, usePainelAdmin } from "./ui";

export interface Fatura {
  id: string;
  numero: number;
  company_id: string;
  empresa: string;
  email: string | null;
  competencia: string | null;
  descricao: string;
  plano: string | null;
  valor: number;
  vencimento: string;
  status: "pendente" | "paga" | "cancelada";
  pago_em: string | null;
  valor_pago: number | null;
  forma_pagamento: string | null;
  pagamento_informado_em: string | null;
  observacao: string | null;
  criado_em: string;
  dias_atraso: number;
  ultimo_email_em: string | null;
  ultimo_email_tipo: string | null;
}

export const NOME_EMAIL: Record<string, string> = {
  fatura_nova: "Fatura disponível",
  lembrete: "Lembrete de vencimento",
  vence_hoje: "Vence hoje",
  atraso_1: "Atraso (1º aviso)",
  cobranca_manual: "Cobrança manual",
  agradecimento: "Agradecimento",
  suspensao: "Aviso de suspensão",
  livre: "Mensagem",
  suporte_resposta: "Resposta do suporte",
  suporte_mensagem: "Aviso de suporte",
};
export const nomeEmail = (tipo: string) =>
  NOME_EMAIL[tipo] ?? (tipo.startsWith("atraso_") ? `Atraso (${tipo.slice(7)} dias)` : tipo);

export function SituacaoFatura({ f }: { f: Fatura }) {
  if (f.status === "paga") return <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">Paga</span>;
  if (f.status === "cancelada") return <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-arx-slate">Cancelada</span>;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {f.dias_atraso > 0
        ? <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-300">Vencida há {f.dias_atraso} {f.dias_atraso === 1 ? "dia" : "dias"}</span>
        : <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300">Em aberto</span>}
      {f.pagamento_informado_em && <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] font-semibold text-sky-300" title={`Informado em ${dataHora(f.pagamento_informado_em)}`}>Informou pagamento</span>}
    </span>
  );
}

type Acao =
  | { tipo: "cobrar"; f: Fatura }
  | { tipo: "baixar"; f: Fatura }
  | { tipo: "cancelar"; f: Fatura }
  | { tipo: "reabrir"; f: Fatura }
  | { tipo: "agradecer"; f: Fatura };

const hojeISO = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

export function TabelaFaturas({ faturas, aoMudar, mostrarEmpresa = true }: {
  faturas: Fatura[]; aoMudar: () => void; mostrarEmpresa?: boolean;
}) {
  const { avisar, atualizarContadores } = usePainelAdmin();
  const [acao, setAcao] = useState<Acao | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [baixa, setBaixa] = useState({ data: "", valor: "", forma: "pix", obs: "", agradecer: true });

  const abrir = (a: Acao) => {
    setMensagem("");
    if (a.tipo === "baixar") setBaixa({ data: hojeISO(), valor: String(a.f.valor), forma: "pix", obs: "", agradecer: true });
    setAcao(a);
  };

  const concluir = (msg: string) => {
    avisar(msg);
    setAcao(null);
    aoMudar();
    atualizarContadores();
  };

  const confirmar = async () => {
    if (!acao) return;
    setSalvando(true);
    const { f } = acao;
    try {
      if (acao.tipo === "cobrar") {
        const r = await chamarApi("/api/admin/email", { acao: "cobranca", fatura_id: f.id, mensagem });
        if (!r.ok) return avisar(`E-mail não enviado: ${r.erro}`);
        concluir(`Cobrança enviada para ${f.email}.`);
      } else if (acao.tipo === "agradecer") {
        const r = await chamarApi("/api/admin/email", { acao: "agradecimento", fatura_id: f.id });
        if (!r.ok) return avisar(`E-mail não enviado: ${r.erro}`);
        concluir(`Agradecimento enviado para ${f.email}.`);
      } else if (acao.tipo === "baixar") {
        const valor = Number(baixa.valor.replace(",", "."));
        const { error } = await supabase.rpc("admin_baixar_fatura", {
          p_fatura: f.id, p_pago_em: baixa.data, p_valor_pago: valor, p_forma: baixa.forma, p_observacao: baixa.obs,
        });
        if (error) return avisar("Não foi possível dar baixa. Tente de novo.");
        if (baixa.agradecer) {
          const r = await chamarApi("/api/admin/email", { acao: "agradecimento", fatura_id: f.id });
          return concluir(r.ok ? "Pagamento registrado e agradecimento enviado." : `Pagamento registrado. O e-mail falhou: ${r.erro}`);
        }
        concluir("Pagamento registrado.");
      } else {
        const { error } = acao.tipo === "cancelar"
          ? await supabase.rpc("admin_cancelar_fatura", { p_fatura: f.id, p_motivo: mensagem })
          : await supabase.rpc("admin_reabrir_fatura", { p_fatura: f.id });
        if (error) return avisar("Não foi possível salvar. Tente de novo.");
        concluir(acao.tipo === "cancelar" ? "Fatura cancelada." : "Fatura reaberta.");
      }
    } finally {
      setSalvando(false);
    }
  };

  const icone = "rounded-md p-2 text-arx-slate hover:bg-white/5 hover:text-white";

  return (
    <>
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full min-w-[980px] text-[14px]">
          <thead className="border-b border-white/10 text-left text-[12px] text-arx-slate">
            <tr>
              <th className="px-5 py-3 font-medium">Fatura</th>
              {mostrarEmpresa && <th className="px-3 py-3 font-medium">Empresa</th>}
              <th className="px-3 py-3 font-medium text-right">Valor</th>
              <th className="px-3 py-3 font-medium">Vencimento</th>
              <th className="px-3 py-3 font-medium">Situação</th>
              <th className="px-3 py-3 font-medium">Último e-mail</th>
              <th className="px-5 py-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {faturas.length === 0 && <tr><td colSpan={7}><Vazio>Nenhuma fatura aqui.</Vazio></td></tr>}
            {faturas.map((f) => (
              <tr key={f.id} className={f.status === "cancelada" ? "opacity-50" : ""}>
                <td className="px-5 py-3.5">
                  <p className="font-medium text-white">nº {f.numero}</p>
                  <p className="text-[12px] text-arx-slate">{f.descricao}</p>
                  {f.observacao && <p className="text-[12px] text-amber-200/80">{f.observacao}</p>}
                </td>
                {mostrarEmpresa && (
                  <td className="px-3 py-3.5">
                    <Link href={`/admin/empresas/${f.company_id}`} className="text-white hover:text-arx-crew-soft">{f.empresa}</Link>
                    <p className="text-[12px] text-arx-slate">{f.email ?? "sem e-mail"}</p>
                  </td>
                )}
                <td className="px-3 py-3.5 text-right tabular-nums text-white">
                  {formatarBRL(Number(f.valor))}
                  {f.status === "paga" && f.valor_pago != null && Number(f.valor_pago) !== Number(f.valor) && (
                    <p className="text-[12px] text-arx-slate">pago {formatarBRL(Number(f.valor_pago))}</p>
                  )}
                </td>
                <td className="px-3 py-3.5 text-arx-mist">
                  {dataBR(f.vencimento)}
                  {f.status === "paga" && f.pago_em && <p className="text-[12px] text-arx-slate">pago em {dataBR(f.pago_em)}{f.forma_pagamento ? ` · ${f.forma_pagamento}` : ""}</p>}
                </td>
                <td className="px-3 py-3.5"><SituacaoFatura f={f} /></td>
                <td className="px-3 py-3.5 text-[12px] text-arx-mist">
                  {f.ultimo_email_em ? <>{nomeEmail(f.ultimo_email_tipo ?? "")}<br /><span className="text-arx-slate">{dataHora(f.ultimo_email_em)}</span></> : <span className="text-arx-slate">nenhum</span>}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-1">
                    {f.status === "pendente" && <>
                      <button onClick={() => abrir({ tipo: "cobrar", f })} title="Enviar cobrança por e-mail" className={icone}><Send size={16} /></button>
                      <button onClick={() => abrir({ tipo: "baixar", f })} title="Registrar pagamento" className="rounded-md p-2 text-emerald-400 hover:bg-white/5"><CheckCircle2 size={16} /></button>
                      <button onClick={() => abrir({ tipo: "cancelar", f })} title="Cancelar fatura" className={`${icone} hover:text-red-300`}><XCircle size={16} /></button>
                    </>}
                    {f.status === "paga" && <>
                      <button onClick={() => abrir({ tipo: "agradecer", f })} title="Enviar agradecimento" className={icone}><Heart size={16} /></button>
                      <button onClick={() => abrir({ tipo: "reabrir", f })} title="Desfazer baixa" className={icone}><RotateCcw size={16} /></button>
                    </>}
                    {f.status === "cancelada" && <button onClick={() => abrir({ tipo: "reabrir", f })} title="Reabrir fatura" className={icone}><RotateCcw size={16} /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {acao?.tipo === "cobrar" && (
        <Modal titulo={`Cobrar fatura nº ${acao.f.numero}`} aoFechar={() => setAcao(null)}>
          <p className="text-[14px] text-arx-mist">
            Envia para <strong className="text-white">{acao.f.email ?? "(sem e-mail)"}</strong> a fatura de {formatarBRL(Number(acao.f.valor))}
            {acao.f.dias_atraso > 0 ? `, vencida há ${acao.f.dias_atraso} dias,` : ""} com o PIX copia e cola e o link para pagar.
          </p>
          <div className="mt-4">
            <Rotulo htmlFor="msg-cobranca">Mensagem (opcional)</Rotulo>
            <textarea id="msg-cobranca" value={mensagem} onChange={(e) => setMensagem(e.target.value)} rows={4} className={campo}
              placeholder="Deixe em branco para usar o texto padrão." />
          </div>
          <BotoesModal aoCancelar={() => setAcao(null)} aoConfirmar={confirmar} salvando={salvando} rotulo="Enviar cobrança" desabilitado={!acao.f.email} />
        </Modal>
      )}

      {acao?.tipo === "agradecer" && (
        <Modal titulo="Enviar agradecimento" aoFechar={() => setAcao(null)}>
          <p className="text-[14px] text-arx-mist">Envia para <strong className="text-white">{acao.f.email}</strong> a confirmação de pagamento da fatura nº {acao.f.numero}.</p>
          <BotoesModal aoCancelar={() => setAcao(null)} aoConfirmar={confirmar} salvando={salvando} rotulo="Enviar" desabilitado={!acao.f.email} />
        </Modal>
      )}

      {acao?.tipo === "baixar" && (
        <Modal titulo={`Registrar pagamento · nº ${acao.f.numero}`} aoFechar={() => setAcao(null)}>
          {acao.f.pagamento_informado_em && (
            <p className="mb-4 flex items-center gap-2 rounded-lg border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-[13px] text-sky-200">
              <BellRing size={14} /> A empresa informou o pagamento em {dataHora(acao.f.pagamento_informado_em)}. Confira no extrato antes de confirmar.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Rotulo htmlFor="baixa-data">Data do pagamento</Rotulo>
              <input id="baixa-data" type="date" value={baixa.data} onChange={(e) => setBaixa({ ...baixa, data: e.target.value })} className={campo} />
            </div>
            <div>
              <Rotulo htmlFor="baixa-valor">Valor recebido</Rotulo>
              <input id="baixa-valor" inputMode="decimal" value={baixa.valor} onChange={(e) => setBaixa({ ...baixa, valor: e.target.value })} className={campo} />
            </div>
          </div>
          <div className="mt-3">
            <Rotulo htmlFor="baixa-forma">Forma</Rotulo>
            <select id="baixa-forma" value={baixa.forma} onChange={(e) => setBaixa({ ...baixa, forma: e.target.value })} className={campo}>
              <option value="pix">PIX</option>
              <option value="boleto">Boleto</option>
              <option value="cartao">Cartão</option>
              <option value="transferencia">Transferência</option>
              <option value="cortesia">Cortesia</option>
            </select>
          </div>
          <div className="mt-3">
            <Rotulo htmlFor="baixa-obs">Observação (opcional)</Rotulo>
            <input id="baixa-obs" value={baixa.obs} onChange={(e) => setBaixa({ ...baixa, obs: e.target.value })} className={campo} placeholder="Ex.: comprovante enviado pelo WhatsApp" />
          </div>
          <label className="mt-4 flex items-center gap-2 text-[14px] text-arx-mist">
            <input type="checkbox" checked={baixa.agradecer} onChange={(e) => setBaixa({ ...baixa, agradecer: e.target.checked })} className="accent-violet-500" />
            <Mail size={14} /> Enviar e-mail de agradecimento
          </label>
          <BotoesModal aoCancelar={() => setAcao(null)} aoConfirmar={confirmar} salvando={salvando} rotulo="Confirmar pagamento"
            desabilitado={!baixa.data || !(Number(baixa.valor.replace(",", ".")) > 0)} />
        </Modal>
      )}

      {acao?.tipo === "cancelar" && (
        <Modal titulo={`Cancelar fatura nº ${acao.f.numero}`} aoFechar={() => setAcao(null)}>
          <p className="text-[14px] text-arx-mist">A fatura deixa de ser cobrada e some dos avisos automáticos.</p>
          <div className="mt-4">
            <Rotulo htmlFor="motivo">Motivo</Rotulo>
            <input id="motivo" value={mensagem} onChange={(e) => setMensagem(e.target.value)} className={campo} placeholder="Ex.: troca de plano, cortesia" />
          </div>
          <BotoesModal aoCancelar={() => setAcao(null)} aoConfirmar={confirmar} salvando={salvando} rotulo="Cancelar fatura" perigo />
        </Modal>
      )}

      {acao?.tipo === "reabrir" && (
        <Modal titulo={`Reabrir fatura nº ${acao.f.numero}`} aoFechar={() => setAcao(null)}>
          <p className="text-[14px] text-arx-mist">
            {acao.f.status === "paga" ? "Desfaz o registro de pagamento: a fatura volta a ficar em aberto." : "A fatura volta a ficar em aberto e entra de novo nos avisos automáticos."}
          </p>
          <BotoesModal aoCancelar={() => setAcao(null)} aoConfirmar={confirmar} salvando={salvando} rotulo="Reabrir" />
        </Modal>
      )}
    </>
  );
}

// Nova fatura avulsa (implantação, ajuste, plano anual...).
export function NovaFatura({ empresas, companyId, aoFechar, aoCriar }: {
  empresas?: { id: string; name: string }[]; companyId?: string; aoFechar: () => void; aoCriar: () => void;
}) {
  const { avisar } = usePainelAdmin();
  const [dados, setDados] = useState({ empresa: companyId ?? "", descricao: "", valor: "", vencimento: "" });
  const [salvando, setSalvando] = useState(false);
  const valor = Number(dados.valor.replace(",", "."));

  const salvar = async () => {
    setSalvando(true);
    const { error } = await supabase.rpc("admin_criar_fatura", {
      p_company: dados.empresa, p_descricao: dados.descricao, p_valor: valor, p_vencimento: dados.vencimento,
    });
    setSalvando(false);
    if (error) { avisar("Não foi possível criar a fatura."); return; }
    avisar("Fatura criada. O aviso por e-mail sai na próxima rotina diária, ou envie agora pelo botão de cobrança.");
    aoCriar();
  };

  return (
    <Modal titulo="Nova fatura avulsa" aoFechar={aoFechar}>
      <div className="space-y-3">
        {!companyId && (
          <div>
            <Rotulo htmlFor="nf-empresa">Empresa</Rotulo>
            <select id="nf-empresa" value={dados.empresa} onChange={(e) => setDados({ ...dados, empresa: e.target.value })} className={campo}>
              <option value="">Escolha a empresa</option>
              {empresas?.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <Rotulo htmlFor="nf-desc">Descrição</Rotulo>
          <input id="nf-desc" value={dados.descricao} onChange={(e) => setDados({ ...dados, descricao: e.target.value })} className={campo}
            placeholder="Ex.: Plano Profissional anual (12 meses)" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Rotulo htmlFor="nf-valor">Valor (R$)</Rotulo>
            <input id="nf-valor" inputMode="decimal" value={dados.valor} onChange={(e) => setDados({ ...dados, valor: e.target.value })} className={campo} placeholder="1490,00" />
          </div>
          <div>
            <Rotulo htmlFor="nf-venc">Vencimento</Rotulo>
            <input id="nf-venc" type="date" value={dados.vencimento} onChange={(e) => setDados({ ...dados, vencimento: e.target.value })} className={campo} />
          </div>
        </div>
      </div>
      <BotoesModal aoCancelar={aoFechar} aoConfirmar={salvar} salvando={salvando} rotulo="Criar fatura"
        desabilitado={!dados.empresa || dados.descricao.trim().length < 3 || !(valor > 0) || !dados.vencimento} />
    </Modal>
  );
}
