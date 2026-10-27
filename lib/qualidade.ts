export interface HistoricoEscala {
  freelancer_id: string;
  resposta?: string | null;
  checkin_em?: string | null;
  data?: string;
}

const hoje = () => new Date().toISOString().slice(0, 10);

// Nota de 0 a 5 usada para ordenar sugestões de escala.
// Parte da avaliação dada pela empresa, soma um pouco por trabalho feito e
// desconta recusas e faltas. Falta só conta se a empresa usa check-in
// (há algum check-in registrado); sem isso não dá para saber quem faltou.
export function notaQualidade(f: { id: string; avaliacao?: number | null }, historico: HistoricoEscala[]): number {
  const usaCheckin = historico.some((h) => h.checkin_em);
  const meus = historico.filter((h) => h.freelancer_id === f.id);
  const passados = meus.filter((h) => h.data && h.data < hoje() && h.resposta === "confirmado");
  const feitos = usaCheckin ? passados.filter((h) => h.checkin_em).length : passados.length;
  const faltas = usaCheckin ? passados.filter((h) => !h.checkin_em).length : 0;
  const recusas = meus.filter((h) => h.resposta === "recusado").length;

  const nota = Number(f.avaliacao ?? 5)
    + Math.min(feitos * 0.1, 0.5)
    - Math.min(recusas * 0.3, 1)
    - Math.min(faltas * 0.5, 1.5);
  return Math.max(0, Math.min(5, nota));
}

export function resumoPresenca(id: string, historico: HistoricoEscala[]) {
  const usaCheckin = historico.some((h) => h.checkin_em);
  const meus = historico.filter((h) => h.freelancer_id === id);
  const passados = meus.filter((h) => h.data && h.data < hoje() && h.resposta === "confirmado");
  return {
    trabalhos: usaCheckin ? passados.filter((h) => h.checkin_em).length : passados.length,
    faltas: usaCheckin ? passados.filter((h) => !h.checkin_em).length : 0,
    recusas: meus.filter((h) => h.resposta === "recusado").length,
  };
}
