"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Building2,
  Key,
  Server,
  Plus,
  Search,
  ExternalLink,
  Save,
  Trash2,
  Activity,
  CheckCircle2,
  AlertCircle,
  Zap,
  Globe,
  Settings2,
  Copy,
  Lock,
  MessageSquare,
  CreditCard,
  Layers,
  ChevronRight,
  Sparkles,
  Database,
  Link as LinkIcon,
  X,
  Play
} from "lucide-react";
import AdminSessionBar from "@/components/AdminSessionBar";
import { getSessionAdminInfo } from "@/actions/auth";
import {
  actionListarEmpresasMaster,
  actionCriarEmpresaMaster,
  actionAtualizarChavesEmpresaMaster,
  actionExcluirEmpresaMaster,
  actionTestarPushRmChat
} from "@/actions/adminData";
import { playDopamineSound, triggerHaptic, triggerConfetti } from "@/lib/dopamine";

const spring = { type: "spring", stiffness: 400, damping: 28 };

export default function SuperAdminSistemaPage() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loggedUser, setLoggedUser] = useState(null);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("clinicas"); // "clinicas" | "nova_instancia"

  // Modal de Configuração de APIs & Chaves de Integração
  const [editingEmpresa, setEditingEmpresa] = useState(null);
  const [modalSubTab, setModalSubTab] = useState("rmchat"); // "rmchat" | "mercadopago" | "medicalsys" | "geral"
  const [formKeys, setFormKeys] = useState({
    rmchat_webhook_url: "",
    mp_access_token: "",
    mp_public_key: "",
    medicalsys_url: "",
    medicalsys_usuario: "",
    medicalsys_senha: "",
    medicalsys_cod_empresa: "",
    medicalsys_sync_interval: 15
  });

  // Formulário de Nova Clínica / Tenant
  const [novaEmpresa, setNovaEmpresa] = useState({
    nome: "",
    slug: "",
    subdominio: "",
    email: "",
    telefone: "",
    admin_usuario: "",
    admin_senha: ""
  });

  const [savingKeys, setSavingKeys] = useState(false);
  const [creatingTenant, setCreatingTenant] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [testPushLoading, setTestPushLoading] = useState(false);
  const [testPushResult, setTestPushResult] = useState(null);

  const showToast = (message, type = "success") => {
    setToastMsg({ message, type });
    if (type === "success") {
      playDopamineSound("success");
      triggerHaptic("success");
    } else {
      playDopamineSound("error");
      triggerHaptic("error");
    }
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchEmpresas = async () => {
    setLoading(true);
    try {
      const data = await actionListarEmpresasMaster();
      setEmpresas(data || []);
    } catch (e) {
      showToast(`Erro ao carregar instâncias: ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        const info = await getSessionAdminInfo();
        if (!info) {
          window.location.replace("/login");
          return;
        }
        if (info.role === "sistema") {
          setLoggedUser(info);
          fetchEmpresas();
        } else {
          // Se for operador de clínica, redireciona para a visão da empresa
          window.location.replace("/admin/empresa");
        }
      } catch (e) {
        console.error("Erro ao validar sessão master:", e);
        window.location.replace("/login");
      } finally {
        setCheckingAuth(false);
      }
    };
    checkSession();
  }, []);

  const handleAbrirModalChaves = (emp) => {
    playDopamineSound("click");
    triggerHaptic("light");
    setEditingEmpresa(emp);
    setTestPushResult(null);
    setModalSubTab("rmchat");
    setFormKeys({
      rmchat_webhook_url: emp.config_chaves?.rmchat_webhook_url || emp.rmchat_webhook_url || "",
      mp_access_token: emp.config_chaves?.mp_access_token || emp.mp_access_token || "",
      mp_public_key: emp.config_chaves?.mp_public_key || emp.mp_public_key || "",
      medicalsys_url: emp.config_chaves?.medicalsys_url || emp.medicalsys_url || "",
      medicalsys_usuario: emp.config_chaves?.medicalsys_usuario || emp.medicalsys_usuario || "",
      medicalsys_senha: emp.config_chaves?.medicalsys_senha || emp.medicalsys_senha || "",
      medicalsys_cod_empresa: emp.config_chaves?.medicalsys_cod_empresa || emp.medicalsys_cod_empresa || "",
      medicalsys_sync_interval: emp.config_chaves?.medicalsys_sync_interval || 15
    });
  };

  const handleSalvarChaves = async () => {
    if (!editingEmpresa) return;
    setSavingKeys(true);
    playDopamineSound("click");
    try {
      await actionAtualizarChavesEmpresaMaster(editingEmpresa.id, formKeys);
      showToast("Chaves e integrações de API atualizadas com sucesso!");
      fetchEmpresas();
      setEditingEmpresa(null);
    } catch (e) {
      showToast(`Erro ao salvar chaves: ${e.message}`, "error");
    } finally {
      setSavingKeys(false);
    }
  };

  const handleCriarInstancia = async (e) => {
    e.preventDefault();
    if (!novaEmpresa.nome || !novaEmpresa.slug || !novaEmpresa.admin_usuario || !novaEmpresa.admin_senha) {
      showToast("Preencha todos os campos obrigatórios (*).", "error");
      return;
    }

    setCreatingTenant(true);
    playDopamineSound("click");
    triggerHaptic("medium");

    try {
      const res = await actionCriarEmpresaMaster(novaEmpresa);
      if (res?.success) {
        showToast(`Clínica "${novaEmpresa.nome}" provisionada com sucesso!`);
        triggerConfetti({ count: 100 });
        setNovaEmpresa({
          nome: "",
          slug: "",
          subdominio: "",
          email: "",
          telefone: "",
          admin_usuario: "",
          admin_senha: ""
        });
        setActiveTab("clinicas");
        fetchEmpresas();
      } else {
        showToast(res?.error || "Erro ao criar clínica.", "error");
      }
    } catch (err) {
      showToast(`Erro: ${err.message}`, "error");
    } finally {
      setCreatingTenant(false);
    }
  };

  const handleTestarPushRmChat = async () => {
    if (!formKeys.rmchat_webhook_url?.trim()) {
      showToast("Informe uma URL de Webhook válida do RM Chat primeiro.", "error");
      return;
    }
    setTestPushLoading(true);
    setTestPushResult(null);
    playDopamineSound("click");
    try {
      const res = await actionTestarPushRmChat(formKeys.rmchat_webhook_url.trim());
      if (res?.success) {
        setTestPushResult({
          success: true,
          message: `Webhook disparado com sucesso! Resposta: ${res.status}`,
          details: res.details
        });
        showToast("Webhook testado e validado com sucesso!");
      } else {
        setTestPushResult({
          success: false,
          message: res?.error || "Falha ao enviar webhook de teste."
        });
        showToast("Erro ao testar webhook.", "error");
      }
    } catch (e) {
      setTestPushResult({
        success: false,
        message: `Falha: ${e.message}`
      });
      showToast(`Erro no teste: ${e.message}`, "error");
    } finally {
      setTestPushLoading(false);
    }
  };

  const copyToClipboard = (text, label) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      playDopamineSound("select");
      triggerHaptic("light");
      showToast(`${label} copiado para a área de transferência!`);
    }
  };

  const empresasFiltradas = useMemo(() => {
    if (!searchQuery.trim()) return empresas;
    const q = searchQuery.toLowerCase().trim();
    return empresas.filter(
      (e) =>
        (e.nome || "").toLowerCase().includes(q) ||
        (e.slug || "").toLowerCase().includes(q) ||
        (e.email || "").toLowerCase().includes(q) ||
        (e.telefone || "").includes(q)
    );
  }, [empresas, searchQuery]);

  const stats = useMemo(() => {
    const total = empresas.length;
    const comRmChat = empresas.filter(
      (e) => e.config_chaves?.rmchat_webhook_url || e.rmchat_webhook_url
    ).length;
    const comMedicalsys = empresas.filter(
      (e) => e.config_chaves?.medicalsys_url || e.medicalsys_url
    ).length;
    const comMercadoPago = empresas.filter(
      (e) => e.config_chaves?.mp_access_token || e.mp_access_token
    ).length;
    return { total, comRmChat, comMedicalsys, comMercadoPago };
  }, [empresas]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#06080d] text-white flex flex-col items-center justify-center gap-3">
        <Activity size={28} className="animate-spin text-[#9FC131]" />
        <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
          Autenticando sessão master...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col font-sans selection:bg-[#9FC131] selection:text-black">
      {/* BARRA SUPERIOR EXECUTIVA */}
      <AdminSessionBar />

      {/* NOTIFICAÇÃO FLUTUANTE */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-18 right-6 z-[999999] px-4 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2.5 border backdrop-blur-xl ${
              toastMsg.type === "success"
                ? "bg-emerald-950/90 text-emerald-300 border-emerald-500/40"
                : "bg-red-950/90 text-red-300 border-red-500/40"
            }`}
          >
            {toastMsg.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{toastMsg.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        {/* CABEÇALHO DO PAINEL MASTER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/5">
              <ShieldCheck size={26} strokeWidth={2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  Painel Master Root
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Gestão central de instâncias, parceiros, webhooks RM Chat e credenciais de integração ERP.
              </p>
            </div>
          </div>

          {/* ABAS DO PAINEL */}
          <div className="flex p-1 bg-white/[0.04] border border-white/10 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => {
                playDopamineSound("click");
                setActiveTab("clinicas");
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "clinicas"
                  ? "bg-white text-black shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Building2 size={14} />
              <span>Instâncias & Clínicas ({empresas.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                playDopamineSound("click");
                setActiveTab("nova_instancia");
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "nova_instancia"
                  ? "bg-[#9FC131] text-black shadow-md font-black"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>Nova Instância</span>
            </button>
          </div>
        </div>

        {/* STATS EXECUTIVOS EM CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 md:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-xl flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Building2 size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                Total de Clínicas
              </span>
              <span className="text-xl font-black text-white font-mono">{stats.total}</span>
            </div>
          </div>

          <div className="p-4 md:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-xl flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Zap size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                RM Chat Ativos
              </span>
              <span className="text-xl font-black text-white font-mono">{stats.comRmChat}</span>
            </div>
          </div>

          <div className="p-4 md:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-xl flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
              <Server size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                ERP MedicalSYS
              </span>
              <span className="text-xl font-black text-white font-mono">{stats.comMedicalsys}</span>
            </div>
          </div>

          <div className="p-4 md:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-xl flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <CreditCard size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                Mercado Pago
              </span>
              <span className="text-xl font-black text-white font-mono">{stats.comMercadoPago}</span>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* TAB 1: LISTAGEM DE CLÍNICAS & INTEGRAÇÕES */}
          {activeTab === "clinicas" && (
            <motion.div
              key="tab-clinicas"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={spring}
              className="space-y-4"
            >
              {/* BARRA DE PESQUISA */}
              <div className="p-4 bg-white/[0.03] border border-white/[0.07] rounded-2xl flex items-center gap-3">
                <Search size={16} className="text-zinc-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar por nome da clínica, slug, e-mail ou telefone..."
                  className="w-full bg-transparent text-xs font-medium text-white outline-none placeholder:text-zinc-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-zinc-400 hover:text-white text-xs font-bold cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
              </div>

              {loading ? (
                <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                  <Activity size={24} className="animate-spin text-[#9FC131]" />
                  <span className="text-xs text-zinc-400 font-bold">Carregando instâncias...</span>
                </div>
              ) : empresasFiltradas.length === 0 ? (
                <div className="py-20 text-center rounded-3xl border border-dashed border-white/10 text-zinc-500 bg-white/[0.01]">
                  Nenhuma clínica encontrada com este termo.
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {empresasFiltradas.map((emp) => {
                    const hasRmChat = Boolean(emp.config_chaves?.rmchat_webhook_url || emp.rmchat_webhook_url);
                    const hasMedicalsys = Boolean(emp.config_chaves?.medicalsys_url || emp.medicalsys_url);
                    const hasMp = Boolean(emp.config_chaves?.mp_access_token || emp.mp_access_token);

                    return (
                      <motion.div
                        key={emp.id}
                        layout
                        className="bg-white/[0.04] border border-white/[0.08] hover:border-white/20 rounded-3xl p-5 backdrop-blur-xl transition-all flex flex-col justify-between gap-4 shadow-sm"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                                {emp.logo_url ? (
                                  <img src={emp.logo_url} alt={emp.nome} className="w-full h-full object-cover" />
                                ) : (
                                  <Building2 size={18} className="text-zinc-400" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-extrabold text-sm text-white truncate">{emp.nome}</h3>
                                <span className="text-[10px] font-mono text-zinc-400 block truncate">
                                  slug: {emp.slug}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => copyToClipboard(`https://rmcare.com.br/${emp.slug}`, "Link do portal")}
                              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                              title="Copiar Link do Portal"
                            >
                              <Copy size={13} />
                            </button>
                          </div>

                          {/* STATUS DAS INTEGRAÇÕES */}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border flex items-center gap-1 ${
                                hasRmChat
                                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                  : "bg-zinc-800/60 text-zinc-500 border-white/5"
                              }`}
                            >
                              <Zap size={9} /> RM Chat: {hasRmChat ? "ON" : "OFF"}
                            </span>

                            <span
                              className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border flex items-center gap-1 ${
                                hasMedicalsys
                                  ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                                  : "bg-zinc-800/60 text-zinc-500 border-white/5"
                              }`}
                            >
                              <Server size={9} /> ERP: {hasMedicalsys ? "ON" : "OFF"}
                            </span>

                            <span
                              className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border flex items-center gap-1 ${
                                hasMp
                                  ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
                                  : "bg-zinc-800/60 text-zinc-500 border-white/5"
                              }`}
                            >
                              <CreditCard size={9} /> Pix: {hasMp ? "ON" : "OFF"}
                            </span>
                          </div>

                          {/* DADOS DE CONTATO */}
                          <div className="text-[11px] text-zinc-400 space-y-0.5 font-medium pt-1 border-t border-white/5">
                            {emp.email && <div className="truncate">📧 {emp.email}</div>}
                            {emp.telefone && <div className="truncate">📱 {emp.telefone}</div>}
                          </div>
                        </div>

                        {/* AÇÕES NO CARD */}
                        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                          <button
                            type="button"
                            onClick={() => handleAbrirModalChaves(emp)}
                            className="flex-1 py-2 px-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <Settings2 size={13} />
                            <span>Configurar APIs</span>
                          </button>

                          <a
                            href={`/${emp.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                            title="Abrir Portal do Paciente"
                          >
                            <ExternalLink size={14} />
                          </a>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 2: NOVA INSTÂNCIA / TENANT */}
          {activeTab === "nova_instancia" && (
            <motion.div
              key="tab-nova"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={spring}
              className="max-w-2xl mx-auto"
            >
              <form
                onSubmit={handleCriarInstancia}
                className="bg-white/[0.04] border border-white/[0.08] backdrop-blur-2xl rounded-3xl p-6 md:p-8 space-y-5 shadow-2xl"
              >
                <div className="flex items-center gap-3 border-b border-white/[0.08] pb-4">
                  <div className="w-10 h-10 rounded-2xl bg-[#9FC131]/10 border border-[#9FC131]/30 text-[#9FC131] flex items-center justify-center font-bold">
                    <Plus size={20} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">Provisionar Nova Clínica</h3>
                    <p className="text-xs text-zinc-400">
                      Cadastre a empresa, defina o slug de acesso e crie o usuário master do cliente.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block ml-1">
                      Nome da Clínica / Hospital *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Ex: Clínica GastroCare Parnamirim"
                      value={novaEmpresa.nome}
                      onChange={(e) => {
                        const nome = e.target.value;
                        const autoSlug = nome
                          .toLowerCase()
                          .normalize("NFD")
                          .replace(/[\u0300-\u036f]/g, "")
                          .replace(/[^a-z0-9]/g, "-")
                          .replace(/-+/g, "-")
                          .replace(/^-|-$/g, "");
                        setNovaEmpresa({ ...novaEmpresa, nome, slug: autoSlug });
                      }}
                      className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl font-medium outline-none focus:border-[#9FC131] text-white"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block ml-1">
                        Slug de Acesso URL *
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="gastrocare"
                        value={novaEmpresa.slug}
                        onChange={(e) => setNovaEmpresa({ ...novaEmpresa, slug: e.target.value.toLowerCase().trim() })}
                        className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl font-mono outline-none focus:border-[#9FC131] text-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block ml-1">
                        Subdomínio (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="gastrocare.rmcare.com.br"
                        value={novaEmpresa.subdominio}
                        onChange={(e) => setNovaEmpresa({ ...novaEmpresa, subdominio: e.target.value.trim() })}
                        className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl font-mono outline-none focus:border-[#9FC131] text-white"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block ml-1">
                        E-mail de Contato
                      </label>
                      <input
                        type="email"
                        placeholder="contato@gastrocare.com"
                        value={novaEmpresa.email}
                        onChange={(e) => setNovaEmpresa({ ...novaEmpresa, email: e.target.value.trim() })}
                        className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl font-medium outline-none focus:border-[#9FC131] text-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block ml-1">
                        WhatsApp Oficial
                      </label>
                      <input
                        type="text"
                        placeholder="5583999999999"
                        value={novaEmpresa.telefone}
                        onChange={(e) => setNovaEmpresa({ ...novaEmpresa, telefone: e.target.value.trim() })}
                        className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl font-medium outline-none focus:border-[#9FC131] text-white"
                      />
                    </div>
                  </div>

                  {/* CREDENCIAIS INICIAIS DO ADMINISTRADOR */}
                  <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl space-y-3 pt-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300 block">
                      👤 Usuário Inicial de Acesso do Administrador
                    </span>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block ml-1">
                          Usuário (Login) *
                        </label>
                        <input
                          required
                          type="text"
                          placeholder="admin.gastro"
                          value={novaEmpresa.admin_usuario}
                          onChange={(e) => setNovaEmpresa({ ...novaEmpresa, admin_usuario: e.target.value.toLowerCase().trim() })}
                          className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl font-medium outline-none focus:border-[#9FC131] text-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block ml-1">
                          Senha Provisória *
                        </label>
                        <input
                          required
                          type="text"
                          placeholder="Mudar@12345"
                          value={novaEmpresa.admin_senha}
                          onChange={(e) => setNovaEmpresa({ ...novaEmpresa, admin_senha: e.target.value })}
                          className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl font-mono outline-none focus:border-[#9FC131] text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setActiveTab("clinicas")}
                    className="px-5 py-2.5 rounded-xl border border-white/10 text-xs font-bold hover:bg-white/5 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creatingTenant}
                    className="px-6 py-2.5 bg-[#9FC131] hover:bg-[#8eb025] text-black font-black text-xs uppercase rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {creatingTenant ? <Activity size={14} className="animate-spin" /> : <Plus size={14} />}
                    <span>Criar e Provisionar</span>
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* MODAL ULTRA MODERNO DE CONFIGURAÇÃO DE CHAVES & APIS */}
      <AnimatePresence>
        {editingEmpresa && (
          <div
            className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-md p-4 flex items-center justify-center"
            onClick={() => setEditingEmpresa(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0e1118]/95 backdrop-blur-3xl rounded-[2.5rem] p-6 md:p-8 max-w-2xl w-full shadow-2xl border border-white/15 space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-start border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 text-white flex items-center justify-center">
                    <Key size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tight">
                      APIs & Credenciais: {editingEmpresa.nome}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                      slug: {editingEmpresa.slug} • id: {editingEmpresa.id}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEditingEmpresa(null)}
                  className="p-2 text-zinc-400 hover:text-white rounded-full cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* ABAS DO MODAL */}
              <div className="flex p-1 bg-white/5 border border-white/10 rounded-2xl gap-1">
                {[
                  { id: "rmchat", label: "⚡ RM Chat / Webhook", icon: Zap },
                  { id: "mercadopago", label: "💳 Mercado Pago", icon: CreditCard },
                  { id: "medicalsys", label: "🏥 ERP MedicalSYS", icon: Server }
                ].map((tb) => {
                  const isSel = modalSubTab === tb.id;
                  const Icon = tb.icon;
                  return (
                    <button
                      key={tb.id}
                      type="button"
                      onClick={() => {
                        playDopamineSound("click");
                        setModalSubTab(tb.id);
                      }}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        isSel ? "bg-white text-black shadow-md" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Icon size={13} />
                      <span>{tb.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* CONTEÚDO DAS ABAS */}
              <div className="space-y-4 text-xs pt-1">
                {/* ABA 1: RM CHAT WEBHOOK */}
                {modalSubTab === "rmchat" && (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-300 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <Zap size={14} /> Integração com RM Chat & N8N Webhook
                      </div>
                      <p className="text-[11px] opacity-80 leading-relaxed">
                        As notificações de confirmação, lembretes e cancelamentos serão enviadas para esta URL via requisição HTTP POST em formato JSON.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block ml-1">
                        URL do Webhook de Disparo (RM Chat / N8N / Webhook)
                      </label>
                      <input
                        type="url"
                        placeholder="https://n8n.seuservidor.com/webhook/rmchat-disparo"
                        value={formKeys.rmchat_webhook_url}
                        onChange={(e) => setFormKeys({ ...formKeys, rmchat_webhook_url: e.target.value })}
                        className="w-full px-4 py-3 bg-black/60 border border-white/10 rounded-xl font-mono text-xs outline-none focus:border-[#9FC131] text-white"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={handleTestarPushRmChat}
                        disabled={testPushLoading || !formKeys.rmchat_webhook_url}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                      >
                        {testPushLoading ? <Activity size={13} className="animate-spin" /> : <Play size={11} fill="currentColor" />}
                        <span>{testPushLoading ? "Enviando teste..." : "⚡ Testar Disparo Webhook"}</span>
                      </button>
                    </div>

                    {testPushResult && (
                      <div className={`p-4 rounded-2xl text-xs border ${
                        testPushResult.success
                          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                          : "bg-red-500/15 border-red-500/30 text-red-300"
                      }`}>
                        <div className="font-bold flex items-center gap-2">
                          {testPushResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                          <span>{testPushResult.message}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ABA 2: MERCADO PAGO */}
                {modalSubTab === "mercadopago" && (
                  <div className="space-y-4">
                    <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-xs text-indigo-300 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <CreditCard size={14} /> Credenciais do Mercado Pago (Pix & Cartão)
                      </div>
                      <p className="text-[11px] opacity-80 leading-relaxed">
                        Chaves de produção para emissão de Pix Copia e Cola instantâneo e aprovação imediata no checkout.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block ml-1">
                        Access Token (Produção)
                      </label>
                      <input
                        type="password"
                        placeholder="APP_USR-..."
                        value={formKeys.mp_access_token}
                        onChange={(e) => setFormKeys({ ...formKeys, mp_access_token: e.target.value })}
                        className="w-full px-4 py-3 bg-black/60 border border-white/10 rounded-xl font-mono text-xs outline-none focus:border-[#9FC131] text-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block ml-1">
                        Public Key (Produção)
                      </label>
                      <input
                        type="text"
                        placeholder="APP_USR-..."
                        value={formKeys.mp_public_key}
                        onChange={(e) => setFormKeys({ ...formKeys, mp_public_key: e.target.value })}
                        className="w-full px-4 py-3 bg-black/60 border border-white/10 rounded-xl font-mono text-xs outline-none focus:border-[#9FC131] text-white"
                      />
                    </div>
                  </div>
                )}

                {/* ABA 3: ERP MEDICALSYS */}
                {modalSubTab === "medicalsys" && (
                  <div className="space-y-4">
                    <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-xs text-purple-300 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <Server size={14} /> Integração com MedicalSYS ERP
                      </div>
                      <p className="text-[11px] opacity-80 leading-relaxed">
                        Sincronização bidirecional de agendamentos e bloqueios de agenda em tempo real.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block ml-1">
                        URL Base da API do MedicalSYS
                      </label>
                      <input
                        type="url"
                        placeholder="https://api.medicalsys.com.br/ws"
                        value={formKeys.medicalsys_url}
                        onChange={(e) => setFormKeys({ ...formKeys, medicalsys_url: e.target.value })}
                        className="w-full px-4 py-3 bg-black/60 border border-white/10 rounded-xl font-mono text-xs outline-none focus:border-[#9FC131] text-white"
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block ml-1">
                          Usuário ERP
                        </label>
                        <input
                          type="text"
                          placeholder="ws_rmcare"
                          value={formKeys.medicalsys_usuario}
                          onChange={(e) => setFormKeys({ ...formKeys, medicalsys_usuario: e.target.value })}
                          className="w-full px-4 py-3 bg-black/60 border border-white/10 rounded-xl font-mono text-xs outline-none focus:border-[#9FC131] text-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block ml-1">
                          Senha ERP
                        </label>
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={formKeys.medicalsys_senha}
                          onChange={(e) => setFormKeys({ ...formKeys, medicalsys_senha: e.target.value })}
                          className="w-full px-4 py-3 bg-black/60 border border-white/10 rounded-xl font-mono text-xs outline-none focus:border-[#9FC131] text-white"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block ml-1">
                          Código da Empresa no ERP
                        </label>
                        <input
                          type="text"
                          placeholder="1"
                          value={formKeys.medicalsys_cod_empresa}
                          onChange={(e) => setFormKeys({ ...formKeys, medicalsys_cod_empresa: e.target.value })}
                          className="w-full px-4 py-3 bg-black/60 border border-white/10 rounded-xl font-mono text-xs outline-none focus:border-[#9FC131] text-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block ml-1">
                          Intervalo de Sincronização (minutos)
                        </label>
                        <input
                          type="number"
                          placeholder="15"
                          value={formKeys.medicalsys_sync_interval}
                          onChange={(e) =>
                            setFormKeys({
                              ...formKeys,
                              medicalsys_sync_interval: parseInt(e.target.value, 10) || 15
                            })
                          }
                          className="w-full px-4 py-3 bg-black/60 border border-white/10 rounded-xl font-mono text-xs outline-none focus:border-[#9FC131] text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* BOTÕES DE SALVAR */}
              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingEmpresa(null)}
                  disabled={savingKeys}
                  className="px-5 py-2.5 rounded-xl border border-white/10 text-xs font-bold hover:bg-white/5 cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={handleSalvarChaves}
                  disabled={savingKeys}
                  className="px-6 py-2.5 bg-white hover:bg-zinc-200 text-black font-black text-xs uppercase rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingKeys ? <Activity size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
