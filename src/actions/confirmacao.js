"use server";

import { cancelarNoMedicalsys, remarcarNoMedicalsys } from "@/lib/medicalsysSync";
import { createClient } from "@supabase/supabase-js";
import { verificarTokenConfirmacao } from "@/lib/confirmationLink";
import { calcularOcupacaoAgenda, resolverServicoSelecionado } from "@/lib/agendaOcupacao";
import { dispararGatilhoServidor } from "@/lib/serverDisparo";
import { dispararWebhookOutboundEmpresa } from "@/lib/webhookDispatcher";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const ESTADOS_FINAIS = ["cancelado", "concluido", "compareceu", "nao_compareceu", "realizado"];

// Campos de configuração pública necessários para a agenda (nunca expor config_chaves)
const pickConfigCampos = (conf = {}) => ({
  especialidades_categorizadas: conf.especialidades_categorizadas || [],
  passo_grade_liberacao_minutos: conf.passo_grade_liberacao_minutos ?? null,
  intervalo_exames_padrao_minutos: conf.intervalo_exames_padrao_minutos ?? null,
  endereco: conf.endereco || conf.endereco_clinica || null,
  whatsapp_atendimento: conf.whatsapp_atendimento || null
});

/** Horário do atendimento como instante absoluto (agenda opera em horário de Brasília). */
const instanteAtendimento = (data, horario) =>
  new Date(`${data}T${String(horario || "00:00").slice(0, 5)}:00-03:00`).getTime();

const dataHojeBrasilia = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

async function carregarAgendamentoPorToken(token) {
  const agendamentoId = await verificarTokenConfirmacao(token);
  if (!agendamentoId) return { erro: "invalido" };

  const { data: ag } = await db
    .from("agendamentos")
    .select("*, pacientes(nome_completo)")
    .eq("id", agendamentoId)
    .maybeSingle();
  if (!ag || !ag.empresa_id) return { erro: "invalido" };

  const { data: empresa } = await db
    .from("empresas")
    .select("*")
    .eq("id", ag.empresa_id)
    .maybeSingle();
  if (!empresa) return { erro: "invalido" };

  return { ag, empresa };
}

function situacaoDoAgendamento(ag, empresa) {
  if (ag.status_atendimento === "cancelado") return "cancelado";
  if (ESTADOS_FINAIS.includes(ag.status_atendimento)) return "encerrado";
  const antecedenciaHoras = Number(empresa?.config_regras?.antecedencia_minima_alteracao_horas || 0);
  const inicio = instanteAtendimento(ag.data_agendamento, ag.horario_agendamento);
  if (Number.isFinite(inicio) && inicio <= Date.now()) return "expirado";
  if (antecedenciaHoras > 0 && inicio - Date.now() < antecedenciaHoras * 3600000) return "bloqueado_alteracao";
  return "ativo";
}

function serializar(ag, empresa) {
  const nome = (ag.pacientes?.nome_completo || ag.nome_paciente || "").trim();
  const conf = empresa.config_campos || {};
  return {
    agendamento: {
      data: ag.data_agendamento,
      horario: String(ag.horario_agendamento || "").slice(0, 5),
      tipoServico: ag.tipo_servico || "Consulta",
      subtipoExame: ag.subtipo_exame || "",
      medicoProfissional: ag.medico_profissional || "",
      especialidade: ag.especialidade || "",
      modalidade: ag.modalidade || "",
      status: ag.status_atendimento || "agendado",
      confirmadoEm: ag.confirmado_em || null,
      remarcadoEm: ag.remarcado_em || null,
      canceladoEm: ag.cancelado_em || null,
      situacao: situacaoDoAgendamento(ag, empresa)
    },
    // LGPD: apenas o primeiro nome do paciente chega ao navegador
    paciente: { primeiroNome: nome.split(" ")[0] || "" },
    empresa: {
      id: empresa.id,
      nome: empresa.nome,
      slug: empresa.slug,
      logoUrl: empresa.logo_url || conf.logo_url || null,
      whatsapp: empresa.whatsapp_atendimento || conf.whatsapp_atendimento || null,
      config_campos: pickConfigCampos(conf)
    }
  };
}

/** Carrega os dados da tela pública de confirmação. Registra a primeira abertura do link. */
export async function carregarConfirmacao(token) {
  try {
    const { ag, empresa, erro } = await carregarAgendamentoPorToken(token);
    if (erro) return { success: false, error: "Este link de confirmação é inválido ou foi substituído." };

    if (!ag.confirmacao_aberta_em) {
      db.from("agendamentos")
        .update({ confirmacao_aberta_em: new Date().toISOString() })
        .eq("id", ag.id)
        .eq("empresa_id", ag.empresa_id)
        .then(() => {}, () => {});
    }

    return { success: true, ...serializar(ag, empresa) };
  } catch (error) {
    console.error("Erro ao carregar confirmação:", error);
    return { success: false, error: "Não foi possível carregar seu agendamento agora. Tente novamente em instantes." };
  }
}

