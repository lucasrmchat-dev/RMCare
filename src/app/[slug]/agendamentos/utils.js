import { z } from "zod";
import { getMessageSchedule } from "@/lib/appointmentRules";
import { supabase } from "@/lib/supabase";

export const helpers = {
  getToday: () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },
  toDBDate: (dateStr) => {
    if (!dateStr) return null;
    const str = String(dateStr).trim();
    if (!str) return null;
    if (str.includes('/')) {
      const [d, m, y] = str.split('/');
      if (d && m && y) return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return str;
  },
  isValidDate: (dateStr) => {
    if (!dateStr || dateStr.length !== 10) return false;
    const [d, m, y] = dateStr.split('/').map(Number);
    if (!d || !m || !y) return false;
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d && y > 1900 && y <= new Date().getFullYear();
  }
};

export const masks = {
  cpf: (v = "") => v.replace(/\D/g, "").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2").substring(0, 14),
  phone: (v = "") => v.replace(/\D/g, "").replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2").substring(0, 15),
  date: (v = "") => v.replace(/\D/g, "").replace(/(\d{2})(\d)/, "$1/$2").replace(/(\d{2})(\d)/, "$1/$2").substring(0, 10),
  cardExpiry: (v = "") => v.replace(/\D/g, "").replace(/(\d{2})(\d)/, "$1/$2").substring(0, 5)
};

export const schema = z.object({
  cpf: z.string().optional().or(z.literal("")),
  nome: z.string().min(2, "Nome é obrigatório"),
  sobrenome: z.string().optional().or(z.literal("")),
  telefone_whatsapp: z.string().optional().or(z.literal("")),
  email: z.string().optional().or(z.literal("")),
  data_nascimento: z.string().optional().or(z.literal("")),
  tipo_servico: z.string().optional().or(z.literal("")),
  especialidade: z.string().optional().or(z.literal("")),
  medico_profissional: z.string().optional().or(z.literal("")),
  subtipo_exame: z.string().optional().or(z.literal("")),
  modalidade: z.string().optional().or(z.literal("")),
  data_agendamento: z.string().optional().or(z.literal("")),
  horario_agendamento: z.string().optional().or(z.literal(""))
});

export const parseTemplate = (tpl, data) => {
  if (!tpl) return "";
  return tpl.replace(/{(\w+)}/g, (_, k) => data[k] !== undefined ? data[k] : `{${k}}`);
};

// DISPARO DE PUSH PARA O SERVIDOR RM CHAT / WHATSAPP (VIA ROTA SEGURA NO BACKEND)
export const dispararPushRmChat = async (telefone, nome, mensagem, urlWebhook, contextData = {}) => {
  try {
    const payload = {
      empresaId: contextData.empresaId || null,
      slug: contextData.slug || null,
      telefone: telefone,
      nome: nome,
      mensagem: mensagem,
      urlWebhook: urlWebhook || null
    };

    console.log("📡 [DISPARO WHATSAPP] Enviando requisição para /api/disparar-webhook...", {
      paciente: nome,
      telefone: telefone
    });

    const res = await fetch("/api/disparar-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (!res.ok || !result.success) {
      console.error("❌ [DISPARO WHATSAPP ERRO] Falha no envio:", {
        statusHttp: res.status,
        detalhes: result
      });
      return false;
    }

    console.log("✅ [DISPARO WHATSAPP SUCESSO] Mensagem entregue com sucesso!", result);
    return true;
  } catch (err) {
    console.error("❌ [DISPARO WHATSAPP ERRO CRÍTICO]:", err);
    return false;
  }
};

export const gerarData = (dataBase, dias, hora) => {
  const d = new Date(`${dataBase}T${hora || "08:00"}:00-03:00`);
  d.setDate(d.getDate() - dias);
  return d.toISOString();
};

export const gerarDataPosAtendimento = (dataBase, dias, hora) => {
  const d = new Date(`${dataBase}T${hora || "08:00"}:00-03:00`);
  const diasSoma = parseInt(dias || 1, 10);
  d.setDate(d.getDate() + diasSoma);
  return d.toISOString();
};

