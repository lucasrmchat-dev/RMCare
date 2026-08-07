"use client";
import { initMercadoPago } from '@mercadopago/sdk-react';
import axios from "axios";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { getMessageSchedule } from "@/lib/appointmentRules";

if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_MP_PUBLIC_KEY) {
  initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY, { locale: 'pt-BR' });
}

export const URL_WEBHOOK_PUSH = "https://acessoapi.rmchat.com.br/w/875a4a21-8b19-42f1-97d7-d420f72f4310";

// Substitui as variáveis {nome}, {servico}, etc.
export const parseTemplate = (template, variaveis) => {
  if (!template) return "";
  let texto = template;
  for (const [key, value] of Object.entries(variaveis)) {
    texto = texto.replace(new RegExp(`\\{${key}\\}`, 'g'), value || "");
  }
  return texto;
};

export const dispararPushRmChat = async (telefonePaciente, nomePaciente, textoPersonalizado) => {
  try {
    let num = telefonePaciente.replace(/\D/g, "");
    if (num.length === 11 && num.charAt(2) === '9') {
      num = num.substring(0, 2) + num.substring(3); 
    }
    const numeroLimpo = "55" + num;
    const payload = { name: nomePaciente, number: numeroLimpo, texto: textoPersonalizado };
    await axios.post(URL_WEBHOOK_PUSH, payload, { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error("❌ Falha RM Chat:", error);
  }
};

export const HORARIOS_BASE = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

export const masks = {
  cpf: (v) => v.replace(/\D/g, "").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})/, "$1-$2").replace(/(-\d{2})\d+?$/, "$1"),
  phone: (v) => v.replace(/\D/g, "").replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2").replace(/(-\d{4})\d+?$/, "$1"),
  date: (v) => v.replace(/\D/g, "").replace(/(\d{2})(\d)/, "$1/$2").replace(/(\d{2})(\d)/, "$1/$2").replace(/(\/\d{4})\d+?$/, "$1")
};

export const helpers = {
  isValidDate: (str) => {
    const reg = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[012])\/(19|20)\d\d$/;
    if (!reg.test(str)) return false;
    const [d, m, y] = str.split('/').map(Number);
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
  },
  toDBDate: (str) => str ? str.split('/').reverse().join('-') : null,
  getToday: () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)
};

export const schema = z.object({
  cpf: z.string().optional(),
  nome: z.string().min(2, "Informe seu nome"),
  sobrenome: z.string().optional(),
  telefone_whatsapp: z.string().optional(),
  data_nascimento: z.string().optional(),
  email: z.string().optional(),
  tipo_servico: z.string().optional(),
  especialidade: z.string().optional(),
  medico_profissional: z.string().optional(),
  subtipo_exame: z.string().optional(),
  modalidade: z.string().optional(),
  data_agendamento: z.string().optional(),
  horario_agendamento: z.string().optional(),
});

export const gerarData = (dataBase, diasSubtrair, horaEspecifica) => {
  const d = new Date(`${dataBase}T12:00:00-03:00`); 
  d.setDate(d.getDate() - diasSubtrair);
  if (horaEspecifica) {
    const [h, m] = horaEspecifica.split(':');
    d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
  }
  if (d.getTime() < Date.now()) return new Date(Date.now() + 60000).toISOString(); 
  return d.toISOString();
};

export const calcularDataLimite = (dataBase, dias, tipoContagem) => {
  let d = new Date(dataBase);
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

// Objeto recolocado para manter a compatibilidade com seus links antigos
export const mapaMedicos = {
  "1": { tipo: "Consulta", nome: "Dra. Simone" },
  "2": { tipo: "Consulta", nome: "Dr. Brilhante" },
  "3": { tipo: "Consulta", nome: "Dr. Tiago Lima" },
  "4": { tipo: "Consulta", nome: "Dr. Hugo Dyevy" },
  "5": { tipo: "Consulta", nome: "Dra. Candice" },
  "6": { tipo: "Exame", nome: "Endoscopia Digestiva Alta" },
  "7": { tipo: "Exame", nome: "Colonoscopia" }
};

// O NOVO MOTOR QUE LÊ O JSON DO BANCO E DISPARA TUDO
export const processarMensagensDinamicas = async (formData, empresaDados, agendamentoId = null) => {
  const { nome, telefone_whatsapp, data_agendamento, horario_agendamento, especialidade, medico_profissional, subtipo_exame } = formData;
  const servicoSelecionado = formData.tipo_servico === "Exame" ? subtipo_exame : medico_profissional;
  
  // Se não for um array (ou estiver vazio), encerra
  let regrasMensagens = empresaDados?.config_mensagens || [];
  if (!Array.isArray(regrasMensagens)) return;

  let mensagensParaFila = [];
  const dataFormatada = data_agendamento.split("-").reverse().join("/");
  
  const vars = { 
    nome: nome.trim(), 
    servico: servicoSelecionado, 
    especialidade: especialidade || "",
    data: dataFormatada, 
    hora: horario_agendamento 
  };

  for (const regra of regrasMensagens) {
    const alvo = regra.alvo || (regra.especialidade === "Todas" ? "Todas" : `especialidade:${regra.especialidade}`);
    const alvoValido = alvo === "Todas"
      || alvo === `especialidade:${especialidade}`
      || alvo === `servico:${servicoSelecionado}`
      || alvo === `tipo:${formData.tipo_servico}`;
    if (!alvoValido) continue;

    const textoFormatado = parseTemplate(regra.mensagem, vars);

    if (regra.gatilho === "imediato") {
      // Confirmação instantânea via webhook
      await dispararPushRmChat(telefone_whatsapp, vars.nome, textoFormatado);
    } else if (["agendado", "pos_atendimento"].includes(regra.gatilho)) {
      // Cria registro na fila_mensagens para N8N/Cron enviar depois
      const dataEnvioProgramado = regra.gatilho === "pos_atendimento"
        ? getMessageSchedule(regra, data_agendamento, horario_agendamento)
        : gerarData(data_agendamento, parseInt(regra.dias_antes), regra.hora_envio);
      
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

  // Insere todas as programadas de uma vez no banco
  if (mensagensParaFila.length > 0) {
    const { error } = await supabase.from('fila_mensagens').insert(mensagensParaFila);
    if (error) console.error("Erro ao inserir fila:", error);
  }
};
