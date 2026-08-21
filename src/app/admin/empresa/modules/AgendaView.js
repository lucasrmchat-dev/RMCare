"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  User,
  CalendarDays,
  Server,
  Filter,
  Trash2,
  RotateCcw,
  X,
  Activity,
  Info,
  Search,
  Users,
  Phone,
  Calendar,
  LayoutGrid,
  List,
  CheckCircle2,
  Clock3,
  ShieldCheck,
  ShieldAlert,
  HeartPulse,
  Mail,
  FileText,
  Plus,
  Tag,
  ExternalLink,
  Lock,
  ArrowUp,
  ArrowDown,
  ArrowUpDown
} from "lucide-react";
import {
  getHojeLocal,
  fadeUp,
  CustomSelect,
  TextInput,
  ButtonPrimary,
  spring
} from "../components/SharedUI";
import {
  actionCancelarAgendamentoAdmin,
  actionExcluirAgendamentoAdmin,
  actionRemarcarAgendamentoAdmin,
  fetchAdminCustomization,
  actionSalvarEnfermidadesPaciente,
  actionSalvarCatalogoEnfermidades
} from "@/actions/adminData";
import { playDopamineSound, triggerHaptic } from "@/lib/dopamine";

// Helper para cálculo de idade
const calcularIdadeDataNasc = (dataNasc) => {
  if (!dataNasc) return null;
  let d, m, y;
  if (dataNasc.includes("/")) [d, m, y] = dataNasc.split("/").map(Number);
  else if (dataNasc.includes("-")) [y, m, d] = dataNasc.split("-").map(Number);
  if (!y || !m || !d || isNaN(y) || isNaN(m) || isNaN(d)) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - y;
  const mesAtual = hoje.getMonth() + 1;
  if (mesAtual < m || (mesAtual === m && hoje.getDate() < d)) idade--;
  return idade;
};

