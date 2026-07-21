"use client";

import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import { useAgendamento } from "../context";

export default function ModuleTriagem() {
  const { perguntasAtuais, respostasTriagem, setRespostasTriagem } = useAgendamento();
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="max-w-xl mx-auto space-y-6">
      <div><h2 className="text-3xl font-medium">Triagem Clínica</h2><p className="text-zinc-500 text-sm mt-2">Responda para prosseguir com o preparo.</p></div>
      
      <div className="space-y-6 mt-6">
        {perguntasAtuais.map((pergunta, index) => (
          <div key={pergunta.id} className="p-6 bg-zinc-50/80 dark:bg-[#111111]/80 border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl">
            <h4 className="font-medium text-sm flex items-start gap-2 mb-4">
              <HelpCircle size={18} className="text-zinc-400 shrink-0 mt-0.5" /> 
              {pergunta.pergunta}
            </h4>
            <div className="grid gap-2">
              {pergunta.opcoes.map(opcao => (
                <button 
                  key={opcao.id} 
                  onClick={() => setRespostasTriagem(prev => ({...prev, [pergunta.id]: opcao}))}
                  className={`p-3.5 text-sm text-left border rounded-2xl transition-all ${respostasTriagem[pergunta.id]?.id === opcao.id ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-black dark:border-white shadow-md scale-[1.01]" : "bg-white dark:bg-black border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"}`}
                >
                  {opcao.texto_opcao}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}