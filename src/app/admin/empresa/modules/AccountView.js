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
  X
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
  { id: "auditoria", label: "Auditoria do Sistema", desc: "Consulta a logs e histórico de operações" }
];

export default function AccountView({ subTab = "usuarios", setSubTab, showToast, loggedAdmin, isOwner }) {
  // A aba ativa é controlada exclusivamente pela Sidebar (usuarios | auditoria)
  const isAuditoria = subTab === "auditoria";

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

  // MODAL MINHAS CREDENCIAIS (INCORPORADO DIRETAMENTE EM USUÁRIOS)
  const [modalCredenciais, setModalCredenciais] = useState(false);
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

  useEffect(() => {
    if (isAuditoria) {
      carregarAuditoria();
    } else {
      carregarUsuarios();
    }
  }, [isAuditoria, filtroDataInicio, filtroDataFim, filtroModulo]);

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
      setModalCredenciais(false);
      setCredForm((prev) => ({
        ...prev,
        senhaAtual: "",
        novaSenha: "",
        confirmaNovaSenha: ""
      }));
      await carregarUsuarios();
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

  // Toggle de permissão individual
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
      className="flex-1 flex flex-col h-full overflow-hidden w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6 text-left"
    >
      {/* CABEÇALHO PADRONIZADO APPLE DESIGN */}
      <ModuleHeader
        icon={isAuditoria ? History : ShieldCheck}
        title={isAuditoria ? "Auditoria do Sistema & Logs" : "Usuários & Permissões da Clínica"}
        description={
          isAuditoria
            ? "Histórico imutável de todas as ações, alterações de regras e aprovações executadas."
            : "Gerencie contas de acesso com e-mail, permissões por aba e altere suas credenciais."
        }
        rightElement={
          !isAuditoria && (
            <button
              type="button"
              onClick={() => {
                setCredForm({
                  novoLogin: loggedAdmin?.email || loggedAdmin?.usuario || "",
                  senhaAtual: "",
                  novaSenha: "",
                  confirmaNovaSenha: ""
                });
                setModalCredenciais(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white text-xs font-extrabold flex items-center gap-2 border border-zinc-200/80 dark:border-white/10 transition-all cursor-pointer"
            >
              <KeyRound size={15} className="text-[#86a621] dark:text-[#9FC131]" />
              <span>Minhas Credenciais</span>
            </button>
          )
        }
      />

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-24 space-y-6 pr-1">
        {!isAuditoria ? (
          <div className="space-y-6">
            {/* BARRA SUPERIOR DE USUÁRIOS */}
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

            {/* LISTA DE USUÁRIOS */}
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
                      className="p-5 rounded-3xl bg-white/80 dark:bg-[#0f0f13]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 shadow-sm flex flex-col justify-between space-y-4 hover:border-zinc-300 dark:hover:border-white/20 transition-all"
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
                        <div className="pt-2 border-t border-zinc-100 dark:border-white/5">
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
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-white/5">
                        {isCurrentUser ? (
                          <button
                            type="button"
                            onClick={() => {
                              setCredForm({
                                novoLogin: u.email || u.usuario || "",
                                senhaAtual: "",
                                novaSenha: "",
                                confirmaNovaSenha: ""
                              });
                              setModalCredenciais(true);
                            }}
                            className="text-xs font-bold text-[#86a621] dark:text-[#9FC131] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <KeyRound size={13} />
                            <span>Alterar Minhas Credenciais</span>
                          </button>
                        ) : <div />}

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleAbrirEdicao(u)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                          >
                            Editar
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* PAINEL DE AUDITORIA */
          <div className="space-y-4">
            <div className="p-5 rounded-3xl bg-white/80 dark:bg-[#0f0f13]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 shadow-sm space-y-4">
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
              <div className="p-12 text-center bg-white/80 dark:bg-[#0f0f13]/80 rounded-3xl border border-zinc-200/80 dark:border-white/10">
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
              <div className="bg-white/80 dark:bg-[#0f0f13]/80 border border-zinc-200/80 dark:border-white/10 rounded-3xl overflow-hidden shadow-sm">
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
      </div>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE USUÁRIO */}
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
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/5 pb-4">
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

                {/* SELETOR DE PERMISSÕES LIMPO E MODERNO */}
                <div className="pt-2 border-t border-zinc-100 dark:border-white/5 space-y-2">
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

              <div className="flex gap-2 pt-3 border-t border-zinc-100 dark:border-white/5">
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
      </AnimatePresence>

      {/* MODAL: MINHAS CREDENCIAIS */}
      <AnimatePresence>
        {modalCredenciais && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
            onClick={() => setModalCredenciais(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#111116] border border-zinc-200/90 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 text-left"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#9FC131]/15 text-[#86a621] dark:text-[#9FC131] flex items-center justify-center">
                    <KeyRound size={20} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-zinc-950 dark:text-white">
                      Minhas Credenciais
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Atualize seu e-mail e redefina sua senha
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalCredenciais(false)}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSalvarMinhasCredenciais} className="space-y-3.5">
                <TextInput
                  label="Endereço de E-mail (Login)"
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-100 dark:border-white/5">
                  <TextInput
                    label="Nova Senha"
                    type="password"
                    value={credForm.novaSenha}
                    onChange={(e) => setCredForm({ ...credForm, novaSenha: e.target.value })}
                    placeholder="Mínimo 8 dígitos"
                  />
                  <TextInput
                    label="Confirmar Senha"
                    type="password"
                    value={credForm.confirmaNovaSenha}
                    onChange={(e) => setCredForm({ ...credForm, confirmaNovaSenha: e.target.value })}
                    placeholder="Repita a nova senha"
                  />
                </div>

                <div className="flex gap-2 pt-3 border-t border-zinc-100 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => setModalCredenciais(false)}
                    className="flex-1 py-3 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingCred}
                    className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    <span>{isSavingCred ? "Salvando..." : "Salvar Senha"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
