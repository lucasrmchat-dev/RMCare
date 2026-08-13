"use client";

import { motion } from "framer-motion";
import { HelpCircle, CheckCircle2 } from "lucide-react";
import { useAgendamento } from "../context";

export default function ModuleTriagem() {
  const { perguntasAtuais, respostasTriagem, setRespostasTriagem } = useAgendamento();

  const handleOptionClick = (perguntaId, opcao, isObrigatoria) => {
    // Se a pergunta for opcional e o paciente clicar na mesma opção selecionada, desmarca
    if (isObrigatoria === false && respostasTriagem[perguntaId]?.id === opcao.id) {
      setRespostasTriagem((prev) => {
        const copy = { ...prev };
        delete copy[perguntaId];
        return copy;
      });
      return;
    }
    setRespostasTriagem((prev) => ({ ...prev, [perguntaId]: opcao }));
  };

  return (
    <motion.div initial="hidden" animate="show" variants={{show:{transition:{staggerChildren:.08}}}} className="max-w-xl mx-auto space-y-6">
      <motion.div variants={{hidden:{opacity:0,y:12},show:{opacity:1,y:0}}}>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Antes de escolher o horário</h2>
        <p className="text-zinc-500 text-sm md:text-base mt-2">Estas respostas ajudam a oferecer datas seguras para o seu atendimento.</p>
      </motion.div>
      
      <div className="space-y-6 mt-6">
        {perguntasAtuais.map((pergunta) => {
          const isObrigatoria = pergunta.obrigatoria !== false;
          return (
            <motion.div
              variants={{hidden:{opacity:0,y:14},show:{opacity:1,y:0}}}
              key={pergunta.id}
              className="p-5 md:p-6 bg-white dark:bg-[#111111]/80 border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl shadow-sm space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-medium text-sm flex items-start gap-2 text-zinc-900 dark:text-white">
                  <HelpCircle size={18} className="text-zinc-400 shrink-0 mt-0.5" /> 
                  <span>{pergunta.pergunta}</span>
                </h4>
                {!isObrigatoria ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded-md flex-shrink-0">
                    Opcional
                  </span>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 bg-red-50 dark:bg-red-950/40 px-2.5 py-0.5 rounded-md flex-shrink-0">
                    Obrigatória
                  </span>
                )}
              </div>

              <div className="grid gap-2">
                {pergunta.opcoes.map((opcao) => {
                  const isSelected = respostasTriagem[pergunta.id]?.id === opcao.id;
                  return (
                    <button 
                      key={opcao.id} 
                      type="button"
                      onClick={() => handleOptionClick(pergunta.id, opcao, isObrigatoria)}
                      className={`min-h-12 p-3.5 text-sm text-left border rounded-2xl transition-all flex items-center justify-between ${
                        isSelected
                          ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-black dark:border-white shadow-md"
                          : "bg-zinc-50 dark:bg-black border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 text-zinc-800 dark:text-zinc-200"
                      }`}
                    >
                      <span>{opcao.texto_opcao}</span>
                      {isSelected && <CheckCircle2 size={16} className="text-white dark:text-black flex-shrink-0" />}
                    </button>
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
