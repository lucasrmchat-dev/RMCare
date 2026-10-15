"use server";

import { createClient } from "@supabase/supabase-js";
import { PLACEHOLDER_LINK_CONFIRMACAO, resolverLinkConfirmacaoSeguro } from "@/lib/confirmationLink";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const COLUNAS_PERMITIDAS = [
  "empresa_id",
  "agendamento_id",
  "telefone_whatsapp",
  "nome_paciente",
  "mensagem",
  "data_hora_programada",
  "status",
  "gatilho",
  "tipo_envio",
  "url_webhook_customizada"
];

const limpar = (m) => Object.fromEntries(COLUNAS_PERMITIDAS.filter((k) => m[k] !== undefined).map((k) => [k, m[k]]));

/**
 * Enfileira mensagens que usam {link_confirmacao} já com o link pessoal do paciente resolvido,
 * para a fila exibir e enviar o texto final (como acontece com {nome}).
 *
 * Segurança: o link só é gerado quando o agendamento pertence à clínica e o telefone de destino
 * é o do próprio paciente; o link nunca é devolvido a quem chamou. As mensagens que não passam
 * nessa checagem (ou não usam a variável) voltam em `pendentes` para o fluxo normal de inserção.
 */
export async function enfileirarMensagensComLink(mensagens) {
  const lista = Array.isArray(mensagens) ? mensagens.slice(0, 50) : [];
  const resolvidas = [];
  const pendentes = [];

  for (const m of lista) {
    if (!m?.empresa_id || !String(m.mensagem || "").includes(PLACEHOLDER_LINK_CONFIRMACAO)) {
      pendentes.push(m);
      continue;
    }
    const link = await resolverLinkConfirmacaoSeguro({
      db,
      agendamentoId: m.agendamento_id,
      empresaId: m.empresa_id,
      telefone: m.telefone_whatsapp
    });
    if (!link) {
      pendentes.push(m);
      continue;
    }
    resolvidas.push(limpar({ ...m, mensagem: String(m.mensagem).replaceAll(PLACEHOLDER_LINK_CONFIRMACAO, link) }));
  }

  if (resolvidas.length > 0) {
    let { error } = await db.from("fila_mensagens").insert(resolvidas);
    if (error && (error.code === "42703" || error.message?.includes("column"))) {
      ({ error } = await db.from("fila_mensagens").insert(
        resolvidas.map(({ tipo_envio, url_webhook_customizada, ...resto }) => resto)
      ));
    }
    if (error) {
      console.error("Erro ao enfileirar mensagens com link de confirmação:", error.message);
      // Devolve ao fluxo normal com a variável original (o link é resolvido no disparo)
      return { inseridas: 0, pendentes: lista };
    }
  }

  return { inseridas: resolvidas.length, pendentes };
}
