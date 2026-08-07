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
export async function getAdminLogado() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("rmcare_auth");

  // Se não achar o cookie, avisa o motivo exato.
  if (!authCookie || !authCookie.value) {
    throw new Error("Sessão expirada ou o navegador (Safari/IP) bloqueou o cookie de autenticação.");
  }

  const session = await verifyAdminSession(authCookie.value);
  if (!session) throw new Error("Sessão expirada.");
  const usuarioLogado = session.sub;

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

  return admin;
}

/* ==========================================
   FUNÇÕES DE AUTENTICAÇÃO
   ========================================== */
export async function checkIdentifier(identificador) {
  const idClean = identificador.trim().toLowerCase();

  const { data: admin } = await supabaseAdmin
    .from("administradores")
    .select("id, role")
    .eq("usuario", idClean)
    .maybeSingle();

  if (admin) return { success: true, type: "admin", role: admin.role };

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

export async function authenticateUser(payload) {
  const { type, id, role, password, birthDate, isDefiningPassword, identificador } = payload;
  const cookieStore = await cookies();

  if (type === "paciente") {
    if (isDefiningPassword) {
      const { data: paciente } = await supabaseAdmin
        .from("pacientes")
        .select("data_nascimento")
        .eq("id", id)
        .single();

      if (paciente.data_nascimento !== birthDate) {
        return { success: false, error: "A data de nascimento informada não coincide com nosso banco de dados." };
      }

      const { error } = await supabaseAdmin
        .from("pacientes_credenciais")
        .insert({ paciente_id: id, senha_hash: password });

      if (error) return { success: false, error: "Falha ao registrar senha. Tente novamente." };
      
      // Cookie do Paciente com permissão Lax para funcionar em IPs locais
      cookieStore.set("rmcare_auth_paciente", id, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === "production", 
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, 
        path: "/" 
      });
      return { success: true, message: "Senha cadastrada com sucesso!" };
    } else {
      const { data: cred } = await supabaseAdmin
        .from("pacientes_credenciais")
        .select("id")
        .eq("paciente_id", id)
        .eq("senha_hash", password)
        .maybeSingle();

      if (cred) {
        cookieStore.set("rmcare_auth_paciente", id, { 
          httpOnly: true, 
          secure: process.env.NODE_ENV === "production", 
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7, 
          path: "/" 
        });
        return { success: true, message: "Acesso autorizado!" };
      }
      return { success: false, error: "Senha incorreta." };
    }
  }

  if (type === "admin") {
    const idClean = identificador.trim().toLowerCase();
    let isAuthorized = false;

    // 1. Tenta a verificação em formato Antigo (Texto Puro) - Fallback
    const { data: plainAdmin } = await supabaseAdmin
      .from("administradores")
      .select("id")
      .eq("usuario", idClean)
      .eq("senha_hash", password)
      .maybeSingle();

    if (plainAdmin) {
      isAuthorized = true;
    } else {
      // 2. Tenta a verificação com Criptografia Forte via RPC
      const { data: hashAdmin } = await supabaseAdmin.rpc("verificar_senha_admin", {
        p_usuario: idClean,
        p_senha: password
      });
      if (hashAdmin) isAuthorized = true;
    }

    if (isAuthorized) {
      // Cria a sessão com sameSite 'lax' para não ser bloqueado no localhost/IP
      cookieStore.set("rmcare_auth", idClean, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 dias de sessão
        path: "/"
      });
      return { success: true, message: "Acesso autorizado!" };
    }

    return { success: false, error: "Senha administrativa inválida." };
  }

  return { success: false, error: "Erro de autenticação." };
}

/* ==========================================
   FUNÇÕES GERAIS DE ADMIN (COM ISOLAMENTO)
   ========================================== */
