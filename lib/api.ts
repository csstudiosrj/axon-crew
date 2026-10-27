import { supabase } from "./supabase";
import { BASE_PATH } from "./base-path";

// Chama uma rota de /api enviando a sessão do usuário logado.
export async function chamarApi<T = Record<string, unknown>>(
  caminho: string,
  corpo: unknown,
): Promise<({ ok: true } & T) | { ok: false; erro: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  try {
    const resp = await fetch(`${BASE_PATH}${caminho}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify(corpo),
    });
    const json = await resp.json().catch(() => ({}));
    return resp.ok ? { ...json, ok: true } : { ok: false, erro: json.erro ?? "Não foi possível concluir. Tente de novo." };
  } catch {
    return { ok: false, erro: "Sem conexão. Tente de novo." };
  }
}
