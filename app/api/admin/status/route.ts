// Diz ao painel quais chaves do servidor estão configuradas na Vercel
// (só se existem, nunca o valor).
import { exigirAdmin } from "@/lib/servidor/servicos";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await exigirAdmin(req))) return Response.json({ erro: "Acesso restrito à equipe ARXUM." }, { status: 403 });
  return Response.json({
    servico: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    resend: !!process.env.RESEND_API_KEY,
    remetente: process.env.EMAIL_REMETENTE ?? null,
    cron: !!process.env.CRON_SECRET,
    mp_token: !!process.env.MP_ACCESS_TOKEN,
    mp_webhook: !!process.env.MP_WEBHOOK_SECRET,
  });
}
