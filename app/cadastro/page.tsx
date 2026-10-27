import { redirect } from "next/navigation";

// O cadastro de empresas fica em /criar-conta. O cadastro de freelancers
// continua em /cadastro/[slug].
export default function CadastroPage() {
  redirect("/criar-conta");
}
