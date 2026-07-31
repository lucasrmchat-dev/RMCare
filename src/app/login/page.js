"use client"; 

import { useState } from "react"; 
import { useRouter } from "next/navigation"; 
import { motion, AnimatePresence } from "framer-motion"; 
import { ArrowRight, CheckCircle, AlertCircle, ArrowLeft, ShieldCheck, LockKeyhole } from "lucide-react"; 
import Navbar from "@/components/Navbar"; 
import { checkIdentifier, authenticateUser } from "@/actions/auth";

export default function LoginUnificado() {   
  const router = useRouter();   

  const [step, setStep] = useState(1);    
  const [identificador, setIdentificador] = useState("");   
  const [role, setRole] = useState(null);    
  const [password, setPassword] = useState("");   
  const [birthDate, setBirthDate] = useState("");   
  const [pacienteId, setPacienteId] = useState(null);   
  const [isDefiningPassword, setIsDefiningPassword] = useState(false);   
  const [loading, setLoading] = useState(false);   
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });   

  const showMsg = (type, text) => {     
    setStatusMsg({ type, text });     
    setTimeout(() => setStatusMsg({ type: "", text: "" }), 5000);   
  };   

  const handleVoltar = () => {     
    setStep(1);     
    setRole(null);     
    setPassword("");     
    setBirthDate("");     
    setIsDefiningPassword(false);     
    setPacienteId(null);   
  };   

  const handleIdentify = async (e) => {     
    e.preventDefault();     
    setLoading(true);     
    const result = await checkIdentifier(identificador);     
    
    if (!result.success) {       
      showMsg("error", result.error);       
      setLoading(false);       
      return;     
    }     
    
    if (result.type === "admin") {       
      setRole(result.role);        
      setStep(2);     
    } else if (result.type === "paciente") {       
      setPacienteId(result.id);       
      setRole("paciente");       
      setIsDefiningPassword(result.isDefiningPassword);              
      
      if (result.isDefiningPassword) {         
        showMsg("info", "Primeiro acesso detectado! Confirme sua data de nascimento para criar sua senha.");       
      }       
      setStep(2);     
    }     
    setLoading(false);   
  };   

  const handleAuth = async (e) => {     
    e.preventDefault();     
    setLoading(true);     
    const result = await authenticateUser({       
      type: role === "paciente" ? "paciente" : "admin",       
      id: pacienteId,       
      role: role,       
      password: password,       
      birthDate: birthDate,       
      isDefiningPassword: isDefiningPassword,       
      identificador: identificador     
    });     
    
    if (!result.success) {       
      showMsg("error", result.error);       
      setLoading(false);       
      return;     
    }     
    
    showMsg("success", result.message);     
    
    if (role === "paciente") {       
      setTimeout(() => router.push("/paciente/dashboard"), 1000);     
    } else if (role === "sistema") {       
      setTimeout(() => router.push("/admin/sistema"), 1000);
    } else {       
      setTimeout(() => router.push("/admin/empresa"), 1000);
    }     
  };   

  return (     
    <main className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-6 antialiased selection:bg-[#9FC131] selection:text-white relative overflow-hidden">       
      <Navbar />       
      
      {/* Background Decorativo Premium */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#9FC131]/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[420px] bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-[0_40px_80px_rgba(0,0,0,0.4)] p-8 relative z-10">                  
        
        <div className="flex justify-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-[#9FC131] to-[#7a9622] rounded-2xl flex items-center justify-center shadow-lg shadow-[#9FC131]/20">
                <ShieldCheck size={28} className="text-black" />
            </div>
        </div>

        <AnimatePresence mode="wait">           
          {statusMsg.text && (             
            <motion.div               
              initial={{ opacity: 0, y: -10 }}               
              animate={{ opacity: 1, y: 0 }}               
              exit={{ opacity: 0, y: -10 }}               
              className={`p-4 rounded-2xl text-[13px] font-medium mb-6 flex items-start gap-3 border ${                 
                statusMsg.type === "error" ? "bg-red-500/10 border-red-500/20 text-red-400"                  
                : statusMsg.type === "success" ? "bg-[#9FC131]/10 border-[#9FC131]/20 text-[#9FC131]"                  
                : "bg-blue-500/10 border-blue-500/20 text-blue-400"               
              }`}             
            >               
              <div className="mt-0.5">
                {statusMsg.type === "error" ? <AlertCircle size={16} /> : <CheckCircle size={16} />}               
              </div>
              <span className="leading-relaxed">{statusMsg.text}</span>             
            </motion.div>           
          )}         
        </AnimatePresence>         

        <AnimatePresence mode="wait">           
          {step === 1 && (             
            <motion.form               
              key="step1"               
              onSubmit={handleIdentify}               
              initial={{ opacity: 0, x: -20 }}               
              animate={{ opacity: 1, x: 0 }}               
              exit={{ opacity: 0, x: -20 }}               
              className="space-y-6"             
            >               
              <div className="text-center">                 
                <h3 className="text-2xl font-black text-white tracking-tight">Portal Seguro</h3>                 
                <p className="text-sm text-zinc-400 font-medium mt-2">Identifique-se para acessar seu ambiente.</p>               
              </div>               
              
              <div className="space-y-2">                 
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest ml-1">                   
                  CPF ou Usuário                 
                </label>                 
                <input                   
                  required                   
                  type="text"                   
                  value={identificador}                   
                  onChange={(e) => setIdentificador(e.target.value)}                   
                  placeholder="Digite aqui..."                   
                  className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl font-medium outline-none focus:border-[#9FC131] focus:ring-1 focus:ring-[#9FC131] text-white transition-all placeholder:text-zinc-700"                 
                />               
              </div>               
              
              <button                 
                disabled={loading}                 
                type="submit"                 
                className="w-full py-4 mt-2 bg-white hover:bg-zinc-200 text-black font-black text-[13px] uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"               
              >                 
                {loading ? "Verificando..." : "Continuar"} {!loading && <ArrowRight size={16} />}               
              </button>             
            </motion.form>           
          )}           

          {step === 2 && (             
            <motion.form               
              key="step2"               
              onSubmit={handleAuth}               
              initial={{ opacity: 0, x: 20 }}               
              animate={{ opacity: 1, x: 0 }}               
              exit={{ opacity: 0, x: 20 }}               
              className="space-y-6"             
            >               
              <div className="text-center relative">                 
                <button                    
                  type="button"                    
                  onClick={handleVoltar}                    
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all"                 
                >                   
                  <ArrowLeft size={18} />                 
                </button>                 
                <h3 className="text-2xl font-black text-white tracking-tight ml-10">                   
                  {isDefiningPassword ? "Nova Senha" : "Autenticação"}                 </h3>                 
              </div>               
              
              {isDefiningPassword && (                 
                <div className="space-y-2">                   
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest ml-1">                     
                    Confirme sua Data de Nascimento                   
                  </label>                   
                  <input                     
                    required                     
                    type="date"                     
                    value={birthDate}                     
                    onChange={(e) => setBirthDate(e.target.value)}                     
                    className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl font-medium outline-none focus:border-[#9FC131] focus:ring-1 focus:ring-[#9FC131] text-white transition-all [color-scheme:dark]"                   
                  />                 
                </div>               
              )}               
              
              <div className="space-y-2">                 
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-2">                   
                  <LockKeyhole size={14}/> {isDefiningPassword ? "Crie sua Senha" : "Senha de Acesso"}                 
                </label>                 
                <input                   
                  required                   
                  type="password"                   
                  value={password}                   
                  onChange={(e) => setPassword(e.target.value)}                   
                  placeholder="••••••••"                   
                  className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl font-medium outline-none focus:border-[#9FC131] focus:ring-1 focus:ring-[#9FC131] text-white transition-all placeholder:text-zinc-700 tracking-widest"                 
                />               
              </div>               
              
              <button                 
                disabled={loading}                 
                type="submit"                 
                className={`w-full py-4 mt-2 font-black text-[13px] uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center shadow-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] ${                   
                  isDefiningPassword ? "bg-[#9FC131] hover:bg-[#8ab01c] text-black" : "bg-white hover:bg-zinc-200 text-black"                 
                }`}               
              >                 
                {loading ? "Processando..." : isDefiningPassword ? "Ativar minha Conta" : "Entrar no Sistema"}               
              </button>             
            </motion.form>           
          )}         
        </AnimatePresence>       
      </div>     
      
      <div className="absolute bottom-6 text-center w-full text-zinc-600 text-xs font-medium pointer-events-none">
          Ambiente protegido e criptografado.
      </div>
    </main>   
  ); 
}