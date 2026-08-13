import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

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
      .limit(30);

    if (error) throw error;
    
    if (!mensagens || mensagens.length === 0) {
      return NextResponse.json({ message: 'Nenhuma mensagem pendente na fila para o horário atual.' });
    }

    // 2. Busca todas as empresas cadastradas para mapear a URL de RM Chat de cada uma
    const { data: todasEmpresas } = await supabaseAdmin
      .from('empresas')
      .select('id, nome, config_chaves, rmchat_webhook_url');

    const mapaEmpresasChaves = new Map();
    let empresaFallbackId = null;

    (todasEmpresas || []).forEach((emp, index) => {
      if (index === 0) empresaFallbackId = emp.id;
      const urlConfigurada = emp.rmchat_webhook_url || emp.config_chaves?.rmchat_webhook_url || emp.config_chaves?.url_rmchat || null;
      mapaEmpresasChaves.set(emp.id, {
        nome: emp.nome,
        webhookUrl: urlConfigurada ? urlConfigurada.trim() : null
      });
    });

    let enviadasCount = 0;
    let falhasCount = 0;
    let puladasSemUrlCount = 0;

    for (const msg of mensagens) {
      // Identifica o ID da empresa vinculada à mensagem ou usa a empresa padrão caso seja registro antigo
      const targetEmpresaId = msg.empresa_id || empresaFallbackId;
      const dadosEmpresa = targetEmpresaId ? mapaEmpresasChaves.get(targetEmpresaId) : null;
      const urlDestino = dadosEmpresa?.webhookUrl;

      // Se a mensagem não possui empresa_id no banco, associa retroativamente
      if (!msg.empresa_id && targetEmpresaId) {
        await supabaseAdmin.from('fila_mensagens').update({ empresa_id: targetEmpresaId }).eq('id', msg.id);
      }

      // ⚠️ REGRA DE SEGURANÇA: Se a empresa não tem uma URL cadastrada no servidor, NÃO dispara para URL default
      if (!urlDestino || !urlDestino.startsWith('http')) {
        console.warn(`[Processar Fila] Mensagem ${msg.id} para ${msg.nome_paciente} ignorada: a clínica "${dadosEmpresa?.nome || 'Não identificada'}" não possui URL do RM Chat cadastrada no painel /admin/sistema.`);
        puladasSemUrlCount++;
        continue;
      }

      // Formata o número removendo traços e o 9º dígito se for celular do Brasil
      let num = (msg.telefone_whatsapp || "").replace(/\D/g, "");
      if (num.length === 11 && num.charAt(2) === '9') {
        num = num.substring(0, 2) + num.substring(3);
      }
      
      // Garante que o DDI do Brasil (55) está presente
      const numeroLimpo = num.startsWith("55") ? num : "55" + num;

      try {
        console.log(`[Processar Fila] Enviando mensagem para ${msg.nome_paciente} (${numeroLimpo}) via webhook da clínica "${dadosEmpresa.nome}": ${urlDestino}`);

        await axios.post(urlDestino, { 
          name: msg.nome_paciente, 
          number: numeroLimpo,
          texto: msg.mensagem
        }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 12000
        });
        
        // Atualiza o status no banco para 'enviada'
        await supabaseAdmin.from('fila_mensagens').update({ status: 'enviada' }).eq('id', msg.id);
        enviadasCount++;
      } catch (err) {
        console.error(`[Processar Fila] Erro ao enviar mensagem para ${msg.nome_paciente} via ${urlDestino}:`, err.message);
        falhasCount++;
      }
    }

    return NextResponse.json({
      success: true,
      disparos: enviadasCount,
      falhas: falhasCount,
      puladasSemUrl: puladasSemUrlCount,
      totalLote: mensagens.length
    });
  } catch (error) {
    console.error("❌ Erro no processamento da fila de mensagens:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Suporte a requisições POST e HEAD enviadas por serviços de Cron Job (ex: cron-job.org)
export async function POST(request) {
  return GET(request);
}

export async function HEAD(request) {
  return GET(request);
}
