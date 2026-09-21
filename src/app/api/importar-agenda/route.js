import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { HttpsProxyAgent } from "https-proxy-agent";
import axios from "axios";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);


// EXTRAÇÃO ROBUSTA DE PROCEDIMENTO E ESPECIALIDADE DO MEDICALSYS (SWAGGER / MEDICALSYS API)
function extrairProcedimentoEEspecialidade(item, mapaProcedimentosPorId = new Map()) {
  let procNome = null;
  let espNome = null;

  // 1. Objeto ou string 'procedimento' (singular)
  if (item?.procedimento) {
    if (typeof item.procedimento === "object") {
      procNome = item.procedimento.nome || item.procedimento.descricao || item.procedimento.desc_procedimento || null;
      if (item.procedimento.especialidade) {
        if (Array.isArray(item.procedimento.especialidade) && item.procedimento.especialidade[0]?.nome) {
          espNome = item.procedimento.especialidade[0].nome;
        } else if (typeof item.procedimento.especialidade === "object" && item.procedimento.especialidade.nome) {
          espNome = item.procedimento.especialidade.nome;
        } else if (typeof item.procedimento.especialidade === "string") {
          espNome = item.procedimento.especialidade;
        }
      }
      if (!procNome && item.procedimento.id && mapaProcedimentosPorId.has(Number(item.procedimento.id))) {
        procNome = mapaProcedimentosPorId.get(Number(item.procedimento.id));
      }
    } else if (typeof item.procedimento === "string" && item.procedimento.trim()) {
      procNome = item.procedimento.trim();
    } else if (typeof item.procedimento === "number" && mapaProcedimentosPorId.has(item.procedimento)) {
      procNome = mapaProcedimentosPorId.get(item.procedimento);
    }
  }

  // 2. Objeto ou array 'procedimentos' (plural)
  if (!procNome && item?.procedimentos) {
    if (Array.isArray(item.procedimentos) && item.procedimentos.length > 0) {
      const primeiro = item.procedimentos[0];
      if (typeof primeiro === "object") {
        procNome = primeiro.nome || primeiro.descricao || primeiro.desc_procedimento || null;
        if (primeiro.especialidade) {
          espNome = typeof primeiro.especialidade === "object" ? primeiro.especialidade.nome : primeiro.especialidade;
        }
        if (!procNome && primeiro.id && mapaProcedimentosPorId.has(Number(primeiro.id))) {
          procNome = mapaProcedimentosPorId.get(Number(primeiro.id));
        }
      } else if (typeof primeiro === "string" && primeiro.trim()) {
        procNome = primeiro.trim();
      } else if (typeof primeiro === "number" && mapaProcedimentosPorId.has(primeiro)) {
        procNome = mapaProcedimentosPorId.get(primeiro);
      }
    } else if (typeof item.procedimentos === "string" && item.procedimentos.trim()) {
      procNome = item.procedimentos.trim();
    }
  }

  // 3. Outras propriedades diretas comuns no ERP MedicalSys
  if (!procNome) {
    procNome =
      item?.nome_procedimento ||
      item?.procedimento_nome ||
      item?.desc_procedimento ||
      item?.descricao_procedimento ||
      item?.procedimento_padrao ||
      item?.agenda?.procedimento?.nome ||
      item?.agenda?.procedimento ||
      null;
  }

  // 4. Se veio como ID em procedimento_id
  if (!procNome && item?.procedimento_id && mapaProcedimentosPorId.has(Number(item.procedimento_id))) {
    procNome = mapaProcedimentosPorId.get(Number(item.procedimento_id));
  }

  // 5. Especialidade direta do agendamento
  if (!espNome && item?.especialidade) {
    if (typeof item.especialidade === "object") {
      if (Array.isArray(item.especialidade) && item.especialidade[0]?.nome) {
        espNome = item.especialidade[0].nome;
      } else if (item.especialidade.nome) {
        espNome = item.especialidade.nome;
      }
    } else if (typeof item.especialidade === "string" && item.especialidade.trim()) {
      espNome = item.especialidade.trim();
    }
  }

  // 6. Especialidade do médico
  if (!espNome && item?.medico) {
    const medObj = Array.isArray(item.medico) ? item.medico[0] : item.medico;
    if (medObj && typeof medObj === "object") {
      if (medObj.especialidade?.nome) espNome = medObj.especialidade.nome;
      else if (typeof medObj.especialidade === "string") espNome = medObj.especialidade;
    }
  }

  // 7. Extração via observações / texto clínico
  const rawObs = String(item?.observacoes || item?.observacao || item?.obs || "").trim();
  if (rawObs) {
    if (!procNome) {
      const matchP = rawObs.match(/(?:procedimento|exame|servico|consulta)[:\s]+([^|\n,;]+)/i);
      if (matchP && matchP[1]) {
        procNome = matchP[1].trim();
      } else if (/colonoscopia/i.test(rawObs)) {
        procNome = "Colonoscopia";
      } else if (/endoscopia/i.test(rawObs)) {
        procNome = "Endoscopia Digestiva Alta";
      }
    }
  }

  // 8. Normalização e diferenciação explícita entre Colonoscopia e Endoscopia
  const combined = `${procNome || ""} ${espNome || ""} ${rawObs || ""}`.toLowerCase();
  if (combined.includes("colonoscopia")) {
    procNome = "Colonoscopia";
    espNome = "Colonoscopia";
  } else if (combined.includes("endoscopia")) {
    procNome = "Endoscopia Digestiva Alta";
    espNome = "Endoscopia";
  }

  // Regra de ouro: Procedimento ou Procedimentos é mapeado um para um com Especialidade
  const finalEspecialidade = procNome || espNome || "Geral";
  const finalProcedimento = procNome || espNome || "Consulta";

  return {
    procedimento: finalProcedimento,
    especialidade: finalEspecialidade
  };
}

