export const DEFAULT_JOURNEY = [
  "boas_vindas",
  "identificacao",
  "especialidade",
  "triagem",
  "modalidade",
  "agenda",
  "checkout",
  "concluido"
];

export const AVAILABLE_STEPS = [
  { id: "boas_vindas", label: "Boas-vindas", desc: "Apresentação e recepção inicial com os benefícios da clínica" },
  { id: "identificacao", label: "Identificação do Paciente", desc: "Nome, CPF, WhatsApp, E-mail e Nascimento" },
  { id: "modalidade", label: "Modalidade & Cobertura", desc: "Convênio, Particular e formas de atendimento" },
  { id: "especialidade", label: "Atendimento Clínico", desc: "Especialidade médica, exame e especialista" },
  { id: "triagem", label: "Triagem Clínica", desc: "Questionário de saúde e orientações prévias" },
  { id: "agenda", label: "Data & Horário", desc: "Calendário com vagas e horários disponíveis" },
  { id: "checkout", label: "Pagamento / Entrada", desc: "Checkout Pix ou Cartão para garantir a vaga" }
];

export function buildJourney(config = {}, hasApplicableQuestions = false) {
  const isConvenioPadrao =
    config.ocultar_modalidade &&
    (config.modalidade_padrao === "Convênio" ||
      config.modalidade_padrao?.toLowerCase().includes("conv"));

  // 1. Determina a ordem base das etapas
  let baseOrder = DEFAULT_JOURNEY;

  if (Array.isArray(config.ordem_etapas) && config.ordem_etapas.length > 0) {
    const validStepIds = new Set(DEFAULT_JOURNEY.filter((s) => s !== "concluido"));
    const customList = config.ordem_etapas.filter(
      (s) => typeof s === "string" && validStepIds.has(s) && s !== "concluido"
    );

    // Garante que etapas padrão não mencionadas sejam anexadas antes de 'concluido'
    const missingSteps = DEFAULT_JOURNEY.filter(
      (s) => s !== "concluido" && !customList.includes(s)
    );

    baseOrder = [...customList, ...missingSteps, "concluido"];
  }

  // 2. Aplica filtros de visibilidade conforme as regras da clínica
  return baseOrder.filter((step) => {
    if (step === "boas_vindas") return config.ocultar_boas_vindas !== true;
    if (step === "identificacao") return config.ocultar_identificacao !== true;
    if (step === "triagem") return config.ocultar_triagem !== true && hasApplicableQuestions;
    if (step === "modalidade") return config.ocultar_modalidade !== true;
    if (step === "checkout") {
      if (config.ocultar_checkout === true) return false;
      if (isConvenioPadrao) return false;
      return true;
    }
    return true;
  });
}

// Rascunho válido por no máximo 24 horas (24 * 60 * 60 * 1000 ms)
export function isDraftFresh(draft, now = Date.now()) {
  const maxAgeMs = 24 * 60 * 60 * 1000;
  return draft?.version === 1 && Number.isFinite(draft.savedAt) && now - draft.savedAt <= maxAgeMs;
}
