import test from "node:test";
import assert from "node:assert/strict";

process.env.APPOINTMENT_CONFIRM_SECRET = "segredo-de-teste";
process.env.NEXT_PUBLIC_APP_URL = "https://rmagenda.test/";

const {
  criarTokenConfirmacao,
  verificarTokenConfirmacao,
  montarLinkConfirmacao,
  injetarLinkConfirmacaoSeguro
} = await import("../src/lib/confirmationLink.js");
const { calcularOcupacaoAgenda, resolverServicoSelecionado } = await import("../src/lib/agendaOcupacao.js");

const ID = "3f2b8c1e-9a4d-4e7b-8c21-5d6e7f809a1b";

test("token de confirmação é curto e devolve o ID do agendamento", async () => {
  const token = await criarTokenConfirmacao(ID);
  assert.ok(token.length <= 48, `token muito longo: ${token.length}`);
  assert.match(token, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  assert.equal(await verificarTokenConfirmacao(token), ID);
});

test("token é determinístico por agendamento e único entre agendamentos", async () => {
  const outro = "11111111-2222-4333-8444-555555555555";
  assert.equal(await criarTokenConfirmacao(ID), await criarTokenConfirmacao(ID));
  assert.notEqual(await criarTokenConfirmacao(ID), await criarTokenConfirmacao(outro));
});

test("rejeita token adulterado, truncado ou de outro agendamento", async () => {
  const token = await criarTokenConfirmacao(ID);
  const [idPart, sig] = token.split(".");
  const outroId = (await criarTokenConfirmacao("11111111-2222-4333-8444-555555555555")).split(".")[0];
  assert.equal(await verificarTokenConfirmacao(`${outroId}.${sig}`), null);
  assert.equal(await verificarTokenConfirmacao(`${idPart}.${sig.slice(0, -2)}AA`), null);
  assert.equal(await verificarTokenConfirmacao(idPart), null);
  assert.equal(await verificarTokenConfirmacao(""), null);
  assert.equal(await verificarTokenConfirmacao(undefined), null);
});

test("rejeita token assinado com outro segredo", async () => {
  const token = await criarTokenConfirmacao(ID);
  process.env.APPOINTMENT_CONFIRM_SECRET = "outro-segredo";
  try {
    assert.equal(await verificarTokenConfirmacao(token), null);
  } finally {
    process.env.APPOINTMENT_CONFIRM_SECRET = "segredo-de-teste";
  }
});

test("não gera token para ID inválido", async () => {
  await assert.rejects(() => criarTokenConfirmacao("nao-e-uuid"));
});

test("monta o link personalizado com o slug da clínica", async () => {
  const link = await montarLinkConfirmacao({ slug: "clinica-sol", agendamentoId: ID });
  assert.match(link, /^https:\/\/rmagenda\.test\/clinica-sol\/confirmar\/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
});

// Banco falso por tabela; registra se alguma consulta tentou usar join embutido
const fakeDb = (tabelas) => {
  const consultas = [];
  return {
    consultas,
    from: (tabela) => {
      const q = {
        select: (cols) => {
          consultas.push({ tabela, cols });
          if (String(cols).includes("(")) throw new Error("join embutido não suportado");
          return q;
        },
        eq: () => q,
        maybeSingle: async () => ({ data: tabelas[tabela] ?? null })
      };
      return q;
    }
  };
};

const bancoPadrao = () =>
  fakeDb({
    agendamentos: { id: ID, empresa_id: "emp", paciente_id: "pac-1" },
    pacientes: { telefone_whatsapp: "(84) 99422-9126" },
    empresas: { slug: "clinica-sol" }
  });

test("injeta {link_confirmacao} quando o destino é o telefone do próprio paciente (sem join embutido)", async () => {
  const db = bancoPadrao();
  const texto = await injetarLinkConfirmacaoSeguro("Confirme: {link_confirmacao}", {
    db, agendamentoId: ID, empresaId: "emp", slug: "clinica-sol", telefone: "5584994229126"
  });
  assert.match(texto, /^Confirme: https:\/\/rmagenda\.test\/clinica-sol\/confirmar\/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  assert.ok(db.consultas.every((c) => !String(c.cols).includes("(")));
});

test("busca o slug da clínica quando a fila não informa", async () => {
  const texto = await injetarLinkConfirmacaoSeguro("{link_confirmacao}", {
    db: bancoPadrao(), agendamentoId: ID, empresaId: "emp", telefone: "84994229126"
  });
  assert.match(texto, /\/clinica-sol\/confirmar\//);
});

test("telefone de terceiro recebe a página pública de consulta, nunca o link pessoal", async () => {
  const texto = await injetarLinkConfirmacaoSeguro("Confirme: {link_confirmacao}", {
    db: bancoPadrao(), agendamentoId: ID, empresaId: "emp", slug: "clinica-sol", telefone: "5511988887777"
  });
  assert.equal(texto, "Confirme: https://rmagenda.test/consultar");
});

test("mensagem nunca sai vazia nem com a variável crua, mesmo se o banco falhar", async () => {
  const dbQuebrado = { from: () => { throw new Error("falha de conexão"); } };
  for (const ctx of [{ db: dbQuebrado, agendamentoId: ID, empresaId: "emp", telefone: "84994229126" }, {}]) {
    const texto = await injetarLinkConfirmacaoSeguro("{link_confirmacao}", ctx);
    assert.ok(texto.trim().length > 0);
    assert.ok(!texto.includes("{link_confirmacao}"));
  }
});

test("mensagem sem placeholder não é alterada nem consulta o banco", async () => {
  const db = { from: () => { throw new Error("não deveria consultar"); } };
  assert.equal(await injetarLinkConfirmacaoSeguro("Olá!", { db, agendamentoId: ID }), "Olá!");
});

test("ocupação da agenda considera duração do serviço e bloqueios", () => {
  const servicos = [{ id: "s1", nome: "Dra. Ana", especialidade: "Cardiologia", duracao_minutos: 40, ativo: true }];
  const formData = { data_agendamento: "2026-11-10", tipo_servico: "Consulta", medico_profissional: "Dra. Ana", especialidade: "Cardiologia", subtipo_exame: "" };
  const ocupacao = calcularOcupacaoAgenda({
    ag: [{ id: "a1", horario_agendamento: "09:00:00", medico_profissional: "Dra. Ana", especialidade: "Cardiologia", tipo_servico: "Consulta" }],
    bl: [{ horario: "14:00", horario_fim: "15:00", medico_profissional: "Todos" }],
    formData,
    regrasGlobais: [],
    selectedSrv: resolverServicoSelecionado(formData, servicos),
    servicosDB: servicos,
    empresaDados: { config_campos: {} }
  });
  assert.equal(ocupacao.duracaoAtual, 40);
  assert.deepEqual(ocupacao.ocupados.sort(), ["09:00", "14:00"]);
  const consulta = ocupacao.occupiedIntervals.find((i) => i.hora === "09:00");
  assert.equal(consulta.endMin - consulta.startMin, 40);
  const bloqueio = ocupacao.occupiedIntervals.find((i) => i.hora === "14:00");
  assert.equal(bloqueio.endMin - bloqueio.startMin, 60);
  assert.equal(ocupacao.passoGrade, 15);
});

test("resolve o serviço por nome aproximado (sem Dr./Dra.)", () => {
  const servicos = [{ id: "s1", nome: "Dra. Ana Souza", ativo: true }];
  assert.equal(resolverServicoSelecionado({ medico_profissional: "Ana Souza" }, servicos)?.id, "s1");
  assert.equal(resolverServicoSelecionado({}, servicos), null);
});

test("sem domínio configurado não usa domínio fixo: remove a variável e mantém o texto", async () => {
  const anterior = process.env.NEXT_PUBLIC_APP_URL;
  delete process.env.NEXT_PUBLIC_APP_URL;
  try {
    const texto = await injetarLinkConfirmacaoSeguro("Olá, Lucas!\nConfirme por aqui: {link_confirmacao}\nAté logo", {
      db: bancoPadrao(), agendamentoId: ID, empresaId: "emp", slug: "clinica-sol", telefone: "84994229126"
    });
    assert.equal(texto, "Olá, Lucas!\nConfirme por aqui:\nAté logo");
    assert.ok(!texto.includes("rmagenda.com.br"));
  } finally {
    process.env.NEXT_PUBLIC_APP_URL = anterior;
  }
});

test("NEXT_PUBLIC_APP_URL sem protocolo ou com barra final é normalizada", async () => {
  const anterior = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = "agenda.minhaclinica.com.br/";
  try {
    assert.match(await montarLinkConfirmacao({ slug: "s", agendamentoId: ID }), /^https:\/\/agenda\.minhaclinica\.com\.br\/s\/confirmar\//);
  } finally {
    process.env.NEXT_PUBLIC_APP_URL = anterior;
  }
});
