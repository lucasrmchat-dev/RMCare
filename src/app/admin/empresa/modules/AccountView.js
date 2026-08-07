"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  KeyRound,
  UserCheck,
  Lock,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  User,
  AlertCircle,
  Activity,
  Save,
  Check
} from "lucide-react";
import { fadeUp, ButtonPrimary, TextInput } from "../components/SharedUI";
import { updateAdminCredentials } from "@/actions/auth";
import { checkIdentifier } from "@/actions/adminData";

export default function AccountView({ showToast }) {
  // Estado para Alteração de Usuário / Login
  const [usernameForm, setUsernameForm] = useState({
    currentPassword: "",
    newUsername: ""
  });
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null); // true | false | null
  const [loadingUser, setLoadingUser] = useState(false);

  // Estado para Alteração de Senha
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [loadingPass, setLoadingPass] = useState(false);

  // Validação em Tempo Real das Regras de Senha
  const passwordRules = useMemo(() => {
    const pwd = passwordForm.newPassword;
    return {
      minLength: pwd.length >= 8,
      hasDigit: /\d/.test(pwd),
      hasUpper: /[A-Z]/.test(pwd),
      hasLower: /[a-z]/.test(pwd),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\|,.<>\/?]/.test(pwd),
      match: pwd.length > 0 && pwd === passwordForm.confirmPassword
    };
  }, [passwordForm.newPassword, passwordForm.confirmPassword]);

  const isPasswordValid = Object.values(passwordRules).every(Boolean);

  // Checa se o novo usuário já existe no banco
  const handleCheckUsername = async (val) => {
    const clean = val.trim().toLowerCase();
    setUsernameForm((prev) => ({ ...prev, newUsername: val }));
    if (clean.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    setCheckingUsername(true);
    try {
      const res = await checkIdentifier(clean);
      // Se encontrar um admin com esse nome, não está disponível
      if (res.success && res.type === "admin") {
        setUsernameAvailable(false);
      } else {
        setUsernameAvailable(true);
      }
    } catch (err) {
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  };

  // Submeter alteração de Usuário/Login
  const handleSaveUsername = async (e) => {
    e.preventDefault();
    if (!usernameForm.currentPassword || !usernameForm.newUsername) {
      if (showToast) showToast("Preencha a senha atual e o novo nome de usuário.", "error");
      return;
    }
    if (usernameAvailable === false) {
      if (showToast) showToast("Este nome de usuário já está em uso por outro administrador.", "error");
      return;
    }

    setLoadingUser(true);
    try {
      const res = await updateAdminCredentials({
        currentPassword: usernameForm.currentPassword,
        newUsername: usernameForm.newUsername,
        newPassword: usernameForm.currentPassword // Mantém a senha inalterada
      });

      if (!res.success) throw new Error(res.error);

      if (showToast) showToast("Nome de usuário atualizado com sucesso!");
      setUsernameForm({ currentPassword: "", newUsername: "" });
      setUsernameAvailable(null);
    } catch (err) {
      if (showToast) showToast(`Erro ao alterar login: ${err.message}`, "error");
    } finally {
      setLoadingUser(false);
    }
  };

  // Submeter alteração de Senha
  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword) {
      if (showToast) showToast("Informe sua senha atual.", "error");
      return;
    }
    if (!isPasswordValid) {
      if (showToast) showToast("A nova senha precisa atender a todos os requisitos de segurança.", "error");
      return;
    }

    setLoadingPass(true);
    try {
      // Pega o usuário logado via cookie ou mantem o atual
      const res = await updateAdminCredentials({
        currentPassword: passwordForm.currentPassword,
        newUsername: "admin", // Mantém o usuário do cookie
        newPassword: passwordForm.newPassword
      });

      if (!res.success) throw new Error(res.error);

      if (showToast) showToast("Senha de acesso atualizada com segurança!");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      if (showToast) showToast(`Erro ao alterar senha: ${err.message}`, "error");
    } finally {
      setLoadingPass(false);
    }
  };

  return (
    <motion.div key="account" {...fadeUp} className="flex-1 flex flex-col h-full overflow-hidden w-full max-w-5xl mx-auto p-4 md:p-6 lg:p-8">
      
      {/* PADRÃO UNIFICADO DE CABEÇALHO */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 shadow-sm">
            <KeyRound size={24} />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
              Acesso e Segurança
            </h2>
            <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
              Gerencie suas credenciais administrativas, altere seu login e atualize sua senha com regras de segurança.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 pb-20">
        
        {/* CARD 1: ALTERAÇÃO DE LOGIN DE ACESSO */}
        <section className="bg-white dark:bg-[#111] border border-zinc-200/80 dark:border-zinc-800 p-8 rounded-[2.5rem] shadow-sm">
          <div className="flex items-center gap-3 mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
              <User size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-zinc-900 dark:text-white">Alterar Nome de Usuário (Login)</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Altere o identificador usado para entrar no painel administrativo desta clínica.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveUsername} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <TextInput
                  type="password"
                  label="Senha Atual Obrigatória *"
                  placeholder="Digite sua senha atual..."
                  value={usernameForm.currentPassword}
                  onChange={(e) => setUsernameForm({ ...usernameForm, currentPassword: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2 relative">
                <TextInput
                  type="text"
                  label="Novo Usuário (Login) *"
                  placeholder="Ex.: admin.rmagenda"
                  value={usernameForm.newUsername}
                  onChange={(e) => handleCheckUsername(e.target.value)}
                  required
                />

                {/* Status de Disponibilidade em tempo real */}
                {checkingUsername && (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-2 font-medium">
                    <Activity size={14} className="animate-spin text-blue-500" />
                    Verificando disponibilidade do login...
                  </div>
                )}
                {!checkingUsername && usernameAvailable === true && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-bold">
                    <CheckCircle2 size={15} />
                    Nome de usuário disponível!
                  </div>
                )}
                {!checkingUsername && usernameAvailable === false && (
                  <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 mt-2 font-bold">
                    <XCircle size={15} />
                    Este login já está em uso. Escolha outro nome.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <ButtonPrimary
                type="submit"
                disabled={loadingUser || usernameAvailable === false || !usernameForm.currentPassword || !usernameForm.newUsername}
                icon={Save}
                className="px-8 py-3.5 text-xs"
              >
                {loadingUser ? "Atualizando Login..." : "Salvar Novo Usuário"}
              </ButtonPrimary>
            </div>
          </form>
        </section>

        {/* CARD 2: ALTERAÇÃO DE SENHA COM REGRAS E CHECKLIST */}
        <section className="bg-white dark:bg-[#111] border border-zinc-200/80 dark:border-zinc-800 p-8 rounded-[2.5rem] shadow-sm">
          <div className="flex items-center gap-3 mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-zinc-900 dark:text-white">Alterar Senha de Segurança</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Defina uma nova senha forte com validação de complexidade em tempo real.
              </p>
            </div>
          </div>

          <form onSubmit={handleSavePassword} className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <TextInput
                type="password"
                label="Senha Atual *"
                placeholder="Sua senha atual..."
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                required
              />

              <TextInput
                type="password"
                label="Nova Senha *"
                placeholder="Sua nova senha..."
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                required
              />

              <TextInput
                type="password"
                label="Confirmar Nova Senha *"
                placeholder="Repita a nova senha..."
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                required
              />
            </div>

            {/* Checklist de Validação das Regras de Senha em Tempo Real */}
            <div className="p-6 bg-zinc-50 dark:bg-zinc-900/60 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 space-y-3">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Requisitos de Segurança da Senha</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs font-medium">
                <div className={`flex items-center gap-2 ${passwordRules.minLength ? "text-emerald-600 font-bold" : "text-zinc-400"}`}>
                  {passwordRules.minLength ? <CheckCircle2 size={16} /> : <div className="w-4 h-4 rounded-full border border-zinc-300" />}
                  Mínimo de 8 caracteres
                </div>

                <div className={`flex items-center gap-2 ${passwordRules.hasDigit ? "text-emerald-600 font-bold" : "text-zinc-400"}`}>
                  {passwordRules.hasDigit ? <CheckCircle2 size={16} /> : <div className="w-4 h-4 rounded-full border border-zinc-300" />}
                  Pelo menos 1 número
                </div>

                <div className={`flex items-center gap-2 ${passwordRules.hasUpper ? "text-emerald-600 font-bold" : "text-zinc-400"}`}>
                  {passwordRules.hasUpper ? <CheckCircle2 size={16} /> : <div className="w-4 h-4 rounded-full border border-zinc-300" />}
                  1 letra maiúscula (A-Z)
                </div>

                <div className={`flex items-center gap-2 ${passwordRules.hasLower ? "text-emerald-600 font-bold" : "text-zinc-400"}`}>
                  {passwordRules.hasLower ? <CheckCircle2 size={16} /> : <div className="w-4 h-4 rounded-full border border-zinc-300" />}
                  1 letra minúscula (a-z)
                </div>

                <div className={`flex items-center gap-2 ${passwordRules.hasSpecial ? "text-emerald-600 font-bold" : "text-zinc-400"}`}>
                  {passwordRules.hasSpecial ? <CheckCircle2 size={16} /> : <div className="w-4 h-4 rounded-full border border-zinc-300" />}
                  1 caractere especial (!@#$...)
                </div>

                <div className={`flex items-center gap-2 ${passwordRules.match ? "text-emerald-600 font-bold" : "text-zinc-400"}`}>
                  {passwordRules.match ? <CheckCircle2 size={16} /> : <div className="w-4 h-4 rounded-full border border-zinc-300" />}
                  Confirmação de senha igual
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <ButtonPrimary
                type="submit"
                disabled={loadingPass || !isPasswordValid || !passwordForm.currentPassword}
                icon={Save}
                className="px-8 py-3.5 text-xs"
              >
                {loadingPass ? "Atualizando Senha..." : "Atualizar Senha de Acesso"}
              </ButtonPrimary>
            </div>
          </form>
        </section>

      </div>
    </motion.div>
  );
}
