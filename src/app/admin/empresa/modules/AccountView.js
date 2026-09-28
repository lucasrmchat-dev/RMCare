"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Shield,
  Key,
  Plus,
  Trash2,
  Lock,
  Mail,
  User,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Search,
  Filter,
  Calendar,
  History,
  Activity,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building,
  Sparkles,
  Info,
  KeyRound,
  Check,
  X,
  Download,
  Database,
  HardDrive,
  Upload,
  ShieldAlert,
  FileCheck,
  FileText,
  RefreshCw
} from "lucide-react";
import {
  fadeUp,
  spring,
  ButtonPrimary,
  TextInput,
  ToggleSwitch,
  CapsuleSpinner,
  ModuleHeader
} from "../components/SharedUI";
import {
  actionListarUsuariosEmpresa,
  actionCriarUsuarioEmpresa,
  actionAtualizarUsuarioEmpresa,
  actionDeletarUsuarioEmpresa,
  fetchAdminAuditoriaLogs as fetchAdminAuditoria
} from "@/actions/adminData";
import {
  actionGerarBackupCompletoSistema,
  actionListarBackupsLocais,
  actionRestaurarTabelasBackup
} from "@/actions/backupSystem";
import { updateAdminCredentials } from "@/actions/auth";
import { playDopamineSound, triggerHaptic } from "@/lib/dopamine";

const PERMISSOES_DISPONIVEIS = [
  { id: "agenda", label: "Agenda & Atendimentos", desc: "Visualizar, confirmar, aprovar pagamentos e desreservar" },
  { id: "horarios", label: "Horários & Duração", desc: "Configurar turnos, duração e agendas compartilhadas" },
  { id: "equipe", label: "Corpo Clínico & Especialistas", desc: "Cadastrar e gerenciar médicos e profissionais" },
  { id: "politicas", label: "Políticas & Retorno", desc: "Regras de retorno, prazos e cancelamento" },
  { id: "triagem", label: "Perguntas de Triagem", desc: "Formulários clínicos prévios ao agendamento" },
  { id: "personalizacao", label: "Configurações Gerais", desc: "Identificação, modo de exibição e mensagens" },
  { id: "integracoes", label: "Integrações & ERP MedicalSYS", desc: "Sincronização de agenda e credenciais de API" },
  { id: "auditoria", label: "Auditoria do Sistema", desc: "Consulta a logs e histórico de operações" },
  { id: "backup", label: "Backups & Segurança LGPD", desc: "Exportação completa do banco de dados e auditoria de sigilo" }
];

