/**
 * Situações do agendamento no MedicalSYS (GET /integracoes/agenda/ — campo `situacao`):
 * agen = agendado · conf = confirmado · agua = aguardando (paciente na clínica) ·
 * aten = em atendimento · fina = finalizado · canc = cancelado
 */
const MAPA = {
  agen: "agendado",
  conf: "confirmado",
  agua: "compareceu",
  aten: "compareceu",
  fina: "concluido",
  canc: "cancelado"
};

const codigo = (situacao) => String(situacao || "").trim().toLowerCase().slice(0, 4);

/** Converte a situação do MedicalSYS para o status_atendimento usado no RMCare. */
export const statusDaSituacaoMedicalsys = (situacao) => MAPA[codigo(situacao)] || "agendado";

/** Agendamento cancelado no MedicalSYS não ocupa mais o horário. */
export const situacaoLiberaHorario = (situacao) => codigo(situacao) === "canc";

/** Bloqueio/agendamento importado que ainda ocupa a agenda (ignora os cancelados no ERP). */
export const bloqueioOcupaHorario = (bloqueio) => !situacaoLiberaHorario(bloqueio?.situacao);
