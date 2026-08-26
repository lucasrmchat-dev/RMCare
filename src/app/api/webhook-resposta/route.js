import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * Endpoint de Recepção de Respostas de Webhooks e Bots Externos
 * (n8n, Typebot, Evolution API, Z-API, ManyChat, Chatbots de IA, etc.)
 *
 * Rota: POST /api/webhook-resposta
 */
export async function POST(request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. Extração do Payload e Headers
    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const { searchParams } = new URL(request.url);
    const secretHeader = request.headers.get('x-webhook-secret') || request.headers.get('x-api-key') || '';
    const secretQuery = searchParams.get('secret') || searchParams.get('token') || '';

    const agendamentoId =
      body.agendamento_id ||
      body.agendamentoId ||
      body.id_agendamento ||
      body.id ||
      searchParams.get('agendamento_id') ||
      searchParams.get('id');

    const empresaId =
      body.empresa_id ||
      body.empresaId ||
      searchParams.get('empresa_id');

    const telefoneRaw =
      body.telefone ||
      body.telefone_whatsapp ||
      body.phone ||
      body.number ||
      searchParams.get('telefone');

    // Valor da resposta enviada pelo paciente (ex: '1', '2', '3', 'sim', 'nao', 'confirmar', 'cancelar', 'remarcar')
    const respostaRaw =
      body.resposta ||
      body.codigo_resposta ||
      body.opcao ||
      body.option ||
      body.status ||
      body.text ||
      body.body ||
      body.message ||
      searchParams.get('resposta') ||
      '';

    const motivoCancelamento = body.motivo || body.motivo_cancelamento || 'Cancelado pelo paciente via WhatsApp / Chatbot';
    const novaData = body.nova_data || body.novaData || null;
    const novoHorario = body.novo_horario || body.novoHorario || null;

    if (!agendamentoId && !telefoneRaw) {
      return NextResponse.json(
        {
          success: false,
          error: 'É obrigatório informar agendamento_id ou o telefone do paciente para localizar o atendimento.'
        },
        { status: 400 }
      );
    }

    // 2. Localizar o Agendamento no Banco de Dados
    let targetAgendamento = null;

    if (agendamentoId) {
      const { data: agById, error: errById } = await supabaseAdmin
        .from('agendamentos')
        .select('*, pacientes(*)')
        .eq('id', agendamentoId)
        .maybeSingle();

      if (!errById && agById) {
        targetAgendamento = agById;
      }
    }

    // Se não encontrou por ID ou veio apenas telefone, busca o agendamento futuro/mais recente do paciente
    if (!targetAgendamento && telefoneRaw) {
      const cleanPhone = String(telefoneRaw).replace(/\D/g, '');
      const lastDigits = cleanPhone.length >= 8 ? cleanPhone.slice(-8) : cleanPhone;

      let query = supabaseAdmin
        .from('agendamentos')
        .select('*, pacientes!inner(*)')
        .ilike('pacientes.telefone_whatsapp', `%${lastDigits}%`)
        .order('data_agendamento', { ascending: false })
        .order('horario_agendamento', { ascending: false });

      if (empresaId) query = query.eq('empresa_id', empresaId);

      const { data: agList } = await query.limit(5);

      if (agList && agList.length > 0) {
        // Prefere o primeiro agendamento que ainda não foi cancelado ou comparecido
        targetAgendamento =
          agList.find((a) => a.status_atendimento !== 'cancelado' && a.status_atendimento !== 'compareceu') ||
          agList[0];
      }
    }

    if (!targetAgendamento) {
      return NextResponse.json(
        {
          success: false,
          error: 'Agendamento não encontrado com os dados fornecidos.'
        },
        { status: 404 }
      );
    }

    const targetEmpresaId = targetAgendamento.empresa_id;

    // 3. Buscar Configurações da Empresa e Mapeamento de Respostas
    const { data: empresa } = await supabaseAdmin
      .from('empresas')
      .select('*')
      .eq('id', targetEmpresaId)
      .maybeSingle();

    const configChaves = empresa?.config_chaves || {};
    const configCampos = empresa?.config_campos || {};
    const configWebhooks = configCampos.config_webhooks || configChaves.config_webhooks || {};

    // Validação de Secret se configurado na clínica
    const secretConfigurado = configWebhooks.webhook_secret || configChaves.webhook_secret;
    if (secretConfigurado && secretConfigurado.trim()) {
      const secretRecebido = (secretHeader || secretQuery || body.secret || '').trim();
      if (secretRecebido !== secretConfigurado.trim()) {
        return NextResponse.json(
          {
            success: false,
            error: 'Não autorizado: Token/Secret do webhook inválido.'
          },
          { status: 401 }
        );
      }
    }

    // Mapeamento padrão e customizado de respostas
    const mapping = configWebhooks.respostas_mapping || {
      confirmar: ['1', 'sim', 's', 'confirmo', 'confirmar', 'confirmado', 'positivo', 'ok', 'certo'],
      cancelar: ['2', 'nao', 'não', 'n', 'cancelo', 'cancelar', 'cancelado', 'desmarcar', 'rejeitar'],
      remarcar: ['3', 'remarcar', 'reagendar', 'mudar', 'outro horario', 'trocar']
    };

    const respostaTexto = String(respostaRaw).trim().toLowerCase();
    let acaoIdentificada = 'desconhecido';

    const ehConfirmacao = Array.isArray(mapping.confirmar)
      ? mapping.confirmar.some((item) => respostaTexto === String(item).trim().toLowerCase() || respostaTexto.includes(String(item).trim().toLowerCase()))
      : respostaTexto === '1' || respostaTexto === 'sim' || respostaTexto === 'confirmar';

    const ehCancelamento = Array.isArray(mapping.cancelar)
      ? mapping.cancelar.some((item) => respostaTexto === String(item).trim().toLowerCase() || respostaTexto.includes(String(item).trim().toLowerCase()))
      : respostaTexto === '2' || respostaTexto === 'nao' || respostaTexto === 'não' || respostaTexto === 'cancelar';

    const ehRemarcacao = Array.isArray(mapping.remarcar)
      ? mapping.remarcar.some((item) => respostaTexto === String(item).trim().toLowerCase() || respostaTexto.includes(String(item).trim().toLowerCase()))
      : respostaTexto === '3' || respostaTexto === 'remarcar' || respostaTexto === 'reagendar';

    if (ehConfirmacao) {
      acaoIdentificada = 'confirmar';
    } else if (ehCancelamento) {
      acaoIdentificada = 'cancelar';
    } else if (ehRemarcacao) {
      acaoIdentificada = 'remarcar';
    }

    const agoraIso = new Date().toISOString();
    let novoStatus = targetAgendamento.status_atendimento;
    let detalhesAcao = '';

    // 4. Execução da Ação no Banco de Dados
    if (acaoIdentificada === 'confirmar') {
      novoStatus = 'confirmado';
      detalhesAcao = 'Atendimento confirmado com sucesso pelo paciente.';

      await supabaseAdmin
        .from('agendamentos')
        .update({
          status_atendimento: 'confirmado',
          confirmado_em: agoraIso,
          observacoes: targetAgendamento.observacoes
            ? `${targetAgendamento.observacoes} | [Confirmado via WhatsApp em ${new Date().toLocaleString('pt-BR')}]`
            : `[Confirmado via WhatsApp em ${new Date().toLocaleString('pt-BR')}]`
        })
        .eq('id', targetAgendamento.id);

    } else if (acaoIdentificada === 'cancelar') {
      novoStatus = 'cancelado';
      detalhesAcao = 'Atendimento cancelado pelo paciente e horário liberado na agenda.';

      try {
        await supabaseAdmin.rpc('cancelar_agendamento', {
          p_agendamento_id: targetAgendamento.id,
          p_empresa_id: targetEmpresaId,
          p_paciente_id: targetAgendamento.paciente_id || null,
          p_cancelado_por: 'paciente_webhook',
          p_motivo: motivoCancelamento
        });
      } catch (errRpc) {
        await supabaseAdmin
          .from('agendamentos')
          .update({
            status_atendimento: 'cancelado',
            motivo_cancelamento: motivoCancelamento,
            cancelado_em: agoraIso
          })
          .eq('id', targetAgendamento.id);
      }

    } else if (acaoIdentificada === 'remarcar') {
      if (novaData && novoHorario) {
        novoStatus = 'remarcado';
        detalhesAcao = `Atendimento reagendado para ${novaData} às ${novoHorario}.`;

        try {
          await supabaseAdmin.rpc('remarcar_agendamento', {
            p_agendamento_id: targetAgendamento.id,
            p_empresa_id: targetEmpresaId,
            p_paciente_id: targetAgendamento.paciente_id || null,
            p_nova_data: novaData,
            p_novo_horario: novoHorario
          });
        } catch {
          await supabaseAdmin
            .from('agendamentos')
            .update({
              data_agendamento: novaData,
              horario_agendamento: novoHorario,
              remarcado_em: agoraIso
            })
            .eq('id', targetAgendamento.id);
        }
      } else {
        novoStatus = 'solicitou_remarcacao';
        detalhesAcao = 'Paciente solicitou remarcação. Notificação gerada para a recepção.';

        await supabaseAdmin
          .from('agendamentos')
          .update({
            status_atendimento: 'solicitou_remarcacao',
            observacoes: targetAgendamento.observacoes
              ? `${targetAgendamento.observacoes} | [Solicitou remarcação via WhatsApp em ${new Date().toLocaleString('pt-BR')}]`
              : `[Solicitou remarcação via WhatsApp em ${new Date().toLocaleString('pt-BR')}]`
          })
          .eq('id', targetAgendamento.id);
      }
    } else {
      // Se não corresponde a nenhum código do mapeamento
      detalhesAcao = `Resposta \"${respostaTexto}\" registrada, mas não gerou alteração automática de status.`;
    }

    // 5. Atualizar a Fila de Mensagens vinculada a este atendimento
    try {
      await supabaseAdmin
        .from('fila_mensagens')
        .update({
          resposta_recebida: respostaTexto,
          respondido_em: agoraIso,
          status: acaoIdentificada === 'cancelar' ? 'cancelada' : 'enviada'
        })
        .eq('agendamento_id', targetAgendamento.id)
        .eq('empresa_id', targetEmpresaId);
    } catch (e) {
      // Ignora se colunas de resposta ainda não existirem
    }

    return NextResponse.json({
      success: true,
      agendamento_id: targetAgendamento.id,
      paciente: targetAgendamento.pacientes?.nome_completo || 'Paciente',
      resposta_recebida: respostaTexto,
      acao_executada: acaoIdentificada,
      status_atendimento: novoStatus,
      mensagem: detalhesAcao,
      processado_em: agoraIso
    });
  } catch (error) {
    console.error('❌ [API webhook-resposta] Erro ao processar retorno:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Falha ao processar retorno do webhook.'
      },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  return POST(request);
}