/** Serviços e regras de agenda da clínica (dados públicos de grade) para o calendário de remarcação. */
export async function carregarAgendaRemarcacao(token) {
  try {
    const { ag, empresa, erro } = await carregarAgendamentoPorToken(token);
    if (erro) return { success: false, error: "Link inválido." };
    if (situacaoDoAgendamento(ag, empresa) !== "ativo") return { success: false, error: "Este agendamento não pode mais ser remarcado pelo link." };

    const [{ data: servicos }, { data: regras }] = await Promise.all([
      db.from("servicos").select("*").eq("empresa_id", empresa.id).eq("ativo", true),
      db.from("regras_agenda").select("*").eq("empresa_id", empresa.id).eq("ativo", true)
    ]);
    return { success: true, servicos: servicos || [], regras: regras || [] };
  } catch (error) {
    console.error("Erro ao carregar agenda de remarcação:", error);
    return { success: false, error: "Não foi possível carregar a agenda." };
  }
}

async function calcularOcupacaoDoDia({ ag, empresa, data }) {
  const [{ data: agsDia }, { data: bloqueios }, { data: servicos }, { data: regras }] = await Promise.all([
    db
      .from("agendamentos")
      .select("id, horario_agendamento, medico_profissional, subtipo_exame, status_atendimento, tipo_servico, especialidade")
      .eq("empresa_id", empresa.id)
      .eq("data_agendamento", data)
      .neq("status_atendimento", "cancelado")
      .neq("id", ag.id),
    db.from("bloqueios_horarios").select("horario, horario_fim, medico_profissional, especialidade, situacao").eq("empresa_id", empresa.id).eq("data", data),
    db.from("servicos").select("*").eq("empresa_id", empresa.id).eq("ativo", true),
    db.from("regras_agenda").select("*").eq("empresa_id", empresa.id).eq("ativo", true)
  ]);

  const formData = {
    data_agendamento: data,
    tipo_servico: ag.tipo_servico,
    subtipo_exame: ag.subtipo_exame || "",
    medico_profissional: ag.medico_profissional || "",
    especialidade: ag.especialidade || "",
    modalidade: ag.modalidade || ""
  };

  return calcularOcupacaoAgenda({
    ag: agsDia || [],
    bl: bloqueios || [],
    formData,
    regrasGlobais: regras || [],
    selectedSrv: resolverServicoSelecionado(formData, servicos || []),
    servicosDB: servicos || [],
    empresaDados: { config_campos: empresa.config_campos || {} }
  });
}

/** Ocupação de um dia calculada no servidor — o navegador nunca recebe dados de outros pacientes. */
export async function buscarOcupacaoDia({ token, data }) {
  try {
    if (!DATE_RE.test(String(data || ""))) return { success: false, error: "Data inválida." };
    const { ag, empresa, erro } = await carregarAgendamentoPorToken(token);
    if (erro) return { success: false, error: "Link inválido." };
    const ocupacao = await calcularOcupacaoDoDia({ ag, empresa, data });
    return { success: true, ocupacao };
  } catch (error) {
    console.error("Erro ao buscar ocupação:", error);
    return { success: false, error: "Não foi possível consultar os horários." };
  }
}

export async function confirmarPresencaPorLink(token) {
  try {
    const { ag, empresa, erro } = await carregarAgendamentoPorToken(token);
    if (erro) return { success: false, error: "Link inválido." };

    const situacao = situacaoDoAgendamento(ag, empresa);
    if (situacao === "cancelado") return { success: false, error: "Este agendamento foi cancelado." };
    if (situacao === "expirado" || situacao === "encerrado") return { success: false, error: "O horário deste atendimento já passou." };
    if (ag.status_atendimento === "confirmado") return { success: true, jaConfirmado: true, confirmadoEm: ag.confirmado_em };

    const agora = new Date().toISOString();
    let { error } = await db
      .from("agendamentos")
      .update({ status_atendimento: "confirmado", confirmado_em: agora, confirmado_por: "paciente_link" })
      .eq("id", ag.id)
      .eq("empresa_id", empresa.id)
      .neq("status_atendimento", "cancelado");

    // Compatibilidade: bancos ainda sem as colunas da migração de confirmação
    if (error && (error.code === "42703" || error.message?.includes("column"))) {
      ({ error } = await db
        .from("agendamentos")
        .update({ status_atendimento: "confirmado" })
        .eq("id", ag.id)
        .eq("empresa_id", empresa.id)
        .neq("status_atendimento", "cancelado"));
    }
    if (error) throw error;

    dispararWebhookOutboundEmpresa({
      empresaId: empresa.id,
      evento: "agendamento.confirmado",
      dados: { origem: "link_confirmacao" },
      agendamentoId: ag.id
    }).catch((e) => console.warn("Aviso ao disparar webhook de confirmação:", e));

    return { success: true, confirmadoEm: agora };
  } catch (error) {
    console.error("Erro ao confirmar presença:", error);
    return { success: false, error: "Não foi possível confirmar agora. Tente novamente." };
  }
}

