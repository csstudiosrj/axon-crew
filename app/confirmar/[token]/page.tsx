"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Calendar, Clock, MapPin, Briefcase, Wallet, CheckCircle2, XCircle, LogIn, LogOut,
  Loader2, AlertCircle, ChevronDown, ListChecks,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { getSegmento, maiuscula, de } from "../../../lib/segmentos";
import { dataExtenso, formatarBRL } from "../../../lib/validacao";
import { clausulasTermo } from "../../../lib/termo";
import { MolduraPublica, CabecalhoEmpresa, Carregando, NaoEncontrado, campoClasse } from "../../../components/publico/MolduraPublica";

interface Convite {
  empresa: { name: string; logo_url: string | null; primary_color: string | null; segmento: string | null; whatsapp: string | null };
  evento: { titulo: string; data: string; horario_inicio: string | null; local: string; status: string };
  profissional: { nome: string; cpf_final: string; token_acesso: string };
  funcao: string;
  valor: number;
  resposta: "pendente" | "confirmado" | "recusado";
  termo_aceito_em: string | null;
  checkin_em: string | null;
  checkout_em: string | null;
  hoje: string;
}

const MENSAGENS: Record<string, string> = {
  prazo_encerrado: "A data deste trabalho já passou.",
  termo: "Para confirmar, aceite o termo.",
  nao_confirmado: "Confirme a presença antes de registrar a chegada.",
  fora_do_dia: "O registro só vale no dia do trabalho.",
  sem_checkin: "Registre a chegada antes da saída.",
  ja_registrado: "Este registro já foi feito.",
  nao_encontrado: "Link inválido.",
};

const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

// Pede a localização sem travar o fluxo: se o celular negar, segue sem ela.
const localizacao = () =>
  new Promise<{ lat: number | null; lng: number | null }>((resolve) => {
    if (!navigator.geolocation) return resolve({ lat: null, lng: null });
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve({ lat: null, lng: null }),
      { timeout: 8000, maximumAge: 60000 }
    );
  });

