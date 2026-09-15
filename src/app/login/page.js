"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Shield,
  Lock,
  Activity,
  Eye,
  EyeOff,
  KeyRound,
  Check,
  Calendar,
  MessageCircle,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  FileCheck2,
  Clock,
  UserCheck
} from "lucide-react";
import {
  checkIdentifier,
  authenticateUser,
  actionRedefinirSenhaPrimeiroAcesso,
  getSessionAdminInfo
} from "@/actions/auth";
import { playDopamineSound, triggerConfetti, triggerHaptic } from "@/lib/dopamine";

const CAROUSEL_INTERVAL_MS = 3000;

const SLIDES = [
  {
    id: "agenda",
    tag: "Agenda & Grade Médica",
    titulo: "Controle cirúrgico de horários e pacientes em tempo real.",
    descricao: "Sincronização bidirecional, gestão de salas e zero choques de horários na clínica.",
    metric: "99.4% de pontualidade operacional",
    preview: {
      tipo: "agenda",
      itens: [
        {
          hora: "09:00",
          paciente: "Mariana Albuquerque",
          especialidade: "Endoscopia Digestiva",
          medico: "Dr. Ricardo V.",
          status: "Em Atendimento",
          statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200"
        },
        {
          hora: "10:15",
          paciente: "Carlos E. Nogueira",
          especialidade: "Gastroenterologia",
          medico: "Dra. Camila M.",
          status: "Confirmado",
          statusColor: "bg-blue-50 text-blue-700 border-blue-200"
        },
        {
          hora: "11:30",
          paciente: "Fernanda C. Ramos",
          especialidade: "Colonoscopia",
          medico: "Dr. Ricardo V.",
          status: "Triagem Concluída",
          statusColor: "bg-zinc-100 text-zinc-700 border-zinc-200"
        }
      ]
    }
  },
  {
    id: "whatsapp",
    tag: "Automação WhatsApp",
    titulo: "Lembretes e confirmação ativa em um único clique.",
    descricao: "Reduza faltas e no-shows com notificações automáticas enviadas antes do atendimento.",
    metric: "Menos 62% de absenteísmo",
    preview: {
      tipo: "whatsapp",
      paciente: "Mariana Albuquerque",
      procedimento: "Endoscopia Digestiva",
      horario: "Amanhã às 09:00h",
      statusEnvio: "Lembrete de jejum e preparo entregue",
      statusResposta: "Confirmado pelo paciente via WhatsApp"
    }
  },
  {
    id: "triagem",
    tag: "Segurança & Conformidade",
    titulo: "Triagem prévia com proteção rigorosa de sigilo clínico.",
    descricao: "Questionários dinâmicos de saúde, consentimento digital e auditoria completa de acessos.",
    metric: "100% em conformidade com LGPD",
    preview: {
      tipo: "triagem",
      itens: [
        { label: "Jejum Pré-Exame", val: "8 horas confirmado", ok: true },
        { label: "Alergias Medicamentosas", val: "Dipirona declarada", ok: true },
        { label: "Acompanhante Adulto", val: "Presença confirmada", ok: true },
        { label: "Termo de Consentimento", val: "Assinado eletronicamente", ok: true }
      ]
    }
  },
  {
    id: "financeiro",
    tag: "Conciliação Financeira",
    titulo: "Faturamento e pagamentos conciliados instantaneamente.",
    descricao: "Controle de consultas particulares, repasses aos profissionais e relatórios consolidados.",
    metric: "Zero retrabalho contábil",
    preview: {
      tipo: "financeiro",
      totalDia: "R$ 4.850,00",
      consultas: "12 atendimentos liquidados",
      ultimoPagamento: {
        paciente: "Mariana Albuquerque",
        valor: "R$ 450,00",
        metodo: "Pix Instantâneo",
        status: "Conciliado com a Grade"
      }
    }
  }
];

