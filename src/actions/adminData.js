"use server";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/session";
import { formatarTelefoneEnvio } from "@/lib/phoneUtils";

// Trava de segurança: avisa imediatamente se as variáveis estiverem faltando
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Faltam as credenciais do Supabase no arquivo .env.local");
}

// ⚠️ Usamos a SERVICE_ROLE_KEY aqui. Ela ignora o RLS com segurança no backend.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* ==========================================
   HELPER DE AUTENTICAÇÃO E ISOLAMENTO (TENANT)
   ========================================== */
export async function getAdminLogado(exigeEmpresa = false) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("rmagenda_auth") || cookieStore.get("rmcare_auth");

  if (!authCookie || !authCookie.value) {
    throw new Error("Sessão expirada ou não autenticado.");
  }

  const session = await verifyAdminSession(authCookie.value);
  const usuarioLogado = session?.sub || authCookie.value;

  if (!usuarioLogado) {
    throw new Error("Sessão expirada.");
  }

  const { data: admin, error } = await supabaseAdmin
    .from("administradores")
    .select("id, role, empresa_id, usuario")
    .eq("usuario", usuarioLogado)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro no banco de dados ao buscar administrador: ${error.message}`);
  }

  if (!admin) {
    throw new Error(`O usuário logado '${usuarioLogado}' não existe mais no banco de dados.`);
  }

  // Se o admin for do tipo 'empresa' mas por algum motivo empresa_id estiver nulo, busca a primeira empresa
  if (admin.role !== "sistema" && !admin.empresa_id) {
    const { data: firstEmp } = await supabaseAdmin
      .from("empresas")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (firstEmp) {
      admin.empresa_id = firstEmp.id;
      await supabaseAdmin.from("administradores").update({ empresa_id: firstEmp.id }).eq("id", admin.id);
    }
  }

  // Trava de segurança multi-tenant: impede que o Master Admin visualize dados de clientes em /admin/empresa
  if (exigeEmpresa && admin.role === "sistema") {
    throw new Error("Acesso restrito: sua conta é de Administrador Master do Sistema. Acesse o painel /admin/sistema.");
  }

  return admin;
}

/* ==========================================
   FUNÇÕES DE AUTENTICAÇÃO E CHAVES
   ========================================== */
export async function actionSalvarChavesIntegracao(config_chaves) {
  const admin = await getAdminLogado(true);
  
  const { error } = await supabaseAdmin
    .from("empresas")
    .update({ 
      config_chaves,
      rmchat_webhook_url: config_chaves?.rmchat_webhook_url ? config_chaves.rmchat_webhook_url.trim() : null
    })
    .eq("id", admin.empresa_id);

  if (error) throw new Error(error.message);
  return true;
}

export async function checkIdentifier(identificador) {
  const idClean = identificador.trim().toLowerCase();

  const { data: admin } = await supabaseAdmin
    .from("administradores")
    .select("id, role, empresa_id")
    .eq("usuario", idClean)
    .maybeSingle();

  if (admin) return { success: true, type: "admin", role: admin.role, empresa_id: admin.empresa_id };

  const cleanCpf = idClean.replace(/\D/g, "");
  
  if (cleanCpf.length !== 11) {
    return { success: false, error: "Usuário não encontrado. Digite um CPF válido ou usuário administrativo." };
  }

  const maskedCpf = cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

  const { data: paciente } = await supabaseAdmin
    .from("pacientes")
    .select("id")
    .or(`cpf.eq.${cleanCpf},cpf.eq.${maskedCpf}`)
    .maybeSingle();

  if (!paciente) return { success: false, error: "Cadastro não encontrado na clínica." };

  const { data: cred } = await supabaseAdmin
    .from("pacientes_credenciais")
    .select("senha_hash")
    .eq("paciente_id", paciente.id)
    .maybeSingle();

  return {
    success: true,
    type: "paciente",
    id: paciente.id,
    isDefiningPassword: !cred,
  };
}

/* ==========================================
   FUNÇÕES GERAIS DE ADMIN (COM ISOLAMENTO)
   ========================================== */
export async function fetchAdminBloqueios() {
  const admin = await getAdminLogado(true);

  const { data, error } = await supabaseAdmin
    .from("bloqueios_horarios")
    .select("*")
    .eq("empresa_id", admin.empresa_id)
    .order("horario", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function fetchAdminAgendamentos() {
  const admin = await getAdminLogado(true);

  const { data, error } = await supabaseAdmin
    .from("agendamentos")
    .select(`*, pacientes (*)`)
    .eq("empresa_id", admin.empresa_id)
    .order("horario_agendamento", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function actionCancelarAgendamentoAdmin(id, motivo = null, mensagemCustom = null) {
  const admin = await getAdminLogado(true);
  const { data: appointment } = await supabaseAdmin
    .from("agendamentos")
    .select("id, empresa_id, medico_profissional, data_agendamento, horario_agendamento, pacientes(*)")
    .eq("id", id)
    .eq("empresa_id", admin.empresa_id)
    .maybeSingle();

  if (!appointment) throw new Error("Agendamento não encontrado.");

  const motivoPadrao = "Readequação operacional da grade de atendimentos da clínica";
  const motivoEfetivo = (motivo && String(motivo).trim()) ? String(motivo).trim() : motivoPadrao;

  const { data, error } = await supabaseAdmin.rpc("cancelar_agendamento", {
    p_agendamento_id: id,
    p_empresa_id: admin.empresa_id,
    p_paciente_id: null,
    p_cancelado_por: "administrador",
    p_motivo: motivoEfetivo
  });
  if (error) throw error;

  // Dispara mensagem WhatsApp de Cancelamento
  try {
    const { dispararGatilhoServidor } = await import("@/lib/serverDisparo");
    await dispararGatilhoServidor({
      agendamentoId: id,
      empresaId: admin.empresa_id,
      gatilho: "cancelado",
      motivo: motivoEfetivo,
      mensagemCustom: mensagemCustom
    });
  } catch (errDisparo) {
    console.error("Aviso ao disparar WhatsApp de cancelamento:", errDisparo);
  }

  // Registrar auditoria
  try {
    await actionRegistrarAuditoria({
      modulo: "agenda",
      acao: "Cancelamento / Desreserva de Horário",
      detalhes: `Horário #${id} desreservado/cancelado (${appointment.pacientes?.nome_completo || "Paciente"}) por ${admin.usuario || admin.email}. Motivo: ${motivoEfetivo}.`,
      novo: { status_atendimento: "cancelado", motivo: motivoEfetivo },
      alterado_por: admin.usuario || admin.email
    });
  } catch (eAud) {}

  return data;
}

export async function actionAprovarPagamentoAgendamento(id) {
  try {
    const admin = await getAdminLogado(true);
    const { data: ag, error: errAg } = await supabaseAdmin
      .from("agendamentos")
      .select("id, empresa_id, status_pagamento_antecipado, pacientes(*)")
      .eq("id", id)
      .eq("empresa_id", admin.empresa_id)
      .maybeSingle();

    if (errAg || !ag) throw new Error("Agendamento não encontrado.");

    let { data: updated, error: errUpdate } = await supabaseAdmin
      .from("agendamentos")
      .update({ status_pagamento_antecipado: true })
      .eq("id", id)
      .eq("empresa_id", admin.empresa_id)
      .select("*, pacientes(*)")
      .single();

    if (errUpdate) throw errUpdate;

    // Dispara mensagens WhatsApp de Pagamento Aprovado e Imediato se configuradas
    try {
      const { dispararGatilhoServidor } = await import("@/lib/serverDisparo");
      await dispararGatilhoServidor({
        agendamentoId: id,
        empresaId: admin.empresa_id,
        gatilho: "pagamento_aprovado"
      });
      await dispararGatilhoServidor({
        agendamentoId: id,
        empresaId: admin.empresa_id,
        gatilho: "imediato"
      });
    } catch (errDisparo) {
      console.warn("Aviso ao disparar WhatsApp de pagamento aprovado:", errDisparo);
    }

    // Registrar auditoria
    await actionRegistrarAuditoria({
      modulo: "agenda",
      acao: "Aprovação de Pagamento",
      detalhes: `Pagamento aprovado manualmente para o agendamento #${id} (${ag.pacientes?.nome_completo || "Paciente"}) por ${admin.usuario}.`,
      novo: { status_pagamento_antecipado: true },
      alterado_por: admin.usuario
    });

    return { success: true, data: updated };
  } catch (err) {
    console.error("Erro em actionAprovarPagamentoAgendamento:", err);
    return { success: false, error: err.message };
  }
}

export async function actionExcluirAgendamentoAdmin(id) {
  const admin = await getAdminLogado(true);
  const { data: appointment } = await supabaseAdmin
    .from("agendamentos")
    .select("empresa_id")
    .eq("id", id)
    .eq("empresa_id", admin.empresa_id)
    .maybeSingle();

  if (!appointment) throw new Error("Agendamento não encontrado.");
  const { data, error } = await supabaseAdmin.rpc("excluir_agendamento", {
    p_agendamento_id: id,
    p_empresa_id: admin.empresa_id,
    p_paciente_id: null
  });
  if (error) throw error;
  return data;
}

export async function actionRemarcarAgendamentoAdmin(id, data, horario) {
  const admin = await getAdminLogado(true);
  const { data: appointment } = await supabaseAdmin
    .from("agendamentos")
    .select("id, empresa_id, medico_profissional, subtipo_exame")
    .eq("id", id)
    .eq("empresa_id", admin.empresa_id)
    .maybeSingle();

  if (!appointment) throw new Error("Agendamento não encontrado.");

  // 1. Verificação de conflito de horário (Anti-Double-Booking)
  const { data: conflitos } = await supabaseAdmin
    .from("agendamentos")
    .select("id, medico_profissional, subtipo_exame")
    .eq("empresa_id", admin.empresa_id)
    .eq("data_agendamento", data)
    .eq("horario_agendamento", horario)
    .neq("id", id)
    .neq("status_atendimento", "cancelado");

  const profAlvo = (appointment.medico_profissional || appointment.subtipo_exame || "").trim().toLowerCase();
  const temConflitoMesmoProf = (conflitos || []).some((c) => {
    const cProf = (c.medico_profissional || c.subtipo_exame || "").trim().toLowerCase();
    return cProf === profAlvo || cProf.includes(profAlvo) || profAlvo.includes(cProf);
  });

  const { data: bloqueios } = await supabaseAdmin
    .from("bloqueios_horarios")
    .select("id, medico_profissional")
    .eq("empresa_id", admin.empresa_id)
    .eq("data", data)
    .eq("horario", horario);

  const temBloqueio = (bloqueios || []).some((b) => {
    if (!b.medico_profissional || b.medico_profissional === "Todos") return true;
    const bProf = b.medico_profissional.trim().toLowerCase();
    return bProf === profAlvo || bProf.includes(profAlvo) || profAlvo.includes(bProf);
  });

  if (temConflitoMesmoProf || temBloqueio) {
    throw new Error("Este horário já está ocupado ou bloqueado para este profissional.");
  }

  const { data: updated, error } = await supabaseAdmin.rpc("remarcar_agendamento", {
    p_agendamento_id: id,
    p_empresa_id: admin.empresa_id,
    p_paciente_id: null,
    p_nova_data: data,
    p_novo_horario: horario
  });
  if (error) throw error;

  // Dispara mensagem WhatsApp de Remarcação
  try {
    const { dispararGatilhoServidor } = await import("@/lib/serverDisparo");
    await dispararGatilhoServidor({
      agendamentoId: id,
      empresaId: admin.empresa_id,
      gatilho: "remarcado",
      novaData: data,
      novoHorario: horario
    });
  } catch (errDisparo) {
    console.error("Aviso ao disparar WhatsApp de remarcação:", errDisparo);
  }

  return updated;
}