export async function POST(request) {
  try {
    let requestBody = {};
    try {
      requestBody = await request.json();
    } catch (e) {
      requestBody = {};
    }

    const { mode = "import", reprocessar_existentes = false } = requestBody;

    // 1. BUSCAR EMPRESA E CONFIGURAÇÕES DE MAPEAMENTO DE COLUNAS
    const { data: empresa, error: erroEmpresa } = await supabase
      .from("empresas")
      .select("id, config_campos, config_mensagens, config_chaves")
      .limit(1)
      .single();

    if (erroEmpresa || !empresa) {
      throw new Error("Nenhuma empresa cadastrada no banco para vincular os agendamentos.");
    }
    const empresaId = empresa.id;
    const configCampos = empresa.config_campos || {};
    const configChaves = empresa.config_chaves || {};
    const enviarMensagensErp = Boolean(configCampos.enviar_mensagens_importados_erp);
    const mapCols = configCampos.medicalsys_column_mapping || {
      convenio: "coluna_convenio",
      especialidade: "especialidade"
    };

    // 2. CREDENCIAIS E PROXY FIXIE MEDICALSYS
    const clinicaId = configChaves.medicalsys_id_clinica || "9";
    const apiKey = configChaves.medicalsys_apikey || "8FxD2eUsODMO8IZWMHZaNpt78av9Vy6k";
    const customerApiKey = configChaves.medicalsys_customer_apikey || configChaves.medicalsys_costumer_apikey || "SqdACjyxnXuYqL8ilnwTvXHroEOvFHFR";

    const proxyUrl = process.env.FIXIE_URL || "http://fixie:1c54Fc5I1jgmHG2@criterium.usefixie.com:80";
    const proxyAgent = new HttpsProxyAgent(proxyUrl);

    // Pré-carregar catálogo de procedimentos do MedicalSys para resolução de IDs
    const mapaProcedimentosPorId = new Map();
    try {
      const urlProc = `https://gateway.medicalsys.com.br:9000/integracoes/procedimento/?clinica=${clinicaId}`;
      const resProc = await axios.get(urlProc, {
        httpsAgent: proxyAgent,
        proxy: false,
        headers: {
          "Content-Type": "application/json",
          "apikey": apiKey,
          "msys-costumer-apikey": customerApiKey
        },
        timeout: 8000
      });
      const listaProc = resProc.data?.results || resProc.data || [];
      if (Array.isArray(listaProc)) {
        listaProc.forEach((p) => {
          if (p.id && p.nome) mapaProcedimentosPorId.set(Number(p.id), p.nome);
          if (p.cod_procedimento && p.nome) mapaProcedimentosPorId.set(String(p.cod_procedimento), p.nome);
        });
        console.log(`[Importação Medicalsys] Catálogo com ${mapaProcedimentosPorId.size} procedimentos carregado.`);
      }
    } catch (eProc) {
      console.warn("[Importação Medicalsys] Catálogo de procedimentos não pôde ser pré-carregado:", eProc.message);
    }

    // MODO DE RE-PROCESSAMENTO / CORREÇÃO RETROATIVA DE BANCO DE DADOS
    if (mode === "reprocess_mapping" || reprocessar_existentes) {
      console.log(`[Re-processamento Medicalsys] Corrigindo registros antigos no banco para empresa ${empresaId}...`);

      const { data: bloqueiosImportados, error: errFetchOld } = await supabase
        .from("bloqueios_horarios")
        .select("*")
        .eq("empresa_id", empresaId);

      if (errFetchOld) throw errFetchOld;

      let corrigidosCount = 0;

      for (const item of (bloqueiosImportados || [])) {
        let currentEsp = item.especialidade || "";
        let currentObs = item.observacoes || "";
        let currentConv = item.convenio || "";

        let novoConv = currentConv;
        let novaEsp = currentEsp;
        let novaObs = currentObs;

        const regexPlano = /(unimed|bradesco|casssi|funasa|geap|sulamerica|hapvida|samp|particular|amil|ipam|ipem|plano|convenio)/i;

        if (!currentConv && regexPlano.test(currentEsp)) {
          novoConv = currentEsp;
          novaEsp = "Geral";
          corrigidosCount++;
        } else if (currentObs && currentObs.includes("Plano:") && !currentConv) {
          const matchObs = currentObs.match(/Plano:\s*([^|]+)/i);
          if (matchObs && matchObs[1]) {
            novoConv = matchObs[1].trim();
            corrigidosCount++;
          }
        }

        // Re-extração inteligente de procedimento/especialidade do payload original salvo
        if (item.raw_payload_completo) {
          const extraido = extrairProcedimentoEEspecialidade(item.raw_payload_completo, mapaProcedimentosPorId);
          if (extraido.especialidade && extraido.especialidade !== "Geral" && (novaEsp === "Geral" || !novaEsp)) {
            novaEsp = extraido.especialidade;
            corrigidosCount++;
          }
        }

        // Análise de observações para exames chave (Endoscopia e Colonoscopia)
        if (currentObs) {
          if (/colonoscopia/i.test(currentObs)) {
            novaEsp = "Colonoscopia";
            corrigidosCount++;
          } else if (/endoscopia/i.test(currentObs)) {
            novaEsp = "Endoscopia";
            corrigidosCount++;
          }
        }

        if (novoConv !== currentConv || novaEsp !== currentEsp) {
          await supabase
            .from("bloqueios_horarios")
            .update({
              convenio: novoConv || null,
              especialidade: novaEsp || "Geral",
              observacoes: novaObs || null
            })
            .eq("id", item.id);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Re-processamento concluído com sucesso! ${corrigidosCount} registros retroativos foram corrigidos.`
      });
    }

    // 3. CONSULTA DA AGENDA MEDICALSYS
    const hoje = new Date();
    const dataDeHoje = hoje.toISOString().slice(0, 10);
    const anoAtual = hoje.getFullYear();
    const dataFimDeAno = `${anoAtual}-12-31`;

    const clinicaParam = clinicaId ? `&clinica=${clinicaId}` : "";
    let urlAtual = `https://gateway.medicalsys.com.br:9000/integracoes/agenda/?momento_inicio=${dataDeHoje}&momento_final=${dataFimDeAno}${clinicaParam}`;

    let todosAgendamentos = [];
    let limiteDePaginas = 0;

    console.log(`[Importação Medicalsys] Buscando agendamentos de ${dataDeHoje} até ${dataFimDeAno}...`);

    while (urlAtual && limiteDePaginas < 50) {
      limiteDePaginas++;

      const response = await axios.get(urlAtual, {
        httpsAgent: proxyAgent,
        proxy: false,
        headers: {
          "Content-Type": "application/json",
          "apikey": apiKey,
          "msys-costumer-apikey": customerApiKey
        },
        timeout: 15000
      });

      const dados = response.data;

      if (!Array.isArray(dados) && dados.results) {
        todosAgendamentos = todosAgendamentos.concat(dados.results);
        urlAtual = dados.next ? dados.next.replace("http://", "https://") : null;
      } else if (Array.isArray(dados)) {
        todosAgendamentos = todosAgendamentos.concat(dados);
        urlAtual = null;
      } else {
        urlAtual = null;
      }
    }

    if (todosAgendamentos.length === 0) {
      return NextResponse.json({ success: true, message: `Nenhum agendamento retornado pelo Medicalsys.` });
    }

    // 3. CARREGAR REGISTROS EXISTENTES
    const { data: bloqueiosExistentes, error: erroBusca } = await supabase
      .from("bloqueios_horarios")
      .select("*")
      .eq("empresa_id", empresaId);

    if (erroBusca) throw erroBusca;

    const mapaExistentesId = new Map();
    const mapaExistentesChave = new Map();

    (bloqueiosExistentes || []).forEach((b) => {
      if (b.medicalsys_id) mapaExistentesId.set(b.medicalsys_id, b);
      mapaExistentesChave.set(`${b.data}|${b.horario}|${b.medico_profissional}`, b);
    });

    const registrosNovos = [];
    let registrosAtualizados = 0;
    const rascunhosMensagensFila = [];

    // 4. PROCESSAR REGISTROS GARANTINDO CAPTURA DE TODAS AS COLUNAS (CPF, OBSERVAÇÕES, METADADOS)
    for (const item of todosAgendamentos) {
      if (item.momento < dataDeHoje) continue;

      const horaInicioFormatada = item.horario_inicio ? item.horario_inicio.slice(0, 5) : "00:00";
      const horaFimFormatada = item.horario_fim ? item.horario_fim.slice(0, 5) : null;

      // Nome do Paciente
      let nomePaciente = "Paciente Importado";
      if (typeof item.paciente_provisorio === "string" && item.paciente_provisorio.trim()) {
        nomePaciente = item.paciente_provisorio.trim();
      } else if (item.paciente && typeof item.paciente === "object" && item.paciente.nome) {
        nomePaciente = item.paciente.nome;
      } else if (typeof item.paciente === "string") {
        nomePaciente = item.paciente;
      }

      // CPF do Paciente - Extração robusta
      let cpfPaciente =
        item.cpf_paciente ||
        item.cpf ||
        item.paciente_cpf ||
        (item.paciente && typeof item.paciente === "object" ? item.paciente.cpf : null);

      if (cpfPaciente) {
        const cleanCpfNum = String(cpfPaciente).replace(/\D/g, "");
        if (cleanCpfNum.length === 11) {
          cpfPaciente = cleanCpfNum.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
        }
      }

      // Médico / Especialista
      let medicoNome = "Não informado";
      if (item.medico && typeof item.medico === "object" && item.medico.nome) {
        medicoNome = item.medico.nome;
      } else if (Array.isArray(item.medico) && item.medico[0]?.nome) {
        medicoNome = item.medico[0].nome;
      } else if (typeof item.medico === "string") {
        medicoNome = item.medico;
      }

      // Separação de Convênio vs Especialidade
      let rawConvenio = null;
      if (item.convenio && typeof item.convenio === "object" && item.convenio.nome) {
        rawConvenio = item.convenio.nome.trim();
      } else if (typeof item.convenio === "string" && item.convenio.trim()) {
        rawConvenio = item.convenio.trim();
      }

      let rawObservacoes = item.observacoes || item.observacao || item.obs || null;

      // Extração precisa do procedimento/especialidade mapeando 1 para 1
      const dadosProc = extrairProcedimentoEEspecialidade(item, mapaProcedimentosPorId);
      let rawEspecialidade = dadosProc.especialidade;

      let finalConvenio = rawConvenio;
      let finalEspecialidade = rawEspecialidade || "Geral";
      let finalObservacoes = rawObservacoes;

      if (mapCols.convenio === "observacoes" && rawConvenio) {
        finalObservacoes = finalObservacoes ? `${finalObservacoes} | Plano: ${rawConvenio}` : `Plano: ${rawConvenio}`;
      } else if (mapCols.convenio === "eliminar_coluna") {
        finalConvenio = null;
      }

      if (mapCols.especialidade === "eliminar_coluna") {
        finalEspecialidade = "Geral";
      }

      const regexPlanoInvalido = /(unimed|bradesco|casssi|funasa|geap|sulamerica|hapvida|samp|particular|amil|ipam|ipem)/i;
      if (regexPlanoInvalido.test(finalEspecialidade)) {
        if (!finalConvenio) finalConvenio = finalEspecialidade;
        finalEspecialidade = "Geral";
      }

      let fone = item.tel_celular || item.paciente?.tel_celular || null;

      const payloadDado = {
        empresa_id: empresaId,
        data: item.momento,
        horario: horaInicioFormatada,
        horario_fim: horaFimFormatada,
        medico_profissional: medicoNome,
        nome_paciente: nomePaciente,
        cpf_paciente: cpfPaciente || null,
        especialidade: finalEspecialidade,
        convenio: finalConvenio,
        telefone_paciente: fone,
        situacao: item.situacao || "agen",
        observacoes: finalObservacoes || null,
        meio_de_pagamento: item.meio_de_pagamento || "espe",
        medicalsys_id: item.id || null,
        raw_payload_completo: item,
        status: "importado"
      };

      const existente = (item.id && mapaExistentesId.get(item.id)) || mapaExistentesChave.get(`${item.momento}|${horaInicioFormatada}|${medicoNome}`);

      if (existente) {
        let { error: errUp } = await supabase
          .from("bloqueios_horarios")
          .update(payloadDado)
          .eq("id", existente.id);

        if (errUp && (errUp.code === "42703" || errUp.message?.includes("column"))) {
          delete payloadDado.raw_payload_completo;
          await supabase.from("bloqueios_horarios").update(payloadDado).eq("id", existente.id);
        }
        registrosAtualizados++;
      } else {
        registrosNovos.push(payloadDado);
      }

      if (enviarMensagensErp && fone) {
        const dataFormatada = item.momento.split("-").reverse().join("/");
        const msgTexto = `Olá ${nomePaciente}, confirmamos seu agendamento de ${finalEspecialidade} (${finalConvenio ? "Convenio: " + finalConvenio : "Particular"}) com ${medicoNome} no dia ${dataFormatada} às ${horaInicioFormatada}h.`;

        const { data: msgExistente } = await supabase
          .from("fila_mensagens")
          .select("id, status")
          .eq("empresa_id", empresaId)
          .eq("telefone_whatsapp", fone)
          .eq("data_hora_programada", `${item.momento}T${horaInicioFormatada}:00-03:00`)
          .maybeSingle();

        if (!msgExistente) {
          rascunhosMensagensFila.push({
            empresa_id: empresaId,
            telefone_whatsapp: fone,
            nome_paciente: nomePaciente,
            mensagem: msgTexto,
            data_hora_programada: `${item.momento}T${horaInicioFormatada}:00-03:00`,
            status: "rascunho",
            gatilho: "importado_erp"
          });
        }
      }
    }

    if (registrosNovos.length > 0) {
      let { error: errInsert } = await supabase.from("bloqueios_horarios").insert(registrosNovos);
      if (errInsert && (errInsert.code === "42703" || errInsert.message?.includes("column"))) {
        const fallbackList = registrosNovos.map((r) => {
          const copy = { ...r };
          delete copy.raw_payload_completo;
          return copy;
        });
        await supabase.from("bloqueios_horarios").insert(fallbackList);
      }
    }

    if (rascunhosMensagensFila.length > 0) {
      await supabase.from("fila_mensagens").insert(rascunhosMensagensFila);
    }

    return NextResponse.json({
      success: true,
      novos: registrosNovos.length,
      atualizados: registrosAtualizados,
      mensagensRascunhoGeradas: rascunhosMensagensFila.length,
      message: `Sincronização concluída com sucesso: ${registrosNovos.length} novos agendamentos criados e ${registrosAtualizados} atualizados.`
    });
  } catch (error) {
    console.error("[Importação Medicalsys Error]:", error);
    const detalhes = error.response?.data?.message || error.message;
    return NextResponse.json({ success: false, error: detalhes }, { status: 500 });
  }
}
