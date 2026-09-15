import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const EVENTOS_WEBHOOK_SUPORTADOS = [
  {
    id: "agendamento.criado",
    nome: "Agendamento Criado",
    descricao: "Disparado quando uma nova consulta ou exame é agendado no sistema."
  },
  {
    id: "agendamento.confirmado",
    nome: "Presença Confirmada",
    descricao: "Disparado quando o paciente confirma a consulta via WhatsApp ou painel."
  },
  {
    id: "agendamento.cancelado",
    nome: "Agendamento Cancelado",
    descricao: "Disparado quando um agendamento é desmarcado pela clínica ou paciente."
  },
  {
    id: "agendamento.remarcado",
    nome: "Agendamento Remarcado",
    descricao: "Disparado quando a data ou horário do atendimento é alterado."
  },
  {
    id: "pagamento.aprovado",
    nome: "Pagamento Aprovado",
    descricao: "Disparado quando o pagamento particular (Pix/Cartão) é liquidado."
  },
  {
    id: "triagem.concluida",
    nome: "Triagem Pré-Atendimento",
    descricao: "Disparado quando o paciente responde às perguntas clínicas de saúde."
  }
];

/**
 * Dispara um webhook de saída (outbound) para o ERP / sistema externo da empresa.
 */
export async function dispararWebhookOutboundEmpresa({
  empresaId,
  evento,
  dados = {},
  agendamentoId = null,
  pacienteId = null
}) {
  const inicioMs = Date.now();
  try {
    if (!empresaId || !evento) return { success: false, error: "empresaId e evento são obrigatórios" };

    // 1. Buscar dados da empresa
    const { data: emp, error: errEmp } = await supabaseAdmin
      .from("empresas")
      .select("id, nome, slug, config_campos, config_chaves")
      .eq("id", empresaId)
      .maybeSingle();

    if (errEmp || !emp) {
      return { success: false, error: "Empresa não encontrada" };
    }

    const confCampos = emp.config_campos || {};
    const confChaves = emp.config_chaves || {};
    const configWebhooks = confCampos.config_webhooks || confChaves.config_webhooks || {};

    const urlDestino = (
      configWebhooks.webhook_outbound_url ||
      configWebhooks.webhook_url_erp ||
      configWebhooks.webhook_url ||
      ""
    ).trim();

    const outboundAtivo = configWebhooks.webhook_outbound_enabled !== false && urlDestino.startsWith("http");

    if (!outboundAtivo) {
      return { success: false, skipped: true, reason: "Webhook outbound não configurado ou desabilitado" };
    }

    // 2. Verificar se o evento específico está habilitado para envio
    const eventosAtivos = Array.isArray(configWebhooks.eventos_ativos)
      ? configWebhooks.eventos_ativos
      : EVENTOS_WEBHOOK_SUPORTADOS.map((e) => e.id);

    if (!eventosAtivos.includes(evento)) {
      return { success: false, skipped: true, reason: `Evento '${evento}' não está na lista de eventos ativos da clínica` };
    }

    // 3. Montar dados enriquecidos se vier agendamentoId
    let agendamentoDetalhes = dados.agendamento || null;
    let pacienteDetalhes = dados.paciente || null;

    if (agendamentoId && (!agendamentoDetalhes || !pacienteDetalhes)) {
      const { data: agData } = await supabaseAdmin
        .from("agendamentos")
        .select("*, pacientes(*)")
        .eq("id", agendamentoId)
        .maybeSingle();

      if (agData) {
        agendamentoDetalhes = {
          id: agData.id,
          data: agData.data_agendamento,
          horario: agData.horario_agendamento ? agData.horario_agendamento.substring(0, 5) : null,
          servico: agData.tipo_servico || agData.subtipo_exame || "Consulta",
          especialista: agData.medico_profissional || null,
          modalidade: agData.modalidade || "Particular",
          status: agData.status_atendimento || "agendado",
          status_pagamento: agData.status_pagamento_antecipado ? "pago" : "pendente",
          valor_total: agData.valor_total || 0,
          observacoes: agData.observacoes || null
        };

        if (agData.pacientes) {
          pacienteDetalhes = {
            id: agData.pacientes.id,
            nome: agData.pacientes.nome_completo || agData.pacientes.nome || "Paciente",
            cpf: agData.pacientes.cpf || null,
            telefone: agData.pacientes.telefone_whatsapp || null,
            email: agData.pacientes.email || null,
            data_nascimento: agData.pacientes.data_nascimento || null
          };
        }
      }
    }

    const payload = {
      event: evento,
      event_id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      empresa: {
        id: emp.id,
        nome: emp.nome,
        slug: emp.slug
      },
      data: {
        ...dados,
        ...(agendamentoDetalhes ? { agendamento: agendamentoDetalhes } : {}),
        ...(pacienteDetalhes ? { paciente: pacienteDetalhes } : {})
      }
    };

    const secret = (configWebhooks.webhook_secret || configWebhooks.outbound_secret || "").trim();

    const headers = {
      "Content-Type": "application/json",
      "User-Agent": "RMCare-Webhooks/2.0",
      "x-rmcare-event": evento,
      "x-empresa-id": emp.id
    };

    if (secret) {
      headers["x-webhook-secret"] = secret;
      headers["Authorization"] = `Bearer ${secret}`;
    }

    // 4. Executar requisição HTTP com timeout de 10s
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let resHttp;
    let resBodyText = "";
    let statusCode = 0;
    let sucessoEnvio = false;

    try {
      resHttp = await fetch(urlDestino, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      statusCode = resHttp.status;
      sucessoEnvio = resHttp.ok;

      try {
        resBodyText = await resHttp.text();
      } catch (e) {
        resBodyText = "";
      }
    } catch (fetchErr) {
      resBodyText = fetchErr.message || "Erro de rede / Timeout";
      statusCode = 0;
      sucessoEnvio = false;
    } finally {
      clearTimeout(timeoutId);
    }

    const latenciaMs = Date.now() - inicioMs;

    // 5. Salvar log de auditoria no histórico da empresa (mantendo últimos 20)
    try {
      const logsAtuais = Array.isArray(configWebhooks.webhook_logs) ? configWebhooks.webhook_logs : [];
      const novoLog = {
        id: payload.event_id,
        timestamp: payload.timestamp,
        evento: evento,
        url_destino: urlDestino,
        status_code: statusCode,
        sucesso: sucessoEnvio,
        latencia_ms: latenciaMs,
        resposta_preview: resBodyText.slice(0, 180)
      };

      const logsAtualizados = [novoLog, ...logsAtuais].slice(0, 20);

      const novoConfigWebhooks = {
        ...configWebhooks,
        webhook_logs: logsAtualizados
      };

      await supabaseAdmin
        .from("empresas")
        .update({
          config_campos: {
            ...confCampos,
            config_webhooks: novoConfigWebhooks
          }
        })
        .eq("id", emp.id);
    } catch (logErr) {
      console.warn("Aviso ao registrar log de webhook outbound:", logErr);
    }

    return {
      success: sucessoEnvio,
      status: statusCode,
      latencia_ms: latenciaMs,
      resposta: resBodyText.slice(0, 200),
      url: urlDestino
    };
  } catch (error) {
    console.error("❌ [webhookDispatcher] Falha crítica:", error);
    return {
      success: false,
      error: error.message || "Falha interna ao disparar webhook",
      latencia_ms: Date.now() - inicioMs
    };
  }
}