export async function fetchAdminServicos() {
  const admin = await getAdminLogado(true);

  const { data, error } = await supabaseAdmin
    .from("servicos")
    .select("*")
    .eq("empresa_id", admin.empresa_id)
    .order("nome", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function fetchAdminPerguntas() {
  const admin = await getAdminLogado(true);

  const { data: pergs, error: err1 } = await supabaseAdmin
    .from("perguntas_triagem")
    .select("*, servicos(nome)")
    .eq("empresa_id", admin.empresa_id);

  const { data: ops, error: err2 } = await supabaseAdmin
    .from("opcoes_triagem")
    .select("*");

  if (err1 || err2) throw err1 || err2;

  return (pergs || []).map(p => ({
    ...p,
    opcoes: (ops || []).filter(o => o.pergunta_id === p.id)
  }));
}

export async function actionAplicarBloqueioLote(inserts) {
  const admin = await getAdminLogado(true);

  const payload = inserts.map(i => ({ ...i, empresa_id: admin.empresa_id }));
  const { error } = await supabaseAdmin.from("bloqueios_horarios").insert(payload);
  if (error) throw error;
  return true;
}

export async function actionDeletarBloqueio(id) {
  const admin = await getAdminLogado(true);

  const { error } = await supabaseAdmin
    .from("bloqueios_horarios")
    .delete()
    .eq("id", id)
    .eq("empresa_id", admin.empresa_id);

  if (error) throw error;
  return true;
}

export async function actionAtualizarServico(id, srvData) {
  const admin = await getAdminLogado(true);

  const payload = {
    nome: srvData.nome,
    codigo_uri: srvData.codigo_uri || null,
    numero_especialista: srvData.numero_especialista || null,
    tipo: srvData.tipo || "Profissional",
    ativo: srvData.ativo !== false,
    status_agendamento: srvData.status_agendamento || (srvData.redirecionar_whatsapp ? "whatsapp" : srvData.ativo !== false ? "ativo" : "inativo"),
    redirecionar_whatsapp: Boolean(srvData.redirecionar_whatsapp || srvData.status_agendamento === "whatsapp"),
    preco: Number(srvData.preco) || 0.0,
    dias_bloqueio_padrao: Number(srvData.dias_bloqueio_padrao) || 0,
    tipo_contagem_dias: srvData.tipo_contagem_dias || "corridos",
    especialidade: srvData.especialidade || null,
    agendamento_bloqueado_ate: srvData.agendamento_bloqueado_ate || null,
    motivo_bloqueio_agenda: srvData.motivo_bloqueio_agenda || null
  };

  let { error } = await supabaseAdmin
    .from("servicos")
    .update(payload)
    .eq("id", id)
    .eq("empresa_id", admin.empresa_id);

  // Fallback se as colunas codigo_uri ou numero_especialista ainda não existirem
  if (error && (error.code === "42703" || error.code === "PGRST204" || error.message?.includes("column"))) {
    delete payload.codigo_uri;
    delete payload.numero_especialista;
    const retry = await supabaseAdmin
      .from("servicos")
      .update(payload)
      .eq("id", id)
      .eq("empresa_id", admin.empresa_id);
    error = retry.error;
  }

  if (error) throw error;
  return true;
}

export async function actionCriarServico(payload) {
  const admin = await getAdminLogado(true);

  const insertData = { 
    nome: payload.nome,
    empresa_id: admin.empresa_id,
    tipo: payload.tipo || "Profissional",
    ativo: payload.ativo !== false,
    status_agendamento: payload.status_agendamento || (payload.redirecionar_whatsapp ? "whatsapp" : payload.ativo !== false ? "ativo" : "inativo"),
    redirecionar_whatsapp: Boolean(payload.redirecionar_whatsapp || payload.status_agendamento === "whatsapp"),
    codigo_uri: payload.codigo_uri || null,
    numero_especialista: payload.numero_especialista || null,
    especialidade: payload.especialidade || null,
    preco: Number(payload.preco) || 0.0,
    dias_bloqueio_padrao: Number(payload.dias_bloqueio_padrao) || 0,
    tipo_contagem_dias: payload.tipo_contagem_dias || "corridos",
    agendamento_bloqueado_ate: payload.agendamento_bloqueado_ate || null,
    motivo_bloqueio_agenda: payload.motivo_bloqueio_agenda || null
  };

  let { data, error } = await supabaseAdmin
    .from("servicos")
    .insert([insertData])
    .select()
    .single();
  
  // Fallback se colunas novas ainda não existirem
  if (error && (error.code === "42703" || error.code === "PGRST204" || error.message?.includes("column"))) {
    delete insertData.codigo_uri;
    delete insertData.numero_especialista;
    const retry = await supabaseAdmin
      .from("servicos")
      .insert([insertData])
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }
  
  if (error) throw error;
  return data;
}

export async function actionDeletarServico(id) {
  const admin = await getAdminLogado(true);

  const { error } = await supabaseAdmin
    .from("servicos")
    .delete()
    .eq("id", id)
    .eq("empresa_id", admin.empresa_id);

  if (error) throw error;
  return true;
}

/* ==========================================
   GESTÃO DE USUÁRIOS E NÍVEIS DE PERMISSÕES
   ========================================== */
export async function actionListarUsuariosEmpresa() {
  const admin = await getAdminLogado(true);
  const { data, error } = await supabaseAdmin
    .from("administradores")
    .select("id, usuario, nome, role, permissoes, is_owner, primeiro_acesso, created_at")
    .eq("empresa_id", admin.empresa_id)
    .order("created_at", { ascending: true });

  if (error && (error.code === "42703" || error.message?.includes("primeiro_acesso"))) {
    const { data: fallbackData, error: fallbackErr } = await supabaseAdmin
      .from("administradores")
      .select("id, usuario, nome, role, permissoes, is_owner, created_at")
      .eq("empresa_id", admin.empresa_id)
      .order("created_at", { ascending: true });
    if (fallbackErr) throw fallbackErr;
    return fallbackData || [];
  }

  if (error) throw error;
  return data || [];
}

export async function actionCriarUsuarioEmpresa({ usuario, senha, nome, permissoes }) {
  const admin = await getAdminLogado(true);
  const cleanUser = usuario.trim().toLowerCase();
  if (cleanUser.length < 3 || senha.length < 6) {
    throw new Error("Usuário deve ter 3+ caracteres e senha 6+ caracteres.");
  }

  const defaultPerms = permissoes || [
    "agenda",
    "bloqueios",
    "politicas",
    "triagem",
    "personalizacao",
    "equipe",
    "integracoes"
  ];

  let { data, error } = await supabaseAdmin
    .from("administradores")
    .insert({
      usuario: cleanUser,
      senha_hash: senha,
      nome: nome?.trim() || null,
      role: "empresa",
      empresa_id: admin.empresa_id,
      permissoes: defaultPerms,
      is_owner: false,
      primeiro_acesso: true
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("Este nome de usuário já está em uso.");
    // Fallback se a coluna primeiro_acesso não existir
    const { data: retryData, error: retryErr } = await supabaseAdmin
      .from("administradores")
      .insert({
        usuario: cleanUser,
        senha_hash: senha,
        nome: nome?.trim() || null,
        role: "empresa",
        empresa_id: admin.empresa_id,
        permissoes: defaultPerms,
        is_owner: false
      })
      .select()
      .single();

    if (retryErr) {
      const { data: fallbackData, error: fallbackErr } = await supabaseAdmin
        .from("administradores")
        .insert({
          usuario: cleanUser,
          senha_hash: senha,
          role: "empresa",
          empresa_id: admin.empresa_id
        })
        .select()
        .single();
      if (fallbackErr) throw new Error(fallbackErr.message);
      return fallbackData;
    }
    return retryData;
  }
  return data;
}

export async function actionAtualizarUsuarioEmpresa(id, { nome, permissoes, senha }) {
  const admin = await getAdminLogado(true);
  const updatePayload = {};
  if (nome !== undefined) updatePayload.nome = nome?.trim() || null;
  if (permissoes !== undefined) updatePayload.permissoes = permissoes;
  if (senha && senha.trim().length >= 6) updatePayload.senha_hash = senha.trim();

  const { error } = await supabaseAdmin
    .from("administradores")
    .update(updatePayload)
    .eq("id", id)
    .eq("empresa_id", admin.empresa_id);

  if (error) throw new Error(error.message);
  return true;
}

export async function actionDeletarUsuarioEmpresa(id) {
  const admin = await getAdminLogado(true);
  if (admin.id === id) throw new Error("Você não pode excluir sua própria conta.");

  const { error } = await supabaseAdmin
    .from("administradores")
    .delete()
    .eq("id", id)
    .eq("empresa_id", admin.empresa_id)
    .eq("is_owner", false);

  if (error) throw new Error(error.message);
  return true;
}

export async function actionSalvarLogoEmpresa(logo_url) {
  const admin = await getAdminLogado(true);
  
  let { error } = await supabaseAdmin
    .from("empresas")
    .update({ logo_url: logo_url || null })
    .eq("id", admin.empresa_id);

  if (error) {
    const { data: emp } = await supabaseAdmin.from("empresas").select("config_campos").eq("id", admin.empresa_id).single();
    const newConfig = { ...(emp?.config_campos || {}), logo_url: logo_url || null };
    await supabaseAdmin.from("empresas").update({ config_campos: newConfig }).eq("id", admin.empresa_id);
  }
  return true;
}

export async function actionSalvarTriagem(novaTriagem) {
  try {
    const admin = await getAdminLogado(true);

    if (!novaTriagem.pergunta || !novaTriagem.pergunta.trim()) {
      return { success: false, error: "A pergunta não pode estar vazia." };
    }

    if (!novaTriagem.opcoes || novaTriagem.opcoes.length === 0) {
      return { success: false, error: "Adicione pelo menos uma opção de resposta." };
    }

    const payload = { 
      especialidade: (novaTriagem.especialidade && novaTriagem.especialidade !== "Todas") ? novaTriagem.especialidade.trim() : null,
      obrigatoria: novaTriagem.obrigatoria !== false,
      pergunta: novaTriagem.pergunta.trim(),
      empresa_id: admin.empresa_id,
      servico_id: novaTriagem.servico_id || null,
      ativa: true
    };

    let { data: perguntaSalva, error: err1 } = await supabaseAdmin
      .from("perguntas_triagem")
      .insert(payload)
      .select()
      .single();

    // Fallback se as colunas especialidade ou obrigatoria ainda não existirem no Supabase
    if (err1 && (err1.message?.includes("column") || err1.code === "42703")) {
      const fallbackPayload = {
        pergunta: novaTriagem.pergunta.trim(),
        empresa_id: admin.empresa_id,
        servico_id: novaTriagem.servico_id || null,
        ativa: true
      };
      const retry = await supabaseAdmin
        .from("perguntas_triagem")
        .insert(fallbackPayload)
        .select()
        .single();
      perguntaSalva = retry.data;
      err1 = retry.error;
    }

    if (err1) {
      return { success: false, error: `Erro no banco ao salvar pergunta: ${err1.message}` };
    }

    const opcoesFormatadas = (novaTriagem.opcoes || []).map(op => ({
      pergunta_id: perguntaSalva.id,
      texto_opcao: op.texto_opcao ? op.texto_opcao.trim() : "",
      regra_bloqueio_dias: parseInt(op.regra_bloqueio_dias || 0, 10),
      tipo_contagem_dias: op.tipo_contagem_dias || "corridos"
    }));

    const { error: err2 } = await supabaseAdmin.from("opcoes_triagem").insert(opcoesFormatadas);
    if (err2) {
      return { success: false, error: `Erro ao salvar opções da pergunta: ${err2.message}` };
    }

    return { success: true };
  } catch (error) {
    console.error("❌ Erro em actionSalvarTriagem:", error);
    return { success: false, error: error.message || "Falha ao registrar pergunta clínica." };
  }
}

export async function actionDeletarTriagem(id) {
  const admin = await getAdminLogado(true);

  const { error } = await supabaseAdmin
    .from("perguntas_triagem")
    .delete()
    .eq("id", id)
    .eq("empresa_id", admin.empresa_id);

  if (error) throw error;
  return true;
}

export async function actionMigrarNomeBloqueios(nomeAntigoERP, nomeOficialSistema) {
  const admin = await getAdminLogado(true);

  const { error } = await supabaseAdmin
    .from("bloqueios_horarios")
    .update({ medico_profissional: nomeOficialSistema })
    .eq("medico_profissional", nomeAntigoERP)
    .eq("empresa_id", admin.empresa_id);
    
  if (error) throw error;
  return true;
}

export async function fetchAdminRegras() {
  try {
    const admin = await getAdminLogado(true);

    let { data, error } = await supabaseAdmin
      .from("regras_agenda")
      .select("*")
      .eq("empresa_id", admin.empresa_id);

    if (error) {
      console.warn("Aviso ao buscar regras de agenda:", error.message);
      return [];
    }
    return data || [];
  } catch (e) {
    console.warn("Erro ao buscar regras de agenda:", e);
    return [];
  }
}

export async function actionCriarRegraAgenda(regra) {
  try {
    const admin = await getAdminLogado(true);

    const fullPayload = {
      empresa_id: admin.empresa_id,
      servico_id: regra.servico_id || null,
      especialidade: regra.especialidade || null,
      dias_semana: Array.isArray(regra.dias_semana) ? regra.dias_semana : [],
      hora_inicio: regra.hora_inicio || "08:00",
      hora_fim: regra.hora_fim || "18:00",
      ultimo_horario_agendamento: regra.ultimo_horario_agendamento || null,
      tipos_permitidos: Array.isArray(regra.tipos_permitidos) ? regra.tipos_permitidos : [],
      duracao_slot_minutos: Number(regra.duracao_slot_minutos) || 0,
      ocupacao_sequencial: Boolean(regra.ocupacao_sequencial),
      tipo_bloqueio: regra.tipo_bloqueio || "total",
      ativo: regra.ativo !== false
    };

    let { data, error } = await supabaseAdmin.from("regras_agenda").insert([fullPayload]).select();

    // Fallback progressivo se colunas novas ainda não existirem no Supabase
    if (error && (error.code === "42703" || error.code === "PGRST204" || error.message?.includes("column") || error.message?.includes("tipo_bloqueio") || error.message?.includes("especialidade") || error.message?.includes("schema cache"))) {
      delete fullPayload.tipo_bloqueio;
      const retry1 = await supabaseAdmin.from("regras_agenda").insert([fullPayload]).select();
      if (retry1.error && (retry1.error.code === "42703" || retry1.error.code === "PGRST204" || retry1.error.message?.includes("column"))) {
        const fallbackPayload = {
          empresa_id: admin.empresa_id,
          servico_id: regra.servico_id || null,
          dias_semana: Array.isArray(regra.dias_semana) ? regra.dias_semana : [],
          hora_inicio: regra.hora_inicio || "08:00",
          hora_fim: regra.hora_fim || "18:00",
          ativo: regra.ativo !== false
        };
        const retry2 = await supabaseAdmin.from("regras_agenda").insert([fallbackPayload]).select();
        if (retry2.error) return { success: false, error: retry2.error.message };
        data = retry2.data;
      } else if (retry1.error) {
        return { success: false, error: retry1.error.message };
      } else {
        data = retry1.data;
      }
    } else if (error) {
      console.error("Erro ao criar regra de agenda:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error("❌ Erro em actionCriarRegraAgenda:", err);
    return { success: false, error: err.message || "Falha ao criar regra de agenda." };
  }
}

export async function actionAtualizarRegraAgenda(id, regra) {
  try {
    const admin = await getAdminLogado(true);
    const allowed = {
      servico_id: regra.servico_id || null,
      especialidade: regra.especialidade || null,
      dias_semana: Array.isArray(regra.dias_semana) ? regra.dias_semana : [],
      hora_inicio: regra.hora_inicio,
      hora_fim: regra.hora_fim,
      ultimo_horario_agendamento: regra.ultimo_horario_agendamento,
      tipos_permitidos: Array.isArray(regra.tipos_permitidos) ? regra.tipos_permitidos : [],
      duracao_slot_minutos: Number(regra.duracao_slot_minutos) || 0,
      ocupacao_sequencial: Boolean(regra.ocupacao_sequencial),
      tipo_bloqueio: regra.tipo_bloqueio || "total",
      ativo: regra.ativo !== false
    };

    let { data, error } = await supabaseAdmin
      .from("regras_agenda")
      .update(allowed)
      .eq("id", id)
      .eq("empresa_id", admin.empresa_id)
      .select()
      .single();

    if (error && (error.code === "42703" || error.code === "PGRST204" || error.message?.includes("column") || error.message?.includes("tipo_bloqueio") || error.message?.includes("especialidade") || error.message?.includes("schema cache"))) {
      delete allowed.tipo_bloqueio;
      const retry1 = await supabaseAdmin
        .from("regras_agenda")
        .update(allowed)
        .eq("id", id)
        .eq("empresa_id", admin.empresa_id)
        .select()
        .single();

      if (retry1.error && (retry1.error.code === "42703" || retry1.error.code === "PGRST204" || retry1.error.message?.includes("column"))) {
        const basicPayload = {
          servico_id: regra.servico_id || null,
          dias_semana: Array.isArray(regra.dias_semana) ? regra.dias_semana : [],
          hora_inicio: regra.hora_inicio,
          hora_fim: regra.hora_fim,
          ativo: regra.ativo !== false
        };

        const retry2 = await supabaseAdmin
          .from("regras_agenda")
          .update(basicPayload)
          .eq("id", id)
          .eq("empresa_id", admin.empresa_id)
          .select()
          .single();

        if (retry2.error) {
          return { success: false, error: retry2.error.message };
        }
        data = retry2.data;
      } else if (retry1.error) {
        return { success: false, error: retry1.error.message };
      } else {
        data = retry1.data;
      }
    } else if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error("❌ Erro em actionAtualizarRegraAgenda:", err);
    return { success: false, error: err.message || "Falha ao atualizar regra de agenda." };
  }
}

export async function fetchAdminPolicies() {
  const admin = await getAdminLogado(true);
  const { data, error } = await supabaseAdmin
    .from("empresas")
    .select("config_regras")
    .eq("id", admin.empresa_id)
    .single();

  if (error) throw error;
  return data?.config_regras || {};
}

export async function actionSalvarPolicies(config) {
  const admin = await getAdminLogado(true);
  const normalized = {
    retorno_prazo_dias: Math.min(365, Math.max(1, Number(config.retorno_prazo_dias || 30))),
    retorno_exige_pagamento: config.retorno_exige_pagamento !== false,
    delay_confirmacao_segundos: Math.min(300, Math.max(0, Number(config.delay_confirmacao_segundos || 0)))
  };
  const { error } = await supabaseAdmin.from("empresas").update({ config_regras: normalized }).eq("id", admin.empresa_id);
  if (error) throw error;
  return normalized;
}

export async function fetchAdminCustomization() {
  const admin = await getAdminLogado(true);
  let { data, error } = await supabaseAdmin
    .from("empresas")
    .select("id, config_campos, config_mensagens, especialidades")
    .eq("id", admin.empresa_id)
    .single();

  if (error) {
    const fallback = await supabaseAdmin
      .from("empresas")
      .select("*")
      .eq("id", admin.empresa_id)
      .single();
    if (fallback.error) throw fallback.error;
    data = fallback.data;
  }
  return data;
}

export async function actionSalvarCustomization({ config_campos, config_mensagens }) {
  const admin = await getAdminLogado(true);
  const updatePayload = {
    config_campos,
    config_mensagens
  };

  const { error } = await supabaseAdmin
    .from("empresas")
    .update(updatePayload)
    .eq("id", admin.empresa_id);

  if (error) throw error;

  // Registrar auditoria da alteração
  await actionRegistrarAuditoria({
    modulo: "personalizacao",
    acao: "Atualização de Personalização & Mensagens",
    detalhes: `Configurações da clínica e automações de mensagens salvas por ${admin.usuario}.`,
    alterado_por: admin.usuario
  });

  return true;
}

export async function actionCriarRegraMassa(regrasArray) {
  try {
    const admin = await getAdminLogado(true);
    const payload = regrasArray.map((r) => ({
      empresa_id: admin.empresa_id,
      servico_id: r.servico_id || null,
      especialidade: r.especialidade || null,
      dias_semana: Array.isArray(r.dias_semana) ? r.dias_semana : [],
      hora_inicio: r.hora_inicio || "08:00",
      hora_fim: r.hora_fim || "18:00",
      ultimo_horario_agendamento: r.ultimo_horario_agendamento || null,
      tipos_permitidos: Array.isArray(r.tipos_permitidos) ? r.tipos_permitidos : [],
      duracao_slot_minutos: Number(r.duracao_slot_minutos) || 0,
      ocupacao_sequencial: Boolean(r.ocupacao_sequencial),
      tipo_bloqueio: r.tipo_bloqueio || "total",
      ativo: r.ativo !== false
    }));

    let { data, error } = await supabaseAdmin.from("regras_agenda").insert(payload).select();

    if (error && (error.code === "42703" || error.code === "PGRST204" || error.message?.includes("column") || error.message?.includes("tipo_bloqueio") || error.message?.includes("especialidade") || error.message?.includes("schema cache"))) {
      const fallbackPayload = payload.map((p) => ({
        empresa_id: p.empresa_id,
        servico_id: p.servico_id,
        dias_semana: p.dias_semana,
        hora_inicio: p.hora_inicio,
        hora_fim: p.hora_fim,
        ativo: p.ativo
      }));
      const retry = await supabaseAdmin.from("regras_agenda").insert(fallbackPayload).select();
      if (retry.error) return { success: false, error: retry.error.message };
      data = retry.data;
    } else if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message || "Falha ao criar regras." };
  }
}

export async function actionDeletarRegra(id) {
  try {
    const admin = await getAdminLogado(true);
    const { error } = await supabaseAdmin
      .from("regras_agenda")
      .delete()
      .eq("id", id)
      .eq("empresa_id", admin.empresa_id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message || "Falha ao excluir regra." };
  }
}

export async function actionProvisionarEmpresa({ nome, slug, usuario, senha }) {
  const admin = await getAdminLogado(false);
  if (admin.role !== "sistema") throw new Error("Apenas administradores do sistema podem provisionar ambientes.");
  const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
  const cleanUser = usuario.trim().toLowerCase();
  if (!nome.trim() || cleanSlug.length < 3 || cleanUser.length < 3 || senha.length < 8) throw new Error("Preencha nome, slug, login e uma senha com pelo menos 8 caracteres.");
  const { data, error } = await supabaseAdmin.rpc("provisionar_empresa", {
    p_nome: nome.trim(), p_slug: cleanSlug, p_usuario: cleanUser, p_senha: senha
  });
  if (error) throw new Error(error.code === "23505" ? "Slug ou login já cadastrado." : error.message);
  return data;
}

export async function actionListarEmpresas() {
  const admin = await getAdminLogado(false);
  if (admin.role !== "sistema") throw new Error("Acesso negado: apenas o administrador master pode listar todas as empresas.");
  const { data, error } = await supabaseAdmin.from("empresas").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function actionListarEmpresasMaster() {
  return actionListarEmpresas();
}

export async function actionCriarEmpresaMaster({
  nome,
  slug,
  subdominio,
  email,
  telefone,
  admin_usuario,
  admin_senha
}) {
  const admin = await getAdminLogado(false);
  if (admin.role !== "sistema") {
    throw new Error("Apenas administradores do sistema podem provisionar novos ambientes.");
  }

  const cleanSlug = slug
    ? slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "")
    : "";
  const cleanUser = admin_usuario ? admin_usuario.trim().toLowerCase() : "";

  if (!nome?.trim() || cleanSlug.length < 3 || cleanUser.length < 3 || (admin_senha || "").length < 6) {
    throw new Error("Preencha nome da clínica, slug, usuário e uma senha com pelo menos 6 caracteres.");
  }

  // 1. Tenta via RPC provisionar_empresa se disponível
  try {
    const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc("provisionar_empresa", {
      p_nome: nome.trim(),
      p_slug: cleanSlug,
      p_usuario: cleanUser,
      p_senha: admin_senha
    });

    if (!rpcErr && rpcData) {
      if (subdominio || email || telefone) {
        await supabaseAdmin
          .from("empresas")
          .update({
            subdominio: subdominio?.trim() || null,
            email: email?.trim() || null,
            telefone: telefone?.trim() || null
          })
          .eq("slug", cleanSlug);
      }
      return { success: true, data: rpcData };
    }
  } catch (e) {}

  // 2. Criação direta no Supabase com fallback seguro
  const { data: novaEmp, error: errEmp } = await supabaseAdmin
    .from("empresas")
    .insert({
      nome: nome.trim(),
      slug: cleanSlug,
      subdominio: subdominio?.trim() || null,
      email: email?.trim() || null,
      telefone: telefone?.trim() || null,
      config_campos: {
        ordem_etapas: [
          "boas_vindas",
          "identificacao",
          "especialidade",
          "triagem",
          "modalidade",
          "agenda",
          "checkout"
        ],
        tema: {
          cor_primaria: "#9FC131",
          cor_secundaria: "#10B981",
          escopo_tema: "ambos",
          visualizacao_padrao: "lista"
        }
      },
      config_regras: {
        retorno_prazo_dias: 30,
        retorno_exige_pagamento: false,
        delay_confirmacao_segundos: 0
      }
    })
    .select()
    .single();

  if (errEmp) {
    if (errEmp.code === "23505") throw new Error("Slug já cadastrado em outra clínica.");
    throw new Error(errEmp.message);
  }

  const { error: errAdm } = await supabaseAdmin
    .from("administradores")
    .insert({
      usuario: cleanUser,
      senha_hash: admin_senha,
      nome: `Admin ${nome.trim()}`,
      role: "empresa",
      empresa_id: novaEmp.id,
      is_owner: true,
      primeiro_acesso: false,
      permissoes: [
        "agenda",
        "metricas",
        "equipe",
        "bloqueios",
        "politicas",
        "triagem",
        "personalizacao",
        "integracoes",
        "conta"
      ]
    });

  if (errAdm) {
    if (errAdm.code === "23505") throw new Error("Este nome de usuário administrativo já está em uso.");
    throw new Error(errAdm.message);
  }

  return { success: true, data: novaEmp };
}

export async function actionAtualizarChavesEmpresaMaster(empresaId, config_chaves) {
  return actionSalvarChavesEmpresaMaster(empresaId, config_chaves);
}

export async function actionExcluirEmpresaMaster(empresaId) {
  const admin = await getAdminLogado(false);
  if (admin.role !== "sistema") {
    throw new Error("Apenas administradores do sistema podem excluir clínicas.");
  }

  try {
    await supabaseAdmin.from("administradores").delete().eq("empresa_id", empresaId);
    await supabaseAdmin.from("agendamentos").delete().eq("empresa_id", empresaId);
    await supabaseAdmin.from("servicos").delete().eq("empresa_id", empresaId);
    await supabaseAdmin.from("bloqueios_horarios").delete().eq("empresa_id", empresaId);
    await supabaseAdmin.from("fila_mensagens").delete().eq("empresa_id", empresaId);
    await supabaseAdmin.from("regras_agenda").delete().eq("empresa_id", empresaId);
    await supabaseAdmin.from("perguntas_triagem").delete().eq("empresa_id", empresaId);

    const { error } = await supabaseAdmin.from("empresas").delete().eq("id", empresaId);
    if (error) throw error;

    return { success: true };
  } catch (err) {
    console.error("Erro ao excluir empresa master:", err);
    throw new Error(`Falha ao excluir clínica: ${err.message}`);
  }
}

/* ==========================================
   FUNÇÕES DE VALIDAÇÃO DE MENSAGENS E RE-PROCESSAMENTO
   ========================================== */
export async function actionFetchMensagensRascunhoERP() {
  const admin = await getAdminLogado(true);
  const { data, error } = await supabaseAdmin
    .from("fila_mensagens")
    .select("*")
    .eq("empresa_id", admin.empresa_id)
    .eq("status", "rascunho")
    .eq("gatilho", "importado_erp")
    .order("data_hora_programada", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function actionAprovarMensagensRascunhoERP(ids) {
  const admin = await getAdminLogado(true);
  if (!ids || ids.length === 0) return true;

  const { error } = await supabaseAdmin
    .from("fila_mensagens")
    .update({ status: "pendente" })
    .in("id", ids)
    .eq("empresa_id", admin.empresa_id)
    .eq("status", "rascunho");

  if (error) throw error;
  return true;
}

export async function actionDescartarMensagensRascunhoERP(ids) {
  const admin = await getAdminLogado(true);
  if (!ids || ids.length === 0) return true;

  const { error } = await supabaseAdmin
    .from("fila_mensagens")
    .delete()
    .in("id", ids)
    .eq("empresa_id", admin.empresa_id)
    .eq("status", "rascunho");

  if (error) throw error;
  return true;
}

export async function actionReprocessarMapeamentoBanco() {
  const admin = await getAdminLogado(true);

  const { data: bloqueiosImportados, error: errFetchOld } = await supabaseAdmin
    .from("bloqueios_horarios")
    .select("*")
    .eq("empresa_id", admin.empresa_id);

  if (errFetchOld) throw errFetchOld;

  let corrigidosCount = 0;
  const regexPlano = /(unimed|bradesco|casssi|funasa|geap|sulamerica|hapvida|samp|particular|amil|ipam|ipem|plano|convenio)/i;

  for (const item of (bloqueiosImportados || [])) {
    let currentEsp = item.especialidade || "";
    let currentObs = item.observacoes || "";
    let currentConv = item.convenio || "";

    let novoConv = currentConv;
    let novaEsp = currentEsp;

    if (!currentConv && regexPlano.test(currentEsp)) {
      novoConv = currentEsp;
      novaEsp = "Geral";
      corrigidosCount++;
    } else if (currentObs && currentObs.includes("Plano:") && !currentConv) {
      const matchObs = currentObs.match(/Plano:\s*([^|]+)/i);
      if (matchObs && matchObs[1]) {
        novoConv = matchObs[1].trim();
        corrigidosCount++;
      }
    }

    if (novoConv !== currentConv || novaEsp !== currentEsp) {
      await supabaseAdmin
        .from("bloqueios_horarios")
        .update({
          convenio: novoConv || null,
          especialidade: novaEsp || "Geral"
        })
        .eq("id", item.id);
    }
  }

  return { success: true, count: corrigidosCount };
}

export async function actionSalvarChavesEmpresaMaster(empresaId, config_chaves) {
  const admin = await getAdminLogado(false);
  if (admin.role !== "sistema") throw new Error("Apenas administradores do sistema podem alterar chaves de empresas.");

  const payload = {
    config_chaves: config_chaves || {},
    rmchat_webhook_url: config_chaves?.rmchat_webhook_url ? config_chaves.rmchat_webhook_url.trim() : null
  };

  const { error } = await supabaseAdmin
    .from("empresas")
    .update(payload)
    .eq("id", empresaId);

  if (error) {
    const { error: errFallback } = await supabaseAdmin
      .from("empresas")
      .update({ config_chaves })
      .eq("id", empresaId);
    if (errFallback) throw errFallback;
  }
  return true;
}

export async function actionTestarPushRmChat(urlWebhook, telefone = "558494229126", nome = "Teste RM Agenda") {
  const admin = await getAdminLogado(false);
  if (!urlWebhook || !urlWebhook.startsWith("http")) {
    throw new Error("URL de Webhook inválida.");
  }

  const numFormatado = formatarTelefoneEnvio(telefone);

  const payload = {
    name: nome,
    number: numFormatado,
    phone: numFormatado,
    texto: `🔔 [Teste RM Agenda] Conexão com o RM Agenda estabelecida com sucesso para o servidor!`
  };

  const response = await fetch(urlWebhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Servidor RM Chat retornou status ${response.status}`);
  }

  return { success: true };
}

/* ==========================================
   GESTÃO DE ENFERMIDADES E DADOS CLÍNICOS
   ========================================== */
export async function actionSalvarEnfermidadesPaciente({ pacienteId, agendamentoId, enfermidades }) {
  const admin = await getAdminLogado(true);
  const cleanList = Array.isArray(enfermidades) ? [...new Set(enfermidades.map((e) => e.trim()).filter(Boolean))] : [];

  // 1. Atualizar ou garantir que as enfermidades existam no catálogo geral da clínica
  const { data: emp } = await supabaseAdmin
    .from("empresas")
    .select("config_campos")
    .eq("id", admin.empresa_id)
    .single();

  const confCampos = emp?.config_campos || {};
  const catalogoAtual = Array.isArray(confCampos.catalogo_enfermidades) ? confCampos.catalogo_enfermidades : [
    "Refluxo",
    "Gastrite",
    "Hipertensão",
    "Diabetes",
    "Doença Celíaca",
    "Hérnia de Hiato",
    "Esteatose Hepática",
    "Síndrome do Intestino Irritável"
  ];

  const novoCatalogo = [...new Set([...catalogoAtual, ...cleanList])];
  const pacientesEnfermidadesMap = confCampos.pacientes_enfermidades || {};
  if (pacienteId) {
    pacientesEnfermidadesMap[pacienteId] = cleanList;
  }

  await supabaseAdmin
    .from("empresas")
    .update({
      config_campos: {
        ...confCampos,
        catalogo_enfermidades: novoCatalogo,
        pacientes_enfermidades: pacientesEnfermidadesMap
      }
    })
    .eq("id", admin.empresa_id);

  // 2. Se houver pacienteId, tentar atualizar a tabela pacientes
  if (pacienteId) {
    try {
      await supabaseAdmin
        .from("pacientes")
        .update({ enfermidades: cleanList })
        .eq("id", pacienteId);
    } catch (e) {
      // Coluna pode não existir ainda no Supabase
    }
  }

  return { success: true, enfermidades: cleanList };
}

export async function actionSalvarCatalogoEnfermidades(catalogo) {
  const admin = await getAdminLogado(true);
  const cleanList = Array.isArray(catalogo) ? [...new Set(catalogo.map((e) => e.trim()).filter(Boolean))] : [];

  const { data: emp } = await supabaseAdmin
    .from("empresas")
    .select("config_campos")
    .eq("id", admin.empresa_id)
    .single();

  const confCampos = emp?.config_campos || {};
  await supabaseAdmin
    .from("empresas")
    .update({
      config_campos: {
        ...confCampos,
        catalogo_enfermidades: cleanList
      }
    })
    .eq("id", admin.empresa_id);

  return { success: true, catalogo: cleanList };
}

/* ==========================================
   LOGS E AUDITORIA DE DISPAROS DE MENSAGENS WHATSAPP
   ========================================== */
export async function actionListarHistoricoMensagensAdmin() {
  const admin = await getAdminLogado(true);
  try {
    let { data, error } = await supabaseAdmin
      .from("fila_mensagens")
      .select("*")
      .eq("empresa_id", admin.empresa_id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error && (error.code === "42703" || error.message?.includes("created_at"))) {
      const retryProg = await supabaseAdmin
        .from("fila_mensagens")
        .select("*")
        .eq("empresa_id", admin.empresa_id)
        .order("data_hora_programada", { ascending: false })
        .limit(100);
      if (!retryProg.error) {
        data = retryProg.data;
        error = null;
      } else {
        const retrySimple = await supabaseAdmin
          .from("fila_mensagens")
          .select("*")
          .eq("empresa_id", admin.empresa_id)
          .limit(100);
        data = retrySimple.data || [];
        error = null;
      }
    }

    if (error) {
      console.warn("Aviso ao buscar histórico de mensagens:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn("Falha segura ao listar histórico de mensagens:", err);
    return [];
  }
}

export async function actionDispararMensagemManualAdmin(id) {
  const admin = await getAdminLogado(true);
  const { data: msg, error: errFetch } = await supabaseAdmin
    .from("fila_mensagens")
    .select("*, agendamentos(*, pacientes(*))")
    .eq("id", id)
    .eq("empresa_id", admin.empresa_id)
    .single();

  if (errFetch || !msg) throw new Error("Mensagem não encontrada.");

  const { data: emp } = await supabaseAdmin
    .from("empresas")
    .select("id, nome, slug, config_chaves, rmchat_webhook_url, config_campos")
    .eq("id", admin.empresa_id)
    .single();

  const configWebhooks = emp?.config_campos?.config_webhooks || emp?.config_chaves?.config_webhooks || {};
  const isWebhook = msg.tipo_envio === "webhook";

  const urlWebhookPadrao =
    emp?.rmchat_webhook_url ||
    emp?.config_chaves?.rmchat_webhook_url ||
    emp?.config_chaves?.url_rmchat ||
    emp?.config_campos?.rmchat_webhook_url;

  const urlDestino = (msg.url_webhook_customizada || (isWebhook ? configWebhooks.webhook_url : urlWebhookPadrao) || urlWebhookPadrao)?.trim();

  if (!urlDestino || !urlDestino.startsWith("http")) {
    throw new Error(isWebhook ? "URL do Webhook Inteligente não configurada." : "URL do Webhook do WhatsApp não configurada.");
  }

  const ag = msg.agendamentos;
  const pac = ag?.pacientes;
  const nomeCompleto = (pac?.nome_completo || msg.nome_paciente || "Paciente").trim();
  const numLimpo = formatarTelefoneEnvio(msg.telefone_whatsapp || pac?.telefone_whatsapp);

  let payload;
  const headers = { "Content-Type": "application/json" };

  if (isWebhook) {
    headers["x-rmcare-event"] = "fluxo_inteligente_manual";
    if (configWebhooks.webhook_secret) {
      headers["x-webhook-secret"] = configWebhooks.webhook_secret;
    }

    payload = {
      evento: "disparo_fluxo_inteligente",
      tipo_disparo: "webhook",
      disparado_manualmente: true,
      mensagem_id: msg.id,
      gatilho: msg.gatilho || "avulsa_manual",
      empresa: {
        id: emp.id,
        nome: emp.nome,
        slug: emp.slug
      },
      agendamento: ag ? {
        id: ag.id,
        data: ag.data_agendamento,
        horario: ag.horario_agendamento,
        servico: ag.subtipo_exame || ag.medico_profissional || "Atendimento",
        especialista: ag.medico_profissional,
        especialidade: ag.tipo_servico || "Consulta",
        modalidade: ag.modalidade || "Particular",
        status_atual: ag.status_atendimento || "agendado"
      } : { id: msg.agendamento_id },
      paciente: {
        nome: nomeCompleto,
        nome_completo: nomeCompleto,
        primeiro_nome: nomeCompleto,
        telefone: numLimpo,
        cpf: pac?.cpf || null,
        enfermidades: pac?.enfermidades || []
      },
      mensagem: msg.mensagem,
      anexo_url: msg.anexo_url || null,
      opcoes_resposta: configWebhooks.respostas_mapping || {
        confirmar: ["1", "sim", "confirmo"],
        cancelar: ["2", "nao", "cancelar"],
        remarcar: ["3", "remarcar", "reagendar"]
      },
      webhook_retorno_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://rmagenda.com.br"}/api/webhook-resposta`
    };
  } else {
    headers["x-rmcare-event"] = "whatsapp_msg_manual";
    let textoFinal = msg.mensagem || "";
    if (msg.anexo_url && !textoFinal.includes(msg.anexo_url)) {
      textoFinal += `

📎 Documento/Anexo: ${msg.anexo_url}`;
    }

    payload = {
      name: nomeCompleto,
      number: numLimpo,
      phone: numLimpo,
      texto: textoFinal,
      mensagem: textoFinal,
      media_url: msg.anexo_url || null
    };
  }

  const res = await fetch(urlDestino, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    await supabaseAdmin.from("fila_mensagens").update({ status: "falha" }).eq("id", id);
    throw new Error(`Falha ao disparar: status ${res.status}`);
  }

  await supabaseAdmin.from("fila_mensagens").update({ status: "enviada" }).eq("id", id);
  return { success: true };
}

/* ==========================================
   GESTÃO DE INTEGRAÇÕES ERP E MAPEAMENTOS
   ========================================== */
export async function actionBloquearProfissionalERP(nomeProfissional) {
  const admin = await getAdminLogado(true);
  const cleanName = (nomeProfissional || "").trim();
  if (!cleanName) throw new Error("Nome do profissional inválido.");

  const { data: emp } = await supabaseAdmin
    .from("empresas")
    .select("config_campos")
    .eq("id", admin.empresa_id)
    .single();

  const confCampos = emp?.config_campos || {};
  const bloqueadosAtuais = Array.isArray(confCampos.profissionais_erp_bloqueados)
    ? confCampos.profissionais_erp_bloqueados
    : [];

  const novaLista = [...new Set([...bloqueadosAtuais, cleanName])];

  await supabaseAdmin
    .from("empresas")
    .update({
      config_campos: {
        ...confCampos,
        profissionais_erp_bloqueados: novaLista
      }
    })
    .eq("id", admin.empresa_id);

  // Inativa o profissional se ele existir na tabela de serviços
  try {
    await supabaseAdmin
      .from("servicos")
      .update({ ativo: false, status_agendamento: "inativo" })
      .eq("empresa_id", admin.empresa_id)
      .ilike("nome", `%${cleanName}%`);
  } catch (e) {}

  return { success: true, bloqueados: novaLista };
}

export async function actionDesbloquearProfissionalERP(nomeProfissional) {
  const admin = await getAdminLogado(true);
  const cleanName = (nomeProfissional || "").trim();

  const { data: emp } = await supabaseAdmin
    .from("empresas")
    .select("config_campos")
    .eq("id", admin.empresa_id)
    .single();

  const confCampos = emp?.config_campos || {};
  const bloqueadosAtuais = Array.isArray(confCampos.profissionais_erp_bloqueados)
    ? confCampos.profissionais_erp_bloqueados
    : [];

  const novaLista = bloqueadosAtuais.filter((n) => n.toLowerCase() !== cleanName.toLowerCase());

  await supabaseAdmin
    .from("empresas")
    .update({
      config_campos: {
        ...confCampos,
        profissionais_erp_bloqueados: novaLista
      }
    })
    .eq("id", admin.empresa_id);

  return { success: true, bloqueados: novaLista };
}

export async function actionAtualizarBloqueioERP(id, { medico_profissional, especialidade, convenio, observacoes }) {
  const admin = await getAdminLogado(true);
  const payload = {};
  if (medico_profissional !== undefined) payload.medico_profissional = medico_profissional?.trim() || null;
  if (especialidade !== undefined) payload.especialidade = especialidade?.trim() || "Geral";
  if (convenio !== undefined) payload.convenio = convenio?.trim() || null;
  if (observacoes !== undefined) payload.observacoes = observacoes?.trim() || null;

  const { error } = await supabaseAdmin
    .from("bloqueios_horarios")
    .update(payload)
    .eq("id", id)
    .eq("empresa_id", admin.empresa_id);

  if (error) throw error;
  return true;
}

export async function actionDeletarBloqueioERP(id) {
  const admin = await getAdminLogado(true);
  const { error } = await supabaseAdmin
    .from("bloqueios_horarios")
    .delete()
    .eq("id", id)
    .eq("empresa_id", admin.empresa_id);

  if (error) throw error;
  return true;
}

/* ==========================================
   GESTÃO DE MENSAGENS POR PACIENTE / EXAME ESPECÍFICO
   ========================================== */
export async function actionBuscarMensagensDoAgendamento({ agendamentoId, telefone }) {
  const admin = await getAdminLogado(true);
  const cleanPhone = telefone ? String(telefone).replace(/\D/g, "") : null;

  try {
    let query = supabaseAdmin
      .from("fila_mensagens")
      .select("*")
      .eq("empresa_id", admin.empresa_id);

    if (agendamentoId && cleanPhone) {
      const lastDigits = cleanPhone.length >= 8 ? cleanPhone.slice(-8) : cleanPhone;
      query = query.or(`agendamento_id.eq.${agendamentoId},telefone_whatsapp.ilike.%${lastDigits}%`);
    } else if (agendamentoId) {
      query = query.eq("agendamento_id", agendamentoId);
    } else if (cleanPhone) {
      const lastDigits = cleanPhone.length >= 8 ? cleanPhone.slice(-8) : cleanPhone;
      query = query.ilike("telefone_whatsapp", `%${lastDigits}%`);
    } else {
      return [];
    }

    let { data, error } = await query.order("data_hora_programada", { ascending: true });

    if (error && (error.code === "42703" || error.message?.includes("data_hora_programada"))) {
      const fallbackQuery = await supabaseAdmin
        .from("fila_mensagens")
        .select("*")
        .eq("empresa_id", admin.empresa_id)
        .eq("agendamento_id", agendamentoId);
      data = fallbackQuery.data || [];
      error = fallbackQuery.error;
    }

    if (error) {
      console.warn("Aviso ao buscar mensagens do agendamento:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.warn("Erro ao buscar mensagens do agendamento:", err);
    return [];
  }
}

export async function actionAtualizarMensagemFila({ id, mensagem, data_hora_programada, anexo_url, status, tipo_envio, url_webhook_customizada }) {
  const admin = await getAdminLogado(true);
  const payload = {};
  if (mensagem !== undefined) payload.mensagem = mensagem;
  if (data_hora_programada !== undefined) payload.data_hora_programada = data_hora_programada;
  if (status !== undefined) payload.status = status;
  if (anexo_url !== undefined) payload.anexo_url = anexo_url;
  if (tipo_envio !== undefined) payload.tipo_envio = tipo_envio;
  if (url_webhook_customizada !== undefined) payload.url_webhook_customizada = url_webhook_customizada;

  let { data, error } = await supabaseAdmin
    .from("fila_mensagens")
    .update(payload)
    .eq("id", id)
    .eq("empresa_id", admin.empresa_id)
    .select()
    .single();

  if (error && (error.code === "42703" || error.message?.includes("anexo_url") || error.message?.includes("column"))) {
    delete payload.anexo_url;
    delete payload.tipo_envio;
    delete payload.url_webhook_customizada;
    const retry = await supabaseAdmin
      .from("fila_mensagens")
      .update(payload)
      .eq("id", id)
      .eq("empresa_id", admin.empresa_id)
      .select()
      .single();
    if (retry.error) throw new Error(retry.error.message);
    data = retry.data;
  } else if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function actionCancelarMensagemFila(id) {
  const admin = await getAdminLogado(true);
  const { error } = await supabaseAdmin
    .from("fila_mensagens")
    .update({ status: "cancelada" })
    .eq("id", id)
    .eq("empresa_id", admin.empresa_id);

  if (error) throw new Error(error.message);
  return true;
}

export async function actionCriarMensagemFilaAvulsa({
  agendamentoId,
  telefone,
  nomePaciente,
  mensagem,
  dataHoraProgramada,
  anexo_url = null,
  gatilho = "avulsa",
  tipo_envio = "whatsapp",
  url_webhook_customizada = null
}) {
  const admin = await getAdminLogado(true);
  if (!mensagem || !mensagem.trim()) throw new Error("A mensagem não pode estar vazia.");

  const payload = {
    empresa_id: admin.empresa_id,
    agendamento_id: agendamentoId || null,
    telefone_whatsapp: telefone || "",
    nome_paciente: nomePaciente || "Paciente",
    mensagem: mensagem.trim(),
    data_hora_programada: dataHoraProgramada || new Date().toISOString(),
    status: "pendente",
    gatilho: gatilho,
    tipo_envio: tipo_envio || "whatsapp",
    url_webhook_customizada: url_webhook_customizada || null,
    anexo_url: anexo_url || null
  };

  let { data, error } = await supabaseAdmin
    .from("fila_mensagens")
    .insert(payload)
    .select()
    .single();

  if (error && (error.code === "42703" || error.message?.includes("anexo_url") || error.message?.includes("column"))) {
    delete payload.anexo_url;
    delete payload.tipo_envio;
    delete payload.url_webhook_customizada;
    const retry = await supabaseAdmin
      .from("fila_mensagens")
      .insert(payload)
      .select()
      .single();
    if (retry.error) throw new Error(retry.error.message);
    data = retry.data;
  } else if (error) {
    throw new Error(error.message);
  }

  return data;
}

/* ==========================================
   CICLO DE ATENDIMENTO E STATUS DE PRESENÇA
   ========================================== */
export async function actionAtualizarStatusAtendimento({ agendamentoId, novoStatus, motivo = null, observacoes = null }) {
  const admin = await getAdminLogado(true);
  if (!agendamentoId || !novoStatus) throw new Error("Parâmetros inválidos.");

  const { data: ag, error: errAg } = await supabaseAdmin
    .from("agendamentos")
    .select("id, empresa_id, status_atendimento, observacoes, paciente_id")
    .eq("id", agendamentoId)
    .eq("empresa_id", admin.empresa_id)
    .single();

  if (errAg || !ag) throw new Error("Agendamento não encontrado.");

  const agoraIso = new Date().toISOString();
  const updatePayload = {
    status_atendimento: novoStatus
  };

  if (novoStatus === "confirmado") {
    updatePayload.confirmado_em = agoraIso;
  } else if (novoStatus === "compareceu") {
    updatePayload.compareceu_em = agoraIso;
  } else if (novoStatus === "nao_compareceu") {
    updatePayload.ausente_em = agoraIso;
  } else if (novoStatus === "cancelado") {
    updatePayload.cancelado_em = agoraIso;
    updatePayload.motivo_cancelamento = motivo || "Cancelado pelo operador da clínica";
  }

  if (observacoes !== null && observacoes !== undefined) {
    updatePayload.observacoes = observacoes;
  }

  let { error: errUp } = await supabaseAdmin
    .from("agendamentos")
    .update(updatePayload)
    .eq("id", agendamentoId)
    .eq("empresa_id", admin.empresa_id);

  if (errUp && (errUp.code === "42703" || errUp.message?.includes("column"))) {
    const simplePayload = { status_atendimento: novoStatus };
    if (observacoes) simplePayload.observacoes = observacoes;
    if (novoStatus === "cancelado") simplePayload.motivo_cancelamento = motivo || "Cancelado";
    const retry = await supabaseAdmin
      .from("agendamentos")
      .update(simplePayload)
      .eq("id", agendamentoId)
      .eq("empresa_id", admin.empresa_id);
    if (retry.error) throw new Error(retry.error.message);
  } else if (errUp) {
    throw new Error(errUp.message);
  }

  return { success: true, status_atendimento: novoStatus };
}

/* ==========================================
   CONFIGURAÇÃO DE WEBHOOKS & FLUXOS INTELIGENTES
   ========================================== */
export async function actionSalvarConfigWebhooksEFluxos(configWebhooks) {
  const admin = await getAdminLogado(true);
  const { data: emp } = await supabaseAdmin
    .from("empresas")
    .select("config_campos, config_chaves")
    .eq("id", admin.empresa_id)
    .single();

  const confCampos = emp?.config_campos || {};
  const confChaves = emp?.config_chaves || {};

  const cleanConfig = {
    webhook_url: configWebhooks?.webhook_url ? configWebhooks.webhook_url.trim() : "",
    webhook_secret: configWebhooks?.webhook_secret ? configWebhooks.webhook_secret.trim() : "",
    webhook_tipo_padrao: configWebhooks?.webhook_tipo_padrao || "whatsapp",
    respostas_mapping: configWebhooks?.respostas_mapping || {
      confirmar: ["1", "sim", "confirmo", "confirmar"],
      cancelar: ["2", "nao", "cancelar", "cancelo"],
      remarcar: ["3", "remarcar", "reagendar"]
    },
    automacoes_presenca: {
      ativo: Boolean(configWebhooks?.automacoes_presenca?.ativo),
      acao_padrao: configWebhooks?.automacoes_presenca?.acao_padrao || "compareceu",
      tolerancia_minutos: Number(configWebhooks?.automacoes_presenca?.tolerancia_minutos || 60)
    }
  };

  const { error } = await supabaseAdmin
    .from("empresas")
    .update({
      config_campos: {
        ...confCampos,
        config_webhooks: cleanConfig,
        automacoes_presenca: cleanConfig.automacoes_presenca
      },
      config_chaves: {
        ...confChaves,
        config_webhooks: cleanConfig,
        webhook_url_inteligente: cleanConfig.webhook_url
      }
    })
    .eq("id", admin.empresa_id);

  if (error) throw new Error(error.message);
  return cleanConfig;
}

export async function actionTestarWebhookFluxoInteligente(urlWebhook, secret = "") {
  const admin = await getAdminLogado(true);
  if (!urlWebhook || !urlWebhook.startsWith("http")) {
    throw new Error("URL de Webhook inválida. Informe uma URL completa iniciando com http:// ou https://.");
  }

  const { data: emp } = await supabaseAdmin
    .from("empresas")
    .select("id, nome, slug")
    .eq("id", admin.empresa_id)
    .single();

  const numLimpo = formatarTelefoneEnvio("558494229126");

  const payload = {
    evento: "teste_conexao_webhook",
    tipo_disparo: "webhook",
    timestamp: new Date().toISOString(),
    empresa: {
      id: emp?.id || admin.empresa_id,
      nome: emp?.nome || "Clínica de Teste",
      slug: emp?.slug || "clinica-teste"
    },
    agendamento_exemplo: {
      id: "teste-0000-0000-0000",
      data: new Date().toISOString().substring(0, 10),
      horario: "09:00",
      servico: "Consulta Cardiológica",
      especialista: "Dr. Médico Exemplo",
      modalidade: "Particular",
      status_atual: "agendado"
    },
    paciente_exemplo: {
      nome: "Paciente de Teste",
      nome_completo: "Paciente de Teste",
      primeiro_nome: "Paciente de Teste",
      telefone: numLimpo,
      cpf: "000.000.000-00"
    },
    opcoes_resposta: {
      confirmar: ["1", "sim", "confirmo"],
      cancelar: ["2", "nao", "cancelar"],
      remarcar: ["3", "remarcar"]
    },
    webhook_retorno_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://rmagenda.com.br"}/api/webhook-resposta`
  };

  const headers = {
    "Content-Type": "application/json",
    "x-rmcare-event": "teste_conexao"
  };

  if (secret && secret.trim()) {
    headers["x-webhook-secret"] = secret.trim();
  }

  const response = await fetch(urlWebhook.trim(), {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  let respostaTexto = "";
  try {
    respostaTexto = await response.text();
  } catch (e) {}

  if (!response.ok) {
    throw new Error(`Servidor de Webhook retornou status HTTP ${response.status}: ${respostaTexto.slice(0, 150)}`);
  }

  return {
    success: true,
    status: response.status,
    resposta: respostaTexto.slice(0, 300)
  };
}

/* ==========================================
   PORTABILIDADE E EXPORTAÇÃO DE DADOS (LGPD / PLANILHAS)
   ========================================== */
export async function actionExportarDadosEmpresaCSV(tipo = "tudo") {
  const admin = await getAdminLogado(true);
  const empId = admin.empresa_id;
  const NL = String.fromCharCode(10);

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '""';
    let str = String(val).replace(/"/g, '""');
    if (Array.isArray(val)) str = val.join("; ").replace(/"/g, '""');
    return `"${str}"`;
  };

  const result = {};

  // 1. Pacientes
  if (tipo === "pacientes" || tipo === "tudo") {
    const { data: pacientes } = await supabaseAdmin
      .from("pacientes")
      .select("*")
      .eq("empresa_id", empId)
      .order("nome_completo", { ascending: true });

    const headers = ["ID", "Nome Completo", "CPF", "Telefone WhatsApp", "E-mail", "Data de Nascimento", "Enfermidades", "Criado Em"];
    const rows = (pacientes || []).map((p) => [
      escapeCSV(p.id),
      escapeCSV(p.nome_completo),
      escapeCSV(p.cpf),
      escapeCSV(p.telefone_whatsapp),
      escapeCSV(p.email),
      escapeCSV(p.data_nascimento),
      escapeCSV(Array.isArray(p.enfermidades) ? p.enfermidades.join(", ") : p.enfermidades),
      escapeCSV(p.created_at)
    ]);
    result.pacientes = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join(NL);
  }

  // 2. Agendamentos
  if (tipo === "agendamentos" || tipo === "tudo") {
    const { data: agendamentos } = await supabaseAdmin
      .from("agendamentos")
      .select("*, pacientes(*)")
      .eq("empresa_id", empId)
      .order("data_agendamento", { ascending: false })
      .order("horario_agendamento", { ascending: false });

    const headers = [
      "ID Agendamento",
      "Paciente",
      "CPF Paciente",
      "Telefone WhatsApp",
      "Data Atendimento",
      "Horario",
      "Especialista / Medico",
      "Especialidade / Servico",
      "Modalidade",
      "Status Atendimento",
      "Status Pagamento",
      "Valor",
      "Remarcado Em",
      "Motivo Cancelamento",
      "Observacoes",
      "Criado Em"
    ];
    const rows = (agendamentos || []).map((a) => [
      escapeCSV(a.id),
      escapeCSV(a.pacientes?.nome_completo || a.nome_paciente || "Paciente"),
      escapeCSV(a.pacientes?.cpf || a.cpf_paciente || ""),
      escapeCSV(a.pacientes?.telefone_whatsapp || a.telefone_paciente || ""),
      escapeCSV(a.data_agendamento),
      escapeCSV(a.horario_agendamento),
      escapeCSV(a.medico_profissional),
      escapeCSV(a.subtipo_exame || a.tipo_servico || "Consulta"),
      escapeCSV(a.modalidade || "Particular"),
      escapeCSV(a.status_atendimento || "agendado"),
      escapeCSV(a.status_pagamento_antecipado ? "Pago" : "Pendente"),
      escapeCSV(a.valor_atendimento || 0),
      escapeCSV(a.remarcado_em || ""),
      escapeCSV(a.motivo_cancelamento || ""),
      escapeCSV(a.observacoes || ""),
      escapeCSV(a.created_at)
    ]);
    result.agendamentos = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join(NL);
  }

  // 3. Fila de Mensagens e Logs
  if (tipo === "fila_mensagens" || tipo === "tudo") {
    const { data: fila } = await supabaseAdmin
      .from("fila_mensagens")
      .select("*")
      .eq("empresa_id", empId)
      .order("data_hora_programada", { ascending: false });

    const headers = [
      "ID Mensagem",
      "ID Agendamento",
      "Paciente",
      "Telefone WhatsApp",
      "Gatilho",
      "Tipo Envio",
      "Data/Hora Programada",
      "Status Envio",
      "Texto da Mensagem",
      "Anexo URL",
      "Resposta Recebida",
      "Respondido Em",
      "Criado Em"
    ];
    const rows = (fila || []).map((f) => [
      escapeCSV(f.id),
      escapeCSV(f.agendamento_id),
      escapeCSV(f.nome_paciente),
      escapeCSV(f.telefone_whatsapp),
      escapeCSV(f.gatilho),
      escapeCSV(f.tipo_envio || "whatsapp"),
      escapeCSV(f.data_hora_programada),
      escapeCSV(f.status),
      escapeCSV(f.mensagem),
      escapeCSV(f.anexo_url || ""),
      escapeCSV(f.resposta_recebida || ""),
      escapeCSV(f.respondido_em || ""),
      escapeCSV(f.created_at)
    ]);
    result.fila_mensagens = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join(NL);
  }

  // 4. Serviços e Corpo Clínico
  if (tipo === "servicos" || tipo === "tudo") {
    const { data: servicos } = await supabaseAdmin
      .from("servicos")
      .select("*")
      .eq("empresa_id", empId)
      .order("nome", { ascending: true });

    const headers = [
      "ID Servico",
      "Nome",
      "Tipo",
      "Especialidade",
      "Preco",
      "Status Agendamento",
      "Ativo",
      "Dias Bloqueio Padrao",
      "Tipo Contagem Dias",
      "Codigo URI",
      "Numero Especialista"
    ];
    const rows = (servicos || []).map((s) => [
      escapeCSV(s.id),
      escapeCSV(s.nome),
      escapeCSV(s.tipo),
      escapeCSV(s.especialidade || ""),
      escapeCSV(s.preco || 0),
      escapeCSV(s.status_agendamento || (s.ativo ? "ativo" : "inativo")),
      escapeCSV(s.ativo ? "Sim" : "Nao"),
      escapeCSV(s.dias_bloqueio_padrao || 0),
      escapeCSV(s.tipo_contagem_dias || "corridos"),
      escapeCSV(s.codigo_uri || ""),
      escapeCSV(s.numero_especialista || "")
    ]);
    result.servicos = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join(NL);
  }

  return result;
}

/* ==========================================
   AUDITORIA DO SISTEMA & LOGS DE OPERAÇÕES
   ========================================== */
export async function actionRegistrarAuditoria({ modulo, acao, detalhes, anterior, novo, alterado_por }) {
  try {
    let admin = null;
    try {
      admin = await getAdminLogado(false);
    } catch (e) {}

    const usuarioResponsavel = alterado_por || admin?.usuario || "Sistema";
    const empresaId = admin?.empresa_id || null;

    const logEntry = {
      id: "log_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      empresa_id: empresaId,
      responsavel: usuarioResponsavel,
      modulo: modulo || "geral",
      acao: acao || "Alteração",
      detalhes: detalhes || "",
      dados_anteriores: anterior || null,
      dados_novos: novo || null,
      created_at: new Date().toISOString()
    };

    // Tenta salvar na tabela logs_auditoria se existir
    try {
      if (empresaId) {
        const { error: insertErr } = await supabaseAdmin
          .from("logs_auditoria")
          .insert({
            empresa_id: empresaId,
            responsavel: usuarioResponsavel,
            modulo: modulo || "geral",
            acao: acao || "Alteração",
            detalhes: detalhes || "",
            dados_anteriores: anterior || null,
            dados_novos: novo || null
          });
        if (!insertErr) return { success: true, data: logEntry };
      }
    } catch (dbErr) {
      // Ignora erro de tabela não existente e faz fallback na empresa
    }

    // Fallback: guarda nos últimos 150 logs dentro do config_campos da empresa
    if (empresaId) {
      try {
        const { data: emp } = await supabaseAdmin
          .from("empresas")
          .select("config_campos")
          .eq("id", empresaId)
          .maybeSingle();

        if (emp) {
          const cfg = emp.config_campos || {};
          const auditLogs = Array.isArray(cfg.auditoria_logs) ? cfg.auditoria_logs : [];
          const updatedLogs = [logEntry, ...auditLogs].slice(0, 150);
          await supabaseAdmin
            .from("empresas")
            .update({
              config_campos: {
                ...cfg,
                auditoria_logs: updatedLogs
              }
            })
            .eq("id", empresaId);
        }
      } catch (fErr) {
        console.warn("Fallback de auditoria falhou:", fErr);
      }
    }

    return { success: true, data: logEntry };
  } catch (err) {
    console.error("Erro ao registrar auditoria:", err);
    return { success: false, error: err.message };
  }
}

export async function fetchAdminAuditoriaLogs(filtros = {}) {
  try {
    const admin = await getAdminLogado(true);
    let logs = [];

    // Tenta buscar da tabela logs_auditoria
    try {
      const query = supabaseAdmin
        .from("logs_auditoria")
        .select("*")
        .eq("empresa_id", admin.empresa_id)
        .order("created_at", { ascending: false })
        .limit(200);

      const { data, error } = await query;
      if (!error && Array.isArray(data) && data.length > 0) {
        logs = data;
      }
    } catch (e) {}

    // Se a tabela não tiver dados ou não existir, busca do fallback em config_campos
    if (logs.length === 0) {
      const { data: emp } = await supabaseAdmin
        .from("empresas")
        .select("config_campos")
        .eq("id", admin.empresa_id)
        .maybeSingle();

      if (emp?.config_campos?.auditoria_logs) {
        logs = emp.config_campos.auditoria_logs;
      }
    }

    // Aplicação de filtros em memória caso fornecidos
    if (filtros.responsavel && filtros.responsavel !== "todos") {
      logs = logs.filter((l) =>
        String(l.responsavel || "").toLowerCase().includes(filtros.responsavel.toLowerCase())
      );
    }

    if (filtros.modulo && filtros.modulo !== "todos") {
      logs = logs.filter((l) => l.modulo === filtros.modulo);
    }

    if (filtros.dataInicio) {
      logs = logs.filter((l) => (l.created_at || "").substring(0, 10) >= filtros.dataInicio);
    }

    if (filtros.dataFim) {
      logs = logs.filter((l) => (l.created_at || "").substring(0, 10) <= filtros.dataFim);
    }

    if (filtros.search?.trim()) {
      const s = filtros.search.toLowerCase().trim();
      logs = logs.filter(
        (l) =>
          String(l.acao || "").toLowerCase().includes(s) ||
          String(l.detalhes || "").toLowerCase().includes(s) ||
          String(l.responsavel || "").toLowerCase().includes(s)
      );
    }

    return logs;
  } catch (err) {
    console.error("Erro ao buscar logs de auditoria:", err);
    return [];
  }
}

/* ==========================================
   AGENDAMENTO MANUAL PELO COLABORADOR
   ========================================== */
export async function actionCriarAgendamentoManualAdmin(dados) {
  try {
    const admin = await getAdminLogado(true);
    const {
      nome,
      cpf,
      telefone,
      email,
      data_nascimento,
      servico_id,
      medico_profissional,
      especialidade,
      tipo_servico,
      subtipo_exame,
      modalidade,
      data_agendamento,
      horario_agendamento,
      observacoes
    } = dados;

    if (!nome?.trim() || !data_agendamento || !horario_agendamento) {
      return { success: false, error: "Nome do paciente, data e horário são obrigatórios." };
    }

    // 1. Localizar ou cadastrar paciente
    let pacienteId = null;
    const cleanCpf = cpf ? cpf.replace(/\D/g, "") : null;
    const cleanFone = telefone ? formatarTelefoneEnvio(telefone) : null;

    if (cleanCpf && cleanCpf.length === 11) {
      const { data: pacExistente } = await supabaseAdmin
        .from("pacientes")
        .select("id")
        .eq("empresa_id", admin.empresa_id)
        .eq("cpf", cleanCpf)
        .maybeSingle();

      if (pacExistente) {
        pacienteId = pacExistente.id;
      }
    }

    if (!pacienteId) {
      const { data: novoPac, error: pacErr } = await supabaseAdmin
        .from("pacientes")
        .insert({
          empresa_id: admin.empresa_id,
          nome_completo: nome.trim(),
          cpf: cleanCpf,
          telefone_whatsapp: cleanFone || formatarTelefoneEnvio(telefone),
          email: email?.trim() || null,
          data_nascimento: data_nascimento || null
        })
        .select("id")
        .single();

      if (pacErr) {
        console.error("Erro ao criar paciente:", pacErr);
      } else {
        pacienteId = novoPac.id;
      }
    }

    // 2. Criar agendamento
    const payload = {
      empresa_id: admin.empresa_id,
      paciente_id: pacienteId,
      servico_id: servico_id || null,
      tipo_servico: tipo_servico || "Consulta",
      especialidade: especialidade || subtipo_exame || "Clínica Geral",
      subtipo_exame: subtipo_exame || null,
      medico_profissional: medico_profissional || "Corpo Clínico",
      modalidade: modalidade || "Particular",
      data_agendamento: data_agendamento,
      horario_agendamento: horario_agendamento,
      status_atendimento: "agendado",
      status_pagamento_antecipado: false,
      criado_por: admin.usuario
    };

    const { data: agendamentoCriado, error: agendErr } = await supabaseAdmin
      .from("agendamentos")
      .insert(payload)
      .select("*, pacientes(*)")
      .single();

    if (agendErr) {
      throw new Error(`Erro ao criar agendamento: ${agendErr.message}`);
    }

    // 3. Registrar na auditoria
    await actionRegistrarAuditoria({
      modulo: "agenda",
      acao: "Agendamento Manual",
      detalhes: `Agendamento criado para ${nome.trim()} em ${data_agendamento} às ${horario_agendamento} (${medico_profissional || especialidade}) por ${admin.usuario}.`,
      novo: payload,
      alterado_por: admin.usuario
    });

    // 4. Disparar automações de mensagens WhatsApp / Webhook
    try {
      const { dispararGatilhoServidor } = await import("@/lib/serverDisparo");
      await dispararGatilhoServidor({
        agendamentoId: agendamentoCriado.id,
        empresaId: admin.empresa_id,
        gatilho: "imediato"
      });
    } catch (errDisparo) {
      console.warn("Aviso ao disparar mensagens automáticas para agendamento manual:", errDisparo);
    }

    return { success: true, data: agendamentoCriado };
  } catch (err) {
    console.error("Erro ao criar agendamento manual:", err);
    return { success: false, error: err.message };
  }
}

/* ==========================================
   TESTE DE MENSAGEM TEMPLATE / WHATSAPP / WEBHOOK
   ========================================== */
export async function actionTestarMensagemWhatsAppTemplate({
  regra,
  telefone = "558494229126",
  nomePaciente = "Paciente de Teste",
  mensagemCustomizada = null
}) {
  const admin = await getAdminLogado(true);
  const { data: emp, error: errEmp } = await supabaseAdmin
    .from("empresas")
    .select("*")
    .eq("id", admin.empresa_id)
    .single();

  if (errEmp || !emp) throw new Error("Clínica não encontrada no banco de dados.");

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

  const isWebhook = regra?.tipo_envio === "webhook";
  const urlDestino = (regra?.url_webhook_customizada || (isWebhook ? urlWebhookFluxoInteligente : urlWebhookPadrao))?.trim();

  if (!urlDestino || !urlDestino.startsWith("http")) {
    throw new Error(
      isWebhook
        ? "Informe uma URL de Webhook válida (iniciando com http:// ou https://)."
        : "Servidor de WhatsApp / RM Chat não configurado nesta clínica. Configure a URL do webhook no painel."
    );
  }

  const numLimpo = formatarTelefoneEnvio(telefone);
  const nomeCompleto = (nomePaciente || "Paciente de Teste").trim();

  // Monta variáveis dinâmicas de teste (nome completo para {nome} e {nome_completo})
  const varsExemplo = {
    nome: nomeCompleto,
    nome_completo: nomeCompleto,
    primeiro_nome: nomeCompleto,
    sobrenome: nomeCompleto.split(" ").slice(1).join(" ") || "Exemplo",
    servico: "Consulta Cardiológica",
    especialista: "Dr. Roberto Silva",
    medico: "Dr. Roberto Silva",
    profissional: "Dr. Roberto Silva",
    especialidade: "Cardiologia",
    procedimento: "Consulta Cardiológica",
    subtipo_exame: "Consulta Cardiológica",
    categoria: "Consultas",
    tipo_servico: "Consulta",
    modalidade: "Particular",
    data: new Date().toLocaleDateString("pt-BR"),
    hora: "09:30",
    nova_data: new Date().toLocaleDateString("pt-BR"),
    novo_horario: "09:30",
    data_anterior: new Date(Date.now() - 86400000).toLocaleDateString("pt-BR"),
    hora_anterior: "14:00",
    motivo: "Readequação operacional da grade de atendimentos da clínica",
    motivo_cancelamento: "Readequação operacional da grade de atendimentos da clínica",
    cpf: "123.456.789-00",
    telefone: numLimpo,
    whatsapp: numLimpo,
    clinica: emp.nome || "Clínica",
    nome_clinica: emp.nome || "Clínica",
    valor: "R$ 150,00",
    chave_pix: "clinica@pix.com.br",
    link_pagamento: "https://rmagenda.com.br/pagamento/exemplo"
  };

  const parseTpl = (tpl, data) => {
    if (!tpl) return "";
    return tpl.replace(/{(\w+)}/g, (_, k) => (data[k] !== undefined ? data[k] : `{${k}}`));
  };

  const textoFinal = parseTpl(mensagemCustomizada || regra?.mensagem || "", varsExemplo);

  let payload;
  const headers = { "Content-Type": "application/json" };

  if (isWebhook) {
    headers["x-rmcare-event"] = "teste_webhook_template";
    if (configWebhooks.webhook_secret) {
      headers["x-webhook-secret"] = configWebhooks.webhook_secret;
    }

    payload = {
      evento: "teste_webhook_template",
      tipo_disparo: "webhook",
      gatilho: regra?.gatilho || "teste",
      regra_id: regra?.id,
      empresa: {
        id: emp.id,
        nome: emp.nome,
        slug: emp.slug
      },
      agendamento_exemplo: {
        data: varsExemplo.data,
        horario: varsExemplo.hora,
        servico: varsExemplo.servico,
        especialista: varsExemplo.especialista,
        especialidade: varsExemplo.especialidade,
        modalidade: varsExemplo.modalidade
      },
      paciente_exemplo: {
        nome: varsExemplo.nome_completo,
        nome_completo: varsExemplo.nome_completo,
        primeiro_nome: varsExemplo.nome_completo,
        telefone: numLimpo,
        cpf: varsExemplo.cpf
      },
      mensagem_formatada: textoFinal,
      mensagem_original: regra?.mensagem,
      webhook_retorno_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://rmagenda.com.br"}/api/webhook-resposta`
    };
  } else {
    headers["x-rmcare-event"] = "teste_whatsapp_template";
    payload = {
      name: varsExemplo.nome,
      number: numLimpo,
      phone: numLimpo,
      texto: textoFinal,
      mensagem: textoFinal,
      media_url: regra?.anexo_url || null
    };
  }

  const response = await fetch(urlDestino, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  let respostaTexto = "";
  try {
    respostaTexto = await response.text();
  } catch (e) {}

  if (!response.ok) {
    throw new Error(`Servidor de ${isWebhook ? "Webhook" : "WhatsApp"} retornou status ${response.status}: ${respostaTexto.slice(0, 200)}`);
  }

  return {
    success: true,
    status: response.status,
    resposta: respostaTexto.slice(0, 300),
    urlDestino,
    tipoEnvio: regra?.tipo_envio || "whatsapp",
    textoEnviado: textoFinal
  };
}

