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

export async function checkIdentifier(identificador) {
  const idClean = identificador.trim().toLowerCase();

  // 1. Tenta achar administrador
  const { data: admin, error: adminError } = await supabaseAdmin
    .from("administradores")
    .select("id, role")
    .eq("usuario", idClean)
    .maybeSingle();

  // 👇 Log para te ajudar a depurar no terminal do VS Code
  console.log("🔍 RESULTADO DA BUSCA ADMIN:", { admin, adminError });

  if (admin) return { success: true, type: "admin", role: admin.role };

  // 2. Tenta achar paciente
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
      // Valida Data de Nascimento
      const { data: paciente } = await supabaseAdmin
        .from("pacientes")
        .select("data_nascimento")
        .eq("id", id)
        .single();

      if (paciente.data_nascimento !== birthDate) {
        return { success: false, error: "A data de nascimento informada não coincide com nosso banco de dados." };
      }

      // Cria a senha
      const { error } = await supabaseAdmin
        .from("pacientes_credenciais")
        .insert({ paciente_id: id, senha_hash: password });

      if (error) return { success: false, error: "Falha ao registrar senha. Tente novamente." };
      return { success: true, message: "Senha cadastrada com sucesso!" };
    } else {
      // Login do Paciente
      const { data: cred } = await supabaseAdmin
        .from("pacientes_credenciais")
        .select("id")
        .eq("paciente_id", id)
        .eq("senha_hash", password) // Importante: em produção, use bcrypt para validar hash real
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