"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileQuestion, Save, Clock, CreditCard, ShieldCheck } from "lucide-react";
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
      
      {/* PADRÃO UNIFICADO DE CABEÇALHO */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 shadow-sm">
            <FileQuestion size={24} />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
              Políticas de Atendimento
            </h2>
            <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
              Defina as regras de elegibilidade para consultas de retorno e tempo de confirmação.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 pb-28">
        
        <section className="bg-white dark:bg-[#111] border border-zinc-200/80 dark:border-zinc-800 p-8 rounded-[2.5rem] shadow-sm space-y-8">
          
          <div className="space-y-6">
            <h3 className="text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <Clock size={20} className="text-blue-500" /> Regras para Consulta de Retorno
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
              <TextInput
                type="number"
                label="Prazo Máximo do Retorno (dias)"
                placeholder="Ex: 30"
                value={config.retorno_prazo_dias}
                onChange={(e) => setConfig({ ...config, retorno_prazo_dias: e.target.value })}
              />

              <div className="p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <ToggleSwitch
                  checked={Boolean(config.retorno_exige_pagamento)}
                  onChange={(v) => setConfig({ ...config, retorno_exige_pagamento: v })}
                  label="Exigir Pagamento Concluído na Consulta Inicial"
                />
              </div>
            </div>
          </div>

          <div className="space-y-6 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <h3 className="text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <ShieldCheck size={20} className="text-indigo-500" /> Confirmação e Trava
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
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

      <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-t border-zinc-200/80 dark:border-zinc-800 flex justify-end items-center z-50">
        <ButtonPrimary onClick={handleSave} disabled={loading} icon={Save} className="w-full md:w-auto px-12 py-4 text-sm">
          {loading ? "Salvando Políticas..." : "Salvar Políticas de Atendimento"}
        </ButtonPrimary>
      </div>

    </motion.div>
  );
}