export async function cancelarPorLink({ token, motivo }) {
  try {
    const { ag, empresa, erro } = await carregarAgendamentoPorToken(token);
    if (erro) return { success: false, error: "Link inválido." };

    const situacao = situacaoDoAgendamento(ag, empresa);
    if (situacao === "cancelado") return { success: true, jaCancelado: true };
    if (situacao !== "ativo") return { success: false, error: "Este agendamento não pode mais ser cancelado pelo link. Fale com a clínica." };

    const motivoLimpo = String(motivo || "").trim().slice(0, 500);
    const { data, error } = await db.rpc("cancelar_agendamento", {
      p_agendamento_id: ag.id,
      p_empresa_id: empresa.id,
      p_paciente_id: null,
      p_cancelado_por: "paciente_link",
      p_motivo: motivoLimpo || "Cancelado pelo paciente via link de confirmação"
    });
    if (error) throw error;
    if (!data) return { success: false, error: "O agendamento já havia sido cancelado." };

    // Reflete o cancelamento no MedicalSYS (DELETE /agenda/{id}/) quando o agendamento foi enviado ao ERP
    await cancelarNoMedicalsys({ agendamentoId: ag.id });

    try {
      await dispararGatilhoServidor({
        agendamentoId: ag.id,
        empresaId: empresa.id,
        gatilho: "cancelado",
        motivo: motivoLimpo || "Cancelado pelo paciente"
      });
    } catch (errPush) {
      console.error("Aviso ao disparar WhatsApp de cancelamento:", errPush);
    }

    return { success: true };
  } catch (error) {
    console.error("Erro ao cancelar pelo link:", error);
    return { success: false, error: "Não foi possível cancelar agora. Tente novamente." };
  }
}

export async function remarcarPorLink({ token, data, horario }) {
  try {
    if (!DATE_RE.test(String(data || "")) || !TIME_RE.test(String(horario || ""))) {
      return { success: false, error: "Selecione uma data e um horário válidos." };
    }
    if (data < dataHojeBrasilia() || instanteAtendimento(data, horario) <= Date.now()) {
      return { success: false, error: "Escolha um horário futuro." };
    }

    const { ag, empresa, erro } = await carregarAgendamentoPorToken(token);
    if (erro) return { success: false, error: "Link inválido." };
    if (situacaoDoAgendamento(ag, empresa) !== "ativo") {
      return { success: false, error: "Este agendamento não pode mais ser remarcado pelo link. Fale com a clínica." };
    }

    // Validação de colisão no servidor com a mesma regra de duração/intervalo usada na grade
    const ocupacao = await calcularOcupacaoDoDia({ ag, empresa, data });
    const [h, m] = horario.split(":").map(Number);
    const inicio = h * 60 + m;
    const fim = inicio + (Number(ocupacao.duracaoAtual) || 30) + (Number(ocupacao.intervaloAtual) || 0);
    const colide = (ocupacao.occupiedIntervals || []).some((iv) => Math.max(inicio, iv.startMin) < Math.min(fim, iv.endMin));
    if (colide) return { success: false, error: "Este horário acabou de ser ocupado. Escolha outro, por favor." };

    const { data: atualizado, error } = await db.rpc("remarcar_agendamento", {
      p_agendamento_id: ag.id,
      p_empresa_id: empresa.id,
      p_paciente_id: null,
      p_nova_data: data,
      p_novo_horario: horario
    });
    if (error) {
      if (error.code === "P0001") return { success: false, error: "Este horário acabou de ser ocupado. Escolha outro, por favor." };
      throw error;
    }
    if (!atualizado) return { success: false, error: "Não foi possível remarcar este agendamento." };

    // O paciente escolheu ativamente o novo horário: já conta como presença confirmada
    const agora = new Date().toISOString();
    const { error: errConf } = await db
      .from("agendamentos")
      .update({ status_atendimento: "confirmado", confirmado_em: agora, confirmado_por: "paciente_link_remarcacao" })
      .eq("id", ag.id)
      .eq("empresa_id", empresa.id);
    if (errConf) {
      await db.from("agendamentos").update({ status_atendimento: "confirmado" }).eq("id", ag.id).eq("empresa_id", empresa.id);
    }

    // Reflete a nova data/horário no MedicalSYS (PUT /agenda/{id}/) quando o agendamento foi enviado ao ERP
    await remarcarNoMedicalsys({ agendamentoId: ag.id, data: data, horario: horario });

    try {
      await dispararGatilhoServidor({
        agendamentoId: ag.id,
        empresaId: empresa.id,
        gatilho: "remarcado",
        novaData: data,
        novoHorario: horario
      });
    } catch (errPush) {
      console.error("Aviso ao disparar WhatsApp de remarcação:", errPush);
    }

    return { success: true, data, horario, confirmadoEm: agora };
  } catch (error) {
    console.error("Erro ao remarcar pelo link:", error);
    return { success: false, error: "Não foi possível remarcar agora. Tente novamente." };
  }
}
