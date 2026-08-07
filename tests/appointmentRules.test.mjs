import test from "node:test";
import assert from "node:assert/strict";
import { validateReturnEligibility, getMessageSchedule } from "../src/lib/appointmentRules.js";

test("aceita retorno de consulta inicial paga no 30º dia", () => {
  const result = validateReturnEligibility([{ id: "initial", tipo_servico: "Consulta", status_pagamento_antecipado: true, data_agendamento: "2026-08-01" }], "2026-08-31");
  assert.equal(result.valid, true);
  assert.equal(result.initialAppointment.id, "initial");
});

test("rejeita retorno no 31º dia", () => {
  const result = validateReturnEligibility([{ tipo_servico: "Consulta", status_pagamento_antecipado: true, data_agendamento: "2026-08-01" }], "2026-09-01");
  assert.equal(result.valid, false);
});

test("rejeita retorno quando a consulta inicial não foi paga", () => {
  const result = validateReturnEligibility([{ tipo_servico: "Consulta", status_pagamento_antecipado: false, data_agendamento: "2026-08-01" }], "2026-08-10");
  assert.equal(result.valid, false);
});

test("aceita prazo e exigência de pagamento configuráveis", () => {
  const appointments = [{ id: "initial", tipo_servico: "Consulta", status_pagamento_antecipado: false, data_agendamento: "2026-01-01" }];
  assert.equal(validateReturnEligibility(appointments, "2026-02-15", { windowDays: 60, requirePayment: false }).valid, true);
  assert.equal(validateReturnEligibility(appointments, "2026-02-15", { windowDays: 30, requirePayment: false }).valid, false);
});

test("programa mensagem depois do atendimento", () => {
  const scheduled = getMessageSchedule({ gatilho: "pos_atendimento", dias_depois: 2, hora_envio: "09:30" }, "2026-08-10", "14:00");
  assert.match(scheduled, /^2026-08-12T12:30:00\.000Z$/);
});
