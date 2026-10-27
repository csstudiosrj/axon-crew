// Gera os modelos de e-mail do Supabase Auth (Authentication → Emails → Templates).
// Uso: node supabase/emails/gerar.js   → escreve um .html por modelo nesta pasta.
// HTML de e-mail: tabelas, estilos inline e fontes do sistema (Gmail e Outlook
// não carregam fontes externas; o logotipo vai como imagem PNG).
const fs = require("fs");
const path = require("path");

const LOGO = "https://www.arxum.com.br/crew/email/logo-crew.png";
const SITE = "https://www.arxum.com.br/crew";
const FONTE = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const botao = (texto, url) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px">
  <tr><td bgcolor="#7c3aed" style="border-radius:8px">
    <a href="${url}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${FONTE};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px">${texto}</a>
  </td></tr>
</table>`;

const linkReserva = (url) => `
<p style="margin:20px 0 0;font-family:${FONTE};font-size:13px;line-height:1.6;color:#6b7684">
  Se o botão não funcionar, copie e cole este endereço no navegador:<br>
  <a href="${url}" style="color:#7c3aed;word-break:break-all">${url}</a>
</p>`;

const p = (t) => `<p style="margin:0 0 14px;font-family:${FONTE};font-size:15px;line-height:1.65;color:#3c4652">${t}</p>`;

const layout = ({ previa, titulo, corpo, rodape }) => `<!DOCTYPE html>
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

const URL = "{{ .ConfirmationURL }}";

const modelos = {
  "confirmar-cadastro": {
    assunto: "Confirme seu e-mail no ARXUM Crew",
    previa: "Falta só um passo para ativar a conta da sua empresa.",
    titulo: "Confirme seu e-mail",
    corpo: p("Olá! Recebemos o cadastro da sua empresa no ARXUM Crew.") +
      p("Para ativar a conta e entrar no painel, confirme que este e-mail é seu:") +
      botao("Confirmar e-mail", URL) + linkReserva(URL),
    rodape: "Você recebeu este e-mail porque alguém criou uma conta no ARXUM Crew com este endereço. Se não foi você, ignore esta mensagem.",
  },
  "convite": {
    assunto: "Você foi convidado para o ARXUM Crew",
    previa: "Aceite o convite e crie sua senha de acesso.",
    titulo: "Você foi convidado",
    corpo: p("Você recebeu um convite para acessar o ARXUM Crew, o sistema de gestão de equipes e freelancers.") +
      p("Clique no botão abaixo para aceitar o convite e criar sua senha:") +
      botao("Aceitar convite", URL) + linkReserva(URL),
    rodape: "Se você não esperava este convite, pode ignorar esta mensagem.",
  },
  "link-de-acesso": {
    assunto: "Seu link de acesso ao ARXUM Crew",
    previa: "Use o link para entrar sem digitar a senha.",
    titulo: "Seu link de acesso",
    corpo: p("Use o botão abaixo para entrar no ARXUM Crew. O link vale por 1 hora e só pode ser usado uma vez.") +
      botao("Entrar no painel", URL) + linkReserva(URL),
    rodape: "Se você não pediu este link, ignore esta mensagem. Sua conta continua segura.",
  },
  "alterar-email": {
    assunto: "Confirme a alteração de e-mail no ARXUM Crew",
    previa: "Confirme o novo endereço da sua conta.",
    titulo: "Confirme o novo e-mail",
    corpo: p("Recebemos um pedido para trocar o e-mail da sua conta no ARXUM Crew de <strong style=\"color:#07090c\">{{ .Email }}</strong> para <strong style=\"color:#07090c\">{{ .NewEmail }}</strong>.") +
      p("Para concluir a troca, confirme pelo botão abaixo:") +
      botao("Confirmar novo e-mail", URL) + linkReserva(URL),
    rodape: "Se você não pediu esta alteração, ignore esta mensagem e troque sua senha.",
  },
  "redefinir-senha": {
    assunto: "Redefinição de senha do ARXUM Crew",
    previa: "Crie uma nova senha para a sua conta.",
    titulo: "Redefinir sua senha",
    corpo: p("Recebemos um pedido para redefinir a senha da sua conta no ARXUM Crew.") +
      p("Clique no botão abaixo para criar uma nova senha. O link vale por 1 hora; abra no mesmo navegador em que você fez o pedido.") +
      botao("Criar nova senha", URL) + linkReserva(URL),
    rodape: "Se você não pediu a troca de senha, ignore esta mensagem. Sua senha atual continua valendo.",
  },
  "codigo-de-verificacao": {
    assunto: "Seu código de verificação do ARXUM Crew",
    previa: "Use este código para confirmar a operação.",
    titulo: "Código de verificação",
    corpo: p("Use o código abaixo para confirmar a operação no ARXUM Crew:") +
      `<p style="margin:24px 0;font-family:${FONTE};font-size:32px;font-weight:700;letter-spacing:8px;color:#07090c">{{ .Token }}</p>` +
      p("O código vale por alguns minutos. Não compartilhe com ninguém."),
    rodape: "Se você não tentou fazer esta operação, ignore esta mensagem e troque sua senha.",
  },
};

const lista = [];
for (const [arquivo, m] of Object.entries(modelos)) {
  fs.writeFileSync(path.join(__dirname, `${arquivo}.html`), layout(m));
  lista.push(`${arquivo}.html  →  Assunto: ${m.assunto}`);
}
console.log(lista.join("\n"));