export const calcularDataLimite = (dataInicio, dias, tipoContagem) => {
  let d = new Date(dataInicio);
  d.setHours(0, 0, 0, 0);
  let diasAdicionados = 0;
  while (diasAdicionados < dias) {
    d.setDate(d.getDate() + 1);
    if (tipoContagem === "uteis") {
      if (d.getDay() !== 0 && d.getDay() !== 6) diasAdicionados++; 
    } else {
      diasAdicionados++;
    }
  }
  return d;
};

// HELPER PARA CALCULAR IDADE A PARTIR DA DATA DE NASCIMENTO
export const calcularIdade = (dataNasc) => {
  if (!dataNasc) return null;
  let d, m, y;
  if (dataNasc.includes("/")) [d, m, y] = dataNasc.split("/").map(Number);
  else if (dataNasc.includes("-")) [y, m, d] = dataNasc.split("-").map(Number);
  if (!y || !m || !d || isNaN(y) || isNaN(m) || isNaN(d)) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - y;
  const mesAtual = hoje.getMonth() + 1;
  if (mesAtual < m || (mesAtual === m && hoje.getDate() < d)) idade--;
  return idade;
};

// MOTOR DE CLASSIFICAÇÃO INTELIGENTE E ESTRITA DE CATEGORIA (EXAMES VS CONSULTAS)
export const classificarAtendimento = (formData, empresaDados) => {
  const esp = (formData?.especialidade || "").trim();
  const sub = (formData?.subtipo_exame || "").trim();
  const prof = (formData?.medico_profissional || "").trim();
  const tipo = (formData?.tipo_servico || "").trim();

  // 1. Mapeamento explícito cadastrado no Painel da Clínica (especialidades_categorizadas)
  const categorizadas = empresaDados?.config_campos?.especialidades_categorizadas || [];
  if (Array.isArray(categorizadas) && categorizadas.length > 0) {
    const matchEsp = categorizadas.find((c) => {
      if (!c.nome) return false;
      const cNome = c.nome.toLowerCase().trim();
      return (
        (esp && esp.toLowerCase().trim() === cNome) ||
        (sub && sub.toLowerCase().trim() === cNome) ||
        (prof && prof.toLowerCase().trim() === cNome)
      );
    });
    if (matchEsp?.categoria) {
      const catNorm = matchEsp.categoria.toLowerCase().trim();
      return catNorm.includes("exame") ? "Exames" : "Consultas";
    }
  }

  // 2. Se o tipo de serviço for explicitamente Consulta ou Retorno
  if (tipo === "Consulta" || tipo === "Retorno") return "Consultas";
  if (tipo === "Exame") return "Exames";

  // 3. Reconhecimento estrito por especialidade de consulta clássica
  const isConsultaClassica = /(nutri|psico|gastro|cirurgi|cardio|pediatra|clinico|endocrino|ortoped|dermato|ginecolog|oftalmo|urolog|neurolog)/i.test(esp);
  if (isConsultaClassica) return "Consultas";

  // 4. Reconhecimento por procedimentos clássicos de exames
  const isExameClassico = /(exame|endoscopia|colonoscopia|ultrassom|tomografia|ressonancia|raio-x|biopsia|ecocardiograma|eletrocardiograma|laboratorio|sangue|urina|preventivo)/i.test(`${esp} ${sub}`);
  if (isExameClassico) return "Exames";

  return "Consultas";
};

// CONTROLE DE IDEMPOTÊNCIA COM TIMESTAMP PARA EVITAR DUPLICAÇÃO DE MENSAGENS
const mensagensProcessadasHistorico = new Map();

