"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, CreditCard, Lock, Sparkles, Building2, Check } from "lucide-react";
import { useAgendamento } from "../context";
import { playDopamineSound, triggerHaptic } from "@/lib/dopamine";

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
    playDopamineSound("click");
    triggerHaptic("light");

    if (mod.exige_senha && formData.modalidade !== mod.nome) {
      setAuthMod(mod);
      setSenhaInput("");
    } else {
      setValue("modalidade", mod.nome);
      setAuthMod(null);
      playDopamineSound("select");
    }
  };

  const tryAuth = () => {
    if (senhaInput === authMod.senha) {
      setValue("modalidade", authMod.nome);
      setAuthMod(null);
      showIsland("Acesso Liberado!", "success");
      playDopamineSound("unlock");
      triggerHaptic("success");
    } else {
      showIsland("Senha de autorização incorreta.", "error");
      playDopamineSound("error");
      triggerHaptic("error");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-xl mx-auto text-left space-y-6"
    >
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold uppercase tracking-wider mb-2.5 shadow-sm">
          <ShieldCheck size={13} strokeWidth={2} /> Cobertura & Pagamento
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-zinc-950 dark:text-white leading-tight">
          Como será o atendimento?
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
          Escolha a modalidade de cobertura para verificarmos os requisitos e condições adequadas.
        </p>
      </div>

      {formData.tipo_servico === "Retorno" ? (
        <div className="p-7 sm:p-8 border border-zinc-200/80 dark:border-white/10 rounded-3xl bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl shadow-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-200/50">
            <ShieldCheck size={28} strokeWidth={2} />
          </div>
          <h3 className="text-lg sm:text-xl font-extrabold text-zinc-950 dark:text-white">Retorno Isento</h3>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed max-w-sm mx-auto">
            Dentro da janela de {empresaDados?.config_regras?.retorno_prazo_dias || 30} dias definida pela clínica.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {opcoes.map((m) => {
            const isSelected = formData.modalidade === m.nome;

            return (
              <motion.div
                layout
                key={m.id}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={`border rounded-3xl overflow-hidden transition-all backdrop-blur-xl cursor-pointer ${
                  isSelected
                    ? "border-zinc-950 bg-zinc-50/90 dark:border-white dark:bg-white/[0.08] shadow-lg ring-2 ring-[#9FC131]"
                    : "border-zinc-200/80 dark:border-white/10 hover:border-zinc-400 bg-white/80 dark:bg-[#0c0c0e]/80 shadow-sm"
                }`}
              >
                <AnimatePresence mode="wait">
                  {authMod?.id === m.id ? (
                    <motion.div
                      key="auth"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center p-6 gap-3 text-center"
                    >
                      <Lock size={22} className="text-zinc-900 dark:text-white mb-1" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        Acesso Restrito
                      </p>

                      <input
                        type="password"
                        autoFocus
                        placeholder="Senha de autorização..."
                        value={senhaInput}
                        onChange={(e) => setSenhaInput(e.target.value)}
                        className="w-full text-center px-4 py-3 min-h-[44px] text-sm bg-white dark:bg-black border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:border-[#9FC131]"
                      />

                      <div className="flex w-full gap-2 mt-2">
                        <button
                          onClick={() => setAuthMod(null)}
                          className="flex-1 min-h-[44px] text-xs font-bold text-zinc-500 hover:text-zinc-950 dark:hover:text-white transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={tryAuth}
                          className="flex-1 min-h-[44px] bg-zinc-950 dark:bg-white text-white dark:text-black text-xs font-bold rounded-2xl shadow-sm"
                        >
                          Confirmar
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelect(m)}
                      className="w-full p-6 flex flex-col items-center justify-center gap-4 min-h-[140px] text-center"
                    >
                      <div
                        className={`w-13 h-13 rounded-2xl flex items-center justify-center border transition-all ${
                          isSelected
                            ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-transparent shadow-sm"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-200/50 dark:border-zinc-700/50"
                        }`}
                      >
                        {m.exige_senha ? (
                          <Lock size={24} strokeWidth={2} />
                        ) : m.nome.toLowerCase().includes("conv") ? (
                          <Building2 size={24} strokeWidth={2} />
                        ) : (
                          <CreditCard size={24} strokeWidth={2} />
                        )}
                      </div>
                      <div>
                        <span className="font-extrabold text-base text-zinc-950 dark:text-white block">
                          {m.nome}
                        </span>
                        <span className="text-[11px] text-zinc-400 block mt-0.5">
                          {m.nome.toLowerCase().includes("conv") ? "Planos aceitos" : "Pagamento direto"}
                        </span>
                      </div>
                      {isSelected && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#86a621] dark:text-[#9FC131] uppercase tracking-wider">
                          <Check size={12} strokeWidth={3} /> Selecionado
                        </span>
                      )}
                    </button>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
