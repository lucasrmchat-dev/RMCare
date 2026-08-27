import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { formatarTelefoneEnvio } from '@/lib/phoneUtils';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      empresaId,
      slug,
      telefone,
      nome,
      nome_completo,
      mensagem,
      urlWebhook: urlDireta,
      tipo_disparo = 'whatsapp',
      gatilho = 'imediato',
      agendamento = {},
      paciente = {}
    } = body || {};

    const nomeFinal = (nome_completo || nome || paciente.nome_completo || paciente.nome || 'Paciente').trim();

    const numeroLimpo = formatarTelefoneEnvio(telefone || paciente.telefone);
    if (!numeroLimpo && tipo_disparo !== 'webhook') {
      return NextResponse.json({ success: false, error: 'Telefone do paciente não informado.' }, { status: 400 });
    }

    let targetUrl = urlDireta;
    let emp = null;

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Se a URL direta não veio ou para obter dados da empresa
    if (!targetUrl || !targetUrl.startsWith('http') || empresaId || slug) {
      let query = supabaseAdmin.from('empresas').select('*');
      if (empresaId) query = query.eq('id', empresaId);
      else if (slug) query = query.eq('slug', slug);
      else query = query.limit(1);

      const { data: empData, error: empErr } = await query.maybeSingle();
      if (!empErr && empData) {
        emp = empData;
      }
    }

    if (!targetUrl || !targetUrl.startsWith('http')) {
      if (emp) {
        const configWebhooks = emp.config_campos?.config_webhooks || emp.config_chaves?.config_webhooks || {};
        const urlWebhookPadrao =
          emp.rmchat_webhook_url ||
          emp.config_chaves?.rmchat_webhook_url ||
          emp.config_chaves?.url_rmchat ||
          emp.config_chaves?.webhook_url ||
          emp.config_campos?.rmchat_webhook_url;

        const urlWebhookFluxoInteligente =
          configWebhooks.webhook_url ||
          emp.config_chaves?.webhook_url_inteligente ||
          urlWebhookPadrao;

        targetUrl = tipo_disparo === 'webhook' ? urlWebhookFluxoInteligente : urlWebhookPadrao;
      }
    }

    if (!targetUrl || !targetUrl.startsWith('http')) {
      console.warn('⚠️ [API disparar-webhook] Webhook não configurado no banco para esta clínica.');
      return NextResponse.json({
        success: false,
        error: tipo_disparo === 'webhook' ? 'Webhook não está configurado na clínica.' : 'Servidor do WhatsApp / RM Chat não configurado.',
        code: 'WEBHOOK_NOT_CONFIGURED'
      }, { status: 400 });
    }

    let payload;
    const headers = { 'Content-Type': 'application/json' };

    if (tipo_disparo === 'webhook') {
      headers['x-rmcare-event'] = 'fluxo_inteligente';
      const configWebhooks = emp?.config_campos?.config_webhooks || emp?.config_chaves?.config_webhooks || {};
      if (configWebhooks.webhook_secret) {
        headers['x-webhook-secret'] = configWebhooks.webhook_secret;
      }

      payload = {
        evento: 'disparo_fluxo_inteligente',
        tipo_disparo: 'webhook',
        gatilho: gatilho,
        empresa: {
          id: emp?.id || empresaId,
          nome: emp?.nome || 'Clínica',
          slug: emp?.slug || slug
        },
        agendamento: agendamento || {},
        paciente: {
          nome: nomeFinal,
          nome_completo: nomeFinal,
          primeiro_nome: nomeFinal,
          telefone: numeroLimpo,
          ...paciente
        },
        mensagem_formatada: mensagem,
        opcoes_resposta: configWebhooks.respostas_mapping || {
          confirmar: ['1', 'sim', 'confirmo'],
          cancelar: ['2', 'nao', 'cancelar'],
          remarcar: ['3', 'remarcar', 'reagendar']
        },
        webhook_retorno_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://rmagenda.com.br'}/api/webhook-resposta`
      };
    } else {
      headers['x-rmcare-event'] = 'whatsapp_msg';
      payload = {
        name: nomeFinal,
        number: numeroLimpo,
        phone: numeroLimpo,
        texto: mensagem,
        mensagem: mensagem,
        text: mensagem
      };
    }

    console.log(`🚀 [API disparar-webhook] (${tipo_disparo}) Enviando para: ${targetUrl} | Paciente: ${nomeFinal} | Telefone: ${numeroLimpo}`);

    const resWebhook = await fetch(targetUrl.trim(), {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    let resText = '';
    try {
      resText = await resWebhook.text();
    } catch {
      // ignore
    }

    if (!resWebhook.ok) {
      console.error(`❌ [API disparar-webhook] Servidor retornou erro HTTP ${resWebhook.status}:`, resText);
      return NextResponse.json({
        success: false,
        status: resWebhook.status,
        error: `Servidor retornou erro ${resWebhook.status}: ${resText.slice(0, 200)}`,
        targetUrl
      }, { status: resWebhook.status });
    }

    console.log(`✅ [API disparar-webhook] Mensagem disparada com sucesso! Resposta:`, resText.slice(0, 150));
    return NextResponse.json({
      success: true,
      status: resWebhook.status,
      resposta: resText.slice(0, 300),
      targetUrl,
      tipo_disparo
    });
  } catch (error) {
    console.error('❌ [API disparar-webhook] Exceção crítica:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Falha interna ao disparar webhook'
    }, { status: 500 });
  }
}
