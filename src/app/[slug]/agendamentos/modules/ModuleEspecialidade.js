"use client";

import { motion } from "framer-motion";
import { User, Activity, HeartPulse } from "lucide-react";
import { useAgendamento } from "../context";

export default function ModuleEspecialidade() {
  const { formData, setValue, flags, setFlags, servicosDB, perguntasAtuais, modulosAtivos, setCurrentStepIndex } = useAgendamento();
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="max-w-2xl mx-auto space-y-6">
      <div><h2 className="text-3xl font-medium">Direcionamento</h2><p className="text-zinc-500 text-sm mt-2">Selecione a categoria.</p></div>
      
      {flags.exibirConfUri && !flags.confirmouUri ? (
        <div className="text-center max-w-md mx-auto py-6">
          <h3 className="text-2xl font-medium">Verificação de Agendamento</h3>
          <p className="text-zinc-500 text-sm mt-2">Você selecionou através do WhatsApp:</p>
          
          <div className="my-6 inline-block bg-zinc-50 dark:bg-[#111111] border border-zinc-200 dark:border-zinc-800 px-8 py-5 rounded-3xl w-full shadow-sm">
            <span className="block font-semibold text-lg text-zinc-900 dark:text-white">{formData.medico_profissional || formData.subtipo_exame}</span>
            <span className="block text-[11px] font-bold text-zinc-400 uppercase mt-2 tracking-widest">{formData.tipo_servico}</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <button onClick={() => { 
              setFlags(f => ({...f, confirmouUri: true})); 
              const idxTriagem = modulosAtivos.indexOf("triagem");
              const idxModalidade = modulosAtivos.indexOf("modalidade");
              if (idxTriagem !== -1 && perguntasAtuais.length > 0) return setCurrentStepIndex(idxTriagem);
              if (idxModalidade !== -1) return setCurrentStepIndex(idxModalidade);
              setCurrentStepIndex(p => p + 1); 
            }} className="w-full sm:w-1/2 py-3.5 bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-black rounded-full font-bold text-sm shadow-md transition-transform hover:scale-[1.02]">
              Continuar
            </button>
            <button onClick={() => { setFlags(f => ({...f, exibirConfUri: false})); setValue("medico_profissional", ""); setValue("subtipo_exame", "");}} className="w-full sm:w-1/2 py-3.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-[#111111] rounded-full font-medium text-sm transition-colors text-zinc-900 dark:text-white">
              Selecionar outro profissional
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-6 w-full">
          <div className="w-full md:w-1/3 flex flex-col gap-3">
            {[{id: "Consulta", i: User}, {id: "Retorno", i: Activity}, {id: "Exame", i: HeartPulse}].map(s => (
              <button key={s.id} onClick={() => { setValue("tipo_servico", s.id); setValue("medico_profissional", ""); setValue("subtipo_exame", ""); }} className={`p-4 rounded-2xl flex items-center gap-4 border text-left w-full transition-all ${formData.tipo_servico === s.id ? "border-zinc-900 bg-zinc-50 dark:border-white dark:bg-[#111111] shadow-sm scale-[1.01]" : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"}`}><s.i size={18} className={formData.tipo_servico === s.id ? "" : "text-zinc-400"} /><span className={`text-sm ${formData.tipo_servico === s.id ? "font-semibold" : "font-medium"}`}>{s.id}</span></button>
            ))}
          </div>
          <div className="w-full md:w-2/3">
            {["Consulta", "Retorno"].includes(formData.tipo_servico) && (
              <div><label className="text-[10px] font-bold text-zinc-400 uppercase mb-3 block tracking-widest">Corpo Clínico</label><div className="grid gap-3">
                {servicosDB.filter(s => s.tipo === "Consulta").map(m => (
                  <button key={m.id} onClick={() => setValue("medico_profissional", m.nome)} className={`p-4 border rounded-2xl text-left text-sm transition-all ${formData.medico_profissional === m.nome ? "border-zinc-900 font-semibold bg-zinc-50 dark:border-white dark:bg-[#111111] shadow-sm scale-[1.01]" : "border-zinc-200 dark:border-zinc-800 font-medium text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"}`}>{m.nome}</button>
                ))}
              </div></div>
            )}
            {formData.tipo_servico === "Exame" && (
              <div><label className="text-[10px] font-bold text-zinc-400 uppercase mb-3 block tracking-widest">Exames</label><div className="grid gap-3">
                {servicosDB.filter(s => s.tipo === "Exame").map(e => (
                  <button key={e.id} onClick={() => setValue("subtipo_exame", e.nome)} className={`p-4 border rounded-2xl text-left text-sm transition-all ${formData.subtipo_exame === e.nome ? "border-zinc-900 font-semibold bg-zinc-50 dark:border-white dark:bg-[#111111] shadow-sm scale-[1.01]" : "border-zinc-200 dark:border-zinc-800 font-medium text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"}`}>{e.nome}</button>
                ))}
              </div></div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}