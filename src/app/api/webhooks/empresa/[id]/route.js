import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { formatarTelefoneEnvio } from '@/lib/phoneUtils';
import { dispararWebhookOutboundEmpresa } from '@/lib/webhookDispatcher';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Webhook de Entrada (Inbound) exclusivo por Empresa / Clínica
 * Rota: /api/webhooks/empresa/[id]
 *
 * Cada empresa tem seu próprio endpoint identificado por UUID ou Slug.
 * Aceita requisições de ERPs externos (MedicalSYS, TOTVS, Tasy, MV, sistemas próprios),
 * plataformas de automação (n8n, Typebot, Make, Zapier) e chatbots.
 */

// Helper para validar autenticação da empresa
function validarSecret(request, configWebhooks) {
  const secretConfigurado = (
    configWebhooks.webhook_secret ||
    configWebhooks.inbound_secret ||
    ""
  ).trim();

  // Se não foi configurado segredo na empresa, permite acesso direto pelo endpoint exclusivo
  if (!secretConfigurado) return { autorizado: true };

  const { searchParams } = new URL(request.url);
  const secretHeader =
    request.headers.get('x-webhook-secret') ||
    request.headers.get('x-api-key') ||
    '';

  const authHeader = request.headers.get('authorization') || '';
  const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';

  const secretQuery = searchParams.get('secret') || searchParams.get('token') || '';

  const secretRecebido = (secretHeader || bearerToken || secretQuery).trim();

  if (secretRecebido !== secretConfigurado) {
    return { autorizado: false, error: 'Token/Chave secreta inválida (x-webhook-secret incorreto).' };
  }

  return { autorizado: true };
}

