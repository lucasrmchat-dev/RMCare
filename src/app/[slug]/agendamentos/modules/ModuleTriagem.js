"use client";

import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import { useAgendamento } from "../context";

export default function ModuleTriagem() {
  const { perguntasAtuais, respostasTriagem, setRespostasTriagem } = useAgendamento();
  return (
    <motion.div initial="hidden" animate="show" variants={{show:{transition:{staggerChildren:.08}}}} className="max-w-xl mx-auto space-y-6">
      <motion.div variants={{hidden:{opacity:0,y:12},show:{opacity:1,y:0}}}><h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Antes de escolher o horário</h2><p className="text-zinc-500 text-sm md:text-base mt-2">Estas respostas ajudam a oferecer datas seguras para o seu atendimento.</p></motion.div>
      
      <div className="space-y-6 mt-6">
        {perguntasAtuais.map((pergunta, index) => (
          <motion.div variants={{hidden:{opacity:0,y:14},show:{opacity:1,y:0}}} key={pergunta.id} className="p-5 md:p-6 bg-white dark:bg-[#111111]/80 border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl shadow-sm">
            <h4 className="font-medium text-sm flex items-start gap-2 mb-4">
              <HelpCircle size={18} className="text-zinc-400 shrink-0 mt-0.5" /> 
              {pergunta.pergunta}
            </h4>
            <div className="grid gap-2">
              {pergunta.opcoes.map(opcao => (
                <button 
                  key={opcao.id} 
                  onClick={() => setRespostasTriagem(prev => ({...prev, [pergunta.id]: opcao}))}
                  className={`min-h-12 p-3.5 text-sm text-left border rounded-2xl transition-all ${respostasTriagem[pergunta.id]?.id === opcao.id ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-black dark:border-white shadow-md" : "bg-zinc-50 dark:bg-black border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600"}`}
                >
                  {opcao.texto_opcao}
                </button>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
