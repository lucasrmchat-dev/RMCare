"use server";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createAdminSession, verifyAdminSession, ADMIN_SESSION_SECONDS } from "@/lib/session";
import { hashPassword, verifyPassword, sanitizeInput } from "@/lib/security";

// Trava de segurança: avisa imediatamente se as variáveis estiverem faltando
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Faltam as credenciais do Supabase no arquivo de ambiente");
}

// ⚠️ Usamos a SERVICE_ROLE_KEY aqui. Ela ignora o RLS com segurança no backend.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export async function checkIdentifier(identificador) {
  const idClean = sanitizeInput(identificador || "").toLowerCase();
  if (!idClean) {
    return { success: false, error: "Informe seu e-mail de acesso ou CPF de paciente." };
  }

  // 1. Busca do administrador por e-mail ou nome de usuário
  let { data: admin } = await supabaseAdmin
    .from("administradores")
    .select("id, role, empresa_id, usuario, email, nome, primeiro_acesso")
    .or(`usuario.ilike.${idClean},email.ilike.${idClean}`)
    .maybeSingle();

  if (admin) {
    return {
      success: true,
      type: "admin",
      role: admin.role,
      empresa_id: admin.empresa_id,
      usuario: admin.usuario,
      email: admin.email || admin.usuario,
      primeiro_acesso: Boolean(admin.primeiro_acesso)
    };
  }

  // 2. Busca de paciente por CPF
  const cleanCpf = idClean.replace(/\D/g, "");
  
  if (cleanCpf.length !== 11) {
    return { success: false, error: "E-mail ou CPF não encontrado. Digite seu e-mail de acesso ou CPF de paciente." };
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

      if (!paciente || paciente.data_nascimento !== birthDate) {
        return { success: false, error: "A data de nascimento informada não coincide com nosso banco de dados." };
      }

      // Hash criptográfico seguro PBKDF2 com salt de 128 bits
      const securePasswordHash = await hashPassword(password);

      const { error } = await supabaseAdmin
        .from("pacientes_credenciais")
        .insert({ paciente_id: id, senha_hash: securePasswordHash });

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
        .select("id, senha_hash")
        .eq("paciente_id", id)
        .maybeSingle();

      if (!cred) {
        return { success: false, error: "Credenciais de acesso não localizadas." };
      }

      // Validação criptográfica resistente a timing attacks
      const { valid, needsRehash } = await verifyPassword(password, cred.senha_hash);

      if (valid) {
        // Auto-upgrade de segurança: se a senha ainda estava em texto puro legado, atualiza para PBKDF2
        if (needsRehash) {
          try {
            const upgradedHash = await hashPassword(password);
            await supabaseAdmin
              .from("pacientes_credenciais")
              .update({ senha_hash: upgradedHash })
              .eq("id", cred.id);
          } catch (_) {}
        }

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
    const idClean = sanitizeInput(identificador || "").toLowerCase();
    let isAuthorized = false;
    let adminRecord = null;

    // 1. Busca os dados do administrador
    const { data: adminData } = await supabaseAdmin
      .from("administradores")
      .select("*")
      .or(`usuario.ilike.${idClean},email.ilike.${idClean}`)
      .maybeSingle();

    if (adminData && adminData.senha_hash) {
      // 2. Verifica hash criptográfico ou compatibilidade legada
      const { valid, needsRehash, isBcrypt } = await verifyPassword(password, adminData.senha_hash);

      if (valid) {
        isAuthorized = true;
        adminRecord = adminData;

        // Migração transparente de senhas antigas para o padrão PBKDF2
        if (needsRehash) {
          try {
            const upgradedHash = await hashPassword(password);
            await supabaseAdmin
              .from("administradores")
              .update({ senha_hash: upgradedHash })
              .eq("id", adminData.id);
          } catch (_) {}
        }
      } else if (isBcrypt) {
        // Tenta validação via RPC pgcrypto
        try {
          const { data: hashAdmin } = await supabaseAdmin.rpc("verificar_senha_admin", {
            p_usuario: idClean,
            p_senha: password
          });
          if (hashAdmin) {
            isAuthorized = true;
            adminRecord = adminData;
            // Upgrade para PBKDF2
            const upgradedHash = await hashPassword(password);
            await supabaseAdmin
              .from("administradores")
              .update({ senha_hash: upgradedHash })
              .eq("id", adminData.id);
          }
        } catch (_) {}
      }
    }

    if (isAuthorized && adminRecord) {
      if (adminRecord.primeiro_acesso === true) {
        return {
          success: true,
          mustResetPassword: true,
          usuario: adminRecord.usuario || idClean,
          email: adminRecord.email || idClean,
          role: adminRecord.role,
          empresa_id: adminRecord.empresa_id,
          message: "Primeiro acesso detectado. Por favor, cadastre sua nova senha."
        };
      }

      const sessionIdentifier = adminRecord.usuario || idClean;
      const sessionToken = await createAdminSession(sessionIdentifier);
      
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: ADMIN_SESSION_SECONDS,
        path: "/"
      };

      cookieStore.set("rmagenda_auth", sessionToken, cookieOptions);
      cookieStore.set("rmcare_auth", sessionToken, cookieOptions);

      return {
        success: true,
        message: "Acesso autorizado!",
        role: adminRecord.role,
        empresa_id: adminRecord.empresa_id
      };
    }

    return { success: false, error: "Senha de acesso incorreta." };
  }

  return { success: false, error: "Erro de autenticação." };
}