export async function GET(request, context) {
  try {
    const params = await context.params;
    const { id } = params || {};

    if (!id) {
      return NextResponse.json({ success: false, error: 'Identificador da empresa não fornecido.' }, { status: 400 });
    }

    // Localizar empresa por UUID ou por Slug
    const { data: emp, error: errEmp } = await supabaseAdmin
      .from('empresas')
      .select('id, nome, slug, config_campos')
      .or(`id.eq.${id},slug.eq.${id}`)
      .maybeSingle();

    if (errEmp || !emp) {
      return NextResponse.json({ success: false, error: 'Empresa não encontrada no sistema.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      status: 'online',
      mensagem: 'Endpoint de webhook da empresa ativo e pronto para receber integrações.',
      empresa: {
        id: emp.id,
        nome: emp.nome,
        slug: emp.slug
      },
      instrucoes: {
        metodo: 'POST',
        headers_recomendados: {
          'Content-Type': 'application/json',
          'x-webhook-secret': '(Sua chave secreta configurada no painel)'
        },
        eventos_suportados: [
          'agendamento.criar',
          'agendamento.atualizar_status',
          'agendamento.cancelar',
          'agendamento.remarcar',
          'paciente.criar',
          'bloqueio.criar',
          'bloqueio.remover',
          'pagamento.confirmar',
          'ping'
        ]
      }
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request, context) {
  try {
    const params = await context.params;
    const { id } = params || {};

    if (!id) {
      return NextResponse.json({ success: false, error: 'Identificador da empresa ausente na URL.' }, { status: 400 });
    }

    // 1. Buscar a Empresa no Banco
    const { data: emp, error: errEmp } = await supabaseAdmin
      .from('empresas')
      .select('*')
      .or(`id.eq.${id},slug.eq.${id}`)
      .maybeSingle();

    if (errEmp || !emp) {
      return NextResponse.json({ success: false, error: 'Empresa não encontrada para este endpoint de webhook.' }, { status: 404 });
    }

    const confCampos = emp.config_campos || {};
    const confChaves = emp.config_chaves || {};
    const configWebhooks = confCampos.config_webhooks || confChaves.config_webhooks || {};

    // 2. Validação de Segurança (Secret)
    const validacao = validarSecret(request, configWebhooks);
    if (!validacao.autorizado) {
      return NextResponse.json({ success: false, error: validacao.error }, { status: 401 });
    }

    // 3. Extração do Body
    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const evento = (
      body.evento ||
      body.event ||
      body.acao ||
      body.action ||
      request.headers.get('x-rmcare-event') ||
      'agendamento.criar'
    ).trim().toLowerCase();

    const agoraIso = new Date().toISOString();

    // =========================================================================
    // EVENTO: PING / TESTE DE CONEXÃO
    // =========================================================================
    if (evento === 'ping' || evento === 'teste' || evento === 'health') {
      return NextResponse.json({
        success: true,
        evento: 'pong',
        mensagem: `Conexão bem-sucedida com a clínica ${emp.nome}!`,
        empresa: { id: emp.id, nome: emp.nome, slug: emp.slug },
        timestamp: agoraIso
      });
    }

    // =========================================================================
    // EVENTO: CRIAR NOVO AGENDAMENTO (VINDO DO ERP)
    // =========================================================================
    if (
      evento === 'agendamento.criar' ||
      evento === 'criar_agendamento' ||
      evento === 'novo_agendamento' ||
      evento === 'agendar'
    ) {
      const dadosAg = body.agendamento || body.dados || body;
      const dadosPac = body.paciente || dadosAg.paciente || body;

      const nomePaciente = (dadosPac.nome_completo || dadosPac.nome || dadosAg.nome_paciente || 'Paciente').trim();
      const cpfBruto = (dadosPac.cpf || dadosAg.cpf || '').replace(/\D/g, '');
      const cpfFormatado = cpfBruto.length === 11 ? cpfBruto.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : null;
      const telefoneBruto = (dadosPac.telefone || dadosPac.telefone_whatsapp || dadosAg.telefone || '').trim();
      const telefoneFormatado = formatarTelefoneEnvio(telefoneBruto);

      // Localizar ou Criar Paciente
      let pacienteId = dadosPac.id || null;

      if (!pacienteId && (cpfBruto || telefoneFormatado)) {
        let queryPac = supabaseAdmin.from('pacientes').select('id, nome_completo');
        if (cpfBruto) {
          queryPac = queryPac.or(`cpf.eq.${cpfBruto},cpf.eq.${cpfFormatado}`);
        } else if (telefoneFormatado) {
          queryPac = queryPac.ilike('telefone_whatsapp', `%${telefoneFormatado.slice(-8)}%`);
        }

        const { data: pacExistente } = await queryPac.limit(1).maybeSingle();
        if (pacExistente) {
          pacienteId = pacExistente.id;
        } else {
          // Inserir novo paciente
          const { data: novoPac, error: errNovoPac } = await supabaseAdmin
            .from('pacientes')
            .insert({
              nome_completo: nomePaciente,
              cpf: cpfFormatado || cpfBruto || null,
              telefone_whatsapp: telefoneFormatado || telefoneBruto || null,
              email: dadosPac.email || null,
              data_nascimento: dadosPac.data_nascimento || null
            })
            .select('id')
            .single();

          if (!errNovoPac && novoPac) {
            pacienteId = novoPac.id;
          }
        }
      }

      const dataAgendamento = dadosAg.data_agendamento || dadosAg.data;
      const horarioAgendamento = dadosAg.horario_agendamento || dadosAg.horario || dadosAg.hora;

      if (!dataAgendamento || !horarioAgendamento) {
        return NextResponse.json({
          success: false,
          error: 'Campos obrigatórios ausentes: data_agendamento (YYYY-MM-DD) e horario_agendamento (HH:mm).'
        }, { status: 400 });
      }

      const medicoProfissional = dadosAg.medico_profissional || dadosAg.medico || dadosAg.especialista || 'Médico da Clínica';
      const tipoServico = dadosAg.tipo_servico || dadosAg.servico || dadosAg.procedimento || 'Consulta';
      const modalidade = dadosAg.modalidade || (dadosAg.convenio ? 'Convênio' : 'Particular');
      const valorTotal = Number(dadosAg.valor_total || dadosAg.valor || 0);

      const payloadAgendamento = {
        empresa_id: emp.id,
        paciente_id: pacienteId,
        nome_paciente: nomePaciente,
        cpf_paciente: cpfFormatado || cpfBruto,
        telefone_whatsapp: telefoneFormatado || telefoneBruto,
        data_agendamento: dataAgendamento,
        horario_agendamento: horarioAgendamento.slice(0, 5),
        medico_profissional: medicoProfissional,
        tipo_servico: tipoServico,
        subtipo_exame: dadosAg.subtipo_exame || tipoServico,
        modalidade: modalidade,
        nome_convenio: dadosAg.nome_convenio || dadosAg.convenio || null,
        valor_total: valorTotal,
        status_atendimento: dadosAg.status || 'agendado',
        status_pagamento_antecipado: Boolean(dadosAg.pago || dadosAg.status_pagamento_antecipado),
        observacoes: dadosAg.observacoes ? `[ERP Webhook] ${dadosAg.observacoes}` : '[Criado via Webhook ERP]',
        origem: 'webhook_erp'
      };

      const { data: agCriado, error: errAgCriado } = await supabaseAdmin
        .from('agendamentos')
        .insert(payloadAgendamento)
        .select('*')
        .single();

      if (errAgCriado) {
        return NextResponse.json({ success: false, error: `Erro ao salvar agendamento: ${errAgCriado.message}` }, { status: 500 });
      }

      // Notificar Webhook Outbound de agendamento criado (para manter sistemas sincronizados)
      dispararWebhookOutboundEmpresa({
        empresaId: emp.id,
        evento: 'agendamento.criado',
        dados: { agendamento: agCriado, paciente: { nome: nomePaciente, cpf: cpfFormatado, telefone: telefoneFormatado } },
        agendamentoId: agCriado.id
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        mensagem: 'Agendamento cadastrado com sucesso via webhook.',
        agendamento_id: agCriado.id,
        paciente_id: pacienteId,
        agendamento: agCriado
      }, { status: 201 });
    }

    // =========================================================================
    // EVENTO: ATUALIZAR STATUS DO AGENDAMENTO
    // =========================================================================
    if (
      evento === 'agendamento.atualizar_status' ||
      evento === 'atualizar_status' ||
      evento === 'status'
    ) {
      const agendamentoId = body.agendamento_id || body.id;
      const novoStatus = (body.status || body.novo_status || '').trim().toLowerCase();

      if (!agendamentoId || !novoStatus) {
        return NextResponse.json({
          success: false,
          error: 'Informe agendamento_id e o novo status (ex: confirmado, cancelado, compareceu, etc).'
        }, { status: 400 });
      }

      const updateData = { status_atendimento: novoStatus };
      if (novoStatus === 'confirmado') updateData.confirmado_em = agoraIso;
      if (novoStatus === 'cancelado') {
        updateData.cancelado_em = agoraIso;
        updateData.motivo_cancelamento = body.motivo || 'Cancelado via ERP Webhook';
      }

      const { data: agAtualizado, error: errAgUp } = await supabaseAdmin
        .from('agendamentos')
        .update(updateData)
        .eq('id', agendamentoId)
        .eq('empresa_id', emp.id)
        .select('*')
        .maybeSingle();

      if (errAgUp || !agAtualizado) {
        return NextResponse.json({ success: false, error: 'Agendamento não encontrado nesta clínica.' }, { status: 404 });
      }

      // Disparar Webhook Outbound
      const eventOutbound = novoStatus === 'confirmado'
        ? 'agendamento.confirmado'
        : novoStatus === 'cancelado'
        ? 'agendamento.cancelado'
        : 'agendamento.status_alterado';

      dispararWebhookOutboundEmpresa({
        empresaId: emp.id,
        evento: eventOutbound,
        dados: { agendamento: agAtualizado },
        agendamentoId: agAtualizado.id
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        mensagem: `Status do agendamento atualizado para '${novoStatus}'.`,
        agendamento: agAtualizado
      });
    }

    // =========================================================================
    // EVENTO: CANCELAR AGENDAMENTO
    // =========================================================================
    if (evento === 'agendamento.cancelar' || evento === 'cancelar_agendamento') {
      const agendamentoId = body.agendamento_id || body.id;
      const motivo = body.motivo || body.motivo_cancelamento || 'Cancelado via Webhook ERP';

      if (!agendamentoId) {
        return NextResponse.json({ success: false, error: 'Informe agendamento_id para cancelar.' }, { status: 400 });
      }

      const { data: agCancelado, error: errCanc } = await supabaseAdmin
        .from('agendamentos')
        .update({
          status_atendimento: 'cancelado',
          motivo_cancelamento: motivo,
          cancelado_em: agoraIso
        })
        .eq('id', agendamentoId)
        .eq('empresa_id', emp.id)
        .select('*')
        .maybeSingle();

      if (errCanc || !agCancelado) {
        return NextResponse.json({ success: false, error: 'Agendamento não encontrado para cancelamento.' }, { status: 404 });
      }

      dispararWebhookOutboundEmpresa({
        empresaId: emp.id,
        evento: 'agendamento.cancelado',
        dados: { agendamento: agCancelado, motivo },
        agendamentoId: agCancelado.id
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        mensagem: 'Agendamento cancelado com sucesso e horário liberado na agenda.',
        agendamento: agCancelado
      });
    }

    // =========================================================================
    // EVENTO: REMARCAR AGENDAMENTO
    // =========================================================================
    if (evento === 'agendamento.remarcar' || evento === 'remarcar_agendamento') {
      const agendamentoId = body.agendamento_id || body.id;
      const novaData = body.nova_data || body.data;
      const novoHorario = body.novo_horario || body.horario;

      if (!agendamentoId || !novaData || !novoHorario) {
        return NextResponse.json({
          success: false,
          error: 'Informe agendamento_id, nova_data (YYYY-MM-DD) e novo_horario (HH:mm).'
        }, { status: 400 });
      }

      const { data: agRemarcado, error: errRem } = await supabaseAdmin
        .from('agendamentos')
        .update({
          data_agendamento: novaData,
          horario_agendamento: novoHorario.slice(0, 5),
          remarcado_em: agoraIso
        })
        .eq('id', agendamentoId)
        .eq('empresa_id', emp.id)
        .select('*')
        .maybeSingle();

      if (errRem || !agRemarcado) {
        return NextResponse.json({ success: false, error: 'Agendamento não encontrado para remarcação.' }, { status: 404 });
      }

      dispararWebhookOutboundEmpresa({
        empresaId: emp.id,
        evento: 'agendamento.remarcado',
        dados: { agendamento: agRemarcado, nova_data: novaData, novo_horario: novoHorario },
        agendamentoId: agRemarcado.id
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        mensagem: `Agendamento remarcado para ${novaData} às ${novoHorario}.`,
        agendamento: agRemarcado
      });
    }

    // =========================================================================
    // EVENTO: BLOQUEIO DE HORÁRIO NA GRADE (MÉDICO INDISPONÍVEL NO ERP)
    // =========================================================================
    if (evento === 'bloqueio.criar' || evento === 'criar_bloqueio') {
      const medico = body.medico || body.medico_profissional || 'Todos';
      const dataBloqueio = body.data || body.data_bloqueio;
      const horarioBloqueio = body.horario || body.horario_bloqueio || null;
      const motivo = body.motivo || 'Bloqueio importado via ERP';

      if (!dataBloqueio) {
        return NextResponse.json({ success: false, error: 'Informe a data para o bloqueio de horário.' }, { status: 400 });
      }

      const { data: bloqCriado, error: errBloq } = await supabaseAdmin
        .from('bloqueios_horarios')
        .insert({
          empresa_id: emp.id,
          medico_profissional: medico,
          data: dataBloqueio,
          horario: horarioBloqueio ? horarioBloqueio.slice(0, 5) : '00:00',
          motivo: motivo
        })
        .select('*')
        .single();

      if (errBloq) {
        return NextResponse.json({ success: false, error: `Erro ao criar bloqueio: ${errBloq.message}` }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        mensagem: `Bloqueio de grade registrado para ${medico} em ${dataBloqueio}.`,
        bloqueio: bloqCriado
      }, { status: 201 });
    }

    // =========================================================================
    // EVENTO: PAGAMENTO CONFIRMADO NO ERP
    // =========================================================================
    if (evento === 'pagamento.confirmar' || evento === 'pagamento_aprovado') {
      const agendamentoId = body.agendamento_id || body.id;
      if (!agendamentoId) {
        return NextResponse.json({ success: false, error: 'Informe agendamento_id para confirmar pagamento.' }, { status: 400 });
      }

      const { data: agPago, error: errPago } = await supabaseAdmin
        .from('agendamentos')
        .update({ status_pagamento_antecipado: true })
        .eq('id', agendamentoId)
        .eq('empresa_id', emp.id)
        .select('*')
        .maybeSingle();

      if (errPago || !agPago) {
        return NextResponse.json({ success: false, error: 'Agendamento não encontrado.' }, { status: 404 });
      }

      dispararWebhookOutboundEmpresa({
        empresaId: emp.id,
        evento: 'pagamento.aprovado',
        dados: { agendamento: agPago },
        agendamentoId: agPago.id
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        mensagem: 'Pagamento confirmado com sucesso.',
        agendamento: agPago
      });
    }

    // =========================================================================
    // EVENTO: RESPOSTA DO PACIENTE VIA WHATSAPP/BOT (COMPATIBILIDADE)
    // =========================================================================
    if (body.resposta || body.codigo_resposta || body.option) {
      const agendamentoId = body.agendamento_id || body.id;
      const respostaTexto = String(body.resposta || body.codigo_resposta || body.option).trim().toLowerCase();

      let acaoIdentificada = 'desconhecido';
      if (['1', 'sim', 'confirmo', 'confirmar', 'ok'].includes(respostaTexto)) acaoIdentificada = 'confirmar';
      else if (['2', 'nao', 'não', 'cancelar', 'cancelo'].includes(respostaTexto)) acaoIdentificada = 'cancelar';
      else if (['3', 'remarcar', 'reagendar'].includes(respostaTexto)) acaoIdentificada = 'remarcar';

      if (agendamentoId) {
        if (acaoIdentificada === 'confirmar') {
          await supabaseAdmin.from('agendamentos').update({ status_atendimento: 'confirmado', confirmado_em: agoraIso }).eq('id', agendamentoId);
        } else if (acaoIdentificada === 'cancelar') {
          await supabaseAdmin.from('agendamentos').update({ status_atendimento: 'cancelado', cancelado_em: agoraIso, motivo_cancelamento: 'Cancelado pelo paciente' }).eq('id', agendamentoId);
        }
      }

      return NextResponse.json({
        success: true,
        acao_executada: acaoIdentificada,
        resposta: respostaTexto,
        mensagem: `Resposta do paciente processada com sucesso: ${acaoIdentificada}.`
      });
    }

    // Fallback: se nenhum evento coincidir
    return NextResponse.json({
      success: false,
      error: `Evento '${evento}' não reconhecido. Envie um dos seguintes eventos: agendamento.criar, agendamento.atualizar_status, agendamento.cancelar, agendamento.remarcar, bloqueio.criar, pagamento.confirmar, ping.`
    }, { status: 400 });

  } catch (err) {
    console.error('❌ [API /api/webhooks/empresa/[id]] Erro não tratado:', err);
    return NextResponse.json({ success: false, error: err.message || 'Erro interno no servidor de webhook.' }, { status: 500 });
  }
}
