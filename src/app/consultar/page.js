"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Clock3,
  HeartPulse,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
  AlertTriangle,
  Info,
  Building2,
  CalendarX
} from "lucide-react";
import Navbar from "@/components/Navbar";
import SidebarPremium from "@/components/SidebarPremium";
import {
  cancelarAgendamentoPaciente,
  excluirAgendamentoPaciente,
  consultarAgendamentosPaciente
} from "@/actions/appointments";
import { playDopamineSound, triggerHaptic } from "@/lib/dopamine";
import { SkeletonCard } from "@/components/SkeletonLoaders";

const maskCPF = (value) =>
  value
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1");

const formatDate = (value) =>
  value
    ? new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      })
    : "";

const spring = { type: "spring", stiffness: 420, damping: 30 };

export default function ConsultarAgendamentosPage() {
  const [sidebar, setSidebar] = useState(true);
  const [credentials, setCredentials] = useState({ cpf: "", dataNascimento: "" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filterTab, setFilterTab] = useState("ativos");

  const [actionTarget, setActionTarget] = useState(null);
  const [actionType, setActionType] = useState("cancelar");
  const [reason, setReason] = useState("");
  const [processingAction, setProcessingAction] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const search = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setFeedbackMsg(null);
    playDopamineSound("click");
    triggerHaptic("light");

    const response = await consultarAgendamentosPaciente(credentials);
    setLoading(false);

    if (!response.success) {
      setResult(null);
      setError(response.error);
      playDopamineSound("error");
      triggerHaptic("error");
      return;
    }

    setResult(response);
    playDopamineSound("unlock");
    triggerHaptic("success");
  };

  const handleConfirmAction = async () => {
    if (!actionTarget) return;
    setProcessingAction(true);
    setError("");
    playDopamineSound("click");

    if (actionType === "cancelar") {
      const response = await cancelarAgendamentoPaciente({
        id: actionTarget.id,
        token: result.token,
        motivo: reason
      });
      setProcessingAction(false);
      if (!response.success) {
        setError(response.error);
        playDopamineSound("error");
        return;
      }
      setResult((current) => ({
        ...current,
        appointments: current.appointments.map((item) =>
          item.id === actionTarget.id
            ? { ...item, status_atendimento: "cancelado", motivo_cancelamento: reason }
            : item
        )
      }));
      setFeedbackMsg({
        type: "success",
        text: "Agendamento cancelado com sucesso. O horário foi liberado no sistema."
      });
      playDopamineSound("step");
    } else if (actionType === "excluir") {
      const response = await excluirAgendamentoPaciente({
        id: actionTarget.id,
        token: result.token
      });
      setProcessingAction(false);
      if (!response.success) {
        setError(response.error);
        playDopamineSound("error");
        return;
      }
      setResult((current) => ({
        ...current,
        appointments: current.appointments.filter((item) => item.id !== actionTarget.id)
      }));
      setFeedbackMsg({
        type: "success",
        text: "Registro excluído do histórico com sucesso."
      });
      playDopamineSound("step");
    }

    setActionTarget(null);
    setReason("");
  };

  const isManageable = (item) =>
    item.status_atendimento !== "cancelado" &&
    new Date(`${item.data_agendamento}T23:59:59`) >= new Date();

  const serviceName = (item) =>
    item.tipo_servico === "Exame" ? item.subtipo_exame : item.medico_profissional;

  const filteredAppointments = result?.appointments
    ? result.appointments.filter((item) => {
        if (filterTab === "ativos") {
          return item.status_atendimento !== "cancelado";
        }
        return true;
      })
    : [];

  return (
    <div className="flex min-h-[100dvh] bg-[#F8FAFC] dark:bg-[#060A12] text-zinc-950 dark:text-white transition-colors duration-400 font-sans antialiased">
      <SidebarPremium isExpanded={sidebar} setIsExpanded={setSidebar} />
      <Navbar />

      <main
        className={`flex-1 min-h-[100dvh] transition-[margin] duration-500 ease-out ${
          sidebar ? "md:ml-[280px]" : "md:ml-[88px]"
        }`}
      >
        <div className="max-w-4xl mx-auto px-4 py-8 md:px-10 md:py-14 pb-28">
          <motion.header
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring}
            className="mb-8"
          >
            <div className="w-12 h-12 rounded-2xl bg-zinc-950 dark:bg-white text-white dark:text-black flex items-center justify-center mb-5 shadow-lg shadow-black/5 dark:shadow-white/10">
              <CalendarCheck size={22} strokeWidth={2} />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
              Seus agendamentos
            </h1>
            <p className="mt-3 text-zinc-500 dark:text-zinc-400 text-sm md:text-base max-w-2xl leading-relaxed">
              Consulte seu histórico, remarque datas ou cancele com total flexibilidade.
            </p>
          </motion.header>

          <form
            onSubmit={search}
            className="grid sm:grid-cols-[1fr_1fr_auto] gap-3.5 bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-4 md:p-5 rounded-3xl shadow-[0_15px_35px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
          >
            <label className="space-y-1.5">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest ml-1">
                CPF do Paciente
              </span>
              <input
                value={credentials.cpf}
                onChange={(e) => setCredentials({ ...credentials, cpf: maskCPF(e.target.value) })}
                placeholder="000.000.000-00"
                maxLength={14}
                required
                className="w-full min-h-[48px] rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 px-4 text-sm font-medium outline-none focus:border-[#9FC131] dark:focus:border-[#9FC131] transition-all"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest ml-1">
                Data de Nascimento
              </span>
              <input
                type="date"
                value={credentials.dataNascimento}
                onChange={(e) => setCredentials({ ...credentials, dataNascimento: e.target.value })}
                required
                className="w-full min-h-[48px] rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 px-4 text-sm font-medium outline-none focus:border-[#9FC131] dark:focus:border-[#9FC131] transition-all"
              />
            </label>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              disabled={loading || credentials.cpf.length !== 14 || !credentials.dataNascimento}
              className="sm:self-end min-h-[48px] px-8 rounded-2xl bg-zinc-950 dark:bg-white text-white dark:text-black text-sm font-bold disabled:opacity-30 flex items-center justify-center gap-2 shadow-md transition-all"
            >
              {loading ? <Activity className="animate-spin" size={18} /> : <Search size={18} />}
              Consultar
            </motion.button>
          </form>

          {loading && (
            <div className="mt-8">
              <SkeletonCard count={2} />
            </div>
          )}

          {error && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
              className="mt-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-2.5"
            >
              <AlertTriangle size={18} className="shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {feedbackMsg && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-4 p-4 rounded-2xl flex items-center gap-2.5 text-sm font-medium border ${
                feedbackMsg.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  : "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
              }`}
            >
              <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
              <span>{feedbackMsg.text}</span>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {result && !loading && (
              <motion.section
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={spring}
                className="mt-8"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-800/50 text-emerald-600 flex items-center justify-center shadow-sm">
                      <ShieldCheck size={22} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                        Paciente Identificado
                      </p>
                      <p className="font-extrabold text-lg text-zinc-950 dark:text-white">
                        {result.patient}
                      </p>
                    </div>
                  </div>

                  <div className="flex p-1 bg-zinc-200/60 dark:bg-zinc-800/60 rounded-2xl self-start sm:self-auto gap-1">
                    <button
                      onClick={() => {
                        playDopamineSound("click");
                        setFilterTab("ativos");
                      }}
                      className={`relative px-4 py-2 rounded-xl text-xs font-bold transition-all min-h-[38px] ${
                        filterTab === "ativos"
                          ? "text-zinc-950 dark:text-white"
                          : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      {filterTab === "ativos" && (
                        <motion.div
                          layoutId="tab-active-pill"
                          transition={spring}
                          className="absolute inset-0 bg-white dark:bg-zinc-900 rounded-xl shadow-sm -z-10"
                        />
                      )}
                      Agendamentos Ativos
                    </button>

                    <button
                      onClick={() => {
                        playDopamineSound("click");
                        setFilterTab("todos");
                      }}
                      className={`relative px-4 py-2 rounded-xl text-xs font-bold transition-all min-h-[38px] ${
                        filterTab === "todos"
                          ? "text-zinc-950 dark:text-white"
                          : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      {filterTab === "todos" && (
                        <motion.div
                          layoutId="tab-active-pill"
                          transition={spring}
                          className="absolute inset-0 bg-white dark:bg-zinc-900 rounded-xl shadow-sm -z-10"
                        />
                      )}
                      Todos os Registros ({result.appointments.length})
                    </button>
                  </div>
                </div>

                {filteredAppointments.length === 0 ? (
                  <div className="py-16 text-center rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-500 flex flex-col items-center justify-center p-6 bg-white/40 dark:bg-white/[0.02]">
                    <CalendarX size={38} className="text-zinc-300 dark:text-zinc-700 mb-3" />
                    <p className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">
                      Nenhum agendamento encontrado nesta categoria.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {filteredAppointments.map((item, index) => {
                      const canceled = item.status_atendimento === "cancelado";
                      const rescheduled = !!item.remarcado_em;

                      return (
                        <motion.article
                          key={item.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border rounded-3xl p-5 md:p-6 transition-all ${
                            canceled
                              ? "border-zinc-200/60 dark:border-white/5 opacity-65 bg-zinc-50/50 dark:bg-zinc-950/20"
                              : "border-zinc-200/80 dark:border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.03)] hover:shadow-md"
                          }`}
                        >
                          <div className="flex flex-col md:flex-row md:items-center gap-5">
                            <div
                              className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border ${
                                item.tipo_servico === "Exame"
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/50 text-emerald-600"
                                  : "bg-blue-50 dark:bg-blue-950/40 border-blue-200/50 text-blue-600"
                              }`}
                            >
                              {item.tipo_servico === "Exame" ? (
                                <HeartPulse size={22} />
                              ) : (
                                <UserRound size={22} />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-base md:text-lg font-bold text-zinc-950 dark:text-white truncate">
                                  {serviceName(item)}
                                </h2>
                                <span
                                  className={`text-[10px] px-2.5 py-1 rounded-full font-extrabold uppercase tracking-wider ${
                                    canceled
                                      ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                                      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400"
                                  }`}
                                >
                                  {canceled ? "Cancelado" : "Confirmado"}
                                </span>
                                {rescheduled && !canceled && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                                    Remarcado
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1.5">
                                <Building2 size={13} className="text-zinc-400" />
                                {item.empresa?.nome || "Clínica"} ·{" "}
                                <span className="font-semibold">{item.tipo_servico}</span>
                              </p>

                              <div className="flex flex-wrap gap-4 mt-3 text-xs md:text-sm font-semibold">
                                <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                                  <CalendarClock size={15} className="text-[#9FC131]" />
                                  {formatDate(item.data_agendamento)}
                                </span>
                                <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                                  <Clock3 size={15} className="text-blue-500" />
                                  {item.horario_agendamento?.slice(0, 5)} h
                                </span>
                              </div>

                              {item.motivo_cancelamento && (
                                <p className="mt-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-2.5 rounded-xl border border-red-100 dark:border-red-900/30">
                                  Motivo do cancelamento: {item.motivo_cancelamento}
                                </p>
                              )}
                            </div>

                            {isManageable(item) ? (
                              <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full md:w-auto flex-shrink-0 pt-2 md:pt-0">
                                <a
                                  href={`/${item.empresa?.slug}/agendamentos?reagendar=${item.id}&token=${encodeURIComponent(
                                    result.token
                                  )}`}
                                  onClick={() => {
                                    playDopamineSound("select");
                                    triggerHaptic("light");
                                  }}
                                  className="min-h-[48px] px-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-center gap-2 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-zinc-900 dark:text-white"
                                  title="Mudar data e horário"
                                >
                                  <RotateCcw size={15} className="text-[#9FC131]" />
                                  Remarcar
                                </a>

                                <button
                                  onClick={() => {
                                    playDopamineSound("click");
                                    setActionTarget(item);
                                    setActionType("cancelar");
                                    setReason("");
                                  }}
                                  className="min-h-[48px] px-5 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center justify-center gap-2 text-xs font-bold hover:bg-red-500/20 transition-colors"
                                  title="Cancelar agendamento"
                                >
                                  <Trash2 size={15} />
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              canceled && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      playDopamineSound("click");
                                      setActionTarget(item);
                                      setActionType("excluir");
                                    }}
                                    className="min-h-[44px] px-4 rounded-xl border border-red-200/80 text-red-600 dark:border-red-900/40 dark:text-red-400 flex items-center justify-center gap-2 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                    title="Excluir histórico deste registro"
                                  >
                                    <Trash2 size={14} />
                                    Excluir histórico
                                  </button>
                                </div>
                              )
                            )}
                          </div>
                        </motion.article>
                      );
                    })}
                  </div>
                )}
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {actionTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100000] bg-black/60 backdrop-blur-md p-4 flex items-end sm:items-center justify-center"
            onClick={() => setActionTarget(null)}
          >
            <motion.div
              initial={{ y: 30, scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 30, opacity: 0 }}
              transition={spring}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white/95 dark:bg-[#0f0f12]/95 backdrop-blur-3xl rounded-[2.5rem] p-6 md:p-8 shadow-2xl border border-zinc-200/80 dark:border-white/10 space-y-6"
            >
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 flex items-center justify-center shadow-sm">
                  <Trash2 size={22} />
                </div>
                <button
                  onClick={() => setActionTarget(null)}
                  className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div>
                <h2 className="text-2xl font-black tracking-tight text-zinc-950 dark:text-white">
                  {actionType === "cancelar" ? "Cancelar este agendamento?" : "Excluir este registro?"}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {actionTarget.medico_profissional || actionTarget.subtipo_exame}
                </p>
              </div>

              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-3">
                <Info size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>O que acontece a seguir:</strong>
                  <ul className="list-disc list-inside mt-1.5 space-y-1">
                    <li>
                      O dia <strong>{formatDate(actionTarget.data_agendamento)} às {actionTarget.horario_agendamento?.slice(0,5)}h</strong> será liberado imediatamente para outros pacientes.
                    </li>
                    <li>As mensagens de lembrete pendentes serão desativadas.</li>
                  </ul>
                </div>
              </div>

              {actionType === "cancelar" && (
                <div>
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest block mb-2 ml-1">
                    Motivo do cancelamento (opcional)
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ex.: Imprevisto pessoal, mudança de data..."
                    className="w-full min-h-[90px] rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 p-4 text-sm outline-none focus:border-[#9FC131] transition-all resize-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setActionTarget(null)}
                  disabled={processingAction}
                  className="min-h-[48px] rounded-2xl border border-zinc-200/80 dark:border-zinc-800 font-bold text-xs uppercase tracking-wider hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                >
                  Manter
                </button>
                <button
                  onClick={handleConfirmAction}
                  disabled={processingAction}
                  className="min-h-[48px] rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider disabled:opacity-50 transition-all shadow-md flex items-center justify-center gap-2"
                >
                  {processingAction ? (
                    <Activity className="animate-spin" size={16} />
                  ) : actionType === "cancelar" ? (
                    "Confirmar"
                  ) : (
                    "Excluir"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