export async function actionRedefinirSenhaPrimeiroAcesso({ usuario, novaSenha }) {
  const cookieStore = await cookies();
  const cleanUser = sanitizeInput(usuario || "").toLowerCase();
  if (cleanUser.length < 3 || (novaSenha || "").length < 8) {
    return { success: false, error: "A nova senha deve conter no mínimo 8 caracteres." };
  }

  // Gera hash PBKDF2 da nova senha
  const securePasswordHash = await hashPassword(novaSenha);

  let { error } = await supabaseAdmin
    .from("administradores")
    .update({
      senha_hash: securePasswordHash,
      primeiro_acesso: false
    })
    .or(`usuario.ilike.${cleanUser},email.ilike.${cleanUser}`);

  if (error && (error.code === "42703" || error.message?.includes("column") || error.message?.includes("primeiro_acesso"))) {
    const retry = await supabaseAdmin
      .from("administradores")
      .update({ senha_hash: securePasswordHash })
      .or(`usuario.ilike.${cleanUser},email.ilike.${cleanUser}`);
    error = retry.error;
  }

  if (error) {
    return { success: false, error: `Falha ao salvar nova senha: ${error.message}` };
  }

  const sessionToken = await createAdminSession(cleanUser);
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ADMIN_SESSION_SECONDS,
    path: "/"
  };

  cookieStore.set("rmagenda_auth", sessionToken, cookieOptions);
  cookieStore.set("rmcare_auth", sessionToken, cookieOptions);

  const { data: adminRecord } = await supabaseAdmin
    .from("administradores")
    .select("role, empresa_id")
    .or(`usuario.ilike.${cleanUser},email.ilike.${cleanUser}`)
    .maybeSingle();

  return {
    success: true,
    role: adminRecord?.role || "empresa",
    empresa_id: adminRecord?.empresa_id,
    message: "Senha redefinida com sucesso!"
  };
}

export async function refreshAdminSession() {
  const cookieStore = await cookies();
  const currentToken = cookieStore.get("rmagenda_auth")?.value || cookieStore.get("rmcare_auth")?.value;
  if (!currentToken) return { success: false };

  const current = await verifyAdminSession(currentToken);
  if (!current) return { success: false };

  const newToken = await createAdminSession(current.sub);
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ADMIN_SESSION_SECONDS,
    path: "/"
  };

  cookieStore.set("rmagenda_auth", newToken, cookieOptions);
  cookieStore.set("rmcare_auth", newToken, cookieOptions);
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
    .select("id, empresa_id, usuario, email, nome, role, permissoes, is_owner, created_at")
    .or(`usuario.ilike.${current.sub},email.ilike.${current.sub}`)
    .maybeSingle();

  return admin || null;
}

export async function updateAdminCredentials({ currentPassword, newUsername, newPassword }) {
  const cookieStore = await cookies();
  const session = await verifyAdminSession(cookieStore.get("rmagenda_auth")?.value || cookieStore.get("rmcare_auth")?.value);
  if (!session) return { success: false, error: "Sessão expirada." };
  
  const username = sanitizeInput(newUsername).toLowerCase();
  if (username.length < 3 || newPassword.length < 8) {
    return { success: false, error: "Use login/e-mail válido e senha com 8+ caracteres." };
  }

  const { data: adminRecord } = await supabaseAdmin
    .from("administradores")
    .select("id, senha_hash")
    .or(`usuario.ilike.${session.sub},email.ilike.${session.sub}`)
    .maybeSingle();

  if (!adminRecord) return { success: false, error: "Administrador não encontrado." };

  const { valid } = await verifyPassword(currentPassword, adminRecord.senha_hash);
  if (!valid) {
    // Tenta fallback RPC se for hash bcrypt antigo
    const { data: hashedValid } = await supabaseAdmin.rpc("verificar_senha_admin", {
      p_usuario: session.sub,
      p_senha: currentPassword
    });
    if (!hashedValid) {
      return { success: false, error: "Senha atual inválida." };
    }
  }

  const newHashed = await hashPassword(newPassword);

  const { error } = await supabaseAdmin
    .from("administradores")
    .update({
      usuario: username,
      senha_hash: newHashed
    })
    .eq("id", adminRecord.id);

  if (error) {
    return { success: false, error: error.code === "23505" ? "Este login já está em uso." : error.message };
  }

  const newToken = await createAdminSession(username);
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ADMIN_SESSION_SECONDS,
    path: "/"
  };

  cookieStore.set("rmagenda_auth", newToken, cookieOptions);
  cookieStore.set("rmcare_auth", newToken, cookieOptions);
  return { success: true };
}
