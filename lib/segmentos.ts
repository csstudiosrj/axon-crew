// Segmentos atendidos pelo ARXUM Crew. Cada um define o vocabulário que o
// sistema usa nas telas (o "job" vira plantão, ação, turno, obra...) e as
// funções sugeridas para a base de profissionais.

export type Genero = "m" | "f";

export interface Termos {
  profissional: string;      // singular, minúsculo: "freelancer", "promotor(a)"
  profissionais: string;     // plural: "freelancers", "promotores"
  job: string;               // "evento", "ação", "plantão"
  jobs: string;              // "eventos", "ações", "plantões"
  generoJob: Genero;
  roteiro: string;           // documento enviado à equipe: "call sheet", "briefing"
  roteiros: string;
  generoRoteiro: Genero;
  pagamento: string;         // "cachê", "diária", "valor do plantão"
}

export interface Documento {
  id: string;
  nome: string;
  validade: boolean;   // pede data de validade
}

export interface Segmento {
  id: string;
  nome: string;
  descricao: string;
  exemplos: string;
  termos: Termos;
  especialidades: string[];
  documentos: Documento[];
}

// Documentos que se repetem entre segmentos.
const DOC = {
  drt: { id: "drt", nome: "DRT (registro profissional)", validade: false },
  nr35: { id: "nr35", nome: "NR-35 (trabalho em altura)", validade: true },
  nr10: { id: "nr10", nome: "NR-10 (segurança em eletricidade)", validade: true },
  nr18: { id: "nr18", nome: "NR-18 (construção civil)", validade: true },
  aso: { id: "aso", nome: "ASO (atestado de saúde ocupacional)", validade: true },
  manipulador: { id: "manipulador", nome: "Curso de manipulador de alimentos", validade: true },
  cnh: { id: "cnh", nome: "CNH", validade: true },
} satisfies Record<string, Documento>;

// Pedido em todos os segmentos: define se o pagamento sai com nota (MEI) ou recibo.
export const DOC_MEI: Documento = { id: "mei", nome: "CNPJ MEI", validade: false };

