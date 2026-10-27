// E-mails de cobrança e suporte enviados pelo servidor (Resend).
// Mesmo visual dos e-mails de cadastro (supabase/emails/gerar.js): tabelas,
// estilos inline, fontes do sistema e logotipo em PNG.
import { formatarBRL, dataBR } from "../validacao";
import { pixCopiaECola } from "../pix";

export const SITE = "https://www.arxum.com.br/crew";
const LOGO = `${SITE}/email/logo-crew.png`;
const FONTE = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export const escapar = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const p = (t: string) =>
  `<p style="margin:0 0 14px;font-family:${FONTE};font-size:15px;line-height:1.65;color:#3c4652">${t}</p>`;

// Texto livre digitado no painel: escapa e mantém as quebras de linha.
const texto = (t: string) =>
  t.trim().split(/\n{2,}/).map((par) => p(escapar(par).replace(/\n/g, "<br>"))).join("");

const forte = (t: string) => `<strong style="color:#07090c">${t}</strong>`;

const botao = (rotulo: string, url: string) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px">
  <tr><td bgcolor="#7c3aed" style="border-radius:8px">
    <a href="${url}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${FONTE};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px">${rotulo}</a>
  </td></tr>
</table>`;

const citacao = (t: string) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 18px">
  <tr><td style="border-left:3px solid #8b5cf6;background:#f7f5ff;padding:14px 16px;font-family:${FONTE};font-size:15px;line-height:1.6;color:#3c4652">
    ${escapar(t.trim()).replace(/\n/g, "<br>")}
  </td></tr>
</table>`;

const layout = ({ previa, titulo, corpo, rodape }: { previa: string; titulo: string; corpo: string; rodape: string }) => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${titulo}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${previa}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f5f7">
  <tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">
      <tr><td style="padding:0 4px 20px">
        <a href="${SITE}" target="_blank"><img src="${LOGO}" width="186" height="24" alt="ARXUM Crew" style="display:block;border:0;outline:none;text-decoration:none"></a>
      </td></tr>
      <tr><td bgcolor="#ffffff" style="border:1px solid #e6e8eb;border-radius:12px;padding:36px 32px">
        <h1 style="margin:0 0 18px;font-family:${FONTE};font-size:22px;line-height:1.3;font-weight:700;color:#07090c">${titulo}</h1>
        ${corpo}
      </td></tr>
      <tr><td style="padding:22px 4px 0;font-family:${FONTE};font-size:12px;line-height:1.6;color:#8a94a0">
        ${rodape}<br>
        <span style="color:#6b7684">ARXUM Crew · Gestão de freelancers para qualquer segmento</span><br>
        <a href="${SITE}" style="color:#8a94a0">arxum.com.br/crew</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>
`;

export interface FaturaEmail {
  numero: number;
  empresa: string;
  descricao: string;
  valor: number;
  vencimento: string;
  valor_pago?: number | null;
  pago_em?: string | null;
}

export interface Pix {
  chave: string | null;
  nome: string | null;
  cidade: string | null;
}

export interface Email {
  assunto: string;
  html: string;
}

const RODAPE_COBRANCA =
  "Você recebe este e-mail por ser o contato financeiro da empresa no ARXUM Crew. Se já pagou, desconsidere esta mensagem.";
const LINK_ASSINATURA = `${SITE}/assinatura`;

// Quadro com os dados da fatura e o PIX copia e cola.
function quadroFatura(f: FaturaEmail, pix: Pix | null, destaque?: string) {
  const linha = (rotulo: string, valor: string) => `
    <tr>
      <td style="padding:8px 0;font-family:${FONTE};font-size:14px;color:#6b7684">${rotulo}</td>
      <td align="right" style="padding:8px 0;font-family:${FONTE};font-size:14px;color:#07090c;font-weight:600">${valor}</td>
    </tr>`;
  const copiaECola = pix?.chave && pix.nome
    ? pixCopiaECola({ chave: pix.chave, nome: pix.nome, cidade: pix.cidade ?? "RIO DE JANEIRO", valor: f.valor, identificador: `CREW${f.numero}` })
    : null;
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;border:1px solid #e6e8eb;border-radius:10px">
  <tr><td style="padding:16px 18px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${linha("Fatura", `nº ${f.numero}`)}
      ${linha("Referente a", escapar(f.descricao))}
      ${linha("Vencimento", `${dataBR(f.vencimento)}${destaque ? ` <span style="color:#dc2626">· ${destaque}</span>` : ""}`)}
      ${linha("Valor", formatarBRL(f.valor))}
    </table>
  </td></tr>
  ${copiaECola ? `
  <tr><td style="padding:16px 18px;border-top:1px solid #e6e8eb;background:#fafafb;border-radius:0 0 10px 10px">
    <p style="margin:0 0 8px;font-family:${FONTE};font-size:13px;font-weight:600;color:#07090c">PIX copia e cola</p>
    <p style="margin:0;font-family:Menlo, Consolas, monospace;font-size:12px;line-height:1.5;color:#3c4652;word-break:break-all">${copiaECola}</p>
    <p style="margin:10px 0 0;font-family:${FONTE};font-size:12px;color:#6b7684">No app do banco, escolha PIX → Copia e cola e cole o código acima. Chave: ${escapar(pix!.chave!)}</p>
  </td></tr>` : ""}
</table>`;
}