export default function ConfirmarPage() {
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";
  const [convite, setConvite] = useState<Convite | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [aceite, setAceite] = useState(false);
  const [verTermo, setVerTermo] = useState(false);
  const [recusando, setRecusando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState("");
  const [erro, setErro] = useState("");

  const carregar = useCallback(() =>
    supabase.rpc("ver_convite", { p_token: token }).then(({ data }) => {
      setConvite(data as Convite | null);
      setCarregando(false);
    }), [token]);

  useEffect(() => {
    if (!token) return;
    supabase.rpc("ver_convite", { p_token: token }).then(({ data }) => {
      setConvite(data as Convite | null);
      setCarregando(false);
    });
  }, [token]);

  if (carregando) return <Carregando />;
  if (!convite) return <NaoEncontrado titulo="Convite não encontrado" texto="Este link é inválido ou foi removido pela empresa." />;

  const { empresa, evento } = convite;
  const cor = empresa.primary_color ?? "#8b5cf6";
  const termos = getSegmento(empresa.segmento).termos;
  const passou = evento.data < convite.hoje;
  const ehHoje = evento.data === convite.hoje;
  const diaSeguinte = (() => { const d = new Date(`${evento.data}T12:00:00`); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })();
  const podeCheckout = convite.checkin_em && !convite.checkout_em && (ehHoje || convite.hoje === diaSeguinte);

  const responder = async (resposta: "confirmado" | "recusado") => {
    if (resposta === "confirmado" && !aceite) { setErro(MENSAGENS.termo); return; }
    setOcupado(resposta); setErro("");
    const { data, error } = await supabase.rpc("responder_convite", {
      p_token: token, p_resposta: resposta, p_aceite_termo: aceite, p_motivo: motivo || null,
    });
    setOcupado("");
    if (error || data !== "ok") { setErro(MENSAGENS[data as string] ?? "Não foi possível enviar. Tente de novo."); return; }
    setRecusando(false);
    carregar();
  };

  const presenca = async (tipo: "checkin" | "checkout") => {
    setOcupado(tipo); setErro("");
    const { lat, lng } = await localizacao();
    const { data, error } = await supabase.rpc("registrar_presenca", { p_token: token, p_tipo: tipo, p_lat: lat, p_lng: lng });
    setOcupado("");
    if (error || data !== "ok") { setErro(MENSAGENS[data as string] ?? "Não foi possível registrar. Tente de novo."); return; }
    carregar();
  };

  const clausulas = clausulasTermo({
    empresa: empresa.name, profissional: convite.profissional.nome, cpfFinal: convite.profissional.cpf_final,
    funcao: convite.funcao, trabalho: termos.job, titulo: evento.titulo, data: evento.data,
    horario: evento.horario_inicio, local: evento.local, valor: convite.valor,
  });

  const botao = "flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-semibold disabled:opacity-60";

  return (
    <MolduraPublica>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-arx-surface">
        <CabecalhoEmpresa nome={empresa.name} logo={empresa.logo_url} cor={cor}
          subtitulo={`Convite para ${convite.profissional.nome.split(" ")[0]}`} />

        <div className="space-y-3 px-6 py-5">
          <h2 className="text-[20px] font-semibold text-white">{evento.titulo}</h2>
          <ul className="space-y-2 text-[14px] text-arx-frost">
            <li className="flex items-center gap-2.5"><Calendar size={15} className="text-arx-slate" /> {maiuscula(dataExtenso(evento.data))}</li>
            {evento.horario_inicio && <li className="flex items-center gap-2.5"><Clock size={15} className="text-arx-slate" /> {evento.horario_inicio.slice(0, 5)}</li>}
            <li className="flex items-center gap-2.5"><MapPin size={15} className="text-arx-slate" /> {evento.local}</li>
            <li className="flex items-center gap-2.5"><Briefcase size={15} className="text-arx-slate" /> {convite.funcao}</li>
            <li className="flex items-center gap-2.5"><Wallet size={15} className="text-arx-slate" /> {maiuscula(termos.pagamento)}: <strong>{formatarBRL(convite.valor)}</strong></li>
          </ul>
        </div>

        <div className="space-y-4 border-t border-white/10 px-6 py-5">
          {passou && convite.resposta !== "confirmado" ? (
            <p className="text-center text-[14px] text-arx-mist">A data {de(termos.job, termos.generoJob)} já passou.</p>
          ) : convite.resposta === "confirmado" ? (
            <>
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-[14px] text-emerald-300">
                <CheckCircle2 size={18} /> Presença confirmada. Termo aceito.
              </div>

              {(ehHoje || podeCheckout || convite.checkin_em) && (
                <div className="rounded-xl border border-white/10 p-4">
                  <p className="mb-3 text-[13px] font-medium text-arx-frost">Registro de presença</p>
                  <div className="space-y-2 text-[13px] text-arx-mist">
                    <p>Chegada: {convite.checkin_em ? <strong className="text-white">{hora(convite.checkin_em)}</strong> : "não registrada"}</p>
                    <p>Saída: {convite.checkout_em ? <strong className="text-white">{hora(convite.checkout_em)}</strong> : "não registrada"}</p>
                  </div>
                  {!convite.checkin_em && ehHoje && (
                    <button onClick={() => presenca("checkin")} disabled={!!ocupado} className={`${botao} mt-4 text-white`} style={{ background: cor }}>
                      {ocupado === "checkin" ? <Loader2 size={17} className="animate-spin" /> : <LogIn size={17} />} Cheguei
                    </button>
                  )}
                  {podeCheckout && (
                    <button onClick={() => presenca("checkout")} disabled={!!ocupado} className={`${botao} mt-4 border border-white/15 text-white`}>
                      {ocupado === "checkout" ? <Loader2 size={17} className="animate-spin" /> : <LogOut size={17} />} Saí
                    </button>
                  )}
                  <p className="mt-3 text-[12px] text-arx-slate">Se o celular pedir, permita a localização: ela fica registrada junto com o horário.</p>
                </div>
              )}

              {!passou && (
                <button onClick={() => setRecusando(true)} className="w-full text-center text-[13px] text-arx-slate underline underline-offset-2 hover:text-white">
                  Não vou poder ir
                </button>
              )}
            </>
          ) : (
            <>
              {convite.resposta === "recusado" && (
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-arx-obsidian px-4 py-3 text-[14px] text-arx-mist">
                  <XCircle size={18} /> Você recusou este convite. Mudou de ideia? Confirme abaixo.
                </div>
              )}

              <div className="rounded-xl border border-white/10">
                <button onClick={() => setVerTermo(!verTermo)} className="flex w-full items-center justify-between px-4 py-3 text-left text-[14px] text-arx-frost">
                  Termo de prestação de serviço
                  <ChevronDown size={16} className={`text-arx-slate transition-transform ${verTermo ? "rotate-180" : ""}`} />
                </button>
                {verTermo && (
                  <ol className="list-decimal space-y-2 border-t border-white/10 px-8 py-4 text-[13px] leading-relaxed text-arx-mist">
                    {clausulas.map((c, i) => <li key={i}>{c}</li>)}
                  </ol>
                )}
              </div>

              <label className="flex cursor-pointer items-start gap-3 text-[14px] text-arx-mist">
                <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0" style={{ accentColor: cor }} />
                Li e aceito o termo de prestação de serviço.
              </label>

              <button onClick={() => responder("confirmado")} disabled={!!ocupado} className={`${botao} text-white`} style={{ background: cor }}>
                {ocupado === "confirmado" ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle2 size={17} />} Confirmar presença
              </button>
              {convite.resposta === "pendente" && (
                <button onClick={() => setRecusando(true)} className={`${botao} border border-white/15 text-arx-frost`}>
                  <XCircle size={17} /> Não posso
                </button>
              )}
            </>
          )}

          {recusando && (
            <div className="space-y-3 rounded-xl border border-white/10 p-4">
              <label className="block text-[13px] text-arx-mist">
                Quer dizer o motivo? (opcional)
                <input value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={300}
                  placeholder="Ex.: já tenho outro compromisso" className={`${campoClasse} mt-1.5`} />
              </label>
              <div className="flex gap-2">
                <button onClick={() => setRecusando(false)} className="flex-1 rounded-lg border border-white/15 py-2.5 text-[14px] text-arx-frost">Voltar</button>
                <button onClick={() => responder("recusado")} disabled={!!ocupado} className="flex-1 rounded-lg bg-red-500/80 py-2.5 text-[14px] font-semibold text-white disabled:opacity-60">
                  {ocupado === "recusado" ? "Enviando..." : "Recusar convite"}
                </button>
              </div>
            </div>
          )}

          {erro && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-[14px] text-red-300">
              <AlertCircle size={16} className="mt-0.5 shrink-0" /> {erro}
            </div>
          )}
        </div>

        <Link href={`/p/${convite.profissional.token_acesso}`}
          className="flex items-center justify-center gap-2 border-t border-white/10 px-6 py-4 text-[14px] text-arx-mist hover:text-white">
          <ListChecks size={16} /> Ver todos os meus trabalhos e pagamentos
        </Link>
      </div>
    </MolduraPublica>
  );
}
