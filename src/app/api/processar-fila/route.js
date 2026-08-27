import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { formatarTelefoneEnvio } from '@/lib/phoneUtils';

// Força a Vercel a não fazer cache desta rota (Obrigatório para Cron Jobs no App Router)
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Inicializa o Supabase com a chave ADMIN para contornar o bloqueio de RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const agora = new Date().toISOString();

    // 1. Busca mensagens pendentes prontas para disparo
    const { data: mensagens, error } = await supabaseAdmin
      .from('fila_mensagens')
      .select('*')
      .eq('status', 'pendente')
      .lte('data_hora_programada', agora)
      .limit(50);

    if (error) throw error;

    // 2. Busca todas as empresas cadastradas para carregar suas configurações e URLs
    const { data: todasEmpresas } = await supabaseAdmin
      .from('empresas')
      .select('*');

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
        urlWhatsApp: urlWhatsApp ? urlWhatsApp.trim() : null,
        urlWebhookFluxo: urlWebhookFluxo ? urlWebhookFluxo.trim() : null,
        webhookSecret: configWebhooks.webhook_secret || null,
        respostasMapping: configWebhooks.respostas_mapping || null,
        automacaoPresenca: configCampos.automacoes_presenca || configChaves.automacoes_presenca || null
      });
    });

    let enviadasCount = 0;
    let falhasCount = 0;
    let puladasSemUrlCount = 0;

    if (mensagens && mensagens.length > 0) {
      for (const msg of mensagens) {
        const targetEmpresaId = msg.empresa_id || empresaFallbackId;
        const dadosEmpresa = targetEmpresaId ? mapaEmpresas.get(targetEmpresaId) : null;

        // Se a mensagem não possui empresa_id no banco, associa retroativamente
        if (!msg.empresa_id && targetEmpresaId) {
          await supabaseAdmin.from('fila_mensagens').update({ empresa_id: targetEmpresaId }).eq('id', msg.id);
        }

        const isWebhook = msg.tipo_envio === 'webhook';
        const urlDestino = (msg.url_webhook_customizada || (isWebhook ? dadosEmpresa?.urlWebhookFluxo : dadosEmpresa?.urlWhatsApp))?.trim();

        // ⚠️ REGRA DE SEGURANÇA: Se a clínica não possui URL de webhook configurada, ignora
        if (!urlDestino || !urlDestino.startsWith('http')) {
          console.warn(`[Processar Fila] Mensagem ${msg.id} para ${msg.nome_paciente} ignorada: a clínica "${dadosEmpresa?.nome || 'Não identificada'}" não possui URL configurada.`);
          puladasSemUrlCount++;
          continue;
        }

        // Formata o número de telefone sem o 9º dígito fixo (55 + DDD + 8 dígitos)
        const numeroLimpo = formatarTelefoneEnvio(msg.telefone_whatsapp);

        try {
          let payload;
          const headers = { 'Content-Type': 'application/json' };

          if (isWebhook) {
            headers['x-rmcare-event'] = 'fluxo_inteligente';
            if (dadosEmpresa?.webhookSecret) {
              headers['x-webhook-secret'] = dadosEmpresa.webhookSecret;
            }

            // Buscar dados adicionais do agendamento se disponível
            let agInfo = null;
            if (msg.agendamento_id) {
              const { data: agData } = await supabaseAdmin
                .from('agendamentos')
                .select('*, pacientes(*)')
                .eq('id', msg.agendamento_id)
                .maybeSingle();
              agInfo = agData;
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
              textoEnvio += `

📎 Documento/Anexo: ${msg.anexo_url}`;
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

          await axios.post(urlDestino, payload, { headers, timeout: 15000 });

          // Atualiza o status no banco para 'enviada'
          await supabaseAdmin.from('fila_mensagens').update({ status: 'enviada' }).eq('id', msg.id);
          enviadasCount++;
        } catch (err) {
          console.error(`[Processar Fila] Erro ao enviar mensagem para ${msg.nome_paciente} via ${urlDestino}:`, err.message);
          falhasCount++;
        }
      }
    }

    // 3. Processamento de Automações de Presença / Baixas Automáticas Pós-Horário
    let baixasProcessadas = 0;
    try {
      const hojeDataStr = new Date().toISOString().substring(0, 10);
      const horaAtualStr = new Date().toTimeString().substring(0, 5);

      for (const [empId, empConfig] of mapaEmpresas.entries()) {
        const autoPresenca = empConfig.automacaoPresenca;
        if (autoPresenca?.ativo) {
          const toleranciaMinutos = Number(autoPresenca.tolerancia_minutos || 60);
          const acaoPadrao = autoPresenca.acao_padrao || 'compareceu'; // 'compareceu' | 'nao_compareceu'

          // Busca agendamentos de hoje com horário passado + tolerância
          const { data: agsPassados } = await supabaseAdmin
            .from('agendamentos')
            .select('id, data_agendamento, horario_agendamento, status_atendimento')
            .eq('empresa_id', empId)
            .lte('data_agendamento', hojeDataStr)
            .in('status_atendimento', ['agendado', 'confirmado'])
            .limit(40);

          for (const ag of agsPassados || []) {
            if (ag.data_agendamento < hojeDataStr || (ag.data_agendamento === hojeDataStr && ag.horario_agendamento <= horaAtualStr)) {
              await supabaseAdmin
                .from('agendamentos')
                .update({
                  status_atendimento: acaoPadrao,
                  compareceu_em: acaoPadrao === 'compareceu' ? new Date().toISOString() : null,
                  observacoes: `[Baixa automática como "${acaoPadrao}" aplicada pelo sistema em ${new Date().toLocaleString('pt-BR')}]`
                })
                .eq('id', ag.id);
              baixasProcessadas++;
            }
          }
        }
      }
    } catch (errAuto) {
      console.warn('[Processar Fila] Aviso ao processar baixas automáticas:', errAuto.message);
    }

    return NextResponse.json({
      success: true,
      disparos: enviadasCount,
      falhas: falhasCount,
      puladasSemUrl: puladasSemUrlCount,
      totalLote: mensagens?.length || 0,
      baixasAutomaticas: baixasProcessadas
    });
  } catch (error) {
    console.error('❌ Erro no processamento da fila de mensagens:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  return GET(request);
}

export async function HEAD(request) {
  return GET(request);
}
