"use client";

import { motion } from "framer-motion";
import { ClipboardCheck, Check } from "lucide-react";
import { useAgendamento } from "../context";
import { playDopamineSound, triggerHaptic } from "@/lib/dopamine";

export default function ModuleTriagem() {
  const { perguntasAtuais, respostasTriagem, setRespostasTriagem } = useAgendamento();

  const handleSelectOption = (perguntaId, opcao) => {
    playDopamineSound("select");
    triggerHaptic("light");
    setRespostasTriagem((prev) => ({
      ...prev,
      [perguntaId]: opcao
    }));
  };

  const respondidasCount = Object.keys(respostasTriagem).length;
  const totalCount = perguntasAtuais.length;

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
      className="max-w-xl mx-auto space-y-6 text-left"
    >
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4 mb-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold uppercase tracking-wider shadow-sm">
            <ClipboardCheck size={13} strokeWidth={2} /> Triagem Prévia
          </div>
          <span className="text-[11px] font-bold text-zinc-500 bg-zinc-100 dark:bg-white/[0.06] px-3 py-1 rounded-full border border-zinc-200/60 dark:border-white/[0.06]">
            {respondidasCount} de {totalCount} respondida(s)
          </span>
        </div>

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-zinc-950 dark:text-white leading-tight">
          Cuidados e Orientações
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
          Responda a estas breves perguntas para personalizarmos os cuidados antes do seu atendimento.
        </p>
      </div>

      <div className="space-y-5">
        {perguntasAtuais.map((pergunta, pIdx) => {
          const selecionada = respostasTriagem[pergunta.id];

          return (
            <motion.div
              key={pergunta.id}
              variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
              className="p-5 sm:p-6 bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-xl border border-zinc-200/80 dark:border-white/10 rounded-3xl shadow-sm space-y-4"
            >
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {pIdx + 1}
                </span>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-zinc-950 dark:text-white leading-snug">
                    {pergunta.titulo || pergunta.texto_pergunta || pergunta.enunciado}
                  </h3>
                  {pergunta.descricao && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                      {pergunta.descricao}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-2.5 pt-1 pl-9">
                {(pergunta.opcoes || []).map((opcao) => {
                  const isChecked =
                    selecionada?.id === opcao.id ||
                    selecionada === opcao.id ||
                    selecionada === opcao.texto;
                  return (
                    <motion.button
                      key={opcao.id || opcao.texto}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => handleSelectOption(pergunta.id, opcao)}
                      className={`w-full min-h-[48px] p-3.5 sm:p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                        isChecked
                          ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-zinc-950 dark:border-white font-bold shadow-md"
                          : "bg-zinc-50/70 dark:bg-zinc-900/50 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 text-zinc-800 dark:text-zinc-200 font-medium"
                      }`}
                    >
                      <span className="text-xs sm:text-sm font-medium">
                        {opcao.texto || opcao.nome || opcao.label}
                      </span>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                          isChecked
                            ? "bg-[#9FC131] text-black"
                            : "border-2 border-zinc-300 dark:border-zinc-700"
                        }`}
                      >
                        {isChecked && <Check size={12} strokeWidth={3} />}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
