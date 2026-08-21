"use client";

import { motion } from "framer-motion";
import { Sparkles, Calendar, ShieldCheck, Clock, ArrowRight, HeartPulse, CheckCircle2 } from "lucide-react";
import { useAgendamento } from "../context";
import { playDopamineSound, triggerHaptic } from "@/lib/dopamine";

export default function ModuleBoasVindas() {
  const { context, empresaDados, nextStep } = useAgendamento();
  const nomeClinica = empresaDados?.nome || "Clínica";
  const logoUrl = empresaDados?.logo_url || empresaDados?.config_campos?.logo_url;
  const formatoLogo = empresaDados?.config_campos?.formato_logo || empresaDados?.formato_logo || "arredondada";

  const handleStart = () => {
    playDopamineSound("step");
    triggerHaptic("medium");
    nextStep();
  };

  const getShapeClasses = (formato) => {
    switch (formato) {
      case "circular":
        return "w-20 h-20 sm:w-28 sm:h-28 rounded-full";
      case "quadrada":
        return "w-20 h-20 sm:w-28 sm:h-28 rounded-2xl";
      case "original":
        return "w-32 h-16 sm:w-44 sm:h-24 rounded-2xl";
      case "arredondada":
      default:
        return "w-20 h-20 sm:w-28 sm:h-28 rounded-[1.5rem] sm:rounded-[1.75rem]";
    }
  };

  const shapeClass = getShapeClasses(formatoLogo);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      exit="exit"
      variants={{
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { staggerChildren: 0.08 } },
        exit: { opacity: 0, y: -10 }
      }}
      className="max-w-xl mx-auto w-full flex-1 flex flex-col justify-center items-center text-center py-2 sm:py-6"
    >
      {/* BLOCO DE APRESENTAÇÃO */}
      <div className="w-full flex flex-col items-center text-center space-y-3 sm:space-y-4 my-auto">
        {/* LOGO DA CLÍNICA EM DESTAQUE COM MOLDURA DINÂMICA */}
        {logoUrl ? (
          <motion.div
            variants={{ hidden: { scale: 0.85, opacity: 0 }, show: { scale: 1, opacity: 1 } }}
            className="relative flex items-center justify-center"
          >
            <div className={`relative ${shapeClass} overflow-hidden shadow-[0_12px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.6)] border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-[#111116] flex items-center justify-center`}>
              <img
                src={logoUrl}
                alt={nomeClinica}
                className="w-full h-full object-cover select-none pointer-events-none"
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            variants={{ hidden: { scale: 0.85, opacity: 0 }, show: { scale: 1, opacity: 1 } }}
            className="relative"
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[1.5rem] bg-gradient-to-br from-[#9FC131] to-[#86a621] text-black flex items-center justify-center shadow-xl shadow-[#9FC131]/25 border border-white/20">
              <HeartPulse size={36} strokeWidth={2} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white dark:bg-black border-2 border-[#9FC131] flex items-center justify-center shadow-sm">
              <Sparkles size={12} className="text-[#9FC131]" />
            </div>
          </motion.div>
        )}

        {/* TEXTOS CENTRALIZADOS */}
        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="w-full flex flex-col items-center">
          <div className="inline-flex items-center gap-1.5 text-[10.5px] font-bold text-[#86a621] dark:text-[#9FC131] uppercase tracking-widest px-3.5 py-1 rounded-full bg-[#9FC131]/10 border border-[#9FC131]/20 mb-2 shadow-sm">
            <CheckCircle2 size={12} strokeWidth={2.5} /> Portal de Atendimento Oficial
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-[2.25rem] font-black text-zinc-950 dark:text-white tracking-tight leading-tight max-w-md mx-auto">
            {context.personalizedName
              ? `Olá, ${context.personalizedName}! Seja bem-vindo(a).`
              : `Bem-vindo(a) à ${nomeClinica}`}
          </h1>

          <p className="mt-1.5 text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm max-w-sm sm:max-w-md leading-relaxed font-normal mx-auto">
            Agende sua consulta ou exame com total agilidade, transparência e segurança em poucas etapas.
          </p>
        </motion.div>

        {/* 3 CARDS DE BENEFÍCIOS */}
        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="w-full max-w-md">
          <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full my-2 sm:my-3 text-center">
            <div className="p-2.5 sm:p-3.5 rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/[0.08] backdrop-blur-xl shadow-sm flex flex-col items-center">
              <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1">
                <Clock size={15} strokeWidth={2} />
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-zinc-900 dark:text-white leading-tight">24/7 Online</span>
              <span className="text-[9.5px] text-zinc-400 mt-0.5">Sem filas</span>
            </div>

            <div className="p-2.5 sm:p-3.5 rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/[0.08] backdrop-blur-xl shadow-sm flex flex-col items-center">
              <div className="w-7 h-7 rounded-xl bg-[#9FC131]/15 text-[#86a621] dark:text-[#9FC131] flex items-center justify-center mb-1">
                <Calendar size={15} strokeWidth={2} />
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-zinc-900 dark:text-white leading-tight">Vagas Reais</span>
              <span className="text-[9.5px] text-zinc-400 mt-0.5">Tempo real</span>
            </div>

            <div className="p-2.5 sm:p-3.5 rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/[0.08] backdrop-blur-xl shadow-sm flex flex-col items-center">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1">
                <ShieldCheck size={15} strokeWidth={2} />
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-zinc-900 dark:text-white leading-tight">100% Seguro</span>
              <span className="text-[9.5px] text-zinc-400 mt-0.5">Dados LGPD</span>
            </div>
          </div>
        </motion.div>

        {/* BOTÃO INICIAR AGENDAMENTO */}
        <motion.div
          variants={{ hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1 } }}
          className="w-full max-w-sm pt-2"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleStart}
            className="w-full min-h-[50px] sm:min-h-[54px] py-3.5 px-8 rounded-full bg-zinc-950 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-black font-extrabold text-sm sm:text-base flex items-center justify-center gap-3 shadow-xl shadow-black/10 dark:shadow-white/10 transition-all cursor-pointer"
          >
            <span>Iniciar Agendamento</span>
            <ArrowRight size={18} strokeWidth={2.5} />
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
}
