"use client";

import { useState, useMemo, useEffect } from "react";
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
  EyeOff,
  Sparkles,
  KeyRound,
  Check,
  X
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { checkIdentifier, authenticateUser, actionRedefinirSenhaPrimeiroAcesso, getSessionAdminInfo } from "@/actions/auth";
import { playDopamineSound, triggerConfetti, triggerHaptic } from "@/lib/dopamine";

const spring = { type: "spring", stiffness: 420, damping: 30 };

export default function LoginUnificado() {
  const router = useRouter();

  const [step, setStep] = useState(1); // 1: Identificação, 2: Senha / Nascimento, 3: Redefinir Senha Primeiro Acesso
  const [identificador, setIdentificador] = useState("");
  const [role, setRole] = useState(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [pacienteId, setPacienteId] = useState(null);
  const [isDefiningPassword, setIsDefiningPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });

  // Estados específicos para Redefinição no Primeiro Acesso (Admin)
  const [resetUser, setResetUser] = useState("");
  const [resetNewPass, setResetNewPass] = useState("");
  const [resetConfirmPass, setResetConfirmPass] = useState("");
  const [showResetNewPass, setShowResetNewPass] = useState(false);
  const [showResetConfirmPass, setShowResetConfirmPass] = useState(false);

  // Verificação de sessão já ativa ao carregar a página (evita re-digitar senha se já logado)
  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        const info = await getSessionAdminInfo();
        if (info) {
          if (info.role === "sistema") {
            window.location.replace("/admin/sistema");
          } else {
            window.location.replace("/admin/empresa");
          }
        }
      } catch (e) {
        // Sem sessão ativa, continua no login
      }
    };
    checkActiveSession();
  }, []);

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
    setResetUser("");
    setResetNewPass("");
    setResetConfirmPass("");
  };

  // Cálculo das regras e progresso percentual de segurança de senha
  const passwordSecurityMetrics = useMemo(() => {
    const pwd = resetNewPass || "";
    const confirm = resetConfirmPass || "";

    const ruleMinLength = pwd.length >= 8;
    const ruleHasUpper = /[A-Z]/.test(pwd);
    const ruleHasLower = /[a-z]/.test(pwd);
    const ruleHasDigit = /\d/.test(pwd);
    const ruleHasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\|,.<>\/?]/.test(pwd);
    const ruleMatch = pwd.length > 0 && confirm.length > 0 && pwd === confirm;

    let percent = 0;
    if (ruleMinLength) percent += 20;
    if (ruleHasUpper) percent += 20;
    if (ruleHasLower) percent += 20;
    if (ruleHasDigit) percent += 15;
    if (ruleHasSpecial) percent += 15;
    if (ruleMatch) percent += 10;

    return {
      ruleMinLength,
      ruleHasUpper,
      ruleHasLower,
      ruleHasDigit,
      ruleHasSpecial,
      ruleMatch,
      percent,
      isValid: percent === 100
    };
  }, [resetNewPass, resetConfirmPass]);

  const handleIdentify = async (e) => {
    e.preventDefault();
    setLoading(true);
    playDopamineSound("click");
    triggerHaptic("light");

    try {
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
        setResetUser(identificador.trim().toLowerCase());
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
    } catch (err) {
      showMsg("error", "Erro ao verificar identificador.");
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    playDopamineSound("click");
    triggerHaptic("light");

    try {
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

      // Se o usuário administrativo precisa redefinir a senha provisória no primeiro acesso
      if (result.mustResetPassword) {
        playDopamineSound("unlock");
        triggerHaptic("medium");
        setResetUser(result.usuario || identificador.trim().toLowerCase());
        setStep(3);
        showMsg("info", "Primeiro acesso detectado! Crie sua nova senha segura para continuar.");
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
          window.location.replace("/paciente/dashboard");
        } else if (targetRole === "sistema") {
          window.location.replace("/admin/sistema");
        } else {
          window.location.replace("/admin/empresa");
        }
      }, 400);
    } catch (err) {
      showMsg("error", "Falha no processo de autenticação.");
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarRedefinicaoPrimeiroAcesso = async (e) => {
    e.preventDefault();
    if (!passwordSecurityMetrics.isValid) {
      showMsg("error", "Atenda a 100% dos requisitos de segurança para salvar sua nova senha.");
      return;
    }

    setLoading(true);
    playDopamineSound("click");
    triggerHaptic("medium");

    try {
      const result = await actionRedefinirSenhaPrimeiroAcesso({
        usuario: resetUser || identificador.trim().toLowerCase(),
        novaSenha: resetNewPass
      });

      if (!result.success) {
        showMsg("error", result.error);
        setLoading(false);
        return;
      }

      playDopamineSound("success");
      triggerConfetti({ count: 120 });
      triggerHaptic("success");
      showMsg("success", "Senha redefinida com sucesso! Acessando seu painel...");

      setTimeout(() => {
        if (result.role === "sistema") {
          window.location.replace("/admin/sistema");
        } else {
          window.location.replace("/admin/empresa");
        }
      }, 500);
    } catch (err) {
      showMsg("error", `Erro ao salvar nova senha: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-[#060A12] text-white flex flex-col items-center justify-center p-4 sm:p-6 antialiased relative overflow-hidden font-sans">
      <Navbar />

      <div className="absolute top-[-15%] left-[-10%] w-[550px] h-[550px] rounded-full bg-[#9FC131]/15 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[550px] h-[550px] rounded-full bg-blue-600/10 blur-[140px] pointer-events-none" />

      <div className="w-full max-w-[440px] bg-white/[0.06] dark:bg-[#0c0f17]/70 backdrop-blur-3xl saturate-150 border border-white/10 rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] p-7 sm:p-9 relative z-10 space-y-6">
        <div className="flex justify-center mb-1">
          <div className="w-14 h-14 bg-gradient-to-br from-[#9FC131] to-[#7a9622] rounded-2xl flex items-center justify-center shadow-lg shadow-[#9FC131]/25 border border-white/20">
            {step === 3 ? (
              <KeyRound size={26} className="text-black" strokeWidth={2.5} />
            ) : (
              <ShieldCheck size={28} className="text-black" strokeWidth={2.5} />
            )}
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
          {/* PASSO 1: IDENTIFICAÇÃO UNIFICADA (PACIENTES, CLÍNICAS & SUPER MASTER) */}
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
                <p className="text-xs text-zinc-400 font-medium">Acesso unificado para clínicas, administradores e pacientes.</p>
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
                  placeholder="Digite seu login ou CPF..."
                  className="w-full min-h-[48px] px-4 py-3.5 bg-black/50 border border-white/10 rounded-2xl font-medium outline-none focus:border-[#9FC131] focus:ring-2 focus:ring-[#9FC131]/20 text-white text-sm transition-all placeholder:text-zinc-600"
                />
              </div>

              <button
                disabled={loading || !identificador.trim()}
                type="submit"
                className="w-full min-h-[48px] bg-white hover:bg-zinc-200 text-black font-extrabold text-xs uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] cursor-pointer"
              >
                {loading ? <Activity size={16} className="animate-spin" /> : "Continuar"}
                {!loading && <ArrowRight size={16} />}
              </button>
            </motion.form>
          )}

          {/* PASSO 2: AUTENTICAÇÃO / SENHA PADRÃO */}
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
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
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
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 rounded-lg cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                disabled={loading || !password}
                type="submit"
                className={`w-full min-h-[48px] font-extrabold text-xs uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] cursor-pointer ${
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

          {/* PASSO 3: REDEFINIÇÃO DE SENHA NO PRIMEIRO ACESSO */}
          {step === 3 && (
            <motion.form
              key="step3"
              onSubmit={handleSalvarRedefinicaoPrimeiroAcesso}
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -15 }}
              transition={spring}
              className="space-y-5"
            >
              <div className="text-center space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10.5px] font-extrabold uppercase tracking-wider mb-1">
                  <Sparkles size={13} /> Primeiro Acesso à Plataforma
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">Redefinir Senha</h2>
                <p className="text-xs text-zinc-400 font-medium">
                  Olá, <strong className="text-white">@{resetUser}</strong>. Para sua segurança, cadastre sua senha definitiva.
                </p>
              </div>

              {/* BARRA DE PROGRESSO */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                    Força & Conformidade
                  </span>
                  <motion.span
                    key={passwordSecurityMetrics.percent}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    className={`font-mono font-black text-xs px-2 py-0.5 rounded-md ${
                      passwordSecurityMetrics.percent === 100
                        ? "bg-[#9FC131] text-black shadow-[0_0_12px_rgba(159,193,49,0.5)]"
                        : passwordSecurityMetrics.percent >= 60
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-red-500/20 text-red-300 border border-red-500/30"
                    }`}
                  >
                    {passwordSecurityMetrics.percent}%
                  </motion.span>
                </div>

                <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden p-0.5">
                  <motion.div
                    className="h-full rounded-full transition-colors"
                    style={{
                      backgroundColor:
                        passwordSecurityMetrics.percent === 100
                          ? "#9FC131"
                          : passwordSecurityMetrics.percent >= 60
                          ? "#F59E0B"
                          : "#EF4444"
                    }}
                    animate={{ width: `${passwordSecurityMetrics.percent}%` }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  />
                </div>
              </div>

              {/* CAMPOS DE NOVA SENHA */}
              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                    <LockKeyhole size={12} /> Nova Senha *
                  </label>
                  <div className="relative">
                    <input
                      required
                      type={showResetNewPass ? "text" : "password"}
                      value={resetNewPass}
                      onChange={(e) => setResetNewPass(e.target.value)}
                      placeholder="Crie uma senha forte..."
                      className="w-full min-h-[46px] px-4 py-3 pr-12 bg-black/50 border border-white/10 rounded-2xl font-medium outline-none focus:border-[#9FC131] focus:ring-2 focus:ring-[#9FC131]/20 text-white text-sm transition-all placeholder:text-zinc-600 tracking-wider"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetNewPass(!showResetNewPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 rounded-lg cursor-pointer"
                    >
                      {showResetNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                    <CheckCircle size={12} /> Repetir Nova Senha *
                  </label>
                  <div className="relative">
                    <input
                      required
                      type={showResetConfirmPass ? "text" : "password"}
                      value={resetConfirmPass}
                      onChange={(e) => setResetConfirmPass(e.target.value)}
                      placeholder="Repita a nova senha..."
                      className="w-full min-h-[46px] px-4 py-3 pr-12 bg-black/50 border border-white/10 rounded-2xl font-medium outline-none focus:border-[#9FC131] focus:ring-2 focus:ring-[#9FC131]/20 text-white text-sm transition-all placeholder:text-zinc-600 tracking-wider"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetConfirmPass(!showResetConfirmPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 rounded-lg cursor-pointer"
                    >
                      {showResetConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* CHECKLIST INTERATIVO DE REGRAS */}
              <div className="p-3.5 rounded-2xl bg-black/30 border border-white/5 grid grid-cols-2 gap-2 text-[11px]">
                <div
                  className={`flex items-center gap-1.5 font-medium transition-colors ${
                    passwordSecurityMetrics.ruleMinLength ? "text-emerald-400 font-bold" : "text-zinc-500"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
                      passwordSecurityMetrics.ruleMinLength
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : "bg-zinc-800 text-zinc-600"
                    }`}
                  >
                    {passwordSecurityMetrics.ruleMinLength ? <Check size={10} strokeWidth={3} /> : <span className="w-1 h-1 rounded-full bg-zinc-600" />}
                  </div>
                  <span>Mínimo 8 caracteres</span>
                </div>

                <div
                  className={`flex items-center gap-1.5 font-medium transition-colors ${
                    passwordSecurityMetrics.ruleHasUpper ? "text-emerald-400 font-bold" : "text-zinc-500"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
                      passwordSecurityMetrics.ruleHasUpper
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : "bg-zinc-800 text-zinc-600"
                    }`}
                  >
                    {passwordSecurityMetrics.ruleHasUpper ? <Check size={10} strokeWidth={3} /> : <span className="w-1 h-1 rounded-full bg-zinc-600" />}
                  </div>
                  <span>Letra maiúscula (A-Z)</span>
                </div>

                <div
                  className={`flex items-center gap-1.5 font-medium transition-colors ${
                    passwordSecurityMetrics.ruleHasLower ? "text-emerald-400 font-bold" : "text-zinc-500"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
                      passwordSecurityMetrics.ruleHasLower
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : "bg-zinc-800 text-zinc-600"
                    }`}
                  >
                    {passwordSecurityMetrics.ruleHasLower ? <Check size={10} strokeWidth={3} /> : <span className="w-1 h-1 rounded-full bg-zinc-600" />}
                  </div>
                  <span>Letra minúscula (a-z)</span>
                </div>

                <div
                  className={`flex items-center gap-1.5 font-medium transition-colors ${
                    passwordSecurityMetrics.ruleHasDigit ? "text-emerald-400 font-bold" : "text-zinc-500"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
                      passwordSecurityMetrics.ruleHasDigit
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : "bg-zinc-800 text-zinc-600"
                    }`}
                  >
                    {passwordSecurityMetrics.ruleHasDigit ? <Check size={10} strokeWidth={3} /> : <span className="w-1 h-1 rounded-full bg-zinc-600" />}
                  </div>
                  <span>Pelo menos 1 número</span>
                </div>

                <div
                  className={`flex items-center gap-1.5 font-medium transition-colors ${
                    passwordSecurityMetrics.ruleHasSpecial ? "text-emerald-400 font-bold" : "text-zinc-500"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
                      passwordSecurityMetrics.ruleHasSpecial
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : "bg-zinc-800 text-zinc-600"
                    }`}
                  >
                    {passwordSecurityMetrics.ruleHasSpecial ? <Check size={10} strokeWidth={3} /> : <span className="w-1 h-1 rounded-full bg-zinc-600" />}
                  </div>
                  <span>Caractere especial (!@#$)</span>
                </div>

                <div
                  className={`flex items-center gap-1.5 font-medium transition-colors ${
                    passwordSecurityMetrics.ruleMatch ? "text-emerald-400 font-bold" : "text-zinc-500"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
                      passwordSecurityMetrics.ruleMatch
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : "bg-zinc-800 text-zinc-600"
                    }`}
                  >
                    {passwordSecurityMetrics.ruleMatch ? <Check size={10} strokeWidth={3} /> : <span className="w-1 h-1 rounded-full bg-zinc-600" />}
                  </div>
                  <span>Repetir a senha</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  disabled={loading || !passwordSecurityMetrics.isValid}
                  type="submit"
                  className={`w-full min-h-[48px] font-extrabold text-xs uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] cursor-pointer ${
                    passwordSecurityMetrics.isValid
                      ? "bg-[#9FC131] hover:bg-[#8ab01c] text-black shadow-[#9FC131]/30 font-black"
                      : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {loading ? (
                    <Activity size={16} className="animate-spin" />
                  ) : (
                    <>
                      <KeyRound size={15} />
                      <span>Salvar Nova Senha & Acessar</span>
                    </>
                  )}
                </button>
              </div>
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
