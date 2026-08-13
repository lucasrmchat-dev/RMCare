"use client"; 

import { useState, useEffect, useMemo } from "react"; 
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
  ExternalLink,
  Search,
  Zap,
  Globe
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

export default function SuperAdminSistema() {   
  // ESTADO DE AUTENTICAÇÃO MASTER
  const [isAuthenticatedMaster, setIsAuthenticatedMaster] = useState(false);
  const [masterUser, setMasterUser] = useState("master");
  const [masterPass, setMasterPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // ABA ATIVA NO MASTER: "instancias" | "integracoes"
  const [activeMasterTab, setActiveMasterTab] = useState("integracoes");

  // ESTADO DO PAINEL MASTER
  const [empresas, setEmpresas] = useState([]);   
  const [searchEmpresa, setSearchEmpresa] = useState("");
  const [nome, setNome] = useState("");   
  const [slug, setSlug] = useState("");   
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);   

  // MODAL DE INSPEÇÃO E CONFIGURAÇÃO DA EMPRESA SELECIONADA
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
    auto_sync_cadence: "manual" // "manual" | "diario" | "semanal" | "mensal"
  });
  const [savingKeys, setSavingKeys] = useState(false);

  // TESTE DE PUSH RM CHAT
  const [testNumber, setTestNumber] = useState("5583999999999");
  const [testingPush, setTestingPush] = useState(false);
  const [testPushResult, setTestPushResult] = useState(null);

  useEffect(() => {     
    if (isAuthenticatedMaster) fetchEmpresas();   
  }, [isAuthenticatedMaster]);   

  async function fetchEmpresas() {     
    try { 
      const lista = await actionListarEmpresas();
      // Carrega os dados completos com config_chaves de cada empresa
      const { data: empresasComChaves } = await supabase
        .from("empresas")
        .select("id, nome, slug, created_at, config_chaves")
        .order("created_at", { ascending: false });

      setEmpresas(empresasComChaves || lista || []); 
    } catch (error) { 
      setFeedback(error.message); 
    }
  }   

  // LOGIN MASTER
  const handleMasterLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");

    try {
      const res = await authenticateUser({
        type: "admin",
        identificador: masterUser,
        password: masterPass
      });

      if (res.success) {
        setIsAuthenticatedMaster(true);
      } else {
        setLoginError(res.error || "Acesso negado ao Administrador Master.");
      }
    } catch (err) {
      setLoginError("Erro de autenticação master.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleProvisionar = async (e) => {     
    e.preventDefault();     
    if (!nome || !slug) return;     
    
    setLoading(true);     
    try {
      await actionProvisionarEmpresa({ nome, slug, usuario, senha });
      setNome("");       
      setSlug("");       
      setUsuario(""); setSenha(""); setFeedback("Ambiente e administrador criados com sucesso.");
      await fetchEmpresas();
    } catch (error) { setFeedback(error.message); }
    setLoading(false);   
  };

  // INSPEÇÃO / EDIÇÃO DA EMPRESA SELECIONADA
  const handleInspectCompany = async (emp) => {
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
    try {
      await actionSalvarChavesEmpresaMaster(selectedEmpresa.id, empresaChaves);
      setFeedback(`Configurações de integração salvas para "${selectedEmpresa.nome}"!`);
      await fetchEmpresas();
      setSelectedEmpresa(null);
    } catch (err) {
      setFeedback(`Erro ao salvar chaves: ${err.message}`);
    } finally {
      setSavingKeys(false);
    }
  };

  // TESTE EM TEMPO REAL DO PUSH NO RM CHAT
  const handleTestPush = async () => {
    if (!empresaChaves.rmchat_webhook_url) {
      setTestPushResult({ success: false, message: "Informe a URL do RM Chat para testar." });
      return;
    }
    setTestingPush(true);
    setTestPushResult(null);
    try {
      await actionTestarPushRmChat(empresaChaves.rmchat_webhook_url, testNumber, selectedEmpresa?.nome || "Teste RMCare");
      setTestPushResult({ success: true, message: "Notificação de teste enviada com sucesso ao servidor do RM Chat!" });
    } catch (err) {
      setTestPushResult({ success: false, message: `Falha no teste: ${err.message}` });
    } finally {
      setTestingPush(false);
    }
  };

  // Empresas Filtradas na Busca
  const empresasFiltradas = useMemo(() => {
    if (!searchEmpresa.trim()) return empresas;
    const term = searchEmpresa.toLowerCase().trim();
    return empresas.filter(
      (e) => e.nome?.toLowerCase().includes(term) || e.slug?.toLowerCase().includes(term)
    );
  }, [empresas, searchEmpresa]);

  // TELA DE LOGIN MASTER SE NÃO ESTIVER AUTENTICADO
  if (!isAuthenticatedMaster) {
    return (
      <main className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 relative font-sans antialiased">
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(159,193,49,.15),transparent_40%)] pointer-events-none" />
        
        <div className="max-w-md w-full bg-white/5 backdrop-blur-2xl border border-white/10 p-8 md:p-10 rounded-[2.5rem] shadow-2xl relative z-10 space-y-8">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-[#9FC131]/10 border border-[#9FC131]/30 text-[#9FC131] rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-[#9FC131]/10">
              <ShieldCheck size={32} />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Administrador Master</h1>
            <p className="text-xs text-zinc-400 font-medium leading-relaxed">
              Área de orquestração global do sistema. Autentique-se com credenciais de Administrador Sistema (Master).
            </p>
          </div>

          <form onSubmit={handleMasterLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Login Master</label>
              <input
                required
                type="text"
                value={masterUser}
                onChange={(e) => setMasterUser(e.target.value)}
                placeholder="master"
                className="w-full p-4 bg-black/50 border border-white/10 rounded-2xl text-sm font-medium outline-none text-white focus:border-[#9FC131] transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Senha Master</label>
              <input
                required
                type="password"
                value={masterPass}
                onChange={(e) => setMasterPass(e.target.value)}
                placeholder="••••••••"
                className="w-full p-4 bg-black/50 border border-white/10 rounded-2xl text-sm font-medium outline-none text-white focus:border-[#9FC131] transition-all"
              />
            </div>

            {loginError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-2xl">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-4 bg-[#9FC131] hover:bg-[#86a621] text-black font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-[#9FC131]/20 flex items-center justify-center gap-2 active:scale-98"
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
    <main className="min-h-screen bg-[#0A0A0A] text-white antialiased">       
      <AdminSessionBar />
      
      <div className="w-full px-6 lg:px-10 py-8 space-y-8 relative z-10 max-w-7xl mx-auto">
        
        {/* HEADER MASTER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-8">         
          <div>           
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#9FC131] to-[#7a9622] rounded-2xl flex items-center justify-center shadow-lg shadow-[#9FC131]/20">
                <LayoutDashboard size={24} className="text-black" />
              </div>
              Painel de Sistema · Integrações & SaaS
            </h1>           
            <p className="text-sm text-zinc-400 font-medium mt-2">
              Gerenciamento multi-tenant de instâncias e configuração individual de servidores de Push RM Chat.
            </p>         
          </div>         
          <div className="bg-[#9FC131]/10 border border-[#9FC131]/20 text-[#9FC131] px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm">           
            <ShieldCheck size={16} /> Master Root Ativo         
          </div>       
        </div>       

        {/* NAVEGAÇÃO POR ABAS NO SISTEMA */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex p-1.5 bg-white/5 border border-white/10 rounded-2xl">
            <button
              onClick={() => setActiveMasterTab("integracoes")}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                activeMasterTab === "integracoes"
                  ? "bg-[#9FC131] text-black shadow-lg shadow-[#9FC131]/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <MessageSquare size={16} /> Integrações & Push RM Chat
            </button>
            <button
              onClick={() => setActiveMasterTab("instancias")}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                activeMasterTab === "instancias"
                  ? "bg-[#9FC131] text-black shadow-lg shadow-[#9FC131]/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Database size={16} /> Nova Instância / Provisionamento
            </button>
          </div>

          {/* BUSCA RÁPIDA DE EMPRESA */}
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchEmpresa}
              onChange={(e) => setSearchEmpresa(e.target.value)}
              placeholder="Buscar clínica / slug..."
              className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-[#9FC131] transition-all"
            />
          </div>
        </div>

        {feedback && (
          <div className="p-4 bg-[#9FC131]/10 border border-[#9FC131]/20 text-[#9FC131] text-xs font-bold rounded-2xl flex items-center justify-between">
            <span>{feedback}</span>
            <button onClick={() => setFeedback("")} className="text-zinc-400 hover:text-white"><X size={16} /></button>
          </div>
        )}

        {/* ============================================================ */}
        {/* ABA 1: INTEGRAÇÕES & PUSH RM CHAT INDIVIDUAL POR EMPRESA */}
        {/* ============================================================ */}
        {activeMasterTab === "integracoes" && (
          <div className="space-y-6">
            
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-[2rem] shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <MessageSquare className="text-[#9FC131]" size={20} /> Servidores de Push RM Chat & APIs por Clínica
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Cada clínica possui seu próprio servidor na RM Chat para envio automatizado de mensagens de WhatsApp.
                  </p>
                </div>
                <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-black/40 px-4 py-2 rounded-xl border border-white/10">
                  {empresasFiltradas.length} de {empresas.length} Clínicas
                </div>
              </div>

              {/* LISTA DE EMPRESAS EM CARDS DETALHADOS DE INTEGRAÇÃO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {empresasFiltradas.length === 0 ? (
                  <div className="col-span-2 py-12 text-center text-zinc-500 border border-dashed border-white/10 rounded-3xl">
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
                        className="p-6 bg-black/40 border border-white/10 hover:border-[#9FC131]/40 transition-all rounded-3xl space-y-5 group relative flex flex-col justify-between"
                      >
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3.5">
                              <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-[#9FC131] shadow-inner group-hover:scale-105 transition-transform">
                                <Building2 size={22} />
                              </div>
                              <div>
                                <h4 className="font-black text-base text-white">{emp.nome}</h4>
                                <p className="text-[11px] text-zinc-500 font-mono tracking-wider">/{emp.slug}</p>
                              </div>
                            </div>

                            <button
                              onClick={() => handleInspectCompany(emp)}
                              className="px-3.5 py-2 bg-[#9FC131] hover:bg-[#86a621] text-black rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md flex-shrink-0"
                            >
                              <Settings2 size={14} /> Configurar
                            </button>
                          </div>

                          {/* STATUS DAS CONEXÕES DA EMPRESA */}
                          <div className="space-y-2.5 pt-2 border-t border-white/5">
                            
                            {/* PUSH RM CHAT */}
                            <div className="p-3 bg-white/5 border border-white/5 rounded-2xl space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                                  <MessageSquare size={14} className="text-green-400" /> Servidor RM Chat (WhatsApp):
                                </span>
                                {hasCustomRmChat ? (
                                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 flex items-center gap-1">
                                    <CheckCircle2 size={10} /> Endpoint Próprio
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300">
                                    Padrão Global
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] font-mono text-zinc-400 truncate">
                                {chaves.rmchat_webhook_url || "Nenhum endpoint configurado (Pendente no Painel Master)"}
                              </p>
                            </div>

                            {/* MEDICALSYS E MERCADO PAGO BADGES */}
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <div className="p-2.5 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
                                <span className="text-zinc-400">Medicalsys ERP:</span>
                                <span className={`font-bold uppercase text-[9px] px-1.5 py-0.5 rounded ${hasMedicalsys ? 'text-blue-400 bg-blue-500/10' : 'text-zinc-500 bg-white/5'}`}>
                                  {hasMedicalsys ? 'Configurado' : 'Pendente'}
                                </span>
                              </div>

                              <div className="p-2.5 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
                                <span className="text-zinc-400">Mercado Pago:</span>
                                <span className={`font-bold uppercase text-[9px] px-1.5 py-0.5 rounded ${hasMercadoPago ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-500 bg-white/5'}`}>
                                  {hasMercadoPago ? 'Ativo' : 'Pendente'}
                                </span>
                              </div>
                            </div>

                          </div>
                        </div>

                        <div className="pt-3 flex items-center justify-between text-[10px] text-zinc-500 border-t border-white/5">
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

        {/* ============================================================ */}
        {/* ABA 2: PROVISIONAMENTO DE NOVAS INSTÂNCIAS */}
        {/* ============================================================ */}
        {activeMasterTab === "instancias" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">         
            
            {/* FORMULÁRIO DE PROVISIONAMENTO */}         
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-xl h-fit">           
              <div className="flex items-center gap-3 mb-6">
                  <Database className="text-[#9FC131]" size={20} />
                  <h3 className="font-black text-white text-sm uppercase tracking-widest">Nova Instância</h3>           
              </div>
              
              <form onSubmit={handleProvisionar} className="space-y-6">             
                <div className="space-y-2">               
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Nome da Organização</label>               
                  <input 
                    required 
                    type="text" 
                    value={nome} 
                    onChange={(e) => setNome(e.target.value)} 
                    placeholder="Ex: Clínica Gastro Prime" 
                    className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-sm font-medium outline-none text-white focus:border-[#9FC131] transition-all" 
                  />             
                </div>             
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Login do Administrador</label>
                  <input required value={usuario} onChange={(e) => setUsuario(e.target.value)} className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-sm text-white outline-none focus:border-[#9FC131]" placeholder="admin-clinica" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Senha Inicial</label>
                  <input required minLength={8} type="password" value={senha} onChange={(e) => setSenha(e.target.value)} className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-sm text-white outline-none focus:border-[#9FC131]" placeholder="Mínimo de 8 caracteres" />
                </div>
                <div className="space-y-2">               
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Slug da URL (Identificador)</label>               
                  <input 
                    required 
                    type="text" 
                    value={slug} 
                    onChange={(e) => setSlug(e.target.value)} 
                    placeholder="ex: gastro-prime" 
                    className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-sm font-medium outline-none text-white focus:border-[#9FC131] transition-all lowercase" 
                  />             
                </div>             

                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full py-4 mt-4 bg-[#9FC131] hover:bg-[#86a621] text-black font-black text-[12px] uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
                >               
                  {loading ? <Activity size={16} className="animate-spin" /> : <Plus size={16} />} 
                  {loading ? "Criando Ambiente..." : "Provisionar Empresa"}             
                </button>           
              </form>         
            </div>         

            {/* LISTAGEM SIMPLES DE INSTÂNCIAS */}         
            <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-xl flex flex-col">           
              <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                      <Server className="text-blue-400" size={20} />
                      <h3 className="font-black text-white text-sm uppercase tracking-widest">Ambientes Criados</h3>           
                  </div>
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                      {empresas.length} Instâncias
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4 max-h-[500px]">             
                {empresas.map(emp => (               
                  <div key={emp.id} className="p-5 bg-black/40 border border-white/5 hover:border-white/20 transition-colors rounded-2xl flex items-center justify-between gap-4">                 
                    <div className="flex items-center gap-4">                   
                      <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-[#9FC131]">
                          <Building2 size={20} />
                      </div>                   
                      <div>                     
                        <h4 className="font-black text-base text-white">{emp.nome}</h4>                     
                        <p className="text-[11px] text-zinc-500 font-mono tracking-wider">/{emp.slug}</p>                   
                      </div>                 
                    </div>                 

                    <button
                      onClick={() => handleInspectCompany(emp)}
                      className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
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

      {/* ============================================================ */}
      {/* MODAL MASTER DE CONFIGURAÇÃO DE INTEGRAÇÕES & PUSH RM CHAT */}
      {/* ============================================================ */}
      {selectedEmpresa && (
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center" onClick={() => setSelectedEmpresa(null)}>
          <div className="bg-[#111] border border-white/10 rounded-[2.5rem] p-6 sm:p-8 max-w-3xl w-full shadow-2xl space-y-6 text-white max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            
            {/* CABEÇALHO DO MODAL */}
            <div className="flex justify-between items-center border-b border-white/10 pb-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#9FC131]/20 text-[#9FC131] flex items-center justify-center">
                  <Settings2 size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black">{selectedEmpresa.nome}</h3>
                  <p className="text-xs text-zinc-400">Configuração de APIs, Webhooks de Push e credenciais do ambiente.</p>
                </div>
              </div>
              <button onClick={() => setSelectedEmpresa(null)} className="p-2 text-zinc-400 hover:text-white rounded-full">
                <X size={20} />
              </button>
            </div>

            {/* CORPO DO MODAL COM ROLAGEM */}
            <div className="space-y-6 overflow-y-auto custom-scrollbar pr-2 flex-1">
              
              {/* 1. SEÇÃO PRINCIPAL: SERVIDOR PUSH RM CHAT (WHATSAPP) */}
              <div className="p-6 bg-gradient-to-br from-green-950/30 to-black/60 border border-green-500/30 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={18} className="text-green-400" />
                    <h4 className="text-sm font-black text-green-300 uppercase tracking-widest">
                      Endpoint de Push · RM Chat API (WhatsApp)
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase bg-black/50 px-3 py-1 rounded-full border border-white/10">
                    Específico por Empresa
                  </span>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed">
                  Defina o link completo do webhook de push da RM Chat exclusivo para <strong>{selectedEmpresa.nome}</strong>. Todas as notificações e disparos da fila desta clínica serão roteados para este endpoint.
                </p>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                    URL do Servidor / Webhook Push da RM Chat:
                  </label>
                  <input
                    type="url"
                    value={empresaChaves.rmchat_webhook_url || ""}
                    onChange={(e) => setEmpresaChaves({ ...empresaChaves, rmchat_webhook_url: e.target.value })}
                    placeholder="https://acessoapi.rmchat.com.br/w/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="w-full p-4 bg-black/60 border border-green-500/30 rounded-2xl text-xs font-mono text-green-200 outline-none focus:border-green-400 transition-all placeholder:text-zinc-600"
                  />
                </div>

                {/* TESTE EM TEMPO REAL DE CONEXÃO DO RM CHAT */}
                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={testNumber}
                      onChange={(e) => setTestNumber(e.target.value)}
                      placeholder="Telefone de teste (Ex: 5583999999999)"
                      className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-xs font-mono text-zinc-200 outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleTestPush}
                    disabled={testingPush || !empresaChaves.rmchat_webhook_url}
                    className="px-5 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 flex-shrink-0 shadow-md"
                  >
                    {testingPush ? <Activity size={14} className="animate-spin" /> : <Send size={14} />}
                    {testingPush ? "Testando..." : "Testar Push no Servidor"}
                  </button>
                </div>

                {testPushResult && (
                  <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    testPushResult.success ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                  }`}>
                    {testPushResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span>{testPushResult.message}</span>
                  </div>
                )}
              </div>

              {/* 2. CADÊNCIA DE SINCRONIZAÇÃO AUTOMÁTICA */}
              <div className="p-5 bg-black/40 border border-white/10 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-[#9FC131] uppercase tracking-widest flex items-center gap-2">
                  <Clock size={16} /> Cadência de Sincronização Automática
                </h4>
                <select
                  value={empresaChaves.auto_sync_cadence || "manual"}
                  onChange={(e) => setEmpresaChaves({ ...empresaChaves, auto_sync_cadence: e.target.value })}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white outline-none"
                >
                  <option value="manual">Apenas Manual (Botão na Clínica)</option>
                  <option value="diario">Diariamente (Automático via Cron)</option>
                  <option value="semanal">Semanalmente (Automático via Cron)</option>
                  <option value="mensal">Mensalmente (Automático via Cron)</option>
                </select>
              </div>

              {/* 3. MERCADO PAGO */}
              <div className="p-5 bg-black/40 border border-white/10 rounded-2xl space-y-4">
                <h4 className="text-xs font-bold text-[#9FC131] uppercase tracking-widest flex items-center gap-2">
                  <CreditCard size={16} /> Mercado Pago Credentials
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase tracking-widest block mb-1">Public Key</label>
                    <input
                      type="text"
                      value={empresaChaves.mp_public_key || ""}
                      onChange={(e) => setEmpresaChaves({ ...empresaChaves, mp_public_key: e.target.value })}
                      placeholder="APP_USR-..."
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase tracking-widest block mb-1">Access Token</label>
                    <input
                      type="password"
                      value={empresaChaves.mp_access_token || ""}
                      onChange={(e) => setEmpresaChaves({ ...empresaChaves, mp_access_token: e.target.value })}
                      placeholder="APP_USR-..."
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 4. MEDICALSYS */}
              <div className="p-5 bg-black/40 border border-white/10 rounded-2xl space-y-4">
                <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                  <Server size={16} /> Medicalsys API & IDs
                </h4>
                
                <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                  <span className="text-xs font-bold text-zinc-300">Envio Automático ao Medicalsys</span>
                  <input
                    type="checkbox"
                    checked={Boolean(empresaChaves.medicalsys_enabled)}
                    onChange={(e) => setEmpresaChaves({ ...empresaChaves, medicalsys_enabled: e.target.checked })}
                    className="w-5 h-5 accent-[#9FC131]"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase tracking-widest block mb-1">ID da Clínica (id_clinica)</label>
                    <input
                      type="text"
                      value={empresaChaves.medicalsys_id_clinica || ""}
                      onChange={(e) => setEmpresaChaves({ ...empresaChaves, medicalsys_id_clinica: e.target.value })}
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase tracking-widest block mb-1">ID do Médico (medico)</label>
                    <input
                      type="text"
                      value={empresaChaves.medicalsys_id_medico || ""}
                      onChange={(e) => setEmpresaChaves({ ...empresaChaves, medicalsys_id_medico: e.target.value })}
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] text-zinc-400 uppercase tracking-widest block mb-1">apikey</label>
                    <input
                      type="text"
                      value={empresaChaves.medicalsys_apikey || ""}
                      onChange={(e) => setEmpresaChaves({ ...empresaChaves, medicalsys_apikey: e.target.value })}
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-white outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] text-zinc-400 uppercase tracking-widest block mb-1">msys-costumer-apikey</label>
                    <input
                      type="text"
                      value={empresaChaves.medicalsys_customer_apikey || ""}
                      onChange={(e) => setEmpresaChaves({ ...empresaChaves, medicalsys_customer_apikey: e.target.value })}
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-white outline-none"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* RODAPÉ DO MODAL */}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10 flex-shrink-0">
              <button onClick={() => setSelectedEmpresa(null)} className="px-6 py-3 rounded-xl border border-white/10 text-xs font-bold text-zinc-400 uppercase">
                Cancelar
              </button>
              <button onClick={handleSaveCompanyKeys} disabled={savingKeys} className="px-8 py-3 rounded-xl bg-[#9FC131] hover:bg-[#86a621] text-black text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-[#9FC131]/20">
                {savingKeys ? <Activity size={14} className="animate-spin" /> : <Save size={14} />}
                {savingKeys ? "Salvando..." : "Salvar Configurações"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>   
  ); 
}