export default function LoginUnificado() {
  const router = useRouter();

  // Estados do Carrossel
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);

  // Estados do Formulário de Login
  const [step, setStep] = useState(1); // 1: Identificador, 2: Senha/Nascimento, 3: Primeiro Acesso
  const [identificador, setIdentificador] = useState("");
  const [role, setRole] = useState(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [pacienteId, setPacienteId] = useState(null);
  const [isDefiningPassword, setIsDefiningPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });

  // Estados para Redefinição no Primeiro Acesso
  const [resetUser, setResetUser] = useState("");
  const [resetNewPass, setResetNewPass] = useState("");
  const [resetConfirmPass, setResetConfirmPass] = useState("");
  const [showResetNewPass, setShowResetNewPass] = useState(false);
  const [showResetConfirmPass, setShowResetConfirmPass] = useState(false);

  // Checagem de sessão já ativa
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
        // Sem sessão ativa
      }
    };
    checkActiveSession();
  }, []);

  // Timer automático do Carrossel (3 segundos para fluxo ágil)
  useEffect(() => {
    if (isCarouselPaused) return;

    const timer = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % SLIDES.length);
    }, CAROUSEL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isCarouselPaused]);

  const handleManualChangeSlide = (newIndex) => {
    playDopamineSound("click");
    triggerHaptic("light");
    setCurrentSlideIndex(newIndex);
  };

  const handlePrevSlide = () => {
    handleManualChangeSlide((currentSlideIndex - 1 + SLIDES.length) % SLIDES.length);
  };

  const handleNextSlide = () => {
    handleManualChangeSlide((currentSlideIndex + 1) % SLIDES.length);
  };

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

  // Cálculo das regras de senha para o primeiro acesso
  const passwordSecurityMetrics = useMemo(() => {
    const pwd = resetNewPass || "";
    const confirm = resetConfirmPass || "";

    const ruleMinLength = pwd.length >= 8;
    const ruleHasUpper = /[A-Z]/.test(pwd);
    const ruleHasLower = /[a-z]/.test(pwd);
    const ruleHasDigit = /\d/.test(pwd);
    const ruleHasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd);
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
          showMsg(
            "info",
            "Primeiro acesso detectado. Confirme sua data de nascimento para criar sua senha."
          );
        }
        setStep(2);
      }
    } catch (err) {
      showMsg("error", "Erro ao verificar credencial de acesso.");
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

      if (result.mustResetPassword) {
        playDopamineSound("unlock");
        triggerHaptic("medium");
        setResetUser(result.usuario || identificador.trim().toLowerCase());
        setStep(3);
        showMsg("info", "Primeiro acesso detectado. Crie uma nova senha segura para continuar.");
        setLoading(false);
        return;
      }

      playDopamineSound("success");
      triggerConfetti({ count: 70 });
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
      showMsg("error", "Preencha todos os requisitos de segurança da senha.");
      return;
    }

    setLoading(true);
    playDopamineSound("click");
    triggerHaptic("light");

    try {
      const result = await actionRedefinirSenhaPrimeiroAcesso({
        usuario: resetUser,
        novaSenha: resetNewPass
      });

      if (!result.success) {
        showMsg("error", result.error);
        setLoading(false);
        return;
      }

      playDopamineSound("success");
      triggerConfetti({ count: 90 });
      triggerHaptic("success");
      showMsg("success", "Senha redefinida com sucesso. Redirecionando...");

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

  const currentSlide = SLIDES[currentSlideIndex];

  return (
    <main className="min-h-screen w-screen bg-[#FAFAFC] text-zinc-900 flex flex-col lg:flex-row overflow-hidden font-sans select-none">
      {/* ========================================================= */}
      {/* LADO ESQUERDO: SHOWCASE LIMPO, MODERNO E PROFISSIONAL      */}
      {/* ========================================================= */}
      <section
        onMouseEnter={() => setIsCarouselPaused(true)}
        onMouseLeave={() => setIsCarouselPaused(false)}
        className="relative flex-1 lg:w-[54%] xl:w-[56%] min-h-[500px] lg:min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-14 border-b lg:border-b-0 lg:border-r border-zinc-200/80 bg-white"
      >
        {/* TOPO: LOGO LIMPA SEM BADGES CHEESY */}
        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-xs tracking-tight shadow-xs">
              RM
            </div>
            <span className="text-base font-semibold text-zinc-900 tracking-tight">
              RMAgenda
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-medium text-zinc-600">Sistema Operacional</span>
          </div>
        </div>

        {/* CENTRO: CONTEÚDO DO SLIDE */}
        <div className="my-8 lg:my-auto z-10 max-w-xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="space-y-5"
            >
              {/* TAG MINIMALISTA */}
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-700 text-xs font-medium border border-zinc-200/60">
                <span>{currentSlide.tag}</span>
              </div>

              {/* TÍTULO DIRETO E ELEGANTE */}
              <h1 className="text-2xl sm:text-3xl xl:text-4xl font-semibold tracking-tight text-zinc-900 leading-tight">
                {currentSlide.titulo}
              </h1>

              {/* DESCRIÇÃO OBJETIVA */}
              <p className="text-sm sm:text-base text-zinc-600 font-normal leading-relaxed">
                {currentSlide.descricao}
              </p>

              {/* CARD DE VISUALIZAÇÃO LIMPO (SEM JANELA FAKE) */}
              <div className="pt-2">
                <div className="bg-[#FAFAFC] border border-zinc-200 rounded-xl p-4 sm:p-5 space-y-3">
                  {/* PREVIEW 1: AGENDA */}
                  {currentSlide.preview.tipo === "agenda" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-zinc-500 pb-2 border-b border-zinc-200/80">
                        <span className="font-semibold text-zinc-700 flex items-center gap-1.5">
                          <Calendar size={13} className="text-zinc-500" />
                          Atendimentos do Dia
                        </span>
                        <span className="font-mono text-zinc-500">Hoje</span>
                      </div>
                      {currentSlide.preview.itens.map((it, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg bg-white border border-zinc-200/80 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 font-mono font-semibold text-[11px]">
                              {it.hora}
                            </span>
                            <div>
                              <p className="font-medium text-zinc-900">{it.paciente}</p>
                              <p className="text-[11px] text-zinc-500">{it.especialidade} • {it.medico}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10.5px] font-medium border ${it.statusColor}`}>
                            {it.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* PREVIEW 2: WHATSAPP */}
                  {currentSlide.preview.tipo === "whatsapp" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-zinc-500 pb-2 border-b border-zinc-200/80">
                        <span className="font-semibold text-zinc-700 flex items-center gap-1.5">
                          <MessageCircle size={13} className="text-emerald-600" />
                          Automação de Confirmação
                        </span>
                        <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-medium">
                          Conectado
                        </span>
                      </div>
                      <div className="p-3.5 rounded-lg bg-white border border-zinc-200/80 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-zinc-800">{currentSlide.preview.paciente}</span>
                          <span className="text-[11px] text-zinc-500">{currentSlide.preview.horario}</span>
                        </div>
                        <p className="text-xs text-zinc-600">
                          {currentSlide.preview.procedimento}
                        </p>
                        <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-zinc-100 text-xs">
                          <span className="text-zinc-500 flex items-center gap-1 text-[11px]">
                            <Clock size={12} />
                            {currentSlide.preview.statusEnvio}
                          </span>
                          <span className="text-emerald-700 font-medium text-[11px] flex items-center gap-1">
                            <CheckCircle size={12} />
                            {currentSlide.preview.statusResposta}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PREVIEW 3: TRIAGEM */}
                  {currentSlide.preview.tipo === "triagem" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-zinc-500 pb-2 border-b border-zinc-200/80">
                        <span className="font-semibold text-zinc-700 flex items-center gap-1.5">
                          <FileCheck2 size={13} className="text-zinc-500" />
                          Protocolo de Segurança Clínica
                        </span>
                        <span className="text-[11px] text-zinc-500 font-mono">LGPD Ativo</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {currentSlide.preview.itens.map((it, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-lg bg-white border border-zinc-200/80 flex items-center gap-2"
                          >
                            <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                              <Check size={11} strokeWidth={2.5} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10.5px] text-zinc-500">{it.label}</p>
                              <p className="font-medium text-zinc-800 truncate text-[11.5px]">{it.val}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PREVIEW 4: FINANCEIRO */}
                  {currentSlide.preview.tipo === "financeiro" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-zinc-500 pb-2 border-b border-zinc-200/80">
                        <span className="font-semibold text-zinc-700 flex items-center gap-1.5">
                          <CreditCard size={13} className="text-zinc-500" />
                          Movimentação do Dia
                        </span>
                        <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-medium">
                          100% Conciliado
                        </span>
                      </div>
                      <div className="p-3.5 rounded-lg bg-white border border-zinc-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div>
                          <p className="text-[11px] text-zinc-500">Volume Liquidado</p>
                          <p className="text-xl font-bold text-zinc-900 tracking-tight">{currentSlide.preview.totalDia}</p>
                          <p className="text-[11px] text-zinc-500">{currentSlide.preview.consultas}</p>
                        </div>
                        <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-100">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium text-[11px] inline-flex items-center gap-1">
                            <CheckCircle size={11} />
                            {currentSlide.preview.ultimoPagamento.metodo}
                          </span>
                          <p className="text-[11px] text-zinc-500 mt-1">
                            {currentSlide.preview.ultimoPagamento.status}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* INDICADOR DE MÉTRICA INFERIOR */}
                  <div className="pt-2 flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-200/60">
                    <span className="flex items-center gap-1.5 text-zinc-600 font-medium">
                      <Sparkles size={12} className="text-zinc-900" />
                      {currentSlide.metric}
                    </span>
                    <span className="text-[11px] text-zinc-400 font-mono">
                      {String(currentSlideIndex + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* RODAPÉ DO CARROSSEL: PONTOS DISCRETOS E SETAS LIMPAS (SEM BARRAS FEIAS) */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-200/80 z-10">
          {/* PONTINHOS DISCRETOS E ELEGANTES */}
          <div className="flex items-center gap-2">
            {SLIDES.map((slide, idx) => {
              const isActive = idx === currentSlideIndex;
              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => handleManualChangeSlide(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    isActive ? "w-6 bg-zinc-900" : "w-1.5 bg-zinc-300 hover:bg-zinc-400"
                  }`}
                  aria-label={`Slide ${idx + 1}`}
                />
              );
            })}
          </div>

          {/* NAVEGAÇÃO ANTERIOR / PRÓXIMO MINIMALISTA */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrevSlide}
              aria-label="Slide anterior"
              className="w-8 h-8 rounded-lg border border-zinc-200 hover:bg-zinc-100 flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              onClick={handleNextSlide}
              aria-label="Próximo slide"
              className="w-8 h-8 rounded-lg border border-zinc-200 hover:bg-zinc-100 flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* LADO DIREITO: AUTENTICAÇÃO LIMPA, SHARP E MODERNA          */}
      {/* ========================================================= */}
      <section className="flex-1 lg:w-[46%] xl:w-[44%] min-h-screen flex flex-col justify-center items-center p-6 sm:p-10 lg:p-14 bg-[#FAFAFC]">
        {/* CONTAINER DO FORMULÁRIO (CARD SHARP, CLEAN, SEM BALÃO BOLEADO) */}
        <div className="w-full max-w-[400px] bg-white border border-zinc-200/90 rounded-xl shadow-sm p-7 sm:p-9 space-y-6">
          {/* CABEÇALHO DO FORMULÁRIO */}
          <div className="space-y-1.5">
            <div className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-900 flex items-center justify-center mb-3">
              {step === 3 ? (
                <KeyRound size={18} strokeWidth={2} />
              ) : (
                <Lock size={18} strokeWidth={2} />
              )}
            </div>

            <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
              {step === 3
                ? "Criar Nova Senha"
                : isDefiningPassword
                ? "Ativação de Conta"
                : "Entrar no Sistema"}
            </h2>
            <p className="text-xs text-zinc-500 font-normal">
              {step === 3
                ? "Cadastre sua senha definitiva para continuar."
                : isDefiningPassword
                ? "Confirme sua data de nascimento para ativar o acesso."
                : "Informe seu e-mail de acesso ou CPF de paciente."}
            </p>
          </div>

          {/* AVISOS DE STATUS */}
          <AnimatePresence mode="wait">
            {statusMsg.text && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className={`p-3 rounded-lg text-xs font-medium flex items-start gap-2 border ${
                  statusMsg.type === "error"
                    ? "bg-rose-50 border-rose-200 text-rose-700"
                    : statusMsg.type === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-blue-50 border-blue-200 text-blue-700"
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {statusMsg.type === "error" ? (
                    <AlertCircle size={14} />
                  ) : (
                    <CheckCircle size={14} />
                  )}
                </div>
                <span className="leading-relaxed">{statusMsg.text}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* FORMULÁRIO */}
          <AnimatePresence mode="wait">
            {/* PASSO 1: IDENTIFICAÇÃO (E-MAIL OU CPF) */}
            {step === 1 && (
              <motion.form
                key="step1"
                onSubmit={handleIdentify}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700">
                    E-mail de Acesso ou CPF
                  </label>
                  <input
                    required
                    type="text"
                    value={identificador}
                    onChange={(e) => setIdentificador(e.target.value)}
                    placeholder="usuario@clinica.com ou CPF..."
                    className="w-full h-10 px-3.5 bg-white border border-zinc-300 rounded-lg text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
                  />
                </div>

                <button
                  disabled={loading || !identificador.trim()}
                  type="submit"
                  className="w-full h-10 bg-zinc-900 hover:bg-black text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99]"
                >
                  {loading ? (
                    <Activity size={15} className="animate-spin text-white" />
                  ) : (
                    <>
                      <span>Continuar</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </motion.form>
            )}

            {/* PASSO 2: AUTENTICAÇÃO COM SENHA OU DATA DE NASCIMENTO */}
            {step === 2 && (
              <motion.form
                key="step2"
                onSubmit={handleAuth}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between pb-1 text-xs">
                  <button
                    type="button"
                    onClick={handleVoltar}
                    className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
                  >
                    <ArrowLeft size={13} />
                    <span>Trocar conta</span>
                  </button>

                  <span className="font-mono text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded text-[11px] truncate max-w-[180px]">
                    {identificador}
                  </span>
                </div>

                {isDefiningPassword && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-700">
                      Data de Nascimento (Confirmação)
                    </label>
                    <input
                      required
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full h-10 px-3.5 bg-white border border-zinc-300 rounded-lg text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700">
                    {isDefiningPassword ? "Definir Nova Senha" : "Senha de Acesso"}
                  </label>
                  <div className="relative">
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-10 px-3.5 pr-10 bg-white border border-zinc-300 rounded-lg text-sm text-zinc-900 placeholder:text-zinc-400 tracking-wider outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button
                  disabled={loading || !password}
                  type="submit"
                  className={`w-full h-10 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99] ${
                    isDefiningPassword
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-zinc-900 hover:bg-black text-white"
                  }`}
                >
                  {loading ? (
                    <Activity size={15} className="animate-spin text-white" />
                  ) : isDefiningPassword ? (
                    "Ativar e Acessar"
                  ) : (
                    "Acessar Sistema"
                  )}
                </button>
              </motion.form>
            )}

            {/* PASSO 3: REDEFINIÇÃO DE SENHA NO PRIMEIRO ACESSO */}
            {step === 3 && (
              <motion.form
                key="step3"
                onSubmit={handleSalvarRedefinicaoPrimeiroAcesso}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                {/* FORÇA DA SENHA */}
                <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200/80 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[11px] font-medium text-zinc-600">
                      Requisitos de Segurança
                    </span>
                    <span
                      className={`font-mono text-xs font-semibold px-2 py-0.5 rounded ${
                        passwordSecurityMetrics.percent === 100
                          ? "bg-emerald-100 text-emerald-800"
                          : passwordSecurityMetrics.percent >= 60
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {passwordSecurityMetrics.percent}%
                    </span>
                  </div>

                  <div className="h-1.5 w-full bg-zinc-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full transition-colors"
                      style={{
                        backgroundColor:
                          passwordSecurityMetrics.percent === 100
                            ? "#10B981"
                            : passwordSecurityMetrics.percent >= 60
                            ? "#F59E0B"
                            : "#EF4444"
                      }}
                      animate={{ width: `${passwordSecurityMetrics.percent}%` }}
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    />
                  </div>
                </div>

                {/* CAMPOS DE SENHA */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-700">
                      Nova Senha
                    </label>
                    <div className="relative">
                      <input
                        required
                        type={showResetNewPass ? "text" : "password"}
                        value={resetNewPass}
                        onChange={(e) => setResetNewPass(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-10 px-3.5 pr-10 bg-white border border-zinc-300 rounded-lg text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetNewPass(!showResetNewPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer"
                      >
                        {showResetNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-700">
                      Confirmar Nova Senha
                    </label>
                    <div className="relative">
                      <input
                        required
                        type={showResetConfirmPass ? "text" : "password"}
                        value={resetConfirmPass}
                        onChange={(e) => setResetConfirmPass(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-10 px-3.5 pr-10 bg-white border border-zinc-300 rounded-lg text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetConfirmPass(!showResetConfirmPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer"
                      >
                        {showResetConfirmPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* REQUISITOS */}
                <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200/80 grid grid-cols-2 gap-2 text-xs">
                  <div
                    className={`flex items-center gap-1.5 ${
                      passwordSecurityMetrics.ruleMinLength ? "text-emerald-700 font-medium" : "text-zinc-400"
                    }`}
                  >
                    <Check size={12} strokeWidth={2.5} />
                    <span>Mín. 8 dígitos</span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      passwordSecurityMetrics.ruleHasUpper ? "text-emerald-700 font-medium" : "text-zinc-400"
                    }`}
                  >
                    <Check size={12} strokeWidth={2.5} />
                    <span>Maiúscula</span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      passwordSecurityMetrics.ruleHasLower ? "text-emerald-700 font-medium" : "text-zinc-400"
                    }`}
                  >
                    <Check size={12} strokeWidth={2.5} />
                    <span>Minúscula</span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      passwordSecurityMetrics.ruleHasDigit ? "text-emerald-700 font-medium" : "text-zinc-400"
                    }`}
                  >
                    <Check size={12} strokeWidth={2.5} />
                    <span>Número</span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      passwordSecurityMetrics.ruleHasSpecial ? "text-emerald-700 font-medium" : "text-zinc-400"
                    }`}
                  >
                    <Check size={12} strokeWidth={2.5} />
                    <span>Caractere especial</span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      passwordSecurityMetrics.ruleMatch ? "text-emerald-700 font-medium" : "text-zinc-400"
                    }`}
                  >
                    <Check size={12} strokeWidth={2.5} />
                    <span>Senhas coincidem</span>
                  </div>
                </div>

                <button
                  disabled={loading || !passwordSecurityMetrics.isValid}
                  type="submit"
                  className="w-full h-10 bg-zinc-900 hover:bg-black text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99]"
                >
                  {loading ? (
                    <Activity size={15} className="animate-spin text-white" />
                  ) : (
                    "Salvar e Continuar"
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </section>
    </main>
  );
}
