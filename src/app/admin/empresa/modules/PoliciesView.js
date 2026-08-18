"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileQuestion, Save, Clock, ShieldCheck } from "lucide-react";
import { fadeUp, ButtonPrimary, ToggleSwitch, TextInput } from "../components/SharedUI";
import { fetchAdminPolicies, actionSalvarPolicies } from "@/actions/adminData";

export default function PoliciesView({ showToast }) {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    retorno_prazo_dias: 30,
    retorno_exige_pagamento: true,
    delay_confirmacao_segundos: 0
  });

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchAdminPolicies();
        if (data) setConfig((prev) => ({ ...prev, ...data }));
      } catch (err) {
        if (showToast) showToast("Erro ao carregar políticas de atendimento.", "error");
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await actionSalvarPolicies(config);
      if (showToast) showToast("Políticas de atendimento salvas com sucesso!");
    } catch (err) {
      if (showToast) showToast(`Erro ao salvar políticas: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div key="policies" {...fadeUp} className="flex-1 flex flex-col h-full overflow-hidden w-full max-w-5xl mx-auto p-4 md:p-6 lg:p-8">
      
      {/* CABEÇALHO COM BOTÃO SALVAR */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200/80 dark:border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 shadow-sm">
            <FileQuestion size={20} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-950 dark:text-white tracking-tight">
              Políticas de Atendimento
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Defina as regras de elegibilidade para consultas de retorno e tempo de confirmação.
            </p>
          </div>
        </div>

        <ButtonPrimary
          onClick={handleSave}
          disabled={loading}
          icon={Save}
          className="px-6 py-2 text-xs min-h-[38px] rounded-xl"
        >
          {loading ? "Salvando..." : "Salvar Políticas"}
        </ButtonPrimary>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pb-24 pr-1">
        <section className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-8 rounded-[2rem] shadow-sm space-y-6">
          
          <div className="space-y-4">
            <h3 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2 border-b border-zinc-100 dark:border-white/5 pb-3">
              <Clock size={18} strokeWidth={1.5} className="text-blue-500" /> Regras para Consulta de Retorno
            </h3>

            <div className="grid md:grid-cols-2 gap-4 items-center">
              <TextInput
                type="number"
                label="Prazo Máximo do Retorno (dias)"
                placeholder="Ex: 30"
                value={config.retorno_prazo_dias}
                onChange={(e) => setConfig({ ...config, retorno_prazo_dias: e.target.value })}
              />

              <div className="p-4 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between">
                <ToggleSwitch
                  checked={Boolean(config.retorno_exige_pagamento)}
                  onChange={(v) => setConfig({ ...config, retorno_exige_pagamento: v })}
                  label="Exigir Pagamento na Inicial"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-3 border-t border-zinc-100 dark:border-white/5">
            <h3 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2 border-b border-zinc-100 dark:border-white/5 pb-3">
              <ShieldCheck size={18} strokeWidth={1.5} className="text-indigo-500" /> Confirmação e Trava
            </h3>

            <div className="grid md:grid-cols-2 gap-4">
              <TextInput
                type="number"
                label="Delay de Revisão (segundos)"
                placeholder="Ex: 0 (sem atraso)"
                value={config.delay_confirmacao_segundos}
                onChange={(e) => setConfig({ ...config, delay_confirmacao_segundos: e.target.value })}
              />
            </div>
          </div>

        </section>
      </div>

    </motion.div>
  );
}
