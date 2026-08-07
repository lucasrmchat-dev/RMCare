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

export function getMessageSchedule(rule, appointmentDate, appointmentTime) {
  const base = new Date(`${appointmentDate}T${appointmentTime || "12:00"}:00-03:00`);
  if (rule.gatilho === "pos_atendimento") {
    base.setDate(base.getDate() + Number(rule.dias_depois || 0));
    if (rule.hora_envio) {
      const [hours, minutes] = rule.hora_envio.split(":").map(Number);
      base.setHours(hours, minutes, 0, 0);
    }
    return base.toISOString();
  }
  base.setDate(base.getDate() - Number(rule.dias_antes || 0));
  return base.toISOString();
}
