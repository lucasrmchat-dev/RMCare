import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const URL_RMCHAT = "https://acessoapi.rmchat.com.br/w/875a4a21-8b19-42f1-97d7-d420f72f4310";

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

    const { data: mensagens, error } = await supabaseAdmin
      .from('fila_mensagens')
      .select('*')
      .eq('status', 'pendente')
      .lte('data_hora_programada', agora)
      .limit(30); 

    if (error) throw error;
    
    if (!mensagens || mensagens.length === 0) {
      return NextResponse.json({ message: 'Nenhuma mensagem na fila para agora.' });
    }

    let enviadasCount = 0;

    for (const msg of mensagens) {
      // Formata o número removendo traços e o 9º dígito se for celular do Brasil
      let num = msg.telefone_whatsapp.replace(/\D/g, "");
      if (num.length === 11 && num.charAt(2) === '9') {
        num = num.substring(0, 2) + num.substring(3);
      }
      
      // Garante que o DDI do Brasil (55) está presente
      const numeroLimpo = num.startsWith("55") ? num : "55" + num;
      
      try {
        await axios.post(URL_RMCHAT, { 
          name: msg.nome_paciente, 
          number: numeroLimpo,
          texto: msg.mensagem
        });
        
        // Atualiza o status no banco usando o supabaseAdmin
        await supabaseAdmin.from('fila_mensagens').update({ status: 'enviada' }).eq('id', msg.id);
        enviadasCount++;
      } catch (err) {
        console.error(`Erro ao enviar para ${msg.nome_paciente}:`, err.message);
      }
    }

    return NextResponse.json({ success: true, disparos: enviadasCount });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}