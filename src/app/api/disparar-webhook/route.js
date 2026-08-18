import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const { empresaId, slug, telefone, nome, mensagem, urlWebhook: urlDireta } = body || {};

    let numeroLimpo = String(telefone || '').replace(/\D/g, '');
    if (!numeroLimpo) {
      return NextResponse.json({ success: false, error: 'Telefone do paciente não informado.' }, { status: 400 });
    }

    if (!numeroLimpo.startsWith('55') && (numeroLimpo.length === 10 || numeroLimpo.length === 11)) {
      numeroLimpo = `55${numeroLimpo}`;
    }

    let targetUrl = urlDireta;

    // Se a URL direta não veio ou para garantir precisão, busca no banco pelo ID ou Slug da clínica
    if (!targetUrl || !targetUrl.startsWith('http')) {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      let query = supabaseAdmin.from('empresas').select('*');
      if (empresaId) query = query.eq('id', empresaId);
      else if (slug) query = query.eq('slug', slug);
      else query = query.limit(1);

      const { data: emp, error: empErr } = await query.maybeSingle();

      if (empErr) {
        console.error('❌ [API disparar-webhook] Erro ao buscar empresa:', empErr);
      }

      if (emp) {
        targetUrl =
          emp.rmchat_webhook_url ||
          emp.config_chaves?.rmchat_webhook_url ||
          emp.config_chaves?.url_rmchat ||
          emp.config_chaves?.webhook_url ||
          emp.config_campos?.rmchat_webhook_url ||
          emp.config_campos?.url_rmchat ||
          emp.config_campos?.whatsapp_webhook_url ||
          null;
      }
    }

    if (!targetUrl || !targetUrl.startsWith('http')) {
      console.warn('⚠️ [API disparar-webhook] Webhook do WhatsApp / RM Chat não configurado no banco para esta clínica.');
      return NextResponse.json({
        success: false,
        error: 'Webhook do WhatsApp / RM Chat não está configurado na clínica. Acesse o painel e configure a URL do Webhook.',
        code: 'WEBHOOK_NOT_CONFIGURED'
      }, { status: 400 });
    }

    const payload = {
      name: nome || 'Paciente',
      number: numeroLimpo,
      phone: numeroLimpo,
      texto: mensagem,
      message: mensagem,
      text: mensagem
    };

    console.log(`🚀 [API disparar-webhook] Enviando para: ${targetUrl} | Paciente: ${nome} | Telefone: ${numeroLimpo}`);

    const resWebhook = await fetch(targetUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    let resText = '';
    try {
      resText = await resWebhook.text();
    } catch {
      // ignore
    }

    if (!resWebhook.ok) {
      console.error(`❌ [API disparar-webhook] Servidor de WhatsApp retornou erro HTTP ${resWebhook.status}:`, resText);
      return NextResponse.json({
        success: false,
        status: resWebhook.status,
        error: `Servidor de WhatsApp retornou erro ${resWebhook.status}: ${resText}`,
        targetUrl
      }, { status: resWebhook.status });
    }

    console.log(`✅ [API disparar-webhook] Mensagem disparada com sucesso! Resposta:`, resText);
    return NextResponse.json({
      success: true,
      status: resWebhook.status,
      resposta: resText,
      targetUrl
    });
  } catch (error) {
    console.error('❌ [API disparar-webhook] Exceção crítica:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Falha interna ao disparar webhook'
    }, { status: 500 });
  }
}
