"use client"; 

import { useState, useEffect, useMemo } from "react"; 
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  LayoutDashboard,
  Building2,
  ShieldCheck,
  Database,
  Server,
  Activity,
  KeyRound,
  Lock,
  Settings2,
  X,
  Save,
  CreditCard,
  ShieldAlert,
  Clock,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  Search,
  Zap,
  Sliders,
  Check
} from "lucide-react"; 
import AdminSessionBar from "@/components/AdminSessionBar";
import {
  actionListarEmpresas,
  actionProvisionarEmpresa,
  actionSalvarChavesEmpresaMaster,
  actionTestarPushRmChat
} from "@/actions/adminData";
import { authenticateUser } from "@/actions/auth";
import { supabase } from "@/lib/supabase";
import { playDopamineSound, triggerConfetti, triggerHaptic } from "@/lib/dopamine";

export default function SuperAdminSistema() {   
  const [isAuthenticatedMaster, setIsAuthenticatedMaster] = useState(false);
  const [masterUser, setMasterUser] = useState("master");
  const [masterPass, setMasterPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [activeMasterTab, setActiveMasterTab] = useState("integracoes");

  const [empresas, setEmpresas] = useState([]);   
  const [searchEmpresa, setSearchEmpresa] = useState("");
  const [nome, setNome] = useState("");   
  const [slug, setSlug] = useState("");   
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);   

  const [selectedEmpresa, setSelectedEmpresa] = useState(null);
  const [empresaChaves, setEmpresaChaves] = useState({
    rmchat_webhook_url: "",
    mp_public_key: "",
    mp_access_token: "",
    medicalsys_enabled: false,
    medicalsys_id_clinica: "9",
    medicalsys_id_medico: "1",
    medicalsys_apikey: "8FxD2eUsODMO8IZWMHZaNpt78av9Vy6k",
    medicalsys_customer_apikey: "SqdACjyxnXuYqL8ilnwTvXHroEOvFHFR",
    auto_sync_cadence: "manual"
  });
  const [savingKeys, setSavingKeys] = useState(false);

  const [testNumber, setTestNumber] = useState("5583999999999");
  const [testingPush, setTestingPush] = useState(false);
  const [testPushResult, setTestPushResult] = useState(null);

  useEffect(() => {     
    if (isAuthenticatedMaster) fetchEmpresas();   
  }, [isAuthenticatedMaster]);   

  async function fetchEmpresas() {     
    try { 
      const lista = await actionListarEmpresas();
      const { data: empresasComChaves } = await supabase
        .from("empresas")
        .select("id, nome, slug, created_at, config_chaves")
        .order("created_at", { ascending: false });

      setEmpresas(empresasComChaves || lista || []); 
    } catch (error) { 
      setFeedback(error.message); 
    }
  }   

  const handleMasterLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    playDopamineSound("click");
    triggerHaptic("light");

    try {
      const res = await authenticateUser({
        type: "admin",
        identificador: masterUser,
        password: masterPass
      });

      if (res.success) {
        setIsAuthenticatedMaster(true);
        playDopamineSound("unlock");
        triggerHaptic("success");
      } else {
        setLoginError(res.error || "Acesso negado ao Administrador Master.");
        playDopamineSound("error");
        triggerHaptic("error");
      }
    } catch (err) {
      setLoginError("Erro de autenticação master.");
      playDopamineSound("error");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleProvisionar = async (e) => {     
    e.preventDefault();     
    if (!nome || !slug) return;     
    
    setLoading(true);
    playDopamineSound("click");
    try {
      await actionProvisionarEmpresa({ nome, slug, usuario, senha });
      setNome("");       
      setSlug("");       
      setUsuario("");
      setSenha("");
      setFeedback("Ambiente e administrador criados com sucesso!");
      playDopamineSound("success");
      triggerConfetti({ count: 80 });
      await fetchEmpresas();
    } catch (error) {
      setFeedback(error.message);
      playDopamineSound("error");
    }
    setLoading(false);   
  };

  const handleInspectCompany = async (emp) => {
    playDopamineSound("click");
    setSelectedEmpresa(emp);
    setTestPushResult(null);
    try {
      const { data } = await supabase.from("empresas").select("config_chaves").eq("id", emp.id).single();
      const loadedKeys = {
        rmchat_webhook_url: "",
        mp_public_key: "",
        mp_access_token: "",
        medicalsys_enabled: false,
        medicalsys_id_clinica: "9",
        medicalsys_id_medico: "1",
        medicalsys_apikey: "8FxD2eUsODMO8IZWMHZaNpt78av9Vy6k",
        medicalsys_customer_apikey: "SqdACjyxnXuYqL8ilnwTvXHroEOvFHFR",
        auto_sync_cadence: "manual"
      };

      if (data && data.config_chaves) {
        setEmpresaChaves({ ...loadedKeys, ...data.config_chaves });
      } else {
        setEmpresaChaves(loadedKeys);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveCompanyKeys = async () => {
    if (!selectedEmpresa) return;
    setSavingKeys(true);
    setTestPushResult(null);
    playDopamineSound("click");
    try {
      await actionSalvarChavesEmpresaMaster(selectedEmpresa.id, empresaChaves);
      setFeedback(`Configurações de integração salvas para "${selectedEmpresa.nome}"!`);
      playDopamineSound("step");
      await fetchEmpresas();
      setSelectedEmpresa(null);
    } catch (err) {
      setFeedback(`Erro ao salvar chaves: ${err.message}`);
      playDopamineSound("error");
    } finally {
      setSavingKeys(false);
    }
  };

  const handleTestPush = async () => {
    if (!empresaChaves.rmchat_webhook_url) {
      setTestPushResult({ success: false, message: "Informe a URL do RM Chat para testar." });
      playDopamineSound("error");
      return;
    }
    setTestingPush(true);
    setTestPushResult(null);
    playDopamineSound("click");
    try {
      await actionTestarPushRmChat(empresaChaves.rmchat_webhook_url, testNumber, selectedEmpresa?.nome || "Teste RMCare");
      setTestPushResult({ success: true, message: "Notificação enviada com sucesso ao RM Chat!" });
      playDopamineSound("step");
    } catch (err) {
      setTestPushResult({ success: false, message: `Falha no teste: ${err.message}` });
      playDopamineSound("error");
    } finally {
      setTestingPush(false);
    }
  };

  const empresasFiltradas = useMemo(() => {
    if (!searchEmpresa.trim()) return empresas;
    const term = searchEmpresa.toLowerCase().trim();
    return empresas.filter(
      (e) => e.nome?.toLowerCase().includes(term) || e.slug?.toLowerCase().includes(term)
    );
  }, [empresas, searchEmpresa]);

  if (!isAuthenticatedMaster) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] dark:bg-[#060A12] text-zinc-950 dark:text-white flex flex-col items-center justify-center p-6 relative font-sans antialiased transition-colors duration-300">
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(159,193,49,.15),transparent_45%)] pointer-events-none" />
        
        <div className="max-w-md w-full bg-white/80 dark:bg-[#0c0f17]/70 backdrop-blur-3xl saturate-150 border border-zinc-200/80 dark:border-white/10 p-8 md:p-10 rounded-[2.5rem] shadow-2xl relative z-10 space-y-6">
          <div className="text-center space-y-3">
            <div className="w-14 h-14 bg-[#9FC131]/15 border border-[#9FC131]/30 text-[#86a621] dark:text-[#9FC131] rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <ShieldCheck size={28} strokeWidth={2} />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-950 dark:text-white">Administrador Master</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
              Área global de orquestração do sistema. Autentique-se com credenciais de Administrador Root.
            </p>
          </div>

          <form onSubmit={handleMasterLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest ml-1">Login Master</label>
              <input
                required
                type="text"
                value={masterUser}
                onChange={(e) => setMasterUser(e.target.value)}
                placeholder="master"
                className="w-full min-h-[48px] px-4 py-3 bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-white/10 rounded-2xl text-sm font-medium outline-none text-zinc-950 dark:text-white focus:border-[#9FC131] focus:ring-2 focus:ring-[#9FC131]/20 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest ml-1">Senha Master</label>
              <input
                required
                type="password"
                value={masterPass}
                onChange={(e) => setMasterPass(e.target.value)}
                placeholder="••••••••"
                className="w-full min-h-[48px] px-4 py-3 bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-white/10 rounded-2xl text-sm font-medium outline-none text-zinc-950 dark:text-white focus:border-[#9FC131] focus:ring-2 focus:ring-[#9FC131]/20 transition-all"
              />
            </div>

            {loginError && (
              <div className="p-4 bg-red-500/15 border border-red-500/25 text-red-700 dark:text-red-300 text-xs font-bold rounded-2xl">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full min-h-[48px] mt-2 bg-[#9FC131] hover:bg-[#86a621] text-black font-extrabold text-xs uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-[#9FC131]/20 flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {loginLoading ? <Activity size={16} className="animate-spin" /> : <Lock size={16} />}
              {loginLoading ? "Verificando..." : "Acessar Painel Master"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (     
    <main className="min-h-screen bg-[#F8FAFC] dark:bg-[#060A12] text-zinc-950 dark:text-white antialiased font-sans selection:bg-[#9FC131] selection:text-black transition-colors duration-300">       
      <AdminSessionBar />
      
      <div className="w-full px-6 lg:px-10 py-8 space-y-8 relative z-10 max-w-7xl mx-auto">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-200/80 dark:border-white/10 pb-8">         
          <div>           
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
              <div className="w-12 h-12 bg-[#9FC131]/15 border border-[#9FC131]/30 rounded-2xl flex items-center justify-center shadow-sm text-[#86a621] dark:text-[#9FC131]">
                <LayoutDashboard size={24} strokeWidth={2} />
              </div>
              Painel de Sistema · Integrações & SaaS
            </h1>           
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-2">
              Gerenciamento multi-tenant de instâncias e configuração de credenciais, ERP e Webhooks.
            </p>         
          </div>         
          <div className="bg-[#9FC131]/15 border border-[#9FC131]/30 text-[#86a621] dark:text-[#9FC131] px-4 py-2 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm self-start md:self-auto">           
            <ShieldCheck size={16} /> Master Root Ativo         
          </div>       
        </div>       

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-200/80 dark:border-white/10 pb-4">
          <div className="flex p-1 bg-zinc-200/70 dark:bg-white/5 border border-zinc-300/80 dark:border-white/10 rounded-2xl gap-1">
            <button
              onClick={() => {
                playDopamineSound("click");
                setActiveMasterTab("integracoes");
              }}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all min-h-[40px] ${
                activeMasterTab === "integracoes"
                  ? "bg-zinc-950 text-white dark:bg-[#9FC131] dark:text-black shadow-md"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
              }`}
            >
              <MessageSquare size={16} /> Integrações & APIs
            </button>
            <button
              onClick={() => {
                playDopamineSound("click");
                setActiveMasterTab("instancias");
              }}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all min-h-[40px] ${
                activeMasterTab === "instancias"
                  ? "bg-zinc-950 text-white dark:bg-[#9FC131] dark:text-black shadow-md"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
              }`}
            >
              <Database size={16} /> Nova Instância
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchEmpresa}
              onChange={(e) => setSearchEmpresa(e.target.value)}
              placeholder="Buscar clínica / slug..."
              className="w-full min-h-[42px] pl-10 pr-4 py-2 bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl text-xs text-zinc-900 dark:text-white outline-none focus:border-[#9FC131] transition-all"
            />
          </div>
        </div>

        {feedback && (
          <div className="p-4 bg-[#9FC131]/15 border border-[#9FC131]/30 text-[#86a621] dark:text-[#9FC131] text-xs font-bold rounded-2xl flex items-center justify-between shadow-sm">
            <span>{feedback}</span>
            <button onClick={() => setFeedback("")} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white"><X size={16} /></button>
          </div>
        )}

        {activeMasterTab === "integracoes" && (
          <div className="space-y-6">
            <div className="bg-white/80 dark:bg-white/[0.04] backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-8 rounded-[2.5rem] shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-black text-zinc-950 dark:text-white flex items-center gap-2">
                    <MessageSquare className="text-emerald-500" size={20} /> Servidores de Push RM Chat & APIs por Clínica
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Cada clínica possui credenciais personalizadas de Mercado Pago, Medicalsys ERP e Webhook RM Chat WhatsApp.
                  </p>
                </div>
                <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest bg-zinc-100 dark:bg-black/40 px-4 py-2 rounded-xl border border-zinc-200 dark:border-white/10">
                  {empresasFiltradas.length} de {empresas.length} Clínicas
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {empresasFiltradas.length === 0 ? (
                  <div className="col-span-2 py-12 text-center text-zinc-500 border border-dashed border-zinc-200 dark:border-white/10 rounded-3xl">
                    Nenhuma clínica encontrada com este filtro.
                  </div>
                ) : (
                  empresasFiltradas.map((emp) => {
                    const chaves = emp.config_chaves || {};
                    const hasCustomRmChat = Boolean(chaves.rmchat_webhook_url && chaves.rmchat_webhook_url.trim());
                    const hasMedicalsys = Boolean(chaves.medicalsys_apikey);
                    const hasMercadoPago = Boolean(chaves.mp_public_key);

                    return (
                      <div
                        key={emp.id}
                        className="p-6 bg-zinc-50/70 dark:bg-black/40 border border-zinc-200/80 dark:border-white/10 hover:border-[#9FC131]/60 transition-all rounded-3xl space-y-5 group relative flex flex-col justify-between shadow-sm"
                      >
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3.5">
                              <div className="w-12 h-12 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl flex items-center justify-center text-[#86a621] dark:text-[#9FC131] shadow-inner group-hover:scale-105 transition-transform">
                                <Building2 size={22} />
                              </div>
                              <div>
                                <h4 className="font-black text-base text-zinc-950 dark:text-white">{emp.nome}</h4>
                                <p className="text-[11px] text-zinc-500 font-mono tracking-wider">/{emp.slug}</p>
                              </div>
                            </div>

                            <button
                              onClick={() => handleInspectCompany(emp)}
                              className="min-h-[40px] px-4 py-2 bg-zinc-950 hover:bg-black dark:bg-[#9FC131] dark:hover:bg-[#86a621] text-white dark:text-black rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md flex-shrink-0"
                            >
                              <Settings2 size={14} /> Configurar APIs
                            </button>
                          </div>

                          <div className="space-y-2.5 pt-2 border-t border-zinc-200/60 dark:border-white/5">
                            <div className="p-3 bg-white dark:bg-white/5 border border-zinc-200/60 dark:border-white/5 rounded-2xl space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                                  <MessageSquare size={14} className="text-emerald-500" /> Servidor RM Chat (WhatsApp):
                                </span>
                                {hasCustomRmChat ? (
                                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                                    <CheckCircle2 size={10} /> Endpoint Próprio
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300">
                                    Padrão Global
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 truncate">
                                {chaves.rmchat_webhook_url || "Nenhum endpoint configurado"}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <div className="p-2.5 bg-white dark:bg-white/5 rounded-xl border border-zinc-200/60 dark:border-white/5 flex items-center justify-between">
                                <span className="text-zinc-600 dark:text-zinc-400">Medicalsys ERP:</span>
                                <span className={`font-bold uppercase text-[9px] px-1.5 py-0.5 rounded ${hasMedicalsys ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10' : 'text-zinc-400 bg-zinc-100 dark:bg-white/5'}`}>
                                  {hasMedicalsys ? 'Configurado' : 'Pendente'}
                                </span>
                              </div>

                              <div className="p-2.5 bg-white dark:bg-white/5 rounded-xl border border-zinc-200/60 dark:border-white/5 flex items-center justify-between">
                                <span className="text-zinc-600 dark:text-zinc-400">Mercado Pago:</span>
                                <span className={`font-bold uppercase text-[9px] px-1.5 py-0.5 rounded ${hasMercadoPago ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' : 'text-zinc-400 bg-zinc-100 dark:bg-white/5'}`}>
                                  {hasMercadoPago ? 'Ativo' : 'Pendente'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 flex items-center justify-between text-[10px] text-zinc-500 border-t border-zinc-200/60 dark:border-white/5">
                          <span>Criado em {new Date(emp.created_at).toLocaleDateString('pt-BR')}</span>
                          <span className="capitalize">Cadência: {chaves.auto_sync_cadence || 'manual'}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {activeMasterTab === "instancias" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">         
            <div className="bg-white/80 dark:bg-white/[0.04] backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-8 rounded-[2.5rem] shadow-sm h-fit space-y-6">           
              <div className="flex items-center gap-3 border-b border-zinc-200/80 dark:border-white/10 pb-4">
                  <Database className="text-[#86a621] dark:text-[#9FC131]" size={22} />
                  <h3 className="font-black text-zinc-950 dark:text-white text-base tracking-tight">Nova Instância</h3>           
              </div>
              
              <form onSubmit={handleProvisionar} className="space-y-4">             
                <div className="space-y-1.5">               
                  <label className="text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest ml-1">Nome da Organização</label>               
                  <input 
                    required 
                    type="text" 
                    value={nome} 
                    onChange={(e) => setNome(e.target.value)} 
                    placeholder="Ex: Clínica Gastro Prime" 
                    className="w-full min-h-[48px] px-4 py-3 bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-2xl text-sm font-medium outline-none text-zinc-950 dark:text-white focus:border-[#9FC131] transition-all" 
                  />             
                </div>             
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest ml-1">Login do Administrador</label>
                  <input required value={usuario} onChange={(e) => setUsuario(e.target.value)} className="w-full min-h-[48px] px-4 py-3 bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-2xl text-sm text-zinc-950 dark:text-white outline-none focus:border-[#9FC131]" placeholder="admin-clinica" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest ml-1">Senha Inicial</label>
                  <input required minLength={8} type="password" value={senha} onChange={(e) => setSenha(e.target.value)} className="w-full min-h-[48px] px-4 py-3 bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-2xl text-sm text-zinc-950 dark:text-white outline-none focus:border-[#9FC131]" placeholder="Mínimo 8 caracteres" />
                </div>
                <div className="space-y-1.5">               
                  <label className="text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest ml-1">Slug da URL (Identificador)</label>               
                  <input 
                    required 
                    type="text" 
                    value={slug} 
                    onChange={(e) => setSlug(e.target.value)} 
                    placeholder="ex: gastro-prime" 
                    className="w-full min-h-[48px] px-4 py-3 bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-2xl text-sm font-medium outline-none text-zinc-950 dark:text-white focus:border-[#9FC131] transition-all lowercase" 
                  />             
                </div>             

                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full min-h-[48px] mt-4 bg-zinc-950 hover:bg-black dark:bg-[#9FC131] dark:hover:bg-[#86a621] text-white dark:text-black font-extrabold text-xs uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                >               
                  {loading ? <Activity size={16} className="animate-spin" /> : <Plus size={16} />} 
                  {loading ? "Criando Ambiente..." : "Provisionar Empresa"}             
                </button>           
              </form>         
            </div>         

            <div className="lg:col-span-2 bg-white/80 dark:bg-white/[0.04] backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-8 rounded-[2.5rem] shadow-sm flex flex-col">           
              <div className="flex items-center justify-between mb-6 border-b border-zinc-200/80 dark:border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                      <Server className="text-blue-500" size={22} />
                      <h3 className="font-black text-zinc-950 dark:text-white text-base tracking-tight">Ambientes Criados</h3>           
                  </div>
                  <div className="text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest bg-zinc-100 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/5">
                      {empresas.length} Instâncias
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4 max-h-[520px]">             
                {empresas.map(emp => (               
                  <div key={emp.id} className="p-5 bg-zinc-50/70 dark:bg-black/40 border border-zinc-200/80 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/20 transition-colors rounded-2xl flex items-center justify-between gap-4">                 
                    <div className="flex items-center gap-4">                   
                      <div className="w-12 h-12 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl flex items-center justify-center text-[#86a621] dark:text-[#9FC131]">
                          <Building2 size={20} />
                      </div>                   
                      <div>                     
                        <h4 className="font-black text-base text-zinc-950 dark:text-white">{emp.nome}</h4>                     
                        <p className="text-[11px] text-zinc-500 font-mono tracking-wider">/{emp.slug}</p>                   
                      </div>                 
                    </div>                 

                    <button
                      onClick={() => handleInspectCompany(emp)}
                      className="min-h-[40px] px-4 py-2 bg-zinc-950 dark:bg-white/10 text-white hover:bg-black dark:hover:bg-white/20 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
                    >
                      <Settings2 size={14} /> Chaves API
                    </button>               
                  </div>             
                ))}           
              </div>         
            </div>       
          </div>
        )}
      </div>     

      {/* MODAL COMPLETO DE CONFIGURAÇÃO DE APIS E CHAVES POR EMPRESA */}
      {selectedEmpresa && (
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center" onClick={() => setSelectedEmpresa(null)}>
          <div className="bg-white dark:bg-[#0d0d10] border border-zinc-200/80 dark:border-white/10 rounded-[2.5rem] p-6 sm:p-8 max-w-3xl w-full shadow-2xl space-y-6 text-zinc-950 dark:text-white max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            
            <div className="flex justify-between items-center border-b border-zinc-200/80 dark:border-white/10 pb-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#9FC131]/20 text-[#86a621] dark:text-[#9FC131] flex items-center justify-center">
                  <Settings2 size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-zinc-950 dark:text-white">{selectedEmpresa.nome}</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Configuração completa de Push WhatsApp, Mercado Pago e ERP Medicalsys.</p>
                </div>
              </div>
              <button onClick={() => setSelectedEmpresa(null)} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 overflow-y-auto custom-scrollbar pr-2 flex-1">
              
              {/* SEÇÃO 1: ENDPOINT DE PUSH RM CHAT (WHATSAPP) */}
              <div className="p-6 bg-emerald-50/70 dark:bg-gradient-to-br dark:from-green-950/30 dark:to-black/60 border border-emerald-200 dark:border-green-500/30 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={18} className="text-emerald-600 dark:text-green-400" />
                    <h4 className="text-sm font-black text-emerald-900 dark:text-green-300 uppercase tracking-widest">
                      Endpoint de Push · RM Chat API (WhatsApp)
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase bg-white/80 dark:bg-black/50 px-3 py-1 rounded-full border border-zinc-200 dark:border-white/10">
                    Webhook Exclusivo
                  </span>
                </div>

                <p className="text-xs text-emerald-800/80 dark:text-zinc-300 leading-relaxed">
                  Defina o link completo do webhook de push da RM Chat exclusivo para <strong>{selectedEmpresa.nome}</strong>.
                </p>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest block">
                    URL do Webhook Push RM Chat:
                  </label>
                  <input
                    type="url"
                    value={empresaChaves.rmchat_webhook_url || ""}
                    onChange={(e) => setEmpresaChaves({ ...empresaChaves, rmchat_webhook_url: e.target.value })}
                    placeholder="https://acessoapi.rmchat.com.br/w/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="w-full min-h-[48px] px-4 py-3 bg-white dark:bg-black/60 border border-emerald-300 dark:border-green-500/30 rounded-2xl text-xs font-mono text-emerald-950 dark:text-green-200 outline-none focus:border-emerald-500 transition-all placeholder:text-zinc-400"
                  />
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={testNumber}
                      onChange={(e) => setTestNumber(e.target.value)}
                      placeholder="Telefone de teste (Ex: 5583999999999)"
                      className="w-full min-h-[44px] px-4 py-2.5 bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-xl text-xs font-mono text-zinc-900 dark:text-zinc-200 outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleTestPush}
                    disabled={testingPush || !empresaChaves.rmchat_webhook_url}
                    className="min-h-[44px] px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 flex-shrink-0 shadow-md"
                  >
                    {testingPush ? <Activity size={14} className="animate-spin" /> : <Send size={14} />}
                    {testingPush ? "Testando..." : "Testar Push no Servidor"}
                  </button>
                </div>

                {testPushResult && (
                  <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    testPushResult.success ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-800 dark:text-red-300 border border-red-500/30'
                  }`}>
                    {testPushResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span>{testPushResult.message}</span>
                  </div>
                )}
              </div>

              {/* SEÇÃO 2: CADÊNCIA DE SINCRONIZAÇÃO AUTOMÁTICA */}
              <div className="p-6 bg-zinc-50 dark:bg-black/40 border border-zinc-200/80 dark:border-white/10 rounded-3xl space-y-4">
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-purple-500" />
                  <h4 className="text-sm font-black text-zinc-950 dark:text-white uppercase tracking-widest">
                    Cadência de Sincronização Automática
                  </h4>
                </div>
                <div className="grid sm:grid-cols-4 gap-2.5">
                  {[
                    { id: "manual", label: "Manual" },
                    { id: "diario", label: "Diário" },
                    { id: "semanal", label: "Semanal" },
                    { id: "mensal", label: "Mensal" }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setEmpresaChaves({ ...empresaChaves, auto_sync_cadence: item.id })}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                        empresaChaves.auto_sync_cadence === item.id
                          ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-zinc-950 dark:border-white shadow-sm"
                          : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* SEÇÃO 3: CREDENCIAIS MERCADO PAGO */}
              <div className="p-6 bg-zinc-50 dark:bg-black/40 border border-zinc-200/80 dark:border-white/10 rounded-3xl space-y-4">
                <div className="flex items-center gap-2">
                  <CreditCard size={18} className="text-blue-500" />
                  <h4 className="text-sm font-black text-zinc-950 dark:text-white uppercase tracking-widest">
                    Mercado Pago (Pix & Checkout Transparente)
                  </h4>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                      Public Key
                    </label>
                    <input
                      type="text"
                      value={empresaChaves.mp_public_key || ""}
                      onChange={(e) => setEmpresaChaves({ ...empresaChaves, mp_public_key: e.target.value })}
                      placeholder="APP_USR-xxxxxxxx-xxxx..."
                      className="w-full px-4 py-3 bg-white dark:bg-black/60 border border-zinc-200 dark:border-white/10 rounded-xl text-xs font-mono outline-none focus:border-[#9FC131]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                      Access Token
                    </label>
                    <input
                      type="password"
                      value={empresaChaves.mp_access_token || ""}
                      onChange={(e) => setEmpresaChaves({ ...empresaChaves, mp_access_token: e.target.value })}
                      placeholder="APP_USR-xxxxxxxx-xxxx..."
                      className="w-full px-4 py-3 bg-white dark:bg-black/60 border border-zinc-200 dark:border-white/10 rounded-xl text-xs font-mono outline-none focus:border-[#9FC131]"
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO 4: MEDICALSYS ERP */}
              <div className="p-6 bg-zinc-50 dark:bg-black/40 border border-zinc-200/80 dark:border-white/10 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server size={18} className="text-indigo-500" />
                    <h4 className="text-sm font-black text-zinc-950 dark:text-white uppercase tracking-widest">
                      Medicalsys ERP Integrations
                    </h4>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(empresaChaves.medicalsys_enabled)}
                      onChange={(e) => setEmpresaChaves({ ...empresaChaves, medicalsys_enabled: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Sincronização Ativa</span>
                  </label>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                      ID da Clínica no Medicalsys
                    </label>
                    <input
                      type="text"
                      value={empresaChaves.medicalsys_id_clinica || ""}
                      onChange={(e) => setEmpresaChaves({ ...empresaChaves, medicalsys_id_clinica: e.target.value })}
                      placeholder="Ex: 9"
                      className="w-full px-4 py-3 bg-white dark:bg-black/60 border border-zinc-200 dark:border-white/10 rounded-xl text-xs font-mono outline-none focus:border-[#9FC131]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                      ID Padrão do Médico
                    </label>
                    <input
                      type="text"
                      value={empresaChaves.medicalsys_id_medico || ""}
                      onChange={(e) => setEmpresaChaves({ ...empresaChaves, medicalsys_id_medico: e.target.value })}
                      placeholder="Ex: 1"
                      className="w-full px-4 py-3 bg-white dark:bg-black/60 border border-zinc-200 dark:border-white/10 rounded-xl text-xs font-mono outline-none focus:border-[#9FC131]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={empresaChaves.medicalsys_apikey || ""}
                      onChange={(e) => setEmpresaChaves({ ...empresaChaves, medicalsys_apikey: e.target.value })}
                      placeholder="API Key Medicalsys"
                      className="w-full px-4 py-3 bg-white dark:bg-black/60 border border-zinc-200 dark:border-white/10 rounded-xl text-xs font-mono outline-none focus:border-[#9FC131]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                      Customer API Key
                    </label>
                    <input
                      type="password"
                      value={empresaChaves.medicalsys_customer_apikey || ""}
                      onChange={(e) => setEmpresaChaves({ ...empresaChaves, medicalsys_customer_apikey: e.target.value })}
                      placeholder="Customer API Key Medicalsys"
                      className="w-full px-4 py-3 bg-white dark:bg-black/60 border border-zinc-200 dark:border-white/10 rounded-xl text-xs font-mono outline-none focus:border-[#9FC131]"
                    />
                  </div>
                </div>
              </div>

            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200/80 dark:border-white/10 flex-shrink-0">
              <button onClick={() => setSelectedEmpresa(null)} className="px-6 py-3 min-h-[48px] rounded-xl border border-zinc-200 dark:border-white/10 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSaveCompanyKeys} disabled={savingKeys} className="px-8 py-3 min-h-[48px] bg-zinc-950 hover:bg-black dark:bg-[#9FC131] dark:hover:bg-[#86a621] text-white dark:text-black text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg rounded-xl transition-all">
                {savingKeys ? <Activity size={14} className="animate-spin" /> : <Save size={14} />}
                {savingKeys ? "Salvando..." : "Salvar Todas as Chaves"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>   
  ); 
}
