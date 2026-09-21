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

    // Sincronização habilitada por padrão se credenciais existirem, exceto se explicitamente desativada
    const explicitamenteDesabilitado =
      configCampos.enviar_agendamentos_medicalsys === false ||
      configChaves.medicalsys_enabled === false;

    if (explicitamenteDesabilitado) {
      console.log(`[Medicalsys] Sincronização desabilitada explicitamente para "${empresa.nome || empresaId}". Agendamento mantido apenas na RMCare.`);
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

    // B. Horário de início e fim considerando duração real (Endoscopia: 20m, Colonoscopia: 30m, Consulta: 15m)
    const cleanHorarioInicio = String(horarioInicio || "08:00").trim().slice(0, 5);
    
    let duracaoProcedimento = 15;
    const procText = `${body.procedimento || ""} ${medico || ""}`.toLowerCase();
    if (procText.includes("endoscopia")) {
      duracaoProcedimento = 20;
    } else if (procText.includes("colonoscopia")) {
      duracaoProcedimento = 30;
    }

    const calcHorarioFim = (inicio, minutos = duracaoProcedimento) => {
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

    const clinicaIdConfig = configChaves.medicalsys_id_clinica || "9";
    const apiKey = configChaves.medicalsys_apikey || "8FxD2eUsODMO8IZWMHZaNpt78av9Vy6k";
    const customerApiKey = configChaves.medicalsys_customer_apikey || configChaves.medicalsys_costumer_apikey || "SqdACjyxnXuYqL8ilnwTvXHroEOvFHFR";

    // 3. Proxy Fixie para IP estático homologado
    const proxyUrl = process.env.FIXIE_URL || "http://fixie:1c54Fc5I1jgmHG2@criterium.usefixie.com:80";
    const proxyAgent = new HttpsProxyAgent(proxyUrl);

    // E. Carregar histórico de bloqueios/agendamentos importados da clínica
    const { data: bloqueiosMed } = await supabase
      .from("bloqueios_horarios")
      .select("medico_profissional, especialidade, convenio, raw_payload_completo")
      .eq("empresa_id", empresaId)
      .not("raw_payload_completo", "is", null)
      .limit(100);

    // 1. Resolução dinâmica de clinica_id na MedicalSys
    let clinicaRealId = null;
    try {
      const resClin = await axios.get("https://gateway.medicalsys.com.br:9000/integracoes/clinica/", {
        httpsAgent: proxyAgent,
        proxy: false,
        headers: {
          "Content-Type": "application/json",
          "apikey": apiKey,
          "msys-costumer-apikey": customerApiKey
        },
        timeout: 7000
      });
      const clinList = resClin.data?.results || resClin.data || [];
      if (Array.isArray(clinList) && clinList.length > 0) {
        console.log(`[Medicalsys] Clínicas autorizadas encontradas:`, clinList.map((c) => ({ id: c.id, nome: c.nome_clinica })));
        if (configChaves.medicalsys_id_clinica) {
          const matchConf = clinList.find((c) => String(c.id) === String(configChaves.medicalsys_id_clinica));
          if (matchConf) clinicaRealId = Number(matchConf.id);
        }
        if (!clinicaRealId) {
          clinicaRealId = Number(clinList[0].id);
        }
      }
    } catch (eClin) {
      console.warn("[Medicalsys] Consulta de clínicas online falhou:", eClin.message);
    }

    if (!clinicaRealId) {
      for (const b of (bloqueiosMed || [])) {
        const raw = b.raw_payload_completo;
        const cId = raw?.clinica?.id || raw?.id_clinica || raw?.clinica_id;
        if (cId && String(cId) !== "9") {
          clinicaRealId = Number(cId);
          break;
        }
      }
    }

    if (!clinicaRealId) {
      clinicaRealId = Number(clinicaIdConfig) || 9;
    }

    // 2. Resolução robusta de Médicos reais da clínica
    const medicosMap = new Map();
    for (const b of (bloqueiosMed || [])) {
      const rawMed = b.raw_payload_completo?.medico;
      const medObj = Array.isArray(rawMed) ? rawMed[0] : rawMed;
      if (medObj && medObj.id) {
        const mId = Number(medObj.id);
        const mNome = String(medObj.nome || b.medico_profissional || "").toLowerCase().replace(/dra?\./g, "").trim();
        if (mNome) medicosMap.set(mNome, mId);
        medicosMap.set(String(mId), mId);
      }
    }

    try {
      const resMed = await axios.get("https://gateway.medicalsys.com.br:9000/integracoes/medico/", {
        httpsAgent: proxyAgent,
        proxy: false,
        headers: {
          "Content-Type": "application/json",
          "apikey": apiKey,
          "msys-costumer-apikey": customerApiKey
        },
        timeout: 6000
      });
      const medList = resMed.data?.results || resMed.data || [];
      if (Array.isArray(medList)) {
        medList.forEach((m) => {
          if (m.id) {
            const mId = Number(m.id);
            const mNome = String(m.nome || "").toLowerCase().replace(/dra?\./g, "").trim();
            if (mNome) medicosMap.set(mNome, mId);
            medicosMap.set(String(mId), mId);
          }
        });
      }
    } catch (eMed) {
      console.warn("[Medicalsys] Consulta de médicos online falhou:", eMed.message);
    }

    let resolvedMedicoId = null;
    if (medico && /^\d+$/.test(String(medico).trim())) {
      resolvedMedicoId = Number(medico);
    }

    if (!resolvedMedicoId && medico) {
      const cleanMedicoNome = String(medico).trim().toLowerCase().replace(/dra?\./g, "").trim();
      if (medicosMap.has(cleanMedicoNome)) {
        resolvedMedicoId = medicosMap.get(cleanMedicoNome);
      } else {
        for (const [key, val] of medicosMap.entries()) {
          if (isNaN(Number(key)) && (key.includes(cleanMedicoNome) || cleanMedicoNome.includes(key))) {
            resolvedMedicoId = val;
            break;
          }
        }
      }
    }

    if (!resolvedMedicoId && medicosMap.size > 0) {
      for (const val of medicosMap.values()) {
        if (typeof val === "number" && val > 0) {
          resolvedMedicoId = val;
          break;
        }
      }
    }

    if (!resolvedMedicoId) {
      resolvedMedicoId = Number(configChaves.medicalsys_id_medico) || 650;
    }

    // 3. Resolução robusta de Procedimento (procedimentos_ids)
    let resolvedProcedimentoId = null;
    let listaProc = [];
    const procedimentosMap = new Map();

    try {
      let resProc;
      try {
        resProc = await axios.get(`https://gateway.medicalsys.com.br:9000/integracoes/procedimento/?clinica=${clinicaRealId}`, {
          httpsAgent: proxyAgent,
          proxy: false,
          headers: {
            "Content-Type": "application/json",
            "apikey": apiKey,
            "msys-costumer-apikey": customerApiKey
          },
          timeout: 7000
        });
      } catch (e1) {
        resProc = await axios.get("https://gateway.medicalsys.com.br:9000/integracoes/procedimento/", {
          httpsAgent: proxyAgent,
          proxy: false,
          headers: {
            "Content-Type": "application/json",
            "apikey": apiKey,
            "msys-costumer-apikey": customerApiKey
          },
          timeout: 7000
        });
      }

      listaProc = resProc.data?.results || resProc.data || [];
      if (Array.isArray(listaProc)) {
        listaProc.forEach((p) => {
          if (p.id) {
            const pId = Number(p.id);
            const pNome = String(p.nome || p.descricao || "").toLowerCase().trim();
            if (pNome) procedimentosMap.set(pNome, pId);
            procedimentosMap.set(String(pId), pId);
          }
        });
        console.log(`[Medicalsys] ${procedimentosMap.size} procedimentos catalogados para resolução de ID.`);
      }
    } catch (eProc) {
      console.warn("[Medicalsys] Catálogo de procedimentos não carregado:", eProc.message);
    }

    const cleanProcedimento = String(body.procedimento || body.subtipo_exame || body.especialidade || "Consulta").trim();
    const cleanProcLower = cleanProcedimento.toLowerCase();

    for (const [pNome, pId] of procedimentosMap.entries()) {
      if (isNaN(Number(pNome))) {
        if (cleanProcLower.includes("colonoscopia") && pNome.includes("colonoscopia")) {
          resolvedProcedimentoId = pId;
          break;
        } else if (cleanProcLower.includes("endoscopia") && pNome.includes("endoscopia")) {
          resolvedProcedimentoId = pId;
          break;
        } else if (pNome.includes(cleanProcLower) || cleanProcLower.includes(pNome)) {
          resolvedProcedimentoId = pId;
          break;
        }
      }
    }

    if (!resolvedProcedimentoId) {
      for (const b of (bloqueiosMed || [])) {
        const rawP = b.raw_payload_completo?.procedimento;
        const pObj = Array.isArray(rawP) ? rawP[0] : rawP;
        if (pObj?.id && Number(pObj.id) > 0) {
          resolvedProcedimentoId = Number(pObj.id);
          break;
        }
      }
    }

    if (!resolvedProcedimentoId && listaProc.length > 0) {
      resolvedProcedimentoId = Number(listaProc[0].id);
    }
    if (!resolvedProcedimentoId) {
      resolvedProcedimentoId = 5660;
    }

    // 4. Resolução de Convênio (convenio_id) obrigatório quando meio_de_pagamento = "conv"
    let resolvedConvenioId = null;
    const isConv = cleanPagamento === "conv";

    if (isConv) {
      if (body.convenio_id && /^\d+$/.test(String(body.convenio_id).trim())) {
        resolvedConvenioId = Number(body.convenio_id);
      }

      const targetConvNome = String(body.convenio || body.modalidade || "").toLowerCase().trim();

      if (!resolvedConvenioId && targetConvNome) {
        const listaEmpConvs = configCampos.lista_convenios || [];
        const matchConv = listaEmpConvs.find((c) => c.nome && c.nome.toLowerCase().trim() === targetConvNome);
        if (matchConv?.codigo_medicalsys && /^\d+$/.test(String(matchConv.codigo_medicalsys))) {
          resolvedConvenioId = Number(matchConv.codigo_medicalsys);
        }
      }

      if (!resolvedConvenioId) {
        try {
          const resConv = await axios.get("https://gateway.medicalsys.com.br:9000/integracoes/convenio/", {
            httpsAgent: proxyAgent,
            proxy: false,
            headers: {
              "Content-Type": "application/json",
              "apikey": apiKey,
              "msys-costumer-apikey": customerApiKey
            },
            timeout: 7000
          });
          const convList = resConv.data?.results || resConv.data || [];
          if (Array.isArray(convList) && convList.length > 0) {
            if (targetConvNome) {
              const matchOnline = convList.find((c) => c.nome && (c.nome.toLowerCase().includes(targetConvNome) || targetConvNome.includes(c.nome.toLowerCase())));
              if (matchOnline?.id) resolvedConvenioId = Number(matchOnline.id);
            }
            if (!resolvedConvenioId) {
              resolvedConvenioId = Number(convList[0].id);
            }
          }
        } catch (eConv) {
          console.warn("[Medicalsys] Consulta online de convênios falhou:", eConv.message);
        }
      }

      if (!resolvedConvenioId) {
        for (const b of (bloqueiosMed || [])) {
          const rawC = b.raw_payload_completo?.convenio;
          const cObj = Array.isArray(rawC) ? rawC[0] : rawC;
          if (cObj?.id && Number(cObj.id) > 0) {
            resolvedConvenioId = Number(cObj.id);
            break;
          }
        }
      }

      if (!resolvedConvenioId) {
        resolvedConvenioId = 10;
      }
    }

    const clinicaNum = Number(clinicaRealId);
    const medicoNum = Number(resolvedMedicoId);
    const procIdNum = Number(resolvedProcedimentoId);

    console.log(`[Medicalsys] Enviando para Medicalsys: Data=${momento} Hora=${cleanHorarioInicio} | Clinica=${clinicaNum} Medico=${medicoNum} Procedimento=${procIdNum} Meio=${cleanPagamento} ConvenioId=${resolvedConvenioId}`);

    const payloadJson = {
      clinica_id: clinicaNum,
      id_clinica: String(clinicaNum),
      medico_id: medicoNum,
      medico: String(medicoNum),
      procedimentos_ids: [procIdNum],
      procedimento_id: procIdNum,
      paciente_provisorio: (nomePaciente || "Paciente Online").trim(),
      momento: momento,
      horario_inicio: cleanHorarioInicio,
      horario_fim: cleanHorarioFim,
      meio_de_pagamento: cleanPagamento,
      tel_celular: cleanFone,
      observacoes: `Agendado via RM Agenda | Procedimento: ${cleanProcedimento}`
    };

    if (isConv && resolvedConvenioId) {
      payloadJson.convenio_id = resolvedConvenioId;
      payloadJson.convenio = resolvedConvenioId;
    }

    const headersBase = {
      "apikey": apiKey,
      "msys-costumer-apikey": customerApiKey,
      "User-Agent": "RMCare-Platform/1.0"
    };

    let response;
    try {
      response = await axios.post(
        "https://gateway.medicalsys.com.br:9000/integracoes/agenda/",
        payloadJson,
        {
          httpsAgent: proxyAgent,
          proxy: false,
          headers: {
            ...headersBase,
            "Content-Type": "application/json"
          },
          timeout: 15000
        }
      );
    } catch (errJson) {
      console.warn("[Medicalsys] Falha no envio JSON, tentando x-www-form-urlencoded...", errJson.response?.data || errJson.message);

      const fd = new URLSearchParams();
      fd.append("clinica_id", String(clinicaNum));
      fd.append("id_clinica", String(clinicaNum));
      fd.append("medico_id", String(medicoNum));
      fd.append("medico", String(medicoNum));
      fd.append("procedimentos_ids", String(procIdNum));
      if (isConv && resolvedConvenioId) {
        fd.append("convenio_id", String(resolvedConvenioId));
        fd.append("convenio", String(resolvedConvenioId));
      }
      fd.append("paciente_provisorio", (nomePaciente || "Paciente Online").trim());
      fd.append("momento", momento);
      fd.append("horario_inicio", cleanHorarioInicio);
      fd.append("horario_fim", cleanHorarioFim);
      fd.append("meio_de_pagamento", cleanPagamento);
      fd.append("tel_celular", cleanFone);
      fd.append("observacoes", `Agendado via RM Agenda | Procedimento: ${cleanProcedimento}`);

      response = await axios.post(
        "https://gateway.medicalsys.com.br:9000/integracoes/agenda/",
        fd.toString(),
        {
          httpsAgent: proxyAgent,
          proxy: false,
          headers: {
            ...headersBase,
            "Content-Type": "application/x-www-form-urlencoded"
          },
          timeout: 15000
        }
      );
    }

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
    const errorData = error?.response?.data || error.message;
    console.error("❌ [Medicalsys] Erro ao integrar agendamento:", errorData);
    let detalhesStr = typeof errorData === "object" ? JSON.stringify(errorData) : String(errorData);
    return NextResponse.json({
      success: false,
      enabled: true,
      error: detalhesStr,
      status: error?.response?.status || 500,
      details: error?.response?.data || null
    }, { status: 200 });
  }
}
