"use client";

import { initMercadoPago } from '@mercadopago/sdk-react';
import axios from "axios";
import * as z from "zod";
import { supabase } from "@/lib/supabase";

if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_MP_PUBLIC_KEY) {
  initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY, { locale: 'pt-BR' });
}

export const URL_WEBHOOK_PUSH = "https://acessoapi.rmchat.com.br/w/875a4a21-8b19-42f1-97d7-d420f72f4310";

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

export const gerarMensagemConfirmacao = (nome, servico, data, hora, idade) => {
  const alertaIdade = idade >= 65 ? "\n⚠ Pacientes com 65 anos ou mais devem passar por uma consulta com um cardiologista ou anestesista antes de realizar o exame." : "";
  return `🩺 Confirmação de Agendamento – Clínica E-Gastro\nOlá! ${nome}\nSua ${servico} está agendada para:\n📅 Data: ${data}\n⏰ Horário: ${hora}\n📍 Endereço: Rua João Vieira Carneiro, 957, Pedro Gondim, João Pessoa – PB${alertaIdade}\n\n👉 Veja a localização no Google Maps: https://maps.app.goo.gl/zBF4TNLPVRnxWDcL8`;
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
  calcAge: (str) => {
    if (!str) return 0;
    const [d, m, y] = str.split('/').map(Number);
    return Math.abs(new Date(Date.now() - new Date(y, m - 1, d).getTime()).getUTCFullYear() - 1970);
  },
  toDBDate: (str) => str ? str.split('/').reverse().join('-') : null,
  getToday: () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)
};

export const schema = z.object({
  cpf: z.string().length(14, "O CPF precisa ter 14 dígitos"),
  nome: z.string().min(2, "Informe seu nome"),
  sobrenome: z.string().min(2, "Informe seu sobrenome"),
  telefone_whatsapp: z.string().min(14, "WhatsApp incompleto"),
  data_nascimento: z.string().refine(helpers.isValidDate, { message: "Data inválida" }),
  email: z.string().email("E-mail inválido"),
  tipo_servico: z.enum(["Consulta", "Retorno", "Exame"]).optional(),
  medico_profissional: z.string().optional(),
  subtipo_exame: z.string().optional(),
  modalidade: z.enum(["Particular", "Convênio"]).optional(),
  data_agendamento: z.string().optional(),
  horario_agendamento: z.string().optional(),
});

