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

    // 1. Buscar configurações da empresa (config_chaves e config_campos)
    const { data: empresa, error: errEmpresa } = await supabase
      .from("empresas")
      .select("id, nome, config_chaves, config_campos")
      .eq("id", empresaId)
      .maybeSingle();

    if (errEmpresa || !empresa) {
      return NextResponse.json({ success: false, error: "Empresa não encontrada no banco." }, { status: 404 });
    }

    const configChaves = empresa.config_chaves || {};
    const configCampos = empresa.config_campos || {};

    // Verifica se a sincronização está ativada (aceita ambas as propriedades para redundância total)
    const isEnabled = Boolean(
      configCampos.enviar_agendamentos_medicalsys ??
      configCampos.medicalsys_enabled ??
      configChaves.medicalsys_enabled
    );

    // TRAVA DE SEGURANÇA: Se desabilitado, não envia ao Medicalsys e mantém apenas no RMCare
    if (!isEnabled) {
      console.log(`[Medicalsys] Sincronização desabilitada para a empresa "${empresa.nome || empresaId}". Agendamento mantido apenas na RMCare.`);
      return NextResponse.json({
        success: true,
        enabled: false,
        message: "Sincronização com o Medicalsys desabilitada nas configurações da clínica."
      });
    }

    // 2. Normalização rigorosa dos parâmetros conforme documentação do Swagger Medicalsys (POST /agenda/)
    
    // A. Formato da data: AAAA-MM-DD
    let momento = String(data || "").trim();
    if (momento.includes("/")) {
      const [d, m, y] = momento.split("/");
      momento = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    // B. Horário de início e fim: HH:MM
    const cleanHorarioInicio = String(horarioInicio || "08:00").trim().slice(0, 5);
    const calcHorarioFim = (inicio, minutos = 15) => {
      if (!inicio) return "08:15";
      const [h, m] = inicio.split(":").map(Number);
      const total = h * 60 + m + minutos;
      const endH = Math.floor(total / 60) % 24;
      const endM = total % 60;
      return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
    };
    const cleanHorarioFim = String(horarioFim || calcHorarioFim(cleanHorarioInicio)).trim().slice(0, 5);

    // C. Telefone do paciente: apenas dígitos com DDD (padrão Brasil)
    let cleanFone = String(telefoneCelular || "").replace(/\D/g, "");
    if (cleanFone.startsWith("55") && (cleanFone.length === 12 || cleanFone.length === 13)) {
      cleanFone = cleanFone.slice(2);
    }
    if (!cleanFone) cleanFone = "83999999999";

    // D. Meio de pagamento: 'espe', 'conv', 'cart', 'debi'
    let cleanPagamento = "espe";
    const meioLower = String(meioPagamento || "").toLowerCase().trim();
    if (meioLower === "conv" || meioLower.includes("convênio") || meioLower.includes("convenio")) {
      cleanPagamento = "conv";
    } else if (meioLower === "cart" || meioLower.includes("cartão") || meioLower.includes("cartao") || meioLower.includes("crédito")) {
      cleanPagamento = "cart";
    } else if (meioLower === "debi" || meioLower.includes("débito") || meioLower.includes("debito")) {
      cleanPagamento = "debi";
    } else {
      cleanPagamento = "espe";
    }

    // E. Resolução inteligente do ID do Médico (Medicalsys exige um ID inteiro de médico)
    let resolvedMedicoId = configChaves.medicalsys_id_medico || "1";
    if (medico && /^\d+$/.test(String(medico).trim())) {
      resolvedMedicoId = String(medico).trim();
    } else if (medico) {
      const cleanMedicoNome = String(medico).trim();

      // Busca por serviço cadastrado para capturar codigo_uri ou numero_especialista
      const { data: srvMatch } = await supabase
        .from("servicos")
        .select("codigo_uri, numero_especialista")
        .eq("empresa_id", empresaId)
        .ilike("nome", `%${cleanMedicoNome}%`)
        .maybeSingle();

      if (srvMatch?.numero_especialista && /^\d+$/.test(String(srvMatch.numero_especialista))) {
        resolvedMedicoId = String(srvMatch.numero_especialista);
      } else if (srvMatch?.codigo_uri && /^\d+$/.test(String(srvMatch.codigo_uri))) {
        resolvedMedicoId = String(srvMatch.codigo_uri);
      } else {
        // Busca nos bloqueios importados da clínica para pegar o ID real do médico retornado pelo Medicalsys
        const { data: bMatch } = await supabase
          .from("bloqueios_horarios")
          .select("raw_payload_completo")
          .eq("empresa_id", empresaId)
          .ilike("medico_profissional", `%${cleanMedicoNome}%`)
          .not("raw_payload_completo", "is", null)
          .limit(1)
          .maybeSingle();

        const rawMed = bMatch?.raw_payload_completo?.medico;
        const rawMedId = rawMed?.id || (Array.isArray(rawMed) ? rawMed[0]?.id : null);
        if (rawMedId && /^\d+$/.test(String(rawMedId))) {
          resolvedMedicoId = String(rawMedId);
        }
      }
    }

    const clinicaId = configChaves.medicalsys_id_clinica || "9";
    const apiKey = configChaves.medicalsys_apikey || "8FxD2eUsODMO8IZWMHZaNpt78av9Vy6k";
    const customerApiKey = configChaves.medicalsys_customer_apikey || configChaves.medicalsys_costumer_apikey || "SqdACjyxnXuYqL8ilnwTvXHroEOvFHFR";

    // 3. Montar Form Data conforme especificação Swagger
    const formData = new URLSearchParams();
    formData.append("paciente_provisorio", (nomePaciente || "Paciente Online").trim());
    formData.append("momento", momento);
    formData.append("horario_inicio", cleanHorarioInicio);
    formData.append("horario_fim", cleanHorarioFim);
    formData.append("meio_de_pagamento", cleanPagamento);
    formData.append("tel_celular", cleanFone);
    formData.append("id_clinica", String(clinicaId));
    formData.append("medico", String(resolvedMedicoId));

    console.log(`[Medicalsys] Disparando POST /agenda/ para ${momento} às ${cleanHorarioInicio} | Paciente: ${nomePaciente} | Médico ID: ${resolvedMedicoId} | Clínica ID: ${clinicaId}`);

    // 4. Proxy Fixie para IP estático homologado
    const proxyUrl = process.env.FIXIE_URL || "http://fixie:1c54Fc5I1jgmHG2@criterium.usefixie.com:80";
    const proxyAgent = new HttpsProxyAgent(proxyUrl);

    const response = await axios.post("https://gateway.medicalsys.com.br:9000/integracoes/agenda/", formData.toString(), {
      httpsAgent: proxyAgent,
      proxy: false,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "apikey": apiKey,
        "msys-costumer-apikey": customerApiKey,
        "User-Agent": "RMCare-Platform/1.0"
      },
      timeout: 15000
    });

    const resultData = response.data;
    console.log("✅ [Medicalsys] Agendamento criado com sucesso no Medicalsys:", resultData);

    // 5. Salvar ID do Medicalsys no agendamento no Supabase
    if (appointmentId && resultData?.id) {
      try {
        await supabase
          .from("agendamentos")
          .update({
            medicalsys_id: resultData.id
          })
          .eq("id", appointmentId);
      } catch (eUp) {
        console.warn("Aviso ao salvar medicalsys_id:", eUp);
      }
    }

    return NextResponse.json({
      success: true,
      enabled: true,
      medicalsysId: resultData?.id || null,
      data: resultData,
      message: "Agendamento integrado ao Medicalsys com sucesso!"
    });
  } catch (error) {
    console.error("❌ [Medicalsys] Erro ao integrar agendamento:", error?.response?.data || error.message);
    const detalhes = error?.response?.data?.message || error?.response?.data || error.message;
    return NextResponse.json({ success: false, enabled: true, error: detalhes }, { status: 500 });
  }
}
