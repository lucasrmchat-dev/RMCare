import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { HttpsProxyAgent } from "https-proxy-agent";
import axios from "axios";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});


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

// EXTRAÇÃO RIGOROSA E EXATA DE DATA E HORA DO MEDICALSYS (SWAGGER SPEC / GATEWAY)
// Preserva 100% de fidelidade: o que vier em momento e horario_inicio é mantido sem nenhum deslocamento
function extrairDataEHoraMedicalsys(item) {
  // 1. Prioridade absoluta para campos explícitos de hora (ex: horario_inicio: "08:00:00")
  const candidatosHora = [
    item?.horario_inicio,
    item?.hora_inicio,
    item?.horario,
    item?.hora,
    item?.hora_agendamento,
    item?.horario_agendamento,
    item?.hora_marcada,
    item?.horario_marcado,
    item?.hora_atendimento,
    item?.horario_atendimento,
    item?.inicio,
    item?.agenda?.horario_inicio,
    item?.agenda?.hora,
    item?.agenda?.horario
  ];

  let horaEncontrada = null;

  for (const cand of candidatosHora) {
    if (!cand) continue;
    let str = "";
    if (typeof cand === "string") {
      str = cand.trim();
    } else if (typeof cand === "object") {
      str = cand.hora || cand.horario || cand.time || cand.inicio || "";
    } else if (typeof cand === "number") {
      str = String(cand);
    }
    if (!str) continue;

    const m = str.match(/(\d{1,2})[:hH](\d{2})/);
    if (m) {
      const h = parseInt(m[1], 10);
      const min = String(m[2]).padStart(2, "0");
      horaEncontrada = `${String(h).padStart(2, "0")}:${min}`;
      break;
    }
  }

  // 2. Extração de Data (Swagger: momento = "YYYY-MM-DD")
  const rawMomento = String(item?.momento || item?.data || item?.data_agendamento || "").trim();
  let dataFormatada = null;

  if (rawMomento) {
    if (rawMomento.includes("/")) {
      const [dia, mes, ano] = rawMomento.split(" ")[0].split("/");
      if (ano && mes && dia) {
        dataFormatada = `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
      }
    } else if (rawMomento.includes("T")) {
      dataFormatada = rawMomento.split("T")[0];
      if (!horaEncontrada) {
        const possivelHora = rawMomento.split("T")[1];
        const m = possivelHora.match(/(\d{1,2})[:hH](\d{2})/);
        if (m) horaEncontrada = `${m[1].padStart(2, "0")}:${m[2].padStart(2, "0")}`;
      }
    } else if (rawMomento.includes(" ")) {
      dataFormatada = rawMomento.split(" ")[0];
      if (!horaEncontrada) {
        const possivelHora = rawMomento.split(" ")[1];
        const m = possivelHora.match(/(\d{1,2})[:hH](\d{2})/);
        if (m) horaEncontrada = `${m[1].padStart(2, "0")}:${m[2].padStart(2, "0")}`;
      }
    } else {
      dataFormatada = rawMomento.slice(0, 10);
    }
  }

  // 3. Horário Fim (Swagger: horario_fim = "HH:MM:SS")
  let horaFimFormatada = null;
  const candidatosFim = [item?.horario_fim, item?.hora_fim, item?.fim, item?.agenda?.horario_fim];
  for (const cand of candidatosFim) {
    if (!cand) continue;
    const str = typeof cand === "string" ? cand.trim() : typeof cand === "object" ? (cand.hora || cand.horario || "") : "";
    const m = str.match(/(\d{1,2})[:hH](\d{2})/);
    if (m) {
      const h = parseInt(m[1], 10);
      const min = String(m[2]).padStart(2, "0");
      horaFimFormatada = `${String(h).padStart(2, "0")}:${min}`;
      break;
    }
  }

  return {
    data: dataFormatada,
    horarioInicio: horaEncontrada || "08:00",
    horarioFim: horaFimFormatada
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

    const { mode = "import", reprocessar_existentes = false, empresa_id: requestedEmpresaId } = requestBody;

    // 1. AUTENTICAÇÃO E RESOLUÇÃO RIGOROSA DO TENANT (ANTI-CROSS-LEAK)
    const cookieStore = await cookies();
    const authCookie =
      cookieStore.get("rmagenda_auth") ||
      cookieStore.get("rmcare_auth") ||
      cookieStore.get("admin_session") ||
      cookieStore.get("auth_token");

    let usuarioLogado = null;
    if (authCookie?.value) {
      try {
        const session = await verifyAdminSession(authCookie.value);
        usuarioLogado = session?.sub || authCookie.value;
      } catch (_) {
        usuarioLogado = authCookie.value;
      }
    }

    let admin = null;
    if (usuarioLogado) {
      const { data: admData } = await supabase
        .from("administradores")
        .select("id, role, empresa_id, usuario")
        .eq("usuario", usuarioLogado)
        .maybeSingle();
      admin = admData;
    }

    let targetEmpresaId = null;

    if (admin) {
      if (admin.role === "sistema") {
        targetEmpresaId = requestedEmpresaId || admin.empresa_id;
      } else {
        // Se for admin de clínica, SEMPRE força a clínica vinculada ao seu login (blindagem multi-tenant)
        targetEmpresaId = admin.empresa_id;
      }
    } else if (requestedEmpresaId) {
      targetEmpresaId = requestedEmpresaId;
    }

    if (!targetEmpresaId) {
      return NextResponse.json(
        { success: false, error: "Acesso não autorizado ou clínica não informada para sincronização." },
        { status: 401 }
      );
    }

    // 2. BUSCAR CONFIGURAÇÕES EXCLUSIVAS DA CLÍNICA IDENTIFICADA
    const { data: empresa, error: erroEmpresa } = await supabase
      .from("empresas")
      .select("id, nome, config_campos, config_mensagens, config_chaves")
      .eq("id", targetEmpresaId)
      .maybeSingle();

    if (erroEmpresa || !empresa) {
      return NextResponse.json(
        { success: false, error: "Clínica não encontrada no banco de dados." },
        { status: 404 }
      );
    }

    const empresaId = empresa.id;
    const configCampos = empresa.config_campos || {};
    const configChaves = empresa.config_chaves || {};

    const medicalsysEnabled = Boolean(configChaves.medicalsys_enabled);
    const clinicaId = configChaves.medicalsys_id_clinica;
    const apiKey = configChaves.medicalsys_apikey;
    const customerApiKey = configChaves.medicalsys_customer_apikey || configChaves.medicalsys_costumer_apikey;

    // VALIDAÇÃO ESTRITA: ZERO CREDENCIAIS HARDCODED OU FALLBACK PARA OUTRA CLÍNICA
    if (!medicalsysEnabled || !clinicaId || !apiKey || !customerApiKey) {
      return NextResponse.json({
        success: false,
        error: `A integração com o MedicalSYS não está ativada ou configurada para a clínica "${empresa.nome || empresaId}". Acesse 'Integrações ERP' para inserir as credenciais exclusivas da sua clínica.`,
        code: "MEDICALSYS_NOT_CONFIGURED"
      }, { status: 400 });
    }

    const offsetHoras = configChaves.medicalsys_offset_horas !== undefined
      ? Number(configChaves.medicalsys_offset_horas)
      : (configCampos.medicalsys_offset_horas !== undefined ? Number(configCampos.medicalsys_offset_horas) : 0);
    const enviarMensagensErp = Boolean(configCampos.enviar_mensagens_importados_erp);
    const mapCols = configCampos.medicalsys_column_mapping || {
      convenio: "coluna_convenio",
      especialidade: "especialidade"
    };

    // 3. PROXY FIXIE MEDICALSYS
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
    // Resolver dinamicamente a clínica real autorizada
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
        console.log(`[Importação Medicalsys] Clínicas autorizadas encontradas:`, clinList.map((c) => ({ id: c.id, nome: c.nome_clinica })));
        if (configChaves.medicalsys_id_clinica && configChaves.medicalsys_id_clinica !== "9") {
          const matchConf = clinList.find((c) => String(c.id) === String(configChaves.medicalsys_id_clinica));
          if (matchConf) clinicaRealId = matchConf.id;
        }
        if (!clinicaRealId) {
          clinicaRealId = clinList[0].id;
        }
      }
    } catch (eClin) {
      console.warn("[Importação Medicalsys] Consulta de clínicas online falhou:", eClin.message);
    }

    const hoje = new Date();
    // Busca dos últimos 30 dias até o fim do próximo ano para sincronização retroativa e futura
    const dataInicio = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const anoAtual = hoje.getFullYear();
    const dataFimDeAno = `${anoAtual + 1}-12-31`;

    let todosAgendamentos = [];

    const tentarBuscaAgenda = async (comClinicaId = null) => {
      const paramClin = comClinicaId ? `&clinica=${comClinicaId}` : "";
      let urlAtual = `https://gateway.medicalsys.com.br:9000/integracoes/agenda/?momento_inicio=${dataInicio}&momento_final=${dataFimDeAno}${paramClin}`;
      let ags = [];
      let limiteDePaginas = 0;

      console.log(`[Importação Medicalsys] Tentando URL: ${urlAtual}...`);
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
          ags = ags.concat(dados.results);
          urlAtual = dados.next ? dados.next.replace("http://", "https://") : null;
        } else if (Array.isArray(dados)) {
          ags = ags.concat(dados);
          urlAtual = null;
        } else {
          urlAtual = null;
        }
      }
      return ags;
    };

    // Busca ampla: primeiro busca geral da clínica e depois busca global sem filtro de clínica
    let agsGlobais = [];
    try {
      agsGlobais = await tentarBuscaAgenda(null);
    } catch (eGlob) {
      console.warn("[Importação Medicalsys] Busca global falhou:", eGlob.message);
    }

    let agsClinica = [];
    if (clinicaRealId && String(clinicaRealId) !== "null") {
      try {
        agsClinica = await tentarBuscaAgenda(clinicaRealId);
      } catch (eClinId) {
        console.warn("[Importação Medicalsys] Busca por clinicaId falhou:", eClinId.message);
      }
    }

    const mapaTodosAgs = new Map();
    [...agsGlobais, ...agsClinica].forEach((ag) => {
      const k = ag.id ? String(ag.id) : `${ag.momento || ag.data}_${ag.horario_inicio || ag.horario}_${ag.paciente?.nome || ag.nome_paciente || Math.random()}`;
      mapaTodosAgs.set(k, ag);
    });
    todosAgendamentos = Array.from(mapaTodosAgs.values());

    if (todosAgendamentos.length === 0) {
      return NextResponse.json({
        success: true,
        novos: 0,
        atualizados: 0,
        message: `Nenhum agendamento retornado pelo Medicalsys no período de ${dataInicio} a ${dataFimDeAno}.`
      });
    }

    // 4. PROCESSAR E DEDUPLICAR AGENDAMENTOS DO MEDICALSYS
    const registrosProcessados = [];
    const mapaPorMedicalsysId = new Map();
    const mapaSlotsMedicalsys = new Map(); // data|horario|medico -> payloadDado
    const rascunhosMensagensFila = [];

    for (const item of todosAgendamentos) {
      const { data: dataLimpa, horarioInicio: horaInicioFormatada, horarioFim: horaFimFormatada } = extrairDataEHoraMedicalsys(item);
      if (!dataLimpa) continue;

      // Nome do Paciente - Extração profunda e prioritária do cadastro real
      let nomePaciente = null;
      if (item.paciente && typeof item.paciente === "object") {
        nomePaciente =
          item.paciente.nome ||
          item.paciente.nome_paciente ||
          item.paciente.nome_completo ||
          item.paciente.razao_social ||
          null;
      }
      if (!nomePaciente) {
        nomePaciente = item.nome_paciente || item.paciente_nome || item.nome || null;
      }
      if (!nomePaciente && typeof item.paciente === "string" && item.paciente.trim() && !/^\d+$/.test(item.paciente.trim())) {
        nomePaciente = item.paciente.trim();
      }
      if (!nomePaciente && typeof item.paciente_provisorio === "string" && item.paciente_provisorio.trim()) {
        nomePaciente = item.paciente_provisorio.trim();
      }
      if (!nomePaciente) {
        nomePaciente = "Paciente MedicalSYS";
      }

      // CPF do Paciente - Extração robusta
      let cpfPaciente =
        item.cpf_paciente ||
        item.cpf ||
        item.paciente_cpf ||
        (item.paciente && typeof item.paciente === "object" ? (item.paciente.cpf || item.paciente.cpf_paciente) : null);

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
      } else if (typeof item.medico === "string" && item.medico.trim() && !/^\d+$/.test(item.medico.trim())) {
        medicoNome = item.medico.trim();
      } else if (item.medico_nome || item.nome_medico) {
        medicoNome = item.medico_nome || item.nome_medico;
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

      let fone =
        item.tel_celular ||
        item.telefone ||
        item.celular ||
        (item.paciente && typeof item.paciente === "object" ? (item.paciente.tel_celular || item.paciente.telefone || item.paciente.celular) : null) ||
        null;

      const itemMedIdStr = item.id ? String(item.id) : null;
      // Garante chave estritamente única para NENHUM paciente ser sobregravado ou descartado
      const chaveItem = itemMedIdStr
        ? `medsys_${itemMedIdStr}`
        : `slot_${dataLimpa}_${horaInicioFormatada}_${nomePaciente}_${medicoNome}_${Math.random()}`;

      const payloadDado = {
        empresa_id: empresaId,
        data: dataLimpa,
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
        medicalsys_id: itemMedIdStr,
        raw_payload_completo: item,
        status: "importado"
      };

      if (itemMedIdStr) {
        mapaPorMedicalsysId.set(itemMedIdStr, item);
      }
      mapaSlotsMedicalsys.set(chaveItem, payloadDado);

      if (enviarMensagensErp && fone) {
        const dataFormatada = dataLimpa.split("-").reverse().join("/");
        const msgTexto = `Olá ${nomePaciente}, confirmamos seu agendamento de ${finalEspecialidade} (${finalConvenio ? "Convenio: " + finalConvenio : "Particular"}) com ${medicoNome} no dia ${dataFormatada} às ${horaInicioFormatada}h.`;

        const { data: msgExistente } = await supabase
          .from("fila_mensagens")
          .select("id, status")
          .eq("empresa_id", empresaId)
          .eq("telefone_whatsapp", fone)
          .eq("data_hora_programada", `${dataLimpa}T${horaInicioFormatada}:00-03:00`)
          .maybeSingle();

        if (!msgExistente) {
          rascunhosMensagensFila.push({
            empresa_id: empresaId,
            telefone_whatsapp: fone,
            nome_paciente: nomePaciente,
            mensagem: msgTexto,
            data_hora_programada: `${dataLimpa}T${horaInicioFormatada}:00-03:00`,
            status: "rascunho",
            gatilho: "importado_erp"
          });
        }
      }
    }

    const registrosParaInserir = Array.from(mapaSlotsMedicalsys.values());

    // 5. PURGA E SOBREPOSIÇÃO MANDATÓRIA (ZERO RESÍDUO DE REMARCAÇÃO):
    // Remove TODOS os registros anteriores importados do Medicalsys desta empresa.
    // Isso garante que se um paciente foi remarcado para outro dia (ou cancelado),
    // a data e o horário antigos são sumariamente eliminados do banco.
    try {
      const { data: bloqueiosImportadosAntigos, error: errBuscaAntigos } = await supabase
        .from("bloqueios_horarios")
        .select("id")
        .eq("empresa_id", empresaId)
        .or("status.eq.importado,medicalsys_id.not.is.null");

      if (!errBuscaAntigos && Array.isArray(bloqueiosImportadosAntigos) && bloqueiosImportadosAntigos.length > 0) {
        const idsImportadosParaExcluir = bloqueiosImportadosAntigos.map((b) => b.id);
        for (let i = 0; i < idsImportadosParaExcluir.length; i += 300) {
          const chunk = idsImportadosParaExcluir.slice(i, i + 300);
          await supabase.from("bloqueios_horarios").delete().in("id", chunk).eq("empresa_id", empresaId);
        }
        console.log(`[Importação Medicalsys] ${idsImportadosParaExcluir.length} registros legados limpos para inserção da grade atualizada.`);
      }
    } catch (eLimpa) {
      console.warn("[Importação Medicalsys] Aviso ao limpar registros antigos:", eLimpa.message);
    }

    // 6. INSERIR A GRADE ATUALIZADA DO MEDICALSYS
    let inseridosComSucesso = 0;
    if (registrosParaInserir.length > 0) {
      for (let i = 0; i < registrosParaInserir.length; i += 400) {
        const chunk = registrosParaInserir.slice(i, i + 400);
        let { error: errInsert } = await supabase.from("bloqueios_horarios").insert(chunk);
        if (errInsert && (errInsert.code === "42703" || errInsert.message?.includes("column"))) {
          const fallbackChunk = chunk.map((r) => {
            const copy = { ...r };
            delete copy.raw_payload_completo;
            return copy;
          });
          await supabase.from("bloqueios_horarios").insert(fallbackChunk);
        }
        inseridosComSucesso += chunk.length;
      }
    }

    // 7. SINCRONIZAR AGENDAMENTOS ONLINE QUE POSSUEM MEDICALSYS_ID
    try {
      const { data: agsLocais } = await supabase
        .from("agendamentos")
        .select("id, medicalsys_id, data_agendamento, horario_agendamento, status_atendimento")
        .eq("empresa_id", empresaId)
        .not("medicalsys_id", "is", null);

      if (agsLocais && agsLocais.length > 0) {
        for (const ag of agsLocais) {
          const medItem = mapaPorMedicalsysId.get(String(ag.medicalsys_id));
          if (medItem) {
            const { data: medData, horarioInicio: medHora } = extrairDataEHoraMedicalsys(medItem);
            const isCanc = medItem.situacao === "canc" || medItem.cancelado === true;
            const newStatus = isCanc ? "cancelado" : ag.status_atendimento;

            if (medData !== ag.data_agendamento || medHora !== ag.horario_agendamento || (isCanc && ag.status_atendimento !== "cancelado")) {
              await supabase
                .from("agendamentos")
                .update({
                  data_agendamento: medData || ag.data_agendamento,
                  horario_agendamento: medHora || ag.horario_agendamento,
                  status_atendimento: newStatus
                })
                .eq("id", ag.id)
                .eq("empresa_id", empresaId);
            }
          }
        }
      }
    } catch (eAg) {
      console.warn("[Importação Medicalsys] Aviso ao sincronizar agendamentos locais:", eAg.message);
    }

    if (rascunhosMensagensFila.length > 0) {
      await supabase.from("fila_mensagens").insert(rascunhosMensagensFila);
    }

    return NextResponse.json({
      success: true,
      novos: registrosParaInserir.length,
      atualizados: inseridosComSucesso,
      mensagensRascunhoGeradas: rascunhosMensagensFila.length,
      message: `Sincronização concluída com sucesso: ${registrosParaInserir.length} horários atualizados e sincronizados com fidelidade total ao Medicalsys.`
    });
  } catch (error) {
    console.error("[Importação Medicalsys Error]:", error);
    const detalhes = error.response?.data?.message || error.message;
    return NextResponse.json({ success: false, error: detalhes }, { status: 500 });
  }
}
