"use server";

import { createClient } from "@supabase/supabase-js";

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
   FUNÇÕES DE AUTENTICAÇÃO
   ========================================== */
export async function checkIdentifier(identificador) {
  const idClean = identificador.trim().toLowerCase();

  const { data: admin, error: adminError } = await supabaseAdmin
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
      return { success: true, message: "Senha cadastrada com sucesso!" };
    } else {
      const { data: cred } = await supabaseAdmin
        .from("pacientes_credenciais")
        .select("id")
        .eq("paciente_id", id)
        .eq("senha_hash", password)
        .maybeSingle();

      if (cred) return { success: true, message: "Acesso autorizado!" };
      return { success: false, error: "Senha incorreta." };
    }
  }

  if (type === "admin") {
    const idClean = identificador.trim().toLowerCase();
    const { data: adminAuth } = await supabaseAdmin
      .from("administradores")
      .select("id")
      .eq("usuario", idClean)
      .eq("senha_hash", password)
      .maybeSingle();

    if (adminAuth) return { success: true, message: "Acesso autorizado!" };
    return { success: false, error: "Senha administrativa inválida." };
  }

  return { success: false, error: "Erro de autenticação." };
}

/* ==========================================
   FUNÇÕES GERAIS DE ADMIN
   ========================================== */
export async function fetchAdminBloqueios() {
  const { data, error } = await supabaseAdmin.from("bloqueios_horarios").select("*").order("horario", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchAdminAgendamentos() {
  const { data, error } = await supabaseAdmin.from("agendamentos").select(`*, pacientes (id, cpf, nome_completo)`).order("horario_agendamento", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchAdminServicos() {
  const { data, error } = await supabaseAdmin.from("servicos").select("*").order("tipo", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchAdminPerguntas() {
  const { data: pergs, error: err1 } = await supabaseAdmin.from("perguntas_triagem").select("*, servicos(nome)");
  const { data: ops, error: err2 } = await supabaseAdmin.from("opcoes_triagem").select("*");
  if (err1 || err2) throw err1 || err2;

  return (pergs || []).map(p => ({
    ...p,
    opcoes: (ops || []).filter(o => o.pergunta_id === p.id)
  }));
}

export async function actionAplicarBloqueioLote(inserts) {
  const { error } = await supabaseAdmin.from("bloqueios_horarios").insert(inserts);
  if (error) throw error;
  return true;
}

export async function actionDeletarBloqueio(id) {
  const { error } = await supabaseAdmin.from("bloqueios_horarios").delete().eq("id", id);
  if (error) throw error;
  return true;
}

export async function actionAtualizarServico(id, srvData) {
  const { error } = await supabaseAdmin.from("servicos").update({
    nome: srvData.nome,
    tipo: srvData.tipo,
    ativo: srvData.ativo,
    preco: Number(srvData.preco),
    dias_bloqueio_padrao: Number(srvData.dias_bloqueio_padrao),
    tipo_contagem_dias: srvData.tipo_contagem_dias,
    especialidade: srvData.especialidade // <-- CAMPO CORRIGIDO E MAPEADO AQUI
  }).eq("id", id);
  
  if (error) throw error;
  return true;
}

export async function actionCriarServico(payload) {
  let empresaId = payload.empresa_id;
  
  if (!empresaId) {
    const { data: empresaData } = await supabaseAdmin.from("empresas").select("id").limit(1).single();
    if (empresaData) {
      empresaId = empresaData.id;
    } else {
      throw new Error("Nenhuma empresa encontrada na tabela 'empresas' para associar o serviço.");
    }
  }

  // O ...payload agora passa o campo especialidade automaticamente graças ao spread operator, 
  // mas incluímos explicitamente abaixo caso a estrutura varie
  const { data, error } = await supabaseAdmin.from("servicos").insert([{ 
    ...payload, 
    empresa_id: empresaId,
    especialidade: payload.especialidade || null
  }]).select().single();
  
  if (error) throw error;
  return data;
}

export async function actionSalvarTriagem(novaTriagem) {
  const { data: perguntaSalva, error: err1 } = await supabaseAdmin
    .from("perguntas_triagem")
    .insert({ servico_id: novaTriagem.servico_id || null, pergunta: novaTriagem.pergunta })
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
  const { error } = await supabaseAdmin.from("perguntas_triagem").delete().eq("id", id);
  if (error) throw error;
  return true;
}

export async function actionMigrarNomeBloqueios(nomeAntigoERP, nomeOficialSistema) {
  const { error } = await supabaseAdmin
    .from("bloqueios_horarios")
    .update({ medico_profissional: nomeOficialSistema })
    .eq("medico_profissional", nomeAntigoERP);
    
  if (error) throw error;
  return true;
}

/* ==========================================
   FUNÇÕES DE REGRAS
   ========================================== */
export async function fetchAdminRegras() {
  const { data, error } = await supabaseAdmin.from('regras_agenda').select('*');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function actionCriarRegraAgenda(regra) {
  const { data, error } = await supabaseAdmin.from('regras_agenda').insert([regra]).select();
  if (error) throw new Error(error.message);
  return data;
}

export async function actionCriarRegraMassa(regrasArray) {
  const { data, error } = await supabaseAdmin.from('regras_agenda').insert(regrasArray).select();
  if (error) throw new Error(error.message);
  return data;
}

export async function actionDeletarRegra(id) {
  const { error } = await supabaseAdmin.from('regras_agenda').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
}