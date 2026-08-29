export const RETURN_WINDOW_DAYS = 30;

export function daysBetween(dateA, dateB) {
  const start = new Date(`${dateA}T12:00:00Z`);
  const end = new Date(`${dateB}T12:00:00Z`);
  return Math.floor((end - start) / 86400000);
}

export function validateReturnEligibility(previousAppointments, requestedDate, options = {}) {
  const windowDays = Number(options.windowDays || RETURN_WINDOW_DAYS);
  const requirePayment = options.requirePayment !== false;
  const eligible = (previousAppointments || [])
    .filter((item) => item.tipo_servico !== "Retorno" && (!requirePayment || item.status_pagamento_antecipado === true))
    .map((item) => ({ ...item, elapsedDays: daysBetween(item.data_agendamento, requestedDate) }))
    .filter((item) => item.elapsedDays >= 0 && item.elapsedDays <= windowDays)
    .sort((a, b) => b.data_agendamento.localeCompare(a.data_agendamento))[0];

  if (!eligible) {
    return { valid: false, error: `Retorno permitido somente após consulta inicial${requirePayment ? " paga" : ""} e dentro da janela de ${windowDays} dias.` };
  }
  return { valid: true, initialAppointment: eligible };
}

/**
 * Calcula a data e hora de envio programado da mensagem.
 * Suporta configuração flexível e granular pós-atendimento e dias úteis / corridos antes.
 */
export function getMessageSchedule(rule, appointmentDate, appointmentTime, serviceDurationMinutes = 30, appointmentEndTime = null) {
  const horaInicio = appointmentTime ? appointmentTime.slice(0, 5) : "12:00";
  let base = new Date(`${appointmentDate}T${horaInicio}:00-03:00`);

  if (rule.gatilho === "pos_atendimento") {
    const ref = rule.referencia_pos || (rule.dias_depois && !rule.offset_unidade ? "dias_depois" : "termino");

    if (ref === "termino") {
      if (appointmentEndTime) {
        const [hFim, mFim] = appointmentEndTime.slice(0, 5).split(":").map(Number);
        base.setHours(hFim, mFim, 0, 0);
      } else {
        const duracaoMin = Number(serviceDurationMinutes || rule.duracao_estimada_minutos || 30);
        base.setMinutes(base.getMinutes() + duracaoMin);
      }
    }

    if (ref === "dias_depois") {
      const dias = Number(rule.dias_depois || 0);
      base.setDate(base.getDate() + dias);
      if (rule.hora_envio) {
        const [hours, minutes] = rule.hora_envio.split(":").map(Number);
        base.setHours(hours, minutes, 0, 0);
      }
      return base.toISOString();
    }

    // Offset granular (segundos, minutos, horas)
    const valor = Number(rule.offset_valor ?? 0);
    const unidade = rule.offset_unidade || "minutos";

    if (unidade === "segundos") {
      base.setSeconds(base.getSeconds() + valor);
    } else if (unidade === "horas") {
      base.setHours(base.getHours() + valor);
    } else {
      // minutos padrão
      base.setMinutes(base.getMinutes() + valor);
    }

    return base.toISOString();
  }

  // Gatilho agendado (dias antes - corridos ou úteis)
  const isUteis = rule.tipo_dias_antes === "uteis" || rule.unidade_antes === "dias_uteis";
  if (isUteis) {
    const qtd = Number(rule.dias_antes || 1);
    const [y, m, d] = appointmentDate.split("-").map(Number);
    let date = new Date(y, m - 1, d);
    let diasRestantes = qtd;
    while (diasRestantes > 0) {
      date.setDate(date.getDate() - 1);
      const dow = date.getDay();
      if (dow !== 0 && dow !== 6) diasRestantes--;
    }
    const [hours, minutes] = (rule.hora_envio || "08:00").split(":").map(Number);
    date.setHours(hours, minutes, 0, 0);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hStr = String(hours).padStart(2, "0");
    const mStr = String(minutes).padStart(2, "0");
    return new Date(`${year}-${month}-${day}T${hStr}:${mStr}:00-03:00`).toISOString();
  }

  base.setDate(base.getDate() - Number(rule.dias_antes || 0));
  if (rule.hora_envio) {
    const [hours, minutes] = rule.hora_envio.split(":").map(Number);
    base.setHours(hours, minutes, 0, 0);
  }
  return base.toISOString();
}
