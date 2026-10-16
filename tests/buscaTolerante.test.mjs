import test from "node:test";
import assert from "node:assert/strict";
import { filtrarPorBusca, pontuarBusca, normalizarBusca } from "../src/lib/buscaTolerante.js";

const clinicas = [
  { nome: "Clínica e-Gastro", slug: "e-gastro" },
  { nome: "Cardiologia São Lucas", slug: "sao-lucas" },
  { nome: "Vitta Saúde", slug: "vitta" }
];

test("ignora acentos e maiúsculas", () => {
  assert.equal(normalizarBusca("Clínica SÃO Lucas"), "clinica sao lucas");
  assert.deepEqual(filtrarPorBusca(clinicas, "saude", ["nome"]).map((c) => c.slug), ["vitta"]);
});

test("tolera erros de digitação", () => {
  assert.deepEqual(filtrarPorBusca(clinicas, "cardilogia", ["nome"]).map((c) => c.slug), ["sao-lucas"]);
  assert.deepEqual(filtrarPorBusca(clinicas, "gastor", ["nome", "slug"]).map((c) => c.slug), ["e-gastro"]);
});

test("ordena correspondência exata/prefixo antes de aproximada", () => {
  assert.ok(pontuarBusca("Vitta Saúde", "vitta") > pontuarBusca("Vitta Saúde", "vita"));
});

test("não devolve resultados sem relação e busca vazia mantém a lista", () => {
  assert.equal(filtrarPorBusca(clinicas, "ortopedia", ["nome"]).length, 0);
  assert.equal(filtrarPorBusca(clinicas, "  ", ["nome"]).length, 3);
});
