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

export default function ConsultarAgendamentosPage() {
  const [sidebar, setSidebar] = useState(true);
  const [credentials, setCredentials] = useState({ cpf: "", dataNascimento: "" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filterTab, setFilterTab] = useState("ativos"); // "ativos" | "todos"

  // Modais
  const [actionTarget, setActionTarget] = useState(null); // item agendamento
  const [actionType, setActionType] = useState("cancelar"); // "cancelar" | "excluir"
  const [reason, setReason] = useState("");
  const [processingAction, setProcessingAction] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const search = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setFeedbackMsg(null);
    const response = await consultarAgendamentosPaciente(credentials);
    setLoading(false);
    if (!response.success) {
      setResult(null);
      setError(response.error);
      return;
    }
    setResult(response);
  };

  const handleConfirmAction = async () => {
    if (!actionTarget) return;
    setProcessingAction(true);
    setError("");

    if (actionType === "cancelar") {
      const response = await cancelarAgendamentoPaciente({
        id: actionTarget.id,
        token: result.token,
        motivo: reason
      });
      setProcessingAction(false);
      if (!response.success) {
        setError(response.error);
        return;
      }
      // Atualiza o estado local
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
        text: "Agendamento cancelado com sucesso. O horário foi liberado e as mensagens automáticas foram desativadas."
      });
    } else if (actionType === "excluir") {
      const response = await excluirAgendamentoPaciente({
        id: actionTarget.id,
        token: result.token
      });
      setProcessingAction(false);
      if (!response.success) {
        setError(response.error);
        return;
      }
      // Remove do estado local
      setResult((current) => ({
        ...current,
        appointments: current.appointments.filter((item) => item.id !== actionTarget.id)
      }));
      setFeedbackMsg({
        type: "success",
        text: "Agendamento excluído do sistema. O horário foi liberado para novos agendamentos."
      });
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
    <div className="flex min-h-[100dvh] bg-[#f6f6f7] dark:bg-black text-zinc-950 dark:text-white">
      <SidebarPremium isExpanded={sidebar} setIsExpanded={setSidebar} />
      <Navbar />

      <main
        className={`flex-1 min-h-[100dvh] transition-[margin] duration-500 ${
          sidebar ? "md:ml-[280px]" : "md:ml-[88px]"
        }`}
      >
        <div className="max-w-5xl mx-auto px-4 py-8 md:px-10 md:py-14 pb-28">
          <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-black flex items-center justify-center mb-5 shadow-md">
              <CalendarCheck size={23} />
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-[-.04em]">Seus agendamentos</h1>
            <p className="mt-3 text-zinc-500 max-w-2xl leading-relaxed">
              Consulte, remarque ou cancele seus horários. Ao remarcar ou cancelar, o horário anterior é liberado imediatamente no sistema para outros pacientes e as mensagens automáticas são atualizadas.
            </p>
          </motion.header>

          <form
            onSubmit={search}
            className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 bg-white dark:bg-[#0b0b0b] border border-zinc-200 dark:border-zinc-800 p-4 rounded-3xl shadow-sm"
          >
            <label>
              <span className="text-xs font-semibold text-zinc-500 ml-1">CPF do Paciente</span>
              <input
                value={credentials.cpf}
                onChange={(e) => setCredentials({ ...credentials, cpf: maskCPF(e.target.value) })}
                placeholder="000.000.000-00"
                maxLength={14}
                className="mt-2 w-full min-h-13 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 text-base outline-none focus:border-zinc-900 transition-colors"
              />
            </label>
            <label>
              <span className="text-xs font-semibold text-zinc-500 ml-1">Data de Nascimento</span>
              <input
                type="date"
                value={credentials.dataNascimento}
                onChange={(e) => setCredentials({ ...credentials, dataNascimento: e.target.value })}
                className="mt-2 w-full min-h-13 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 text-base outline-none focus:border-zinc-900 transition-colors"
              />
            </label>
            <motion.button
              whileTap={{ scale: 0.96 }}
              disabled={loading || credentials.cpf.length !== 14 || !credentials.dataNascimento}
              className="sm:self-end min-h-13 px-7 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-black font-semibold disabled:opacity-30 flex items-center justify-center gap-2 shadow-md"
            >
              {loading ? <Activity className="animate-spin" size={17} /> : <Search size={17} />}
              Consultar
            </motion.button>
          </form>

          {error && (
            <div role="alert" className="mt-4 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-sm flex items-center gap-2">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          {feedbackMsg && (
            <div className={`mt-4 p-4 rounded-2xl flex items-center gap-2 text-sm font-medium ${
              feedbackMsg.type === "success" ? "bg-emerald-50 border border-emerald-100 text-emerald-800" : "bg-red-50 border border-red-100 text-red-700"
            }`}>
              <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
              {feedbackMsg.text}
            </div>
          )}

          <AnimatePresence mode="wait">
            {result && (
              <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Identidade confirmada</p>
                      <p className="font-semibold text-lg">{result.patient}</p>
                    </div>
                  </div>

                  {/* Filtro de Abas */}
                  <div className="flex p-1 bg-zinc-200/60 dark:bg-zinc-800/60 rounded-2xl self-start sm:self-auto">
                    <button
                      onClick={() => setFilterTab("ativos")}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        filterTab === "ativos"
                          ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                          : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      Agendamentos Ativos
                    </button>
                    <button
                      onClick={() => setFilterTab("todos")}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        filterTab === "todos"
                          ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                          : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      Todos os Registros ({result.appointments.length})
                    </button>
                  </div>
                </div>

                {filteredAppointments.length === 0 ? (
                  <div className="py-16 text-center rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 text-zinc-500 flex flex-col items-center justify-center">
                    <CalendarX size={36} className="text-zinc-300 dark:text-zinc-700 mb-3" />
                    <p className="font-medium">Nenhum agendamento encontrado nesta categoria.</p>
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
                          transition={{ delay: index * 0.04 }}
                          className={`bg-white dark:bg-[#0b0b0b] border rounded-3xl p-5 md:p-6 transition-all ${
                            canceled
                              ? "border-zinc-200 dark:border-zinc-800/60 opacity-60 bg-zinc-50/50 dark:bg-zinc-950/20"
                              : "border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md"
                          }`}
                        >
                          <div className="flex flex-col md:flex-row md:items-center gap-5">
                            <div
                              className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                                item.tipo_servico === "Exame"
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600"
                                  : "bg-blue-50 dark:bg-blue-950/40 text-blue-600"
                              }`}
                            >
                              {item.tipo_servico === "Exame" ? <HeartPulse size={22} /> : <UserRound size={22} />}
                            </div>

                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-lg font-bold">{serviceName(item)}</h2>
                                <span
                                  className={`text-[11px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                                    canceled
                                      ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                                      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400"
                                  }`}
                                >
                                  {canceled ? "Cancelado" : "Confirmado"}
                                </span>
                                {rescheduled && !canceled && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                                    Remarcado
                                  </span>
                                )}
                              </div>

                              <p className="text-sm text-zinc-500 mt-1 flex items-center gap-1.5">
                                <Building2 size={14} className="text-zinc-400" />
                                {item.empresa?.nome || "Clínica"} · <span className="font-medium">{item.tipo_servico}</span>
                              </p>

                              <div className="flex flex-wrap gap-4 mt-3 text-sm font-medium">
                                <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                                  <CalendarClock size={16} className="text-blue-500" />
                                  {formatDate(item.data_agendamento)}
                                </span>
                                <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                                  <Clock3 size={16} className="text-blue-500" />
                                  {item.horario_agendamento?.slice(0, 5)} h
                                </span>
                              </div>

                              {item.motivo_cancelamento && (
                                <p className="mt-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-2.5 rounded-xl border border-red-100 dark:border-red-900/30">
                                  Motivo do cancelamento: {item.motivo_cancelamento}
                                </p>
                              )}
                            </div>

                            {/* Ações para o paciente */}
                            {isManageable(item) ? (
                              <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full md:w-auto flex-shrink-0">
                                <a
                                  href={`/${item.empresa?.slug}/agendamentos?reagendar=${item.id}&token=${encodeURIComponent(
                                    result.token
                                  )}`}
                                  className="min-h-11 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-center gap-2 text-sm font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                                  title="Mudar data e horário (o horário atual será liberado)"
                                >
                                  <RotateCcw size={15} className="text-blue-500" />
                                  Remarcar
                                </a>

                                <button
                                  onClick={() => {
                                    setActionTarget(item);
                                    setActionType("cancelar");
                                    setReason("");
                                  }}
                                  className="min-h-11 px-4 rounded-xl bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 flex items-center justify-center gap-2 text-sm font-semibold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                  title="Cancelar agendamento e liberar horário"
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
                                      setActionTarget(item);
                                      setActionType("excluir");
                                    }}
                                    className="min-h-11 px-4 rounded-xl border border-red-200 text-red-600 dark:border-red-900/40 dark:text-red-400 flex items-center justify-center gap-2 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
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

      {/* Modal de Confirmação (Cancelar ou Excluir) */}
      <AnimatePresence>
        {actionTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100000] bg-black/50 backdrop-blur-sm p-4 flex items-end sm:items-center justify-center"
            onClick={() => setActionTarget(null)}
          >
            <motion.div
              initial={{ y: 30, scale: 0.97 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 30, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white dark:bg-[#111] rounded-[2rem] p-6 md:p-8 shadow-2xl border border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center">
                  <Trash2 size={22} />
                </div>
                <button
                  onClick={() => setActionTarget(null)}
                  className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <h2 className="text-2xl font-bold mt-5">
                {actionType === "cancelar" ? "Cancelar este agendamento?" : "Excluir este registro?"}
              </h2>

              <div className="mt-3 p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>O que acontece a seguir:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>
                      O dia <strong>{formatDate(actionTarget.data_agendamento)} às {actionTarget.horario_agendamento?.slice(0,5)}h</strong> será liberado no sistema para que outros pacientes possam agendar.
                    </li>
                    <li>As mensagens automáticas de lembrete ainda pendentes serão desativadas.</li>
                  </ul>
                </div>
              </div>

              {actionType === "cancelar" && (
                <div className="mt-4">
                  <label className="text-xs font-semibold text-zinc-500 block mb-1">
                    Motivo do cancelamento (opcional)
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ex.: Imprevisto pessoal, mudança de horário..."
                    className="w-full min-h-24 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4 text-sm outline-none focus:border-zinc-900 dark:focus:border-white transition-colors"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  onClick={() => setActionTarget(null)}
                  disabled={processingAction}
                  className="min-h-12 rounded-2xl border border-zinc-200 dark:border-zinc-800 font-semibold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  Manter
                </button>
                <button
                  onClick={handleConfirmAction}
                  disabled={processingAction}
                  className="min-h-12 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm disabled:opacity-50 transition-colors shadow-md flex items-center justify-center gap-2"
                >
                  {processingAction ? (
                    <Activity className="animate-spin" size={16} />
                  ) : actionType === "cancelar" ? (
                    "Confirmar cancelamento"
                  ) : (
                    "Confirmar exclusão"
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
