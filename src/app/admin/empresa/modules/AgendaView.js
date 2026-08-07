"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  User,
  CalendarDays,
  Stethoscope,
  CreditCard,
  Server,
  Filter,
  Trash2,
  RotateCcw,
  X,
  Activity,
  AlertTriangle,
  Info,
  Search,
  Users,
  Phone,
  Calendar,
  CheckCircle2,
  LayoutGrid,
  List
} from "lucide-react";
import {
  getHojeLocal,
  fadeUp,
  staggerContainer,
  staggerItem,
  CustomSelect,
  ToggleSwitch,
  TextInput,
  spring
} from "../components/SharedUI";
import {
  actionCancelarAgendamentoAdmin,
  actionExcluirAgendamentoAdmin,
  actionRemarcarAgendamentoAdmin
} from "@/actions/adminData";

export default function AgendaView({ agendamentos = [], bloqueios = [], servicos = [], fetchAgendamentos, showToast }) {
  // Sub-abas unificadas de visão
  const [subTab, setSubTab] = useState("calendario"); // "calendario" | "lista"
  const [viewMode, setViewMode] = useState("cards"); // "cards" | "tabela"

  // Busca e Filtro de Origem (Todos | Local | ERP Medicalsys)
  const [searchTerm, setSearchTerm] = useState("");
  const [origemFilter, setOrigemFilter] = useState("todos"); // "todos" | "local" | "erp"
  const [filterMedico, setFilterMedico] = useState("Todos");
  const [showBlockedInAgenda, setShowBlockedInAgenda] = useState(false);
  const [showCanceled, setShowCanceled] = useState(true);

  // Calendário
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(getHojeLocal());

  // Modais de ação do Admin
  const [cancelModalItem, setCancelModalItem] = useState(null);
  const [cancelReason, setReason] = useState("");
  const [rescheduleModalItem, setRescheduleModalItem] = useState(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [deleteModalItem, setDeleteModalItem] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Opções do filtro de médicos/serviços
  const profissionaisOptions = useMemo(() => {
    const defaultOption = { value: "Todos", label: "Todos os Profissionais" };
    if (!servicos || servicos.length === 0) return [defaultOption];

    const options = servicos
      .filter((s) => s.ativo !== false)
      .map((s) => ({
        value: s.nome,
        label: `${s.nome} (${s.tipo})`
      }));

    return [defaultOption, ...options];
  }, [servicos]);

  // Função auxiliar de busca por texto (Nome, CPF ou Telefone)
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

  // UNIFICAÇÃO DOS PACIENTES LOCAL + ERP MEDICALSYS EM UMA ÚNICA LISTA
  const listaUnificadaTodosPacientes = useMemo(() => {
    const locais = agendamentos.map((a) => ({
      id: a.id,
      tipo: "local",
      data: a.data_agendamento,
      horario: a.horario_agendamento?.substring(0, 5),
      nomePaciente: a.pacientes?.nome_completo || "Paciente Local",
      cpfPaciente: a.pacientes?.cpf || null,
      telefonePaciente: a.pacientes?.telefone_whatsapp || null,
      medicoProfissional: a.tipo_servico === "Exame" ? a.subtipo_exame : a.medico_profissional,
      especialidade: a.tipo_servico,
      statusAtendimento: a.status_atendimento,
      pago: a.status_pagamento_antecipado,
      remarcado: !!a.remarcado_em,
      motivoCancelamento: a.motivo_cancelamento,
      rawItem: a
    }));

    const erp = bloqueios
      .filter((b) => b.status === "importado" || b.medicalsys_id)
      .map((b) => ({
        id: b.id,
        tipo: "erp",
        data: b.data,
        horario: b.horario?.substring(0, 5),
        nomePaciente: b.nome_paciente || "Paciente ERP",
        cpfPaciente: b.cpf_paciente || null,
        telefonePaciente: b.telefone_paciente || null,
        medicoProfissional: b.medico_profissional,
        especialidade: b.especialidade || b.observacoes || "Geral",
        statusAtendimento: b.situacao === "canc" ? "cancelado" : "agendado",
        pago: false,
        remarcado: false,
        medicalsysId: b.medicalsys_id,
        rawItem: b
      }));

    return [...locais, ...erp]
      .filter((item) => (showCanceled ? true : item.statusAtendimento !== "cancelado"))
      .filter((item) => {
        if (origemFilter === "local") return item.tipo === "local";
        if (origemFilter === "erp") return item.tipo === "erp";
        return true;
      })
      .filter((item) => {
        if (filterMedico === "Todos") return true;
        return item.medicoProfissional === filterMedico;
      })
      .filter((item) => matchesSearch(item.nomePaciente, item.cpfPaciente, item.telefonePaciente))
      .sort((a, b) => new Date(`${b.data}T${b.horario || "00:00"}`) - new Date(`${a.data}T${a.horario || "00:00"}`));
  }, [agendamentos, bloqueios, showCanceled, origemFilter, filterMedico, searchTerm]);

  // Registros do dia selecionado
  const eventosAgendaMistaDiaria = useMemo(() => {
    return listaUnificadaTodosPacientes
      .filter((item) => item.data === selectedDay)
      .sort((a, b) => (a.horario || "").localeCompare(b.horario || ""));
  }, [listaUnificadaTodosPacientes, selectedDay]);

  // Executar cancelamento pelo admin
  const handleCancelarAdmin = async () => {
    if (!cancelModalItem) return;
    setIsProcessing(true);
    try {
      await actionCancelarAgendamentoAdmin(cancelModalItem.id, cancelReason || "Cancelado pelo Administrador");
      if (showToast) showToast("Agendamento cancelado. Horário liberado e mensagens desativadas!");
      if (fetchAgendamentos) await fetchAgendamentos();
      setCancelModalItem(null);
      setReason("");
    } catch (err) {
      if (showToast) showToast(`Erro ao cancelar: ${err.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Executar exclusão física pelo admin
  const handleExcluirAdmin = async () => {
    if (!deleteModalItem) return;
    setIsProcessing(true);
    try {
      await actionExcluirAgendamentoAdmin(deleteModalItem.id);
      if (showToast) showToast("Agendamento excluído permanentemente do banco!");
      if (fetchAgendamentos) await fetchAgendamentos();
      setDeleteModalItem(null);
    } catch (err) {
      if (showToast) showToast(`Erro ao excluir: ${err.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Executar remarcação pelo admin
  const handleRemarcarAdmin = async () => {
    if (!rescheduleModalItem || !newDate || !newTime) {
      if (showToast) showToast("Informe a nova data e o novo horário.", "error");
      return;
    }
    setIsProcessing(true);
    try {
      await actionRemarcarAgendamentoAdmin(rescheduleModalItem.id, newDate, newTime);
      if (showToast) showToast("Agendamento remarcado! Horário anterior liberado.");
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

  return (
    <motion.div key="agenda" {...fadeUp} className="flex-1 flex flex-col h-full overflow-hidden w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      <div className="bg-white dark:bg-[#0d0d0d] rounded-[2.5rem] border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex flex-col h-full overflow-hidden">
        
        {/* PADRÃO UNIFICADO DE CABEÇALHO COM ÍCONE NA ESQUERDA */}
        <div className="px-6 md:px-8 pt-6 pb-5 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-900/20 flex flex-col gap-5">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#86a621]/10 text-[#86a621] dark:bg-zinc-800 dark:text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <CalendarDays size={24} />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                  Agenda de Pacientes
                </h2>
                <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
                  Gerencie todos os atendimentos da clínica em uma única tela, com filtros por origem e busca avançada.
                </p>
              </div>
            </div>

            {/* SEGMENTED CONTROL / SUB-ABAS E MODO DE VISÃO */}
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <LayoutGroup>
                <div className="flex p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-sm">
                  <button
                    onClick={() => setSubTab("calendario")}
                    className={`relative px-5 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl transition-colors z-10 whitespace-nowrap flex items-center gap-2 ${
                      subTab === "calendario" ? "text-white" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    {subTab === "calendario" && (
                      <motion.div layoutId="subtab-agenda" className="absolute inset-0 bg-zinc-900 dark:bg-white dark:text-black rounded-xl -z-10 shadow-md" transition={spring} />
                    )}
                    <Calendar size={14} /> Calendário Diário
                  </button>

                  <button
                    onClick={() => setSubTab("lista")}
                    className={`relative px-5 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl transition-colors z-10 whitespace-nowrap flex items-center gap-2 ${
                      subTab === "lista" ? "text-white" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    {subTab === "lista" && (
                      <motion.div layoutId="subtab-agenda" className="absolute inset-0 bg-zinc-900 dark:bg-white dark:text-black rounded-xl -z-10 shadow-md" transition={spring} />
                    )}
                    <Users size={14} /> Lista Unificada ({listaUnificadaTodosPacientes.length})
                  </button>
                </div>
              </LayoutGroup>

              {/* Botões do modo de visualização (Cards vs Lista) */}
              <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
                <button
                  onClick={() => setViewMode("cards")}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === "cards" ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-400 hover:text-zinc-700"
                  }`}
                  title="Exibir em formato de Cards"
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  onClick={() => setViewMode("tabela")}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === "tabela" ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-400 hover:text-zinc-700"
                  }`}
                  title="Exibir em formato de Lista Tabela"
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* BARRA DE PESQUISA UNIFICADA + FILTROS DE ORIGEM */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-5 relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar paciente por nome, CPF ou telefone..."
                className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl text-sm font-medium text-zinc-900 dark:text-white outline-none focus:border-zinc-900 dark:focus:border-white transition-all shadow-sm placeholder:text-zinc-400"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-700">
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Filtro de Origem Unificado */}
            <div className="md:col-span-3 flex p-1 bg-zinc-100 dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
              <button
                onClick={() => setOrigemFilter("todos")}
                className={`flex-1 py-1.5 text-[11px] font-bold uppercase rounded-xl transition-all ${
                  origemFilter === "todos" ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setOrigemFilter("local")}
                className={`flex-1 py-1.5 text-[11px] font-bold uppercase rounded-xl transition-all ${
                  origemFilter === "local" ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                Plataforma
              </button>
              <button
                onClick={() => setOrigemFilter("erp")}
                className={`flex-1 py-1.5 text-[11px] font-bold uppercase rounded-xl transition-all ${
                  origemFilter === "erp" ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                Medicalsys
              </button>
            </div>

            <div className="md:col-span-2">
              <CustomSelect label="" value={filterMedico} onChange={setFilterMedico} options={profissionaisOptions} icon={Filter} />
            </div>

            <div className="md:col-span-2 flex items-center justify-end">
              <ToggleSwitch checked={showCanceled} onChange={setShowCanceled} label="Ver Cancelados" />
            </div>
          </div>
        </div>

        {/* CONTEÚDO DAS SUB-ABAS */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            
            {/* SUB-ABA 1: VISÃO DIÁRIA & CALENDÁRIO */}
            {subTab === "calendario" && (
              <motion.div key="subtab-cal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={spring} className="flex flex-col md:flex-row h-full overflow-hidden">
                
                {/* Mini Calendário Lateral */}
                <div className="w-full md:w-[320px] border-r border-zinc-100 dark:border-zinc-800/80 p-6 flex flex-col overflow-y-auto bg-white dark:bg-[#0a0a0a]">
                  <div className="flex justify-between items-center mb-6">
                    <span className="font-bold capitalize text-zinc-900 dark:text-white text-base">
                      {currentDate.toLocaleString("pt-BR", { month: "long", year: "numeric" })}
                    </span>
                    <div className="flex gap-1 bg-zinc-50 dark:bg-zinc-900 rounded-lg p-0.5 border border-zinc-200/50 dark:border-zinc-800">
                      <button onClick={prevMonth} className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                        <ChevronLeft size={16} />
                      </button>
                      <button onClick={nextMonth} className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-y-2 gap-x-1">
                    {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                      <div key={i} className="text-center text-[10px] font-bold text-zinc-400 uppercase">
                        {d}
                      </div>
                    ))}
                    {Array.from({ length: firstDay }).map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
                      const isSel = selectedDay === dateStr;
                      const isTod = getHojeLocal() === dateStr;

                      const hasAgend = agendamentos.some(
                        (a) =>
                          a.data_agendamento === dateStr &&
                          a.status_atendimento !== "cancelado" &&
                          (filterMedico === "Todos" ||
                            (a.tipo_servico === "Exame" ? a.subtipo_exame === filterMedico : a.medico_profissional === filterMedico))
                      );

                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedDay(dateStr)}
                          className={`relative h-10 w-full rounded-xl text-sm transition-all ${
                            isSel
                              ? "bg-zinc-900 text-white dark:bg-white dark:text-black font-bold shadow-md scale-105"
                              : isTod
                              ? "bg-zinc-100 dark:bg-zinc-800 font-bold text-zinc-900 dark:text-white"
                              : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-medium"
                          }`}
                        >
                          {i + 1}
                          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
                            {hasAgend && <div className={`w-1 h-1 rounded-full ${isSel ? "bg-white dark:bg-black" : "bg-emerald-500"}`} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Lista Unificada do Dia Selecionado */}
                <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar bg-[#FAFAFA]/50 dark:bg-zinc-950/40">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <CalendarDays size={18} className="text-blue-500" />
                      {new Date(selectedDay + "T12:00:00").toLocaleDateString("pt-BR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                      })}
                    </h3>
                    <span className="text-xs font-semibold px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-600 dark:text-zinc-400">
                      {eventosAgendaMistaDiaria.length} paciente(s)
                    </span>
                  </div>

                  {eventosAgendaMistaDiaria.length === 0 ? (
                    <div className="mt-20 text-center flex flex-col items-center justify-center">
                      <div className="w-20 h-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] flex items-center justify-center text-zinc-300 dark:text-zinc-700 mb-6 shadow-sm">
                        <User size={28} />
                      </div>
                      <p className="text-zinc-500 text-sm font-medium">Nenhum atendimento agendado para esta data.</p>
                    </div>
                  ) : viewMode === "cards" ? (
                    <div className="grid gap-4">
                      {eventosAgendaMistaDiaria.map((item) => {
                        const isCanceled = item.statusAtendimento === "cancelado";
                        return (
                          <div
                            key={item.id}
                            className={`p-5 rounded-2xl border ${
                              isCanceled
                                ? "bg-zinc-50/50 border-zinc-200 opacity-60"
                                : "bg-white dark:bg-[#111] border-zinc-200/80 dark:border-zinc-800 shadow-sm hover:shadow-md"
                            } transition-all flex flex-col md:flex-row md:items-center justify-between gap-4`}
                          >
                            <div className="flex items-start md:items-center gap-4">
                              <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 px-4 py-3 rounded-xl text-center min-w-[76px] shadow-inner flex-shrink-0">
                                <span className="text-lg font-black text-zinc-900 dark:text-white tracking-tighter">{item.horario || "--:--"}</span>
                              </div>

                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="font-bold text-zinc-900 dark:text-white text-base">{item.nomePaciente}</h4>
                                  {item.tipo === "erp" ? (
                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 rounded-md flex items-center gap-1">
                                      <Server size={10} /> Medicalsys ERP
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-md">
                                      Plataforma Local
                                    </span>
                                  )}
                                  {item.cpfPaciente && (
                                    <span className="text-xs font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                                      CPF: {item.cpfPaciente}
                                    </span>
                                  )}
                                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${isCanceled ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800"}`}>
                                    {isCanceled ? "Cancelado" : "Confirmado"}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                                  <span><strong>Especialista:</strong> {item.medicoProfissional}</span>
                                  {item.especialidade && <span><strong>Especialidade/Plano:</strong> {item.especialidade}</span>}
                                  {item.telefonePaciente && (
                                    <span className="flex items-center gap-1"><Phone size={12} /> {item.telefonePaciente}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Ações */}
                            <div className="flex items-center gap-2 self-end md:self-center">
                              {!isCanceled && (
                                <>
                                  <button
                                    onClick={() => {
                                      setRescheduleModalItem(item.rawItem || item);
                                      setNewDate(item.data || selectedDay);
                                      setNewTime(item.horario || "09:00");
                                    }}
                                    className="px-3 py-2 rounded-xl border border-zinc-200 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 flex items-center gap-1.5 text-xs font-bold transition-colors"
                                  >
                                    <RotateCcw size={14} className="text-blue-600" /> Remarcar
                                  </button>
                                  <button
                                    onClick={() => {
                                      setCancelModalItem(item.rawItem || item);
                                      setReason("");
                                    }}
                                    className="px-3 py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 flex items-center gap-1.5 text-xs font-bold transition-colors"
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
                    /* VISÃO EM TABELA UNIFICADA */
                    <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-x-auto shadow-sm">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 font-bold uppercase tracking-wider text-zinc-400">
                            <th className="p-4">Horário</th>
                            <th className="p-4">Paciente</th>
                            <th className="p-4">Origem</th>
                            <th className="p-4">Especialista / Plano</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
                          {eventosAgendaMistaDiaria.map((item) => (
                            <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                              <td className="p-4 font-bold text-zinc-900 dark:text-white">{item.horario || "--:--"}</td>
                              <td className="p-4">
                                <div className="font-bold text-zinc-900 dark:text-white">{item.nomePaciente}</div>
                                {item.cpfPaciente && <div className="text-[10px] text-zinc-400">CPF: {item.cpfPaciente}</div>}
                              </td>
                              <td className="p-4">
                                {item.tipo === "erp" ? (
                                  <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Medicalsys</span>
                                ) : (
                                  <span className="bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Local</span>
                                )}
                              </td>
                              <td className="p-4">
                                <div className="text-zinc-800 dark:text-zinc-200 font-bold">{item.medicoProfissional}</div>
                                <div className="text-[10px] text-zinc-400">{item.especialidade}</div>
                              </td>
                              <td className="p-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.statusAtendimento === "cancelado" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800"}`}>
                                  {item.statusAtendimento}
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                {item.statusAtendimento !== "cancelado" && (
                                  <button
                                    onClick={() => {
                                      setCancelModalItem(item.rawItem || item);
                                      setReason("");
                                    }}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Cancelar"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
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

            {/* SUB-ABA 2: LISTA UNIFICADA COMPLETA DE PACIENTES */}
            {subTab === "lista" && (
              <motion.div key="subtab-lista" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={spring} className="p-6 md:p-8 h-full overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Lista Unificada de Atendimentos</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Visão consolidada de pacientes locais e importados do ERP Medicalsys.</p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-700 dark:text-zinc-300">
                    {listaUnificadaTodosPacientes.length} paciente(s)
                  </span>
                </div>

                {listaUnificadaTodosPacientes.length === 0 ? (
                  <div className="py-20 text-center rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-500">
                    Nenhum paciente encontrado com esses filtros de busca.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {listaUnificadaTodosPacientes.map((item) => {
                      const isCanceled = item.statusAtendimento === "cancelado";
                      return (
                        <div
                          key={item.id}
                          className={`p-5 rounded-2xl border ${
                            isCanceled ? "bg-zinc-50/50 border-zinc-200 opacity-60" : "bg-white dark:bg-[#111] border-zinc-200/80 dark:border-zinc-800 shadow-sm"
                          } flex flex-col md:flex-row md:items-center justify-between gap-4`}
                        >
                          <div className="flex items-start md:items-center gap-4">
                            <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                              <User size={20} />
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-bold text-zinc-900 dark:text-white text-base">{item.nomePaciente}</h4>
                                {item.tipo === "erp" ? (
                                  <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 rounded-md flex items-center gap-1">
                                    <Server size={10} /> Medicalsys ERP
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-md">
                                    Plataforma
                                  </span>
                                )}
                                {item.cpfPaciente && (
                                  <span className="text-xs font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                                    CPF: {item.cpfPaciente}
                                  </span>
                                )}
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${isCanceled ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800"}`}>
                                  {isCanceled ? "Cancelado" : "Confirmado"}
                                </span>
                              </div>

                              <p className="text-xs text-zinc-500 mt-1 flex flex-wrap gap-3">
                                <span><strong>Especialista:</strong> {item.medicoProfissional}</span>
                                {item.especialidade && <span><strong>Especialidade/Plano:</strong> {item.especialidade}</span>}
                                {item.telefonePaciente && <span className="flex items-center gap-1"><Phone size={12} /> {item.telefonePaciente}</span>}
                              </p>

                              <p className="text-xs text-zinc-400 mt-1">
                                Data: <strong>{item.data}</strong> às <strong>{item.horario || "--:--"}h</strong>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end md:self-center">
                            {!isCanceled && (
                              <button
                                onClick={() => {
                                  setCancelModalItem(item.rawItem || item);
                                  setReason("");
                                }}
                                className="px-3 py-2 bg-red-50 text-red-700 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors flex items-center gap-1"
                              >
                                <Trash2 size={14} /> Cancelar
                              </button>
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

      {/* MODAL DE CANCELAMENTO */}
      <AnimatePresence>
        {cancelModalItem && (
          <div className="fixed inset-0 z-[99999] bg-black/40 backdrop-blur-sm p-4 flex items-center justify-center" onClick={() => setCancelModalItem(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-zinc-200">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                  <Trash2 size={22} />
                </div>
                <button onClick={() => setCancelModalItem(null)} className="p-2 text-zinc-400 hover:text-zinc-900 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <h3 className="text-xl font-bold text-zinc-900 mt-5">Cancelar Agendamento?</h3>
              <p className="text-sm text-zinc-500 mt-1">
                Paciente: <strong>{cancelModalItem.pacientes?.nome_completo || cancelModalItem.nome_paciente}</strong>
              </p>

              <div className="mt-4 p-3 bg-amber-50 border border-amber-200/60 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p>O horário será liberado na agenda e as mensagens automáticas vinculadas serão desativadas.</p>
              </div>

              <div className="mt-4">
                <TextInput label="Motivo do Cancelamento" placeholder="Ex.: Solicitado pelo paciente..." value={cancelReason} onChange={(e) => setReason(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <button onClick={() => setCancelModalItem(null)} disabled={isProcessing} className="py-3 rounded-xl border border-zinc-200 font-bold text-xs uppercase text-zinc-600">
                  Voltar
                </button>
                <button onClick={handleCancelarAdmin} disabled={isProcessing} className="py-3 rounded-xl bg-red-600 text-white font-bold text-xs uppercase flex items-center justify-center gap-2">
                  {isProcessing ? <Activity size={16} className="animate-spin" /> : "Confirmar"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE REMARCAÇÃO */}
      <AnimatePresence>
        {rescheduleModalItem && (
          <div className="fixed inset-0 z-[99999] bg-black/40 backdrop-blur-sm p-4 flex items-center justify-center" onClick={() => setRescheduleModalItem(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-zinc-200">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <RotateCcw size={22} />
                </div>
                <button onClick={() => setRescheduleModalItem(null)} className="p-2 text-zinc-400 hover:text-zinc-900 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <h3 className="text-xl font-bold text-zinc-900 mt-5">Remarcar Agendamento</h3>
              <p className="text-sm text-zinc-500 mt-1">
                Paciente: <strong>{rescheduleModalItem.pacientes?.nome_completo || rescheduleModalItem.nome_paciente}</strong>
              </p>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <TextInput type="date" label="Nova Data" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                <TextInput type="time" label="Novo Horário" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <button onClick={() => setRescheduleModalItem(null)} disabled={isProcessing} className="py-3 rounded-xl border border-zinc-200 font-bold text-xs uppercase text-zinc-600">
                  Voltar
                </button>
                <button onClick={handleRemarcarAdmin} disabled={isProcessing || !newDate || !newTime} className="py-3 rounded-xl bg-zinc-900 text-white font-bold text-xs uppercase flex items-center justify-center gap-2">
                  {isProcessing ? <Activity size={16} className="animate-spin" /> : "Salvar Remarcação"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
