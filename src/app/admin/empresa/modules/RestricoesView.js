"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  CheckCircle2,
  Plus,
  Clock,
  Clock3,
  Trash2,
  Building,
  User,
  Stethoscope,
  Pencil,
  X,
  LayoutGrid,
  List,
  Layers,
  Sparkles,
  Info,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Activity,
  ShieldCheck,
  RotateCcw
} from "lucide-react";
import {
  fadeUp,
  spring,
  CustomSelect,
  ButtonPrimary,
  ToggleSwitch,
  TextInput
} from "../components/SharedUI";
import {
  actionCriarRegraAgenda,
  actionAtualizarRegraAgenda,
  actionDeletarRegra
} from "@/actions/adminData";
import { playDopamineSound, triggerHaptic } from "@/lib/dopamine";

const DIAS_SEMANA = [
  { id: 1, label: "Segunda", short: "Seg" },
  { id: 2, label: "Terça", short: "Ter" },
  { id: 3, label: "Quarta", short: "Qua" },
  { id: 4, label: "Quinta", short: "Qui" },
  { id: 5, label: "Sexta", short: "Sex" },
  { id: 6, label: "Sábado", short: "Sáb" },
  { id: 0, label: "Domingo", short: "Dom" }
];

export default function RestricoesView({
  subTab = "configurados",
  setSubTab,
  regras = [],
  servicosOptions = [],
  servicos = [],
  fetchRegras,
  showToast
}) {
  const [viewMode, setViewMode] = useState("cards"); // "cards" | "tabela"
  const [tipoRegra, setTipoRegra] = useState("especialidade"); // "geral" | "especialidade" | "especifica"

  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  useEffect(() => {
    try {
      const defaultMode = localStorage.getItem("rmcare_default_view_mode") || localStorage.getItem("rmcare_view_mode");
      if (defaultMode === "cards" || defaultMode === "tabela") {
        setViewMode(defaultMode);
      }
    } catch (e) {}
  }, []);

  const [formData, setFormData] = useState({
    servico_id: "",
    especialidade: "",
    nome_grupo: "",
    especialidades_selecionadas: [],
    dias_semana: [],
    semanas_mes: ["todas"],
    hora_inicio: "08:00",
    hora_fim: "18:00",
    ultimo_horario_agendamento: "17:30",
    duracao_slot_minutos: 0, // 0 = Desabilitada / Conforme cada especialidade
    ocupacao_sequencial: true,
    tipo_bloqueio: "total", // "total" = Bloqueio Total (todos os especialistas do grupo) | "parcial" = Bloqueio Parcial (apenas médico agendado)
    tipo_atendimento: "todos", // "todos" | "consulta" | "exame" | "retorno"
    modalidade_atendimento: "todas" // "todas" | "particular" | "convenio"
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Lista de especialidades únicas cadastradas
  const listaEspecialidades = useMemo(() => {
    const setEsps = new Set(
      (servicos || [])
        .filter((s) => s.especialidade)
        .flatMap((s) => s.especialidade.split(",").map((e) => e.trim()))
        .filter(Boolean)
    );
    return [...setEsps].sort();
  }, [servicos]);

  const activeView = subTab === "adicionar" ? "builder" : "lista";

  const resetForm = () => {
    setEditingId(null);
    setTipoRegra("especialidade");
    setFormData({
      servico_id: "",
      especialidade: "",
      nome_grupo: "",
      especialidades_selecionadas: [],
      dias_semana: [],
      semanas_mes: ["todas"],
      hora_inicio: "08:00",
      hora_fim: "18:00",
      ultimo_horario_agendamento: "17:30",
      duracao_slot_minutos: 0,
      ocupacao_sequencial: true,
      tipo_bloqueio: "total",
      tipo_atendimento: "todos",
      modalidade_atendimento: "todas"
    });
  };

  const editarRegra = (regra) => {
    setEditingId(regra.id);
    const tipo = regra.servico_id
      ? "especifica"
      : regra.especialidade || (Array.isArray(regra.tipos_permitidos) && regra.tipos_permitidos.length > 0)
      ? "especialidade"
      : "geral";
    setTipoRegra(tipo);

    const permitidos = (regra.tipos_permitidos || []).map((t) => String(t).toLowerCase().trim());

    // Extrai especialidades ignorando tokens de modalidade/tipo
    const specialTokens = ["consulta", "exame", "retorno", "particular", "convenio", "convênio", "todos", "todas"];
    let espsSelecionadas = [];
    if (Array.isArray(regra.tipos_permitidos) && regra.tipos_permitidos.length > 0) {
      espsSelecionadas = regra.tipos_permitidos.filter((t) => !specialTokens.includes(String(t).toLowerCase().trim()));
    } else if (regra.especialidade) {
      espsSelecionadas = regra.especialidade.split(",").map((e) => e.trim()).filter(Boolean);
    }

    let tipoAtendimento = "todos";
    if (permitidos.includes("consulta")) tipoAtendimento = "consulta";
    else if (permitidos.includes("exame")) tipoAtendimento = "exame";
    else if (permitidos.includes("retorno")) tipoAtendimento = "retorno";

    let modalidadeAtendimento = "todas";
    if (permitidos.includes("particular")) modalidadeAtendimento = "particular";
    else if (permitidos.includes("convenio") || permitidos.includes("convênio")) modalidadeAtendimento = "convenio";

    setFormData({
      servico_id: regra.servico_id || "",
      especialidade: regra.especialidade || "",
      nome_grupo: regra.especialidade && !listaEspecialidades.includes(regra.especialidade) ? regra.especialidade : "",
      especialidades_selecionadas: espsSelecionadas,
      dias_semana: regra.dias_semana || [],
      semanas_mes: Array.isArray(regra.semanas_mes) && regra.semanas_mes.length > 0 ? regra.semanas_mes : ["todas"],
      hora_inicio: regra.hora_inicio?.slice(0, 5) || "08:00",
      hora_fim: regra.hora_fim?.slice(0, 5) || "18:00",
      ultimo_horario_agendamento: regra.ultimo_horario_agendamento?.slice(0, 5) || "17:30",
      duracao_slot_minutos: Number(regra.duracao_slot_minutos) || 0,
      ocupacao_sequencial: Boolean(regra.ocupacao_sequencial),
      tipo_bloqueio: regra.tipo_bloqueio || "total",
      tipo_atendimento: tipoAtendimento,
      modalidade_atendimento: modalidadeAtendimento,
      ativo: regra.ativo !== false
    });

    if (setSubTab) setSubTab("adicionar");
  };

  const toggleDia = (id) => {
    setFormData((prev) => ({
      ...prev,
      dias_semana: prev.dias_semana.includes(id)
        ? prev.dias_semana.filter((d) => d !== id)
        : [...prev.dias_semana, id]
    }));
  };

  const toggleEspecialidadeSelecionada = (esp) => {
    setFormData((prev) => {
      const current = prev.especialidades_selecionadas || [];
      const updated = current.includes(esp)
        ? current.filter((e) => e !== esp)
        : [...current, esp];
      return {
        ...prev,
        especialidades_selecionadas: updated,
        especialidade: updated.join(", ")
      };
    });
  };

  const handleSalvarVisual = async () => {
    if (tipoRegra === "especifica" && !formData.servico_id) {
      showToast("Selecione qual profissional esta regra afeta.", "error");
      return;
    }

    if (
      tipoRegra === "especialidade" &&
      (!formData.especialidades_selecionadas || formData.especialidades_selecionadas.length === 0) &&
      !formData.especialidade
    ) {
      showToast("Selecione ao menos uma especialidade para esta agenda.", "error");
      return;
    }

    if (formData.dias_semana.length === 0) {
      showToast("Selecione ao menos um dia de funcionamento.", "error");
      return;
    }

    setIsProcessing(true);
    try {
      const payload = {
        dias_semana: formData.dias_semana,
        semanas_mes: formData.semanas_mes || ["todas"],
        hora_inicio: formData.hora_inicio,
        hora_fim: formData.hora_fim,
        ultimo_horario_agendamento: formData.ultimo_horario_agendamento,
        duracao_slot_minutos: Number(formData.duracao_slot_minutos) || 0,
        ocupacao_sequencial: Boolean(formData.ocupacao_sequencial),
        tipo_bloqueio: formData.tipo_bloqueio || "total",
        ativo: true
      };

      let tipos = [];

      if (tipoRegra === "geral") {
        payload.servico_id = null;
        payload.especialidade = null;
      } else if (tipoRegra === "especialidade") {
        payload.servico_id = null;
        const esps = formData.especialidades_selecionadas.length > 0
          ? formData.especialidades_selecionadas
          : [formData.especialidade];
        tipos = [...esps];
        payload.especialidade = formData.nome_grupo?.trim() || esps.join(", ");
      } else if (tipoRegra === "especifica") {
        payload.servico_id = formData.servico_id;
        payload.especialidade = null;
      }

      // Adiciona restrição de tipo de atendimento (Consulta / Exame / Retorno)
      if (formData.tipo_atendimento && formData.tipo_atendimento !== "todos") {
        tipos.push(formData.tipo_atendimento);
      }

      // Adiciona restrição de modalidade (Particular / Convênio)
      if (formData.modalidade_atendimento && formData.modalidade_atendimento !== "todas") {
        tipos.push(formData.modalidade_atendimento);
      }

      payload.tipos_permitidos = tipos;

      let res;
      if (editingId) {
        res = await actionAtualizarRegraAgenda(editingId, payload);
      } else {
        res = await actionCriarRegraAgenda(payload);
      }

      if (res && res.success === false) {
        showToast(res.error || "Erro ao processar regra de agenda.", "error");
        return;
      }

      showToast(editingId ? "Alterações salvas na agenda." : "Regra adicionada à agenda.");
      if (fetchRegras) await fetchRegras();
      if (setSubTab) setSubTab("configurados");
      resetForm();
    } catch (error) {
      console.error(error);
      showToast("Erro ao processar regra de agenda. Tente novamente.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
    playDopamineSound("click");
  };

  const regrasOrdenadas = useMemo(() => {
    if (!sortConfig.key) return regras;
    return [...regras].sort((a, b) => {
      let valA = "";
      let valB = "";

      if (sortConfig.key === "alvo") {
        valA = a.servico_id ? (servicosOptions.find((s) => s.value === a.servico_id)?.label || "") : (a.especialidade || "Geral");
        valB = b.servico_id ? (servicosOptions.find((s) => s.value === b.servico_id)?.label || "") : (b.especialidade || "Geral");
      } else if (sortConfig.key === "horario") {
        valA = a.hora_inicio || "";
        valB = b.hora_inicio || "";
      } else if (sortConfig.key === "duracao") {
        const dA = Number(a.duracao_slot_minutos) || 0;
        const dB = Number(b.duracao_slot_minutos) || 0;
        return sortConfig.direction === "asc" ? dA - dB : dB - dA;
      }

      const cmp = String(valA).localeCompare(String(valB), "pt-BR", { sensitivity: "base" });
      return sortConfig.direction === "asc" ? cmp : -cmp;
    });
  }, [regras, sortConfig, servicosOptions]);

  return (
    <motion.div
      key="motor-regras"
      {...fadeUp}
      className="flex-1 flex flex-col h-full overflow-hidden w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8"
    >
      {/* CABEÇALHO */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200/80 dark:border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Clock3 size={20} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-950 dark:text-white tracking-tight">
              Disponibilidade & Agendas Compartilhadas
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Defina turnos, dias de funcionamento e vincule especialidades individuais ou em grupos para compartilharem a mesma agenda sequencial.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeView === "lista" ? (
            <ButtonPrimary
              onClick={() => {
                resetForm();
                if (setSubTab) setSubTab("adicionar");
              }}
              icon={Plus}
              className="px-4 py-2 text-xs min-h-[38px] rounded-xl cursor-pointer"
            >
              Adicionar Horário
            </ButtonPrimary>
          ) : (
            <button
              onClick={() => {
                resetForm();
                if (setSubTab) setSubTab("configurados");
              }}
              className="px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors min-h-[38px] cursor-pointer"
            >
              Ver Horários Configurados
            </button>
          )}

          <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
            <button
              onClick={() => setViewMode("cards")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "cards"
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-700"
              }`}
              title="Visão em Cards"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode("tabela")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "tabela"
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-700"
              }`}
              title="Visão em Tabela"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-20 pr-1">
        <AnimatePresence mode="wait">
          {activeView === "builder" && (
            <motion.div
              key="builder"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={spring}
              className="space-y-6"
            >
              <div className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 rounded-[2rem] shadow-sm p-6 md:p-8 space-y-8">
                {editingId && (
                  <div className="flex items-center justify-between rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 px-4 py-3 text-xs">
                    <div>
                      <strong className="text-blue-950 dark:text-blue-300">
                        Editando regra de horário existente
                      </strong>
                      <p className="text-blue-700 dark:text-blue-400 mt-0.5">
                        Altere os campos abaixo e salve para aplicar à agenda.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        resetForm();
                        if (setSubTab) setSubTab("configurados");
                      }}
                      className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-lg cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                {/* ETAPA 1: ESCOPO DA REGRA */}
                <section>
                  <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white mb-4">
                    <span className="w-5 h-5 rounded-md bg-zinc-900 dark:bg-white text-white dark:text-black flex items-center justify-center text-[10px]">
                      1
                    </span>
                    Para quem ou qual especialidade é esta regra?
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <button
                      type="button"
                      onClick={() => setTipoRegra("especialidade")}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col gap-2 text-left cursor-pointer ${
                        tipoRegra === "especialidade"
                          ? "border-zinc-900 bg-zinc-50 dark:bg-zinc-900/70 dark:border-white shadow-sm ring-2 ring-[#9FC131]"
                          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30"
                      }`}
                    >
                      <Layers
                        size={20}
                        className={
                          tipoRegra === "especialidade"
                            ? "text-purple-600 dark:text-purple-400"
                            : "text-zinc-400"
                        }
                      />
                      <div>
                        <span className="block font-bold text-zinc-950 dark:text-white text-sm">
                          Especialidades / Agenda Compartilhada
                        </span>
                        <span className="block text-xs text-zinc-500 mt-0.5">
                          Vincule uma ou várias especialidades que dividem a mesma agenda.
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTipoRegra("especifica")}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col gap-2 text-left cursor-pointer ${
                        tipoRegra === "especifica"
                          ? "border-zinc-900 bg-zinc-50 dark:bg-zinc-900/70 dark:border-white shadow-sm ring-2 ring-[#9FC131]"
                          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30"
                      }`}
                    >
                      <User
                        size={20}
                        className={
                          tipoRegra === "especifica"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-zinc-400"
                        }
                      />
                      <div>
                        <span className="block font-bold text-zinc-950 dark:text-white text-sm">
                          Médico / Especialista Individual
                        </span>
                        <span className="block text-xs text-zinc-500 mt-0.5">
                          Regra exclusiva para a agenda de um médico específico.
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTipoRegra("geral")}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col gap-2 text-left cursor-pointer ${
                        tipoRegra === "geral"
                          ? "border-zinc-900 bg-zinc-50 dark:bg-zinc-900/70 dark:border-white shadow-sm ring-2 ring-[#9FC131]"
                          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30"
                      }`}
                    >
                      <Building
                        size={20}
                        className={
                          tipoRegra === "geral" ? "text-blue-600 dark:text-blue-400" : "text-zinc-400"
                        }
                      />
                      <div>
                        <span className="block font-bold text-zinc-950 dark:text-white text-sm">
                          Geral da Clínica
                        </span>
                        <span className="block text-xs text-zinc-500 mt-0.5">
                          Padrão global para todos os agendamentos.
                        </span>
                      </div>
                    </button>
                  </div>

                  {/* VINCULAR ESPECIALIDADES EM AGENDA COMPARTILHADA */}
                  {tipoRegra === "especialidade" && (
                    <div className="p-5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-purple-900 dark:text-purple-300 uppercase tracking-widest block mb-1">
                          Especialidades que Compartilham esta Agenda (Múltipla Seleção)
                        </label>
                        <p className="text-xs text-purple-700 dark:text-purple-400 mb-3">
                          Selecione quais especialidades ou procedimentos fazem parte desta mesma agenda.
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {listaEspecialidades.map((esp) => {
                            const isSelected = (formData.especialidades_selecionadas || []).includes(esp);
                            return (
                              <button
                                key={esp}
                                type="button"
                                onClick={() => toggleEspecialidadeSelecionada(esp)}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                                  isSelected
                                    ? "bg-purple-950 dark:bg-purple-300 text-white dark:text-black border-purple-950 dark:border-purple-300 shadow-sm scale-105"
                                    : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-purple-300"
                                }`}
                              >
                                <span>{esp}</span>
                                {isSelected && <CheckCircle2 size={13} className="text-emerald-400" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-purple-200/60 dark:border-purple-900/40">
                        <TextInput
                          label="Nome de Identificação da Agenda Compartilhada (Opcional)"
                          placeholder="Ex: Grupo de Exames, Consultas Gerais..."
                          value={formData.nome_grupo}
                          onChange={(e) => setFormData({ ...formData, nome_grupo: e.target.value })}
                        />
                      </div>

                      {/* MODO DE BLOQUEIO: TOTAL (SALA/RECURSO ÚNICO) VS PARCIAL (POR MÉDICO) */}
                      <div className="pt-3 border-t border-purple-200/60 dark:border-purple-900/40 space-y-2">
                        <label className="text-[10px] font-bold text-purple-900 dark:text-purple-300 uppercase tracking-widest block">
                          Modo de Bloqueio da Agenda Compartilhada
                        </label>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, tipo_bloqueio: "total" })}
                            className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                              formData.tipo_bloqueio === "total"
                                ? "border-purple-900 bg-purple-100/70 dark:bg-purple-900/40 dark:border-purple-300 shadow-sm"
                                : "border-purple-200/60 dark:border-purple-900/30 bg-white/70 dark:bg-zinc-900/30 opacity-70 hover:opacity-100"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-extrabold text-xs text-zinc-950 dark:text-white flex items-center gap-1.5">
                                🔒 Bloqueio Total (Sala Única / Recurso Único)
                              </span>
                              {formData.tipo_bloqueio === "total" && (
                                <CheckCircle2 size={15} className="text-purple-600 dark:text-purple-300" />
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-tight">
                              Ao agendar às 08:00 (duração 40 min), o horário fica <strong>bloqueado para TODOS os especialistas</strong> do grupo. A próxima vaga para qualquer médico será <strong>08:40</strong>.
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, tipo_bloqueio: "parcial" })}
                            className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                              formData.tipo_bloqueio === "parcial"
                                ? "border-purple-900 bg-purple-100/70 dark:bg-purple-900/40 dark:border-purple-300 shadow-sm"
                                : "border-purple-200/60 dark:border-purple-900/30 bg-white/70 dark:bg-zinc-900/30 opacity-70 hover:opacity-100"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-extrabold text-xs text-zinc-950 dark:text-white flex items-center gap-1.5">
                                👥 Bloqueio Parcial (Por Especialista)
                              </span>
                              {formData.tipo_bloqueio === "parcial" && (
                                <CheckCircle2 size={15} className="text-purple-600 dark:text-purple-300" />
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-tight">
                              Bloqueia o horário <strong>apenas para o especialista agendado</strong>. Outros especialistas que atendem no grupo continuam liberados em seus consultórios.
                            </p>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 p-3 bg-white/80 dark:bg-black/30 rounded-xl border border-purple-200/50 text-[11px] text-purple-900 dark:text-purple-300">
                        <Sparkles size={16} className="text-purple-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Como funciona a Agenda Compartilhada:</strong> Se um paciente marcar uma especialidade de 40 min às 08:00 com Bloqueio Total, a agenda avança sequencialmente para as 08:40 para todos os profissionais. Com Bloqueio Parcial, apenas o médico marcado ocupa o intervalo.
                        </span>
                      </div>
                    </div>
                  )}

                  {tipoRegra === "especifica" && (
                    <div className="pt-2">
                      <CustomSelect
                        label="Qual o profissional afetado?"
                        value={formData.servico_id}
                        onChange={(val) => setFormData({ ...formData, servico_id: val })}
                        options={servicosOptions}
                      />
                    </div>
                  )}
                </section>

                <hr className="border-zinc-100 dark:border-zinc-800" />

                {/* ETAPA 2: DIAS DE ATENDIMENTO & OCORRÊNCIA NO MÊS */}
                <section className="space-y-4">
                  <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white mb-4">
                    <span className="w-5 h-5 rounded-md bg-zinc-900 dark:bg-white text-white dark:text-black flex items-center justify-center text-[10px]">
                      2
                    </span>
                    Dias de Atendimento & Recorrência no Mês
                  </h4>
                  <div>
                    <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block mb-2">
                      Dias da Semana
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {DIAS_SEMANA.map((dia) => (
                        <button
                          type="button"
                          key={dia.id}
                          onClick={() => toggleDia(dia.id)}
                          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center cursor-pointer ${
                            formData.dias_semana.includes(dia.id)
                              ? "bg-zinc-900 text-white dark:bg-white dark:text-black border-zinc-900 dark:border-white shadow-sm"
                              : "bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                          }`}
                        >
                          {dia.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">
                        Ocorrência no Mês (Semanas Específicas)
                      </label>
                      <span className="text-[11px] text-zinc-500">
                        Ex: 3 primeiras sextas, últimas sextas do mês
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: "todas", label: "Todas as Semanas" },
                        { id: "primeiras_3", label: "3 Primeiras Semanas" },
                        { id: "ultimas_3", label: "3 Últimas Semanas" },
                        { id: "1", label: "1ª Semana do Mês" },
                        { id: "2", label: "2ª Semana do Mês" },
                        { id: "3", label: "3ª Semana do Mês" },
                        { id: "4", label: "4ª Semana do Mês" },
                        { id: "ultimas", label: "Última Semana do Mês" }
                      ].map((sem) => {
                        const isSelected = (formData.semanas_mes || ["todas"]).includes(sem.id);
                        return (
                          <button
                            key={sem.id}
                            type="button"
                            onClick={() => {
                              let current = formData.semanas_mes || ["todas"];
                              if (sem.id === "todas") {
                                current = ["todas"];
                              } else {
                                current = current.filter((x) => x !== "todas");
                                if (isSelected) {
                                  current = current.filter((x) => x !== sem.id);
                                  if (current.length === 0) current = ["todas"];
                                } else {
                                  current = [...current, sem.id];
                                }
                              }
                              setFormData((prev) => ({ ...prev, semanas_mes: current }));
                            }}
                            className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-zinc-950 dark:border-white shadow-xs"
                                : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                            }`}
                          >
                            <span>{sem.label}</span>
                            {isSelected && <CheckCircle2 size={12} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </section>

                <hr className="border-zinc-100 dark:border-zinc-800" />

                {/* ETAPA 3: TURNO E HORÁRIOS COM DURAÇÃO PERSONALIZADA POR ESPECIALIDADE */}
                <section>
                  <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white mb-4">
                    <span className="w-5 h-5 rounded-md bg-zinc-900 dark:bg-white text-white dark:text-black flex items-center justify-center text-[10px]">
                      3
                    </span>
                    Turno, Horários & Duração do Slot
                  </h4>
                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <TextInput
                      type="time"
                      label="Hora que Inicia"
                      value={formData.hora_inicio}
                      onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                    />
                    <TextInput
                      type="time"
                      label="Hora que Encerra"
                      value={formData.hora_fim}
                      onChange={(e) => setFormData({ ...formData, hora_fim: e.target.value })}
                    />
                    <TextInput
                      type="time"
                      label="Último Agendamento Permitido"
                      value={formData.ultimo_horario_agendamento}
                      onChange={(e) =>
                        setFormData({ ...formData, ultimo_horario_agendamento: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 p-4 bg-zinc-50/60 dark:bg-zinc-900/40 rounded-2xl border border-zinc-200/60 dark:border-zinc-800">
                    <div className="space-y-1.5">
                      <CustomSelect
                        label="Duração do Slot da Agenda"
                        value={formData.duracao_slot_minutos}
                        onChange={(val) => setFormData({ ...formData, duracao_slot_minutos: Number(val) })}
                        options={[
                          { value: 0, label: "Desabilitada (Respeitar Tempo de Cada Especialidade)" },
                          { value: 10, label: "10 Minutos (Fixo)" },
                          { value: 15, label: "15 Minutos (Fixo)" },
                          { value: 20, label: "20 Minutos (Fixo)" },
                          { value: 30, label: "30 Minutos (Fixo Padrão)" },
                          { value: 40, label: "40 Minutos (Fixo)" },
                          { value: 45, label: "45 Minutos (Fixo)" },
                          { value: 60, label: "1 Hora (Fixo)" },
                          { value: 90, label: "1h 30min (Fixo)" },
                          { value: 120, label: "2 Horas (Fixo)" }
                        ]}
                      />
                      {formData.duracao_slot_minutos === 0 ? (
                        <p className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 mt-1">
                          <CheckCircle2 size={12} /> A agenda respeitará o tempo determinado de cada especialidade cadastrada.
                        </p>
                      ) : (
                        <p className="text-[10.5px] text-zinc-500 mt-1">
                          Slots com intervalo fixo de {formData.duracao_slot_minutos} minutos para todos os atendimentos desta regra.
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col justify-center">
                      <ToggleSwitch
                        checked={formData.ocupacao_sequencial}
                        onChange={(val) => setFormData({ ...formData, ocupacao_sequencial: val })}
                        label="Obrigatório Sequencial (Preencher 1º Vago)"
                      />
                    </div>
                  </div>
                </section>

                <hr className="border-zinc-100 dark:border-zinc-800" />

                {/* ETAPA 4: TIPO DE ATENDIMENTO & MODALIDADE PERMITIDA */}
                <section>
                  <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white mb-4">
                    <span className="w-5 h-5 rounded-md bg-zinc-900 dark:bg-white text-white dark:text-black flex items-center justify-center text-[10px]">
                      4
                    </span>
                    Tipo de Atendimento & Modalidade Permitida
                  </h4>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* TIPO DE SERVIÇO / ATENDIMENTO */}
                    <div className="p-4 bg-zinc-50/70 dark:bg-zinc-900/40 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 space-y-2.5">
                      <label className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">
                        Tipo de Atendimento (Consulta / Exame)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "todos", label: "Todos os Tipos", desc: "Consultas e Exames" },
                          { id: "consulta", label: "Apenas Consulta", desc: "Consultas Médicas" },
                          { id: "exame", label: "Apenas Exame", desc: "Procedimentos/Exames" },
                          { id: "retorno", label: "Apenas Retorno", desc: "Consultas de Retorno" }
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              playDopamineSound("click");
                              setFormData({ ...formData, tipo_atendimento: opt.id });
                            }}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              formData.tipo_atendimento === opt.id
                                ? "bg-zinc-900 text-white dark:bg-white dark:text-black border-zinc-900 dark:border-white shadow-sm ring-2 ring-[#9FC131]"
                                : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                            }`}
                          >
                            <span className="block font-bold text-xs">{opt.label}</span>
                            <span
                              className={`block text-[10px] ${
                                formData.tipo_atendimento === opt.id
                                  ? "text-zinc-300 dark:text-zinc-600"
                                  : "text-zinc-400"
                              }`}
                            >
                              {opt.desc}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* MODALIDADE DE COBERTURA / PAGAMENTO */}
                    <div className="p-4 bg-zinc-50/70 dark:bg-zinc-900/40 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 space-y-2.5">
                      <label className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">
                        Modalidade / Cobertura Aceita
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "todas", label: "Todas", desc: "Particular + Convênio" },
                          { id: "particular", label: "Particular", desc: "Apenas Particular" },
                          { id: "convenio", label: "Convênio", desc: "Apenas Convênios" }
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              playDopamineSound("click");
                              setFormData({ ...formData, modalidade_atendimento: opt.id });
                            }}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              formData.modalidade_atendimento === opt.id
                                ? "bg-zinc-900 text-white dark:bg-white dark:text-black border-zinc-900 dark:border-white shadow-sm ring-2 ring-[#9FC131]"
                                : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                            }`}
                          >
                            <span className="block font-bold text-xs">{opt.label}</span>
                            <span
                              className={`block text-[10px] ${
                                formData.modalidade_atendimento === opt.id
                                  ? "text-zinc-300 dark:text-zinc-600"
                                  : "text-zinc-400"
                              }`}
                            >
                              {opt.desc}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                <div className="pt-2 flex justify-end">
                  <ButtonPrimary
                    onClick={handleSalvarVisual}
                    disabled={isProcessing}
                    icon={CheckCircle2}
                    className="px-8 py-3 text-xs cursor-pointer"
                  >
                    {isProcessing
                      ? "Salvando..."
                      : editingId
                      ? "Salvar alterações"
                      : "Adicionar à agenda"}
                  </ButtonPrimary>
                </div>
              </div>
            </motion.div>
          )}

          {activeView === "lista" && (
            <motion.div
              key="lista"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={spring}
            >
              {regras.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center rounded-[2rem] border border-dashed border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-white/[0.02]">
                  <div className="w-16 h-16 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-300 mb-4 shadow-sm">
                    <CalendarDays size={24} />
                  </div>
                  <h4 className="text-base font-bold text-zinc-900 dark:text-white mb-2">
                    Nenhum Horário Configurado
                  </h4>
                  <ButtonPrimary
                    onClick={() => {
                      resetForm();
                      if (setSubTab) setSubTab("adicionar");
                    }}
                    icon={Plus}
                    className="px-5 py-2 text-xs cursor-pointer"
                  >
                    Nova Disponibilidade
                  </ButtonPrimary>
                </div>
              ) : viewMode === "cards" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {regrasOrdenadas.map((regra) => {
                    let tituloRegra = "Geral da Clínica";
                    let subtituloTipo = "Regra Padrão Global";
                    let icone = <Building size={16} className="text-blue-500" />;
                    let isSharedPool = false;
                    let espsArray = [];

                    const specialTokens = ["consulta", "exame", "retorno", "particular", "convenio", "convênio", "todos", "todas"];
                    const permitidos = (regra.tipos_permitidos || []).map((t) => String(t).toLowerCase().trim());

                    const hasConsultaRestr = permitidos.includes("consulta");
                    const hasExameRestr = permitidos.includes("exame");
                    const hasRetornoRestr = permitidos.includes("retorno");
                    const hasParticularRestr = permitidos.includes("particular");
                    const hasConvenioRestr = permitidos.includes("convenio") || permitidos.includes("convênio");

                    if (regra.servico_id) {
                      const srv = servicosOptions.find((s) => s.value === regra.servico_id);
                      tituloRegra = srv ? srv.label : "Profissional Específico";
                      subtituloTipo = "Médico / Especialista";
                      icone = <User size={16} className="text-emerald-500" />;
                    } else if (
                      (Array.isArray(regra.tipos_permitidos) && regra.tipos_permitidos.length > 0) ||
                      regra.especialidade
                    ) {
                      espsArray = Array.isArray(regra.tipos_permitidos) && regra.tipos_permitidos.length > 0
                        ? regra.tipos_permitidos.filter((t) => !specialTokens.includes(String(t).toLowerCase().trim()))
                        : regra.especialidade.split(",").map((e) => e.trim());

                      isSharedPool = espsArray.length > 1;
                      tituloRegra = regra.especialidade || espsArray.join(", ");
                      subtituloTipo = isSharedPool
                        ? `Agenda Compartilhada (${espsArray.length} Especialidades)`
                        : "Especialidade Individual";
                      icone = isSharedPool ? (
                        <Layers size={16} className="text-purple-500" />
                      ) : (
                        <Stethoscope size={16} className="text-purple-500" />
                      );
                    }

                    const diasNomes = (regra.dias_semana || [])
                      .map((dId) => DIAS_SEMANA.find((d) => d.id === dId)?.short)
                      .filter(Boolean)
                      .join(", ");

                    const duracaoLabel =
                      !regra.duracao_slot_minutos || Number(regra.duracao_slot_minutos) === 0
                        ? "Conforme Especialidade"
                        : `Slot: ${regra.duracao_slot_minutos} min`;

                    return (
                      <motion.div
                        key={regra.id}
                        layout
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-5 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow group"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {icone}
                                <h4 className="text-base font-bold text-zinc-950 dark:text-white leading-tight">
                                  {tituloRegra}
                                </h4>
                              </div>
                              <span className="text-[10px] font-bold text-[#86a621] dark:text-[#9FC131] uppercase tracking-wider block mt-1">
                                {subtituloTipo}
                              </span>
                              <p className="text-[11px] font-bold text-zinc-400 mt-1 uppercase tracking-widest flex items-center gap-1.5">
                                <CalendarDays size={13} /> {diasNomes || "Nenhum dia"}
                              </p>
                            </div>

                            <div className="flex gap-1.5 shrink-0">
                              <button
                                onClick={() => editarRegra(regra)}
                                className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
                                title="Editar"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={async () => {
                                  if (!window.confirm("Remover este horário configurado?")) return;
                                  const res = await actionDeletarRegra(regra.id);
                                  if (res && res.success === false) {
                                    showToast(res.error || "Erro ao remover horário.", "error");
                                    return;
                                  }
                                  if (fetchRegras) await fetchRegras();
                                  showToast("Horário removido.");
                                }}
                                className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                                title="Remover"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>

                          {espsArray.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {espsArray.map((esp, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900/40"
                                >
                                  {esp}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* BADGES DE LIMITAÇÃO POR TIPO / MODALIDADE */}
                          {(hasConsultaRestr || hasExameRestr || hasRetornoRestr || hasParticularRestr || hasConvenioRestr) && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {hasConsultaRestr && (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/50 flex items-center gap-1">
                                  <Stethoscope size={11} /> Apenas Consulta
                                </span>
                              )}
                              {hasExameRestr && (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/50 flex items-center gap-1">
                                  <Activity size={11} /> Apenas Exame
                                </span>
                              )}
                              {hasRetornoRestr && (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/50 flex items-center gap-1">
                                  <RotateCcw size={11} /> Apenas Retorno
                                </span>
                              )}
                              {hasParticularRestr && (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50 flex items-center gap-1">
                                  <ShieldCheck size={11} /> Apenas Particular
                                </span>
                              )}
                              {hasConvenioRestr && (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200/50 flex items-center gap-1">
                                  <Building size={11} /> Apenas Convênio
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2 pt-1">
                            <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-1 rounded-lg text-xs font-semibold">
                              <Clock size={13} /> {regra.hora_inicio?.substring(0, 5)} às{" "}
                              {regra.hora_fim?.substring(0, 5)}
                            </div>
                            <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40 px-3 py-1 rounded-lg text-xs font-bold">
                              {duracaoLabel}
                            </div>
                            {isSharedPool && (
                              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase border ${
                                regra.tipo_bloqueio === "parcial"
                                  ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200/50"
                                  : "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200/50"
                              }`}>
                                {regra.tipo_bloqueio === "parcial" ? "Bloqueio Parcial (Por Médico)" : "Bloqueio Total (Grupo)"}
                              </div>
                            )}
                            {regra.ocupacao_sequencial && (
                              <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/50 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase">
                                Sequencial
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                /* TABELA DE HORÁRIOS CONFIGURADOS COM ORDENAÇÃO */
                <div className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 rounded-2xl overflow-x-auto shadow-sm">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-900/40 font-bold uppercase tracking-wider text-zinc-400 select-none">
                        <th
                          onClick={() => handleSort("alvo")}
                          className="p-3.5 cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors"
                        >
                          <div className="flex items-center gap-1">
                            <span>Alvo / Tipo</span>
                            {sortConfig.key === "alvo" ? (
                              sortConfig.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                            ) : (
                              <ArrowUpDown size={11} className="opacity-40" />
                            )}
                          </div>
                        </th>
                        <th className="p-3.5">Dias</th>
                        <th
                          onClick={() => handleSort("horario")}
                          className="p-3.5 cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors"
                        >
                          <div className="flex items-center gap-1">
                            <span>Horário</span>
                            {sortConfig.key === "horario" ? (
                              sortConfig.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                            ) : (
                              <ArrowUpDown size={11} className="opacity-40" />
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort("duracao")}
                          className="p-3.5 cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors"
                        >
                          <div className="flex items-center gap-1">
                            <span>Duração Slot</span>
                            {sortConfig.key === "duracao" ? (
                              sortConfig.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                            ) : (
                              <ArrowUpDown size={11} className="opacity-40" />
                            )}
                          </div>
                        </th>
                        <th className="p-3.5">Limitação Modalidade</th>
                        <th className="p-3.5 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
                      {regrasOrdenadas.map((regra) => {
                        let tituloRegra = "Geral da Clínica";
                        if (regra.servico_id) {
                          const srv = servicosOptions.find((s) => s.value === regra.servico_id);
                          tituloRegra = srv ? `Médico: ${srv.label}` : "Médico Específico";
                        } else if (regra.especialidade) {
                          tituloRegra = `Especialidade: ${regra.especialidade}`;
                        }
                        const diasNomes = (regra.dias_semana || [])
                          .map((dId) => DIAS_SEMANA.find((d) => d.id === dId)?.short)
                          .filter(Boolean)
                          .join(", ");

                        const duracaoTexto =
                          !regra.duracao_slot_minutos || Number(regra.duracao_slot_minutos) === 0
                            ? "Conforme Especialidade"
                            : `${regra.duracao_slot_minutos} min`;

                        const permitidos = (regra.tipos_permitidos || []).map((t) => String(t).toLowerCase().trim());
                        const hasConsulta = permitidos.includes("consulta");
                        const hasExame = permitidos.includes("exame");
                        const hasRetorno = permitidos.includes("retorno");
                        const hasParticular = permitidos.includes("particular");
                        const hasConvenio = permitidos.includes("convenio") || permitidos.includes("convênio");

                        return (
                          <tr
                            key={regra.id}
                            className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
                          >
                            <td className="p-3.5 font-bold text-zinc-950 dark:text-white">
                              {tituloRegra}
                            </td>
                            <td className="p-3.5 font-semibold text-zinc-700 dark:text-zinc-300">
                              {diasNomes || "Nenhum"}
                            </td>
                            <td className="p-3.5 text-zinc-600 dark:text-zinc-400">
                              {regra.hora_inicio?.substring(0, 5)} -{" "}
                              {regra.hora_fim?.substring(0, 5)}
                            </td>
                            <td className="p-3.5 font-bold text-blue-600 dark:text-blue-400">
                              {duracaoTexto}
                            </td>
                            <td className="p-3.5">
                              <div className="flex flex-wrap gap-1">
                                {hasConsulta && (
                                  <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-[9px] font-bold">
                                    Consulta
                                  </span>
                                )}
                                {hasExame && (
                                  <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 text-[9px] font-bold">
                                    Exame
                                  </span>
                                )}
                                {hasRetorno && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[9px] font-bold">
                                    Retorno
                                  </span>
                                )}
                                {hasParticular && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[9px] font-bold">
                                    Particular
                                  </span>
                                )}
                                {hasConvenio && (
                                  <span className="px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 text-[9px] font-bold">
                                    Convênio
                                  </span>
                                )}
                                {!hasConsulta && !hasExame && !hasRetorno && !hasParticular && !hasConvenio && (
                                  <span className="text-zinc-400 text-[10px]">Livre (Todas)</span>
                                )}
                              </div>
                            </td>
                            <td className="p-3.5 text-right space-x-1.5">
                              <button
                                onClick={() => editarRegra(regra)}
                                className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 rounded-lg cursor-pointer"
                                title="Editar"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={async () => {
                                  if (!window.confirm("Remover este horário?")) return;
                                  const res = await actionDeletarRegra(regra.id);
                                  if (res && res.success === false) {
                                    showToast(res.error || "Erro ao remover horário.", "error");
                                    return;
                                  }
                                  if (fetchRegras) await fetchRegras();
                                  showToast("Removido.");
                                }}
                                className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 rounded-lg cursor-pointer"
                                title="Remover"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
