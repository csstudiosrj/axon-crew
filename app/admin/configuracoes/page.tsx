"use client";

import { useEffect, useState } from "react";
import { Save, CheckCircle2, XCircle, Eye, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { chamarApi } from "@/lib/api";
import { modelos, type FaturaEmail, type Pix } from "@/lib/emails/modelos";
import { card, campo, botaoPrimario, botaoSecundario, Modal, Rotulo, Carregando, usePainelAdmin } from "@/components/admin/ui";

interface Config {
  pix_chave: string | null;
  pix_nome: string | null;
  pix_cidade: string | null;
  email_suporte: string | null;
  whatsapp: string | null;
  dia_vencimento_padrao: number;
  lembrete_dias_antes: number;
  cobranca_dias_depois: number[];
  suspender_apos_dias: number | null;
  emails_automaticos: boolean;
}

interface Status { servico: boolean; resend: boolean; remetente: string | null; cron: boolean; mp_token: boolean; mp_webhook: boolean }

const EXEMPLO: FaturaEmail = {
  numero: 1042, empresa: "Produtora Exemplo", descricao: "Mensalidade ARXUM Crew Profissional — 11/2026",
  valor: 149, vencimento: "2026-11-10", valor_pago: 149, pago_em: "2026-11-09",
};

function Situacao({ ok, nome, detalhe }: { ok: boolean | undefined; nome: string; detalhe: string }) {
  return (
    <li className="flex items-start gap-2.5 py-2 text-[14px]">
      {ok === undefined ? <Loader2 size={16} className="mt-0.5 animate-spin text-arx-slate" />
        : ok ? <CheckCircle2 size={16} className="mt-0.5 text-emerald-400" /> : <XCircle size={16} className="mt-0.5 text-red-400" />}
      <span><span className="text-white">{nome}</span><br /><span className="text-[12px] text-arx-slate">{detalhe}</span></span>
    </li>
  );
}

// Dados de recebimento, régua de cobrança e e-mails automáticos.
export default function AdminConfiguracoes() {
  const { avisar } = usePainelAdmin();
  const [cfg, setCfg] = useState<Config | null>(null);
  const [regua, setRegua] = useState("");
  const [suspender, setSuspender] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [previa, setPrevia] = useState<{ titulo: string; assunto: string; html: string } | null>(null);

  useEffect(() => {
    supabase.rpc("admin_config").then(({ data }) => {
      const c = data as Config;
      setCfg(c);
      setRegua(c.cobranca_dias_depois.join(", "));
      setSuspender(c.suspender_apos_dias ? String(c.suspender_apos_dias) : "");
    });
    chamarApi<Status>("/api/admin/status", {}).then((r) => { if (r.ok) setStatus(r); });
  }, []);

  if (!cfg) return <Carregando />;

  const set = <K extends keyof Config>(k: K, v: Config[K]) => setCfg({ ...cfg, [k]: v });
  const dias = regua.split(/[,;\s]+/).map(Number).filter((n) => Number.isInteger(n) && n > 0 && n <= 90);

  const salvar = async () => {
    setSalvando(true);
    const { error } = await supabase.rpc("admin_salvar_config", {
      p_pix_chave: cfg.pix_chave ?? "", p_pix_nome: cfg.pix_nome ?? "", p_pix_cidade: cfg.pix_cidade ?? "",
      p_email_suporte: cfg.email_suporte ?? "", p_whatsapp: cfg.whatsapp ?? "",
      p_dia_vencimento: cfg.dia_vencimento_padrao, p_lembrete_dias_antes: cfg.lembrete_dias_antes,
      p_cobranca_dias_depois: [...new Set(dias)].sort((a, b) => a - b),
      p_suspender_apos_dias: suspender ? Number(suspender) : null, p_emails_automaticos: cfg.emails_automaticos,
    });
    setSalvando(false);
    avisar(error ? "Não foi possível salvar. Confira os números (vencimento de 1 a 28, suspensão de 1 a 90 dias)." : "Configurações salvas.");
  };

  const pix: Pix = { chave: cfg.pix_chave, nome: cfg.pix_nome, cidade: cfg.pix_cidade };
  const exemplos = [
    { titulo: "Fatura disponível", quando: "assim que a fatura é gerada", email: () => modelos.fatura_nova(EXEMPLO, pix) },
    { titulo: "Lembrete", quando: `${cfg.lembrete_dias_antes} dias antes do vencimento`, email: () => modelos.lembrete(EXEMPLO, pix, cfg.lembrete_dias_antes || 3) },
    { titulo: "Vence hoje", quando: "no dia do vencimento", email: () => modelos.vence_hoje(EXEMPLO, pix) },
    { titulo: "Fatura em aberto", quando: dias.length ? `${dias.join(", ")} dias depois do vencimento` : "desligado", email: () => modelos.atraso(EXEMPLO, pix, dias[0] ?? 1, suspender ? Number(suspender) : null) },
    { titulo: "Acesso suspenso", quando: suspender ? `${suspender} dias depois do vencimento` : "desligado", email: () => modelos.suspensao(EXEMPLO, pix, Number(suspender) || 15) },
    { titulo: "Pagamento recebido", quando: "quando você registra o pagamento", email: () => modelos.agradecimento(EXEMPLO) },
    { titulo: "Resposta do suporte", quando: "quando você responde um chamado", email: () => modelos.suporte_resposta(EXEMPLO.empresa, 37, "Dúvida sobre o check-in", "Oi! O check-in fica liberado 2 horas antes do horário do trabalho.") },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <section className={`${card} space-y-4 p-6`}>
          <div>
            <h2 className="text-[16px] font-semibold text-white">Recebimento por PIX</h2>
            <p className="mt-1 text-[13px] text-arx-slate">Vai nas faturas, nos e-mails de cobrança e na área de assinatura das empresas, com QR Code e copia e cola.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Rotulo htmlFor="pix-chave">Chave PIX da ARXUM</Rotulo>
              <input id="pix-chave" value={cfg.pix_chave ?? ""} onChange={(e) => set("pix_chave", e.target.value)} className={campo} placeholder="CNPJ, e-mail, celular ou chave aleatória" />
            </div>
            <div>
              <Rotulo htmlFor="pix-nome">Nome do recebedor</Rotulo>
              <input id="pix-nome" value={cfg.pix_nome ?? ""} onChange={(e) => set("pix_nome", e.target.value)} className={campo} placeholder="Como aparece no banco" maxLength={25} />
            </div>
            <div>
              <Rotulo htmlFor="pix-cidade">Cidade</Rotulo>
              <input id="pix-cidade" value={cfg.pix_cidade ?? ""} onChange={(e) => set("pix_cidade", e.target.value)} className={campo} maxLength={15} />
            </div>
          </div>
        </section>

        <section className={`${card} space-y-4 p-6`}>
          <div>
            <h2 className="text-[16px] font-semibold text-white">Contato</h2>
            <p className="mt-1 text-[13px] text-arx-slate">O e-mail de suporte recebe os avisos de novas mensagens e as respostas das empresas aos e-mails de cobrança.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Rotulo htmlFor="email-suporte">E-mail de suporte</Rotulo>
              <input id="email-suporte" type="email" value={cfg.email_suporte ?? ""} onChange={(e) => set("email_suporte", e.target.value)} className={campo} placeholder="suporte@arxum.com.br" />
            </div>
            <div>
              <Rotulo htmlFor="whatsapp">WhatsApp</Rotulo>
              <input id="whatsapp" value={cfg.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} className={campo} placeholder="(21) 96711-9815" />
            </div>
          </div>
        </section>

        <section className={`${card} space-y-4 p-6`}>
          <div>
            <h2 className="text-[16px] font-semibold text-white">Régua de cobrança</h2>
            <p className="mt-1 text-[13px] text-arx-slate">Cada aviso sai uma vez por fatura. Se a rotina falhar um dia, o aviso sai no dia seguinte.</p>
          </div>
          <label className="flex items-center gap-3 rounded-lg border border-white/10 px-4 py-3 text-[14px] text-white">
            <input type="checkbox" checked={cfg.emails_automaticos} onChange={(e) => set("emails_automaticos", e.target.checked)} className="h-4 w-4 accent-violet-500" />
            Enviar e-mails automáticos de cobrança
            <span className="ml-auto text-[12px] text-arx-slate">{cfg.emails_automaticos ? "ligado" : "desligado: só as mensalidades são geradas"}</span>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Rotulo htmlFor="dia-padrao">Dia de vencimento padrão</Rotulo>
              <input id="dia-padrao" type="number" min={1} max={28} value={cfg.dia_vencimento_padrao} onChange={(e) => set("dia_vencimento_padrao", Number(e.target.value))} className={campo} />
            </div>
            <div>
              <Rotulo htmlFor="lembrete">Lembrete antes do vencimento (dias)</Rotulo>
              <input id="lembrete" type="number" min={0} max={15} value={cfg.lembrete_dias_antes} onChange={(e) => set("lembrete_dias_antes", Number(e.target.value))} className={campo} />
            </div>
            <div>
              <Rotulo htmlFor="regua">Cobranças depois do vencimento (dias)</Rotulo>
              <input id="regua" value={regua} onChange={(e) => setRegua(e.target.value)} className={campo} placeholder="1, 5, 10" />
            </div>
            <div>
              <Rotulo htmlFor="suspender">Suspender o acesso após (dias)</Rotulo>
              <input id="suspender" type="number" min={1} max={90} value={suspender} onChange={(e) => setSuspender(e.target.value)} className={campo} placeholder="em branco: nunca suspende sozinho" />
            </div>
          </div>
        </section>

        <button onClick={salvar} disabled={salvando} className={botaoPrimario}>
          {salvando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar configurações
        </button>
      </div>

      <div className="space-y-6">
        <section className={`${card} p-5`}>
          <h2 className="text-[15px] font-semibold text-white">Chaves no servidor (Vercel)</h2>
          <ul className="mt-2 divide-y divide-white/5">
            <Situacao ok={status?.servico} nome="SUPABASE_SERVICE_ROLE_KEY" detalhe="rotina diária e envio de e-mails" />
            <Situacao ok={status?.resend} nome="RESEND_API_KEY" detalhe="envio dos e-mails pela Resend" />
            <Situacao ok={status ? !!status.remetente : undefined} nome="EMAIL_REMETENTE" detalhe={status?.remetente ?? "ex.: ARXUM Crew <financeiro@arxum.com.br>"} />
            <Situacao ok={status?.cron} nome="CRON_SECRET" detalhe="protege a rotina diária das 9h" />
            <Situacao ok={status?.mp_token} nome="MP_ACCESS_TOKEN" detalhe="pagamento online das faturas (Mercado Pago)" />
            <Situacao ok={status?.mp_webhook} nome="MP_WEBHOOK_SECRET" detalhe="confere os avisos de pagamento do Mercado Pago" />
          </ul>
        </section>

        <section className={`${card} p-5`}>
          <h2 className="text-[15px] font-semibold text-white">E-mails automáticos</h2>
          <ul className="mt-2 divide-y divide-white/5">
            {exemplos.map((x) => (
              <li key={x.titulo} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-[14px] text-white">{x.titulo}<br /><span className="text-[12px] text-arx-slate">{x.quando}</span></span>
                <button onClick={() => { const m = x.email(); setPrevia({ titulo: x.titulo, assunto: m.assunto, html: m.html }); }}
                  className={`${botaoSecundario} px-3 py-1.5 text-[13px]`}><Eye size={14} /> Ver</button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {previa && (
        <Modal titulo={previa.titulo} aoFechar={() => setPrevia(null)} largura="max-w-2xl">
          <p className="mb-3 text-[13px] text-arx-mist">Assunto: <span className="text-white">{previa.assunto}</span></p>
          <iframe title={previa.titulo} srcDoc={previa.html} sandbox="" className="h-[65vh] w-full rounded-lg bg-white" />
        </Modal>
      )}
    </div>
  );
}
