// src/app/[slug]/agendamentos/modules/ModuleModalidade.js
"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, CreditCard, Lock } from "lucide-react";
import { useAgendamento } from "../context";

export default function ModuleModalidade() {
  const { formData, setValue, empresaDados, showIsland } = useAgendamento();
  
  const configCampos = empresaDados?.config_campos || {};
  const opcoes = configCampos.modalidades_opcoes || [
    { id: "1", nome: "Particular", exige_senha: false, senha: "" },
    { id: "2", nome: "Convênio", exige_senha: false, senha: "" }
  ];

  const [authMod, setAuthMod] = useState(null);
  const [senhaInput, setSenhaInput] = useState("");

  const handleSelect = (mod) => {
    if (mod.exige_senha && formData.modalidade !== mod.nome) {
      setAuthMod(mod);
      setSenhaInput("");
    } else {
      setValue("modalidade", mod.nome);
      setAuthMod(null);
    }
  };

  const tryAuth = () => {
    if (senhaInput === authMod.senha) {
      setValue("modalidade", authMod.nome);
      setAuthMod(null);
      showIsland("Acesso Liberado!", "success");
    } else {
      showIsland("Senha de autorização incorreta.", "error");
    }
  };

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="max-w-lg mx-auto text-center space-y-6">
      <div>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Como será o atendimento?</h2>
        <p className="text-zinc-500 text-sm md:text-base mt-2">Escolha a opção correspondente para vermos as condições corretas.</p>
      </div>

      {formData.tipo_servico === "Retorno" ? (
        <div className="p-8 border rounded-3xl bg-zinc-50 dark:bg-[#111111]">
          <ShieldCheck className="w-10 h-10 mx-auto mb-4 text-zinc-400" />
          <h3 className="text-lg font-medium">Retorno Isento</h3>
          <p className="text-sm text-zinc-500 mt-2">Dentro da janela de {empresaDados?.config_regras?.retorno_prazo_dias || 30} dias definida pela clínica.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {opcoes.map(m => (
            <motion.div layout key={m.id} className={`border rounded-3xl overflow-hidden transition-all ${formData.modalidade === m.nome ? "border-zinc-900 bg-zinc-50 dark:border-white dark:bg-[#111111] shadow-md scale-[1.02]" : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 bg-white dark:bg-transparent"}`}>
              <AnimatePresence mode="wait">
                {authMod?.id === m.id ? (
                  <motion.div key="auth" initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} exit={{opacity:0}} className="flex flex-col items-center justify-center p-6 gap-3">
                    <Lock size={20} className="text-zinc-900 dark:text-white mb-1" />
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Acesso Restrito</p>
                    
                    <input 
                      type="password" 
                      autoFocus
                      placeholder="Senha exigida..." 
                      value={senhaInput} 
                      onChange={e => setSenhaInput(e.target.value)}
                      className="w-full text-center px-4 py-2 mt-2 text-sm bg-white dark:bg-black border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:border-zinc-900 dark:focus:border-white"
                    />
                    
                    <div className="flex w-full gap-2 mt-2">
                      <button onClick={() => setAuthMod(null)} className="flex-1 py-2.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">Cancelar</button>
                      <button onClick={tryAuth} className="flex-1 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-black text-xs font-bold rounded-xl shadow-sm">Confirmar</button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.button key="btn" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => handleSelect(m)} className="w-full p-6 flex flex-col items-center justify-center gap-4">
                    {m.exige_senha 
                      ? <Lock size={28} className={formData.modalidade === m.nome ? "" : "text-zinc-400"} /> 
                      : <CreditCard size={28} className={formData.modalidade === m.nome ? "" : "text-zinc-400"} />
                    }
                    <span className="font-medium text-sm">{m.nome}</span>
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
