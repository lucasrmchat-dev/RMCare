import test from "node:test";
import assert from "node:assert/strict";
import { buildJourney, isDraftFresh } from "../src/lib/journey.js";

test("não inclui triagem quando o atendimento não possui perguntas", () => {
  assert.equal(buildJourney({}, false).includes("triagem"), false);
});

test("inclui triagem na posição correta somente quando aplicável", () => {
  const journey = buildJourney({}, true);
  assert.equal(journey[journey.indexOf("modalidade") - 1], "triagem");
});

test("respeita módulos ocultos pela clínica", () => {
  const journey = buildJourney({ ocultar_triagem: true, ocultar_modalidade: true, ocultar_checkout: true }, true);
  assert.deepEqual(journey, ["boas_vindas", "identificacao", "especialidade", "agenda", "concluido"]);
});

test("considera rascunho válido por até 24 horas", () => {
  assert.equal(isDraftFresh({ version: 1, savedAt: 1_000 }, 1_000 + 23 * 60 * 60 * 1000), true);
  assert.equal(isDraftFresh({ version: 1, savedAt: 1_000 }, 1_000 + 25 * 60 * 60 * 1000), false);
});
