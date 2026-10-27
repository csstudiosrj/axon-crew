import Link from "next/link";
import {
  Users, CalendarDays, ClipboardList, Wallet, Palette, Link2,
  MessageCircle, AlertTriangle, Check, ArrowRight,
} from "lucide-react";
import CrewLogo, { CrewMark, CrewWordmark } from "../components/marketing/CrewLogo";
import HeroTelas from "../components/marketing/HeroTelas";
import SegmentosDemo from "../components/marketing/SegmentosDemo";
import { SEGMENTOS } from "../lib/segmentos";
import { PLANOS } from "../lib/planos";
import { JanelaNavegador, JanelaCelular } from "../components/marketing/TelaFrame";

const WHATSAPP = "5521967119815";

const PUBLICO = SEGMENTOS.filter((s) => s.id !== "outro").map((s) => s.nome);

const ETAPAS = [
  { n: "01", titulo: "Monte sua base", texto: "Cadastre seus profissionais ou mande o link da sua empresa para que eles se cadastrem sozinhos, com função, valor e chave PIX." },
  { n: "02", titulo: "Crie o trabalho", texto: "Evento, plantão, turno, ação ou obra: data, horário, local e quantas pessoas de cada função, com o valor de cada vaga." },
  { n: "03", titulo: "Escale e confirme", texto: "Escolha quem vai em cada vaga, publique a escala e envie pelo WhatsApp. Cada pessoa confirma presença pelo link." },
  { n: "04", titulo: "Pague e acompanhe", texto: "O financeiro já sabe quem trabalhou e quanto recebe. Marque como pago e veja o que está pendente ou atrasado." },
];

function Secao({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`scroll-mt-16 border-b border-arx-line ${className}`}>
      <div className="mx-auto w-full max-w-[1200px] px-4 py-20 sm:px-8 sm:py-28">{children}</div>
    </section>
  );
}

