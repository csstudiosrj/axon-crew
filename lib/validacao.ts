export const somenteDigitos = (v: string) => v.replace(/\D/g, "");

// Confere os dois dígitos verificadores do CPF.
export function cpfValido(valor: string): boolean {
  const cpf = somenteDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digito = (base: string, pesoInicial: number) => {
    const soma = base.split("").reduce((acc, n, i) => acc + Number(n) * (pesoInicial - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(cpf.slice(0, 9), 10) === Number(cpf[9]) && digito(cpf.slice(0, 10), 11) === Number(cpf[10]);
}

export const formatarTelefone = (v: string) => {
  let s = somenteDigitos(v).slice(0, 11);
  if (s.length > 6) s = s.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
  else if (s.length > 2) s = s.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
  else if (s.length > 0) s = s.replace(/^(\d{0,2})/, "($1");
  return s;
};

export const formatarCPF = (v: string) => {
  let s = somenteDigitos(v).slice(0, 11);
  if (s.length > 9) s = s.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2})/, "$1.$2.$3-$4");
  else if (s.length > 6) s = s.replace(/^(\d{3})(\d{3})(\d{0,3})/, "$1.$2.$3");
  else if (s.length > 3) s = s.replace(/^(\d{3})(\d{0,3})/, "$1.$2");
  return s;
};

export const formatarBRL = (valor: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor ?? 0);

// "2026-11-07" -> "07/11/2026"
export const dataBR = (iso?: string | null) => {
  if (!iso) return "";
  const [a, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${a}`;
};

// "2026-11-07" -> "sábado, 7 de novembro"
export const dataExtenso = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