export default function AccountView({ subTab = "usuarios", setSubTab, showToast, loggedAdmin, isOwner }) {
  // A aba ativa é controlada exclusivamente pela Sidebar da aplicação (credenciais | usuarios | auditoria | backup)
  const currentView =
    subTab === "credenciais"
      ? "credenciais"
      : subTab === "auditoria"
      ? "auditoria"
      : subTab === "backup"
      ? "backup"
      : "usuarios";

  // USUÁRIOS & PERMISSÕES
  const [usuarios, setUsuarios] = useState([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(true);
  const [modalNovoUsuario, setModalNovoUsuario] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userSearch, setUserSearch] = useState("");

  const [formUser, setFormUser] = useState({
    email: "",
    nome: "",
    senha: "",
    permissoes: ["agenda", "horarios", "equipe", "politicas", "triagem", "personalizacao", "integracoes", "auditoria"]
  });
  const [isSavingUser, setIsSavingUser] = useState(false);

  // MINHAS CREDENCIAIS
  const [credForm, setCredForm] = useState({
    novoLogin: loggedAdmin?.email || loggedAdmin?.usuario || "",
    senhaAtual: "",
    novaSenha: "",
    confirmaNovaSenha: ""
  });
  const [isSavingCred, setIsSavingCred] = useState(false);

  // AUDITORIA DO SISTEMA
  const [auditorias, setAuditorias] = useState([]);
  const [loadingAuditoria, setLoadingAuditoria] = useState(false);
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroModulo, setFiltroModulo] = useState("todos");
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [filtroAcao, setFiltroAcao] = useState("");
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [paginaAtual, setPaginaAtual] = useState(1);

  // BACKUPS & SEGURANÇA MÁXIMA LGPD
  const [gerandoBackup, setGerandoBackup] = useState(false);
  const [backupsLocais, setBackupsLocais] = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [ultimoBackup, setUltimoBackup] = useState(null);
  const [modalTermoSigilo, setModalTermoSigilo] = useState(false);
  const [restaurando, setRestaurando] = useState(false);
  const [jsonRestauracao, setJsonRestauracao] = useState(null);
  const [modalRestaurar, setModalRestaurar] = useState(false);
  const [termoCopiado, setTermoCopiado] = useState(false);

  // Sincroniza formulário de credenciais quando o admin logado muda
  useEffect(() => {
    if (loggedAdmin) {
      setCredForm((prev) => ({
        ...prev,
        novoLogin: loggedAdmin.email || loggedAdmin.usuario || ""
      }));
    }
  }, [loggedAdmin]);

  // Carrega Usuários
  const carregarUsuarios = async () => {
    setLoadingUsuarios(true);
    try {
      const data = await actionListarUsuariosEmpresa();
      setUsuarios(data || []);
    } catch (e) {
      if (showToast) showToast("Erro ao listar usuários da clínica.", "error");
    } finally {
      setLoadingUsuarios(false);
    }
  };

  // Carrega Auditoria
  const carregarAuditoria = async () => {
    setLoadingAuditoria(true);
    try {
      const logs = await fetchAdminAuditoria({
        dataInicio: filtroDataInicio || null,
        dataFim: filtroDataFim || null,
        modulo: filtroModulo || null,
        usuario: filtroUsuario || null
      });
      setAuditorias(logs || []);
      setPaginaAtual(1);
    } catch (e) {
      console.warn("Erro ao buscar auditoria:", e);
    } finally {
      setLoadingAuditoria(false);
    }
  };

  // Carrega lista de backups salvos no servidor
  const carregarBackups = async () => {
    setLoadingBackups(true);
    try {
      const res = await actionListarBackupsLocais();
      if (res.success) {
        setBackupsLocais(res.backups || []);
      }
    } catch (e) {
      console.warn("Erro ao buscar backups locais:", e);
    } finally {
      setLoadingBackups(false);
    }
  };

  // Executa backup completo e dispara download imediato no navegador
  const handleGerarBackup = async () => {
    setGerandoBackup(true);
    playDopamineSound("select");
    triggerHaptic("success");
    try {
      const res = await actionGerarBackupCompletoSistema();
      if (res.success) {
        setUltimoBackup(res.resumo);

        // Download imediato via Blob no navegador
        const blob = new Blob([JSON.stringify(res.snapshot, null, 2)], {
          type: "application/json;charset=utf-8;"
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const slug = res.snapshot?.metadata?.empresa_slug || "clinica";
        const dataStr = new Date().toISOString().substring(0, 10);
        link.download = `rmcare_backup_${slug}_${dataStr}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        if (showToast) {
          showToast(
            `Backup de ${res.resumo.totalRegistros} registros baixado com sucesso!`
          );
        }
        await carregarBackups();
      } else {
        if (showToast) showToast("Falha ao gerar o backup do sistema.", "error");
      }
    } catch (err) {
      if (showToast) showToast(err.message || "Erro ao processar backup.", "error");
    } finally {
      setGerandoBackup(false);
    }
  };

  // Trata seleção de arquivo de restauração
  const handleArquivoSelecionado = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!parsed.tabelas) {
          throw new Error("O arquivo não possui o formato de backup válido do DRM Care.");
        }
        setJsonRestauracao(parsed);
        setModalRestaurar(true);
      } catch (err) {
        if (showToast) showToast("Arquivo inválido: " + err.message, "error");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Executa restauração segura de emergência
  const handleConfirmarRestauracao = async () => {
    if (!jsonRestauracao) return;
    setRestaurando(true);
    try {
      const res = await actionRestaurarTabelasBackup(jsonRestauracao);
      if (res.success) {
        if (showToast) showToast("Restauração de dados concluída com sucesso!");
        setModalRestaurar(false);
        setJsonRestauracao(null);
      } else {
        if (showToast) showToast("Erro durante a restauração.", "error");
      }
    } catch (err) {
      if (showToast) showToast(err.message || "Falha na restauração.", "error");
    } finally {
      setRestaurando(false);
    }
  };

  useEffect(() => {
    if (currentView === "usuarios") {
      carregarUsuarios();
    } else if (currentView === "auditoria") {
      carregarAuditoria();
    } else if (currentView === "backup") {
      carregarBackups();
    }
  }, [currentView, filtroDataInicio, filtroDataFim, filtroModulo]);

  // FILTRAGEM DE USUÁRIOS
  const usuariosFiltrados = useMemo(() => {
    if (!userSearch.trim()) return usuarios;
    const q = userSearch.toLowerCase().trim();
    return usuarios.filter(
      (u) =>
        (u.nome && u.nome.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.usuario && u.usuario.toLowerCase().includes(q))
    );
  }, [usuarios, userSearch]);

  // FILTRAGEM E PAGINAÇÃO DE AUDITORIA
  const auditoriasFiltradas = useMemo(() => {
    return auditorias.filter((item) => {
      if (filtroAcao && !item.acao?.toLowerCase().includes(filtroAcao.toLowerCase())) return false;
      if (filtroUsuario && !item.usuario?.toLowerCase().includes(filtroUsuario.toLowerCase())) return false;
      return true;
    });
  }, [auditorias, filtroAcao, filtroUsuario]);

  const totalPaginas = Math.ceil(auditoriasFiltradas.length / itensPorPagina) || 1;
  const auditoriasPaginadas = useMemo(() => {
    const start = (paginaAtual - 1) * itensPorPagina;
    return auditoriasFiltradas.slice(start, start + itensPorPagina);
  }, [auditoriasFiltradas, paginaAtual, itensPorPagina]);

  // Salvar Minhas Credenciais
  const handleSalvarMinhasCredenciais = async (e) => {
    e.preventDefault();
    if (!credForm.senhaAtual) {
      if (showToast) showToast("Digite sua senha atual para autorizar a alteração.", "error");
      return;
    }
    if (credForm.novaSenha && credForm.novaSenha.length < 8) {
      if (showToast) showToast("A nova senha deve ter no mínimo 8 caracteres.", "error");
      return;
    }
    if (credForm.novaSenha && credForm.novaSenha !== credForm.confirmaNovaSenha) {
      if (showToast) showToast("A confirmação da nova senha não confere.", "error");
      return;
    }

    setIsSavingCred(true);
    try {
      const res = await updateAdminCredentials({
        currentPassword: credForm.senhaAtual,
        newUsername: credForm.novoLogin || loggedAdmin?.usuario,
        newPassword: credForm.novaSenha || credForm.senhaAtual
      });

      if (res && res.success === false) {
        throw new Error(res.error || "Falha ao atualizar credenciais.");
      }

      if (showToast) showToast("Credenciais atualizadas com sucesso!");
      setCredForm((prev) => ({
        ...prev,
        senhaAtual: "",
        novaSenha: "",
        confirmaNovaSenha: ""
      }));
    } catch (err) {
      if (showToast) showToast(err.message || "Erro ao salvar credenciais.", "error");
    } finally {
      setIsSavingCred(false);
    }
  };

  // Salvar Usuário (Criar ou Editar)
  const handleSalvarUsuario = async () => {
    if (!formUser.email || !formUser.email.includes("@")) {
      if (showToast) showToast("Digite um endereço de e-mail válido.", "error");
      return;
    }
    if (!editingUser && (!formUser.senha || formUser.senha.length < 6)) {
      if (showToast) showToast("A senha de acesso deve ter pelo menos 6 caracteres.", "error");
      return;
    }

    setIsSavingUser(true);
    try {
      if (editingUser) {
        await actionAtualizarUsuarioEmpresa(editingUser.id, {
          nome: formUser.nome,
          email: formUser.email,
          permissoes: formUser.permissoes,
          senha: formUser.senha || undefined
        });
        if (showToast) showToast("Usuário e permissões atualizados com sucesso!");
      } else {
        await actionCriarUsuarioEmpresa({
          usuario: formUser.email,
          email: formUser.email,
          senha: formUser.senha,
          nome: formUser.nome,
          permissoes: formUser.permissoes
        });
        if (showToast) showToast("Novo usuário cadastrado com sucesso!");
      }
      setModalNovoUsuario(false);
      setEditingUser(null);
      setFormUser({
        email: "",
        nome: "",
        senha: "",
        permissoes: ["agenda", "horarios", "equipe", "politicas", "triagem", "personalizacao", "integracoes", "auditoria"]
      });
      await carregarUsuarios();
    } catch (err) {
      if (showToast) showToast(err.message || "Erro ao salvar usuário.", "error");
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleAbrirEdicao = (u) => {
    setEditingUser(u);
    setFormUser({
      email: u.email || u.usuario || "",
      nome: u.nome || "",
      senha: "",
      permissoes: Array.isArray(u.permissoes) ? [...u.permissoes] : PERMISSOES_DISPONIVEIS.map((p) => p.id)
    });
    setModalNovoUsuario(true);
  };

  const handleExcluirUsuario = async (u) => {
    if (!confirm(`Deseja realmente remover o acesso de ${u.nome || u.email || u.usuario}?`)) return;
    try {
      await actionDeletarUsuarioEmpresa(u.id);
      if (showToast) showToast("Usuário removido com sucesso!");
      await carregarUsuarios();
    } catch (e) {
      if (showToast) showToast(e.message || "Erro ao excluir usuário.", "error");
    }
  };

  // Toggle de permissão individual limpo, sem bugs visuais
  const togglePermissao = (permId) => {
    playDopamineSound("click");
    triggerHaptic("light");
    setFormUser((prev) => {
      const current = prev.permissoes || [];
      const exists = current.includes(permId);
      const updated = exists ? current.filter((id) => id !== permId) : [...current, permId];
      return { ...prev, permissoes: updated };
    });
  };

  return (
    <motion.div
      key="account-view"
      {...fadeUp}
      className="flex-1 flex flex-col h-full overflow-hidden w-full p-4 sm:p-5 lg:p-6 min-h-0 space-y-6 text-left"
    >
      {/* CABEÇALHO PADRONIZADO */}
      <ModuleHeader
        icon={
          currentView === "credenciais"
            ? KeyRound
            : currentView === "auditoria"
            ? History
            : currentView === "backup"
            ? Database
            : ShieldCheck
        }
        title={
          currentView === "credenciais"
            ? "Minhas Credenciais de Acesso"
            : currentView === "auditoria"
            ? "Auditoria do Sistema & Logs"
            : currentView === "backup"
            ? "Backups Completos & Segurança LGPD"
            : "Usuários & Permissões da Clínica"
        }
        description={
          currentView === "credenciais"
            ? "Atualize seu e-mail de login e altere sua senha de acesso ao painel administrativo."
            : currentView === "auditoria"
            ? "Histórico imutável de todas as ações, alterações de regras, configurações e aprovações executadas."
            : currentView === "backup"
            ? "Exporte backups completos do banco em 1 clique (JSON/SQL), audite a integridade e consulte o termo de sigilo médico."
            : "Gerencie contas de acesso com login por e-mail e configure permissões granulares por aba."
        }
      />

      {/* CONTEÚDO PRINCIPAL CONTROLADO PELA SIDEBAR */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-24 space-y-6 pr-1">
        {/* SUB-VIEW 1: MINHAS CREDENCIAIS */}
        {currentView === "credenciais" && (
          <div className="max-w-xl bg-white/80 dark:bg-[#0f0f13]/80 backdrop-blur-2xl border border-black/[0.06] dark:border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-black/[0.04] dark:border-white/[0.06]">
              <div className="w-12 h-12 rounded-2xl bg-[#9FC131]/15 text-[#86a621] dark:text-[#9FC131] flex items-center justify-center">
                <KeyRound size={24} strokeWidth={2.2} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-zinc-950 dark:text-white">
                  Alterar E-mail e Senha
                </h3>
                <span className="text-xs text-zinc-400">
                  Usuário conectado: <strong>{loggedAdmin?.email || loggedAdmin?.usuario}</strong>
                </span>
              </div>
            </div>

            <form onSubmit={handleSalvarMinhasCredenciais} className="space-y-4">
              <TextInput
                label="E-mail de Acesso (Login)"
                type="email"
                value={credForm.novoLogin}
                onChange={(e) => setCredForm({ ...credForm, novoLogin: e.target.value })}
                placeholder="seu.email@clinica.com.br"
              />

              <TextInput
                label="Senha Atual (Obrigatória)"
                type="password"
                value={credForm.senhaAtual}
                onChange={(e) => setCredForm({ ...credForm, senhaAtual: e.target.value })}
                placeholder="Digite sua senha atual"
              />

              <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-black/[0.04] dark:border-white/[0.06]">
                <TextInput
                  label="Nova Senha (Opcional)"
                  type="password"
                  value={credForm.novaSenha}
                  onChange={(e) => setCredForm({ ...credForm, novaSenha: e.target.value })}
                  placeholder="Mínimo 8 caracteres"
                />
                <TextInput
                  label="Confirmar Nova Senha"
                  type="password"
                  value={credForm.confirmaNovaSenha}
                  onChange={(e) => setCredForm({ ...credForm, confirmaNovaSenha: e.target.value })}
                  placeholder="Repita a nova senha"
                />
              </div>

              <div className="pt-3">
                <ButtonPrimary
                  disabled={isSavingCred}
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3 text-xs min-h-[44px] rounded-2xl cursor-pointer"
                >
                  <span>{isSavingCred ? "Salvando..." : "Salvar Novas Credenciais"}</span>
                </ButtonPrimary>
              </div>
            </form>
          </div>
        )}

        {/* SUB-VIEW 2: USUÁRIOS & PERMISSÕES */}
        {currentView === "usuarios" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Buscar usuário por nome ou e-mail..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl text-xs font-semibold text-zinc-900 dark:text-white outline-none focus:border-[#9FC131]"
                />
              </div>

              <ButtonPrimary
                onClick={() => {
                  setEditingUser(null);
                  setFormUser({
                    email: "",
                    nome: "",
                    senha: "",
                    permissoes: PERMISSOES_DISPONIVEIS.map((p) => p.id)
                  });
                  setModalNovoUsuario(true);
                }}
                icon={Plus}
                className="px-4 py-2.5 text-xs min-h-[42px] rounded-2xl cursor-pointer"
              >
                Cadastrar Usuário
              </ButtonPrimary>
            </div>

            {loadingUsuarios ? (
              <div className="p-12 text-center">
                <CapsuleSpinner size="lg" className="mx-auto text-zinc-400" />
                <p className="text-xs text-zinc-500 mt-2 font-medium">Carregando usuários da clínica...</p>
              </div>
            ) : usuariosFiltrados.length === 0 ? (
              <div className="p-12 text-center bg-white/60 dark:bg-zinc-900/40 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 space-y-2">
                <Users size={32} className="mx-auto text-zinc-400 opacity-50" />
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Nenhum usuário encontrado</h4>
                <p className="text-xs text-zinc-500">Cadastre atendentes, recepcionistas ou gestores para acesso.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {usuariosFiltrados.map((u) => {
                  const perms = Array.isArray(u.permissoes) ? u.permissoes : [];
                  const isOwnerUser = Boolean(u.is_owner);
                  const isCurrentUser = loggedAdmin?.id === u.id || loggedAdmin?.usuario === u.usuario || loggedAdmin?.email === u.email;

                  return (
                    <div
                      key={u.id}
                      className="p-5 rounded-3xl bg-white/80 dark:bg-[#0f0f13]/80 backdrop-blur-2xl border border-black/[0.06] dark:border-white/[0.08] shadow-sm flex flex-col justify-between space-y-4 hover:border-zinc-300 dark:hover:border-white/20 transition-all"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center font-black text-sm text-zinc-800 dark:text-zinc-200 border border-zinc-200/50 dark:border-white/5 shadow-xs">
                              {(u.nome || u.email || u.usuario || "U")[0]?.toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-extrabold text-sm text-zinc-950 dark:text-white truncate max-w-[180px]">
                                {u.nome || "Usuário sem nome"}
                              </h4>
                              <span className="text-[11px] text-zinc-500 flex items-center gap-1 font-mono">
                                <Mail size={11} className="text-zinc-400" />
                                {u.email || u.usuario}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            {isOwnerUser ? (
                              <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider">
                                Proprietário
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase tracking-wider">
                                Operador
                              </span>
                            )}
                            {isCurrentUser && (
                              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                                (Você)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* TAGS DE PERMISSÃO */}
                        <div className="pt-2 border-t border-black/[0.04] dark:border-white/[0.06]">
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 block mb-1.5">
                            Permissões Ativas ({perms.length})
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {perms.slice(0, 4).map((pId) => (
                              <span
                                key={pId}
                                className="px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold"
                              >
                                {PERMISSOES_DISPONIVEIS.find((p) => p.id === pId)?.label.split("&")[0] || pId}
                              </span>
                            ))}
                            {perms.length > 4 && (
                              <span className="px-1.5 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[10px] font-bold">
                                +{perms.length - 4}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* AÇÕES */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.06]">
                        <button
                          type="button"
                          onClick={() => handleAbrirEdicao(u)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                          Editar Permissões
                        </button>
                        {!isOwnerUser && (
                          <button
                            type="button"
                            onClick={() => handleExcluirUsuario(u)}
                            className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                            title="Excluir Usuário"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SUB-VIEW 3: AUDITORIA DO SISTEMA */}
        {currentView === "auditoria" && (
          <div className="space-y-4">
            <div className="p-5 rounded-3xl bg-white/80 dark:bg-[#0f0f13]/80 backdrop-blur-2xl border border-black/[0.06] dark:border-white/[0.08] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                  <Filter size={13} /> Filtros de Auditoria
                </span>
                <span className="text-[11px] text-zinc-500 font-medium">
                  {auditoriasFiltradas.length} eventos registrados
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Data Início
                  </label>
                  <input
                    type="date"
                    value={filtroDataInicio}
                    onChange={(e) => setFiltroDataInicio(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white outline-none focus:border-[#9FC131]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Data Fim
                  </label>
                  <input
                    type="date"
                    value={filtroDataFim}
                    onChange={(e) => setFiltroDataFim(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white outline-none focus:border-[#9FC131]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Módulo / Aba
                  </label>
                  <select
                    value={filtroModulo}
                    onChange={(e) => setFiltroModulo(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white outline-none focus:border-[#9FC131]"
                  >
                    <option value="todos">Todos os Módulos</option>
                    <option value="agenda">Agenda & Atendimentos</option>
                    <option value="horarios">Horários & Duração</option>
                    <option value="equipe">Corpo Clínico</option>
                    <option value="configuracoes">Configurações Gerais</option>
                    <option value="politicas">Políticas</option>
                    <option value="triagem">Triagem</option>
                    <option value="usuarios">Usuários & Acesso</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Itens por Página
                  </label>
                  <select
                    value={itensPorPagina}
                    onChange={(e) => {
                      setItensPorPagina(Number(e.target.value));
                      setPaginaAtual(1);
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white outline-none focus:border-[#9FC131]"
                  >
                    <option value={5}>5 linhas por página</option>
                    <option value={10}>10 linhas por página</option>
                    <option value={15}>15 linhas por página</option>
                    <option value={20}>20 linhas por página</option>
                    <option value={50}>50 linhas por página</option>
                  </select>
                </div>
              </div>
            </div>

            {loadingAuditoria ? (
              <div className="p-12 text-center bg-white/80 dark:bg-[#0f0f13]/80 rounded-3xl border border-black/[0.06] dark:border-white/[0.08]">
                <CapsuleSpinner size="lg" className="mx-auto text-zinc-400" />
                <p className="text-xs text-zinc-500 mt-2 font-medium">Buscando registros de auditoria...</p>
              </div>
            ) : auditoriasPaginadas.length === 0 ? (
              <div className="p-12 text-center bg-white/80 dark:bg-[#0f0f13]/80 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 space-y-2">
                <History size={32} className="mx-auto text-zinc-400 opacity-50" />
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Nenhum registro encontrado</h4>
                <p className="text-xs text-zinc-500">Nenhuma ação corresponde aos filtros aplicados.</p>
              </div>
            ) : (
              <div className="bg-white/80 dark:bg-[#0f0f13]/80 border border-black/[0.06] dark:border-white/[0.08] rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 font-black uppercase text-zinc-400 text-[10px] tracking-wider">
                        <th className="p-4">Data & Horário</th>
                        <th className="p-4">Usuário</th>
                        <th className="p-4">Módulo</th>
                        <th className="p-4">Operação</th>
                        <th className="p-4">Detalhes das Alterações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                      {auditoriasPaginadas.map((log) => (
                        <tr key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition-colors">
                          <td className="p-4 font-mono text-[11px] text-zinc-500 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString("pt-BR")}
                          </td>
                          <td className="p-4 font-extrabold text-zinc-950 dark:text-white whitespace-nowrap">
                            {log.usuario}
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <span className="px-2.5 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[10px] font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                              {log.modulo}
                            </span>
                          </td>
                          <td className="p-4 font-bold text-zinc-900 dark:text-zinc-200 whitespace-nowrap">
                            {log.acao}
                          </td>
                          <td className="p-4 text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed max-w-md">
                            {log.detalhes}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between p-4 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                  <span className="text-zinc-500 font-medium">
                    Página <strong className="text-zinc-900 dark:text-white">{paginaAtual}</strong> de{" "}
                    <strong className="text-zinc-900 dark:text-white">{totalPaginas}</strong> ({auditoriasFiltradas.length} total)
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={paginaAtual <= 1}
                      onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                      className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 disabled:opacity-30 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      disabled={paginaAtual >= totalPaginas}
                      onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                      className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 disabled:opacity-30 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SUB-VIEW 4: BACKUPS COMPLETOS & SEGURANÇA MÁXIMA LGPD */}
        {currentView === "backup" && (
          <div className="space-y-6">
            {/* CARDS DE INDICADORES DE CONFORMIDADE E BLINDAGEM */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-white/80 dark:bg-[#151518]/80 backdrop-blur-xl border border-emerald-500/20 rounded-3xl shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck size={24} strokeWidth={2.2} />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 block">Blindagem do Banco</span>
                  <strong className="text-base font-black text-zinc-950 dark:text-white">RLS Multi-Tenant</strong>
                  <span className="block text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">Isolamento Ativo</span>
                </div>
              </div>

              <div className="p-5 bg-white/80 dark:bg-[#151518]/80 backdrop-blur-xl border border-blue-500/20 rounded-3xl shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Database size={24} strokeWidth={2.2} />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 block">Tabelas Escaneadas</span>
                  <strong className="text-base font-black text-zinc-950 dark:text-white">13 Tabelas</strong>
                  <span className="block text-[11px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">Cobertura Integral</span>
                </div>
              </div>

              <div className="p-5 bg-white/80 dark:bg-[#151518]/80 backdrop-blur-xl border border-purple-500/20 rounded-3xl shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Lock size={24} strokeWidth={2.2} />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 block">Criptografia & Checksum</span>
                  <strong className="text-base font-black text-zinc-950 dark:text-white">SHA-256 / AES</strong>
                  <span className="block text-[11px] text-purple-600 dark:text-purple-400 font-semibold mt-0.5">Integridade Inviolável</span>
                </div>
              </div>

              <div className="p-5 bg-white/80 dark:bg-[#151518]/80 backdrop-blur-xl border border-amber-500/20 rounded-3xl shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <FileCheck size={24} strokeWidth={2.2} />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 block">Norma de Saúde</span>
                  <strong className="text-base font-black text-zinc-950 dark:text-white">LGPD & CFM 1.821</strong>
                  <button
                    type="button"
                    onClick={() => setModalTermoSigilo(true)}
                    className="text-[11px] text-amber-700 dark:text-amber-400 font-bold underline hover:opacity-80 transition-colors text-left block mt-0.5 cursor-pointer"
                  >
                    Ver Termo de Sigilo →
                  </button>
                </div>
              </div>
            </div>

            {/* CARD 1: BACKUP COMPLETO DO SISTEMA (ONE-CLICK) */}
            <div className="bg-white/80 dark:bg-[#0f0f13]/80 backdrop-blur-2xl border border-black/[0.06] dark:border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-black/[0.04] dark:border-white/[0.06]">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                    <CheckCircle2 size={13} />
                    <span>Backup Universal Seguro (Zero Risco de Perda)</span>
                  </div>
                  <h3 className="text-xl font-black text-zinc-950 dark:text-white">
                    Backup Completo da Clínica em 1 Clique
                  </h3>
                  <p className="text-xs text-zinc-500 max-w-2xl leading-relaxed">
                    Extrai um snapshot integral e estruturado de todas as tabelas: pacientes, agendamentos, <strong>fila de mensagens</strong> (preservada contra qualquer perda), regras de agenda, configurações da empresa, convênios e histórico de auditoria.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                  <a
                    href="/api/admin/backup"
                    download
                    className="px-4 py-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer border border-zinc-200/80 dark:border-zinc-700"
                    title="Baixar diretamente via API HTTP do backend"
                  >
                    <Download size={15} />
                    <span>Download Direto API</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleGerarBackup}
                    disabled={gerandoBackup}
                    className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                  >
                    {gerandoBackup ? (
                      <Activity size={16} className="animate-spin" />
                    ) : (
                      <Download size={16} />
                    )}
                    <span>{gerandoBackup ? "Escaneando & Gerando..." : "Baixar Backup Completo Agora (.JSON)"}</span>
                  </button>
                </div>
              </div>

              {/* GRADE DE TABELAS COBERTAS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    Tabelas Cobertas e Protegidas no Snapshot
                  </span>
                  {ultimoBackup && (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Último snapshot: {ultimoBackup.totalRegistros} registros • {new Date(ultimoBackup.dataGeracao).toLocaleTimeString()}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 text-xs">
                  <div className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 block uppercase">Pacientes</span>
                    <strong className="text-sm font-black text-zinc-900 dark:text-white">Cadastros</strong>
                    <span className="block text-[10px] text-zinc-500">CPFs e Prontuários</span>
                  </div>

                  <div className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 block uppercase">Agendamentos</span>
                    <strong className="text-sm font-black text-zinc-900 dark:text-white">Consultas</strong>
                    <span className="block text-[10px] text-zinc-500">Histórico & Status</span>
                  </div>

                  <div className="p-3 bg-emerald-500/10 dark:bg-emerald-500/[0.08] rounded-2xl border border-emerald-500/30 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 block uppercase flex items-center gap-1">
                      <CheckCircle2 size={10} /> Fila Mensagens
                    </span>
                    <strong className="text-sm font-black text-emerald-950 dark:text-emerald-200">WhatsApp</strong>
                    <span className="block text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">100% Protegida</span>
                  </div>

                  <div className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 block uppercase">Bloqueios</span>
                    <strong className="text-sm font-black text-zinc-900 dark:text-white">Grade ERP</strong>
                    <span className="block text-[10px] text-zinc-500">Slots MedicalSYS</span>
                  </div>

                  <div className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 block uppercase">Regras Disparo</span>
                    <strong className="text-sm font-black text-zinc-900 dark:text-white">Automações</strong>
                    <span className="block text-[10px] text-zinc-500">Gatilhos de Envio</span>
                  </div>

                  <div className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 block uppercase">Regras Agenda</span>
                    <strong className="text-sm font-black text-zinc-900 dark:text-white">Turnos</strong>
                    <span className="block text-[10px] text-zinc-500">Slots e Intervalos</span>
                  </div>

                  <div className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 block uppercase">Corpo Clínico</span>
                    <strong className="text-sm font-black text-zinc-900 dark:text-white">Especialistas</strong>
                    <span className="block text-[10px] text-zinc-500">Médicos e URIs</span>
                  </div>

                  <div className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 block uppercase">Convênios</span>
                    <strong className="text-sm font-black text-zinc-900 dark:text-white">Planos</strong>
                    <span className="block text-[10px] text-zinc-500">Mapeamento ERP</span>
                  </div>

                  <div className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 block uppercase">Triagem</span>
                    <strong className="text-sm font-black text-zinc-900 dark:text-white">Formulários</strong>
                    <span className="block text-[10px] text-zinc-500">Perguntas & Opções</span>
                  </div>

                  <div className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 block uppercase">Empresas</span>
                    <strong className="text-sm font-black text-zinc-900 dark:text-white">Configurações</strong>
                    <span className="block text-[10px] text-zinc-500">Chaves e Parâmetros</span>
                  </div>

                  <div className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 block uppercase">Auditoria</span>
                    <strong className="text-sm font-black text-zinc-900 dark:text-white">Logs LGPD</strong>
                    <span className="block text-[10px] text-zinc-500">Trilha de Acessos</span>
                  </div>

                  <div className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 block uppercase">Usuários</span>
                    <strong className="text-sm font-black text-zinc-900 dark:text-white">Acessos</strong>
                    <span className="block text-[10px] text-zinc-500">Permissões da Clínica</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: RESTAURAÇÃO DE EMERGÊNCIA & BACKUPS SALVOS EM DISCO */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* RESTAURAÇÃO SEGURA */}
              <div className="bg-white/80 dark:bg-[#0f0f13]/80 backdrop-blur-2xl border border-black/[0.06] dark:border-white/[0.08] rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Upload size={20} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-zinc-950 dark:text-white">
                      Restauração Segura de Emergência
                    </h4>
                    <p className="text-xs text-zinc-400">
                      Restaure tabelas e registros a partir de um arquivo .JSON sem risco de quebra de chaves.
                    </p>
                  </div>
                </div>

                <div className="p-5 bg-zinc-50/70 dark:bg-zinc-900/40 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 text-center space-y-3">
                  <HardDrive size={32} className="mx-auto text-zinc-400" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      Selecione o arquivo de backup (.JSON)
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      O sistema analisa as tabelas e aplica upsert inteligente sem apagar dados pré-existentes.
                    </p>
                  </div>

                  <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-xs">
                    <Upload size={14} />
                    <span>Selecionar Arquivo de Backup</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleArquivoSelecionado}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* BACKUPS SALVOS LOCALMENTE */}
              <div className="bg-white/80 dark:bg-[#0f0f13]/80 backdrop-blur-2xl border border-black/[0.06] dark:border-white/[0.08] rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <HardDrive size={20} strokeWidth={2.2} />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-zinc-950 dark:text-white">
                        Snapshots Salvos em Disco Local
                      </h4>
                      <p className="text-xs text-zinc-400">
                        Histórico automático gravado no diretório da aplicação (/backups).
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={carregarBackups}
                    className="p-2 rounded-xl text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="Recarregar lista"
                  >
                    <RefreshCw size={15} className={loadingBackups ? "animate-spin" : ""} />
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                  {loadingBackups ? (
                    <div className="p-6 text-center text-xs text-zinc-400">Verificando snapshots...</div>
                  ) : backupsLocais.length === 0 ? (
                    <div className="p-6 text-center bg-zinc-50/60 dark:bg-zinc-900/30 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 text-xs text-zinc-400">
                      Nenhum arquivo local encontrado. Clique em "Baixar Backup Completo Agora" para gerar o primeiro.
                    </div>
                  ) : (
                    backupsLocais.map((b, i) => (
                      <div
                        key={i}
                        className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 rounded-xl border border-zinc-200/70 dark:border-zinc-800 flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-bold text-zinc-900 dark:text-white block truncate">
                            {b.nome}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            {b.tamanhoKb} • {new Date(b.criadoEm).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
                          Salvo em Disco
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* CARD 3: AUDITORIA, SIGILO MÉDICO E RESPOSTA TÉCNICA À DÚVIDA DA CLIENTE */}
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-zinc-800 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    <Shield size={12} />
                    <span>Sigilo Médico & Auditoria Inalterável</span>
                  </div>
                  <h3 className="text-xl font-black">
                    Certificado de Sigilo, Supabase Dashboard e Conformidade LGPD
                  </h3>
                  <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
                    Entenda como sistemas concorrentes operam o sigilo médico e como a arquitetura DRM Care garante proteção jurídica e tecnológica de padrão hospitalar.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setModalTermoSigilo(true)}
                  className="px-5 py-3 bg-white text-zinc-950 font-black text-xs rounded-xl shadow-lg hover:bg-zinc-100 transition-all flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <FileText size={15} />
                  <span>Emitir Certificado de Sigilo</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                  <strong className="text-sm font-bold text-amber-300 block flex items-center gap-1.5">
                    <Database size={15} /> Por que o Supabase mostra dados?
                  </strong>
                  <p className="text-zinc-300 text-[11px] leading-relaxed">
                    O Supabase Dashboard é o console do <strong>Administrador de Banco (DBA)</strong>. Em qualquer SaaS (incluindo grandes ERPs), o banco hospeda dados, mas a proteção real vem de <strong>Row Level Security (RLS)</strong>, criptografia em repouso e trilha inalterável de auditoria onde cada consulta fica gravada com IP e usuário.
                  </p>
                </div>

                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                  <strong className="text-sm font-bold text-emerald-300 block flex items-center gap-1.5">
                    <ShieldCheck size={15} /> O "Certificado de Sigilo" Concorrente
                  </strong>
                  <p className="text-zinc-300 text-[11px] leading-relaxed">
                    Sistemas concorrentes fornecem um <strong>Acordo de Processamento de Dados (DPA)</strong> e Termo de Sigilo Médico fundamentado no Art. 11 da LGPD e Res. CFM 1.821/2007, atestando que a desenvolvedora é apenas <em>Operadora</em> e não pode acessar dados clínicos sem ordem judicial.
                  </p>
                </div>

                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                  <strong className="text-sm font-bold text-blue-300 block flex items-center gap-1.5">
                    <Lock size={15} /> Blindagem de Acesso Não Autorizado
                  </strong>
                  <p className="text-zinc-300 text-[11px] leading-relaxed">
                    Com o RLS e a migração de segurança máxima DRM Care, requisições anônimas não conseguem listar pacientes ou ler a fila de mensagens. Dados médicos sensíveis (enfermidades e observações) possuem suporte a encriptação AES-256 via <code>pgcrypto</code>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE USUÁRIO COM SELEÇÃO MODERNA E LIMPA DE PERMISSÕES */}
      <AnimatePresence>
        {modalNovoUsuario && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
            onClick={() => setModalNovoUsuario(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#111116] border border-zinc-200/90 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 text-left"
            >
              <div className="flex items-center justify-between border-b border-black/[0.04] dark:border-white/[0.06] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <User size={20} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-zinc-950 dark:text-white">
                      {editingUser ? "Editar Conta de Usuário" : "Novo Usuário da Clínica"}
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Defina e-mail de acesso, credenciais e permissões
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalNovoUsuario(false)}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3.5">
                <TextInput
                  label="Endereço de E-mail (Login Oficial)"
                  type="email"
                  placeholder="ex: atendente@suaclinica.com.br"
                  value={formUser.email}
                  onChange={(e) => setFormUser({ ...formUser, email: e.target.value })}
                />

                <TextInput
                  label="Nome Completo"
                  placeholder="ex: Maria Silva"
                  value={formUser.nome}
                  onChange={(e) => setFormUser({ ...formUser, nome: e.target.value })}
                />

                <TextInput
                  label={editingUser ? "Nova Senha (deixe em branco para manter a atual)" : "Senha de Acesso (6+ caracteres)"}
                  type="password"
                  placeholder="••••••••"
                  value={formUser.senha}
                  onChange={(e) => setFormUser({ ...formUser, senha: e.target.value })}
                />

                {/* SELETOR DE PERMISSÕES - DESIGN MODERNO SEM FUNDO PRETO */}
                <div className="pt-2 border-t border-black/[0.04] dark:border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      Permissões de Acesso às Abas
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const all = PERMISSOES_DISPONIVEIS.map((p) => p.id);
                        const isAll = formUser.permissoes.length === all.length;
                        setFormUser({ ...formUser, permissoes: isAll ? [] : all });
                      }}
                      className="text-[10px] font-bold text-[#86a621] dark:text-[#9FC131] hover:underline cursor-pointer"
                    >
                      {formUser.permissoes.length === PERMISSOES_DISPONIVEIS.length ? "Desmarcar Todas" : "Marcar Todas"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto custom-scrollbar pr-1">
                    {PERMISSOES_DISPONIVEIS.map((perm) => {
                      const isChecked = (formUser.permissoes || []).includes(perm.id);
                      return (
                        <button
                          key={perm.id}
                          type="button"
                          onClick={() => togglePermissao(perm.id)}
                          className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                            isChecked
                              ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-200 shadow-xs ring-1 ring-emerald-500/20"
                              : "bg-zinc-50/70 dark:bg-zinc-900/50 border-zinc-200/80 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                              isChecked
                                ? "bg-emerald-600 text-white"
                                : "border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                            }`}
                          >
                            {isChecked && <Check size={11} strokeWidth={3} />}
                          </div>
                          <div className="min-w-0">
                            <span className="block text-xs font-bold leading-tight truncate">{perm.label}</span>
                            <span className="block text-[10px] opacity-75 leading-tight mt-0.5 line-clamp-2">{perm.desc}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-black/[0.04] dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setModalNovoUsuario(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSavingUser}
                  onClick={handleSalvarUsuario}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <span>{isSavingUser ? "Salvando..." : editingUser ? "Salvar Alterações" : "Criar Usuário"}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* MODAL DE RESTAURAÇÃO DE EMERGÊNCIA */}
        {modalRestaurar && jsonRestauracao && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
            onClick={() => !restaurando && setModalRestaurar(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#111116] border border-amber-500/30 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 text-left"
            >
              <div className="flex items-center justify-between border-b border-black/[0.04] dark:border-white/[0.06] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Upload size={20} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-zinc-950 dark:text-white">
                      Confirmar Restauração Segura
                    </h3>
                    <span className="text-xs text-zinc-400">
                      DRM Care • Upsert não-destrutivo
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !restaurando && setModalRestaurar(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-900 dark:text-amber-200 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertCircle size={14} /> Aviso de Integridade
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    A restauração utiliza <strong>upsert inteligente</strong>: nenhum registro pré-existente fora do arquivo será apagado e nenhuma tabela será recriada.
                  </p>
                </div>

                <div className="space-y-1.5 bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Clínica no Arquivo:</span>
                    <strong className="text-zinc-900 dark:text-white">
                      {jsonRestauracao.metadata?.empresa_nome || "Identificada"}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Data do Snapshot:</span>
                    <span className="font-mono text-zinc-700 dark:text-zinc-300">
                      {jsonRestauracao.metadata?.data_geracao
                        ? new Date(jsonRestauracao.metadata.data_geracao).toLocaleString("pt-BR")
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Total de Registros:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      {jsonRestauracao.metadata?.total_registros || "Múltiplos"} itens
                    </strong>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-zinc-400">
                    Tabelas Detectadas no Arquivo:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {Object.keys(jsonRestauracao.tabelas || {}).map((tab) => (
                      <span
                        key={tab}
                        className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 font-mono text-[10px] text-zinc-700 dark:text-zinc-300"
                      >
                        {tab} ({jsonRestauracao.tabelas[tab]?.length || 0})
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-black/[0.04] dark:border-white/[0.06]">
                <button
                  type="button"
                  disabled={restaurando}
                  onClick={() => setModalRestaurar(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={restaurando}
                  onClick={handleConfirmarRestauracao}
                  className="flex-1 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-600/20 transition-all cursor-pointer"
                >
                  {restaurando ? (
                    <Activity size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  <span>{restaurando ? "Restaurando Dados..." : "Confirmar e Restaurar"}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* MODAL DO TERMO DE SIGILO & CERTIFICADO DE CONFIDENCIALIDADE MÉDICA */}
        {modalTermoSigilo && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
            onClick={() => setModalTermoSigilo(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#111116] border border-black/10 dark:border-white/10 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-5 text-left max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <ShieldCheck size={26} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-zinc-950 dark:text-white">
                      Certificado de Sigilo & Confidencialidade Médica
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Conformidade com a LGPD (Lei nº 13.709/2018) e Resolução CFM nº 1.821/2007
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalTermoSigilo(false)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans">
                <div className="p-4 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-2xl border border-emerald-500/20 space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 block">
                    Declaração de Operador Tecnológico e Sigilo Inviolável
                  </span>
                  <p className="text-xs font-semibold text-zinc-900 dark:text-white">
                    A plataforma DRM Care certifica que toda a custódia, transmissão e guarda de dados pessoais de pacientes e registros médicos segue os mais estritos parâmetros de sigilo e não-intervenção.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-extrabold text-zinc-900 dark:text-white text-sm">
                    1. Distinção de Papéis perante a LGPD (Art. 5º, VI e VII)
                  </h4>
                  <p>
                    A <strong>Clínica Contratante</strong> figura como <em>Controladora</em> exclusiva dos dados pessoais e dados pessoais sensíveis de saúde de seus pacientes. A <strong>DRM Care</strong> atua unicamente como <em>Operadora Tecnológica</em>, executando o tratamento de dados estritamente em nome e sob as instruções da Controladora.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-extrabold text-zinc-900 dark:text-white text-sm">
                    2. Garantia de Sigilo Profissional e Não-Acesso (CFM e Código Penal)
                  </h4>
                  <p>
                    Em consonância com o <strong>Art. 154 do Código Penal Brasileiro</strong> (Violação do Segredo Profissional) e com a <strong>Resolução CFM nº 1.821/2007</strong>, os operadores e administradores de infraestrutura da DRM Care estão sob obrigação irrevogável de confidencialidade médica. É terminantemente vedada a comercialização, compartilhamento, cessão, leitura não-autorizada ou extração de prontuários, nomes, CPFs ou diagnósticos clínicos de pacientes para qualquer fim alheio à operação técnica do software.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-extrabold text-zinc-900 dark:text-white text-sm">
                    3. Medidas Técnicas de Segurança (Art. 46 da LGPD)
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-zinc-600 dark:text-zinc-400">
                    <li><strong>Isolamento Multi-Tenant por RLS (Row Level Security):</strong> Cada clínica tem seus dados particionados logicamente por <code>empresa_id</code>, impedindo acesso cruzado.</li>
                    <li><strong>Criptografia em Trânsito:</strong> Todas as comunicações utilizam protocolos criptográficos TLS 1.3 / HTTPS com certificados de alta segurança.</li>
                    <li><strong>Trilha Inalterável de Auditoria:</strong> Toda e qualquer visualização ou edição gera registro contendo usuário, data, hora e IP de origem.</li>
                    <li><strong>Backups Estruturados:</strong> Mecanismo de exportação completa em 1 clique para garantia da disponibilidade e continuidade de negócio (Art. 46, § 1º).</li>
                  </ul>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-black/[0.06] dark:border-white/[0.08] shrink-0">
                <span className="text-[11px] text-zinc-400">
                  Emitido para apresentação a clientes e auditorias regulatórias.
                </span>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      const texto = `CERTIFICADO DE SIGILO E CONFIDENCIALIDADE MÉDICA - DRM CARE\nEm conformidade com a LGPD (Lei 13.709/2018) e Resolução CFM 1.821/2007.\nA DRM Care atua unicamente como Operadora Tecnológica, garantindo isolamento lógico de banco (RLS), criptografia em trânsito e repouso, e trilha inalterável de auditoria.`;
                      navigator.clipboard.writeText(texto);
                      setTermoCopiado(true);
                      setTimeout(() => setTermoCopiado(false), 2500);
                      if (showToast) showToast("Termo de sigilo copiado para a área de transferência!");
                    }}
                    className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {termoCopiado ? <Check size={14} className="text-emerald-500" /> : <FileText size={14} />}
                    <span>{termoCopiado ? "Copiado!" : "Copiar Texto"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalTermoSigilo(false)}
                    className="flex-1 sm:flex-initial py-2.5 px-5 bg-zinc-950 dark:bg-white text-white dark:text-black font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
