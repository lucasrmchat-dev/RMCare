import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const parseTemplate = (tpl, data) => {
  if (!tpl) return "";
  return tpl.replace(/{(\w+)}/g, (_, k) => (data[k] !== undefined ? data[k] : `{${k}}`));
};

export async function dispararGatilhoServidor({
  agendamentoId,
  empresaId,
  gatilho,
  novaData = null,
  novoHorario = null,
  motivo = null
}) {
  try {
    if (!agendamentoId || !empresaId || !gatilho) return false;

    // 1. Buscar agendamento e paciente
    const { data: ag, error: errAg } = await supabaseAdmin
      .from("agendamentos")
      .select("*, pacientes(*)")
      .eq("id", agendamentoId)
      .maybeSingle();

    if (errAg || !ag) return false;

    // 2. Buscar dados da empresa
    const { data: emp, error: errEmp } = await supabaseAdmin
      .from("empresas")
      .select("*")
      .eq("id", empresaId)
      .maybeSingle();

    if (errEmp || !emp) return false;

    const regras = emp.config_mensagens || [];
    const regrasDoGatilho = regras.filter((r) => r.gatilho === gatilho);
    if (regrasDoGatilho.length === 0) return false;

    const paciente = ag.pacientes || {};
    const tel = paciente.telefone_whatsapp || "";
    if (!tel) return false;

    const nomeCompleto = (paciente.nome_completo || "").trim();
    const primeiroNome = nomeCompleto.split(" ")[0] || "Paciente";

    const dataFinal = novaData || ag.data_agendamento;
    const horaFinal = novoHorario || ag.horario_agendamento;
    const dataFormatada = dataFinal ? dataFinal.split("-").reverse().join("/") : "";

    const nomeProfissional = ag.medico_profissional || ag.subtipo_exame || "Especialista";
    const nomeEspecialidade = ag.subtipo_exame || ag.tipo_servico || "Consulta";
    const isExame = ag.tipo_servico === "Exame" || /(colonoscopia|endoscopia|ultrassom|exame)/i.test(`${nomeEspecialidade} ${nomeProfissional}`);

    const vars = {
      nome: primeiroNome,
      nome_completo: nomeCompleto,
      servico: isExame ? nomeEspecialidade : nomeProfissional,
      especialista: nomeProfissional,
      medico: nomeProfissional,
      profissional: nomeProfissional,
      especialidade: nomeEspecialidade,
      subtipo_exame: isExame ? nomeEspecialidade : "",
      categoria: isExame ? "Exames" : "Consultas",
      tipo_servico: isExame ? "Exame" : "Consulta",
      data: dataFormatada,
      hora: horaFinal || "",
      motivo: motivo || "Solicitação realizada"
    };

    const webhookUrl =
      emp.rmchat_webhook_url ||
      emp.config_chaves?.rmchat_webhook_url ||
      emp.config_chaves?.url_rmchat ||
      emp.config_chaves?.webhook_url ||
      emp.config_campos?.rmchat_webhook_url;

    for (const regra of regrasDoGatilho) {
      const msgFormatada = parseTemplate(regra.mensagem, vars);
      let enviadoComSucesso = false;

      if (webhookUrl && webhookUrl.startsWith("http")) {
        try {
          const payload = {
            name: primeiroNome,
            number: tel.replace(/\D/g, ""),
            texto: msgFormatada,
            mensagem: msgFormatada,
            phone: tel.replace(/\D/g, "")
          };

          const res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });

          enviadoComSucesso = res.ok;
        } catch (fetchErr) {
          console.error("Erro ao enviar webhook no servidor:", fetchErr);
        }
      }

      // Registra na fila_mensagens para auditoria
      try {
        await supabaseAdmin.from("fila_mensagens").insert({
          empresa_id: empresaId,
          agendamento_id: agendamentoId,
          telefone_whatsapp: tel,
          nome_paciente: primeiroNome,
          mensagem: msgFormatada,
          status: enviadoComSucesso ? "enviado" : "pendente",
          gatilho: gatilho,
          data_hora_programada: new Date().toISOString()
        });
      } catch (logErr) {
        console.warn("Aviso ao salvar log na fila_mensagens:", logErr);
      }
    }

    return true;
  } catch (err) {
    console.error("Erro em dispararGatilhoServidor:", err);
    return false;
  }
}
