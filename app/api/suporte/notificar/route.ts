// Avisa por e-mail sobre a última mensagem de um chamado: resposta da ARXUM
// vai para a empresa; mensagem da empresa vai para o e-mail de suporte.
import { usuarioDaRequisicao, supabaseServico, enviarEmail } from "@/lib/servidor/servicos";
import { modelos } from "@/lib/emails/modelos";

export const dynamic = "force-dynamic";

// Várias mensagens seguidas geram um aviso só.
const INTERVALO_MIN = 10;

interface Chamado {
  id: string;
  numero: number;
  assunto: string;
  company_id: string;
  empresa: string;
  email_empresa: string | null;
  email_autor: string | null;
  email_suporte: string | null;
  ultima: { texto: string; arxum: boolean; autor_id: string | null } | null;
}

export async function POST(req: Request) {
  const sessao = await usuarioDaRequisicao(req);
  if (!sessao) return Response.json({ erro: "Entre novamente." }, { status: 401 });
  const { chamado_id } = (await req.json().catch(() => ({}))) as { chamado_id?: string };
  if (!chamado_id) return Response.json({ erro: "Pedido inválido." }, { status: 400 });

  // Quem chama precisa ser da ARXUM ou da empresa dona do chamado (as políticas
  // do banco só mostram o chamado para a própria empresa).
  const { data: admin } = await sessao.cliente.rpc("eh_admin_plataforma");
  if (admin !== true) {
    const { data: visivel } = await sessao.cliente.from("chamados").select("id").eq("id", chamado_id).maybeSingle();
    if (!visivel) return Response.json({ erro: "Chamado não encontrado." }, { status: 404 });
  }

  const db = supabaseServico();
  const { data } = await db.rpc("servico_chamado", { p_chamado: chamado_id });
  const ch = data as Chamado | null;
  if (!ch?.ultima || ch.ultima.autor_id !== sessao.usuario.id) return Response.json({ ok: true, enviado: false });

  const tipo = ch.ultima.arxum ? "suporte_resposta" : "suporte_mensagem";
  const desde = new Date(Date.now() - INTERVALO_MIN * 60_000).toISOString();
  const { count } = await db.from("emails_enviados").select("id", { count: "exact", head: true })
    .eq("chamado_id", ch.id).eq("tipo", tipo).eq("status", "enviado").gte("enviado_em", desde);
  if (count) return Response.json({ ok: true, enviado: false });

  const para = ch.ultima.arxum
    ? [...new Set([ch.email_autor, ch.email_empresa].filter((e): e is string => !!e))]
    : ch.email_suporte ? [ch.email_suporte] : [];
  if (!para.length) return Response.json({ ok: true, enviado: false });

  const email = ch.ultima.arxum
    ? modelos.suporte_resposta(ch.empresa, ch.numero, ch.assunto, ch.ultima.texto)
    : modelos.suporte_mensagem(ch.empresa, ch.numero, ch.assunto, ch.ultima.texto);
  const envio = await enviarEmail(db, {
    para, email, tipo, companyId: ch.company_id, chamadoId: ch.id, enviadoPor: sessao.usuario.id,
    responderPara: ch.ultima.arxum ? ch.email_suporte : null,
  });
  return Response.json({ ok: envio.ok, enviado: envio.ok });
}
