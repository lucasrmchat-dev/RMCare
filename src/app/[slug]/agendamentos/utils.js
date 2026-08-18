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

// DISPARO DE PUSH PARA O SERVIDOR RM CHAT / WHATSAPP
export const dispararPushRmChat = async (telefone, nome, mensagem, urlWebhook) => {
  try {
    if (!urlWebhook) {
      console.warn("⚠️ Webhook WhatsApp / RM Chat não configurado.");
      return false;
    }

    let tel = String(telefone || "").replace(/\D/g, "");
    if (!tel) return false;
    if (!tel.startsWith("55") && (tel.length === 10 || tel.length === 11)) {
      tel = `55${tel}`;
    }

    const payload = {
      name: nome || "Paciente",
      number: tel,
      phone: tel,
      texto: mensagem,
      message: mensagem,
      text: mensagem
    };

    const res = await fetch(urlWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    return res.ok;
  } catch (err) {
    console.error("❌ Falha no disparo Push WhatsApp:", err);
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

// MOTOR DE CLASSIFICAÇÃO INTELIGENTE DE CATEGORIA (EXAMES VS CONSULTAS)
export const classificarAtendimento = (formData, empresaDados) => {
  const esp = (formData?.especialidade || "").trim();
  const sub = (formData?.subtipo_exame || "").trim();
  const prof = (formData?.medico_profissional || "").trim();
  const tipo = (formData?.tipo_servico || "").trim();
  const textoCompleto = `${esp} ${sub} ${prof} ${tipo}`.toLowerCase();

  // 1. Mapeamento explícito em especialidades_categorizadas
  const categorizadas = empresaDados?.config_campos?.especialidades_categorizadas || [];
  if (Array.isArray(categorizadas)) {
    const matchEsp = categorizadas.find(
      (c) =>
        (c.nome && (esp.toLowerCase() === c.nome.toLowerCase() || textoCompleto.includes(c.nome.toLowerCase())))
    );
    if (matchEsp?.categoria) return matchEsp.categoria.trim();
  }

  // 2. Se o tipo de serviço for Exame
  if (tipo === "Exame") return "Exames";
  if (tipo === "Consulta" || tipo === "Retorno") return "Consultas";

  // 3. Reconhecimento por procedimentos clássicos de exames
  const isExame = /(exame|endoscopia|colonoscopia|ultrassom|tomografia|ressonancia|raio-x|biopsia|ecocardiograma|eletrocardiograma|laboratorio|sangue|urina|preventivo)/i.test(textoCompleto);
  if (isExame) return "Exames";

  return "Consultas";
};

// CONTROLE DE IDEMPOTÊNCIA PARA EVITAR DUPLICAÇÃO DE MENSAGENS EM SESSÃO
const mensagensProcessadasCache = new Set();

// O MOTOR COMPLETO QUE PROCESSA TODAS AS CATEGORIAS, IDADE, ENFERMIDADES, NICHOS E DADOS DINÂMICOS
export const processarMensagensDinamicas = async (formData, empresaDados, agendamentoId = null, gatilhoFiltro = null, extraData = null) => {
  const { nome, telefone_whatsapp, data_agendamento, horario_agendamento, especialidade, medico_profissional, subtipo_exame, data_nascimento, tipo_servico } = formData || {};
  
  // Resolução inteligente do nome do especialista / profissional
  let nomeProfissional = medico_profissional || subtipo_exame || "";
  
  if (nomeProfissional && (/^\d+$/.test(nomeProfissional) || nomeProfissional.length < 3)) {
    try {
      if (empresaDados?.id) {
        const { data: srvs } = await supabase
          .from("servicos")
          .select("id, nome, codigo_uri, numero_especialista, especialidade")
          .eq("empresa_id", empresaDados.id);

        if (srvs && srvs.length > 0) {
          const srvMatch = srvs.find(
            (s) =>
              String(s.codigo_uri) === String(nomeProfissional) ||
              String(s.numero_especialista) === String(nomeProfissional) ||
              s.id === nomeProfissional
          );
          if (srvMatch) {
            nomeProfissional = srvMatch.nome;
          } else if (especialidade) {
            const srvEsp = srvs.find((s) => (s.especialidade || "").toLowerCase().includes(especialidade.toLowerCase()));
            if (srvEsp) nomeProfissional = srvEsp.nome;
          }
        }
      }
    } catch (e) {
      console.warn("Aviso ao resolver nome do profissional para mensagens:", e);
    }
  }

  const servicoSelecionado = subtipo_exame || especialidade || nomeProfissional;
  
  let regrasMensagens = empresaDados?.config_mensagens || [];
  if (!Array.isArray(regrasMensagens) || regrasMensagens.length === 0) return;

  let mensagensParaFila = [];
  const dataFormatada = data_agendamento ? data_agendamento.split("-").reverse().join("/") : "";
  const idadePaciente = calcularIdade(data_nascimento);

  // Classificação precisa da categoria (Exames vs Consultas vs Personalizada)
  const categoriaEfetiva = classificarAtendimento(formData, empresaDados);
  const isExame = categoriaEfetiva.toLowerCase().startsWith("exame") || /(exame|endoscopia|colonoscopia|ultrassom|biopsia)/i.test(`${especialidade} ${subtipo_exame} ${tipo_servico}`);

  // DADOS E VARIÁVEIS SUPORTADAS EM TODOS OS MODELOS
  const vars = { 
    nome: (nome || "").trim(), 
    servico: servicoSelecionado || "", 
    especialista: nomeProfissional || servicoSelecionado || "",
    especialidade: especialidade || (isExame ? (subtipo_exame || "Exame") : "Consulta"),
    categoria: categoriaEfetiva,
    tipo_servico: tipo_servico || (isExame ? "Exame" : "Consulta"),
    enfermidade: (Array.isArray(formData?.enfermidades) && formData.enfermidades.length > 0) ? formData.enfermidades.join(", ") : "",
    idade: idadePaciente !== null ? String(idadePaciente) : "",
    data: dataFormatada, 
    hora: horario_agendamento || "",
    valor: extraData?.valor ? `R$ ${Number(extraData.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "",
    chave_pix: extraData?.chave_pix || extraData?.qr_code || "",
    pix_copia_cola: extraData?.chave_pix || extraData?.qr_code || "",
    link_pagamento: extraData?.link_pagamento || ""
  };

  // Resolução da URL de Webhook do WhatsApp / RM Chat em todas as chaves possíveis
  const rmchatWebhookUrl =
    empresaDados?.rmchat_webhook_url ||
    empresaDados?.config_chaves?.rmchat_webhook_url ||
    empresaDados?.config_chaves?.url_rmchat ||
    empresaDados?.config_chaves?.webhook_url ||
    empresaDados?.config_campos?.rmchat_webhook_url ||
    empresaDados?.config_campos?.url_rmchat ||
    empresaDados?.config_campos?.whatsapp_webhook_url ||
    null;

  for (const regra of regrasMensagens) {
    if (gatilhoFiltro && regra.gatilho !== gatilhoFiltro) continue;

    // Chave única de deduplicação para garantir que a mesma regra não execute 2x no agendamento
    const dedupKey = `${agendamentoId || telefone_whatsapp}_${regra.id}_${regra.gatilho}_${data_agendamento}_${horario_agendamento}`;
    if (mensagensProcessadasCache.has(dedupKey)) {
      continue;
    }

    // 1. FILTRO DE ALVO / NICHO (Categoria Dinâmica, Especialidade ou Profissional)
    const alvo = (regra.alvo || (regra.especialidade === "Todas" ? "Todas" : `especialidade:${regra.especialidade}`)).trim();
    let alvoValido = false;

    if (!alvo || alvo === "Todas" || alvo === "todos") {
      alvoValido = true;
    } else if (alvo.startsWith("categoria:")) {
      const targetCat = alvo.replace("categoria:", "").toLowerCase().trim();
      const currCat = categoriaEfetiva.toLowerCase().trim();

      if (targetCat === currCat || currCat.includes(targetCat) || targetCat.includes(currCat)) {
        alvoValido = true;
      } else if ((targetCat === "exames" || targetCat === "exame") && isExame) {
        alvoValido = true;
      } else if ((targetCat === "consultas" || targetCat === "consulta") && !isExame) {
        alvoValido = true;
      }
    } else if (alvo.startsWith("tipo:")) {
      const targetTipo = alvo.replace("tipo:", "").toLowerCase().trim();
      if ((tipo_servico || "").toLowerCase().trim() === targetTipo) {
        alvoValido = true;
      } else if ((targetTipo === "exame" || targetTipo === "exames") && isExame) {
        alvoValido = true;
      } else if ((targetTipo === "consulta" || targetTipo === "consultas") && !isExame) {
        alvoValido = true;
      }
    } else if (alvo.startsWith("especialidade:")) {
      const targetEsp = alvo.replace("especialidade:", "").toLowerCase().trim();
      const currEsp = (especialidade || "").toLowerCase().trim();
      const currSub = (subtipo_exame || "").toLowerCase().trim();
      if (currEsp.includes(targetEsp) || targetEsp.includes(currEsp) || currSub.includes(targetEsp) || targetEsp.includes(currSub)) {
        alvoValido = true;
      }
    } else if (alvo.startsWith("servico:")) {
      const targetSrv = alvo.replace("servico:", "").toLowerCase().trim();
      const currProf = (nomeProfissional || medico_profissional || "").toLowerCase().trim();
      const currSub = (subtipo_exame || "").toLowerCase().trim();
      if (currProf.includes(targetSrv) || targetSrv.includes(currProf) || currSub.includes(targetSrv) || targetSrv.includes(currSub)) {
        alvoValido = true;
      }
    }

    if (!alvoValido) continue;

    // 2. FILTRO DE FAIXA ETÁRIA / IDADE DO PACIENTE
    if (regra.filtro_idade_tipo && regra.filtro_idade_tipo !== "todas") {
      if (idadePaciente === null) {
        continue;
      }
      if (regra.filtro_idade_tipo === "maior_que" && Number(regra.idade_minima) > 0) {
        if (idadePaciente < Number(regra.idade_minima)) continue;
      }
      if (regra.filtro_idade_tipo === "menor_que" && Number(regra.idade_maxima) > 0) {
        if (idadePaciente > Number(regra.idade_maxima)) continue;
      }
      if (regra.filtro_idade_tipo === "faixa") {
        const min = Number(regra.idade_minima || 0);
        const max = Number(regra.idade_maxima || 999);
        if (idadePaciente < min || idadePaciente > max) continue;
      }
    }

    // 3. FILTRO DE ENFERMIDADE ESPECÍFICA (SE MARCADA NA REGRA)
    if (regra.filtrar_enfermidade && regra.enfermidade_alvo) {
      const targetEnf = regra.enfermidade_alvo.toLowerCase().trim();
      let pacienteEnfermidades = [];

      if (Array.isArray(formData?.enfermidades)) {
        pacienteEnfermidades = formData.enfermidades;
      } else if (empresaDados?.config_campos?.pacientes_enfermidades && (formData?.cpf || agendamentoId)) {
        const mapEnf = empresaDados.config_campos.pacientes_enfermidades;
        pacienteEnfermidades = mapEnf[agendamentoId] || mapEnf[formData?.cpf] || [];
      }

      if (pacienteEnfermidades.length === 0 && formData?.cpf) {
        try {
          const { data: pacDB } = await supabase
            .from("pacientes")
            .select("enfermidades")
            .eq("cpf", formData.cpf)
            .maybeSingle();
          if (Array.isArray(pacDB?.enfermidades)) {
            pacienteEnfermidades = pacDB.enfermidades;
          }
        } catch (e) {
          // ignore
        }
      }

      const matchEnfermidade = pacienteEnfermidades.some(
        (enf) => (enf || "").toLowerCase().trim() === targetEnf
      );

      if (!matchEnfermidade) {
        continue;
      }
    }

    const textoFormatado = parseTemplate(regra.mensagem, vars);

    if (["imediato", "remarcado", "cancelado", "pagamento_aprovado", "antes_pagamento"].includes(regra.gatilho)) {
      if (telefone_whatsapp && rmchatWebhookUrl) {
        mensagensProcessadasCache.add(dedupKey);
        await dispararPushRmChat(telefone_whatsapp, vars.nome, textoFormatado, rmchatWebhookUrl);
      }
    } else if (["agendado", "pos_atendimento"].includes(regra.gatilho)) {
      mensagensProcessadasCache.add(dedupKey);
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

  if (mensagensParaFila.length > 0) {
    try {
      const { error } = await supabase.from('fila_mensagens').insert(mensagensParaFila);
      if (error) console.error("Erro ao inserir fila de mensagens:", error);
    } catch (e) {
      console.warn("Aviso ao salvar fila_mensagens:", e);
    }
  }
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
