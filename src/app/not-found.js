import TelaRecuperacao from "@/components/TelaRecuperacao";

export const metadata = { title: "Página não encontrada" };

export default function NotFound() {
  return (
    <TelaRecuperacao
      codigo="Erro 404"
      titulo="Não achamos esta página."
      descricao="O endereço pode ter sido digitado errado ou o link expirou. Se você veio de uma mensagem da clínica, peça um link novo — ou escolha um dos caminhos a seguir."
    />
  );
}