export async function fetchAdminBloqueios() {
  const admin = await getAdminLogado();

  let query = supabaseAdmin.from("bloqueios_horarios").select("*").order("horario", { ascending: true });
  if (admin.role !== 'sistema') query = query.eq("empresa_id", admin.empresa_id);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchAdminAgendamentos() {
  const admin = await getAdminLogado();

  let query = supabaseAdmin.from("agendamentos").select(`*, pacientes (id, cpf, nome_completo)`).order("horario_agendamento", { ascending: true });
  if (admin.role !== 'sistema') query = query.eq("empresa_id", admin.empresa_id);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function actionCancelarAgendamentoAdmin(id, motivo = "Cancelado pela clínica") {
  const admin = await getAdminLogado();
  let query = supabaseAdmin.from("agendamentos").select("empresa_id").eq("id", id);
  if (admin.role !== "sistema") query = query.eq("empresa_id", admin.empresa_id);
  const { data: appointment } = await query.maybeSingle();
  if (!appointment) throw new Error("Agendamento não encontrado.");
  const { data, error } = await supabaseAdmin.rpc("cancelar_agendamento", { p_agendamento_id: id, p_empresa_id: appointment.empresa_id, p_paciente_id: null, p_cancelado_por: "administrador", p_motivo: motivo });
  if (error) throw error;
  return data;
}

export async function actionExcluirAgendamentoAdmin(id) {
  const admin = await getAdminLogado();
  let query = supabaseAdmin.from("agendamentos").select("empresa_id").eq("id", id);
  if (admin.role !== "sistema") query = query.eq("empresa_id", admin.empresa_id);
  const { data: appointment } = await query.maybeSingle();
  if (!appointment) throw new Error("Agendamento não encontrado.");
  const { data, error } = await supabaseAdmin.rpc("excluir_agendamento", { p_agendamento_id: id, p_empresa_id: appointment.empresa_id, p_paciente_id: null });
  if (error) throw error;
  return data;
}

export async function actionRemarcarAgendamentoAdmin(id, data, horario) {
  const admin = await getAdminLogado();
  let query = supabaseAdmin.from("agendamentos").select("empresa_id").eq("id", id);
  if (admin.role !== "sistema") query = query.eq("empresa_id", admin.empresa_id);
  const { data: appointment } = await query.maybeSingle();
  if (!appointment) throw new Error("Agendamento não encontrado.");
  const { data: updated, error } = await supabaseAdmin.rpc("remarcar_agendamento", { p_agendamento_id: id, p_empresa_id: appointment.empresa_id, p_paciente_id: null, p_nova_data: data, p_novo_horario: horario });
  if (error) throw error;
  return updated;
}

export async function fetchAdminServicos() {
  const admin = await getAdminLogado();

  let query = supabaseAdmin.from("servicos").select("*").order("tipo", { ascending: true });
  
  if (admin.role !== 'sistema') {
    if (!admin.empresa_id) return []; // Se não tem empresa atrelada, retorna vazio para não vazar dados
    query = query.eq("empresa_id", admin.empresa_id);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchAdminPerguntas() {
  const admin = await getAdminLogado();

  let query = supabaseAdmin.from("perguntas_triagem").select("*, servicos(nome)");
  if (admin.role !== 'sistema') query = query.eq("empresa_id", admin.empresa_id);

  const { data: pergs, error: err1 } = await query;
  const { data: ops, error: err2 } = await supabaseAdmin.from("opcoes_triagem").select("*");
  if (err1 || err2) throw err1 || err2;

  return (pergs || []).map(p => ({
    ...p,
    opcoes: (ops || []).filter(o => o.pergunta_id === p.id)
  }));
}

export async function actionAplicarBloqueioLote(inserts) {
  const admin = await getAdminLogado();

  const payload = inserts.map(i => ({ ...i, empresa_id: admin.empresa_id }));
  const { error } = await supabaseAdmin.from("bloqueios_horarios").insert(payload);
  if (error) throw error;
  return true;
}

export async function actionDeletarBloqueio(id) {
  const admin = await getAdminLogado();

  let query = supabaseAdmin.from("bloqueios_horarios").delete().eq("id", id);
  if (admin.role !== 'sistema') query = query.eq("empresa_id", admin.empresa_id);

  const { error } = await query;
  if (error) throw error;
  return true;
}

export async function actionAtualizarServico(id, srvData) {
  const admin = await getAdminLogado();

  let query = supabaseAdmin.from("servicos").update({
    nome: srvData.nome,
    tipo: srvData.tipo,
    ativo: srvData.ativo,
    preco: Number(srvData.preco),
    dias_bloqueio_padrao: Number(srvData.dias_bloqueio_padrao),
    tipo_contagem_dias: srvData.tipo_contagem_dias,
    especialidade: srvData.especialidade,
    agendamento_bloqueado_ate: srvData.agendamento_bloqueado_ate || null,
    motivo_bloqueio_agenda: srvData.motivo_bloqueio_agenda || null
  }).eq("id", id);

  if (admin.role !== 'sistema') query = query.eq("empresa_id", admin.empresa_id);
  
  const { error } = await query;
  if (error) throw error;
  return true;
}

export async function actionCriarServico(payload) {
  const admin = await getAdminLogado();

  let empresaId = admin.role === 'sistema' ? payload.empresa_id : admin.empresa_id;

  if (!empresaId) {
    throw new Error("É necessário fornecer o ID da clínica para associar o profissional.");
  }

  const { data, error } = await supabaseAdmin.from("servicos").insert([{ 
    ...payload, 
    empresa_id: empresaId,
    especialidade: payload.especialidade || null
    ,agendamento_bloqueado_ate: payload.agendamento_bloqueado_ate || null
    ,motivo_bloqueio_agenda: payload.motivo_bloqueio_agenda || null
  }]).select().single();
  
  if (error) throw error;
  return data;
}

export async function actionSalvarTriagem(novaTriagem) {
  const admin = await getAdminLogado();

  const { data: perguntaSalva, error: err1 } = await supabaseAdmin
    .from("perguntas_triagem")
    .insert({ 
        servico_id: novaTriagem.servico_id || null, 
        pergunta: novaTriagem.pergunta,
        empresa_id: admin.empresa_id
    })
    .select()
    .single();

  if (err1) throw err1;

  const opcoesFormatadas = novaTriagem.opcoes.map(op => ({
    pergunta_id: perguntaSalva.id,
    texto_opcao: op.texto_opcao,
    regra_bloqueio_dias: op.regra_bloqueio_dias,
    tipo_contagem_dias: op.tipo_contagem_dias
  }));

  const { error: err2 } = await supabaseAdmin.from("opcoes_triagem").insert(opcoesFormatadas);
  if (err2) throw err2;
  return true;
}

export async function actionDeletarTriagem(id) {
  const admin = await getAdminLogado();

  let query = supabaseAdmin.from("perguntas_triagem").delete().eq("id", id);
  if (admin.role !== 'sistema') query = query.eq("empresa_id", admin.empresa_id);

  const { error } = await query;
  if (error) throw error;
  return true;
}

export async function actionMigrarNomeBloqueios(nomeAntigoERP, nomeOficialSistema) {
  const admin = await getAdminLogado();

  const { error } = await supabaseAdmin
    .from("bloqueios_horarios")
    .update({ medico_profissional: nomeOficialSistema })
    .eq("medico_profissional", nomeAntigoERP)
    .eq("empresa_id", admin.empresa_id);
    
  if (error) throw error;
  return true;
}

/* ==========================================
   FUNÇÕES DE REGRAS (COM ISOLAMENTO)
   ========================================== */
export async function fetchAdminRegras() {
  const admin = await getAdminLogado();

  let query = supabaseAdmin.from('regras_agenda').select('*');
  if (admin.role !== 'sistema') query = query.eq("empresa_id", admin.empresa_id);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function actionCriarRegraAgenda(regra) {
  const admin = await getAdminLogado();

  const payload = { ...regra, empresa_id: admin.empresa_id };

  const { data, error } = await supabaseAdmin.from('regras_agenda').insert([payload]).select();
  if (error) throw new Error(error.message);
  return data;
}

export async function actionAtualizarRegraAgenda(id, regra) {
  const admin = await getAdminLogado();
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
  let query = supabaseAdmin.from("regras_agenda").update(allowed).eq("id", id);
  if (admin.role !== "sistema") query = query.eq("empresa_id", admin.empresa_id);
  const { data, error } = await query.select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchAdminPolicies() {
  const admin = await getAdminLogado();
  if (!admin.empresa_id) return {};
  const { data, error } = await supabaseAdmin.from("empresas").select("config_regras").eq("id", admin.empresa_id).single();
  if (error) throw error;
  return data?.config_regras || {};
}

export async function actionSalvarPolicies(config) {
  const admin = await getAdminLogado();
  if (!admin.empresa_id) throw new Error("Clínica não vinculada.");
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
  const admin = await getAdminLogado();
  const { data, error } = await supabaseAdmin.from("empresas").select("id,config_campos,config_mensagens").eq("id", admin.empresa_id).single();
  if (error) throw error;
  return data;
}

export async function actionSalvarCustomization({ config_campos, config_mensagens }) {
  const admin = await getAdminLogado();
  const { error } = await supabaseAdmin.from("empresas").update({ config_campos, config_mensagens }).eq("id", admin.empresa_id);
  if (error) throw error;
  return true;
}

export async function actionCriarRegraMassa(regrasArray) {
  const admin = await getAdminLogado();

  const payload = regrasArray.map(r => ({ ...r, empresa_id: admin.empresa_id }));

  const { data, error } = await supabaseAdmin.from('regras_agenda').insert(payload).select();
  if (error) throw new Error(error.message);
  return data;
}

export async function actionDeletarRegra(id) {
  const admin = await getAdminLogado();

  let query = supabaseAdmin.from('regras_agenda').delete().eq('id', id);
  if (admin.role !== 'sistema') query = query.eq("empresa_id", admin.empresa_id);

  const { error } = await query;
  if (error) throw new Error(error.message);
  return true;
}

export async function actionProvisionarEmpresa({ nome, slug, usuario, senha }) {
  const admin = await getAdminLogado();
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
  const admin = await getAdminLogado();
  if (admin.role !== "sistema") throw new Error("Acesso negado.");
  const { data, error } = await supabaseAdmin.from("empresas").select("id,nome,slug,created_at").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
