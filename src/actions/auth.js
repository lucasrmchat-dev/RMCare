"use server";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createAdminSession, verifyAdminSession, ADMIN_SESSION_SECONDS } from "@/lib/session";

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

export async function authenticateUser(payload) {
  const { type, id, role, password, birthDate, isDefiningPassword, identificador } = payload;
  
  // Await é obrigatório no Next.js 15+ para lidar com cookies
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
      
      cookieStore.set("rmagenda_auth_paciente", id, { 
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
        cookieStore.set("rmagenda_auth_paciente", id, { 
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
    let adminRecord = null;

    // 1. Tenta a verificação em formato Antigo (Texto Puro) - Fallback para senhas antigas
    const { data: plainAdmin } = await supabaseAdmin
      .from("administradores")
      .select("id, role, empresa_id, usuario")
      .eq("usuario", idClean)
      .eq("senha_hash", password)
      .maybeSingle();

    if (plainAdmin) {
      isAuthorized = true;
      adminRecord = plainAdmin;
    } else {
      // 2. Tenta a verificação com Criptografia Forte via RPC
      const { data: hashAdmin } = await supabaseAdmin.rpc("verificar_senha_admin", {
        p_usuario: idClean,
        p_senha: password
      });
      if (hashAdmin) {
        isAuthorized = true;
        const { data: fetchAdmin } = await supabaseAdmin
          .from("administradores")
          .select("id, role, empresa_id, usuario")
          .eq("usuario", idClean)
          .maybeSingle();
        adminRecord = fetchAdmin;
      }
    }

    if (isAuthorized && adminRecord) {
      // Cria a sessão em Cookie para isolar o Tenant
      const sessionToken = await createAdminSession(idClean);
      cookieStore.set("rmagenda_auth", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: ADMIN_SESSION_SECONDS,
        path: "/"
      });
      cookieStore.set("rmcare_auth", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: ADMIN_SESSION_SECONDS,
        path: "/"
      });

      return {
        success: true,
        message: "Acesso autorizado!",
        role: adminRecord.role,
        empresa_id: adminRecord.empresa_id
      };
    }

    return { success: false, error: "Senha administrativa inválida." };
  }

  return { success: false, error: "Erro de autenticação." };
}

export async function refreshAdminSession() {
  const cookieStore = await cookies();
  const currentToken = cookieStore.get("rmagenda_auth")?.value || cookieStore.get("rmcare_auth")?.value;
  if (!currentToken) return { success: false };

  const current = await verifyAdminSession(currentToken);
  if (!current) return { success: false };

  const newToken = await createAdminSession(current.sub);
  cookieStore.set("rmagenda_auth", newToken, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    maxAge: ADMIN_SESSION_SECONDS, path: "/"
  });
  cookieStore.set("rmcare_auth", newToken, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    maxAge: ADMIN_SESSION_SECONDS, path: "/"
  });
  return { success: true, expiresIn: ADMIN_SESSION_SECONDS };
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete("rmagenda_auth");
  cookieStore.delete("rmcare_auth");
  cookieStore.delete("rmagenda_auth_paciente");
  cookieStore.delete("rmcare_auth_paciente");
  return { success: true };
}

export async function getSessionAdminInfo() {
  const cookieStore = await cookies();
  const currentToken = cookieStore.get("rmagenda_auth")?.value || cookieStore.get("rmcare_auth")?.value;
  if (!currentToken) return null;

  const current = await verifyAdminSession(currentToken);
  if (!current || !current.sub) return null;

  const { data: admin } = await supabaseAdmin
    .from("administradores")
    .select("id, role, empresa_id, usuario, nome, permissoes, is_owner")
    .eq("usuario", current.sub)
    .maybeSingle();

  return admin || null;
}

export async function updateAdminCredentials({ currentPassword, newUsername, newPassword }) {
  const cookieStore = await cookies();
  const session = await verifyAdminSession(cookieStore.get("rmagenda_auth")?.value || cookieStore.get("rmcare_auth")?.value);
  if (!session) return { success: false, error: "Sessão expirada." };
  const username = newUsername.trim().toLowerCase();
  if (username.length < 3 || newPassword.length < 8) return { success: false, error: "Use login com 3+ caracteres e senha com 8+ caracteres." };
  const { data: legacyAdmin } = await supabaseAdmin.from("administradores").select("id").eq("usuario", session.sub).eq("senha_hash", currentPassword).maybeSingle();
  const { data: hashedValid } = legacyAdmin ? { data: true } : await supabaseAdmin.rpc("verificar_senha_admin", { p_usuario: session.sub, p_senha: currentPassword });
  if (!hashedValid) return { success: false, error: "Senha atual inválida." };
  const { error } = await supabaseAdmin.rpc("alterar_credenciais_admin", { p_usuario_atual: session.sub, p_novo_usuario: username, p_nova_senha: newPassword });
  if (error) return { success: false, error: error.code === "23505" ? "Este login já está em uso." : error.message };
  const newToken = await createAdminSession(username);
  cookieStore.set("rmagenda_auth", newToken, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: ADMIN_SESSION_SECONDS, path: "/"
  });
  cookieStore.set("rmcare_auth", newToken, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: ADMIN_SESSION_SECONDS, path: "/"
  });
  return { success: true };
}
