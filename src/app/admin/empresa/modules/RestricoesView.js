"use client";

import { useState, useMemo } from "react";
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
  Info
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

  const [formData, setFormData] = useState({
    servico_id: "",
    especialidade: "",
    nome_grupo: "",
    especialidades_selecionadas: [],
    dias_semana: [],
    hora_inicio: "08:00",
    hora_fim: "18:00",
    ultimo_horario_agendamento: "17:30",
    duracao_slot_minutos: 30,
    ocupacao_sequencial: false
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
      hora_inicio: "08:00",
      hora_fim: "18:00",
      ultimo_horario_agendamento: "17:30",
      duracao_slot_minutos: 30,
      ocupacao_sequencial: false
    });
  };

  const editarRegra = (regra) => {
    setEditingId(regra.id);
    const tipo = regra.servico_id ? "especifica" : regra.especialidade || (Array.isArray(regra.tipos_permitidos) && regra.tipos_permitidos.length > 0) ? "especialidade" : "geral";
    setTipoRegra(tipo);

    let espsSelecionadas = [];
    if (Array.isArray(regra.tipos_permitidos) && regra.tipos_permitidos.length > 0) {
      espsSelecionadas = regra.tipos_permitidos;
    } else if (regra.especialidade) {
      espsSelecionadas = regra.especialidade.split(",").map((e) => e.trim()).filter(Boolean);
    }

    setFormData({
      servico_id: regra.servico_id || "",
      especialidade: regra.especialidade || "",
      nome_grupo: regra.especialidade && !listaEspecialidades.includes(regra.especialidade) ? regra.especialidade : "",
      especialidades_selecionadas: espsSelecionadas,
      dias_semana: regra.dias_semana || [],
      hora_inicio: regra.hora_inicio?.slice(0, 5) || "08:00",
      hora_fim: regra.hora_fim?.slice(0, 5) || "18:00",
      ultimo_horario_agendamento: regra.ultimo_horario_agendamento?.slice(0, 5) || "17:30",
      duracao_slot_minutos: regra.duracao_slot_minutos || 30,
      ocupacao_sequencial: Boolean(regra.ocupacao_sequencial),
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

    if (tipoRegra === "especialidade" && (!formData.especialidades_selecionadas || formData.especialidades_selecionadas.length === 0) && !formData.especialidade) {
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
        hora_inicio: formData.hora_inicio,
        hora_fim: formData.hora_fim,
        ultimo_horario_agendamento: formData.ultimo_horario_agendamento,
        duracao_slot_minutos: Number(formData.duracao_slot_minutos),
        ocupacao_sequencial: Boolean(formData.ocupacao_sequencial),
        ativo: true
      };

      if (tipoRegra === "geral") {
        payload.servico_id = null;
        payload.especialidade = null;
        payload.tipos_permitidos = [];
      } else if (tipoRegra === "especialidade") {
        payload.servico_id = null;
        const esps = formData.especialidades_selecionadas.length > 0
          ? formData.especialidades_selecionadas
          : [formData.especialidade];
        payload.tipos_permitidos = esps;
        payload.especialidade = formData.nome_grupo?.trim() || esps.join(", ");
      } else if (tipoRegra === "especifica") {
        payload.servico_id = formData.servico_id;
        payload.especialidade = null;
        payload.tipos_permitidos = [];
      }

      if (editingId) {
        await actionAtualizarRegraAgenda(editingId, payload);
      } else {
        await actionCriarRegraAgenda(payload);
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
              Defina turnos, dias de funcionamento e vincule especialidades individuais ou em grupos para compartilharem a mesma agenda.
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
              className="px-4 py-2 text-xs min-h-[38px] rounded-xl"
            >
              Adicionar Horário
            </ButtonPrimary>
          ) : (
            <button
              onClick={() => {
                resetForm();
                if (setSubTab) setSubTab("configurados");
              }}
              className="px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors min-h-[38px]"
            >
              Ver Horários Configurados
            </button>
          )}

          <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
            <button
              onClick={() => setViewMode("cards")}
              className={`p-1.5 rounded-lg transition-colors ${
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
              className={`p-1.5 rounded-lg transition-colors ${
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
                      className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-lg"
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
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col gap-2 text-left ${
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
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col gap-2 text-left ${
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
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col gap-2 text-left ${
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
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
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

                      <div className="flex items-start gap-2 p-3 bg-white/80 dark:bg-black/30 rounded-xl border border-purple-200/50 text-[11px] text-purple-900 dark:text-purple-300">
                        <Sparkles size={16} className="text-purple-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Como funciona a Agenda Compartilhada:</strong> Se um paciente marcar uma especialidade de 20 min às 08:00, o próximo horário liberado para qualquer uma das especialidades vinculadas será às 08:20. Se em seguida for agendada uma de 30 min, a próxima vaga liberada será às 08:50, e assim por diante.
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

                {/* ETAPA 2: DIAS DE ATENDIMENTO */}
                <section>
                  <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white mb-4">
                    <span className="w-5 h-5 rounded-md bg-zinc-900 dark:bg-white text-white dark:text-black flex items-center justify-center text-[10px]">
                      2
                    </span>
                    Dias de Atendimento
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {DIAS_SEMANA.map((dia) => (
                      <button
                        type="button"
                        key={dia.id}
                        onClick={() => toggleDia(dia.id)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center ${
                          formData.dias_semana.includes(dia.id)
                            ? "bg-zinc-900 text-white dark:bg-white dark:text-black border-zinc-900 dark:border-white shadow-sm"
                            : "bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                        }`}
                      >
                        {dia.label}
                      </button>
                    ))}
                  </div>
                </section>

                <hr className="border-zinc-100 dark:border-zinc-800" />

                {/* ETAPA 3: TURNO E HORÁRIOS */}
                <section>
                  <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white mb-4">
                    <span className="w-5 h-5 rounded-md bg-zinc-900 dark:bg-white text-white dark:text-black flex items-center justify-center text-[10px]">
                      3
                    </span>
                    Turno e Horários
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
                    <CustomSelect
                      label="Duração Padrão do Slot (Minutos)"
                      value={formData.duracao_slot_minutos}
                      onChange={(val) => setFormData({ ...formData, duracao_slot_minutos: val })}
                      options={[
                        { value: 10, label: "10 Minutos" },
                        { value: 15, label: "15 Minutos" },
                        { value: 20, label: "20 Minutos" },
                        { value: 30, label: "30 Minutos" },
                        { value: 40, label: "40 Minutos" },
                        { value: 45, label: "45 Minutos" },
                        { value: 60, label: "1 Hora" },
                        { value: 90, label: "1h 30min" },
                        { value: 120, label: "2 Horas" }
                      ]}
                    />
                    <div className="flex flex-col justify-center">
                      <ToggleSwitch
                        checked={formData.ocupacao_sequencial}
                        onChange={(val) => setFormData({ ...formData, ocupacao_sequencial: val })}
                        label="Obrigatório Sequencial (Preencher 1º Vago)"
                      />
                    </div>
                  </div>
                </section>

                <div className="pt-2 flex justify-end">
                  <ButtonPrimary
                    onClick={handleSalvarVisual}
                    disabled={isProcessing}
                    icon={CheckCircle2}
                    className="px-8 py-3 text-xs"
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
                    className="px-5 py-2 text-xs"
                  >
                    Nova Disponibilidade
                  </ButtonPrimary>
                </div>
              ) : viewMode === "cards" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {regras.map((regra) => {
                    let tituloRegra = "Geral da Clínica";
                    let subtituloTipo = "Regra Padrão Global";
                    let icone = <Building size={16} className="text-blue-500" />;
                    let isSharedPool = false;
                    let espsArray = [];

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
                        ? regra.tipos_permitidos
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
                                className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 transition-colors"
                                title="Editar"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={async () => {
                                  if (!window.confirm("Remover este horário configurado?")) return;
                                  await actionDeletarRegra(regra.id);
                                  if (fetchRegras) await fetchRegras();
                                  showToast("Horário removido.");
                                }}
                                className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-red-500 transition-colors"
                                title="Remover"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>

                          {/* Especialidades vinculadas se for pool compartilhado */}
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

                          <div className="flex flex-wrap gap-2 pt-1">
                            <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-1 rounded-lg text-xs font-semibold">
                              <Clock size={13} /> {regra.hora_inicio?.substring(0, 5)} às{" "}
                              {regra.hora_fim?.substring(0, 5)}
                            </div>
                            <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40 px-3 py-1 rounded-lg text-xs font-bold">
                              Slot Base: {regra.duracao_slot_minutos} min
                            </div>
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
                <div className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 rounded-2xl overflow-x-auto shadow-sm">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-900/40 font-bold uppercase tracking-wider text-zinc-400">
                        <th className="p-3.5">Alvo / Tipo</th>
                        <th className="p-3.5">Dias</th>
                        <th className="p-3.5">Horário</th>
                        <th className="p-3.5">Duração Slot</th>
                        <th className="p-3.5 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
                      {regras.map((regra) => {
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
                              {regra.duracao_slot_minutos} min
                            </td>
                            <td className="p-3.5 text-right space-x-1.5">
                              <button
                                onClick={() => editarRegra(regra)}
                                className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 rounded-lg"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={async () => {
                                  if (!window.confirm("Remover este horário?")) return;
                                  await actionDeletarRegra(regra.id);
                                  if (fetchRegras) await fetchRegras();
                                  showToast("Removido.");
                                }}
                                className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 rounded-lg"
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