function Rotulo({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-arx-slate">{children}</p>;
}

function Lista({ itens }: { itens: string[] }) {
  return (
    <ul className="mt-6 space-y-3">
      {itens.map((i) => (
        <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-arx-frost">
          <span className="mt-[9px] h-[3px] w-3 shrink-0 rounded-full bg-arx-crew-soft" aria-hidden="true" />
          {i}
        </li>
      ))}
    </ul>
  );
}

function Recurso({
  rotulo, icone: Icone, titulo, texto, itens, children, inverter = false,
}: {
  rotulo: string; icone: React.ElementType; titulo: string; texto: string; itens: string[];
  children: React.ReactNode; inverter?: boolean;
}) {
  return (
    <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
      <div className={inverter ? "lg:order-2" : ""}>
        <div className="flex items-center gap-2.5">
          <Icone size={16} className="text-arx-crew-soft" aria-hidden="true" />
          <Rotulo>{rotulo}</Rotulo>
        </div>
        <h3 className="mt-4 text-[30px] font-medium leading-[1.1] tracking-[-0.02em] text-white sm:text-[38px]">{titulo}</h3>
        <p className="mt-5 text-[16px] leading-relaxed text-arx-mist">{texto}</p>
        <Lista itens={itens} />
      </div>
      <div className={inverter ? "lg:order-1" : ""}>{children}</div>
    </div>
  );
}

export default function CrewHome() {
  return (
    <div className="min-h-screen bg-arx-obsidian font-dm text-arx-frost">
      {/* Cabeçalho */}
      <header className="sticky top-0 z-30 border-b border-arx-line bg-arx-obsidian/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-8">
          <CrewLogo />
          <nav aria-label="Principal" className="hidden items-center gap-8 md:flex">
            <a href="#funcionalidades" className="text-[14px] text-arx-mist hover:text-white">Funcionalidades</a>
            <a href="#como-funciona" className="text-[14px] text-arx-mist hover:text-white">Como funciona</a>
            <a href="#segmentos" className="text-[14px] text-arx-mist hover:text-white">Segmentos</a>
            <a href="#precos" className="text-[14px] text-arx-mist hover:text-white">Preços</a>
            <a href="#contato" className="text-[14px] text-arx-mist hover:text-white">Contato</a>
          </nav>
          <div className="flex items-center gap-2.5 sm:gap-5">
            <Link href="/login" className="text-[13px] text-arx-mist hover:text-white sm:text-[14px]">Entrar</Link>
            <Link href="/criar-conta" className="whitespace-nowrap rounded-lg bg-arx-crew-strong px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-arx-crew sm:px-4 sm:text-[14px]">
              <span className="sm:hidden">Criar conta</span>
              <span className="hidden sm:inline">Cadastrar empresa</span>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-arx-line">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(216,228,240,0.035)_1px,transparent_1px)] bg-[size:120px_100%]" />
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[55%] h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-arx-crew/10 blur-[120px]" />
          <div className="relative mx-auto w-full max-w-[1200px] px-4 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24">
            <div className="max-w-[860px]">
              <Rotulo>Gestão de freelancers para qualquer segmento</Rotulo>
              <h1 className="mt-6 text-[44px] font-medium leading-[1.02] tracking-[-0.035em] text-white sm:text-[68px] lg:text-[76px]">
                Sua equipe freelancer, sem planilha.
              </h1>
              <p className="mt-7 max-w-[620px] text-[17px] leading-relaxed text-arx-mist sm:text-[19px]">
                Banco de talentos, escala por função, confirmação pelo WhatsApp e controle de pagamentos
                para quem contrata por diária, plantão, turno ou job — de produtoras de eventos a
                clínicas, obras, bares e agências de promoção.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link href="/criar-conta" className="inline-flex items-center gap-2 rounded-lg bg-arx-crew-strong px-5 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-arx-crew">
                  Cadastrar minha empresa <ArrowRight size={17} />
                </Link>
                <a href="#funcionalidades" className="rounded-lg border border-white/10 px-5 py-3.5 text-[15px] font-medium text-white transition-colors hover:bg-white/5">
                  Ver as telas do sistema
                </a>
              </div>
              <p className="mt-5 text-[13px] text-arx-slate">
                100% online: funciona no navegador do computador e do celular, sem instalar nada.
              </p>
            </div>

            <div className="mt-16 sm:mt-20">
              <HeroTelas />
            </div>
          </div>
        </section>

        {/* Para quem é */}
        <section id="para-quem-e" className="scroll-mt-16 border-b border-arx-line">
          <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-4 py-10 sm:flex-row sm:items-center sm:gap-10 sm:px-8">
            <Rotulo>Feito para</Rotulo>
            <ul className="flex flex-wrap gap-x-7 gap-y-3">
              {PUBLICO.map((p) => <li key={p} className="text-[15px] text-arx-frost">{p}</li>)}
            </ul>
          </div>
        </section>

        {/* Segmentos */}
        <Secao id="segmentos">
          <Rotulo>Segmentos</Rotulo>
          <h2 className="mt-4 max-w-[760px] text-[34px] font-medium leading-[1.1] tracking-[-0.02em] text-white sm:text-[44px]">
            O sistema fala a língua do seu segmento.
          </h2>
          <p className="mt-5 max-w-[640px] text-[16px] leading-relaxed text-arx-mist">
            Na clínica é plantão, no bar é turno, na agência é ação, na produtora é evento. Escolha o
            seu segmento no cadastro e o Crew já chega com os termos e as funções do seu dia a dia.
          </p>
          <div className="mt-12">
            <SegmentosDemo />
          </div>
        </Secao>

        {/* Como funciona */}
        <Secao id="como-funciona">
          <Rotulo>Como funciona</Rotulo>
          <h2 className="mt-4 max-w-[720px] text-[34px] font-medium leading-[1.1] tracking-[-0.02em] text-white sm:text-[44px]">
            Quatro etapas. Uma plataforma.
          </h2>
          <p className="mt-5 max-w-[640px] text-[16px] leading-relaxed text-arx-mist">
            Cada etapa alimenta a seguinte: quem você escala vai para a escala, quem confirma
            vira pagamento. Nada se perde entre planilha, e-mail e WhatsApp.
          </p>
          <div className="mt-12 grid overflow-hidden rounded-xl border border-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {ETAPAS.map((e, i) => (
              <div key={e.n} className={`bg-arx-surface/50 p-7 ${i > 0 ? "border-t border-white/10 sm:border-t-0" : ""} ${i % 2 === 1 ? "sm:border-l" : ""} ${i >= 2 ? "sm:border-t lg:border-t-0" : ""} ${i > 0 ? "lg:border-l" : ""} border-white/10`}>
                <p className="text-[13px] font-medium text-arx-crew-soft">{e.n}</p>
                <h3 className="mt-6 text-[18px] font-medium text-white">{e.titulo}</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-arx-mist">{e.texto}</p>
              </div>
            ))}
          </div>
        </Secao>

        {/* Funcionalidades */}
        <Secao id="funcionalidades">
          <Rotulo>Funcionalidades</Rotulo>
          <h2 className="mt-4 max-w-[760px] text-[34px] font-medium leading-[1.1] tracking-[-0.02em] text-white sm:text-[44px]">
            Veja o sistema por dentro.
          </h2>
          <p className="mt-5 max-w-[640px] text-[16px] leading-relaxed text-arx-mist">
            As telas abaixo são do próprio ARXUM Crew, com dados de exemplo.
          </p>

          <div className="mt-20 space-y-28 sm:space-y-36">
            <Recurso rotulo="Banco de talentos" icone={Users}
              titulo="Sua base de talentos, organizada."
              texto="Todos os profissionais da empresa num só lugar, com função, valor da diária, chave PIX, avaliação e se estão disponíveis ou em outro trabalho."
              itens={[
                "Busca e filtros por função, status, valor e avaliação.",
                "Convite pelo WhatsApp com um clique, com mensagem pronta.",
                "Avaliação de 0 a 5 depois de cada trabalho.",
              ]}>
              <JanelaNavegador src="/landing/tela-freelas.webp" alt="Tela da base com a lista de profissionais" />
            </Recurso>

            <Recurso rotulo="Link de cadastro" icone={Link2} inverter
              titulo="O profissional se cadastra sozinho."
              texto="Sua empresa ganha um link próprio, com o seu nome e a sua cor. É só mandar no grupo ou colocar na bio: quem preencher entra direto na sua base."
              itens={[
                "Nome, WhatsApp, CPF, função, valor e chave PIX.",
                "CPF repetido é barrado, para a base não duplicar.",
                "Pensado para o celular, em três passos.",
              ]}>
              <JanelaCelular src="/landing/mobile-cadastro.webp" alt="Formulário de cadastro de profissional no celular" />
            </Recurso>

            <Recurso rotulo="Agenda" icone={CalendarDays}
              titulo="Cada trabalho com as vagas que ele precisa."
              texto="Crie o evento, o plantão ou o turno, defina quantas pessoas de cada função ele exige e o valor de cada vaga. A agenda mostra o mês inteiro e avisa o que está faltando."
              itens={[
                "Alerta de equipe incompleta antes do dia.",
                "Alerta de conflito quando a mesma pessoa está em dois trabalhos no mesmo horário.",
                "Status do trabalho: orçamento, confirmado, em andamento e encerrado.",
              ]}>
              <JanelaNavegador src="/landing/tela-agenda-calendario.webp" alt="Agenda em visão de calendário com os trabalhos do mês e alertas de escala" />
            </Recurso>
          </div>
        </Secao>

        {/* Call sheet */}
        <Secao>
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
            <div>
              <div className="flex items-center gap-2.5">
                <ClipboardList size={16} className="text-arx-crew-soft" aria-hidden="true" />
                <Rotulo>Escala e confirmação</Rotulo>
              </div>
              <h3 className="mt-4 text-[30px] font-medium leading-[1.1] tracking-[-0.02em] text-white sm:text-[38px]">
                Roteiro no WhatsApp. Confirmação na hora.
              </h3>
              <p className="mt-5 text-[16px] leading-relaxed text-arx-mist">
                Publique a escala (call sheet, briefing, ordem de serviço — o nome muda com o seu
                segmento) e envie o link para a equipe. Cada pessoa abre no celular, vê data, horário e
                local e confirma presença. No painel, você acompanha quem já confirmou e quem falta.
              </p>
              <Lista itens={[
                "Mensagem de WhatsApp pronta para cada pessoa escalada.",
                "Contagem de confirmados e aguardando em cada escala.",
                "Despublique quando quiser: o link deixa de funcionar.",
              ]} />
              <div className="mt-10">
                <JanelaNavegador src="/landing/tela-callsheets.webp" alt="Tela da escala publicada com o status de confirmação da equipe" />
              </div>
            </div>
            <div className="flex flex-col items-center gap-4">
              <JanelaCelular src="/landing/mobile-roteiro.webp" alt="Escala aberta no celular do profissional, com botão de confirmar presença" />
              <p className="flex items-center gap-2 text-[13px] text-arx-slate">
                <MessageCircle size={14} aria-hidden="true" /> O que o profissional vê no celular
              </p>
            </div>
          </div>
        </Secao>

        <Secao>
          <div className="space-y-28 sm:space-y-36">
            <Recurso rotulo="Financeiro & PIX" icone={Wallet}
              titulo="Quem trabalhou, quanto recebe e o que já foi pago."
              texto="Cada pessoa escalada vira um pagamento com o valor da vaga. Você vê o total a pagar, o que já foi quitado e o que passou da data sem pagamento."
              itens={[
                "Pagamentos atrasados destacados automaticamente.",
                "Chave PIX de cada profissional ao lado do valor.",
                "Exportação em CSV para a contabilidade.",
              ]}>
              <JanelaNavegador src="/landing/tela-financeiro.webp" alt="Tela Financeiro & PIX com totais a pagar, pagos e atrasados" />
            </Recurso>

            <Recurso rotulo="Sua marca" icone={Palette} inverter
              titulo="Com a cara da sua empresa."
              texto="O link de cadastro e a escala que o profissional recebe aparecem com o nome, o logo e a cor da sua empresa. As funções também são suas."
              itens={[
                "Cor principal e logo nas páginas públicas.",
                "Funções editáveis, com listas prontas para cada segmento.",
                "Endereço do link escolhido por você.",
              ]}>
              <JanelaNavegador src="/landing/tela-configuracoes.webp" alt="Tela Configurações com dados da empresa, cor principal e link de captação" />
            </Recurso>
          </div>
        </Secao>

        {/* Destaques rápidos */}
        <Secao>
          <div className="grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-3">
            {[
              { icone: AlertTriangle, titulo: "Menos furo de equipe", texto: "Os alertas mostram vagas abertas e conflitos de horário com antecedência, não na hora." },
              { icone: MessageCircle, titulo: "Tudo pelo WhatsApp", texto: "Convite, roteiro e confirmação usam o app que a sua equipe já tem no bolso." },
              { icone: Check, titulo: "Pagamento sem esquecer ninguém", texto: "Quem foi escalado aparece no financeiro com o valor certo até ser marcado como pago." },
            ].map(({ icone: Icone, titulo, texto }) => (
              <div key={titulo} className="bg-arx-obsidian p-7">
                <Icone size={20} className="text-arx-crew-soft" aria-hidden="true" />
                <h3 className="mt-5 text-[17px] font-medium text-white">{titulo}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-arx-mist">{texto}</p>
              </div>
            ))}
          </div>
        </Secao>

        {/* Preços */}
        <Secao id="precos">
          <Rotulo>Preços</Rotulo>
          <h2 className="mt-4 max-w-[760px] text-[34px] font-medium leading-[1.1] tracking-[-0.02em] text-white sm:text-[44px]">
            Comece grátis. Pague quando a operação crescer.
          </h2>
          <p className="mt-5 max-w-[640px] text-[16px] leading-relaxed text-arx-mist">
            Sem comissão por profissional e sem taxa por escala. No plano anual, 2 meses saem de graça.
          </p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLANOS.map((p) => (
              <div key={p.id} className={`relative flex flex-col rounded-xl border p-6 ${p.destaque ? "border-arx-crew/60 bg-arx-crew/[0.07]" : "border-white/10 bg-arx-surface/50"}`}>
                {p.destaque && (
                  <span className="absolute -top-3 left-6 rounded-full bg-arx-crew-strong px-2.5 py-1 text-[11px] font-semibold text-white">Mais escolhido</span>
                )}
                <h3 className="text-[17px] font-medium text-white">{p.nome}</h3>
                <p className="mt-1 text-[13px] text-arx-mist">{p.descricao}</p>
                <p className="mt-6 flex items-baseline gap-1 text-white">
                  {p.preco === 0 ? (
                    <span className="text-[34px] font-semibold tracking-[-0.02em]">R$ 0</span>
                  ) : (
                    <>
                      <span className="text-[34px] font-semibold tracking-[-0.02em]">R$ {p.preco}</span>
                      <span className="text-[14px] text-arx-slate">/mês</span>
                    </>
                  )}
                </p>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {p.itens.map((i) => (
                    <li key={i} className="flex gap-2.5 text-[14px] leading-snug text-arx-frost">
                      <Check size={15} className="mt-0.5 shrink-0 text-arx-crew-soft" aria-hidden="true" /> {i}
                    </li>
                  ))}
                </ul>
                <Link href="/criar-conta"
                  className={`mt-8 rounded-lg px-4 py-3 text-center text-[14px] font-semibold transition-colors ${p.destaque ? "bg-arx-crew-strong text-white hover:bg-arx-crew" : "border border-white/15 text-white hover:bg-white/5"}`}>
                  {p.preco === 0 ? "Começar grátis" : "Começar agora"}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[13px] text-arx-slate">
            Toda conta começa no Grátis. Para mudar de plano, é só falar com a equipe pelo WhatsApp dentro do painel.
          </p>
        </Secao>

        {/* CTA final */}
        <section className="border-b border-arx-line">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-24 text-center sm:px-8 sm:py-32">
            <h2 className="mx-auto max-w-[760px] text-[34px] font-medium leading-[1.1] tracking-[-0.02em] text-white sm:text-[48px]">
              Sua próxima escala merece uma equipe que chega confirmada.
            </h2>
            <p className="mx-auto mt-6 max-w-[520px] text-[16px] leading-relaxed text-arx-mist">
              Cadastre a empresa, mande o link para os seus profissionais e monte a primeira escala hoje.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link href="/criar-conta" className="inline-flex items-center gap-2 rounded-lg bg-arx-crew-strong px-5 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-arx-crew">
                Cadastrar minha empresa <ArrowRight size={17} />
              </Link>
              <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer"
                className="rounded-lg border border-white/10 px-5 py-3.5 text-[15px] font-medium text-white transition-colors hover:bg-white/5">
                Falar com a equipe
              </a>
            </div>
            <p className="mt-6 text-[14px] text-arx-slate">
              Já usa o ARXUM Crew? <Link href="/login" className="text-white hover:underline">Entrar</Link>
            </p>
          </div>
        </section>
      </main>

      {/* Rodapé */}
      <footer id="contato" className="scroll-mt-16">
        <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 py-16 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              <CrewMark />
              <CrewWordmark />
            </div>
            <p className="mt-5 text-[14px] leading-relaxed text-arx-mist">
              Gestão de freelancers para qualquer segmento: banco de talentos, escalas, confirmação e pagamentos em um só lugar.
            </p>
          </div>
          <div>
            <Rotulo>Produto</Rotulo>
            <ul className="mt-5 space-y-3 text-[14px]">
              <li><a href="#funcionalidades" className="text-arx-mist hover:text-white">Funcionalidades</a></li>
              <li><a href="#como-funciona" className="text-arx-mist hover:text-white">Como funciona</a></li>
              <li><a href="#precos" className="text-arx-mist hover:text-white">Preços</a></li>
              <li><Link href="/criar-conta" className="text-arx-mist hover:text-white">Cadastrar empresa</Link></li>
              <li><Link href="/login" className="text-arx-mist hover:text-white">Entrar</Link></li>
            </ul>
          </div>
          <div>
            <Rotulo>Contato</Rotulo>
            <ul className="mt-5 space-y-3 text-[14px]">
              <li><a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="text-arx-mist hover:text-white">WhatsApp (21) 96711-9815</a></li>
            </ul>
          </div>
          <div>
            <Rotulo>Família ARXUM</Rotulo>
            <ul className="mt-5 space-y-3 text-[14px]">
              {[
                ["Fest", "https://www.arxum.com.br/fest", "#d4af37"],
                ["Edu", "https://www.arxum.com.br/edu", "#0d9488"],
                ["Studio", "https://www.arxum.com.br/studio", "#3b82f6"],
                ["Suite", "https://www.arxum.com.br/suite", "#ef4444"],
              ].map(([nome, href, cor]) => (
                <li key={nome}>
                  <a href={href} className="inline-flex items-center gap-2 text-arx-mist hover:text-white">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cor }} aria-hidden="true" />
                    ARXUM {nome}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-arx-line">
          <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-3 px-4 py-6 text-[12px] text-arx-slate sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <p>
              © 2026 ARXUM Crew, todos os direitos reservados ao ARXUM group ·{" "}
              <a href="https://www.arxum.com.br/termos-de-uso" className="hover:text-white">Termos de Uso</a> ·{" "}
              <a href="https://www.arxum.com.br/privacidade" className="hover:text-white">Privacidade</a>
            </p>
            <p>Desenvolvido por <a href="https://csstudios.site" target="_blank" rel="noopener noreferrer" className="text-arx-mist hover:text-white">CS Studios</a></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