export const gerarData = (dataBase, horarioBase, diasSubtrair, horaEspecifica) => {
  const d = new Date(`${dataBase}T12:00:00-03:00`); 
  d.setDate(d.getDate() - diasSubtrair);
  if (horaEspecifica) {
    const [h, m] = horaEspecifica.split(':');
    d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
  } else if (horarioBase) {
    const [h, m] = horarioBase.split(':');
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

export const mapaMedicos = {
  "1": { tipo: "Consulta", nome: "Dra. Simone" },
  "2": { tipo: "Consulta", nome: "Dr. Brilhante" },
  "3": { tipo: "Consulta", nome: "Dr. Tiago Lima" },
  "4": { tipo: "Consulta", nome: "Dr. Hugo Dyevy" },
  "5": { tipo: "Consulta", nome: "Dra. Candice" },
  "6": { tipo: "Exame", nome: "Endoscopia Digestiva Alta" },
  "7": { tipo: "Exame", nome: "Colonoscopia" }
};

export const programarMensagensMedicas = async (formData) => {
  const { nome, telefone_whatsapp, data_agendamento, horario_agendamento, tipo_servico, subtipo_exame, medico_profissional } = formData;
  let mensagens = [];
  const dataFormatada = data_agendamento.split("-").reverse().join("/");
  const profName = tipo_servico === "Exame" ? subtipo_exame : medico_profissional;

  mensagens.push({
    telefone_whatsapp, nome_paciente: nome,
    data_hora_programada: gerarData(data_agendamento, horario_agendamento, 0, `${(parseInt(horario_agendamento.split(':')[0]) + 2).toString().padStart(2, '0')}:00`),
    mensagem: `Obrigada por escolher o E-Gastro! 💙 Se tiver qualquer dúvida ou precisar de suporte, é só nos chamar. Estamos aqui para ajudar sempre! Se for possível, você pode deixar um comentário sobre sua experiência? Isso nos ajuda a melhorar cada vez mais o nosso atendimento 🙏 ➡ https://share.google/uFFEOKCkCvbxZMRKU Agradecemos muito pela sua confiança! 💙`
  });

  if (tipo_servico === "Consulta" || tipo_servico === "Retorno") {
    mensagens.push({
      telefone_whatsapp, nome_paciente: nome,
      data_hora_programada: gerarData(data_agendamento, null, 1, "08:00"),
      mensagem: `Olá, ${nome}! Passando para lembrar da sua consulta agendada com ${profName} para amanhã, dia ${dataFormatada} às ${horario_agendamento}. Por favor, responda esta mensagem para confirmar sua presença.`
    });
  }

  if (tipo_servico === "Exame") {
    if (subtipo_exame === "Endoscopia Digestiva Alta") {
      mensagens.push({
        telefone_whatsapp, nome_paciente: nome, data_hora_programada: new Date(Date.now() + 120000).toISOString(),
        mensagem: `Olá, ${nome}. Sua Endoscopia foi pré-agendada! 📝\n\n*Orientações Importantes:*\n- É obrigatório jejum para o exame;\n- Venha com um acompanhante maior de 18 anos;\n- 🛑 *ATENÇÃO:* Se você faz uso de medicamentos para emagrecimento (Mounjaro, Ozempic, Wegovy), eles devem ser suspensos por 15 dias antes do exame.`
      });
      mensagens.push({
        telefone_whatsapp, nome_paciente: nome, data_hora_programada: gerarData(data_agendamento, null, 3, "08:00"),
        mensagem: `Olá! Seu exame de endoscopia digestiva alta está chegando. Por aqui já queremos garantir que tudo dê certo, então fique atento(a) ao preparo: ⚠ O exame exige jejum absoluto! Nos próximos dias, enviaremos lembretes com horários e detalhes do jejum. Se faz uso de medicações diariamente ou tiver alguma dúvida sobre seus remédios, nos avise. Lembre também de providenciar um(a) acompanhante maior de 18 anos para o dia do exame!`
      });
      mensagens.push({
        telefone_whatsapp, nome_paciente: nome, data_hora_programada: gerarData(data_agendamento, null, 1, "08:00"),
        mensagem: `Faltam 24 horas para sua endoscopia! Hoje, preste atenção ao jantar: 🍽 Se jantar carne, o jejum deve começar 12 horas antes do exame. 🥗 Se NÃO jantar carne, o jejum pode iniciar 8 horas antes. Lembre-se de não comer ou beber mais nada a partir do horário recomendado, nem mesmo água. Tenha certeza de que seu acompanhante está confirmado para o dia do exame! Se tomou medicação hoje, siga rigorosamente a orientação do seu médico.`
      });
      mensagens.push({
        telefone_whatsapp, nome_paciente: nome, data_hora_programada: gerarData(data_agendamento, null, 1, "20:00"),
        mensagem: `Está chegando a hora! Reforçando:\nSe consumiu carne no jantar, inicie seu jejum agora.\nSe não consumiu carne, você pode iniciar o jejum 8 horas antes do exame. A partir do início do jejum, não coma nem beba NADA, obs: noticia boa a agua ou agua de coco pode ser consumido ate 3 horas antes do exame. Qualquer dúvida de última hora, chame a gente!`
      });
      mensagens.push({
        telefone_whatsapp, nome_paciente: nome, data_hora_programada: gerarData(data_agendamento, null, 0, "06:00"),
        mensagem: `Hoje é o dia do seu exame de endoscopia! Lembre-se:\nO jejum precisa ser absoluto (inclusive água, balas, chicletes)\nTraga um documento com foto\n\nVenha SEM acessorios 💍 e objetos metálicos\nVenha acompanhado(a) por um adulto maior de 18 anos\nRoupas leves, (Bermuda, vestido…) 📍 Endereço da Clínica para sua Endoscopia: Rua João Vieira Carneiro, 957 Bairro: Pedro Gondim, João Pessoa - PB 👉 Clique aqui para abrir no Google Maps: https://maps.app.goo.gl/zBF4TNLPVRnxWDcL8 Se precisar de qualquer orientação para chegar até o local, estamos à disposição! 😊`
      });
    }

    if (subtipo_exame === "Colonoscopia") {
      mensagens.push({
        telefone_whatsapp, nome_paciente: nome, data_hora_programada: new Date(Date.now() + 120000).toISOString(),
        mensagem: `Guia de Preparo para Colonoscopia Com PICOPREP - e-GASTRO\n\nÉ fundamental que o intestino esteja sem resíduos fecais para que a colonoscopia possa ser realizada com segurança e qualidade. Com esse objetivo em mente, solicitamos seguir à risca as orientações abaixo...\n\nO QUE FAZER EM CASO DE NÁUSEAS, VÔMITOS OU DOR NA BARRIGA? Em caso de náuseas e/ou vômitos, VONAU 8 mg, 1 cp, via sublingual, podendo repetir a dose em 2 horas, se não melhorar. Em caso de cólicas na barriga, BUSCOPAN COMPOSTO ou BUSCODUO (para alérgicos à dipirona), 1 cp, via oral, podendo repetir a dose em 6 horas, se não melhorar.`
      });
    }

    if (subtipo_exame === "Retirada de Balão Gástrico") {
      mensagens.push({
        telefone_whatsapp, nome_paciente: nome, data_hora_programada: new Date(Date.now() + 120000).toISOString(),
        mensagem: `Estas são as orientações para a retirada do seu balão Gástrico: 🙂\n\nDieta 3 dias que antecedem a retirada do balão só LIQUIDOS RESTRITOS ( água, água de coco, chás, gatorate, suco coado, sorvete e picolé de fruta SEM LEITE, GELATINA e caldo de legumes COADO)☕\nTomar 1 litro de coca-cola ZERO nos 3 dias que antecedem a retirada( 1 litros a cada dia) 3\n. Tomar 01 cápsula de FLUCONAZOL 150mg 1 semana antes da retirada\nJejum de 12 horas antes da retirada ( só pode água até 3 horas antes do exame) ⚠\n\nVir acompanhado com um responsável 👫\nNão consumir proteínas ou suplementos. 🍖\n\nPode tomar as suas medicações rotineiras( pressão, diabetes, tireóide,...)💊\nDIGESAN capsula ou gotas vespera 3 x ao dia ( 35 gotas)\n3 dias antes dieta liquida clara restrita igual do inicio do balão.`
      });
    }
  }

  if(mensagens.length > 0){
     await supabase.from('fila_mensagens').insert(mensagens);
  }
};