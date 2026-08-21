"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  CheckCircle,
  RefreshCw,
  MessageCircle,
  CalendarPlus,
  Copy,
  Sparkles,
  Calendar,
  User,
  Stethoscope,
  Shield,
  Clock,
  CheckCircle2
} from "lucide-react";
import { useAgendamento } from "../context";
import { playDopamineSound, triggerConfetti, triggerHaptic } from "@/lib/dopamine";

export default function ModuleConcluido() {
  const { formData, pixData, timeLeft, showIsland, handleNovoAgendamento, empresaDados } =
    useAgendamento();

  useEffect(() => {
    // Forçar scroll para o topo imediatamente
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    const scrollContainers = document.querySelectorAll(".overflow-y-auto, .custom-scrollbar");
    scrollContainers.forEach((container) => {
      container.scrollTo({ top: 0, behavior: "instant" });
    });

    playDopamineSound("success");
    triggerHaptic("success");
    triggerConfetti({ count: 110, origin: { x: 0.5, y: 0.35 } });

    const timer = setTimeout(() => {
      triggerConfetti({ count: 70, origin: { x: 0.5, y: 0.4 } });
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  const copyPixCode = () => {
    if (!pixData?.qr_code) return;
    navigator.clipboard.writeText(pixData.qr_code);
    playDopamineSound("select");
    triggerHaptic("light");
    showIsland("Código Pix copiado!", "success");
  };

  const wppNumero =
    empresaDados?.config_campos?.whatsapp_atendimento ||
    empresaDados?.config_campos?.whatsapp_suporte ||
    empresaDados?.whatsapp_atendimento ||
    empresaDados?.telefone ||
    "";
  const dataFormatada = formData.data_agendamento
    ? formData.data_agendamento.split("-").reverse().join("/")
    : "";

  const procedimentoNome =
    formData.especialidade ||
    (formData.tipo_servico === "Exame" ? formData.subtipo_exame : "Consulta Geral");
  const profissionalNome =
    formData.medico_profissional || formData.subtipo_exame || "A definir";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
      className="flex flex-col items-center justify-center text-center max-w-lg mx-auto py-4 pb-36 sm:pb-24"
    >
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 25, delay: 0.1 }}
        className="relative mb-5"
      >
        <div
          className={`w-20 h-20 sm:w-22 sm:h-22 rounded-[2rem] ${
            pixData
              ? "bg-gradient-to-br from-blue-600 to-indigo-600 shadow-blue-500/25"
              : "bg-gradient-to-br from-[#9FC131] to-[#86a621] shadow-[#9FC131]/30"
          } text-black flex items-center justify-center shadow-xl border border-white/20`}
        >
          {pixData ? (
            <CreditCard size={36} className="text-white" strokeWidth={2.2} />
          ) : (
            <CheckCircle size={38} className="text-black" strokeWidth={2.5} />
          )}
        </div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3 }}
          className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-white dark:bg-black border-2 border-[#9FC131] flex items-center justify-center shadow-sm"
        >
          <Sparkles size={14} className="text-[#9FC131]" />
        </motion.div>
      </motion.div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold uppercase tracking-wider mb-2.5 shadow-sm">
        <CheckCircle2 size={13} strokeWidth={2.5} /> Agendamento Concluído com Sucesso
      </div>

      <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-zinc-950 dark:text-white tracking-tight leading-tight">
        {pixData ? "Finalize seu pagamento Pix" : "Agendamento Confirmado!"}
      </h2>

      <p className="text-zinc-500 dark:text-zinc-400 mt-2.5 text-xs sm:text-sm leading-relaxed max-w-md">
        {pixData
          ? `Sua vaga para ${procedimentoNome} com ${profissionalNome} no dia ${dataFormatada} às ${formData.horario_agendamento}h está pré-reservada.`
          : `Tudo pronto! Seu atendimento para o dia ${dataFormatada} às ${formData.horario_agendamento}h foi confirmado com sucesso.`}
      </p>

      {/* PIX QR CODE & COPY */}
      {pixData && (
        <div className="mt-6 p-6 rounded-3xl border border-zinc-200/80 dark:border-white/10 w-full text-center bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl shadow-sm space-y-4">
          <h3 className="text-[11px] font-extrabold uppercase text-zinc-400 tracking-widest">
            Escaneie o QR Code Pix
          </h3>

          <div className="p-3 bg-white rounded-2xl border border-zinc-200 inline-block shadow-sm">
            <img
              src={`data:image/jpeg;base64,${pixData.qr_code_base64}`}
              alt="QR Code Pix"
              className="w-48 h-48 mx-auto rounded-xl object-contain"
            />
          </div>

          <div className="space-y-3">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              Ou use o Código Copia e Cola:
            </span>

            <div className="flex bg-zinc-50 dark:bg-black/50 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-1.5 items-center shadow-inner">
              <input
                readOnly
                value={pixData.qr_code}
                className="w-full text-xs bg-transparent outline-none text-zinc-600 dark:text-zinc-300 px-3 truncate font-mono"
              />
              <button
                onClick={copyPixCode}
                className="min-h-[38px] px-4 rounded-xl bg-zinc-950 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-black text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
              >
                <Copy size={13} />
                Copiar
              </button>
            </div>

            <div className="p-4 bg-zinc-50/70 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                {timeLeft > 0 && <RefreshCw size={12} className="animate-spin text-[#9FC131]" />}
                Verificação Automática
              </span>
              <span className="text-base font-mono font-bold text-zinc-900 dark:text-white">
                {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:
                {String(timeLeft % 60).padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* RESUMO COMPLETO DO ATENDIMENTO COM ESPECIALIDADE E PROFISSIONAL */}
      <div className="mt-6 p-5 sm:p-6 rounded-3xl border border-zinc-200/80 dark:border-white/10 w-full text-left bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl shadow-sm space-y-3.5">
        <div className="flex justify-between items-center text-xs">
          <span className="text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <User size={14} className="text-blue-500" /> Paciente
          </span>
          <span className="font-extrabold text-zinc-950 dark:text-white text-sm">
            {formData.nome} {formData.sobrenome}
          </span>
        </div>

        <div className="flex justify-between items-center text-xs border-t border-zinc-100 dark:border-white/5 pt-3">
          <span className="text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Stethoscope size={14} className="text-emerald-500" /> Procedimento / Especialidade
          </span>
          <span className="font-bold text-zinc-900 dark:text-white">
            {procedimentoNome}
          </span>
        </div>

        <div className="flex justify-between items-center text-xs border-t border-zinc-100 dark:border-white/5 pt-3">
          <span className="text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <User size={14} className="text-purple-500" /> Profissional
          </span>
          <span className="font-bold text-zinc-900 dark:text-white">
            {profissionalNome}
          </span>
        </div>

        <div className="flex justify-between items-center text-xs border-t border-zinc-100 dark:border-white/5 pt-3">
          <span className="text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Calendar size={14} className="text-[#86a621] dark:text-[#9FC131]" /> Data & Horário
          </span>
          <span className="font-bold text-zinc-900 dark:text-white">
            {dataFormatada} às {formData.horario_agendamento}h
          </span>
        </div>

        {formData.modalidade && (
          <div className="flex justify-between items-center text-xs border-t border-zinc-100 dark:border-white/5 pt-3">
            <span className="text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Shield size={14} className="text-amber-500" /> Modalidade
            </span>
            <span className="font-bold text-zinc-900 dark:text-white">
              {formData.modalidade}
            </span>
          </div>
        )}

        <div className="flex justify-between items-center text-xs border-t border-zinc-100 dark:border-white/5 pt-3">
          <span className="text-zinc-400 font-bold uppercase tracking-wider">Status do Agendamento</span>
          <span className="font-extrabold px-2.5 py-0.5 rounded-md text-[10px] uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
            {pixData ? "Aguardando Pix" : "Confirmado no Sistema"}
          </span>
        </div>
      </div>

      {/* BOTÕES DE AÇÃO COM VISIBILIDADE TOTAL E ESPAÇAMENTO CONFORTÁVEL */}
      <div className="mt-6 flex flex-col gap-3 w-full">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            playDopamineSound("click");
            triggerHaptic("success");
            const cleanNum = wppNumero.replace(/\D/g, "");
            const clinicaNome = empresaDados?.nome ? ` na ${empresaDados.nome}` : "";
            const msg = encodeURIComponent(
              `Olá! Realizei meu agendamento de ${procedimentoNome} com ${profissionalNome} para o dia ${dataFormatada} às ${formData.horario_agendamento}h${clinicaNome}. (Paciente: ${formData.nome} ${formData.sobrenome})`
            );
            window.open(cleanNum ? `https://wa.me/${cleanNum}?text=${msg}` : `https://wa.me/?text=${msg}`, "_blank");
          }}
          className="w-full min-h-[52px] py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
        >
          <MessageCircle size={19} />
          Falar no WhatsApp da Clínica
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={() => {
            playDopamineSound("click");
            handleNovoAgendamento ? handleNovoAgendamento() : window.location.reload();
          }}
          className="w-full min-h-[50px] py-3.5 border border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-900 dark:text-white rounded-full font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <CalendarPlus size={17} />
          Realizar Novo Agendamento
        </motion.button>
      </div>
    </motion.div>
  );
}