// MOTOR COMPLETO DE PROCESSAMENTO E DISPARO DE MENSAGENS WHATSAPP
export const processarMensagensDinamicas = async (formData, empresaDados, agendamentoId = null, gatilhoFiltro = null, extraData = null) => {
  console.group("🚀 [PROCESSAR MENSAGENS WHATSAPP]");
  console.log("📌 Dados do Agendamento:", { formData, agendamentoId, gatilhoFiltro });

  const {
    nome,
    telefone_whatsapp,
    data_agendamento,
    horario_agendamento,
    especialidade,
    medico_profissional,
    subtipo_exame,
    data_nascimento,
    tipo_servico
  } = formData || {};

  // 1. CLASSIFICAÇÃO DA CATEGORIA (Exames vs Consultas)
  const categoriaEfetiva = classificarAtendimento(formData, empresaDados);
  const isExame = categoriaEfetiva === "Exames";

  // 2. RESOLUÇÃO COMPLETA DO NOME DO PROFISSIONAL (BUSCANDO APENAS SERVIÇOS ATIVOS DA CLÍNICA)
  let nomeProfissionalOficial = medico_profissional || "";

  try {
    if (empresaDados?.id) {
      const { data: servicosClinica } = await supabase
        .from("servicos")
        .select("id, nome, codigo_uri, numero_especialista, especialidade, tipo, ativo")
        .eq("empresa_id", empresaDados.id)
        .neq("ativo", false);

      if (Array.isArray(servicosClinica) && servicosClinica.length > 0) {
        const cleanTarget = String(nomeProfissionalOficial).trim().toLowerCase();

        // A. Busca exata por código URI (ex: codigo_uri === "8" ou numero_especialista === 8)
        let srvEncontrado = servicosClinica.find(
          (s) =>
            cleanTarget &&
            (String(s.codigo_uri || "").trim().toLowerCase() === cleanTarget ||
             String(s.numero_especialista || "").trim() === cleanTarget ||
             String(s.id || "").trim() === cleanTarget)
        );

        // B. Se não achou e o nome recebido for número ou vazio, busca pelo nome do profissional ativo
        if (!srvEncontrado && nomeProfissionalOficial && !/^\d+$/.test(nomeProfissionalOficial)) {
          const cleanInput = nomeProfissionalOficial.toLowerCase().replace(/dra\.|dr\./g, "").trim();
          srvEncontrado = servicosClinica.find((s) => {
            const cleanSrv = (s.nome || "").toLowerCase().replace(/dra\.|dr\./g, "").trim();
            return cleanSrv.includes(cleanInput) || cleanInput.includes(cleanSrv);
          });
        }

        // C. Se ainda não achou e tem especialidade informada
        if (!srvEncontrado && especialidade) {
          srvEncontrado = servicosClinica.find((s) => {
            const espSrv = (s.especialidade || "").toLowerCase();
            const espAlvo = especialidade.toLowerCase().trim();
            return espSrv.includes(espAlvo) || espAlvo.includes(espSrv);
          });
        }

        if (srvEncontrado?.nome) {
          nomeProfissionalOficial = srvEncontrado.nome;
        }
      }
    }
  } catch (errResolve) {
    console.warn("Aviso ao resolver nome do profissional:", errResolve);
  }

  // Se o profissional ainda for um número puro (ex: "8"), limpa para não exibir número feio
  if (/^\d+$/.test(nomeProfissionalOficial)) {
    nomeProfissionalOficial = "";
  }

  // 3. DEFINIÇÃO DAS VARIÁVEIS DO TEMPLATE
  const dataFormatada = data_agendamento ? data_agendamento.split("-").reverse().join("/") : "";
  const idadePaciente = calcularIdade(data_nascimento);

  // Nome do procedimento / exame (ex: Colonoscopia, Endoscopia)
  const nomeProcedimento = subtipo_exame || especialidade || (isExame ? "Exame" : "Consulta");

  // Nome do médico / especialista responsável (ex: Tiago Lima, Maria Aparecida Gouveia)
  const nomeEspecialista = nomeProfissionalOficial || (isExame ? "Corpo Clínico" : (especialidade || "Especialista Clínico"));

  // Para garantir que "{servico}" nunca repita "Colonoscopia com Colonoscopia":
  // Se o template disser "Seu exame com {servico}", "{servico}" refere-se ao Especialista quando houver profissional definido!
  const servicoValor = nomeProfissionalOficial || nomeProcedimento;

  const vars = {
    nome: (nome || "").trim(),
    servico: servicoValor,
    especialista: nomeEspecialista,
    medico: nomeEspecialista,
    profissional: nomeEspecialista,
    procedimento: nomeProcedimento,
    exame: isExame ? nomeProcedimento : "",
    subtipo_exame: isExame ? nomeProcedimento : "",
    especialidade: especialidade || nomeProcedimento,
    categoria: categoriaEfetiva,
    tipo_servico: isExame ? "Exame" : "Consulta",
    enfermidade: (Array.isArray(formData?.enfermidades) && formData.enfermidades.length > 0) ? formData.enfermidades.join(", ") : "",
    idade: idadePaciente !== null ? String(idadePaciente) : "",
    data: dataFormatada,
    hora: horario_agendamento || "",
    valor: extraData?.valor ? `R$ ${Number(extraData.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "",
    chave_pix: extraData?.chave_pix || extraData?.qr_code || "",
    pix_copia_cola: extraData?.chave_pix || extraData?.qr_code || "",
    link_pagamento: extraData?.link_pagamento || ""
  };

  console.log("🏷️ Classificação Final:", {
    categoriaEfetiva,
    isExame,
    profissional: vars.especialista,
    servico: vars.servico,
    especialidade: vars.especialidade,
    procedimento: vars.procedimento
  });

  // 4. REGRAS DE MENSAGENS CONFIGURADAS
  const regrasMensagens = empresaDados?.config_mensagens || [];
  if (!Array.isArray(regrasMensagens) || regrasMensagens.length === 0) {
    console.warn("⚠️ Nenhuma regra de mensagem cadastrada.");
    console.groupEnd();
    return;
  }

  const rmchatWebhookUrl =
    empresaDados?.rmchat_webhook_url ||
    empresaDados?.config_chaves?.rmchat_webhook_url ||
    empresaDados?.config_chaves?.url_rmchat ||
    empresaDados?.config_chaves?.webhook_url ||
    empresaDados?.config_campos?.rmchat_webhook_url ||
    empresaDados?.config_campos?.url_rmchat ||
    empresaDados?.config_campos?.whatsapp_webhook_url ||
    null;

  let mensagensParaFila = [];

  for (const [idx, regra] of regrasMensagens.entries()) {
    const alvo = (regra.alvo || (regra.especialidade === "Todas" ? "Todas" : `especialidade:${regra.especialidade}`)).trim();
    console.log(`🔍 [Regra #${idx + 1}] Gatilho: "${regra.gatilho}" | Alvo: "${alvo}"`);

    // Regras com gatilho "remarcado" ou "cancelado" NÃO devem disparar na hora do agendamento novo
    if (!gatilhoFiltro && ["remarcado", "cancelado"].includes(regra.gatilho)) {
      console.log(`⏩ [Regra #${idx + 1}] Ignorada: gatilho (${regra.gatilho}) só deve disparar em ação explícita de ${regra.gatilho}.`);
      continue;
    }

    // Filtro de gatilho específico quando passado
    if (gatilhoFiltro && regra.gatilho !== gatilhoFiltro) {
      console.log(`⏩ [Regra #${idx + 1}] Ignorada por gatilho (${regra.gatilho} !== ${gatilhoFiltro})`);
      continue;
    }

    // 5. TRAVA DE DEDUPLICAÇÃO TEMPORAL (60 segundos por chave única)
    const dedupKey = `${agendamentoId || telefone_whatsapp}_${regra.id || idx}_${regra.gatilho}_${data_agendamento}_${horario_agendamento}`;
    const ultimoEnvio = mensagensProcessadasHistorico.get(dedupKey);
    const agoraMs = Date.now();

    if (ultimoEnvio && (agoraMs - ultimoEnvio < 60000)) {
      console.log(`⏩ [Regra #${idx + 1}] Ignorada por deduplicação (já disparada nos últimos 60s)`);
      continue;
    }

    // 6. VALIDAÇÃO ESTRITA E ISOLADA DE ALVO (SEM CASAMENTO CRUZADO INDESEJADO)
    let alvoValido = false;

    // Helper de normalização (remove acentos, símbolos e espaços)
    const norm = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

    if (!alvo || alvo === "Todas" || alvo === "todos") {
      // Se for regra global "Todas", bloqueia envio de mensagens de preparo de exame (PICOPREP, etc.) para consultas!
      const msgLower = (regra.mensagem || "").toLowerCase();
      const contemPreparoExame = /(picoprep|laxante|lavagem|colonoscopia|endoscopia|jejum absoluto|laudo de exame)/i.test(msgLower);
      if (contemPreparoExame && !isExame) {
        console.log(`⛔ [Regra #${idx + 1}] BLOQUEADA: Regra global com preparo de exame não pode ser enviada para consulta.`);
        continue;
      }
      alvoValido = true;
    } else if (alvo.startsWith("categoria:")) {
      const targetCat = norm(alvo.replace("categoria:", ""));
      const isTargetExame = targetCat.includes("exame");
      const isTargetConsulta = targetCat.includes("consulta");

      if (isTargetExame && isExame) {
        alvoValido = true;
      } else if (isTargetConsulta && !isExame) {
        alvoValido = true;
      } else {
        console.log(`⛔ [Regra #${idx + 1}] BLOQUEADA POR CATEGORIA: Regra é "${targetCat}", mas atendimento é "${categoriaEfetiva}".`);
        continue;
      }
    } else if (alvo.startsWith("tipo:")) {
      const targetTipo = norm(alvo.replace("tipo:", ""));
      if (targetTipo.includes("exame") && isExame) alvoValido = true;
      else if (targetTipo.includes("consulta") && !isExame) alvoValido = true;
      else continue;
    } else if (alvo.startsWith("especialidade:")) {
      const targetEsp = norm(alvo.replace("especialidade:", ""));
      const currEsp = norm(especialidade);
      const currSub = norm(subtipo_exame);

      // Casamento ESTRITO e EXATO (evita que "Colonoscopia" case com "Endoscopia + Colonoscopia")
      if (currEsp === targetEsp || (isExame && currSub === targetEsp)) {
        alvoValido = true;
      } else {
        console.log(`⛔ [Regra #${idx + 1}] BLOQUEADA POR ESPECIALIDADE: Esperada="${targetEsp}", Atual="${currEsp}".`);
        continue;
      }
    } else if (alvo.startsWith("servico:")) {
      const targetSrv = norm(alvo.replace("servico:", ""));
      const currProf = norm(nomeProfissionalOficial);
      const currSub = norm(subtipo_exame);

      // Casamento ESTRITO por profissional ou exame
      if (currProf === targetSrv || currProf.includes(targetSrv) || targetSrv.includes(currProf) || (isExame && currSub === targetSrv)) {
        alvoValido = true;
      } else {
        console.log(`⛔ [Regra #${idx + 1}] BLOQUEADA POR SERVIÇO: Esperado="${targetSrv}", Prof="${currProf}".`);
        continue;
      }
    }

    if (!alvoValido) {
      continue;
    }

    // 7. FILTROS DE IDADE E ENFERMIDADE
    if (regra.filtro_idade_tipo && regra.filtro_idade_tipo !== "todas") {
      if (idadePaciente === null) continue;
      if (regra.filtro_idade_tipo === "maior_que" && Number(regra.idade_minima) > 0 && idadePaciente < Number(regra.idade_minima)) continue;
      if (regra.filtro_idade_tipo === "menor_que" && Number(regra.idade_maxima) > 0 && idadePaciente > Number(regra.idade_maxima)) continue;
      if (regra.filtro_idade_tipo === "faixa") {
        const min = Number(regra.idade_minima || 0);
        const max = Number(regra.idade_maxima || 999);
        if (idadePaciente < min || idadePaciente > max) continue;
      }
    }

    if (regra.filtrar_enfermidade && regra.enfermidade_alvo) {
      const targetEnf = norm(regra.enfermidade_alvo);
      let pacienteEnfermidades = Array.isArray(formData?.enfermidades) ? formData.enfermidades : [];
      const matchEnf = pacienteEnfermidades.some((e) => norm(e) === targetEnf);
      if (!matchEnf) continue;
    }

    // 8. FORMATAÇÃO E DISPARO
    const textoFormatado = parseTemplate(regra.mensagem, vars);
    console.log(`✨ [Regra #${idx + 1}] Mensagem aprovada para disparo:`, textoFormatado);

    mensagensProcessadasHistorico.set(dedupKey, Date.now());

    if (["imediato", "remarcado", "cancelado", "pagamento_aprovado", "antes_pagamento"].includes(regra.gatilho)) {
      if (telefone_whatsapp) {
        await dispararPushRmChat(telefone_whatsapp, vars.nome, textoFormatado, rmchatWebhookUrl, {
          empresaId: empresaDados?.id,
          slug: empresaDados?.slug
        });
      }
    } else if (["agendado", "pos_atendimento"].includes(regra.gatilho)) {
      const dataEnvioProgramado = regra.gatilho === "pos_atendimento"
        ? gerarDataPosAtendimento(data_agendamento, parseInt(regra.dias_depois || regra.dias_antes || 1, 10), regra.hora_envio)
        : gerarData(data_agendamento, parseInt(regra.dias_antes || 1, 10), regra.hora_envio);

      mensagensParaFila.push({
        empresa_id: empresaDados.id,
        agendamento_id: agendamentoId,
        telefone_whatsapp,
        nome_paciente: vars.nome,
        mensagem: textoFormatado,
        data_hora_programada: dataEnvioProgramado,
        status: "pendente",
        gatilho: regra.gatilho
      });
    }
  }

  // 9. INSERÇÃO NA FILA DE MENSAGENS PROGRAMADAS COM DEDUPLICAÇÃO
  if (mensagensParaFila.length > 0) {
    try {
      const { error } = await supabase.from("fila_mensagens").insert(mensagensParaFila);
      if (error) console.error("Erro ao inserir na fila_mensagens:", error);
      else console.log(`✅ ${mensagensParaFila.length} mensagem(ns) enfileirada(s) com sucesso.`);
    } catch (e) {
      console.warn("Aviso ao salvar fila_mensagens:", e);
    }
  }

  console.groupEnd();
};

// ENVIAR PARA MEDICALSYS SE HABILITADO
export const enviarParaMedicalsysSeHabilitado = async (formData, empresaDados, agendamentoId = null) => {
  try {
    const nomePaciente = `${formData.nome || ""} ${formData.sobrenome || ""}`.trim();
    const confCampos = empresaDados?.config_campos || {};
    const modalidadeEfetiva = formData.modalidade 
      || (confCampos.ocultar_modalidade ? (confCampos.modalidade_padrao || "Convênio") : (confCampos.modalidade_padrao || "Particular"));
    const isConvenio = modalidadeEfetiva === "Convênio" || modalidadeEfetiva?.toLowerCase().includes("conv");

    const payload = {
      appointmentId: agendamentoId,
      empresaId: empresaDados?.id,
      nomePaciente: nomePaciente || "Paciente Online",
      telefoneCelular: formData.telefone_whatsapp || "",
      data: formData.data_agendamento,
      horarioInicio: formData.horario_agendamento,
      medico: formData.medico_profissional || formData.subtipo_exame,
      meioPagamento: isConvenio ? "conv" : "espe"
    };

    const res = await fetch("/api/medicalsys/agendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    return result;
  } catch (err) {
    console.error("❌ Erro ao enviar para Medicalsys:", err);
    return { success: false, error: err.message };
  }
};
