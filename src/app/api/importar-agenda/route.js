import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { HttpsProxyAgent } from "https-proxy-agent";
import axios from "axios";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request) {
  try {
    // 1. PROXY FIXIE
    const proxyUrl = process.env.FIXIE_URL || "http://fixie:1c54Fc5I1jgmHG2@criterium.usefixie.com:80";
    const proxyAgent = new HttpsProxyAgent(proxyUrl);

    // 2. CALCULAR DATAS DE BUSCA
    const hoje = new Date();
    const dataDeHoje = hoje.toISOString().slice(0, 10);
    const anoAtual = hoje.getFullYear();
    const dataFimDeAno = `${anoAtual}-12-31`;

    let urlAtual = `https://gateway.medicalsys.com.br:9000/integracoes/agenda/?momento_inicio=${dataDeHoje}&momento_final=${dataFimDeAno}`;

    let todosAgendamentos = [];
    let limiteDePaginas = 0;

    console.log(`[Importação Medicalsys] Buscando agendamentos de ${dataDeHoje} até ${dataFimDeAno}...`);

    // 3. LOOP DE PAGINAÇÃO DA API MEDICALSYS
    while (urlAtual && limiteDePaginas < 50) {
      limiteDePaginas++;
      console.log(`Página ${limiteDePaginas}...`);

      const response = await axios.get(urlAtual, {
        httpsAgent: proxyAgent,
        proxy: false,
        headers: {
          "Content-Type": "application/json",
          "apikey": "8FxD2eUsODMO8IZWMHZaNpt78av9Vy6k",
          "msys-costumer-apikey": "SqdACjyxnXuYqL8ilnwTvXHroEOvFHFR"
        }
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

    // 4. BUSCAR EMPRESA E CONFIGURAÇÕES DE MAPEAMENTO DE COLUNAS
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
    const enviarMensagensErp = Boolean(configCampos.enviar_mensagens_importados_erp);
    const mapCols = configCampos.medicalsys_column_mapping || {
      convenio: "observacoes", // Se 'eliminar_coluna', descarta. Se 'observacoes', coloca em observações.
      especialidade: "especialidade"
    };

    // 5. CARREGAR REGISTROS JÁ EXISTENTES EM BLOQUEIOS_HORARIOS
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
    const mensagensErpParaFila = [];

    // 6. PROCESSAR CADA REGISTRO DO MEDICALSYS COM O MAPEAMENTO DE COLUNAS PERSONALIZADO
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

      // CPF do Paciente
      let cpfPaciente = item.cpf_paciente || item.cpf || null;
      if (!cpfPaciente && item.paciente && typeof item.paciente === "object" && item.paciente.cpf) {
        cpfPaciente = item.paciente.cpf;
      }

      // Médico / Especialista
      let medicoNome = "Não informado";
      if (item.medico && typeof item.medico === "object" && item.medico.nome) {
        medicoNome = item.medico.nome;
      } else if (Array.isArray(item.medico) && item.medico[1]?.nome) {
        medicoNome = item.medico[1].nome;
      } else if (typeof item.medico === "string") {
        medicoNome = item.medico;
      }

      // Mapeamento Dinâmico de Especialidade, Convênio e Observações
      let rawEspecialidade = item.especialidade?.nome || item.medico?.especialidade?.nome || null;
      let rawConvenio = item.convenio?.nome || (typeof item.convenio === "string" ? item.convenio : null);
      let rawObservacoes = item.observacoes || null;

      let finalEspecialidade = "Geral";
      let finalObservacoes = rawObservacoes;

      // Aplica regras de eliminação ou transferência de colunas configuradas pelo usuário
      if (mapCols.especialidade === "eliminar_coluna") {
        finalEspecialidade = "Geral";
      } else if (rawEspecialidade) {
        finalEspecialidade = rawEspecialidade;
      }

      if (mapCols.convenio === "especialidade" && rawConvenio) {
        finalEspecialidade = rawConvenio;
      } else if (mapCols.convenio === "observacoes" && rawConvenio) {
        finalObservacoes = finalObservacoes ? `${finalObservacoes} | Plano: ${rawConvenio}` : `Plano: ${rawConvenio}`;
      }

      let fone = item.tel_celular || item.paciente?.tel_celular || null;

      const payloadDado = {
        empresa_id: empresaId,
        data: item.momento,
        horario: horaInicioFormatada,
        horario_fim: horaFimFormatada,
        medico_profissional: medicoNome,
        nome_paciente: nomePaciente,
        cpf_paciente: cpfPaciente,
        especialidade: finalEspecialidade,
        telefone_paciente: fone,
        situacao: item.situacao || "agen",
        observacoes: finalObservacoes,
        meio_de_pagamento: item.meio_de_pagamento || "espe",
        medicalsys_id: item.id || null,
        status: "importado"
      };

      const existente = (item.id && mapaExistentesId.get(item.id)) || mapaExistentesChave.get(`${item.momento}|${horaInicioFormatada}|${medicoNome}`);

      if (existente) {
        await supabase
          .from("bloqueios_horarios")
          .update(payloadDado)
          .eq("id", existente.id);
        registrosAtualizados++;
      } else {
        registrosNovos.push(payloadDado);
      }

      if (enviarMensagensErp && fone) {
        const dataFormatada = item.momento.split("-").reverse().join("/");
        const msgTexto = `Olá ${nomePaciente}, confirmamos seu agendamento de ${finalEspecialidade} com ${medicoNome} no dia ${dataFormatada} às ${horaInicioFormatada}h.`;
        
        mensagensErpParaFila.push({
          empresa_id: empresaId,
          telefone_whatsapp: fone,
          nome_paciente: nomePaciente,
          mensagem: msgTexto,
          data_hora_programada: `${item.momento}T${horaInicioFormatada}:00-03:00`,
          status: "pendente",
          gatilho: "importado_erp"
        });
      }
    }

    if (registrosNovos.length > 0) {
      const { error: errInsert } = await supabase.from("bloqueios_horarios").insert(registrosNovos);
      if (errInsert) throw errInsert;
    }

    if (!enviarMensagensErp) {
      await supabase
        .from("fila_mensagens")
        .update({ status: "pausado_erp" })
        .eq("empresa_id", empresaId)
        .eq("gatilho", "importado_erp")
        .eq("status", "pendente");
    } else if (mensagensErpParaFila.length > 0) {
      await supabase.from("fila_mensagens").insert(mensagensErpParaFila);
    }

    return NextResponse.json({
      success: true,
      message: `Sincronização concluída: ${registrosNovos.length} novos e ${registrosAtualizados} existentes atualizados com o novo mapeamento de colunas!`
    });
  } catch (error) {
    console.error("[Importação Medicalsys Error]:", error);
    const detalhes = error.response?.data?.message || error.message;
    return NextResponse.json({ success: false, error: detalhes }, { status: 500 });
  }
}
