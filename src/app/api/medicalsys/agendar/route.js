import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { HttpsProxyAgent } from "https-proxy-agent";
import axios from "axios";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      appointmentId,
      empresaId,
      nomePaciente,
      telefoneCelular,
      data,
      horarioInicio,
      horarioFim,
      medico,
      meioPagamento
    } = body;

    if (!empresaId) {
      return NextResponse.json({ success: false, error: "ID da empresa não informado." }, { status: 400 });
    }

    // 1. Buscar configurações de chaves da empresa
    const { data: empresa, error: errEmpresa } = await supabase
      .from("empresas")
      .select("id, config_chaves")
      .eq("id", empresaId)
      .maybeSingle();

    if (errEmpresa || !empresa) {
      return NextResponse.json({ success: false, error: "Empresa não encontrada." }, { status: 404 });
    }

    const config = empresa.config_chaves || {};
    const enabled = Boolean(config.medicalsys_enabled);

    // TRAVA DE SEGURANÇA: Se desabilitado, não envia ao Medicalsys real para não afetar testes
    if (!enabled) {
      console.log(`[Medicalsys] Envio desabilitado nas configurações da empresa (${empresaId}). Atendimento não enviado ao ERP.`);
      return NextResponse.json({
        success: true,
        enabled: false,
        message: "Envio ao Medicalsys desabilitado nas configurações da clínica (modo de teste)."
      });
    }

    // 2. Agente Proxy Fixie
    const proxyUrl = process.env.FIXIE_URL || "http://fixie:1c54Fc5I1jgmHG2@criterium.usefixie.com:80";
    const proxyAgent = new HttpsProxyAgent(proxyUrl);

    // 3. Montar Form Data conforme documentação da API Medicalsys
    const apiKey = config.medicalsys_apikey || "8FxD2eUsODMO8IZWMHZaNpt78av9Vy6k";
    const customerApiKey = config.medicalsys_customer_apikey || "SqdACjyxnXuYqL8ilnwTvXHroEOvFHFR";
    const clinicaId = config.medicalsys_id_clinica || "9";
    const medicoId = config.medicalsys_id_medico || medico || "1";

    const calcHorarioFim = (inicio) => {
      if (!inicio) return "00:30";
      const [h, m] = inicio.split(":").map(Number);
      const endM = (m + 15) % 60;
      const endH = h + Math.floor((m + 15) / 60);
      return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
    };

    const formData = new URLSearchParams();
    formData.append("paciente_provisorio", nomePaciente || "Paciente Online");
    formData.append("momento", data);
    formData.append("horario_inicio", horarioInicio);
    formData.append("horario_fim", horarioFim || calcHorarioFim(horarioInicio));
    formData.append("meio_de_pagamento", meioPagamento || "espe");
    formData.append("tel_celular", (telefoneCelular || "").replace(/\D/g, ""));
    formData.append("id_clinica", String(clinicaId));
    formData.append("medico", String(medicoId));

    console.log(`[Medicalsys] Enviando agendamento para Medicalsys: ${data} ${horarioInicio} - ${nomePaciente}`);

    const response = await axios.post("https://gateway.medicalsys.com.br:9000/integracoes/agenda/", formData.toString(), {
      httpsAgent: proxyAgent,
      proxy: false,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "apikey": apiKey,
        "msys-costumer-apikey": customerApiKey
      }
    });

    const resultData = response.data;

    // 4. Salvar ID do Medicalsys no agendamento local no Supabase
    if (appointmentId && resultData?.id) {
      await supabase
        .from("agendamentos")
        .update({
          medicalsys_id: resultData.id,
          enviado_medicalsys: true,
          resposta_medicalsys: resultData
        })
        .eq("id", appointmentId);
    }

    return NextResponse.json({
      success: true,
      enabled: true,
      medicalsysId: resultData?.id || null,
      data: resultData,
      message: "Agendamento incluído no Medicalsys com sucesso!"
    });
  } catch (error) {
    console.error("[Medicalsys] Erro ao enviar agendamento:", error?.response?.data || error.message);
    const detalhes = error.response?.data?.message || error?.response?.data || error.message;
    return NextResponse.json({ success: false, enabled: true, error: detalhes }, { status: 500 });
  }
}
