"use client";

import { motion } from "framer-motion";
import { ShieldCheck, CreditCard } from "lucide-react";
import { useAgendamento } from "../context";

export default function ModuleModalidade() {
  const { formData, setValue } = useAgendamento();
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="max-w-lg mx-auto text-center space-y-6">
      <div><h2 className="text-3xl font-medium">Garantia Financeira</h2><p className="text-zinc-500 text-sm mt-2">Escolha a cobertura.</p></div>
      {formData.tipo_servico === "Retorno" ? (
        <div className="p-8 border rounded-3xl bg-zinc-50 dark:bg-[#111111]"><ShieldCheck className="w-10 h-10 mx-auto mb-4 text-zinc-400" /><h3 className="text-lg font-medium">Retorno Isento</h3><p className="text-sm text-zinc-500 mt-2">Dentro da janela regulamentar de 30 dias.</p></div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {[{id: "Convênio", i: ShieldCheck, lbl: "Convênio Médico"}, {id: "Particular", i: CreditCard, lbl: "Particular"}].map(m => (
            <button key={m.id} onClick={() => setValue("modalidade", m.id)} className={`p-6 border rounded-3xl flex flex-col items-center gap-4 transition-all ${formData.modalidade === m.id ? "border-zinc-900 bg-zinc-50 dark:border-white dark:bg-[#111111] shadow-md scale-[1.02]" : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"}`}><m.i size={28} className={formData.modalidade === m.id ? "" : "text-zinc-400"} /><span className="font-medium text-sm">{m.lbl}</span></button>
          ))}
        </div>
      )}
    </motion.div>
  );
}