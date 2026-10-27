"use client";

import { getPlano, type PlanoId } from "@/lib/planos";
import { formatarBRL } from "@/lib/validacao";
import { Modal, BotoesModal, campo } from "./ui";
import type { Empresa } from "./tipos";

export type Acao =
  | { tipo: "plano"; empresa: Pick<Empresa, "id" | "name" | "plano" | "suspensa">; plano: PlanoId }
  | { tipo: "suspender"; empresa: Pick<Empresa, "id" | "name" | "plano" | "suspensa"> }
  | { tipo: "observacao"; empresa: Pick<Empresa, "id" | "name" | "plano" | "suspensa"> };

// Confirmação de troca de plano, suspensão e observação (também usada no detalhe).
export function AcaoEmpresa({ acao, observacao, setObservacao, salvando, aoFechar, aoConfirmar }: {
  acao: Acao; observacao: string; setObservacao: (v: string) => void; salvando: boolean; aoFechar: () => void; aoConfirmar: () => void;
}) {
  const titulo = acao.tipo === "plano" ? "Trocar plano" : acao.tipo === "suspender" ? (acao.empresa.suspensa ? "Reativar conta" : "Suspender conta") : "Observação interna";
  return (
    <Modal titulo={titulo} aoFechar={aoFechar}>
      {acao.tipo === "plano" && (
        <p className="text-[14px] leading-relaxed text-arx-mist">
          Mudar <strong className="text-white">{acao.empresa.name}</strong> de {getPlano(acao.empresa.plano).nome} para{" "}
          <strong className="text-white">{getPlano(acao.plano).nome}</strong> ({formatarBRL(getPlano(acao.plano).preco)}/mês)?
          Os limites novos valem na hora e as próximas mensalidades saem com o valor novo.
        </p>
      )}
      {acao.tipo === "suspender" && (
        <p className="text-[14px] leading-relaxed text-arx-mist">
          {acao.empresa.suspensa
            ? <>A equipe da <strong className="text-white">{acao.empresa.name}</strong> volta a acessar o painel e o link de cadastro volta a funcionar.</>
            : <>A equipe da <strong className="text-white">{acao.empresa.name}</strong> deixa de acessar o painel (continua vendo só a assinatura e o suporte) e o link de cadastro de profissionais sai do ar. Nenhum dado é apagado.</>}
        </p>
      )}
      {acao.tipo === "observacao" && (
        <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={4} maxLength={1000} autoFocus
          placeholder="Ex.: paga por PIX todo dia 10; contato com a Ana" className={campo} />
      )}
      <BotoesModal aoCancelar={aoFechar} aoConfirmar={aoConfirmar} salvando={salvando}
        perigo={acao.tipo === "suspender" && !acao.empresa.suspensa} />
    </Modal>
  );
}
