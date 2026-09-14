import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { formatarTelefoneEnvio } from '@/lib/phoneUtils';

// Força a Vercel a não fazer cache desta rota (Obrigatório para Cron Jobs no App Router)
export const dynamic = 'force-dynamic';
// Define tempo máximo de execução na Vercel para evitar encerramento prematuro
export const maxDuration = 60;

export async function GET(request) {
  const startTime = Date.now();
  // Limite seguro de 25 segundos para garantir que a rota retorne antes do timeout da Vercel
  const MAX_EXECUTION_TIME_MS = 25000;
  let tempoLimiteAtingido = false;

  let enviadasCount = 0;
  let falhasCount = 0;
  let puladasSemUrlCount = 0;
  let baixasProcessadas = 0;
  let totalMensagensLote = 0;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Processar Fila] Credenciais do Supabase não encontradas nas variáveis de ambiente.');
      return NextResponse.json(
        { success: false, error: 'Credenciais do Supabase não configuradas.' },
        { status: 200 }
      );
    }

    // Inicializa o Supabase com a chave ADMIN para contornar o bloqueio de RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const agora = new Date().toISOString();

    // 1. Busca mensagens pendentes prontas para disparo (lote controlado de 25 para segurança de tempo)
    const { data: mensagens, error: errMensagens } = await supabaseAdmin
      .from('fila_mensagens')
      .select('*')
      .eq('status', 'pendente')
      .lte('data_hora_programada', agora)
      .order('data_hora_programada', { ascending: true })
      .limit(25);

    if (errMensagens) {
      console.error('[Processar Fila] Erro ao consultar fila_mensagens:', errMensagens.message);
      return NextResponse.json({
        success: false,
        error: `Erro ao consultar fila: ${errMensagens.message}`,
        disparos: 0,
        falhas: 0
      }, { status: 200 });
    }

    totalMensagensLote = mensagens?.length || 0;

    // 2. Busca todas as empresas cadastradas para carregar suas configurações e URLs
    const { data: todasEmpresas, error: errEmpresas } = await supabaseAdmin
      .from('empresas')
      .select('*');

    if (errEmpresas) {
      console.warn('[Processar Fila] Aviso ao carregar empresas:', errEmpresas.message);
    }

    const mapaEmpresas = new Map();
    let empresaFallbackId = null;

    (todasEmpresas || []).forEach((emp, index) => {
      if (index === 0) empresaFallbackId = emp.id;
      const configChaves = emp.config_chaves || {};
      const configCampos = emp.config_campos || {};
      const configWebhooks = configCampos.config_webhooks || configChaves.config_webhooks || {};

      const urlWhatsApp =
        emp.rmchat_webhook_url ||
        configChaves.rmchat_webhook_url ||
        configChaves.url_rmchat ||
        configCampos.rmchat_webhook_url ||
        null;

      const urlWebhookFluxo =
        configWebhooks.webhook_url ||
        configChaves.webhook_url_inteligente ||
        urlWhatsApp;

      mapaEmpresas.set(emp.id, {
        id: emp.id,
        nome: emp.nome,
        slug: emp.slug,
        urlWhatsApp: typeof urlWhatsApp === 'string' ? urlWhatsApp.trim() : null,
        urlWebhookFluxo: typeof urlWebhookFluxo === 'string' ? urlWebhookFluxo.trim() : null,
        webhookSecret: configWebhooks.webhook_secret || null,
        respostasMapping: configWebhooks.respostas_mapping || null,
        automacaoPresenca: configCampos.automacoes_presenca || configChaves.automacoes_presenca || null
      });
    });

    // 3. Processa cada mensagem com isolamento total de erros
    if (mensagens && mensagens.length > 0) {
      for (const msg of mensagens) {
        // Trava de segurança de tempo de execução
        if (Date.now() - startTime > MAX_EXECUTION_TIME_MS) {
          console.warn('[Processar Fila] Limite de tempo seguro atingido. Lote pausado para a próxima execução.');
          tempoLimiteAtingido = true;
          break;
        }

        try {
          const targetEmpresaId = msg.empresa_id || empresaFallbackId;
          const dadosEmpresa = targetEmpresaId ? mapaEmpresas.get(targetEmpresaId) : null;

          // Se a mensagem não possui empresa_id no banco, associa retroativamente
          if (!msg.empresa_id && targetEmpresaId) {
            try {
              await supabaseAdmin.from('fila_mensagens').update({ empresa_id: targetEmpresaId }).eq('id', msg.id);
            } catch (eUpEmp) {
              console.warn(`[Processar Fila] Aviso ao vincular empresa_id na mensagem ${msg.id}:`, eUpEmp?.message);
            }
          }

          const isWebhook = msg.tipo_envio === 'webhook';
          const rawDestino = msg.url_webhook_customizada || (isWebhook ? dadosEmpresa?.urlWebhookFluxo : dadosEmpresa?.urlWhatsApp);
          const urlDestino = typeof rawDestino === 'string' ? rawDestino.trim() : '';

          // ⚠️ REGRA DE SEGURANÇA: Se a clínica não possui URL de webhook configurada, marca como falha para não travar a fila
          if (!urlDestino || !urlDestino.startsWith('http')) {
            console.warn(`[Processar Fila] Mensagem ${msg.id} para ${msg.nome_paciente} sem URL configurada (Clínica: "${dadosEmpresa?.nome || 'Não identificada'}").`);
            puladasSemUrlCount++;
            await supabaseAdmin.from('fila_mensagens').update({ status: 'falha' }).eq('id', msg.id);
            continue;
          }

          // Formata o número de telefone sem o 9º dígito fixo (55 + DDD + 8 dígitos)
          const numeroLimpo = formatarTelefoneEnvio(msg.telefone_whatsapp);

          if (!numeroLimpo && !isWebhook) {
            console.warn(`[Processar Fila] Mensagem ${msg.id} sem telefone válido para envio via WhatsApp.`);
            falhasCount++;
            await supabaseAdmin.from('fila_mensagens').update({ status: 'falha' }).eq('id', msg.id);
            continue;
          }

          const headers = { 'Content-Type': 'application/json' };
          let payload;

          if (isWebhook) {
            headers['x-rmcare-event'] = 'fluxo_inteligente';
            if (dadosEmpresa?.webhookSecret) {
              headers['x-webhook-secret'] = dadosEmpresa.webhookSecret;
            }

            // Buscar dados adicionais do agendamento se disponível (com fallback seguro)
            let agInfo = null;
            if (msg.agendamento_id) {
              try {
                const { data: agData, error: errAg } = await supabaseAdmin
                  .from('agendamentos')
                  .select('*, pacientes(*)')
                  .eq('id', msg.agendamento_id)
                  .maybeSingle();

                if (!errAg && agData) {
                  agInfo = agData;
                } else {
                  const { data: agSimple } = await supabaseAdmin
                    .from('agendamentos')
                    .select('*')
                    .eq('id', msg.agendamento_id)
                    .maybeSingle();
                  agInfo = agSimple;
                }
              } catch (eAg) {
                console.warn('[Processar Fila] Aviso ao carregar detalhes do agendamento:', eAg?.message);
              }
            }

            const nomePacienteFinal = (agInfo?.pacientes?.nome_completo || msg.nome_paciente || 'Paciente').trim();

            payload = {
              evento: 'disparo_fluxo_inteligente',
              tipo_disparo: 'webhook',
              mensagem_id: msg.id,
              gatilho: msg.gatilho,
              empresa: {
                id: targetEmpresaId,
                nome: dadosEmpresa?.nome,
                slug: dadosEmpresa?.slug
              },
              agendamento: agInfo ? {
                id: agInfo.id,
                data: agInfo.data_agendamento,
                horario: agInfo.horario_agendamento,
                servico: agInfo.subtipo_exame || agInfo.medico_profissional || 'Atendimento',
                especialista: agInfo.medico_profissional,
                especialidade: agInfo.tipo_servico || 'Consulta',
                modalidade: agInfo.modalidade || 'Particular',
                status_atual: agInfo.status_atendimento || 'agendado'
              } : { id: msg.agendamento_id },
              paciente: {
                nome: nomePacienteFinal,
                nome_completo: nomePacienteFinal,
                primeiro_nome: nomePacienteFinal,
                telefone: numeroLimpo,
                cpf: agInfo?.pacientes?.cpf || null,
                enfermidades: agInfo?.pacientes?.enfermidades || []
              },
              mensagem: msg.mensagem,
              anexo_url: msg.anexo_url || null,
              opcoes_resposta: dadosEmpresa?.respostasMapping || {
                confirmar: ['1', 'sim', 'confirmo'],
                cancelar: ['2', 'nao', 'cancelar'],
                remarcar: ['3', 'remarcar', 'reagendar']
              },
              webhook_retorno_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://rmagenda.com.br'}/api/webhook-resposta`
            };
          } else {
            headers['x-rmcare-event'] = 'whatsapp_msg';
            let textoEnvio = msg.mensagem || '';
            if (msg.anexo_url && !textoEnvio.includes(msg.anexo_url)) {
              textoEnvio += `\n\n📎 Documento/Anexo: ${msg.anexo_url}`;
            }

            payload = {
              name: msg.nome_paciente || 'Paciente',
              number: numeroLimpo,
              phone: numeroLimpo,
              texto: textoEnvio,
              mensagem: textoEnvio,
              media_url: msg.anexo_url || null
            };
          }

          console.log(`[Processar Fila] Disparando (${isWebhook ? 'Webhook Inteligente' : 'WhatsApp'}) para ${msg.nome_paciente} (${numeroLimpo}) via ${urlDestino}`);

          // Disparo com fetch nativo e AbortController para timeout de 8 segundos por requisição
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);

          const resDisparo = await fetch(urlDestino, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (resDisparo.ok) {
            await supabaseAdmin.from('fila_mensagens').update({ status: 'enviada' }).eq('id', msg.id);
            enviadasCount++;
          } else {
            console.error(`[Processar Fila] Resposta HTTP ${resDisparo.status} ao disparar mensagem ${msg.id}`);
            await supabaseAdmin.from('fila_mensagens').update({ status: 'falha' }).eq('id', msg.id);
            falhasCount++;
          }
        } catch (errItem) {
          console.error(`[Processar Fila] Erro ao processar item ${msg.id}:`, errItem?.message || errItem);
          try {
            await supabaseAdmin.from('fila_mensagens').update({ status: 'falha' }).eq('id', msg.id);
          } catch (eUpFalha) {
            console.warn(`[Processar Fila] Não foi possível atualizar status para falha:`, eUpFalha?.message);
          }
          falhasCount++;
        }
      }
    }

    // 4. Processamento de Automações de Presença / Baixas Automáticas Pós-Horário
    try {
      // Data e hora corrente no fuso horário do Brasil (America/Sao_Paulo / UTC-3)
      const dataHoraBrasil = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
      const hojeDataStr = dataHoraBrasil.toISOString().substring(0, 10);
      const horaAtualMinutos = dataHoraBrasil.getHours() * 60 + dataHoraBrasil.getMinutes();

      for (const [empId, empConfig] of mapaEmpresas.entries()) {
        const autoPresenca = empConfig.automacaoPresenca;
        if (autoPresenca?.ativo) {
          const toleranciaMinutos = Number(autoPresenca.tolerancia_minutos || 60);
          const acaoPadrao = autoPresenca.acao_padrao || 'compareceu'; // 'compareceu' | 'nao_compareceu'

          // Busca agendamentos de hoje ou anteriores com status agendado ou confirmado
          const { data: agsPassados, error: errAgs } = await supabaseAdmin
            .from('agendamentos')
            .select('id, data_agendamento, horario_agendamento, status_atendimento')
            .eq('empresa_id', empId)
            .lte('data_agendamento', hojeDataStr)
            .in('status_atendimento', ['agendado', 'confirmado'])
            .limit(30);

          if (errAgs) {
            console.warn(`[Processar Fila] Erro ao buscar agendamentos passados para empresa ${empId}:`, errAgs.message);
            continue;
          }

          for (const ag of agsPassados || []) {
            let deveBaixar = false;

            if (ag.data_agendamento < hojeDataStr) {
              deveBaixar = true;
            } else if (ag.data_agendamento === hojeDataStr && ag.horario_agendamento) {
              const partesHora = String(ag.horario_agendamento).split(':');
              const horaAgMinutos = parseInt(partesHora[0] || '0', 10) * 60 + parseInt(partesHora[1] || '0', 10);
              if (horaAgMinutos + toleranciaMinutos <= horaAtualMinutos) {
                deveBaixar = true;
              }
            }

            if (deveBaixar) {
              try {
                const obsTexto = `[Baixa automática como "${acaoPadrao}" aplicada pelo sistema em ${dataHoraBrasil.toLocaleString('pt-BR')}]`;
                
                let { error: errUpAg } = await supabaseAdmin
                  .from('agendamentos')
                  .update({
                    status_atendimento: acaoPadrao,
                    compareceu_em: acaoPadrao === 'compareceu' ? new Date().toISOString() : null,
                    observacoes: obsTexto
                  })
                  .eq('id', ag.id);

                // Fallback caso a coluna compareceu_em ainda não exista no banco
                if (errUpAg && (errUpAg.code === '42703' || errUpAg.message?.includes('column'))) {
                  await supabaseAdmin
                    .from('agendamentos')
                    .update({
                      status_atendimento: acaoPadrao,
                      observacoes: obsTexto
                    })
                    .eq('id', ag.id);
                }
                baixasProcessadas++;
              } catch (eAg) {
                console.warn(`[Processar Fila] Falha ao dar baixa no agendamento ${ag.id}:`, eAg?.message);
              }
            }
          }
        }
      }
    } catch (errAuto) {
      console.warn('[Processar Fila] Aviso ao processar baixas automáticas:', errAuto?.message);
    }

    return NextResponse.json({
      success: true,
      disparos: enviadasCount,
      falhas: falhasCount,
      puladasSemUrl: puladasSemUrlCount,
      totalLote: totalMensagensLote,
      baixasAutomaticas: baixasProcessadas,
      tempoLimiteAtingido,
      duracaoMs: Date.now() - startTime
    }, { status: 200 });
  } catch (error) {
    console.error('❌ [Processar Fila] Erro geral capturado:', error?.message || error);
    // Retorna HTTP 200 com informações do erro para o cron-job.org considerar execução atendida
    // e evitar envio de e-mails recorrentes de "Cronjob failed: 500"
    return NextResponse.json({
      success: false,
      error: error?.message || 'Erro inesperado no processamento da fila',
      disparos: enviadasCount,
      falhas: falhasCount,
      duracaoMs: Date.now() - startTime
    }, { status: 200 });
  }
}

export async function POST(request) {
  return GET(request);
}

export async function HEAD(request) {
  return GET(request);
}
