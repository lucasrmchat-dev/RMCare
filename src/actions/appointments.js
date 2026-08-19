"use server";

import { createClient } from "@supabase/supabase-js";
import { createAppointmentAccess, verifyAppointmentAccess } from "@/lib/appointmentAccess";
import { dispararGatilhoServidor } from "@/lib/serverDisparo";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const onlyDigits = (value = "") => value.replace(/\D/g, "");
const maskCpf = (cpf) => cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

export async function consultarAgendamentosPaciente({ cpf, dataNascimento }) {
  const cleanCpf = onlyDigits(cpf);
  if (cleanCpf.length !== 11 || !dataNascimento) return { success: false, error: "Informe CPF e data de nascimento." };
  const { data: patient } = await db.from("pacientes").select("id,nome_completo,data_nascimento").or(`cpf.eq.${cleanCpf},cpf.eq.${maskCpf(cleanCpf)}`).maybeSingle();
  if (!patient || patient.data_nascimento !== dataNascimento) return { success: false, error: "Dados não encontrados ou data de nascimento divergente." };
  const { data: appointments, error } = await db.from("agendamentos").select("*").eq("paciente_id", patient.id).order("data_agendamento", { ascending: false });
  if (error) return { success: false, error: error.message };
  const companyIds = [...new Set((appointments || []).map((item) => item.empresa_id).filter(Boolean))];
  const { data: companies } = companyIds.length ? await db.from("empresas").select("id,nome,slug").in("id", companyIds) : { data: [] };
  const byId = Object.fromEntries((companies || []).map((company) => [company.id, company]));
  return { success: true, patient: patient.nome_completo, token: await createAppointmentAccess(patient.id), appointments: (appointments || []).map((item) => ({ ...item, empresa: byId[item.empresa_id] || null })) };
}

async function authorizeAppointment(id, token) {
  const access = await verifyAppointmentAccess(token);
  if (!access) throw new Error("Acesso expirado. Consulte seus agendamentos novamente.");
  const { data } = await db.from("agendamentos").select("*, pacientes(nome_completo,cpf,data_nascimento,telefone_whatsapp)").eq("id", id).eq("paciente_id", access.sub).maybeSingle();
  if (!data) throw new Error("Agendamento não encontrado.");
  return { appointment: data, patientId: access.sub };
}

export async function cancelarAgendamentoPaciente({ id, token, motivo }) {
  try {
    const { appointment, patientId } = await authorizeAppointment(id, token);
    const { data, error } = await db.rpc("cancelar_agendamento", { p_agendamento_id: id, p_empresa_id: appointment.empresa_id, p_paciente_id: patientId, p_cancelado_por: "paciente", p_motivo: motivo || null });
    if (error) throw error;

    try {
      await dispararGatilhoServidor({
        agendamentoId: id,
        empresaId: appointment.empresa_id,
        gatilho: "cancelado",
        motivo: motivo || "Cancelado pelo paciente"
      });
    } catch (errPush) {
      console.error("Aviso ao disparar WhatsApp de cancelamento:", errPush);
    }

    return data ? { success: true } : { success: false, error: "O agendamento já foi cancelado." };
  } catch (error) { return { success: false, error: error.message }; }
}

export async function excluirAgendamentoPaciente({ id, token }) {
  try {
    const { appointment, patientId } = await authorizeAppointment(id, token);
    const { data, error } = await db.rpc("excluir_agendamento", { p_agendamento_id: id, p_empresa_id: appointment.empresa_id, p_paciente_id: patientId });
    if (error) throw error;
    return data ? { success: true } : { success: false, error: "Não foi possível excluir o agendamento." };
  } catch (error) { return { success: false, error: error.message }; }
}

export async function getAppointmentForReschedule({ id, token }) {
  try { const { appointment } = await authorizeAppointment(id, token); return { success: true, appointment }; }
  catch (error) { return { success: false, error: error.message }; }
}

export async function remarcarAgendamentoPaciente({ id, token, data, horario }) {
  try {
    const { appointment, patientId } = await authorizeAppointment(id, token);

    // Verificação de conflito de horário (Anti-Double-Booking)
    const { data: conflitos } = await db
      .from("agendamentos")
      .select("id, medico_profissional, subtipo_exame")
      .eq("empresa_id", appointment.empresa_id)
      .eq("data_agendamento", data)
      .eq("horario_agendamento", horario)
      .neq("id", id)
      .neq("status_atendimento", "cancelado");

    const profAlvo = (appointment.medico_profissional || appointment.subtipo_exame || "").trim().toLowerCase();
    const temConflitoMesmoProf = (conflitos || []).some((c) => {
      const cProf = (c.medico_profissional || c.subtipo_exame || "").trim().toLowerCase();
      return cProf === profAlvo || cProf.includes(profAlvo) || profAlvo.includes(cProf);
    });

    const { data: bloqueios } = await db
      .from("bloqueios_horarios")
      .select("id, medico_profissional")
      .eq("empresa_id", appointment.empresa_id)
      .eq("data", data)
      .eq("horario", horario);

    const temBloqueio = (bloqueios || []).some((b) => {
      if (!b.medico_profissional || b.medico_profissional === "Todos") return true;
      const bProf = b.medico_profissional.trim().toLowerCase();
      return bProf === profAlvo || bProf.includes(profAlvo) || profAlvo.includes(bProf);
    });

    if (temConflitoMesmoProf || temBloqueio) {
      return { success: false, error: "Este horário já está ocupado ou bloqueado para este profissional." };
    }

    const { data: updated, error } = await db.rpc("remarcar_agendamento", { p_agendamento_id: id, p_empresa_id: appointment.empresa_id, p_paciente_id: patientId, p_nova_data: data, p_novo_horario: horario });
    if (error) throw error;

    try {
      await dispararGatilhoServidor({
        agendamentoId: id,
        empresaId: appointment.empresa_id,
        gatilho: "remarcado",
        novaData: data,
        novoHorario: horario
      });
    } catch (errPush) {
      console.error("Aviso ao disparar WhatsApp de remarcação:", errPush);
    }

    return updated ? { success: true, appointmentId: id } : { success: false, error: "Não foi possível remarcar." };
  } catch (error) { return { success: false, error: error.message }; }
}
