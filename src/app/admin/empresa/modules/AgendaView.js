"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  CalendarClock,
  Clock
} from "lucide-react";
import {
  getHojeLocal,
  fadeUp,
  staggerContainer,
  staggerItem,
  CustomSelect,
  ToggleSwitch,
  TextInput
} from "../components/SharedUI";
import {
  actionCancelarAgendamentoAdmin,
  actionExcluirAgendamentoAdmin,
  actionRemarcarAgendamentoAdmin
} from "@/actions/adminData";

export default function AgendaView({ agendamentos = [], bloqueios = [], servicos = [], fetchAgendamentos, showToast }) {
  const [filterMedico, setFilterMedico] = useState("Todos");
  const [showBlockedInAgenda, setShowBlockedInAgenda] = useState(false);
  const [showCanceled, setShowCanceled] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(getHojeLocal());

  // Estado para modais de Ação no Admin
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

  // Opções do filtro de profissionais/serviços
  const profissionaisOptions = useMemo(() => {
    const defaultOption = { value: "Todos", label: "Todos os Registros" };
    if (!servicos || servicos.length === 0) return [defaultOption];

    const options = servicos
      .filter((s) => s.ativo !== false)
      .map((s) => ({
        value: s.nome,
        label: `${s.nome} (${s.tipo})`
      }));

    return [defaultOption, ...options];
  }, [servicos]);

  const agendamentosFiltrados = useMemo(() => {
    return agendamentos
      .filter((a) => a.data_agendamento === selectedDay)
      .filter((a) => (showCanceled ? true : a.status_atendimento !== "cancelado"))
      .filter((a) => {
        if (filterMedico === "Todos") return true;
        const profExame = a.tipo_servico === "Exame" ? a.subtipo_exame : a.medico_profissional;
        return profExame === filterMedico;
      });
  }, [agendamentos, selectedDay, filterMedico, showCanceled]);

  const bloqueiosFiltrados = useMemo(() => {
    return bloqueios
      .filter((b) => b.data === selectedDay)
      .filter((b) => filterMedico === "Todos" || b.medico_profissional === filterMedico);
  }, [bloqueios, selectedDay, filterMedico]);

  const eventosAgendaMista = useMemo(() => {
    const arr = [...agendamentosFiltrados.map((a) => ({ ...a, tipo: "agendamento" }))];
    if (showBlockedInAgenda) {
      arr.push(...bloqueiosFiltrados.map((b) => ({ ...b, tipo: "bloqueio" })));
    }
    return arr.sort((a, b) => {
      const hA = a.tipo === "agendamento" ? a.horario_agendamento : a.horario;
      const hB = b.tipo === "agendamento" ? b.horario_agendamento : b.horario;
      return (hA || "").localeCompare(hB || "");
    });
  }, [agendamentosFiltrados, bloqueiosFiltrados, showBlockedInAgenda]);

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
    <motion.div key="agenda" {...fadeUp} className="flex-1 flex flex-col h-full overflow-hidden w-full max-w-7xl mx-auto md:p-6 lg:p-8">
      <div className="bg-white rounded-[2rem] border border-zinc-200/60 shadow-sm flex flex-col h-full overflow-hidden">
        
        {/* Painel Superior de Filtros */}
        <div className="px-6 md:px-8 py-6 border-b border-zinc-100 flex flex-col md:flex-row gap-6 justify-between md:items-center bg-zinc-50/30">
          <div>
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Agenda de Pacientes</h2>
            <div className="flex flex-wrap items-center gap-6 mt-3">
              <ToggleSwitch checked={showBlockedInAgenda} onChange={setShowBlockedInAgenda} label="Ver Horários Bloqueados" />
              <ToggleSwitch checked={showCanceled} onChange={setShowCanceled} label="Ver Cancelados" />
            </div>
          </div>
          
          <div className="w-full md:w-72">
            <CustomSelect 
              label="Filtrar Agenda" 
              value={filterMedico} 
              onChange={setFilterMedico} 
              options={profissionaisOptions} 
              icon={Filter} 
            />
          </div>
        </div>

        {/* Corpo Principal da Agenda */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          
          {/* Mini Calendário Lateral */}
          <div className="w-full md:w-[320px] border-r border-zinc-100 p-6 flex flex-col overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <span className="font-bold capitalize text-zinc-900">
                {currentDate.toLocaleString("pt-BR", { month: "long", year: "numeric" })}
              </span>
              <div className="flex gap-1 bg-zinc-50 rounded-lg p-0.5 border border-zinc-200/50">
                <button onClick={prevMonth} className="p-1.5 text-zinc-400 hover:text-zinc-900 transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={nextMonth} className="p-1.5 text-zinc-400 hover:text-zinc-900 transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-y-2 gap-x-1">
              {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                <div key={i} className="text-center text-[10px] font-bold text-zinc-300 uppercase">
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
                const hasBlock =
                  showBlockedInAgenda &&
                  bloqueios.some(
                    (b) => b.data === dateStr && (filterMedico === "Todos" || b.medico_profissional === filterMedico)
                  );

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDay(dateStr)}
                    className={`relative h-10 w-full rounded-xl text-sm transition-all ${
                      isSel
                        ? "bg-zinc-900 text-white font-bold shadow-md"
                        : isTod
                        ? "bg-zinc-100 font-bold text-zinc-900"
                        : "hover:bg-zinc-50 text-zinc-600 font-medium"
                    }`}
                  >
                    {i + 1}
                    <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
                      {hasAgend && <div className={`w-1 h-1 rounded-full ${isSel ? "bg-white" : "bg-green-500"}`} />}
                      {hasBlock && <div className={`w-1 h-1 rounded-full ${isSel ? "bg-red-300" : "bg-red-400"}`} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lista de Registros do Dia */}
          <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar bg-[#FAFAFA]/50">
            <h3 className="text-lg font-bold text-zinc-900 mb-6 flex items-center gap-2">
              <CalendarDays size={18} className="text-zinc-400" />
              {new Date(selectedDay + "T12:00:00").toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long"
              })}
            </h3>

            <AnimatePresence mode="popLayout">
              {eventosAgendaMista.length === 0 ? (
                <motion.div key="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-20 text-center flex flex-col items-center justify-center">
                  <div className="w-20 h-20 bg-white border border-zinc-200 rounded-[2rem] flex items-center justify-center text-zinc-300 mb-6 shadow-sm">
                    <User size={28} />
                  </div>
                  <p className="text-zinc-500 text-sm font-medium">Nenhum evento corresponde aos filtros nesta data.</p>
                </motion.div>
              ) : (
                <motion.div key="list-state" variants={staggerContainer} initial="initial" animate="animate" exit={{ opacity: 0 }} className="space-y-4">
                  {eventosAgendaMista.map((ev) => {
                    const isAgendamento = ev.tipo === "agendamento";
                    const isCanceled = isAgendamento && ev.status_atendimento === "cancelado";
                    const isRescheduled = isAgendamento && !!ev.remarcado_em;
                    const tituloPrincipal = isAgendamento
                      ? ev.tipo_servico === "Exame"
                        ? ev.subtipo_exame
                        : ev.medico_profissional
                      : ev.medico_profissional;
                    const hrFormat = (ev.horario_agendamento || ev.horario)?.substring(0, 5);

                    return (
                      <motion.div
                        key={ev.id}
                        variants={staggerItem}
                        layout
                        className={`bg-white border ${
                          isCanceled
                            ? "border-zinc-200 opacity-60 bg-zinc-50/50"
                            : isAgendamento
                            ? "border-zinc-200/80 hover:border-zinc-300"
                            : "border-red-100 hover:border-red-200"
                        } p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all relative overflow-hidden`}
                      >
                        {!isAgendamento && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-400" />}

                        <div className="flex flex-1 items-start sm:items-center gap-4">
                          <div className="bg-zinc-50 border border-zinc-100 px-4 py-3 rounded-xl text-center min-w-[76px] shadow-inner flex-shrink-0">
                            <span className="text-lg font-black text-zinc-900 tracking-tighter">{hrFormat}</span>
                          </div>

                          <div className="flex-1">
                            {isAgendamento ? (
                              <>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-base font-bold text-zinc-900">
                                    {ev.pacientes?.nome_completo ? ev.pacientes.nome_completo : "Paciente não identificado"}
                                  </h4>
                                  {ev.pacientes?.cpf && (
                                    <span className="text-xs font-medium text-zinc-400 px-2 py-0.5 bg-zinc-100 rounded-md">
                                      CPF: {ev.pacientes.cpf}
                                    </span>
                                  )}
                                  <span
                                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                                      isCanceled
                                        ? "bg-red-100 text-red-700"
                                        : "bg-emerald-100 text-emerald-800"
                                    }`}
                                  >
                                    {isCanceled ? "Cancelado" : "Confirmado"}
                                  </span>
                                  {isRescheduled && !isCanceled && (
                                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md">
                                      Remarcado
                                    </span>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  <span className="bg-zinc-100 text-zinc-700 text-[10px] font-bold uppercase px-2.5 py-1 rounded-md flex items-center gap-1">
                                    <Stethoscope size={12} /> {tituloPrincipal}
                                  </span>
                                  <span className="bg-zinc-100 text-zinc-500 text-[10px] font-bold uppercase px-2.5 py-1 rounded-md">
                                    {ev.tipo_servico}
                                  </span>
                                  <span
                                    className={`${
                                      ev.status_pagamento_antecipado ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                                    } text-[10px] font-bold uppercase px-2.5 py-1 rounded-md flex items-center gap-1`}
                                  >
                                    <CreditCard size={12} /> {ev.status_pagamento_antecipado ? "Pago" : "Pendente"}
                                  </span>
                                </div>

                                {ev.motivo_cancelamento && (
                                  <p className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">
                                    Motivo: {ev.motivo_cancelamento}
                                  </p>
                                )}
                              </>
                            ) : (
                              <>
                                <h4 className="text-base font-bold text-zinc-500 flex items-center gap-2">
                                  Paciente da Plataforma MedicalSys{" "}
                                  {ev.status === "importado" && (
                                    <span className="bg-blue-50 text-blue-600 text-[9px] uppercase px-2 py-0.5 rounded-md flex items-center gap-1">
                                      <Server size={10} /> ERP
                                    </span>
                                  )}
                                </h4>
                                <p className="text-sm font-medium text-zinc-900 mt-1">{tituloPrincipal}</p>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Ações de Administração no Card */}
                        {isAgendamento && (
                          <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                            {!isCanceled && (
                              <>
                                <button
                                  onClick={() => {
                                    setRescheduleModalItem(ev);
                                    setNewDate(ev.data_agendamento || selectedDay);
                                    setNewTime(ev.horario_agendamento?.substring(0, 5) || "09:00");
                                  }}
                                  className="px-3 py-2 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-100 flex items-center gap-1.5 text-xs font-bold transition-colors"
                                  title="Remarcar agendamento (libera o horário anterior)"
                                >
                                  <RotateCcw size={14} className="text-blue-600" />
                                  Remarcar
                                </button>

                                <button
                                  onClick={() => {
                                    setCancelModalItem(ev);
                                    setReason("");
                                  }}
                                  className="px-3 py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 flex items-center gap-1.5 text-xs font-bold transition-colors"
                                  title="Cancelar agendamento (libera horário e para mensagens)"
                                >
                                  <Trash2 size={14} />
                                  Cancelar
                                </button>
                              </>
                            )}

                            {isCanceled && (
                              <button
                                onClick={() => setDeleteModalItem(ev)}
                                className="px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1.5 text-xs font-bold transition-colors"
                                title="Excluir permanentemente do banco"
                              >
                                <Trash2 size={14} />
                                Excluir
                              </button>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Modal de Cancelamento pelo Admin */}
      <AnimatePresence>
        {cancelModalItem && (
          <div
            className="fixed inset-0 z-[99999] bg-black/40 backdrop-blur-sm p-4 flex items-center justify-center"
            onClick={() => setCancelModalItem(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-zinc-200"
            >
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
                Paciente: <strong>{cancelModalItem.pacientes?.nome_completo}</strong>
              </p>

              <div className="mt-4 p-3 bg-amber-50 border border-amber-200/60 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p>
                  O horário será liberado na agenda e as mensagens automáticas vinculadas a este atendimento serão desativadas.
                </p>
              </div>

              <div className="mt-4">
                <TextInput
                  label="Motivo do Cancelamento"
                  placeholder="Ex.: Solicitado pelo paciente, imprevisto médico..."
                  value={cancelReason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  onClick={() => setCancelModalItem(null)}
                  disabled={isProcessing}
                  className="py-3 rounded-xl border border-zinc-200 font-bold text-xs uppercase tracking-widest text-zinc-600 hover:bg-zinc-100"
                >
                  Voltar
                </button>
                <button
                  onClick={handleCancelarAdmin}
                  disabled={isProcessing}
                  className="py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  {isProcessing ? <Activity size={16} className="animate-spin" /> : "Confirmar"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Remarcação pelo Admin */}
      <AnimatePresence>
        {rescheduleModalItem && (
          <div
            className="fixed inset-0 z-[99999] bg-black/40 backdrop-blur-sm p-4 flex items-center justify-center"
            onClick={() => setRescheduleModalItem(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-zinc-200"
            >
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
                Paciente: <strong>{rescheduleModalItem.pacientes?.nome_completo}</strong>
              </p>

              <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 flex items-start gap-2">
                <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <p>
                  O horário anterior (
                  <strong>
                    {rescheduleModalItem.data_agendamento} às {rescheduleModalItem.horario_agendamento?.slice(0, 5)}h
                  </strong>
                  ) será liberado imediatamente para outros atendimentos.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
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

              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  onClick={() => setRescheduleModalItem(null)}
                  disabled={isProcessing}
                  className="py-3 rounded-xl border border-zinc-200 font-bold text-xs uppercase tracking-widest text-zinc-600 hover:bg-zinc-100"
                >
                  Voltar
                </button>
                <button
                  onClick={handleRemarcarAdmin}
                  disabled={isProcessing || !newDate || !newTime}
                  className="py-3 rounded-xl bg-zinc-900 hover:bg-black text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? <Activity size={16} className="animate-spin" /> : "Salvar Remarcação"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Exclusão Permanente pelo Admin */}
      <AnimatePresence>
        {deleteModalItem && (
          <div
            className="fixed inset-0 z-[99999] bg-black/40 backdrop-blur-sm p-4 flex items-center justify-center"
            onClick={() => setDeleteModalItem(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-zinc-200"
            >
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center">
                  <AlertTriangle size={22} />
                </div>
                <button onClick={() => setDeleteModalItem(null)} className="p-2 text-zinc-400 hover:text-zinc-900 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <h3 className="text-xl font-bold text-zinc-900 mt-5">Excluir Permanentemente?</h3>
              <p className="text-sm text-zinc-500 mt-2">
                Esta ação apagará o registro do banco de dados e todo o histórico associado.
              </p>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  onClick={() => setDeleteModalItem(null)}
                  disabled={isProcessing}
                  className="py-3 rounded-xl border border-zinc-200 font-bold text-xs uppercase tracking-widest text-zinc-600 hover:bg-zinc-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExcluirAdmin}
                  disabled={isProcessing}
                  className="py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  {isProcessing ? <Activity size={16} className="animate-spin" /> : "Excluir Definitivamente"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
