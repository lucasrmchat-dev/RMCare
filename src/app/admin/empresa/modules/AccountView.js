"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  KeyRound,
  ShieldCheck,
  User,
  Activity,
  Save,
  Check,
  Plus,
  Users,
  ShieldAlert,
  Trash2,
  X,
  FileSpreadsheet,
  Link2,
  ClipboardCheck,
  Zap,
  CalendarDays,
  Clock3,
  CheckCircle2,
  XCircle,
  Lock
} from "lucide-react";
import { fadeUp, ButtonPrimary, TextInput, spring } from "../components/SharedUI";
import { updateAdminCredentials } from "@/actions/auth";
import {
  checkIdentifier,
  actionListarUsuariosEmpresa,
  actionCriarUsuarioEmpresa,
  actionAtualizarUsuarioEmpresa,
  actionDeletarUsuarioEmpresa,
  fetchAdminAuditoriaLogs
} from "@/actions/adminData";
import { History, Search, Filter, RefreshCw, Calendar, Tag, ChevronDown, Eye, FileText, Database } from "lucide-react";
import { CustomSelect } from "../components/SharedUI";

const LISTA_PERMISSOES = [
  { id: "agenda", label: "Agenda & Pacientes", desc: "Visualizar e gerenciar agendamentos e calendário.", icon: CalendarDays, color: "text-blue-500" },
  { id: "sigilo_clinico", label: "Sigilo Clínico & Enfermidades", desc: "Acesso crítico a respostas de formulários clínicos e histórico de saúde dos pacientes.", icon: ShieldAlert, color: "text-red-500", superCritico: true },
  { id: "bloqueios", label: "Horários & Duração", desc: "Configurar turnos, pausas e regras de ocupação da agenda.", icon: Clock3, color: "text-amber-500" },
  { id: "politicas", label: "Políticas de Atendimento", desc: "Regras de retorno de consultas e prazos de antecedência.", icon: FileSpreadsheet, color: "text-indigo-500" },
  { id: "triagem", label: "Formulários Clínicos", desc: "Criar e editar questionários de triagem por especialidade.", icon: ClipboardCheck, color: "text-emerald-500" },
  { id: "personalizacao", label: "Aparência & Mensagens", desc: "Gerenciar templates automáticos e jornadas do paciente.", icon: Zap, color: "text-purple-500" },
  { id: "equipe", label: "Corpo Clínico & Especialistas", desc: "Cadastrar novos especialistas, códigos URI e pausas.", icon: Users, color: "text-cyan-500" },
  { id: "integracoes", label: "Sincronização & ERP", desc: "Configurar credenciais da API Medicalsys e Webhooks.", icon: Link2, color: "text-orange-500" },
  { id: "usuarios", label: "Gerenciar Usuários & Permissões", desc: "Criar e editar colaboradores e acessos da clínica.", icon: ShieldCheck, color: "text-rose-500", superCritico: true }
];

