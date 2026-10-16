import test from "node:test";
import assert from "node:assert/strict";
import { statusDaSituacaoMedicalsys, bloqueioOcupaHorario } from "../src/lib/medicalsysSituacao.js";
import { calcularOcupacaoAgenda } from "../src/lib/agendaOcupacao.js";

test("situações do MedicalSYS (doc GET /agenda/) viram status do RMCare", () => {
  assert.equal(statusDaSituacaoMedicalsys("agen"), "agendado");
  assert.equal(statusDaSituacaoMedicalsys("conf"), "confirmado");
  assert.equal(statusDaSituacaoMedicalsys("agua"), "compareceu");
  assert.equal(statusDaSituacaoMedicalsys("aten"), "compareceu");
  assert.equal(statusDaSituacaoMedicalsys("fina"), "concluido");
  assert.equal(statusDaSituacaoMedicalsys("canc"), "cancelado");
  assert.equal(statusDaSituacaoMedicalsys(undefined), "agendado");
});

test("agendamento cancelado no MedicalSYS libera o horário", () => {
  assert.equal(bloqueioOcupaHorario({ situacao: "canc" }), false);
  assert.equal(bloqueioOcupaHorario({ situacao: "agen" }), true);
  assert.equal(bloqueioOcupaHorario({}), true); // bloqueio manual (sem situação) continua ocupando
});

test("cálculo de horários livres ignora cancelados do ERP e usa o horário de fim real", () => {
  const formData = { data_agendamento: "2026-11-10", tipo_servico: "Consulta", medico_profissional: "Dra. Ana", especialidade: "Cardiologia", subtipo_exame: "" };
  const ocupacao = calcularOcupacaoAgenda({
    ag: [],
    bl: [
      { horario: "09:00:00", horario_fim: "09:45:00", medico_profissional: "Dra. Ana", situacao: "agen" },
      { horario: "10:00:00", horario_fim: "10:30:00", medico_profissional: "Dra. Ana", situacao: "canc" }
    ],
    formData,
    regrasGlobais: [],
    selectedSrv: null,
    servicosDB: [],
    empresaDados: { config_campos: {} }
  });
  assert.deepEqual(ocupacao.ocupados, ["09:00"]);
  assert.equal(ocupacao.occupiedIntervals[0].endMin - ocupacao.occupiedIntervals[0].startMin, 45);
});