export default function AgendaView({
  subTab = "calendario",
  setSubTab,
  agendamentos = [],
  bloqueios = [],
  servicos = [],
  fetchAgendamentos,
  showToast,
  permissoes = [],
  isOwner = false
}) {
  const [viewMode, setViewMode] = useState("cards");

  useEffect(() => {
    try {
      const defaultMode = localStorage.getItem("rmcare_default_view_mode") || localStorage.getItem("rmcare_view_mode");
      if (defaultMode === "cards" || defaultMode === "tabela") {
        setViewMode(defaultMode);
      }
    } catch (e) {}
  }, []);

  // Verificação estrita de permissão para Ficha Clínica e Dados Sigilosos
  const temPermissaoSigiloClinico = useMemo(() => {
    if (isOwner) return true;
    const perms = Array.isArray(permissoes) ? permissoes : [];
    return perms.includes("sigilo_clinico") || perms.includes("dados_sensiveis");
  }, [isOwner, permissoes]);

  const [searchTerm, setSearchTerm] = useState("");
  const [origemFilter, setOrigemFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [filterMedico, setFilterMedico] = useState("Todos");

  // Ordenação de colunas da tabela de pacientes
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(getHojeLocal());

  // Modais de Ações
  const [cancelModalItem, setCancelModalItem] = useState(null);
  const [cancelReason, setReason] = useState("");
  const [rescheduleModalItem, setRescheduleModalItem] = useState(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  // Modal de Dados Sensíveis e Enfermidades
  const [sensitiveModalItem, setSensitiveModalItem] = useState(null);
  const [enfermidadesPaciente, setEnfermidadesPaciente] = useState([]);
  const [catalogoEnfermidades, setCatalogoEnfermidades] = useState([
    "Refluxo",
    "Gastrite",
    "Hipertensão",
    "Diabetes",
    "Doença Celíaca",
    "Hérnia de Hiato",
    "Esteatose Hepática",
    "Síndrome do Intestino Irritável"
  ]);
  const [searchEnfermidade, setSearchEnfermidade] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const carregarConfigGeral = async () => {
      try {
        const emp = await fetchAdminCustomization();
        if (emp?.config_campos?.catalogo_enfermidades) {
          setCatalogoEnfermidades(emp.config_campos.catalogo_enfermidades);
        }
      } catch (e) {
        console.error("Erro ao carregar catálogo de enfermidades:", e);
      }
    };
    carregarConfigGeral();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const prevMonth = () => {
    playDopamineSound("click");
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const nextMonth = () => {
    playDopamineSound("click");
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const profissionaisOptions = useMemo(() => {
    const defaultOption = { value: "Todos", label: "Todos os Profissionais" };
    if (!servicos || servicos.length === 0) return [defaultOption];

    const options = servicos
      .filter((s) => s.ativo !== false)
      .map((s) => ({
        value: s.nome,
        label: s.nome
      }));

    return [defaultOption, ...options];
  }, [servicos]);

  const matchesSearch = (nome, cpf, fone) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().replace(/\D/g, "");
    const cleanCpf = (cpf || "").replace(/\D/g, "");
    const cleanFone = (fone || "").replace(/\D/g, "");
    const textTerm = searchTerm.toLowerCase().trim();

    if (cleanCpf && cleanCpf.includes(term) && term.length > 2) return true;
    if (cleanFone && cleanFone.includes(term) && term.length > 2) return true;
    if (nome && nome.toLowerCase().includes(textTerm)) return true;

    return false;
  };

  const listaUnificadaTodosPacientes = useMemo(() => {
    const locais = agendamentos.map((a) => {
      const pac = a.pacientes || {};
      const enfermidadesList = Array.isArray(pac.enfermidades)
        ? pac.enfermidades
        : Array.isArray(a.enfermidades)
        ? a.enfermidades
        : [];

      return {
        id: a.id,
        pacienteId: a.paciente_id || pac.id,
        tipo: "rmclick",
        data: a.data_agendamento,
        horario: a.horario_agendamento?.substring(0, 5),
        nomePaciente: pac.nome_completo || "Paciente RMAgenda",
        cpfPaciente: pac.cpf || null,
        telefonePaciente: pac.telefone_whatsapp || null,
        emailPaciente: pac.email || null,
        dataNascimento: pac.data_nascimento || null,
        enfermidades: enfermidadesList,
        medicoProfissional: a.tipo_servico === "Exame" ? (a.subtipo_exame || a.medico_profissional) : a.medico_profissional,
        especialidade: a.tipo_servico || "Consulta",
        modalidade: a.modalidade || "Particular",
        statusAtendimento: a.status_atendimento || "agendado",
        pago: a.status_pagamento_antecipado,
        remarcado: !!a.remarcado_em,
        motivoCancelamento: a.motivo_cancelamento,
        rawItem: a
      };
    });

    const erp = bloqueios
      .filter((b) => b.status === "importado" || b.medicalsys_id)
      .map((b) => ({
        id: b.id,
        pacienteId: null,
        tipo: "medicalsys",
        data: b.data,
        horario: b.horario?.substring(0, 5),
        nomePaciente: b.nome_paciente || "Paciente ERP",
        cpfPaciente: b.cpf_paciente || null,
        telefonePaciente: b.telefone_paciente || null,
        emailPaciente: null,
        dataNascimento: null,
        enfermidades: [],
        medicoProfissional: b.medico_profissional,
        especialidade: b.especialidade || "Geral",
        convenio: b.convenio || "Convênio",
        modalidade: b.convenio || "Convênio",
        statusAtendimento: b.situacao === "canc" ? "cancelado" : "agendado",
        pago: false,
        remarcado: false,
        medicalsysId: b.medicalsys_id,
        rawItem: b
      }));

    let result = [...locais, ...erp]
      .filter((item) => {
        if (statusFilter === "todos") return true;
        if (statusFilter === "cancelado") return item.statusAtendimento === "cancelado";
        if (statusFilter === "reagendado") return item.remarcado === true;
        if (statusFilter === "agendado")
          return item.statusAtendimento !== "cancelado" && !item.remarcado;
        return true;
      })
      .filter((item) => {
        if (origemFilter === "todos") return true;
        return item.tipo === origemFilter;
      })
      .filter((item) => {
        if (filterMedico === "Todos") return true;
        return item.medicoProfissional === filterMedico;
      })
      .filter((item) => matchesSearch(item.nomePaciente, item.cpfPaciente, item.telefonePaciente));

    if (sortConfig.key) {
      result.sort((a, b) => {
        let valA = "";
        let valB = "";

        if (sortConfig.key === "horario") {
          valA = a.horario || "";
          valB = b.horario || "";
        } else if (sortConfig.key === "paciente") {
          valA = a.nomePaciente || "";
          valB = b.nomePaciente || "";
        } else if (sortConfig.key === "origem") {
          valA = a.tipo || "";
          valB = b.tipo || "";
        } else if (sortConfig.key === "especialista") {
          valA = a.medicoProfissional || "";
          valB = b.medicoProfissional || "";
        } else if (sortConfig.key === "status") {
          valA = a.statusAtendimento || "";
          valB = b.statusAtendimento || "";
        }

        const cmp = String(valA).localeCompare(String(valB), "pt-BR", { sensitivity: "base" });
        return sortConfig.direction === "asc" ? cmp : -cmp;
      });
    } else {
      result.sort(
        (a, b) =>
          new Date(`${b.data}T${b.horario || "00:00"}`) -
          new Date(`${a.data}T${a.horario || "00:00"}`)
      );
    }

    return result;
  }, [agendamentos, bloqueios, statusFilter, origemFilter, filterMedico, searchTerm, sortConfig]);

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
    playDopamineSound("click");
  };

  const eventosAgendaMistaDiaria = useMemo(() => {
    return listaUnificadaTodosPacientes
      .filter((item) => item.data === selectedDay)
      .sort((a, b) => (a.horario || "").localeCompare(b.horario || ""));
  }, [listaUnificadaTodosPacientes, selectedDay]);

  const handleCancelarAdmin = async () => {
    if (!cancelModalItem) return;
    setIsProcessing(true);
    playDopamineSound("click");
    try {
      await actionCancelarAgendamentoAdmin(
        cancelModalItem.id,
        cancelReason || "Cancelado pelo Administrador"
      );
      if (showToast) showToast("Agendamento cancelado. Horário liberado no sistema!");
      if (fetchAgendamentos) await fetchAgendamentos();
      setCancelModalItem(null);
      setReason("");
    } catch (err) {
      if (showToast) showToast(`Erro ao cancelar: ${err.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemarcarAdmin = async () => {
    if (!rescheduleModalItem || !newDate || !newTime) {
      if (showToast) showToast("Informe a nova data e o novo horário.", "error");
      return;
    }
    setIsProcessing(true);
    playDopamineSound("click");
    try {
      await actionRemarcarAgendamentoAdmin(rescheduleModalItem.id, newDate, newTime);
      if (showToast) showToast("Agendamento remarcado com sucesso!");
      if (fetchAgendamentos) await fetchAgendamentos();
      setRescheduleModalItem(null);
      setNewDate("");
      setNewTime("");
    } catch (err) {
      if (showToast) showToast(`Erro ao remarcar: ${err.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Abrir Ficha do Paciente e Dados Sensíveis com Proteção de Permissão
  const handleOpenSensitiveModal = (item) => {
    if (!temPermissaoSigiloClinico) {
      if (showToast) {
        showToast("Acesso restrito: você não possui permissão de Sigilo Clínico para visualizar ou editar fichas médicas.", "error");
      }
      return;
    }
    playDopamineSound("click");
    triggerHaptic("light");
    setSensitiveModalItem(item);
    setEnfermidadesPaciente(item.enfermidades || []);
    setSearchEnfermidade("");
  };

  // Adicionar / Vincular Enfermidade ao Paciente
  const handleAddEnfermidadeToPatient = (enfNome) => {
    if (!temPermissaoSigiloClinico) return;
    const limpo = enfNome.trim();
    if (!limpo) return;
    if (enfermidadesPaciente.includes(limpo)) return;

    setEnfermidadesPaciente((prev) => [...prev, limpo]);
    setSearchEnfermidade("");
  };

  // Criar Nova Enfermidade no Catálogo e Vincular ao Paciente
  const handleCreateAndLinkEnfermidade = async () => {
    if (!temPermissaoSigiloClinico) return;
    const limpo = searchEnfermidade.trim();
    if (!limpo) return;

    if (!catalogoEnfermidades.some((e) => e.toLowerCase() === limpo.toLowerCase())) {
      const novoCat = [...catalogoEnfermidades, limpo];
      setCatalogoEnfermidades(novoCat);
      await actionSalvarCatalogoEnfermidades(novoCat);
    }

    if (!enfermidadesPaciente.includes(limpo)) {
      setEnfermidadesPaciente((prev) => [...prev, limpo]);
    }
    setSearchEnfermidade("");
    showToast(`"${limpo}" adicionada ao catálogo e vinculada ao paciente!`);
  };

  const handleRemoveEnfermidadeFromPatient = (enfNome) => {
    if (!temPermissaoSigiloClinico) return;
    setEnfermidadesPaciente((prev) => prev.filter((e) => e !== enfNome));
  };

  const handleSaveSensitiveData = async () => {
    if (!temPermissaoSigiloClinico) {
      showToast("Acesso negado: sem permissão de sigilo clínico.", "error");
      return;
    }
    if (!sensitiveModalItem) return;
    setIsProcessing(true);
    playDopamineSound("select");
    triggerHaptic("success");
    try {
      await actionSalvarEnfermidadesPaciente({
        pacienteId: sensitiveModalItem.pacienteId,
        agendamentoId: sensitiveModalItem.id,
        enfermidades: enfermidadesPaciente
      });

      if (fetchAgendamentos) await fetchAgendamentos();
      showToast("Ficha clínica e enfermidades salvas com sucesso!");
      setSensitiveModalItem(null);
    } catch (e) {
      showToast(`Erro ao salvar dados clínicos: ${e.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Sugestões de busca de enfermidade
  const sugestoesEnfermidades = useMemo(() => {
    if (!searchEnfermidade.trim()) return [];
    const term = searchEnfermidade.toLowerCase().trim();
    return catalogoEnfermidades.filter(
      (e) => e.toLowerCase().includes(term) && !enfermidadesPaciente.includes(e)
    );
  }, [catalogoEnfermidades, searchEnfermidade, enfermidadesPaciente]);

  const exactMatchExists = useMemo(() => {
    const term = searchEnfermidade.toLowerCase().trim();
    return catalogoEnfermidades.some((e) => e.toLowerCase() === term);
  }, [catalogoEnfermidades, searchEnfermidade]);

  return (
    <motion.div
      key="agenda"
      {...fadeUp}
      className="flex-1 flex flex-col h-full overflow-hidden w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8"
    >
      <div className="bg-white/85 dark:bg-[#0c0c0e]/85 backdrop-blur-3xl saturate-150 rounded-[2.5rem] border border-zinc-200/80 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex flex-col h-full overflow-hidden">
        {/* CABEÇALHO & FILTROS */}
        <div className="px-6 md:px-8 pt-6 pb-5 border-b border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-900/20 flex flex-col gap-5">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#9FC131]/10 text-[#86a621] dark:text-[#9FC131] border border-[#9FC131]/25 flex items-center justify-center shrink-0 shadow-sm">
                <CalendarDays size={24} strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
                  Agenda de Pacientes
                </h2>
                <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
                  Visão consolidada de atendimentos com filtros avançados e busca unificada.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mr-1">
                Visualização:
              </span>
              <div className="flex p-1 bg-zinc-100/80 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 gap-1">
                <button
                  onClick={() => {
                    playDopamineSound("click");
                    setViewMode("cards");
                  }}
                  className={`p-2 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer ${
                    viewMode === "cards"
                      ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-700"
                  }`}
                  title="Visão em Cards"
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  onClick={() => {
                    playDopamineSound("click");
                    setViewMode("tabela");
                  }}
                  className={`p-2 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer ${
                    viewMode === "tabela"
                      ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-700"
                  }`}
                  title="Visão em Tabela"
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end pt-1">
            <div className="lg:col-span-4 space-y-1">
              <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest ml-1">
                Buscar Paciente
              </label>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nome, CPF ou Telefone..."
                  className="w-full min-h-[48px] pl-10 pr-4 py-2.5 bg-white/90 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl text-xs font-semibold text-zinc-900 dark:text-white outline-none focus:border-[#9FC131] transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            <div className="lg:col-span-3 space-y-1">
              <CustomSelect
                label="Origem da Agenda"
                value={origemFilter}
                onChange={setOrigemFilter}
                options={[
                  { value: "todos", label: "Todas as Origens" },
                  { value: "rmclick", label: "RMAgenda (Local)" },
                  { value: "medicalsys", label: "MedicalSYS (ERP)" }
                ]}
              />
            </div>

            <div className="lg:col-span-2 space-y-1">
              <CustomSelect
                label="Status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "todos", label: "Ver tudo" },
                  { value: "agendado", label: "Agendados" },
                  { value: "reagendado", label: "Reagendados" },
                  { value: "cancelado", label: "Cancelados" }
                ]}
              />
            </div>

            <div className="lg:col-span-3 space-y-1">
              <CustomSelect
                label="Médico / Atendimento"
                value={filterMedico}
                onChange={setFilterMedico}
                options={profissionaisOptions}
                icon={Filter}
              />
            </div>
          </div>
        </div>

        {/* CONTEÚDO PRINCIPAL: CALENDÁRIO OU LISTA */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {subTab === "calendario" && (
              <motion.div
                key="subtab-cal"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={spring}
                className="flex flex-col md:flex-row h-full overflow-hidden"
              >
                {/* CALENDÁRIO MENSAL */}
                <div className="w-full md:w-[320px] border-r border-zinc-100 dark:border-white/5 p-6 flex flex-col overflow-y-auto bg-white/40 dark:bg-[#0a0a0d]/40">
                  <div className="flex justify-between items-center mb-6">
                    <span className="font-bold capitalize text-zinc-950 dark:text-white text-base">
                      {currentDate.toLocaleString("pt-BR", { month: "long", year: "numeric" })}
                    </span>
                    <div className="flex gap-1 bg-zinc-100/70 dark:bg-zinc-900/70 rounded-xl p-1 border border-zinc-200/50 dark:border-zinc-800">
                      <button
                        onClick={prevMonth}
                        className="p-1.5 text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        onClick={nextMonth}
                        className="p-1.5 text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-y-2 gap-x-1">
                    {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                      <div
                        key={i}
                        className="text-center text-[10px] font-extrabold text-zinc-400 uppercase"
                      >
                        {d}
                      </div>
                    ))}
                    {Array.from({ length: firstDay }).map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
                        i + 1
                      ).padStart(2, "0")}`;
                      const isSel = selectedDay === dateStr;
                      const isTod = getHojeLocal() === dateStr;

                      const hasAgend = agendamentos.some(
                        (a) =>
                          a.data_agendamento === dateStr &&
                          a.status_atendimento !== "cancelado" &&
                          (filterMedico === "Todos" ||
                            (a.tipo_servico === "Exame"
                              ? a.subtipo_exame === filterMedico
                              : a.medico_profissional === filterMedico))
                      );

                      return (
                        <button
                          key={i}
                          onClick={() => {
                            playDopamineSound("select");
                            triggerHaptic("light");
                            setSelectedDay(dateStr);
                          }}
                          className={`relative h-10 w-full rounded-xl text-xs sm:text-sm transition-all min-h-[38px] flex items-center justify-center cursor-pointer ${
                            isSel
                              ? "bg-zinc-950 text-white dark:bg-white dark:text-black font-extrabold shadow-md ring-2 ring-[#9FC131] scale-105"
                              : isTod
                              ? "bg-zinc-100 dark:bg-zinc-800 font-bold text-zinc-900 dark:text-white"
                              : "hover:bg-zinc-100/70 dark:hover:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300 font-medium"
                          }`}
                        >
                          {i + 1}
                          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
                            {hasAgend && (
                              <div
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isSel ? "bg-white dark:bg-black" : "bg-emerald-500"
                                }`}
                              />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* LISTA DO DIA SELECIONADO */}
                <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar bg-zinc-50/40 dark:bg-black/20">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                      <CalendarDays size={18} className="text-[#9FC131]" />
                      {new Date(selectedDay + "T12:00:00").toLocaleDateString("pt-BR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                      })}
                    </h3>
                    <span className="text-xs font-bold px-3.5 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-600 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-700/50">
                      {eventosAgendaMistaDiaria.length} paciente(s)
                    </span>
                  </div>

                  {eventosAgendaMistaDiaria.length === 0 ? (
                    <div className="mt-16 text-center flex flex-col items-center justify-center p-8 border border-dashed rounded-3xl border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-white/[0.02]">
                      <div className="w-16 h-16 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] flex items-center justify-center text-zinc-400 mb-4 shadow-sm">
                        <User size={26} />
                      </div>
                      <p className="text-zinc-600 dark:text-zinc-400 text-sm font-semibold">
                        Nenhum atendimento agendado para esta data.
                      </p>
                    </div>
                  ) : viewMode === "cards" ? (
                    <div className="grid gap-3.5">
                      {eventosAgendaMistaDiaria.map((item) => {
                        const isCanceled = item.statusAtendimento === "cancelado";
                        return (
                          <div
                            key={item.id}
                            className={`p-5 rounded-2xl border ${
                              isCanceled
                                ? "bg-zinc-50/50 border-zinc-200/60 opacity-60"
                                : "bg-white dark:bg-[#111116] border-zinc-200/80 dark:border-white/10 shadow-sm hover:shadow-md"
                            } transition-all flex flex-col md:flex-row md:items-center justify-between gap-4`}
                          >
                            <div className="flex items-start md:items-center gap-4">
                              <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 px-4 py-3 rounded-2xl text-center min-w-[76px] shadow-inner flex-shrink-0">
                                <span className="text-lg font-black text-zinc-950 dark:text-white tracking-tighter">
                                  {item.horario || "--:--"}
                                </span>
                              </div>

                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="font-extrabold text-zinc-950 dark:text-white text-base">
                                    {item.nomePaciente}
                                  </h4>
                                  {item.tipo === "medicalsys" ? (
                                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 rounded-md flex items-center gap-1">
                                      <Server size={10} /> Medicalsys ERP
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-md">
                                      RMAgenda
                                    </span>
                                  )}
                                  {item.cpfPaciente && (
                                    <span className="text-xs font-semibold text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-md">
                                      CPF: {item.cpfPaciente}
                                    </span>
                                  )}
                                  <span
                                    className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md ${
                                      isCanceled
                                        ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                                        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400"
                                    }`}
                                  >
                                    {isCanceled
                                      ? "Cancelado"
                                      : item.remarcado
                                      ? "Reagendado"
                                      : "Confirmado"}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                                  <span>
                                    <strong>Especialista:</strong> {item.medicoProfissional}
                                  </span>
                                  {item.especialidade && (
                                    <span>
                                      <strong>Especialidade:</strong> {item.especialidade}
                                    </span>
                                  )}
                                  {item.convenio && (
                                    <span>
                                      <strong>Convênio:</strong> {item.convenio}
                                    </span>
                                  )}
                                  {item.telefonePaciente && (
                                    <span className="flex items-center gap-1">
                                      <Phone size={12} /> {item.telefonePaciente}
                                    </span>
                                  )}
                                </div>

                                {/* TAGS DE ENFERMIDADES VINCULADAS (PROTEGIDAS POR SIGILO CLÍNICO) */}
                                {temPermissaoSigiloClinico && item.enfermidades && item.enfermidades.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {item.enfermidades.map((enf, idx) => (
                                      <span
                                        key={idx}
                                        className="text-[9px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/50 dark:border-rose-900/40 px-2 py-0.5 rounded-md flex items-center gap-1"
                                      >
                                        <HeartPulse size={10} /> {enf}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* AÇÕES NO CARD */}
                            <div className="flex items-center gap-2 self-end md:self-center">
                              {temPermissaoSigiloClinico ? (
                                <button
                                  onClick={() => handleOpenSensitiveModal(item)}
                                  className="min-h-[40px] px-3.5 py-2 rounded-xl border border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 flex items-center gap-1.5 text-xs font-bold transition-colors shadow-sm cursor-pointer"
                                  title="Verificar Ficha Clínica & Enfermidades"
                                >
                                  <ShieldCheck size={14} className="text-blue-500" />
                                  <span>Ficha</span>
                                </button>
                              ) : (
                                <span
                                  className="min-h-[40px] px-3 py-2 rounded-xl bg-zinc-100/50 dark:bg-zinc-800/40 text-zinc-400 text-[11px] font-bold inline-flex items-center gap-1 border border-zinc-200/50 dark:border-zinc-800 opacity-60 cursor-not-allowed"
                                  title="Acesso Restrito: Requer permissão de Sigilo Clínico"
                                >
                                  <Lock size={12} /> Ficha Restrita
                                </span>
                              )}

                              {!isCanceled && (
                                <>
                                  <button
                                    onClick={() => {
                                      playDopamineSound("click");
                                      setRescheduleModalItem(item.rawItem || item);
                                      setNewDate(item.data || selectedDay);
                                      setNewTime(item.horario || "09:00");
                                    }}
                                    className="min-h-[40px] px-3.5 py-2 rounded-xl border border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 flex items-center gap-1.5 text-xs font-bold transition-colors shadow-sm cursor-pointer"
                                  >
                                    <RotateCcw
                                      size={14}
                                      className="text-[#86a621] dark:text-[#9FC131]"
                                    />{" "}
                                    Remarcar
                                  </button>
                                  <button
                                    onClick={() => {
                                      playDopamineSound("click");
                                      setCancelModalItem(item.rawItem || item);
                                      setReason("");
                                    }}
                                    className="min-h-[40px] px-3.5 py-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500/20 flex items-center gap-1.5 text-xs font-bold transition-colors shadow-sm cursor-pointer"
                                  >
                                    <Trash2 size={14} /> Cancelar
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* TABELA COM LINHA DE AÇÕES PERFEITAMENTE ALINHADA */
                    <div className="bg-white dark:bg-[#111116] border border-zinc-200/80 dark:border-zinc-800 rounded-2xl overflow-x-auto shadow-sm">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 font-bold uppercase tracking-wider text-zinc-400 select-none">
                            <th
                              onClick={() => handleSort("horario")}
                              className="p-4 cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors"
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
                              onClick={() => handleSort("paciente")}
                              className="p-4 cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors"
                            >
                              <div className="flex items-center gap-1">
                                <span>Paciente</span>
                                {sortConfig.key === "paciente" ? (
                                  sortConfig.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                                ) : (
                                  <ArrowUpDown size={11} className="opacity-40" />
                                )}
                              </div>
                            </th>
                            <th
                              onClick={() => handleSort("origem")}
                              className="p-4 cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors"
                            >
                              <div className="flex items-center gap-1">
                                <span>Origem</span>
                                {sortConfig.key === "origem" ? (
                                  sortConfig.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                                ) : (
                                  <ArrowUpDown size={11} className="opacity-40" />
                                )}
                              </div>
                            </th>
                            <th
                              onClick={() => handleSort("especialista")}
                              className="p-4 cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors"
                            >
                              <div className="flex items-center gap-1">
                                <span>Especialista</span>
                                {sortConfig.key === "especialista" ? (
                                  sortConfig.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                                ) : (
                                  <ArrowUpDown size={11} className="opacity-40" />
                                )}
                              </div>
                            </th>
                            <th
                              onClick={() => handleSort("status")}
                              className="p-4 cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors"
                            >
                              <div className="flex items-center gap-1">
                                <span>Status</span>
                                {sortConfig.key === "status" ? (
                                  sortConfig.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                                ) : (
                                  <ArrowUpDown size={11} className="opacity-40" />
                                )}
                              </div>
                            </th>
                            <th className="p-4 text-right pr-6 whitespace-nowrap">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
                          {eventosAgendaMistaDiaria.map((item) => (
                            <tr
                              key={item.id}
                              className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                            >
                              <td className="p-4 font-black text-zinc-950 dark:text-white">
                                {item.horario || "--:--"}
                              </td>
                              <td className="p-4">
                                <div className="font-bold text-zinc-950 dark:text-white">
                                  {item.nomePaciente}
                                </div>
                                {item.cpfPaciente && (
                                  <div className="text-[10px] text-zinc-400 font-mono">
                                    CPF: {item.cpfPaciente}
                                  </div>
                                )}
                                {temPermissaoSigiloClinico && item.enfermidades && item.enfermidades.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {item.enfermidades.map((enf, idx) => (
                                      <span
                                        key={idx}
                                        className="text-[9px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.2 rounded"
                                      >
                                        {enf}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td className="p-4">
                                {item.tipo === "medicalsys" ? (
                                  <span className="bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                                    Medicalsys
                                  </span>
                                ) : (
                                  <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                                    RMAgenda
                                  </span>
                                )}
                              </td>
                              <td className="p-4">
                                <div className="text-zinc-800 dark:text-zinc-200 font-bold">
                                  {item.medicoProfissional}
                                </div>
                                <div className="text-[10px] text-zinc-400">{item.especialidade}</div>
                              </td>
                              <td className="p-4">
                                <span
                                  className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                    item.statusAtendimento === "cancelado"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-emerald-100 text-emerald-800"
                                  }`}
                                >
                                  {item.statusAtendimento}
                                </span>
                              </td>

                              {/* COLUNA DE AÇÕES: RIGOROSAMENTE NO MESMO HORIZONTE */}
                              <td className="p-4 text-right pr-6 whitespace-nowrap">
                                <div className="inline-flex items-center justify-end gap-2">
                                  {temPermissaoSigiloClinico ? (
                                    <button
                                      onClick={() => handleOpenSensitiveModal(item)}
                                      className="min-h-[34px] px-3 py-1.5 border border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                                      title="Verificar Ficha Clínica & Enfermidades"
                                    >
                                      <ShieldCheck size={13} className="text-blue-500" />
                                      <span>Ficha</span>
                                    </button>
                                  ) : (
                                    <span
                                      className="min-h-[34px] px-2.5 py-1.5 rounded-xl bg-zinc-100/50 dark:bg-zinc-800/40 text-zinc-400 text-[10px] font-bold inline-flex items-center gap-1 border border-zinc-200/50 dark:border-zinc-800 opacity-60 cursor-not-allowed"
                                      title="Acesso Restrito: Requer permissão de Sigilo Clínico"
                                    >
                                      <Lock size={11} /> Restrito
                                    </span>
                                  )}

                                  {item.statusAtendimento !== "cancelado" && (
                                    <>
                                      <button
                                        onClick={() => {
                                          playDopamineSound("click");
                                          setRescheduleModalItem(item.rawItem || item);
                                          setNewDate(item.data || selectedDay);
                                          setNewTime(item.horario || "09:00");
                                        }}
                                        className="min-h-[34px] px-3 py-1.5 border border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] font-bold inline-flex items-center gap-1 transition-colors shadow-sm cursor-pointer"
                                      >
                                        <RotateCcw
                                          size={12}
                                          className="text-[#86a621] dark:text-[#9FC131]"
                                        />
                                        <span>Remarcar</span>
                                      </button>
                                      <button
                                        onClick={() => {
                                          playDopamineSound("click");
                                          setCancelModalItem(item.rawItem || item);
                                          setReason("");
                                        }}
                                        className="min-h-[34px] p-2 text-red-600 dark:text-red-400 bg-red-50/60 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/60 border border-red-200/50 dark:border-red-900/40 rounded-xl inline-flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                                        title="Cancelar Atendimento"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {subTab === "lista" && (
              <motion.div
                key="subtab-lista"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={spring}
                className="p-6 md:p-8 h-full overflow-y-auto custom-scrollbar"
              >
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-zinc-950 dark:text-white">
                      Lista Unificada de Atendimentos
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Visão consolidada de pacientes locais e importados do ERP Medicalsys.
                    </p>
                  </div>
                  <span className="text-xs font-bold px-3.5 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-700 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-700/50">
                    {listaUnificadaTodosPacientes.length} paciente(s)
                  </span>
                </div>

                {listaUnificadaTodosPacientes.length === 0 ? (
                  <div className="py-20 text-center rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-500 bg-white/40 dark:bg-white/[0.02]">
                    Nenhum paciente encontrado com esses filtros de busca.
                  </div>
                ) : (
                  <div className="grid gap-3.5">
                    {listaUnificadaTodosPacientes.map((item) => {
                      const isCanceled = item.statusAtendimento === "cancelado";
                      return (
                        <div
                          key={item.id}
                          className={`p-5 rounded-2xl border ${
                            isCanceled
                              ? "bg-zinc-50/50 border-zinc-200/60 opacity-60"
                              : "bg-white dark:bg-[#111116] border-zinc-200/80 dark:border-white/10 shadow-sm"
                          } flex flex-col md:flex-row md:items-center justify-between gap-4`}
                        >
                          <div className="flex items-start md:items-center gap-4">
                            <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center font-bold flex-shrink-0 border border-blue-200/50">
                              <User size={20} />
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-bold text-zinc-950 dark:text-white text-base">
                                  {item.nomePaciente}
                                </h4>
                                {item.tipo === "medicalsys" ? (
                                  <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 rounded-md flex items-center gap-1">
                                    <Server size={10} /> Medicalsys ERP
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-md">
                                    RMAgenda
                                  </span>
                                )}
                                {item.cpfPaciente && (
                                  <span className="text-xs font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                                    CPF: {item.cpfPaciente}
                                  </span>
                                )}
                                <span
                                  className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md ${
                                    isCanceled
                                      ? "bg-red-100 text-red-700"
                                      : "bg-emerald-100 text-emerald-800"
                                  }`}
                                >
                                  {isCanceled
                                    ? "Cancelado"
                                    : item.remarcado
                                    ? "Reagendado"
                                    : "Confirmado"}
                                </span>
                              </div>

                              <p className="text-xs text-zinc-500 mt-1 flex flex-wrap gap-3">
                                <span>
                                  <strong>Especialista:</strong> {item.medicoProfissional}
                                </span>
                                <span>
                                  <strong>Especialidade:</strong> {item.especialidade}
                                </span>
                                {item.modalidade && (
                                  <span>
                                    <strong>Modalidade:</strong> {item.modalidade}
                                  </span>
                                )}
                                {item.telefonePaciente && (
                                  <span className="flex items-center gap-1">
                                    <Phone size={12} /> {item.telefonePaciente}
                                  </span>
                                )}
                              </p>

                              <p className="text-xs text-zinc-400 mt-1">
                                Data: <strong>{item.data}</strong> às{" "}
                                <strong>{item.horario || "--:--"}h</strong>
                              </p>

                              {temPermissaoSigiloClinico && item.enfermidades && item.enfermidades.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {item.enfermidades.map((enf, idx) => (
                                    <span
                                      key={idx}
                                      className="text-[9px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/50 dark:border-rose-900/40 px-2 py-0.5 rounded-md flex items-center gap-1"
                                    >
                                      <HeartPulse size={10} /> {enf}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end md:self-center">
                            {temPermissaoSigiloClinico ? (
                              <button
                                onClick={() => handleOpenSensitiveModal(item)}
                                className="min-h-[40px] px-3.5 py-2 border border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                                title="Verificar Ficha Clínica & Enfermidades"
                              >
                                <ShieldCheck size={14} className="text-blue-500" />
                                <span>Ficha</span>
                              </button>
                            ) : (
                              <span
                                className="min-h-[40px] px-3 py-2 rounded-xl bg-zinc-100/50 dark:bg-zinc-800/40 text-zinc-400 text-[11px] font-bold inline-flex items-center gap-1 border border-zinc-200/50 dark:border-zinc-800 opacity-60 cursor-not-allowed"
                                title="Acesso Restrito: Requer permissão de Sigilo Clínico"
                              >
                                <Lock size={12} /> Ficha Restrita
                              </span>
                            )}

                            {!isCanceled && (
                              <>
                                <button
                                  onClick={() => {
                                    playDopamineSound("click");
                                    setRescheduleModalItem(item.rawItem || item);
                                    setNewDate(item.data || selectedDay);
                                    setNewTime(item.horario || "09:00");
                                  }}
                                  className="min-h-[40px] px-3.5 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                                >
                                  <RotateCcw
                                    size={14}
                                    className="text-[#86a621] dark:text-[#9FC131]"
                                  />{" "}
                                  Remarcar
                                </button>
                                <button
                                  onClick={() => {
                                    playDopamineSound("click");
                                    setCancelModalItem(item.rawItem || item);
                                    setReason("");
                                  }}
                                  className="min-h-[40px] px-3.5 py-2 bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 rounded-xl text-xs font-bold hover:bg-red-500/20 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                                >
                                  <Trash2 size={14} /> Cancelar
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* MODAL: FICHA CLÍNICA & DADOS SENSÍVEIS (ENFERMIDADES) - PROTEGIDO POR PERMISSÃO */}
      <AnimatePresence>
        {sensitiveModalItem && temPermissaoSigiloClinico && (
          <div
            className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-md p-4 flex items-center justify-center"
            onClick={() => setSensitiveModalItem(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/95 dark:bg-[#0c0c0e]/95 backdrop-blur-3xl rounded-[2.5rem] p-6 md:p-8 max-w-xl w-full shadow-2xl border border-zinc-200/80 dark:border-white/10 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-start border-b border-zinc-100 dark:border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-sm">
                    <ShieldCheck size={22} strokeWidth={1.75} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-xl text-zinc-950 dark:text-white tracking-tight">
                      Ficha do Paciente & Dados Clínicos
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Visualização protegida de dados cadastrais e histórico de enfermidades.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSensitiveModalItem(null)}
                  className="p-2 text-zinc-400 hover:text-zinc-950 dark:hover:text-white rounded-full cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* CARD DE DADOS CADASTRAIS */}
              <div className="p-5 bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-3 text-xs">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                      Nome Completo
                    </span>
                    <span className="font-extrabold text-sm text-zinc-950 dark:text-white block mt-0.5">
                      {sensitiveModalItem.nomePaciente}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                      Documento CPF
                    </span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200 block mt-0.5 font-mono">
                      {sensitiveModalItem.cpfPaciente || "Não informado"}
                    </span>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-200/60 dark:border-zinc-800">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                      Nascimento & Idade
                    </span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200 block mt-0.5">
                      {sensitiveModalItem.dataNascimento
                        ? `${sensitiveModalItem.dataNascimento.split("-").reverse().join("/")} (${
                            calcularIdadeDataNasc(sensitiveModalItem.dataNascimento) || "--"
                          } anos)`
                        : "Não informado"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                      WhatsApp / Celular
                    </span>
                    {sensitiveModalItem.telefonePaciente ? (
                      <a
                        href={`https://wa.me/55${sensitiveModalItem.telefonePaciente.replace(
                          /\D/g,
                          ""
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 mt-0.5"
                      >
                        <Phone size={11} /> {sensitiveModalItem.telefonePaciente}{" "}
                        <ExternalLink size={10} />
                      </a>
                    ) : (
                      <span className="text-zinc-400">Não informado</span>
                    )}
                  </div>
                </div>

                {sensitiveModalItem.emailPaciente && (
                  <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                      E-mail
                    </span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200 block mt-0.5">
                      {sensitiveModalItem.emailPaciente}
                    </span>
                  </div>
                )}
              </div>

              {/* SEÇÃO: ENFERMIDADES DIAGNOSTICADAS / ASSOCIADAS */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <HeartPulse size={15} className="text-rose-500" /> Enfermidades do Paciente
                  </h4>
                  <span className="text-[10px] text-zinc-400 font-bold">
                    {enfermidadesPaciente.length} vinculada(s)
                  </span>
                </div>

                {/* TAGS ATUAIS */}
                <div className="flex flex-wrap gap-2 min-h-[38px] p-3 bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl">
                  {enfermidadesPaciente.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic py-0.5">
                      Nenhuma enfermidade vinculada a este paciente.
                    </p>
                  ) : (
                    enfermidadesPaciente.map((enf) => (
                      <div
                        key={enf}
                        className="px-3 py-1 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 text-rose-900 dark:text-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                      >
                        <HeartPulse size={12} className="text-rose-500" />
                        <span>{enf}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveEnfermidadeFromPatient(enf)}
                          className="text-rose-400 hover:text-red-600 transition-colors p-0.5 cursor-pointer"
                          title={`Desvincular "${enf}"`}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* BARRA DE BUSCA E AUTOCOMPLETE DE ENFERMIDADES */}
                <div className="relative space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block ml-1">
                    Buscar ou Cadastrar Enfermidade
                  </label>
                  <div className="relative">
                    <Search
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                    />
                    <input
                      type="text"
                      value={searchEnfermidade}
                      onChange={(e) => setSearchEnfermidade(e.target.value)}
                      placeholder="Digite para buscar (ex: Refluxo, Gastrite, Hipertensão...)"
                      className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none focus:border-[#9FC131]"
                    />
                  </div>

                  {/* SUGESTÕES DE AUTOCOMPLETE */}
                  {searchEnfermidade.trim() && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-[#15151a] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-2 space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                      {sugestoesEnfermidades.map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => handleAddEnfermidadeToPatient(sug)}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <HeartPulse size={13} className="text-rose-500" />
                            {sug}
                          </span>
                          <span className="text-[10px] text-zinc-400 uppercase font-bold">
                            + Vincular
                          </span>
                        </button>
                      ))}

                      {!exactMatchExists && (
                        <button
                          type="button"
                          onClick={handleCreateAndLinkEnfermidade}
                          className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-extrabold text-white bg-zinc-950 dark:bg-white dark:text-black hover:bg-black transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
                        >
                          <Plus size={14} />
                          <span>Cadastrar "{searchEnfermidade.trim()}" no catálogo e vincular</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  As enfermidades vinculadas permitem que a clínica envie orientações, lembretes de exames e mensagens personalizadas de WhatsApp automaticamente para esse grupo de pacientes.
                </p>
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setSensitiveModalItem(null)}
                  disabled={isProcessing}
                  className="min-h-[44px] rounded-xl border border-zinc-200/80 dark:border-zinc-800 font-bold text-xs uppercase text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  Fechar
                </button>
                <ButtonPrimary
                  onClick={handleSaveSensitiveData}
                  disabled={isProcessing}
                  icon={CheckCircle2}
                  className="min-h-[44px] text-xs rounded-xl justify-center cursor-pointer"
                >
                  {isProcessing ? "Salvando..." : "Salvar Alterações"}
                </ButtonPrimary>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CANCELAR AGENDAMENTO */}
      <AnimatePresence>
        {cancelModalItem && (
          <div
            className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-md p-4 flex items-center justify-center"
            onClick={() => setCancelModalItem(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/95 dark:bg-[#121216]/95 backdrop-blur-3xl rounded-[2.5rem] p-6 md:p-8 max-w-md w-full shadow-2xl border border-zinc-200/80 dark:border-white/10 space-y-6"
            >
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 flex items-center justify-center shadow-sm">
                  <Trash2 size={22} />
                </div>
                <button
                  onClick={() => setCancelModalItem(null)}
                  className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-full cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div>
                <h3 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">
                  Cancelar Agendamento?
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Paciente:{" "}
                  <strong>
                    {cancelModalItem.pacientes?.nome_completo || cancelModalItem.nome_paciente}
                  </strong>
                </p>
              </div>

              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                <Info size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p>
                  O horário será liberado imediatamente no sistema e os lembretes automáticos serão
                  desativados.
                </p>
              </div>

              <TextInput
                label="Motivo do Cancelamento"
                placeholder="Ex.: Solicitado pelo paciente..."
                value={cancelReason}
                onChange={(e) => setReason(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setCancelModalItem(null)}
                  disabled={isProcessing}
                  className="min-h-[48px] rounded-2xl border border-zinc-200/80 dark:border-zinc-800 font-bold text-xs uppercase text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  onClick={handleCancelarAdmin}
                  disabled={isProcessing}
                  className="min-h-[48px] rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  {isProcessing ? <Activity size={16} className="animate-spin" /> : "Confirmar"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: REMARCAR AGENDAMENTO */}
      <AnimatePresence>
        {rescheduleModalItem && (
          <div
            className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-md p-4 flex items-center justify-center"
            onClick={() => setRescheduleModalItem(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/95 dark:bg-[#121216]/95 backdrop-blur-3xl rounded-[2.5rem] p-6 md:p-8 max-w-md w-full shadow-2xl border border-zinc-200/80 dark:border-white/10 space-y-6"
            >
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 flex items-center justify-center shadow-sm">
                  <RotateCcw size={22} />
                </div>
                <button
                  onClick={() => setRescheduleModalItem(null)}
                  className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-full cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div>
                <h3 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">
                  Remarcar Agendamento
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Paciente:{" "}
                  <strong>
                    {rescheduleModalItem.pacientes?.nome_completo ||
                      rescheduleModalItem.nome_paciente}
                  </strong>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <TextInput
                  type="date"
                  label="Nova Data"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
                <TextInput
                  type="time"
                  label="Novo Horário"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setRescheduleModalItem(null)}
                  disabled={isProcessing}
                  className="min-h-[48px] rounded-2xl border border-zinc-200/80 dark:border-zinc-800 font-bold text-xs uppercase text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  onClick={handleRemarcarAdmin}
                  disabled={isProcessing || !newDate || !newTime}
                  className="min-h-[48px] rounded-2xl bg-zinc-950 hover:bg-black dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-bold text-xs uppercase flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  {isProcessing ? (
                    <Activity size={16} className="animate-spin" />
                  ) : (
                    "Salvar"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