export default function AccountView({
  subTab = "credenciais",
  showToast,
  loggedAdmin,
  permissoes = [],
  isOwner = false
}) {
  // ==========================================
  // ESTADOS: ALTERAÇÃO DE CREDENCIAIS PRÓPRIAS
  // ==========================================
  const [usernameForm, setUsernameForm] = useState({
    currentPassword: "",
    newUsername: ""
  });
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [loadingUser, setLoadingUser] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [loadingPass, setLoadingPass] = useState(false);

  // ==========================================
  // ESTADOS: AUDITORIA DO SISTEMA
  // ==========================================
  const [logsAuditoria, setLogsAuditoria] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [filtroResponsavel, setFiltroResponsavel] = useState("todos");
  const [filtroModulo, setFiltroModulo] = useState("todos");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroSearchLog, setFiltroSearchLog] = useState("");
  const [expandedLogId, setExpandedLogId] = useState(null);

  const carregarLogsAuditoria = async () => {
    setLoadingLogs(true);
    try {
      const logs = await fetchAdminAuditoriaLogs({
        responsavel: filtroResponsavel,
        modulo: filtroModulo,
        dataInicio: filtroDataInicio,
        dataFim: filtroDataFim,
        search: filtroSearchLog
      });
      setLogsAuditoria(logs || []);
    } catch (err) {
      console.error("Erro ao carregar auditoria:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (subTab === "auditoria") {
      carregarLogsAuditoria();
    }
  }, [subTab, filtroResponsavel, filtroModulo, filtroDataInicio, filtroDataFim]);

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
        newPassword: usernameForm.currentPassword
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
      const res = await updateAdminCredentials({
        currentPassword: passwordForm.currentPassword,
        newUsername: loggedAdmin?.usuario || "admin",
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

  // ==========================================
  // ESTADOS: GESTÃO DE USUÁRIOS E PERMISSÕES
  // ==========================================
  const [usuarios, setUsuarios] = useState([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const temPermissaoUsuarios = useMemo(() => {
    if (!loggedAdmin) return false;
    if (isOwner || loggedAdmin.is_owner || loggedAdmin.role === "sistema") return true;
    const perms = Array.isArray(permissoes) && permissoes.length > 0 ? permissoes : (loggedAdmin.permissoes || []);
    return perms.includes("usuarios");
  }, [loggedAdmin, isOwner, permissoes]);

  const [newUserForm, setNewUserForm] = useState({
    usuario: "",
    nome: "",
    senha: "",
    permissoes: ["agenda", "bloqueios", "politicas", "triagem", "personalizacao", "equipe", "integracoes"]
  });
  const [savingUser, setSavingUser] = useState(false);

  const fetchUsuarios = async () => {
    if (!temPermissaoUsuarios) return;
    setLoadingUsuarios(true);
    try {
      const data = await actionListarUsuariosEmpresa();
      setUsuarios(data);
    } catch (err) {
      console.error("Erro ao listar usuários:", err);
    } finally {
      setLoadingUsuarios(false);
    }
  };

  useEffect(() => {
    if (subTab === "usuarios" && temPermissaoUsuarios) {
      fetchUsuarios();
    }
  }, [subTab, temPermissaoUsuarios]);

  const togglePermissaoNovoUsuario = (permId) => {
    setNewUserForm((prev) => {
      if (prev.permissoes.includes(permId)) {
        return { ...prev, permissoes: prev.permissoes.filter((p) => p !== permId) };
      } else {
        return { ...prev, permissoes: [...prev.permissoes, permId] };
      }
    });
  };

  const togglePermissaoEditUser = (permId) => {
    if (!editingUser) return;
    const current = editingUser.permissoes || [];
    const updated = current.includes(permId)
      ? current.filter((p) => p !== permId)
      : [...current, permId];
    setEditingUser({ ...editingUser, permissoes: updated });
  };

  const handleCriarUsuario = async (e) => {
    e.preventDefault();
    if (!newUserForm.usuario.trim() || !newUserForm.senha.trim()) {
      if (showToast) showToast("Preencha o login e a senha do novo usuário.", "error");
      return;
    }
    setSavingUser(true);
    try {
      await actionCriarUsuarioEmpresa(newUserForm);
      if (showToast) showToast("Usuário criado com sucesso!");
      setIsAddingUser(false);
      setNewUserForm({
        usuario: "",
        nome: "",
        senha: "",
        permissoes: ["agenda", "bloqueios", "politicas", "triagem", "personalizacao", "equipe", "integracoes"]
      });
      fetchUsuarios();
    } catch (err) {
      if (showToast) showToast(`Erro ao criar usuário: ${err.message}`, "error");
    } finally {
      setSavingUser(false);
    }
  };

  const handleAtualizarUsuario = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setSavingUser(true);
    try {
      await actionAtualizarUsuarioEmpresa(editingUser.id, {
        nome: editingUser.nome,
        permissoes: editingUser.permissoes,
        senha: editingUser.novaSenha || undefined
      });
      if (showToast) showToast("Permissões do usuário atualizadas!");
      setEditingUser(null);
      fetchUsuarios();
    } catch (err) {
      if (showToast) showToast(`Erro ao atualizar: ${err.message}`, "error");
    } finally {
      setSavingUser(false);
    }
  };

  const handleExcluirUsuario = async (u) => {
    if (u.is_owner) {
      if (showToast) showToast("O usuário proprietário da clínica não pode ser excluído.", "error");
      return;
    }
    if (!window.confirm(`Deseja realmente remover o acesso de "${u.usuario}"?`)) return;
    try {
      await actionDeletarUsuarioEmpresa(u.id);
      if (showToast) showToast("Usuário excluído.");
      fetchUsuarios();
    } catch (err) {
      if (showToast) showToast(`Erro ao excluir: ${err.message}`, "error");
    }
  };

  return (
    <motion.div key="account" {...fadeUp} className="flex-1 flex flex-col h-full overflow-hidden w-full max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
      
      {/* CABEÇALHO */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200/80 dark:border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 shadow-sm">
            <KeyRound size={20} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-950 dark:text-white tracking-tight">
              {subTab === "usuarios" ? "Usuários & Permissões de Acesso" : "Minhas Credenciais de Administrador"}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              {subTab === "usuarios" 
                ? "Controle permissões granulares por abas e sigilo clínico para colaboradores."
                : "Atualize com segurança seu nome de usuário e senha de acesso."}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pb-24 pr-1">
        <AnimatePresence mode="wait">
          {/* SUB-ABA 1: MINHAS CREDENCIAIS */}
          {subTab === "credenciais" && (
            <motion.div
              key="credenciais"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={spring}
              className="space-y-6"
            >
              {/* ALTERAÇÃO DE LOGIN */}
              <section className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-8 rounded-[2rem] shadow-sm">
                <div className="flex items-center gap-3 mb-6 border-b border-zinc-100 dark:border-white/5 pb-4">
                  <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
                    <User size={18} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-950 dark:text-white">Alterar Nome de Usuário (Login)</h3>
                    <p className="text-xs text-zinc-500">
                      Altere o identificador usado para entrar no painel administrativo desta clínica.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveUsername} className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-5">
                    <TextInput
                      type="password"
                      label="Senha Atual Obrigatória *"
                      placeholder="Digite sua senha atual..."
                      value={usernameForm.currentPassword}
                      onChange={(e) => setUsernameForm({ ...usernameForm, currentPassword: e.target.value })}
                      required
                    />

                    <div className="space-y-2 relative">
                      <TextInput
                        type="text"
                        label="Novo Usuário (Login) *"
                        placeholder="Ex.: admin.rmagenda"
                        value={usernameForm.newUsername}
                        onChange={(e) => handleCheckUsername(e.target.value)}
                        required
                      />

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

                  <div className="flex justify-end pt-1">
                    <ButtonPrimary
                      type="submit"
                      disabled={loadingUser || usernameAvailable === false || !usernameForm.currentPassword || !usernameForm.newUsername}
                      icon={Save}
                      className="px-6 py-2 text-xs min-h-[38px] rounded-xl cursor-pointer"
                    >
                      {loadingUser ? "Atualizando Login..." : "Salvar Novo Usuário"}
                    </ButtonPrimary>
                  </div>
                </form>
              </section>

              {/* ALTERAÇÃO DE SENHA */}
              <section className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-8 rounded-[2rem] shadow-sm">
                <div className="flex items-center gap-3 mb-6 border-b border-zinc-100 dark:border-white/5 pb-4">
                  <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
                    <ShieldCheck size={18} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-950 dark:text-white">Alterar Senha de Segurança</h3>
                    <p className="text-xs text-zinc-500">
                      Defina uma nova senha forte com validação de complexidade em tempo real.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSavePassword} className="space-y-5">
                  <div className="grid md:grid-cols-3 gap-5">
                    <TextInput
                      type="password"
                      label="Senha Atual *"
                      placeholder="Digite sua senha atual..."
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      required
                    />

                    <TextInput
                      type="password"
                      label="Nova Senha Forte *"
                      placeholder="Digite a nova senha..."
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

                  {/* CHECKLIST DE REQUISITOS */}
                  <div className="p-4 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className={`flex items-center gap-2 font-medium ${passwordRules.minLength ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"}`}>
                      {passwordRules.minLength ? <Check size={14} /> : <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />}
                      8+ caracteres
                    </div>
                    <div className={`flex items-center gap-2 font-medium ${passwordRules.hasDigit ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"}`}>
                      {passwordRules.hasDigit ? <Check size={14} /> : <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />}
                      Pelo menos 1 número
                    </div>
                    <div className={`flex items-center gap-2 font-medium ${passwordRules.hasUpper ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"}`}>
                      {passwordRules.hasUpper ? <Check size={14} /> : <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />}
                      Letra maiúscula (A-Z)
                    </div>
                    <div className={`flex items-center gap-2 font-medium ${passwordRules.hasLower ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"}`}>
                      {passwordRules.hasLower ? <Check size={14} /> : <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />}
                      Letra minúscula (a-z)
                    </div>
                    <div className={`flex items-center gap-2 font-medium ${passwordRules.hasSpecial ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"}`}>
                      {passwordRules.hasSpecial ? <Check size={14} /> : <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />}
                      Caractere especial (!@#$)
                    </div>
                    <div className={`flex items-center gap-2 font-medium ${passwordRules.match ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"}`}>
                      {passwordRules.match ? <Check size={14} /> : <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />}
                      Senhas conferem
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <ButtonPrimary
                      type="submit"
                      disabled={loadingPass || !isPasswordValid || !passwordForm.currentPassword}
                      icon={Save}
                      className="px-6 py-2 text-xs min-h-[38px] rounded-xl cursor-pointer"
                    >
                      {loadingPass ? "Atualizando Senha..." : "Salvar Nova Senha"}
                    </ButtonPrimary>
                  </div>
                </form>
              </section>
            </motion.div>
          )}

          {/* SUB-ABA 2: GESTÃO DE USUÁRIOS & PERMISSÕES */}
          {subTab === "usuarios" && (
            !temPermissaoUsuarios ? (
              <div className="p-16 text-center rounded-[2rem] bg-white/80 dark:bg-[#0c0c0e]/80 border border-zinc-200/80 dark:border-white/10 shadow-sm space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                  <Lock size={22} />
                </div>
                <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                  Acesso Restrito: Gerenciamento de Usuários
                </h3>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  Sua conta de colaborador não possui a permissão <strong>"Gerenciar Usuários & Permissões"</strong>. Solicite liberação ao administrador proprietário da clínica.
                </p>
              </div>
            ) : (
              <motion.div
                key="usuarios"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={spring}
                className="space-y-6"
              >
                {/* TOPO COM BOTÃO DE NOVO USUÁRIO */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl p-6 rounded-[2rem] border border-zinc-200/80 dark:border-white/10 shadow-sm">
                  <div>
                    <h3 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                      <Users size={18} strokeWidth={1.5} className="text-blue-500" /> Colaboradores & Perfis de Acesso
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Cadastre outros administradores para esta clínica com controle estrito de abas e dados sigilosos.
                    </p>
                  </div>

                  {!isAddingUser && (
                    <ButtonPrimary onClick={() => { setIsAddingUser(true); setEditingUser(null); }} icon={Plus} className="px-5 py-2 text-xs min-h-[38px] rounded-xl cursor-pointer">
                      Cadastrar Novo Usuário
                    </ButtonPrimary>
                  )}
                </div>

                {/* FORMULÁRIO DE CADASTRO DE NOVO USUÁRIO */}
                <AnimatePresence>
                  {isAddingUser && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: -10 }}
                      animate={{ opacity: 1, height: "auto", y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -10 }}
                      className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-8 rounded-[2rem] shadow-xl space-y-6"
                    >
                      <div className="flex justify-between items-center border-b border-zinc-100 dark:border-white/5 pb-4">
                        <div>
                          <h4 className="text-base font-bold text-zinc-950 dark:text-white">Criar Novo Acesso Administrativo</h4>
                          <p className="text-xs text-zinc-500 mt-0.5">Defina as credenciais e selecione as permissões específicas deste colaborador.</p>
                        </div>
                        <button
                          onClick={() => setIsAddingUser(false)}
                          className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <form onSubmit={handleCriarUsuario} className="space-y-5">
                        <div className="grid md:grid-cols-3 gap-4">
                          <TextInput
                            label="Nome Completo / Cargo"
                            placeholder="Ex.: Dra. Ana Paula (Atendimento)"
                            value={newUserForm.nome}
                            onChange={(e) => setNewUserForm({ ...newUserForm, nome: e.target.value })}
                          />
                          <TextInput
                            label="Usuário (Login de Entrada) *"
                            placeholder="Ex.: ana.recepcao"
                            value={newUserForm.usuario}
                            onChange={(e) => setNewUserForm({ ...newUserForm, usuario: e.target.value.toLowerCase().trim() })}
                            required
                          />
                          <TextInput
                            type="password"
                            label="Senha Provisória *"
                            placeholder="Mínimo 6 caracteres"
                            value={newUserForm.senha}
                            onChange={(e) => setNewUserForm({ ...newUserForm, senha: e.target.value })}
                            required
                          />
                        </div>

                        {/* SELETOR GRANULAR DE PERMISSÕES */}
                        <div className="space-y-2.5 pt-1">
                          <label className="text-xs font-bold uppercase tracking-widest text-zinc-400 block ml-1">
                            Níveis de Acesso e Permissões de Abas:
                          </label>
                          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {LISTA_PERMISSOES.map((perm) => {
                              const isSelected = newUserForm.permissoes.includes(perm.id);
                              const Icon = perm.icon;
                              return (
                                <button
                                  key={perm.id}
                                  type="button"
                                  onClick={() => togglePermissaoNovoUsuario(perm.id)}
                                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                                    isSelected
                                      ? perm.superCritico
                                        ? "bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800 ring-2 ring-red-500/30"
                                        : "bg-blue-50/50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800 ring-2 ring-blue-500/30"
                                      : "bg-zinc-50/50 dark:bg-zinc-900/40 border-zinc-200/80 dark:border-zinc-800 opacity-60 hover:opacity-100"
                                  }`}
                                >
                                  <div className={`p-2 rounded-xl bg-white dark:bg-black border border-zinc-200/60 dark:border-zinc-800 ${perm.color}`}>
                                    <Icon size={15} strokeWidth={1.5} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-xs text-zinc-950 dark:text-white truncate">{perm.label}</span>
                                      <div className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] ${isSelected ? "bg-zinc-900 dark:bg-white text-white dark:text-black font-bold" : "border border-zinc-300 dark:border-zinc-700"}`}>
                                        {isSelected && <Check size={10} />}
                                      </div>
                                    </div>
                                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-tight">{perm.desc}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-white/5">
                          <button
                            type="button"
                            onClick={() => setIsAddingUser(false)}
                            className="px-5 py-2 rounded-xl text-xs font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <ButtonPrimary type="submit" disabled={savingUser} icon={Plus} className="px-6 py-2 text-xs min-h-[38px] rounded-xl cursor-pointer">
                            {savingUser ? "Criando Usuário..." : "Criar Usuário"}
                          </ButtonPrimary>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* FORMULÁRIO DE EDIÇÃO DE PERMISSÕES DO USUÁRIO */}
                <AnimatePresence>
                  {editingUser && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: -10 }}
                      animate={{ opacity: 1, height: "auto", y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -10 }}
                      className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-blue-200 dark:border-blue-900/60 p-6 md:p-8 rounded-[2rem] shadow-xl space-y-6"
                    >
                      <div className="flex justify-between items-center border-b border-zinc-100 dark:border-white/5 pb-4">
                        <div>
                          <h4 className="text-base font-bold text-zinc-950 dark:text-white">
                            Editar Acesso de @{editingUser.usuario}
                          </h4>
                          <p className="text-xs text-zinc-500 mt-0.5">Atualize as permissões de abas ou redefina a senha deste colaborador.</p>
                        </div>
                        <button
                          onClick={() => setEditingUser(null)}
                          className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <form onSubmit={handleAtualizarUsuario} className="space-y-5">
                        <div className="grid md:grid-cols-2 gap-4">
                          <TextInput
                            label="Nome / Identificação"
                            value={editingUser.nome || ""}
                            onChange={(e) => setEditingUser({ ...editingUser, nome: e.target.value })}
                          />
                          <TextInput
                            type="password"
                            label="Redefinir Senha (Deixe em branco para manter)"
                            placeholder="Nova senha..."
                            value={editingUser.novaSenha || ""}
                            onChange={(e) => setEditingUser({ ...editingUser, novaSenha: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2.5 pt-1">
                          <label className="text-xs font-bold uppercase tracking-widest text-zinc-400 block ml-1">
                            Permissões e Sigilo do Colaborador:
                          </label>
                          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {LISTA_PERMISSOES.map((perm) => {
                              const isSelected = (editingUser.permissoes || []).includes(perm.id);
                              const Icon = perm.icon;
                              return (
                                <button
                                  key={perm.id}
                                  type="button"
                                  onClick={() => togglePermissaoEditUser(perm.id)}
                                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                                    isSelected
                                      ? perm.superCritico
                                        ? "bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800 ring-2 ring-red-500/30"
                                        : "bg-blue-50/50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800 ring-2 ring-blue-500/30"
                                      : "bg-zinc-50/50 dark:bg-zinc-900/40 border-zinc-200/80 dark:border-zinc-800 opacity-60 hover:opacity-100"
                                  }`}
                                >
                                  <div className={`p-2 rounded-xl bg-white dark:bg-black border border-zinc-200/60 dark:border-zinc-800 ${perm.color}`}>
                                    <Icon size={15} strokeWidth={1.5} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-xs text-zinc-950 dark:text-white truncate">{perm.label}</span>
                                      <div className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] ${isSelected ? "bg-zinc-900 dark:bg-white text-white dark:text-black font-bold" : "border border-zinc-300 dark:border-zinc-700"}`}>
                                        {isSelected && <Check size={10} />}
                                      </div>
                                    </div>
                                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-tight">{perm.desc}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-white/5">
                          <button
                            type="button"
                            onClick={() => setEditingUser(null)}
                            className="px-5 py-2 rounded-xl text-xs font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <ButtonPrimary type="submit" disabled={savingUser} icon={Save} className="px-6 py-2 text-xs min-h-[38px] rounded-xl cursor-pointer">
                            {savingUser ? "Salvando..." : "Salvar Alterações"}
                          </ButtonPrimary>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* LISTA DE USUÁRIOS CADASTRADOS */}
                <div className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 rounded-[2rem] overflow-hidden shadow-sm">
                  <div className="p-5 border-b border-zinc-100 dark:border-white/5 flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Usuários Ativos na Clínica</span>
                    <span className="text-xs font-bold text-zinc-500">{usuarios.length} cadastrado(s)</span>
                  </div>

                  {loadingUsuarios ? (
                    <div className="p-12 text-center text-xs text-zinc-400">Carregando usuários...</div>
                  ) : usuarios.length === 0 ? (
                    <div className="p-12 text-center text-xs text-zinc-500">Nenhum usuário secundário cadastrado.</div>
                  ) : (
                    <div className="divide-y divide-zinc-100 dark:divide-white/5">
                      {usuarios.map((u) => (
                        <div key={u.id} className="p-5 flex flex-col md:flex-row justify-between md:items-center gap-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-zinc-950 dark:text-white text-sm">@{u.usuario}</span>
                              {u.is_owner ? (
                                <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[9px] font-bold uppercase tracking-widest rounded-md">
                                  Proprietário
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[9px] font-bold uppercase tracking-widest rounded-md">
                                  Colaborador
                                </span>
                              )}
                            </div>
                            {u.nome && <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{u.nome}</p>}

                            {/* Badges de permissões ativas */}
                            <div className="flex flex-wrap gap-1 mt-2.5">
                              {(u.permissoes || []).map((pId) => {
                                const pObj = LISTA_PERMISSOES.find((item) => item.id === pId);
                                if (!pObj) return null;
                                return (
                                  <span
                                    key={pId}
                                    className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md ${
                                      pObj.superCritico
                                        ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200/50"
                                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                                    }`}
                                  >
                                    {pObj.label}
                                  </span>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { setEditingUser({ ...u, novaSenha: "" }); setIsAddingUser(false); }}
                              className="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-xl text-xs font-bold transition-colors min-h-[34px] cursor-pointer"
                            >
                              Gerenciar
                            </button>
                            {!u.is_owner && (
                              <button
                                onClick={() => handleExcluirUsuario(u)}
                                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer"
                                title="Excluir Usuário"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>

    </motion.div>
  );
}
