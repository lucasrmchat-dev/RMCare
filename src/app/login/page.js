"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
  LockKeyhole,
  Activity,
  Eye,
  EyeOff
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { checkIdentifier, authenticateUser } from "@/actions/auth";
import { playDopamineSound, triggerConfetti, triggerHaptic } from "@/lib/dopamine";

const spring = { type: "spring", stiffness: 420, damping: 30 };

export default function LoginUnificado() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [identificador, setIdentificador] = useState("");
  const [role, setRole] = useState(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [pacienteId, setPacienteId] = useState(null);
  const [isDefiningPassword, setIsDefiningPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });

  const showMsg = (type, text) => {
    setStatusMsg({ type, text });
    if (type === "error") {
      playDopamineSound("error");
      triggerHaptic("error");
    }
    setTimeout(() => setStatusMsg({ type: "", text: "" }), 5000);
  };

  const handleVoltar = () => {
    playDopamineSound("click");
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
    playDopamineSound("click");
    triggerHaptic("light");

    const result = await checkIdentifier(identificador);

    if (!result.success) {
      showMsg("error", result.error);
      setLoading(false);
      return;
    }

    playDopamineSound("step");
    triggerHaptic("medium");

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
    playDopamineSound("click");
    triggerHaptic("light");

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

    playDopamineSound("success");
    triggerConfetti({ count: 80 });
    triggerHaptic("success");
    showMsg("success", result.message);

    const targetRole = result.role || role;
    setTimeout(() => {
      if (targetRole === "paciente") {
        router.push("/paciente/dashboard");
      } else if (targetRole === "sistema") {
        router.push("/admin/sistema");
      } else {
        router.push("/admin/empresa");
      }
    }, 600);
  };

  return (
    <main className="min-h-[100dvh] bg-[#060A12] text-white flex flex-col items-center justify-center p-6 antialiased selection:bg-[#9FC131] selection:text-black relative overflow-hidden font-sans">
      <Navbar />

      <div className="absolute top-[-15%] left-[-10%] w-[550px] h-[550px] rounded-full bg-[#9FC131]/15 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[550px] h-[550px] rounded-full bg-blue-600/10 blur-[140px] pointer-events-none" />

      <div className="w-full max-w-[420px] bg-white/[0.06] dark:bg-[#0c0f17]/70 backdrop-blur-3xl saturate-150 border border-white/10 rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] p-8 sm:p-10 relative z-10 space-y-6">
        <div className="flex justify-center mb-2">
          <div className="w-14 h-14 bg-gradient-to-br from-[#9FC131] to-[#7a9622] rounded-2xl flex items-center justify-center shadow-lg shadow-[#9FC131]/25 border border-white/20">
            <ShieldCheck size={28} className="text-black" strokeWidth={2.5} />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {statusMsg.text && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-2xl text-xs font-semibold flex items-start gap-3 border ${
                statusMsg.type === "error"
                  ? "bg-red-500/15 border-red-500/25 text-red-300"
                  : statusMsg.type === "success"
                  ? "bg-[#9FC131]/15 border-[#9FC131]/30 text-[#9FC131]"
                  : "bg-blue-500/15 border-blue-500/25 text-blue-300"
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
              transition={spring}
              className="space-y-6"
            >
              <div className="text-center space-y-1.5">
                <h2 className="text-2xl font-black text-white tracking-tight">Portal Seguro</h2>
                <p className="text-xs text-zinc-400 font-medium">Identifique-se para acessar seu ambiente.</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                  CPF ou Usuário de Acesso
                </label>
                <input
                  required
                  type="text"
                  value={identificador}
                  onChange={(e) => setIdentificador(e.target.value)}
                  placeholder="Digite aqui..."
                  className="w-full min-h-[48px] px-4 py-3.5 bg-black/50 border border-white/10 rounded-2xl font-medium outline-none focus:border-[#9FC131] focus:ring-2 focus:ring-[#9FC131]/20 text-white text-sm transition-all placeholder:text-zinc-600"
                />
              </div>

              <button
                disabled={loading || !identificador.trim()}
                type="submit"
                className="w-full min-h-[48px] bg-white hover:bg-zinc-200 text-black font-extrabold text-xs uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {loading ? <Activity size={16} className="animate-spin" /> : "Continuar"}
                {!loading && <ArrowRight size={16} />}
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
              transition={spring}
              className="space-y-6"
            >
              <div className="text-center relative">
                <button
                  type="button"
                  onClick={handleVoltar}
                  aria-label="Voltar ao passo anterior"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <ArrowLeft size={18} />
                </button>
                <h2 className="text-2xl font-black text-white tracking-tight ml-8">
                  {isDefiningPassword ? "Criar Senha" : "Autenticação"}
                </h2>
              </div>

              {isDefiningPassword && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                    Confirme sua Data de Nascimento
                  </label>
                  <input
                    required
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full min-h-[48px] px-4 py-3.5 bg-black/50 border border-white/10 rounded-2xl font-medium outline-none focus:border-[#9FC131] focus:ring-2 focus:ring-[#9FC131]/20 text-white text-sm transition-all [color-scheme:dark]"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                  <LockKeyhole size={13} /> {isDefiningPassword ? "Nova Senha de Acesso" : "Senha de Acesso"}
                </label>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full min-h-[48px] px-4 py-3.5 pr-12 bg-black/50 border border-white/10 rounded-2xl font-medium outline-none focus:border-[#9FC131] focus:ring-2 focus:ring-[#9FC131]/20 text-white text-sm transition-all placeholder:text-zinc-600 tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 rounded-lg"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                disabled={loading || !password}
                type="submit"
                className={`w-full min-h-[48px] font-extrabold text-xs uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] ${
                  isDefiningPassword
                    ? "bg-[#9FC131] hover:bg-[#8ab01c] text-black shadow-[#9FC131]/20"
                    : "bg-white hover:bg-zinc-200 text-black"
                }`}
              >
                {loading ? (
                  <Activity size={16} className="animate-spin" />
                ) : isDefiningPassword ? (
                  "Ativar Minha Conta"
                ) : (
                  "Entrar no Sistema"
                )}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      <div className="absolute bottom-6 text-center w-full text-zinc-600 text-xs font-medium pointer-events-none">
        Ambiente protegido e criptografado com conformidade LGPD.
      </div>
    </main>
  );
}