export const SEGMENTOS: Segmento[] = [
  {
    id: "eventos",
    nome: "Eventos e shows",
    descricao: "Produtoras, locadoras de som e luz, casas de show e cerimonial.",
    exemplos: "Produtoras, locadoras de som e luz, casas de show",
    termos: { profissional: "freelancer", profissionais: "freelancers", job: "evento", jobs: "eventos", generoJob: "m", roteiro: "call sheet", roteiros: "call sheets", generoRoteiro: "m", pagamento: "cachê" },
    especialidades: ["Técnico(a) de Áudio", "Iluminador(a)", "Técnico(a) de Vídeo", "Roadie", "Produtor(a)", "Cenógrafo(a)", "Rigger", "Operador(a) de Palco", "Carregador", "Recepcionista", "DJ"],
    documentos: [DOC.drt, DOC.nr35, DOC.nr10],
  },
  {
    id: "audiovisual",
    nome: "Audiovisual e publicidade",
    descricao: "Produtoras de vídeo, cinema, fotografia e agências.",
    exemplos: "Produtoras de vídeo, cinema, fotografia",
    termos: { profissional: "freelancer", profissionais: "freelancers", job: "produção", jobs: "produções", generoJob: "f", roteiro: "ordem do dia", roteiros: "ordens do dia", generoRoteiro: "f", pagamento: "diária" },
    especialidades: ["Diretor(a)", "Diretor(a) de Fotografia", "Câmera", "Assistente de Câmera", "Gaffer", "Eletricista", "Maquinista", "Técnico(a) de Som Direto", "Maquiador(a)", "Figurinista", "Assistente de Produção", "Fotógrafo(a)"],
    documentos: [DOC.drt, DOC.nr35],
  },
  {
    id: "gastronomia",
    nome: "Bares, restaurantes e buffets",
    descricao: "Casas que reforçam a equipe em dias de movimento e festas.",
    exemplos: "Bares, restaurantes, buffets",
    termos: { profissional: "extra", profissionais: "extras", job: "turno", jobs: "turnos", generoJob: "m", roteiro: "escala", roteiros: "escalas", generoRoteiro: "f", pagamento: "diária" },
    especialidades: ["Garçom/Garçonete", "Bartender", "Barback", "Cozinheiro(a)", "Auxiliar de Cozinha", "Copeiro(a)", "Maître", "Hostess", "Sommelier", "Churrasqueiro(a)", "Confeiteiro(a)"],
    documentos: [DOC.manipulador, DOC.aso],
  },
  {
    id: "hotelaria",
    nome: "Hotelaria e turismo",
    descricao: "Hotéis, pousadas, resorts e agências de receptivo.",
    exemplos: "Hotéis, pousadas, resorts",
    termos: { profissional: "extra", profissionais: "extras", job: "turno", jobs: "turnos", generoJob: "m", roteiro: "escala", roteiros: "escalas", generoRoteiro: "f", pagamento: "diária" },
    especialidades: ["Recepcionista", "Camareiro(a)", "Mensageiro(a)", "Governanta", "Garçom/Garçonete", "Cozinheiro(a)", "Guia de Turismo", "Monitor(a) de Lazer", "Auxiliar de Manutenção"],
    documentos: [DOC.manipulador, DOC.aso],
  },
  {
    id: "promocao",
    nome: "Promoção, trade e PDV",
    descricao: "Agências de promoção, trade marketing e ativações de marca.",
    exemplos: "Agências de promoção, trade marketing",
    termos: { profissional: "promotor(a)", profissionais: "promotores", job: "ação", jobs: "ações", generoJob: "f", roteiro: "briefing", roteiros: "briefings", generoRoteiro: "m", pagamento: "diária" },
    especialidades: ["Promotor(a) de Vendas", "Promotor(a) de Eventos", "Repositor(a)", "Degustador(a)", "Demonstrador(a)", "Merchandiser", "Supervisor(a) de Campo", "Recepcionista Bilíngue", "Modelo de Ativação"],
    documentos: [DOC.aso],
  },
  {
    id: "saude",
    nome: "Saúde e cuidados",
    descricao: "Clínicas, home care, ambulâncias de eventos e casas de repouso.",
    exemplos: "Clínicas, home care, casas de repouso",
    termos: { profissional: "plantonista", profissionais: "plantonistas", job: "plantão", jobs: "plantões", generoJob: "m", roteiro: "escala de plantão", roteiros: "escalas de plantão", generoRoteiro: "f", pagamento: "valor do plantão" },
    especialidades: ["Médico(a)", "Enfermeiro(a)", "Técnico(a) de Enfermagem", "Cuidador(a)", "Socorrista", "Fisioterapeuta", "Condutor(a) de Ambulância", "Brigadista"],
    documentos: [{ id: "conselho", nome: "Registro no conselho (COREN, CRM, CREFITO…)", validade: true }, { id: "bls", nome: "Curso BLS / APH", validade: true }],
  },
  {
    id: "construcao",
    nome: "Construção e manutenção",
    descricao: "Construtoras, empreiteiras e empresas de manutenção predial.",
    exemplos: "Construtoras, empreiteiras, manutenção",
    termos: { profissional: "prestador(a)", profissionais: "prestadores", job: "obra", jobs: "obras", generoJob: "f", roteiro: "ordem de serviço", roteiros: "ordens de serviço", generoRoteiro: "f", pagamento: "diária" },
    especialidades: ["Pedreiro(a)", "Eletricista", "Encanador(a)", "Pintor(a)", "Azulejista", "Gesseiro(a)", "Serralheiro(a)", "Carpinteiro(a)", "Mestre de Obras", "Ajudante Geral", "Soldador(a)"],
    documentos: [DOC.nr35, DOC.nr18, DOC.nr10, DOC.aso],
  },
  {
    id: "logistica",
    nome: "Logística e armazéns",
    descricao: "Centros de distribuição, transportadoras e operações de pico.",
    exemplos: "Centros de distribuição, transportadoras",
    termos: { profissional: "temporário(a)", profissionais: "temporários", job: "turno", jobs: "turnos", generoJob: "m", roteiro: "escala", roteiros: "escalas", generoRoteiro: "f", pagamento: "diária" },
    especialidades: ["Auxiliar de Logística", "Conferente", "Separador(a)", "Operador(a) de Empilhadeira", "Motorista", "Ajudante de Carga", "Embalador(a)", "Líder de Turno"],
    documentos: [{ id: "nr11", nome: "NR-11 (empilhadeira)", validade: true }, DOC.cnh, DOC.aso],
  },
  {
    id: "limpeza",
    nome: "Limpeza e facilities",
    descricao: "Empresas de limpeza, conservação e serviços gerais.",
    exemplos: "Limpeza, conservação, serviços gerais",
    termos: { profissional: "diarista", profissionais: "diaristas", job: "serviço", jobs: "serviços", generoJob: "m", roteiro: "ordem de serviço", roteiros: "ordens de serviço", generoRoteiro: "f", pagamento: "diária" },
    especialidades: ["Diarista", "Auxiliar de Limpeza", "Limpador(a) de Vidros", "Jardineiro(a)", "Copeiro(a)", "Encarregado(a)", "Lavador(a)", "Auxiliar de Manutenção"],
    documentos: [DOC.aso, DOC.nr35],
  },
  {
    id: "seguranca",
    nome: "Segurança e portaria",
    descricao: "Segurança de eventos, portaria e controle de acesso.",
    exemplos: "Segurança de eventos, portaria",
    termos: { profissional: "profissional", profissionais: "profissionais", job: "posto", jobs: "postos", generoJob: "m", roteiro: "escala de postos", roteiros: "escalas de postos", generoRoteiro: "f", pagamento: "diária" },
    especialidades: ["Vigilante", "Segurança de Eventos", "Porteiro(a)", "Controlador(a) de Acesso", "Bombeiro(a) Civil", "Brigadista", "Orientador(a) de Público", "Supervisor(a) de Segurança"],
    documentos: [{ id: "cnv", nome: "CNV (Carteira Nacional de Vigilante)", validade: true }, { id: "reciclagem", nome: "Reciclagem de vigilante", validade: true }, { id: "bombeiro", nome: "Curso de bombeiro civil", validade: true }],
  },
  {
    id: "educacao",
    nome: "Educação e treinamentos",
    descricao: "Escolas de idiomas, cursos livres, recreação e treinamentos.",
    exemplos: "Cursos livres, idiomas, recreação",
    termos: { profissional: "instrutor(a)", profissionais: "instrutores", job: "aula", jobs: "aulas", generoJob: "f", roteiro: "plano de aula", roteiros: "planos de aula", generoRoteiro: "m", pagamento: "valor da aula" },
    especialidades: ["Professor(a)", "Instrutor(a)", "Monitor(a)", "Recreador(a)", "Palestrante", "Tutor(a)", "Intérprete de Libras", "Facilitador(a)"],
    documentos: [{ id: "formacao", nome: "Diploma ou certificado de formação", validade: false }],
  },
  {
    id: "moda",
    nome: "Moda, beleza e casting",
    descricao: "Agências de modelos, desfiles, editoriais e beleza.",
    exemplos: "Agências de modelos, desfiles, editoriais",
    termos: { profissional: "talento", profissionais: "talentos", job: "job", jobs: "jobs", generoJob: "m", roteiro: "call sheet", roteiros: "call sheets", generoRoteiro: "m", pagamento: "cachê" },
    especialidades: ["Modelo", "Ator/Atriz", "Maquiador(a)", "Cabeleireiro(a)", "Stylist", "Camareiro(a)", "Fotógrafo(a)", "Produtor(a) de Moda"],
    documentos: [DOC.drt],
  },
  {
    id: "varejo",
    nome: "Varejo e temporadas",
    descricao: "Lojas e shoppings que reforçam a equipe em datas de pico.",
    exemplos: "Lojas, shoppings, temporadas",
    termos: { profissional: "temporário(a)", profissionais: "temporários", job: "turno", jobs: "turnos", generoJob: "m", roteiro: "escala", roteiros: "escalas", generoRoteiro: "f", pagamento: "diária" },
    especialidades: ["Vendedor(a)", "Operador(a) de Caixa", "Repositor(a)", "Estoquista", "Fiscal de Loja", "Empacotador(a)", "Papai Noel", "Recepcionista"],
    documentos: [DOC.aso],
  },
  {
    id: "outro",
    nome: "Outro segmento",
    descricao: "Qualquer empresa que contrata profissionais por diária ou por job.",
    exemplos: "Qualquer operação com freelancers",
    termos: { profissional: "freelancer", profissionais: "freelancers", job: "job", jobs: "jobs", generoJob: "m", roteiro: "roteiro", roteiros: "roteiros", generoRoteiro: "m", pagamento: "valor" },
    especialidades: ["Auxiliar", "Técnico(a)", "Supervisor(a)", "Coordenador(a)", "Motorista", "Recepcionista"],
    documentos: [],
  },
];

