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

const TEMPLATES_PADRAO = {
  imediato:
    "Olá {nome}, seu agendamento de {servico} com {especialista} foi confirmado com sucesso para o dia {data} às {hora}h na {clinica}. Te aguardamos!",
  cancelado:
    "Olá {nome}, informamos que seu agendamento de {servico} com {especialista} marcado para o dia {data} às {hora}h foi cancelado. Motivo: {motivo}.",
  remarcado:
    "Olá {nome}, seu agendamento de {servico} com {especialista} foi remarcado com sucesso para o dia {data} às {hora}h. Te aguardamos!",
  pagamento_aprovado:
    "Olá {nome}, seu pagamento para o agendamento de {servico} com {especialista} no dia {data} às {hora}h foi confirmado com sucesso!",
  pagamento_rejeitado:
    "Olá {nome}, informamos que o pagamento/comprovante referente ao agendamento de {servico} no dia {data} às {hora}h não foi aprovado. Motivo: {motivo}. Por favor, entre em contato conosco para regularizar ou escolher um novo horário."
};

export async function dispararGatilhoServidor({
  agendamentoId,
  empresaId,
  gatilho,
  novaData = null,
  novoHorario = null,
  motivo = null,
  mensagemCustom = null
}) {
  try {
    if (!agendamentoId || !empresaId || !gatilho) return false;

    // 1. Buscar agendamento e paciente
    const { data: ag, error: errAg } = await supabaseAdmin
      .from("agendamentos")
      .select("*, pacientes(*)")
      .eq("id", agendamentoId)
      .maybeSingle();

    if (errAg || !ag) {
      console.warn("Agendamento não encontrado para disparo de mensagem:", agendamentoId);
      return false;
    }

    // 2. Buscar dados da empresa
    const { data: emp, error: errEmp } = await supabaseAdmin
      .from("empresas")
      .select("*")
      .eq("id", empresaId)
      .maybeSingle();

    if (errEmp || !emp) {
      console.warn("Empresa não encontrada para disparo:", empresaId);
      return false;
    }

    const paciente = ag.pacientes || {};
    const tel = paciente.telefone_whatsapp || ag.telefone_whatsapp || "";
    if (!tel) {
      console.warn("Paciente sem telefone cadastrado para disparo de WhatsApp.");
      return false;
    }

    const telFormatadoEnvio = formatarTelefoneEnvio(tel);
    const nomeCompleto = (paciente.nome_completo || ag.nome_paciente || paciente.nome || ag.nome || "").trim() || "Paciente";
    const primeiroNome = nomeCompleto.split(" ")[0] || "Paciente";
    const sobrenome = nomeCompleto.split(" ").slice(1).join(" ");

    // Motivo de cancelamento / remarcação
    const motivoPadrao = "Readequação operacional da grade de atendimentos da clínica";
    const motivoFinal = (motivo && String(motivo).trim()) ? String(motivo).trim() : motivoPadrao;

    // Histórico de datas
    const dataAnterior = ag.data_agendamento;
    const horaAnterior = ag.horario_agendamento ? ag.horario_agendamento.substring(0, 5) : "";
    const dataAnteriorFormatada = dataAnterior ? dataAnterior.split("-").reverse().join("/") : "";

    const dataFinal = novaData || ag.data_agendamento;
    const horaFinal = (novoHorario || ag.horario_agendamento || "").substring(0, 5);
    const dataFormatada = dataFinal ? dataFinal.split("-").reverse().join("/") : "";

    const nomeProfissional = ag.medico_profissional || ag.subtipo_exame || "Especialista";
    const nomeEspecialidade = ag.subtipo_exame || ag.tipo_servico || "Consulta";
    const isExame =
      ag.tipo_servico === "Exame" ||
      /(colonoscopia|endoscopia|ultrassom|exame)/i.test(`${nomeEspecialidade} ${nomeProfissional}`);

    // Variáveis universais para substituição nos templates
    const vars = {
      nome: nomeCompleto,
      nome_completo: nomeCompleto,
      primeiro_nome: primeiroNome,
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

    // Resolução de URL de Webhook / WhatsApp
    const configWebhooks = emp.config_campos?.config_webhooks || emp.config_chaves?.config_webhooks || {};

    const urlWebhookPadrao =
      emp.rmchat_webhook_url ||
      emp.config_chaves?.rmchat_webhook_url ||
      emp.config_chaves?.url_rmchat ||
      emp.config_chaves?.webhook_url ||
      emp.config_campos?.rmchat_webhook_url ||
      emp.config_campos?.url_rmchat ||
      emp.config_campos?.whatsapp_webhook_url;

    const urlWebhookFluxoInteligente =
      configWebhooks.webhook_url ||
      emp.config_chaves?.webhook_url_inteligente ||
      urlWebhookPadrao;

    // Regras cadastradas: busca na nova tabela regras_mensagens com fallback para emp.config_mensagens
    let regras = [];
    try {
      const { data: regrasDb, error: errRegrasDb } = await supabaseAdmin
        .from("regras_mensagens")
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("ativo", true)
        .order("ordem", { ascending: true })
        .order("created_at", { ascending: true });

      if (!errRegrasDb && Array.isArray(regrasDb) && regrasDb.length > 0) {
        regras = regrasDb;
      } else {
        regras = Array.isArray(emp.config_mensagens) ? emp.config_mensagens.filter((r) => r.ativo !== false) : [];
      }
    } catch {
      regras = Array.isArray(emp.config_mensagens) ? emp.config_mensagens.filter((r) => r.ativo !== false) : [];
    }

    let regrasDoGatilho = regras.filter((r) => r.gatilho === gatilho);

    // Se houver mensagem customizada (ex: pelo modal de cancelamento/rejeição), ela tem prioridade
    if (mensagemCustom && String(mensagemCustom).trim()) {
      regrasDoGatilho = [
        {
          gatilho,
          mensagem: String(mensagemCustom).trim(),
          tipo_envio: "whatsapp"
        }
      ];
    } else if (regrasDoGatilho.length === 0) {
      // Se não houver regra configurada no painel, usa o template padrão daquele gatilho
      const templateFallback = TEMPLATES_PADRAO[gatilho] || TEMPLATES_PADRAO.imediato;
      regrasDoGatilho = [
        {
          gatilho,
          mensagem: templateFallback,
          tipo_envio: "whatsapp"
        }
      ];
    }

    for (const regra of regrasDoGatilho) {
      const isWebhookTipo = regra.tipo_envio === "webhook";
      const targetUrl = (regra.url_webhook_customizada || (isWebhookTipo ? urlWebhookFluxoInteligente : urlWebhookPadrao))?.trim();

      const msgTpl = mensagemCustom && String(mensagemCustom).trim() ? String(mensagemCustom).trim() : regra.mensagem;
      const msgFormatada = parseTemplate(msgTpl, vars);
      let enviadoComSucesso = false;

      if (targetUrl && targetUrl.startsWith("http")) {
        try {
          let payload;

          if (isWebhookTipo) {
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
                primeiro_nome: primeiroNome,
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
            payload = {
              name: nomeCompleto,
              number: telFormatadoEnvio,
              phone: telFormatadoEnvio,
              texto: msgFormatada,
              mensagem: msgFormatada,
              text: msgFormatada,
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

          console.log(`📡 [DISPARO SERVIDOR] Enviando gatilho "${gatilho}" para ${targetUrl} | Tel: ${telFormatadoEnvio}`);

          const res = await fetch(targetUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(payload)
          });

          enviadoComSucesso = res.ok;
          if (!res.ok) {
            const errTxt = await res.text();
            console.error(`❌ [DISPARO SERVIDOR] Servidor retornou HTTP ${res.status}:`, errTxt);
          } else {
            console.log(`✅ [DISPARO SERVIDOR] Mensagem enviada com sucesso para ${telFormatadoEnvio}`);
          }
        } catch (fetchErr) {
          console.error("❌ [DISPARO SERVIDOR] Erro ao enviar fetch:", fetchErr);
        }
      } else {
        console.warn("⚠️ [DISPARO SERVIDOR] Nenhuma URL de WhatsApp/Webhook configurada na empresa:", emp.nome);
      }

      // Registra na fila_mensagens para histórico e auditoria
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
