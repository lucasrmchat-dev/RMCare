import { createClient } from "@supabase/supabase-js";
import { HttpsProxyAgent } from "https-proxy-agent";
import axios from "axios";
import { MEDICALSYS_PROXY_URL } from "./medicalsysProxy.js";

/**
 * Propaga para o MedicalSYS as alterações feitas no RMCare em agendamentos que foram enviados
 * ao ERP (têm medicalsys_id), conforme a documentação da API de integração:
 *   PUT    /integracoes/agenda/{id}/  → atualizar data/horário (formData)
 *   DELETE /integracoes/agenda/{id}/  → excluir agendamento gerado pelo parceiro integrador
 * Nunca lança erro: a alteração local já foi feita; o resultado volta para log/auditoria.
 */

const BASE = "https://gateway.medicalsys.com.br:9000/integracoes";
const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const somarMinutos = (hhmm, minutos) => {
  const [h, m] = String(hhmm).slice(0, 5).split(":").map(Number);
  const total = h * 60 + m + minutos;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

async function contexto(agendamentoId) {
  const supabase = db();
  const { data: ag } = await supabase
    .from("agendamentos")
    .select("id, empresa_id, medicalsys_id, data_agendamento, horario_agendamento, resposta_medicalsys")
    .eq("id", agendamentoId)
    .maybeSingle();
  if (!ag?.medicalsys_id) return { pular: "agendamento não foi enviado ao MedicalSYS" };

  const { data: emp } = await supabase.from("empresas").select("config_chaves").eq("id", ag.empresa_id).maybeSingle();
  const chaves = emp?.config_chaves || {};
  const apiKey = chaves.medicalsys_apikey;
  const customerApiKey = chaves.medicalsys_customer_apikey || chaves.medicalsys_costumer_apikey;
  if (!chaves.medicalsys_enabled || !apiKey || !customerApiKey) return { pular: "integração MedicalSYS desativada" };

  return {
    supabase,
    ag,
    config: {
      httpsAgent: new HttpsProxyAgent(MEDICALSYS_PROXY_URL),
      proxy: false,
      headers: { apikey: apiKey, "msys-costumer-apikey": customerApiKey, "User-Agent": "RMCare-Platform/1.0" },
      timeout: 15000
    }
  };
}

async function registrar(supabase, ag, acao, resultado) {
  try {
    await supabase
      .from("agendamentos")
      .update({ resposta_medicalsys: { ...(ag.resposta_medicalsys || {}), ultima_sincronizacao: { acao, ...resultado, em: new Date().toISOString() } } })
      .eq("id", ag.id);
  } catch {}
}

export async function remarcarNoMedicalsys({ agendamentoId, data, horario, duracaoMinutos }) {
  try {
    const ctx = await contexto(agendamentoId);
    if (ctx.pular) return { success: true, ignorado: ctx.pular };
    const { supabase, ag, config } = ctx;

    // Mantém a duração original do agendamento no ERP quando conhecida
    let duracao = Number(duracaoMinutos) || 0;
    if (!duracao) {
      try {
        const atual = await axios.get(`${BASE}/agenda/${ag.medicalsys_id}/`, config);
        const [hi, mi] = String(atual.data?.horario_inicio || "").split(":").map(Number);
        const [hf, mf] = String(atual.data?.horario_fim || "").split(":").map(Number);
        const diff = hf * 60 + mf - (hi * 60 + mi);
        if (diff > 0) duracao = diff;
      } catch {}
    }
    const inicio = String(horario).slice(0, 5);
    const form = new URLSearchParams({ momento: data, horario_inicio: inicio, horario_fim: somarMinutos(inicio, duracao || 15) });

    await axios.put(`${BASE}/agenda/${ag.medicalsys_id}/`, form.toString(), {
      ...config,
      headers: { ...config.headers, "Content-Type": "application/x-www-form-urlencoded" }
    });
    await registrar(supabase, ag, "remarcar", { success: true, data, horario: inicio });
    return { success: true };
  } catch (error) {
    const detalhe = error?.response?.data || error.message;
    console.error("[MedicalSYS] Falha ao remarcar no ERP:", detalhe);
    try {
      const ctx = await contexto(agendamentoId);
      if (!ctx.pular) await registrar(ctx.supabase, ctx.ag, "remarcar", { success: false, erro: detalhe });
    } catch {}
    return { success: false, error: typeof detalhe === "string" ? detalhe : JSON.stringify(detalhe) };
  }
}

export async function cancelarNoMedicalsys({ agendamentoId }) {
  try {
    const ctx = await contexto(agendamentoId);
    if (ctx.pular) return { success: true, ignorado: ctx.pular };
    const { supabase, ag, config } = ctx;
    await axios.delete(`${BASE}/agenda/${ag.medicalsys_id}/`, config);
    await registrar(supabase, ag, "cancelar", { success: true });
    return { success: true };
  } catch (error) {
    const detalhe = error?.response?.data || error.message;
    console.error("[MedicalSYS] Falha ao cancelar no ERP:", detalhe);
    try {
      const ctx = await contexto(agendamentoId);
      if (!ctx.pular) await registrar(ctx.supabase, ctx.ag, "cancelar", { success: false, erro: detalhe });
    } catch {}
    return { success: false, error: typeof detalhe === "string" ? detalhe : JSON.stringify(detalhe) };
  }
}
