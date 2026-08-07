"use client"; 

import { useState, useEffect } from "react"; 
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
  Clock
} from "lucide-react"; 
import AdminSessionBar from "@/components/AdminSessionBar";
import { actionListarEmpresas, actionProvisionarEmpresa } from "@/actions/adminData";
import { authenticateUser } from "@/actions/auth";
import { supabase } from "@/lib/supabase";

export default function SuperAdminSistema() {   
  // ESTADO DE AUTENTICAÇÃO MASTER
  const [isAuthenticatedMaster, setIsAuthenticatedMaster] = useState(false);
  const [masterUser, setMasterUser] = useState("master");
  const [masterPass, setMasterPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // ESTADO DO PAINEL MASTER
  const [empresas, setEmpresas] = useState([]);   
  const [nome, setNome] = useState("");   
  const [slug, setSlug] = useState("");   
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);   

  // MODAL DE INSPEÇÃO E CONFIGURAÇÃO DA EMPRESA SELECIONADA
  const [selectedEmpresa, setSelectedEmpresa] = useState(null);
  const [empresaChaves, setEmpresaChaves] = useState({
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

  useEffect(() => {     
    if (isAuthenticatedMaster) fetchEmpresas();   
  }, [isAuthenticatedMaster]);   

  async function fetchEmpresas() {     
    try { setEmpresas(await actionListarEmpresas()); } catch (error) { setFeedback(error.message); }
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

  // INSPECTION DA EMPRESA SELECIONADA
  const handleInspectCompany = async (emp) => {
    setSelectedEmpresa(emp);
    try {
      const { data } = await supabase.from("empresas").select("config_chaves").eq("id", emp.id).single();
      if (data && data.config_chaves) {
        setEmpresaChaves((prev) => ({ ...prev, ...data.config_chaves }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveCompanyKeys = async () => {
    if (!selectedEmpresa) return;
    setSavingKeys(true);
    try {
      const { error } = await supabase
        .from("empresas")
        .update({ config_chaves: empresaChaves })
        .eq("id", selectedEmpresa.id);

      if (error) throw error;
      setFeedback(`Configurações de API salvas para "${selectedEmpresa.nome}"!`);
      setSelectedEmpresa(null);
    } catch (err) {
      setFeedback(`Erro ao salvar chaves: ${err.message}`);
    } finally {
      setSavingKeys(false);
    }
  };

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
      
      <div className="w-full px-6 lg:px-10 py-8 space-y-10 relative z-10 max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-8">         
          <div>           
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#9FC131] to-[#7a9622] rounded-2xl flex items-center justify-center shadow-lg shadow-[#9FC131]/20">
                <LayoutDashboard size={24} className="text-black" />
              </div>
              Master Provisioning & API Config
            </h1>           
            <p className="text-sm text-zinc-400 font-medium mt-2">Painel global de orquestração de instâncias e chaves de integrações (SaaS).</p>         
          </div>         
          <div className="bg-[#9FC131]/10 border border-[#9FC131]/20 text-[#9FC131] px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm">           
            <ShieldCheck size={16} /> Status: Master Root Active         
          </div>       
        </div>       
        
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
                  placeholder="Ex: Clínica Saúde Prime" 
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
                  placeholder="ex: saude-prime" 
                  className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-sm font-medium outline-none text-white focus:border-[#9FC131] transition-all lowercase" 
                />             
              </div>             
              
              {feedback && <p role="status" className="text-xs text-[#9FC131] font-bold">{feedback}</p>}

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full py-4 mt-4 bg-white hover:bg-zinc-200 text-black font-black text-[12px] uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
              >               
                {loading ? <Activity size={16} className="animate-spin" /> : <Plus size={16} />} 
                {loading ? "Criando Ambiente..." : "Provisionar Empresa"}             
              </button>           
            </form>         
          </div>         

          {/* LISTA DE EMPRESAS AMBIENTES COM INSPEÇÃO DE CHAVES API */}         
          <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-xl flex flex-col">           
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <Server className="text-blue-400" size={20} />
                    <h3 className="font-black text-white text-sm uppercase tracking-widest">Ambientes e Integrações Monitoradas</h3>           
                </div>
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                    {empresas.length} {empresas.length === 1 ? 'Instância' : 'Instâncias'}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4 max-h-[500px]">             
              {empresas.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500 py-10 border border-dashed border-white/10 rounded-3xl">
                    <Building2 size={32} className="mb-4 opacity-40" />
                    <p className="text-sm font-medium">Nenhum ambiente provisionado ainda.</p>
                </div>
              ) : empresas.map(emp => (               
                <div key={emp.id} className="p-5 bg-black/40 border border-white/5 hover:border-white/20 transition-colors rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">                 
                  <div className="flex items-center gap-4">                   
                    <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-[#9FC131] shadow-inner group-hover:scale-105 transition-transform">
                        <Building2 size={20} />
                    </div>                   
                    <div>                     
                      <h4 className="font-black text-base text-white">{emp.nome}</h4>                     
                      <p className="text-[11px] text-zinc-500 font-mono tracking-wider uppercase">/{emp.slug}</p>                   
                    </div>                 
                  </div>                 

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleInspectCompany(emp)}
                      className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
                    >
                      <Settings2 size={14} /> Inspeção & Chaves API
                    </button>               
                  </div>
                </div>             
              ))}           
            </div>         
          </div>       
        </div>
      </div>     

      {/* MODAL DE INSPEÇÃO E CONFIGURAÇÃO DE CHAVES DA EMPRESA */}
      {selectedEmpresa && (
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md p-6 flex items-center justify-center" onClick={() => setSelectedEmpresa(null)}>
          <div className="bg-[#111] border border-white/10 rounded-[2.5rem] p-8 max-w-2xl w-full shadow-2xl space-y-6 text-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#9FC131]/20 text-[#9FC131] flex items-center justify-center">
                  <Settings2 size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black">{selectedEmpresa.nome}</h3>
                  <p className="text-xs text-zinc-400">Inspecionar e alterar configurações de API e chaves do ambiente.</p>
                </div>
              </div>
              <button onClick={() => setSelectedEmpresa(null)} className="p-2 text-zinc-400 hover:text-white rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
              
              {/* CADÊNCIA DE SINCRONIZAÇÃO AUTOMÁTICA */}
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

              {/* MERCADO PAGO */}
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

              {/* MEDICALSYS */}
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

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button onClick={() => setSelectedEmpresa(null)} className="px-6 py-3 rounded-xl border border-white/10 text-xs font-bold text-zinc-400 uppercase">
                Cancelar
              </button>
              <button onClick={handleSaveCompanyKeys} disabled={savingKeys} className="px-8 py-3 rounded-xl bg-[#9FC131] hover:bg-[#86a621] text-black text-xs font-black uppercase tracking-widest flex items-center gap-2">
                {savingKeys ? <Activity size={14} className="animate-spin" /> : <Save size={14} />}
                {savingKeys ? "Salvando..." : "Salvar Chaves API"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>   
  ); 
}
