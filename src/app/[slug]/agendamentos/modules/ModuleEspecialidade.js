"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Stethoscope,
  MessageCircle,
  Sparkles,
  User,
  Search,
  Check,
  Tag,
  ArrowLeft,
  CalendarDays,
  Activity,
  ShieldCheck
} from "lucide-react";
import { useAgendamento } from "../context";
import { formatarMensagemWhatsAppRedirect } from "../utils";
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
    perguntasAtuais,
    empresaDados
  } = useAgendamento();

  const [filterSearch, setFilterSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todas");

  // Especialista redirecionando para WhatsApp (Ativo Parcial) derivado diretamente do profissional selecionado
  const specialistRedirecting = useMemo(() => {
    if (!formData.medico_profissional) return null;
    const cleanTarget = String(formData.medico_profissional).toLowerCase().trim();
    const match = (servicosDB || []).find((s) => {
      if (s.ativo === false) return false;
      const sNome = (s.nome || "").toLowerCase().trim();
      const sNomeSemDr = sNome.replace(/dra\.|dr\./g, "").trim();
      const targetSemDr = cleanTarget.replace(/dra\.|dr\./g, "").trim();
      return (
        sNome === cleanTarget ||
        sNomeSemDr === targetSemDr ||
        String(s.codigo_uri || "").toLowerCase().trim() === cleanTarget ||
        String(s.numero_especialista || "").trim() === cleanTarget ||
        String(s.id || "").trim() === cleanTarget
      );
    });
    if (match && (match.redirecionar_whatsapp || match.status_agendamento === "whatsapp")) {
      return match;
    }
    return null;
  }, [formData.medico_profissional, servicosDB]);

  // Lista de categorias configuradas na clínica
  const categoriasDisponiveis = useMemo(() => {
    const fromConfig = Array.isArray(empresaDados?.config_campos?.categorias_atendimento)
      ? empresaDados.config_campos.categorias_atendimento
      : [];
    const fromEsps = Array.isArray(empresaDados?.config_campos?.especialidades_categorizadas)
      ? empresaDados.config_campos.especialidades_categorizadas.map((e) => e.categoria).filter(Boolean)
      : [];
    const setCats = new Set([...fromConfig, ...fromEsps]);
    return [...setCats].filter(Boolean);
  }, [empresaDados]);

  // Lista estruturada de especialidades com categoria
  const catalogoEspecialidades = useMemo(() => {
    const fromConfig = Array.isArray(empresaDados?.config_campos?.especialidades_categorizadas)
      ? empresaDados.config_campos.especialidades_categorizadas
      : [];

    const fromServicos = (servicosDB || [])
      .filter((s) => s.especialidade)
      .flatMap((s) => s.especialidade.split(",").map((e) => e.trim()))
      .filter(Boolean);

    const todasNomes = [...new Set([...fromConfig.map((e) => e.nome), ...fromServicos])].filter(Boolean).sort();

    return todasNomes.map((nome) => {
      const confItem = fromConfig.find((c) => c.nome.toLowerCase() === nome.toLowerCase());
      const isExame = /(colonoscopia|endoscopia|ultrassom|exame|raio-x|tomografia|ressonancia)/i.test(nome);
      return {
        nome,
        categoria: confItem?.categoria || (isExame ? "Exames" : "Consultas")
      };
    });
  }, [empresaDados, servicosDB]);

  const filteredEspecialidades = useMemo(() => {
    return catalogoEspecialidades.filter((esp) => {
      if (activeCategory !== "Todas" && esp.categoria !== activeCategory) return false;
      if (filterSearch.trim() && !esp.nome.toLowerCase().includes(filterSearch.toLowerCase())) return false;
      return true;
    });
  }, [catalogoEspecialidades, activeCategory, filterSearch]);

  const especialistasDaEspecialidade = useMemo(() => {
    if (!formData.especialidade) return [];
    return (servicosDB || []).filter((s) => {
      if (!s.especialidade) return true;
      const esps = s.especialidade.split(",").map((e) => e.trim().toLowerCase());
      return esps.includes(formData.especialidade.toLowerCase()) || esps.length === 0;
    });
  }, [servicosDB, formData.especialidade]);

  const handleSelectEspecialidade = (espObj) => {
    playDopamineSound("select");
    triggerHaptic("light");
    const isExame = espObj.categoria === "Exames" || /(exame|colonoscopia|endoscopia|ultrassom)/i.test(espObj.nome);
    setValue("especialidade", espObj.nome);
    setValue("tipo_servico", isExame ? "Exame" : "Consulta");
    setValue("medico_profissional", "");
    setValue("subtipo_exame", "");
  };

  const handleSelectProfissional = (m) => {
    playDopamineSound("select");
    triggerHaptic("light");
    const isExame = formData.tipo_servico === "Exame";
    setValue("medico_profissional", m.nome);
    setValue("subtipo_exame", isExame ? (formData.especialidade || m.nome) : "");
    setValue("data_agendamento", "");
    setValue("horario_agendamento", "");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-2xl mx-auto space-y-6 text-left"
    >
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[11px] font-bold uppercase tracking-wider mb-2.5 shadow-sm">
          <Stethoscope size={13} strokeWidth={2} /> Atendimento Clínico
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-zinc-950 dark:text-white leading-tight">
          Direcionamento Clínico
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
          {!formData.especialidade
            ? "Selecione a especialidade ou procedimento desejado para visualizar os especialistas disponíveis."
            : `Especialidade selecionada: ${formData.especialidade}. Escolha o profissional de sua preferência.`}
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
                if (idxTriagem !== -1 && idxTriagem > modulosAtivos.indexOf("especialidade") && perguntasAtuais.length > 0)
                  return setCurrentStepIndex(idxTriagem);
                if (idxModalidade !== -1 && idxModalidade > modulosAtivos.indexOf("especialidade")) return setCurrentStepIndex(idxModalidade);
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
                setValue("subtipo_exame", "");
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
              {/* FILTROS POR CATEGORIA DE ATENDIMENTO */}
              {categoriasDisponiveis.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                  {["Todas", ...categoriasDisponiveis].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        playDopamineSound("click");
                        setActiveCategory(cat);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                        activeCategory === cat
                          ? "bg-zinc-950 dark:bg-white text-white dark:text-black shadow-sm"
                          : "bg-white/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                      }`}
                    >
                      <Tag size={12} className={activeCategory === cat ? "opacity-100" : "opacity-40"} />
                      <span>{cat}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* BUSCA DE ESPECIALIDADES */}
              {catalogoEspecialidades.length > 4 && (
                <div className="relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    placeholder="Filtrar por especialidade ou procedimento..."
                    className="w-full min-h-[46px] pl-11 pr-4 py-2.5 bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-zinc-200/80 dark:border-white/10 rounded-2xl text-xs sm:text-sm font-medium outline-none focus:border-[#9FC131] transition-all"
                  />
                </div>
              )}

              {/* GRID DE ESPECIALIDADES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {filteredEspecialidades.length > 0 ? (
                  filteredEspecialidades.map((esp) => (
                    <motion.button
                      whileHover={{ scale: 1.01, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      key={esp.nome}
                      onClick={() => handleSelectEspecialidade(esp)}
                      className="min-h-[64px] p-4 sm:p-5 border rounded-2xl flex items-center justify-between text-left transition-all border-zinc-200/80 dark:border-white/10 hover:border-[#9FC131] bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-xl shadow-sm hover:shadow-md group cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20 group-hover:bg-[#9FC131]/20 group-hover:text-[#86a621] dark:group-hover:text-[#9FC131] transition-colors">
                          <Stethoscope size={20} strokeWidth={2} />
                        </div>
                        <div className="truncate">
                          <span className="font-bold text-zinc-950 dark:text-white text-sm sm:text-base block truncate">
                            {esp.nome}
                          </span>
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                            {esp.categoria}
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  ))
                ) : (
                  <div className="col-span-2 p-8 text-center border border-dashed rounded-3xl border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-white/[0.02]">
                    <p className="text-zinc-500 font-medium text-sm">Nenhuma especialidade encontrada.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              {/* BADGE DE CONTEXTO ATUAL */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-100/80 dark:bg-white/[0.04] border border-zinc-200/70 dark:border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#9FC131] animate-pulse" />
                  <span className="text-xs font-extrabold text-zinc-900 dark:text-white">
                    {formData.especialidade}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playDopamineSound("click");
                    setValue("especialidade", "");
                    setValue("medico_profissional", "");
                    setValue("subtipo_exame", "");
                  }}
                  className="text-[11px] font-bold text-zinc-500 hover:text-zinc-950 dark:hover:text-white transition-colors underline"
                >
                  Alterar especialidade
                </button>
              </div>

              {specialistRedirecting ? (
                /* TELA DEDICADA DE REDIRECIONAMENTO PARA ATENDENTE / WHATSAPP */
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center max-w-lg mx-auto py-4 space-y-6"
                >
                  <div className="relative mx-auto w-20 h-20">
                    <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center shadow-xl shadow-emerald-500/25 border border-white/20">
                      <MessageCircle size={38} strokeWidth={2.2} />
                    </div>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-white dark:bg-black border-2 border-emerald-500 flex items-center justify-center shadow-sm"
                    >
                      <Sparkles size={14} className="text-emerald-500" />
                    </motion.div>
                  </div>

                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200/50 mb-3 shadow-sm">
                      <Sparkles size={13} /> Atendimento Humanizado
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight leading-tight">
                      Você está sendo redirecionado para um atendente
                    </h3>
                    <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm mt-2.5 leading-relaxed max-w-md mx-auto">
                      O agendamento com <strong>{specialistRedirecting.nome}</strong> ({formData.especialidade || specialistRedirecting.especialidade || "Atendimento"}) é realizado diretamente através da nossa equipe no WhatsApp.
                    </p>
                  </div>

                  <div className="p-5 sm:p-6 rounded-3xl bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 text-left space-y-3.5 shadow-sm">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <User size={14} className="text-purple-500" /> Profissional
                      </span>
                      <span className="font-extrabold text-zinc-950 dark:text-white text-sm">
                        {specialistRedirecting.nome}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs border-t border-zinc-100 dark:border-white/5 pt-3">
                      <span className="text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Stethoscope size={14} className="text-emerald-500" /> Especialidade
                      </span>
                      <span className="font-bold text-zinc-900 dark:text-white">
                        {formData.especialidade || specialistRedirecting.especialidade || "Geral"}
                      </span>
                    </div>

                    {/* EXIBIÇÃO DA MODALIDADE ESCOLHIDA (SE PREVIAMENTE SELECIONADA OU PASSADA) */}
                    {formData.modalidade && (
                      <div className="flex justify-between items-center text-xs border-t border-zinc-100 dark:border-white/5 pt-3">
                        <span className="text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <ShieldCheck size={14} className="text-blue-500" /> Modalidade / Cobertura
                        </span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                          {formData.modalidade}
                        </span>
                      </div>
                    )}

                    {formData.nome && (
                      <div className="flex justify-between items-center text-xs border-t border-zinc-100 dark:border-white/5 pt-3">
                        <span className="text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <User size={14} className="text-blue-500" /> Paciente
                        </span>
                        <span className="font-bold text-zinc-900 dark:text-white">
                          {formData.nome} {formData.sobrenome || ""}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 pt-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      onClick={() => {
                        playDopamineSound("select");
                        triggerHaptic("success");
                        const rawWpp =
                          specialistRedirecting.whatsapp_atendimento ||
                          empresaDados?.config_campos?.whatsapp_atendimento ||
                          empresaDados?.whatsapp_atendimento ||
                          empresaDados?.telefone ||
                          "";
                        const wppNum = rawWpp.replace(/\D/g, "");
                        const templateCustom =
                          specialistRedirecting.msg_whatsapp_redirecionamento ||
                          empresaDados?.config_campos?.mensagem_redirecionamento_whatsapp ||
                          "";

                        const mensagemFinal = formatarMensagemWhatsAppRedirect(templateCustom, {
                          specialist: specialistRedirecting,
                          formData,
                          empresaDados
                        });

                        const textoMsg = encodeURIComponent(mensagemFinal);
                        window.open(`https://wa.me/${wppNum}?text=${textoMsg}`, "_blank");
                      }}
                      className="w-full min-h-[52px] py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-emerald-600/25 cursor-pointer"
                    >
                      <MessageCircle size={19} />
                      Falar com Atendente no WhatsApp
                    </motion.button>

                    <button
                      type="button"
                      onClick={() => {
                        playDopamineSound("click");
                        setValue("medico_profissional", "");
                        setValue("subtipo_exame", "");
                      }}
                      className="w-full min-h-[44px] py-2.5 text-zinc-500 hover:text-zinc-950 dark:hover:text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      ← Escolher outro especialista ou especialidade
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {especialistasDaEspecialidade.map((m) => {
                    const isSelected =
                      formData.medico_profissional === m.nome || formData.subtipo_exame === m.nome;
                    const isWppRedirect = m.redirecionar_whatsapp || m.status_agendamento === "whatsapp";

                    return (
                      <motion.button
                        whileHover={{ scale: 1.01, y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        key={m.id}
                        onClick={() => handleSelectProfissional(m)}
                        className={`min-h-[68px] p-4 sm:p-5 border rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer ${
                          isSelected
                            ? "border-zinc-950 bg-zinc-50/90 dark:border-white dark:bg-white/[0.08] shadow-md ring-2 ring-[#9FC131]"
                            : isWppRedirect
                            ? "border-purple-200/80 dark:border-purple-900/40 hover:border-purple-400 bg-purple-50/20 dark:bg-purple-950/10 backdrop-blur-xl"
                            : "border-zinc-200/80 dark:border-white/10 hover:border-zinc-400 bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-xl shadow-sm"
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                              isSelected
                                ? "bg-zinc-950 text-white dark:bg-white dark:text-black"
                                : isWppRedirect
                                ? "bg-purple-100 dark:bg-purple-950/60 text-purple-600 border-purple-200 dark:border-purple-900"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-200/50 dark:border-zinc-700/50"
                            }`}
                          >
                            {isWppRedirect ? <MessageCircle size={20} strokeWidth={2} /> : <User size={20} strokeWidth={2} />}
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
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-zinc-400 uppercase tracking-widest block truncate">
                                {formData.especialidade}
                              </span>
                              {isWppRedirect && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 text-[9px] font-bold uppercase tracking-wider shrink-0 border border-purple-200/60 dark:border-purple-900/60">
                                  <MessageCircle size={9} /> Atendente
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {isSelected && !isWppRedirect && (
                          <div className="w-6 h-6 rounded-full bg-[#9FC131] text-black flex items-center justify-center shrink-0 shadow-sm">
                            <Check size={14} strokeWidth={3} />
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
}