export const modelos = {
  fatura_nova(f: FaturaEmail, pix: Pix | null): Email {
    return {
      assunto: `Sua fatura do ARXUM Crew vence em ${dataBR(f.vencimento)}`,
      html: layout({
        previa: `Fatura nº ${f.numero} de ${formatarBRL(f.valor)} disponível para pagamento.`,
        titulo: "Sua fatura está disponível",
        corpo: p(`Olá, ${forte(escapar(f.empresa))}! A fatura do seu plano no ARXUM Crew já está disponível.`) +
          quadroFatura(f, pix) +
          p("Você pode pagar pelo PIX acima ou pela área de assinatura do painel, onde também fica o QR Code.") +
          botao("Ver fatura e pagar", LINK_ASSINATURA),
        rodape: RODAPE_COBRANCA,
      }),
    };
  },

  lembrete(f: FaturaEmail, pix: Pix | null, dias: number): Email {
    const quando = dias === 1 ? "amanhã" : `em ${dias} dias`;
    return {
      assunto: `Lembrete: sua fatura do ARXUM Crew vence ${quando}`,
      html: layout({
        previa: `Fatura nº ${f.numero} de ${formatarBRL(f.valor)} vence ${quando}.`,
        titulo: `Sua fatura vence ${quando}`,
        corpo: p(`Olá, ${forte(escapar(f.empresa))}! Passando para lembrar que a fatura do ARXUM Crew vence ${forte(dataBR(f.vencimento))}.`) +
          quadroFatura(f, pix) +
          p("Se já fez o pagamento, é só desconsiderar este aviso.") +
          botao("Ver fatura e pagar", LINK_ASSINATURA),
        rodape: RODAPE_COBRANCA,
      }),
    };
  },

  vence_hoje(f: FaturaEmail, pix: Pix | null): Email {
    return {
      assunto: "Sua fatura do ARXUM Crew vence hoje",
      html: layout({
        previa: `Fatura nº ${f.numero} de ${formatarBRL(f.valor)} vence hoje.`,
        titulo: "Sua fatura vence hoje",
        corpo: p(`Olá, ${forte(escapar(f.empresa))}! A fatura do ARXUM Crew vence ${forte("hoje")}. Pague pelo PIX abaixo para manter o acesso em dia.`) +
          quadroFatura(f, pix) +
          botao("Ver fatura e pagar", LINK_ASSINATURA),
        rodape: RODAPE_COBRANCA,
      }),
    };
  },

  atraso(f: FaturaEmail, pix: Pix | null, dias: number, suspenderEm: number | null): Email {
    const aviso = suspenderEm && suspenderEm > dias
      ? p(`Para evitar a suspensão do acesso, regularize em até ${forte(`${suspenderEm - dias} ${suspenderEm - dias === 1 ? "dia" : "dias"}`)}.`)
      : "";
    return {
      assunto: `Fatura do ARXUM Crew em aberto há ${dias} ${dias === 1 ? "dia" : "dias"}`,
      html: layout({
        previa: `Não identificamos o pagamento da fatura nº ${f.numero}.`,
        titulo: "Fatura em aberto",
        corpo: p(`Olá, ${forte(escapar(f.empresa))}. Ainda não identificamos o pagamento da fatura abaixo, vencida em ${forte(dataBR(f.vencimento))}.`) +
          quadroFatura(f, pix, `${dias} ${dias === 1 ? "dia" : "dias"} em atraso`) +
          aviso +
          p("Se já pagou, responda este e-mail com o comprovante ou clique em “Já paguei” na área de assinatura, que a gente confere.") +
          botao("Regularizar agora", LINK_ASSINATURA),
        rodape: RODAPE_COBRANCA,
      }),
    };
  },

  // Cobrança enviada pelo painel, com mensagem opcional.
  cobranca(f: FaturaEmail, pix: Pix | null, diasAtraso: number, mensagem?: string): Email {
    const situacao = diasAtraso > 0 ? `${diasAtraso} ${diasAtraso === 1 ? "dia" : "dias"} em atraso` : undefined;
    return {
      assunto: diasAtraso > 0 ? `Pagamento pendente: fatura nº ${f.numero} do ARXUM Crew` : `Fatura nº ${f.numero} do ARXUM Crew`,
      html: layout({
        previa: `Fatura nº ${f.numero} de ${formatarBRL(f.valor)}.`,
        titulo: diasAtraso > 0 ? "Pagamento pendente" : "Sua fatura",
        corpo: p(`Olá, ${forte(escapar(f.empresa))}!`) +
          (mensagem?.trim() ? texto(mensagem) : p(diasAtraso > 0
            ? "Segue a fatura em aberto do seu plano no ARXUM Crew. Qualquer dúvida, é só responder este e-mail."
            : "Segue a fatura do seu plano no ARXUM Crew. Qualquer dúvida, é só responder este e-mail.")) +
          quadroFatura(f, pix, situacao) +
          botao("Ver fatura e pagar", LINK_ASSINATURA),
        rodape: RODAPE_COBRANCA,
      }),
    };
  },

  agradecimento(f: FaturaEmail): Email {
    return {
      assunto: "Pagamento recebido. Obrigado!",
      html: layout({
        previa: `Recebemos o pagamento da fatura nº ${f.numero}.`,
        titulo: "Pagamento recebido",
        corpo: p(`Olá, ${forte(escapar(f.empresa))}! Confirmamos o pagamento de ${forte(formatarBRL(f.valor_pago ?? f.valor))} referente a ${escapar(f.descricao)}.`) +
          p("Obrigado por seguir com o ARXUM Crew. O histórico de faturas fica sempre disponível na área de assinatura do painel.") +
          botao("Abrir o painel", `${SITE}/freelas`),
        rodape: "Este e-mail confirma o recebimento. Guarde-o como comprovante.",
      }),
    };
  },

  suspensao(f: FaturaEmail, pix: Pix | null, dias: number): Email {
    return {
      assunto: "Acesso ao ARXUM Crew suspenso por falta de pagamento",
      html: layout({
        previa: "Regularize a fatura em aberto para liberar o acesso.",
        titulo: "Acesso suspenso",
        corpo: p(`Olá, ${forte(escapar(f.empresa))}. Como a fatura abaixo está em aberto há ${dias} dias, o acesso da sua empresa ao ARXUM Crew foi suspenso.`) +
          p("Seus dados continuam guardados. Assim que o pagamento for confirmado, o acesso volta a funcionar normalmente.") +
          quadroFatura(f, pix, `${dias} dias em atraso`) +
          p("Depois de pagar, entre no painel e clique em “Já paguei”, ou responda este e-mail com o comprovante.") +
          botao("Regularizar agora", LINK_ASSINATURA),
        rodape: RODAPE_COBRANCA,
      }),
    };
  },

  // Mensagem livre do painel para a empresa.
  livre(empresa: string, assunto: string, mensagem: string): Email {
    return {
      assunto,
      html: layout({
        previa: mensagem.slice(0, 120),
        titulo: escapar(assunto),
        corpo: p(`Olá, ${forte(escapar(empresa))}!`) + texto(mensagem),
        rodape: "Mensagem enviada pela equipe ARXUM. Responda este e-mail se precisar de algo.",
      }),
    };
  },

  suporte_resposta(empresa: string, numero: number, assunto: string, mensagem: string): Email {
    return {
      assunto: `Resposta ao chamado nº ${numero}: ${assunto}`,
      html: layout({
        previa: mensagem.slice(0, 120),
        titulo: "Respondemos seu chamado",
        corpo: p(`Olá, ${forte(escapar(empresa))}! A equipe ARXUM respondeu o chamado ${forte(`nº ${numero} · ${escapar(assunto)}`)}:`) +
          citacao(mensagem) +
          p("Para continuar a conversa, responda pelo suporte do painel.") +
          botao("Abrir o suporte", `${SITE}/suporte`),
        rodape: "Você recebe este e-mail porque abriu um chamado no suporte do ARXUM Crew.",
      }),
    };
  },

  // Aviso para a equipe ARXUM.
  suporte_mensagem(empresa: string, numero: number, assunto: string, mensagem: string): Email {
    return {
      assunto: `[Suporte] ${empresa} · chamado nº ${numero}: ${assunto}`,
      html: layout({
        previa: mensagem.slice(0, 120),
        titulo: "Nova mensagem no suporte",
        corpo: p(`${forte(escapar(empresa))} escreveu no chamado ${forte(`nº ${numero} · ${escapar(assunto)}`)}:`) +
          citacao(mensagem) +
          botao("Responder no painel", `${SITE}/admin/suporte`),
        rodape: "Aviso automático do painel ARXUM Crew.",
      }),
    };
  },
};
