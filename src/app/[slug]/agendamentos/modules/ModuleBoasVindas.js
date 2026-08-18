"use client";

import { motion } from "framer-motion";
import { Sparkles, Calendar, ShieldCheck, Clock, ArrowRight, HeartPulse } from "lucide-react";
import { useAgendamento } from "../context";
import { playDopamineSound, triggerHaptic } from "@/lib/dopamine";

export default function ModuleBoasVindas() {
  const { context, empresaDados, nextStep } = useAgendamento();
  const nomeClinica = empresaDados?.nome || "Clínica";
  const logoUrl = empresaDados?.logo_url || empresaDados?.config_campos?.logo_url;

  const handleStart = () => {
    playDopamineSound("step");
    triggerHaptic("medium");
    nextStep();
  };

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
      className="max-w-xl mx-auto flex flex-col items-center text-center py-4 sm:py-8"
    >
      {/* LOGO DA CLÍNICA EM DESTAQUE AMPLO */}
      {logoUrl ? (
        <motion.div
          variants={{ hidden: { scale: 0.8, opacity: 0 }, show: { scale: 1, opacity: 1 } }}
          className="relative mb-6 flex items-center justify-center"
        >
          <div className="p-4 sm:p-5 rounded-[2.5rem] bg-white dark:bg-[#111116] border border-zinc-200/90 dark:border-white/10 shadow-2xl shadow-black/5 dark:shadow-black/40 flex items-center justify-center min-w-[140px] max-w-[280px] min-h-[90px] max-h-[130px]">
            <img
              src={logoUrl}
              alt={nomeClinica}
              className="max-h-20 sm:max-h-24 max-w-full object-contain drop-shadow-sm"
            />
          </div>
        </motion.div>
      ) : (
        <motion.div
          variants={{ hidden: { scale: 0.8, opacity: 0 }, show: { scale: 1, opacity: 1 } }}
          className="relative mb-6"
        >
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[2rem] bg-gradient-to-br from-[#9FC131] to-[#86a621] text-black flex items-center justify-center shadow-xl shadow-[#9FC131]/25 border border-white/20">
            <HeartPulse size={40} strokeWidth={2.2} />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white dark:bg-black border-2 border-[#9FC131] flex items-center justify-center shadow-sm">
            <Sparkles size={14} className="text-[#9FC131]" />
          </div>
        </motion.div>
      )}

      <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
        <span className="text-[11px] font-bold text-[#86a621] dark:text-[#9FC131] uppercase tracking-widest px-3.5 py-1 rounded-full bg-[#9FC131]/10 border border-[#9FC131]/20 inline-block mb-3">
          Portal de Atendimento Oficial
        </span>

        <h1 className="text-3xl sm:text-4xl font-black text-zinc-950 dark:text-white tracking-tight leading-tight">
          {context.personalizedName
            ? `Olá, ${context.personalizedName}! Seja bem-vindo(a).`
            : `Bem-vindo(a) à ${nomeClinica}`}
        </h1>

        <p className="mt-3 text-zinc-500 dark:text-zinc-400 text-sm sm:text-base max-w-md leading-relaxed font-normal">
          Agende sua consulta ou exame com total agilidade, transparência e segurança em poucas etapas.
        </p>
      </motion.div>

      <motion.div
        variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
        <div className="grid grid-cols-3 gap-3 w-full my-8 text-left">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/[0.08] backdrop-blur-xl shadow-sm text-center flex flex-col items-center">
            <Clock size={18} className="text-blue-500 mb-2" />
            <span className="text-[11px] font-bold text-zinc-900 dark:text-white leading-tight">24/7 Online</span>
            <span className="text-[9px] text-zinc-400 mt-0.5">Sem filas</span>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/[0.08] backdrop-blur-xl shadow-sm text-center flex flex-col items-center">
            <Calendar size={18} className="text-[#9FC131] mb-2" />
            <span className="text-[11px] font-bold text-zinc-900 dark:text-white leading-tight">Vagas Reais</span>
            <span className="text-[9px] text-zinc-400 mt-0.5">Tempo real</span>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/[0.08] backdrop-blur-xl shadow-sm text-center flex flex-col items-center">
            <ShieldCheck size={18} className="text-emerald-500 mb-2" />
            <span className="text-[11px] font-bold text-zinc-900 dark:text-white leading-tight">100% Seguro</span>
            <span className="text-[9px] text-zinc-400 mt-0.5">Dados LGPD</span>
          </div>
        </div>
      </motion.div>

      <motion.div
        variants={{ hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1 } }}
        className="w-full max-w-sm"
      >
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleStart}
          className="w-full min-h-[54px] py-4 px-8 rounded-full bg-zinc-950 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-black font-extrabold text-sm sm:text-base flex items-center justify-center gap-3 shadow-xl shadow-black/10 dark:shadow-white/10 transition-all"
        >
          <span>Iniciar Agendamento</span>
          <ArrowRight size={18} strokeWidth={2.5} />
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
