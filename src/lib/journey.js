export const DEFAULT_JOURNEY = ["boas_vindas", "identificacao", "especialidade", "triagem", "modalidade", "agenda", "checkout", "concluido"];

export function buildJourney(config = {}, hasApplicableQuestions = false) {
  const isConvenioPadrao = config.ocultar_modalidade && (config.modalidade_padrao === "Convênio" || config.modalidade_padrao?.toLowerCase().includes("conv"));

  return DEFAULT_JOURNEY.filter((step) => {
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

// Rascunho válido por no máximo 10 minutos (10 * 60 * 1000 ms)
export function isDraftFresh(draft, now = Date.now()) {
  return draft?.version === 1 && Number.isFinite(draft.savedAt) && now - draft.savedAt < 10 * 60 * 1000;
}