export const SEGMENTO_PADRAO = "eventos";

// Documentos pedidos no cadastro: os do segmento + CNPJ MEI.
export function documentosDoSegmento(id?: string | null): Documento[] {
  return [...getSegmento(id).documentos, DOC_MEI];
}

export function getSegmento(id?: string | null): Segmento {
  return SEGMENTOS.find((s) => s.id === id) ?? SEGMENTOS.find((s) => s.id === SEGMENTO_PADRAO)!;
}

export const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

// "Novo evento", "Nova ação"
export const novo = (palavra: string, g: Genero) => `${g === "f" ? "Nova" : "Novo"} ${palavra}`;
// "o evento", "a ação"
export const artigo = (palavra: string, g: Genero) => `${g === "f" ? "a" : "o"} ${palavra}`;
// "do evento", "da ação"
export const de = (palavra: string, g: Genero) => `${g === "f" ? "da" : "do"} ${palavra}`;
// "primeiro evento", "primeira ação"
export const primeiro = (palavra: string, g: Genero) => `${g === "f" ? "primeira" : "primeiro"} ${palavra}`;
// "criado"/"criada", "nenhum"/"nenhuma", "um"/"uma"
export const flex = (raiz: string, g: Genero) => `${raiz}${g === "f" ? "a" : "o"}`;
export const nenhum = (g: Genero) => (g === "f" ? "nenhuma" : "nenhum");
export const um = (g: Genero) => (g === "f" ? "uma" : "um");
