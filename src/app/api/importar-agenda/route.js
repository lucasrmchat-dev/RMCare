import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { HttpsProxyAgent } from "https-proxy-agent";
import axios from "axios"; // <-- IMPORTANDO O AXIOS

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request) {
  try {
    // 1. CONFIGURAÇÃO DO PROXY FIXIE
    const proxyUrl = process.env.FIXIE_URL || "http://fixie:1c54Fc5I1jgmHG2@criterium.usefixie.com:80";
    const proxyAgent = new HttpsProxyAgent(proxyUrl);

    // 2. CALCULA AS DATAS
    const hoje = new Date();
    const dataDeHoje = hoje.toISOString().slice(0, 10);
    const anoAtual = hoje.getFullYear();
    const dataFimDeAno = `${anoAtual}-12-31`;
    
    let urlAtual = `https://gateway.medicalsys.com.br:9000/integracoes/agenda/?momento_inicio=${dataDeHoje}&momento_final=${dataFimDeAno}`;
    
    let todosAgendamentos = [];
    let limiteDePaginas = 0; 
    
    console.log(`Buscando agendamentos de ${dataDeHoje} até ${dataFimDeAno}...`);

    // 3. LOOP PROTEGIDO PARA BAIXAR AS PÁGINAS
    while (urlAtual && limiteDePaginas < 50) {
      limiteDePaginas++;
      console.log(`Buscando página ${limiteDePaginas} em: ${urlAtual}`);

      // 🚀 AGORA VAI FUNCIONAR: Axios respeita o httpsAgent perfeitamente
      const response = await axios.get(urlAtual, {
        httpsAgent: proxyAgent,
        proxy: false, // Essencial: desliga o proxy padrão do axios para usar o agente customizado
        headers: {
          "Content-Type": "application/json",
          "apikey": "8FxD2eUsODMO8IZWMHZaNpt78av9Vy6k",
          "msys-costumer-apikey": "SqdACjyxnXuYqL8ilnwTvXHroEOvFHFR"
        }
      });

      // No Axios, o JSON da resposta já vem mastigado dentro de 'response.data'
      const dados = response.data;

      if (!Array.isArray(dados) && dados.results) {
        todosAgendamentos = todosAgendamentos.concat(dados.results);
        
        if (dados.next) {
          urlAtual = dados.next.replace("http://", "https://");
        } else {
          urlAtual = null;
        }
      } else if (Array.isArray(dados)) {
        todosAgendamentos = todosAgendamentos.concat(dados);
        urlAtual = null; 
      } else {
        urlAtual = null;
      }
    }

    if (todosAgendamentos.length === 0) {
      return NextResponse.json({ success: true, message: `Nenhum agendamento encontrado entre ${dataDeHoje} e ${dataFimDeAno}.` });
    }

    // 4. BUSCAR O QUE JÁ EXISTE NO SUPABASE PARA NÃO DUPLICAR
    const { data: agendamentosExistentes, error: erroBusca } = await supabase
      .from("bloqueios_horarios")
      .select("data, horario, medico_profissional");

    if (erroBusca) throw erroBusca;

    const mapaExistentes = new Set(
      agendamentosExistentes?.map(ag => `${ag.data}|${ag.horario}|${ag.medico_profissional}`) || []
    );

    // 🚀 NOVO PASSO: Buscar o ID da sua Empresa no banco
    const { data: empresa, error: erroEmpresa } = await supabase
      .from("empresas")
      .select("id")
      .limit(1)
      .single();

    if (erroEmpresa || !empresa) {
       throw new Error("Nenhuma empresa cadastrada no banco para vincular os agendamentos.");
    }
    const empresaId = empresa.id;

    // 5. FORMATAR E FILTRAR
    const registrosParaInserir = todosAgendamentos
      .map((item) => {
        const horaFormatada = item.horario_inicio ? item.horario_inicio.slice(0, 5) : "00:00"; 
        return {
          empresa_id: empresaId, // <-- INSERINDO O ID OBRIGATÓRIO AQUI
          data: item.momento, 
          horario: horaFormatada,
          medico_profissional: item.medico?.nome || "Não informado",
        };
      })
      .filter((item) => {
        if (item.data < dataDeHoje) return false;
        
        const chaveAPI = `${item.data}|${item.horario}|${item.medico_profissional}`;
        return !mapaExistentes.has(chaveAPI);
      });

    // 6. SALVAR NO BANCO DE DADOS
    if (registrosParaInserir.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: `Busca finalizada. Todos os ${todosAgendamentos.length} agendamentos até o fim do ano já estão sincronizados.` 
      });
    }

    const { error } = await supabase
      .from("bloqueios_horarios")
      .insert(registrosParaInserir);

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      message: `${registrosParaInserir.length} novos agendamentos (até o fim do ano) sincronizados com sucesso!` 
    });

  } catch (error) {
    console.error("Falha no processo de importação:", error);
    // Extraindo detalhes de erro caso a API continue barrando ou dê erro 500
    const detalhes = error.response?.data?.message || error.message;
    return NextResponse.json({ success: false, error: detalhes }, { status: 500 });
  }
}