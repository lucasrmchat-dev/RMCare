"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Stethoscope, User, Search, Check } from "lucide-react";
import { useAgendamento } from "../context";
import { playDopamineSound, triggerHaptic } from "@/lib/dopamine";

export default function ModuleEspecialidade() {
  const {
    formData,
    setValue,
    servicosDB,
    flags,
    setFlags,
    modulosAtivos,
    setCurrentStepIndex,
    perguntasAtuais
  } = useAgendamento();

  const [filterSearch, setFilterSearch] = useState("");

  const especialidades = [
    ...new Set(
      servicosDB
        .filter((s) => s.especialidade)
        .flatMap((s) => s.especialidade.split(",").map((e) => e.trim()))
    )
  ].sort();

  useEffect(() => {
    if (formData.especialidade && formData.medico_profissional) {
      setValue("medico_profissional", "");
      setValue("subtipo_exame", "");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredEspecialidades = especialidades.filter((e) =>
    e.toLowerCase().includes(filterSearch.toLowerCase())
  );

  const especialistasDaEspecialidade = servicosDB.filter((s) =>
    s.especialidade &&
    s.especialidade
      .split(",")
      .map((e) => e.trim())
      .includes(formData.especialidade)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-2xl mx-auto space-y-6 text-left"
    >
      <div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-zinc-950 dark:text-white leading-tight">
          Direcionamento Clínico
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
          {!formData.especialidade
            ? "Selecione a especialidade desejada para listar os profissionais disponíveis."
            : `Especialidade: ${formData.especialidade}. Escolha o especialista.`}
        </p>
      </div>

      {flags.exibirConfUri && !flags.confirmouUri ? (
        <div className="text-center max-w-md mx-auto py-6">
          <h3 className="text-xl font-bold text-zinc-950 dark:text-white">Verificação de Agendamento</h3>
          <p className="text-zinc-500 text-xs sm:text-sm mt-1">Você selecionou previamente:</p>

          <div className="my-6 bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-zinc-200/80 dark:border-white/10 px-8 py-5 rounded-3xl w-full shadow-sm">
            <span className="block font-extrabold text-lg text-zinc-900 dark:text-white">
              {formData.medico_profissional}
            </span>
            <span className="block text-[10px] font-bold text-zinc-400 uppercase mt-1 tracking-widest">
              Profissional Selecionado
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <button
              onClick={() => {
                playDopamineSound("select");
                triggerHaptic("light");
                setFlags((f) => ({ ...f, confirmouUri: true }));
                const idxTriagem = modulosAtivos.indexOf("triagem");
                const idxModalidade = modulosAtivos.indexOf("modalidade");
                if (idxTriagem !== -1 && perguntasAtuais.length > 0)
                  return setCurrentStepIndex(idxTriagem);
                if (idxModalidade !== -1) return setCurrentStepIndex(idxModalidade);
                setCurrentStepIndex((p) => p + 1);
              }}
              className="w-full sm:w-1/2 min-h-[48px] py-3.5 bg-zinc-950 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-black rounded-full font-bold text-xs uppercase tracking-wider shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Confirmar e Avançar
            </button>
            <button
              onClick={() => {
                playDopamineSound("click");
                setFlags((f) => ({ ...f, exibirConfUri: false }));
                setValue("medico_profissional", "");
                setValue("especialidade", "");
              }}
              className="w-full sm:w-1/2 min-h-[48px] py-3.5 border border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full font-bold text-xs uppercase tracking-wider transition-colors text-zinc-900 dark:text-white"
            >
              Outro Profissional
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full space-y-4">
          {!formData.especialidade ? (
            <div className="space-y-4">
              {especialidades.length > 4 && (
                <div className="relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    placeholder="Filtrar especialidade..."
                    className="w-full min-h-[44px] pl-10 pr-4 py-2.5 bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-zinc-200/80 dark:border-white/10 rounded-2xl text-xs font-medium outline-none focus:border-[#9FC131] transition-all"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {filteredEspecialidades.length > 0 ? (
                  filteredEspecialidades.map((esp) => (
                    <motion.button
                      whileHover={{ scale: 1.01, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      key={esp}
                      onClick={() => {
                        playDopamineSound("select");
                        triggerHaptic("light");
                        setValue("especialidade", esp);
                        setValue("medico_profissional", "");
                        setValue("tipo_servico", "");
                      }}
                      className="min-h-[56px] p-4 sm:p-5 border rounded-2xl flex items-center gap-3.5 text-left transition-all border-zinc-200/80 dark:border-white/10 hover:border-[#9FC131] bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-xl shadow-sm hover:shadow-md"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                        <Stethoscope size={20} strokeWidth={2} />
                      </div>
                      <span className="font-bold text-zinc-950 dark:text-white text-sm sm:text-base">
                        {esp}
                      </span>
                    </motion.button>
                  ))
                ) : (
                  <div className="col-span-2 p-8 text-center border border-dashed rounded-3xl border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-white/[0.02]">
                    <p className="text-zinc-500 font-medium text-sm">Nenhuma especialidade correspondente.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <button
                onClick={() => {
                  playDopamineSound("click");
                  setValue("especialidade", "");
                  setValue("medico_profissional", "");
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-full text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 transition-colors min-h-[36px]"
              >
                <ChevronLeft size={15} /> Voltar para Especialidades
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {especialistasDaEspecialidade.map((m) => {
                  const isSelected =
                    formData.medico_profissional === m.nome || formData.subtipo_exame === m.nome;

                  return (
                    <motion.button
                      whileHover={{ scale: 1.01, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      key={m.id}
                      onClick={() => {
                        playDopamineSound("select");
                        triggerHaptic("light");
                        const tipo = m.tipo || "Consulta";
                        setValue("tipo_servico", tipo);
                        setValue("medico_profissional", tipo === "Exame" ? "" : m.nome);
                        setValue("subtipo_exame", tipo === "Exame" ? m.nome : "");
                        setValue("modalidade", "");
                        setValue("data_agendamento", "");
                        setValue("horario_agendamento", "");
                      }}
                      className={`min-h-[64px] p-4 sm:p-5 border rounded-2xl flex items-center justify-between text-left transition-all ${
                        isSelected
                          ? "border-zinc-950 bg-zinc-50 dark:border-white dark:bg-white/[0.08] shadow-md ring-2 ring-[#9FC131]"
                          : "border-zinc-200/80 dark:border-white/10 hover:border-zinc-400 bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-xl"
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                            isSelected
                              ? "bg-zinc-950 text-white dark:bg-white dark:text-black"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-200/50 dark:border-zinc-700/50"
                          }`}
                        >
                          <User size={20} strokeWidth={2} />
                        </div>
                        <div className="truncate">
                          <span
                            className={`block text-sm sm:text-base truncate ${
                              isSelected
                                ? "font-black text-zinc-950 dark:text-white"
                                : "font-bold text-zinc-800 dark:text-zinc-200"
                            }`}
                          >
                            {m.nome}
                          </span>
                          <span className="text-[10px] text-zinc-400 uppercase tracking-widest mt-0.5 block">
                            {m.tipo || "Especialista"}
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-[#9FC131] text-black flex items-center justify-center shrink-0 shadow-sm">
                          <Check size={14} strokeWidth={3} />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
}
