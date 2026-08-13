"use server";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/session";

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
    .select(`*, pacientes (id, cpf, nome_completo)`)
    .eq("empresa_id", admin.empresa_id)
    .order("horario_agendamento", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function actionCancelarAgendamentoAdmin(id, motivo = "Cancelado pela clínica") {
  const admin = await getAdminLogado(true);
  const { data: appointment } = await supabaseAdmin
    .from("agendamentos")
    .select("empresa_id")
    .eq("id", id)
    .eq("empresa_id", admin.empresa_id)
    .maybeSingle();

  if (!appointment) throw new Error("Agendamento não encontrado.");
  const { data, error } = await supabaseAdmin.rpc("cancelar_agendamento", {
    p_agendamento_id: id,
    p_empresa_id: admin.empresa_id,
    p_paciente_id: null,
    p_cancelado_por: "administrador",
    p_motivo: motivo
  });
  if (error) throw error;
  return data;
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
    .select("empresa_id")
    .eq("id", id)
    .eq("empresa_id", admin.empresa_id)
    .maybeSingle();

  if (!appointment) throw new Error("Agendamento não encontrado.");
  const { data: updated, error } = await supabaseAdmin.rpc("remarcar_agendamento", {
    p_agendamento_id: id,
    p_empresa_id: admin.empresa_id,
    p_paciente_id: null,
    p_nova_data: data,
    p_novo_horario: horario
  });
  if (error) throw error;
  return updated;
}

export async function fetchAdminServicos() {
  const admin = await getAdminLogado(true);

  const { data, error } = await supabaseAdmin
    .from("servicos")
    .select("*")
    .eq("empresa_id", admin.empresa_id)
    .order("tipo", { ascending: true });

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

  const { error } = await supabaseAdmin
    .from("servicos")
    .update({
      nome: srvData.nome,
      tipo: srvData.tipo,
      ativo: srvData.ativo,
      preco: Number(srvData.preco),
      dias_bloqueio_padrao: Number(srvData.dias_bloqueio_padrao),
      tipo_contagem_dias: srvData.tipo_contagem_dias,
      especialidade: srvData.especialidade,
      agendamento_bloqueado_ate: srvData.agendamento_bloqueado_ate || null,
      motivo_bloqueio_agenda: srvData.motivo_bloqueio_agenda || null
    })
    .eq("id", id)
    .eq("empresa_id", admin.empresa_id);

  if (error) throw error;
  return true;
}

export async function actionCriarServico(payload) {
  const admin = await getAdminLogado(true);

  const { data, error } = await supabaseAdmin.from("servicos").insert([{ 
    ...payload, 
    empresa_id: admin.empresa_id,
    especialidade: payload.especialidade || null,
    agendamento_bloqueado_ate: payload.agendamento_bloqueado_ate || null,
    motivo_bloqueio_agenda: payload.motivo_bloqueio_agenda || null
  }]).select().single();
  
  if (error) throw error;
  return data;
}

export async function actionSalvarTriagem(novaTriagem) {
  const admin = await getAdminLogado(true);

  const payload = { 
    especialidade: (novaTriagem.especialidade && novaTriagem.especialidade !== "Todas") ? novaTriagem.especialidade.trim() : null,
    obrigatoria: novaTriagem.obrigatoria !== false,
    pergunta: novaTriagem.pergunta.trim(),
    empresa_id: admin.empresa_id,
    servico_id: novaTriagem.servico_id || null,
    ativa: true
  };

  const { data: perguntaSalva, error: err1 } = await supabaseAdmin
    .from("perguntas_triagem")
    .insert(payload)
    .select()
    .single();

  if (err1) throw err1;

  const opcoesFormatadas = novaTriagem.opcoes.map(op => ({
    pergunta_id: perguntaSalva.id,
    texto_opcao: op.texto_opcao,
    regra_bloqueio_dias: Number(op.regra_bloqueio_dias || 0),
    tipo_contagem_dias: op.tipo_contagem_dias || "corridos"
  }));

  const { error: err2 } = await supabaseAdmin.from("opcoes_triagem").insert(opcoesFormatadas);
  if (err2) throw err2;
  return true;
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
  const admin = await getAdminLogado(true);

  const { data, error } = await supabaseAdmin
    .from("regras_agenda")
    .select("*")
    .eq("empresa_id", admin.empresa_id);

  if (error) throw new Error(error.message);
  return data || [];
}

export async function actionCriarRegraAgenda(regra) {
  const admin = await getAdminLogado(true);

  const payload = { ...regra, empresa_id: admin.empresa_id };
  const { data, error } = await supabaseAdmin.from("regras_agenda").insert([payload]).select();
  if (error) throw new Error(error.message);
  return data;
}

export async function actionAtualizarRegraAgenda(id, regra) {
  const admin = await getAdminLogado(true);
  const allowed = {
    servico_id: regra.servico_id || null,
    dias_semana: regra.dias_semana,
    hora_inicio: regra.hora_inicio,
    hora_fim: regra.hora_fim,
    ultimo_horario_agendamento: regra.ultimo_horario_agendamento,
    tipos_permitidos: regra.tipos_permitidos || [],
    duracao_slot_minutos: Number(regra.duracao_slot_minutos),
    ocupacao_sequencial: Boolean(regra.ocupacao_sequencial),
    ativo: regra.ativo !== false
  };

  const { data, error } = await supabaseAdmin
    .from("regras_agenda")
    .update(allowed)
    .eq("id", id)
    .eq("empresa_id", admin.empresa_id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
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
  const { data, error } = await supabaseAdmin
    .from("empresas")
    .select("id,config_campos,config_mensagens,especialidades")
    .eq("id", admin.empresa_id)
    .single();

  if (error) throw error;
  return data;
}

export async function actionSalvarCustomization({ config_campos, config_mensagens }) {
  const admin = await getAdminLogado(true);
  const { error } = await supabaseAdmin
    .from("empresas")
    .update({ config_campos, config_mensagens })
    .eq("id", admin.empresa_id);

  if (error) throw error;
  return true;
}

export async function actionCriarRegraMassa(regrasArray) {
  const admin = await getAdminLogado(true);
  const payload = regrasArray.map(r => ({ ...r, empresa_id: admin.empresa_id }));
  const { data, error } = await supabaseAdmin.from("regras_agenda").insert(payload).select();
  if (error) throw new Error(error.message);
  return data;
}

export async function actionDeletarRegra(id) {
  const admin = await getAdminLogado(true);
  const { error } = await supabaseAdmin
    .from("regras_agenda")
    .delete()
    .eq("id", id)
    .eq("empresa_id", admin.empresa_id);

  if (error) throw new Error(error.message);
  return true;
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
  const { data, error } = await supabaseAdmin.from("empresas").select("id,nome,slug,created_at").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
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

export async function actionTestarPushRmChat(urlWebhook, telefone = "5583999999999", nome = "Teste RM Agenda") {
  const admin = await getAdminLogado(false);
  if (!urlWebhook || !urlWebhook.startsWith("http")) {
    throw new Error("URL de Webhook inválida.");
  }

  const payload = {
    name: nome,
    number: telefone.replace(/\D/g, ""),
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
