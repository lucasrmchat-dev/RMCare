import { createClient } from "@supabase/supabase-js";
import { formatarTelefoneEnvio } from "@/lib/phoneUtils";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const parseTemplate = (tpl, data) => {
  if (!tpl) return "";
  return tpl.replace(/{(\w+)}/g, (_, k) => (data[k] !== undefined ? data[k] : `{${k}}`));
};

export async function dispararGatilhoServidor({
  agendamentoId,
  empresaId,
  gatilho,
  novaData = null,
  novoHorario = null,
  motivo = null
}) {
  try {
    if (!agendamentoId || !empresaId || !gatilho) return false;

    // 1. Buscar agendamento e paciente
    const { data: ag, error: errAg } = await supabaseAdmin
      .from("agendamentos")
      .select("*, pacientes(*)")
      .eq("id", agendamentoId)
      .maybeSingle();

    if (errAg || !ag) return false;

    // 2. Buscar dados da empresa
    const { data: emp, error: errEmp } = await supabaseAdmin
      .from("empresas")
      .select("*")
      .eq("id", empresaId)
      .maybeSingle();

    if (errEmp || !emp) return false;

    const regras = emp.config_mensagens || [];
    const regrasDoGatilho = regras.filter((r) => r.gatilho === gatilho);
    if (regrasDoGatilho.length === 0) return false;

    const paciente = ag.pacientes || {};
    const tel = paciente.telefone_whatsapp || "";
    if (!tel) return false;

    const telFormatadoEnvio = formatarTelefoneEnvio(tel);

    const nomeCompleto = (paciente.nome_completo || "").trim() || "Paciente";
    const primeiroNome = nomeCompleto.split(" ")[0] || "Paciente";
    const sobrenome = nomeCompleto.split(" ").slice(1).join(" ");

    // Motivo padrão de cancelamento / remarcação se não fornecido
    const motivoPadrao = "Readequação operacional da grade de atendimentos da clínica";
    const motivoFinal = (motivo && String(motivo).trim()) ? String(motivo).trim() : motivoPadrao;

    // Histórico de datas (anterior e nova)
    const dataAnterior = ag.data_agendamento;
    const horaAnterior = ag.horario_agendamento ? ag.horario_agendamento.substring(0, 5) : "";
    const dataAnteriorFormatada = dataAnterior ? dataAnterior.split("-").reverse().join("/") : "";

    // Data/Hora Nova (remarcada ou atual)
    const dataFinal = novaData || ag.data_agendamento;
    const horaFinal = (novoHorario || ag.horario_agendamento || "").substring(0, 5);
    const dataFormatada = dataFinal ? dataFinal.split("-").reverse().join("/") : "";

    const nomeProfissional = ag.medico_profissional || ag.subtipo_exame || "Especialista";
    const nomeEspecialidade = ag.subtipo_exame || ag.tipo_servico || "Consulta";
    const isExame =
      ag.tipo_servico === "Exame" ||
      /(colonoscopia|endoscopia|ultrassom|exame)/i.test(`${nomeEspecialidade} ${nomeProfissional}`);

    // Variáveis universais para mensagens
    // A variável {nome} agora se transforma no Nome Completo conforme solicitado
    const vars = {
      nome: nomeCompleto,
      nome_completo: nomeCompleto,
      primeiro_nome: nomeCompleto,
      sobrenome: sobrenome,
      servico: isExame ? nomeEspecialidade : nomeProfissional,
      especialista: nomeProfissional,
      medico: nomeProfissional,
      profissional: nomeProfissional,
      especialidade: nomeEspecialidade,
      subtipo_exame: isExame ? nomeEspecialidade : "",
      categoria: isExame ? "Exames" : "Consultas",
      tipo_servico: isExame ? "Exame" : "Consulta",
      modalidade: ag.modalidade || "Particular",
      data: dataFormatada,
      hora: horaFinal || "",
      nova_data: dataFormatada,
      novo_horario: horaFinal || "",
      data_anterior: dataAnteriorFormatada,
      hora_anterior: horaAnterior || "",
      data_antiga: dataAnteriorFormatada,
      hora_antiga: horaAnterior || "",
      motivo: motivoFinal,
      motivo_cancelamento: motivoFinal,
      justificativa: motivoFinal,
      cpf: paciente.cpf || "",
      telefone: telFormatadoEnvio,
      whatsapp: telFormatadoEnvio,
      clinica: emp.nome || "Clínica",
      nome_clinica: emp.nome || "Clínica",
      valor: ag.valor_total ? `R$ ${Number(ag.valor_total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : ""
    };

    const configWebhooks = emp.config_campos?.config_webhooks || emp.config_chaves?.config_webhooks || {};

    const urlWebhookPadrao =
      emp.rmchat_webhook_url ||
      emp.config_chaves?.rmchat_webhook_url ||
      emp.config_chaves?.url_rmchat ||
      emp.config_chaves?.webhook_url ||
      emp.config_campos?.rmchat_webhook_url;

    const urlWebhookFluxoInteligente =
      configWebhooks.webhook_url ||
      emp.config_chaves?.webhook_url_inteligente ||
      urlWebhookPadrao;

    for (const regra of regrasDoGatilho) {
      const isWebhookTipo = regra.tipo_envio === "webhook";
      const targetUrl = (regra.url_webhook_customizada || (isWebhookTipo ? urlWebhookFluxoInteligente : urlWebhookPadrao))?.trim();

      const msgFormatada = parseTemplate(regra.mensagem, vars);
      let enviadoComSucesso = false;

      if (targetUrl && targetUrl.startsWith("http")) {
        try {
          let payload;

          if (isWebhookTipo) {
            // Disparo de Webhook / Fluxo Inteligente com dados estruturados
            payload = {
              evento: "disparo_fluxo_inteligente",
              tipo_disparo: "webhook",
              gatilho: gatilho,
              empresa: {
                id: empresaId,
                nome: emp.nome,
                slug: emp.slug
              },
              agendamento: {
                id: agendamentoId,
                data: dataFinal,
                horario: horaFinal,
                data_anterior: dataAnterior,
                horario_anterior: horaAnterior,
                motivo_cancelamento: motivoFinal,
                servico: isExame ? nomeEspecialidade : nomeProfissional,
                especialista: nomeProfissional,
                especialidade: nomeEspecialidade,
                modalidade: ag.modalidade || "Particular",
                status_atual: ag.status_atendimento || "agendado"
              },
              paciente: {
                id: paciente.id || null,
                nome: nomeCompleto,
                nome_completo: nomeCompleto,
                primeiro_nome: nomeCompleto,
                telefone: telFormatadoEnvio,
                cpf: paciente.cpf || null,
                email: paciente.email || null,
                enfermidades: paciente.enfermidades || []
              },
              mensagem_formatada: msgFormatada,
              opcoes_resposta: configWebhooks.respostas_mapping || {
                confirmar: ["1", "sim", "confirmo"],
                cancelar: ["2", "nao", "cancelar"],
                remarcar: ["3", "remarcar", "reagendar"]
              },
              webhook_retorno_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://rmagenda.com.br"}/api/webhook-resposta`
            };
          } else {
            // Disparo padrão via WhatsApp (RM Chat)
            payload = {
              name: nomeCompleto,
              number: telFormatadoEnvio,
              phone: telFormatadoEnvio,
              texto: msgFormatada,
              mensagem: msgFormatada,
              media_url: regra.anexo_url || null
            };
          }

          const headers = {
            "Content-Type": "application/json",
            "x-rmcare-event": isWebhookTipo ? "fluxo_inteligente" : "whatsapp_msg"
          };

          if (configWebhooks.webhook_secret) {
            headers["x-webhook-secret"] = configWebhooks.webhook_secret;
          }

          const res = await fetch(targetUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(payload)
          });

          enviadoComSucesso = res.ok;
        } catch (fetchErr) {
          console.error("Erro ao enviar webhook no servidor:", fetchErr);
        }
      }

      // Registra na fila_mensagens para auditoria
      try {
        const payloadInsert = {
          empresa_id: empresaId,
          agendamento_id: agendamentoId,
          telefone_whatsapp: telFormatadoEnvio,
          nome_paciente: nomeCompleto,
          mensagem: msgFormatada,
          status: enviadoComSucesso ? "enviada" : "pendente",
          gatilho: gatilho,
          tipo_envio: isWebhookTipo ? "webhook" : "whatsapp",
          data_hora_programada: new Date().toISOString()
        };

        let { error: errIns } = await supabaseAdmin.from("fila_mensagens").insert(payloadInsert);

        if (errIns && (errIns.code === "42703" || errIns.message?.includes("tipo_envio"))) {
          delete payloadInsert.tipo_envio;
          await supabaseAdmin.from("fila_mensagens").insert(payloadInsert);
        }
      } catch (logErr) {
        console.warn("Aviso ao salvar log na fila_mensagens:", logErr);
      }
    }

    return true;
  } catch (err) {
    console.error("Erro em dispararGatilhoServidor:", err);
    return false;
  }
}
