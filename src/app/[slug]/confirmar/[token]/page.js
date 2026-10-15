import { carregarConfirmacao } from "@/actions/confirmacao";
import ConfirmacaoView from "./ConfirmacaoView";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Confirmação de atendimento",
  description: "Confirme, remarque ou cancele seu atendimento em poucos toques.",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer"
};

export default async function ConfirmarAgendamentoPage({ params }) {
  const { slug, token } = await params;
  const resultado = await carregarConfirmacao(token);

  // O link só vale para a clínica do próprio agendamento
  const valido = resultado.success && resultado.empresa?.slug === decodeURIComponent(slug);

  return (
    <ConfirmacaoView
      token={token}
      inicial={valido ? resultado : null}
      erro={valido ? null : resultado.error || "Este link de confirmação é inválido ou foi substituído."}
    />
  );
}
