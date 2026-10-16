"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarCheck2,
  CalendarClock,
  CalendarPlus,
  CalendarX2,
  Check,
  Clock3,
  HeartPulse,
  Link2Off,
  Lock,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  X
} from "lucide-react";
import { AgendamentoContext } from "../../agendamentos/context";
import ModuleAgenda from "../../agendamentos/modules/ModuleAgenda";
import { resolverServicoSelecionado } from "@/lib/agendaOcupacao";
import { formatarNumeroWhatsApp } from "@/lib/phoneUtils";
import { playDopamineSound, triggerConfetti, triggerHaptic } from "@/lib/dopamine";
import {
  buscarOcupacaoDia,
  cancelarPorLink,
  carregarAgendaRemarcacao,
  confirmarPresencaPorLink,
  remarcarPorLink
} from "@/actions/confirmacao";

const spring = { type: "spring", stiffness: 380, damping: 32 };
const MOTIVOS_CANCELAMENTO = ["Imprevisto pessoal", "Problema de saúde", "Conflito de horário", "Não preciso mais"];

const dataLocal = (data) => new Date(`${data}T12:00:00`);
const fmt = (data, opts) => dataLocal(data).toLocaleDateString("pt-BR", opts);
const maiuscula = (texto) => (texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto);

const nomeServico = (ag) =>
  ag.tipoServico === "Exame"
    ? ag.subtipoExame || ag.especialidade || "Exame"
    : ag.especialidade || ag.subtipoExame || ag.tipoServico || "Consulta";

function contagemRegressiva(data) {
  const hoje = new Date();
  hoje.setHours(12, 0, 0, 0);
  const dias = Math.round((dataLocal(data) - hoje) / 86400000);
  if (dias < 0) return null;
  if (dias === 0) return "É hoje";
  if (dias === 1) return "Amanhã";
  return `Em ${dias} dias`;
}

// ---------- Adicionar à agenda (Google / Apple / Outlook via .ics) ----------
const stampLocal = (data, horario, somaMin = 0) => {
  const [h, m] = horario.split(":").map(Number);
  const total = h * 60 + m + somaMin;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${data.replace(/-/g, "")}T${hh}${mm}00`;
};

function linksAgenda({ agendamento, empresa }) {
  const titulo = `${nomeServico(agendamento)} · ${empresa.nome}`;
  const inicio = stampLocal(agendamento.data, agendamento.horario);
  const fim = stampLocal(agendamento.data, agendamento.horario, 30);
  const local = empresa.config_campos?.endereco || empresa.nome;
  const detalhes = agendamento.medicoProfissional ? `Profissional: ${agendamento.medicoProfissional}` : "";

  const google = `https://calendar.google.com/calendar/render?${new URLSearchParams({
    action: "TEMPLATE",
    text: titulo,
    dates: `${inicio}/${fim}`,
    ctz: "America/Sao_Paulo",
    details: detalhes,
    location: local
  })}`;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//RMAgenda//Confirmacao//PT-BR",
    "BEGIN:VEVENT",
    `UID:${inicio}-${empresa.slug}@rmagenda`,
    `DTSTART;TZID=America/Sao_Paulo:${inicio}`,
    `DTEND;TZID=America/Sao_Paulo:${fim}`,
    `SUMMARY:${titulo}`,
    `LOCATION:${local}`,
    `DESCRIPTION:${detalhes}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Lembrete do seu atendimento",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  return { google, ics: `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}` };
}

// Barras fixas são renderizadas no <body> para não herdarem o transform das animações
const assinarNada = () => () => {};
function Flutuante({ children }) {
  const noCliente = useSyncExternalStore(assinarNada, () => true, () => false);
  return noCliente ? createPortal(children, document.body) : null;
}

// ---------- Elementos visuais ----------
function FundoAmbiente() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-background dark:bg-background" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-[radial-gradient(closest-side,rgba(159,193,49,0.18),transparent)] dark:bg-[radial-gradient(closest-side,rgba(159,193,49,0.12),transparent)]" />
      <div className="absolute bottom-[-30%] right-[-10%] w-[700px] h-[700px] rounded-full bg-[radial-gradient(closest-side,rgba(16,185,129,0.10),transparent)] dark:bg-[radial-gradient(closest-side,rgba(16,185,129,0.08),transparent)]" />
      <div className="absolute inset-0 opacity-[0.35] dark:opacity-[0.15] [background-image:radial-gradient(rgba(0,0,0,0.06)_1px,transparent_1px)] dark:[background-image:radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />
    </div>
  );
}

function CabecalhoClinica({ empresa }) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {empresa.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={empresa.logoUrl}
            alt={empresa.nome}
            className="h-11 w-11 rounded-2xl object-contain bg-white dark:bg-white/95 p-1.5 border border-black/[0.06] shadow-sm shrink-0"
          />
        ) : (
          <div className="h-11 w-11 rounded-2xl bg-zinc-950 dark:bg-white text-white dark:text-black flex items-center justify-center shrink-0 shadow-sm">
            <Building2 size={19} />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[15px] font-bold tracking-tight text-zinc-950 dark:text-white truncate">{empresa.nome}</p>
          <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Confirmação de atendimento</p>
        </div>
      </div>
      <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 px-3 py-1.5 rounded-full bg-white/70 dark:bg-white/[0.05] border border-black/[0.05] dark:border-white/[0.08] backdrop-blur">
        <Lock size={12} /> Link seguro e pessoal
      </span>
    </header>
  );
}

const STATUS_VISUAL = {
  confirmado: {
    rotulo: "Presença confirmada",
    pill: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
    dot: "bg-emerald-500"
  },
  agendado: {
    rotulo: "Aguardando confirmação",
    pill: "bg-amber-500/12 text-amber-800 dark:text-amber-300 border-amber-500/25",
    dot: "bg-amber-500 animate-pulse"
  },
  cancelado: {
    rotulo: "Cancelado",
    pill: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25",
    dot: "bg-rose-500"
  },
  encerrado: {
    rotulo: "Atendimento encerrado",
    pill: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 border-zinc-500/20",
    dot: "bg-zinc-400"
  }
};

function chaveStatus(agendamento) {
  if (agendamento.status === "cancelado" || agendamento.situacao === "cancelado") return "cancelado";
  if (agendamento.situacao === "expirado" || agendamento.situacao === "encerrado") return "encerrado";
  if (agendamento.status === "confirmado") return "confirmado";
  return "agendado";
}

function TicketAgendamento({ agendamento, destaque }) {
  const status = STATUS_VISUAL[chaveStatus(agendamento)];
  const contagem = chaveStatus(agendamento) === "cancelado" ? null : contagemRegressiva(agendamento.data);
  const isExame = agendamento.tipoServico === "Exame";
  const cancelado = chaveStatus(agendamento) === "cancelado";

  return (
    <motion.article
      layout
      transition={spring}
      className={`relative rounded-2xl bg-white dark:bg-[#111113] border shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_30px_60px_-25px_rgba(0,0,0,0.08)] dark:shadow-[0_30px_60px_-25px_rgba(0,0,0,0.8)] overflow-hidden ${
        destaque
          ? "border-emerald-500/40 ring-4 ring-emerald-500/10"
          : "border-black/[0.06] dark:border-white/[0.08]"
      }`}
    >
      {/* Faixa superior */}
      <div className="flex items-center justify-between gap-2 px-4 sm:px-7 pt-4 sm:pt-6">
        <span className={`inline-flex items-center gap-2 text-[11px] font-bold px-3 py-1.5 rounded-full border whitespace-nowrap ${status.pill}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.rotulo}
        </span>
        {contagem && (
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-400 whitespace-nowrap">{contagem}</span>
        )}
      </div>

      {/* Data e hora em destaque */}
      <div className={`px-4 sm:px-7 pt-4 sm:pt-5 pb-4 sm:pb-7 grid grid-cols-[auto_1fr] items-end gap-4 sm:gap-6 ${cancelado ? "opacity-50" : ""}`}>
        <div className="text-center rounded-2xl bg-background dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.06] px-4 sm:px-5 py-3 min-w-[84px]">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-ink">
            {fmt(agendamento.data, { month: "short" }).replace(".", "")}
          </p>
          <p className={`text-4xl sm:text-5xl font-black tracking-tighter text-zinc-950 dark:text-white leading-none mt-1 ${cancelado ? "line-through decoration-2" : ""}`}>
            {fmt(agendamento.data, { day: "2-digit" })}
          </p>
          <p className="text-[11px] font-semibold text-zinc-500 mt-1 capitalize">
            {fmt(agendamento.data, { weekday: "short" }).replace(".", "")}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-zinc-500 dark:text-zinc-400">
            {maiuscula(fmt(agendamento.data, { weekday: "long", day: "numeric", month: "long", year: "numeric" }))}
          </p>
          <p className="mt-1 flex items-baseline gap-2 text-zinc-950 dark:text-white">
            <span className="text-4xl sm:text-5xl font-black tracking-tighter tabular-nums">{agendamento.horario}</span>
            <span className="text-sm font-semibold text-zinc-400">h</span>
          </p>
        </div>
      </div>

      {/* Picote de ingresso */}
      <div aria-hidden className="relative h-6">
        <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background dark:bg-background border border-black/[0.06] dark:border-white/[0.08]" />
        <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background dark:bg-background border border-black/[0.06] dark:border-white/[0.08]" />
        <div className="absolute left-5 right-5 top-1/2 border-t-2 border-dashed border-black/[0.08] dark:border-white/[0.08]" />
      </div>

      {/* Detalhes do atendimento */}
      <dl className="px-4 sm:px-7 pt-3 sm:pt-4 pb-4 sm:pb-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 sm:gap-y-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            {isExame ? <HeartPulse size={17} /> : <Stethoscope size={17} />}
          </div>
          <div className="min-w-0">
            <dt className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-zinc-400">{isExame ? "Exame" : "Atendimento"}</dt>
            <dd className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{nomeServico(agendamento)}</dd>
          </div>
        </div>
        {agendamento.medicoProfissional && (
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <ShieldCheck size={17} />
            </div>
            <div className="min-w-0">
              <dt className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-zinc-400">Profissional</dt>
              <dd className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{agendamento.medicoProfissional}</dd>
            </div>
          </div>
        )}
        {agendamento.modalidade && (
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 flex items-center justify-center shrink-0">
              <Sparkles size={16} />
            </div>
            <div className="min-w-0">
              <dt className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-zinc-400">Modalidade</dt>
              <dd className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{agendamento.modalidade}</dd>
            </div>
          </div>
        )}
      </dl>
    </motion.article>
  );
}

function Botao({ variante = "primario", carregando, children, className = "", ...props }) {
  const estilos = {
    primario:
      "bg-zinc-950 text-white dark:bg-white dark:text-black shadow-[0_12px_30px_-10px_rgba(0,0,0,0.08)] hover:bg-zinc-800 dark:hover:bg-zinc-100",
    confirmar:
      "bg-[#9FC131] text-zinc-950 shadow-[0_14px_34px_-12px_rgba(122,160,20,0.35)] hover:bg-[#a9cc3a]",
    secundario:
      "bg-white/80 dark:bg-white/[0.05] text-zinc-900 dark:text-white border border-black/[0.08] dark:border-white/[0.1] hover:bg-white dark:hover:bg-white/[0.08] backdrop-blur",
    perigo: "bg-rose-600 text-white hover:bg-rose-700 shadow-[0_12px_30px_-12px_rgba(225,29,72,0.35)]",
    fantasma: "text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400"
  };
  return (
    <motion.button
      type="button"
      whileTap={props.disabled ? undefined : { scale: 0.97 }}
      className={`min-h-[52px] px-5 rounded-2xl text-[15px] font-bold tracking-tight inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${estilos[variante]} ${className}`}
      {...props}
      disabled={props.disabled || carregando}
    >
      {carregando ? <Activity size={18} className="animate-spin" /> : children}
    </motion.button>
  );
}

// ---------- Tela de erro (link inválido) ----------
function TelaLinkInvalido({ mensagem }) {
  return (
    <main id="conteudo" className="min-h-[100dvh] flex items-center justify-center px-4 py-10">
      <FundoAmbiente />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="w-full max-w-md text-center rounded-2xl bg-white/90 dark:bg-[#111113]/90 backdrop-blur-2xl border border-black/[0.06] dark:border-white/[0.08] p-8 sm:p-10 shadow-[0_30px_60px_-25px_rgba(0,0,0,0.08)]"
      >
        <div className="mx-auto w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-white/[0.06] text-zinc-500 flex items-center justify-center mb-5">
          <Link2Off size={24} />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-zinc-950 dark:text-white">Link indisponível</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{mensagem}</p>
        <p className="mt-6 text-xs text-zinc-400">Se precisar, peça um novo link à sua clínica.</p>
      </motion.div>
    </main>
  );
}

// ---------- Fluxo de remarcação (reutiliza o ModuleAgenda do agendamento) ----------
function Remarcacao({ token, dados, onVoltar, onRemarcado, onErro }) {
  const { agendamento, empresa } = dados;
  const [carregando, setCarregando] = useState(true);
  const [regras, setRegras] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [agenda, setAgenda] = useState({ ocupados: [], occupiedIntervals: [], buscando: false });
  const [formData, setFormData] = useState(() => ({
    tipo_servico: agendamento.tipoServico,
    subtipo_exame: agendamento.subtipoExame,
    medico_profissional: agendamento.medicoProfissional,
    especialidade: agendamento.especialidade,
    modalidade: agendamento.modalidade,
    data_agendamento: "",
    horario_agendamento: ""
  }));
  const timeSlotsRef = useRef(null);

  useEffect(() => {
    let ativo = true;
    carregarAgendaRemarcacao(token).then((res) => {
      if (!ativo) return;
      if (!res.success) {
        onErro(res.error);
        onVoltar();
        return;
      }
      setRegras(res.regras);
      setServicos(res.servicos);
      setCarregando(false);
    });
    return () => {
      ativo = false;
    };
  }, [token, onErro, onVoltar]);

  useEffect(() => {
    if (!formData.data_agendamento) return;
    let ativo = true;
    const inicio = Date.now();
    buscarOcupacaoDia({ token, data: formData.data_agendamento }).then((res) => {
      if (!ativo) return;
      if (res.success) setAgenda({ ...res.ocupacao, buscando: false, agora: inicio });
      else setAgenda((a) => ({ ...a, buscando: false }));
    });
    return () => {
      ativo = false;
    };
  }, [token, formData.data_agendamento]);

  const selectedSrv = useMemo(() => resolverServicoSelecionado(formData, servicos), [formData, servicos]);

  const contexto = {
    formData,
    setValue: (campo, valor) => {
      if (campo === "data_agendamento" && valor !== formData.data_agendamento) {
        setAgenda((ag) => ({ ...ag, buscando: true }));
      }
      setFormData((f) => ({ ...f, [campo]: valor }));
    },
    calendarMonth,
    setCalendarMonth,
    selectedSrv,
    bloqueioExtraCalculado: null,
    agenda,
    timeSlotsRef,
    regrasGlobais: regras,
    empresaDados: { id: empresa.id, config_campos: empresa.config_campos }
  };

  const pronto = formData.data_agendamento && formData.horario_agendamento;

  const salvar = async () => {
    if (!pronto) return;
    setSalvando(true);
    playDopamineSound("click");
    const res = await remarcarPorLink({ token, data: formData.data_agendamento, horario: formData.horario_agendamento });
    setSalvando(false);
    if (!res.success) {
      playDopamineSound("error");
      triggerHaptic("error");
      onErro(res.error);
      // força nova leitura da grade do dia
      setFormData((f) => ({ ...f, horario_agendamento: "" }));
      setAgenda((a) => ({ ...a, buscando: true }));
      const atual = await buscarOcupacaoDia({ token, data: formData.data_agendamento });
      if (atual.success) setAgenda({ ...atual.ocupacao, buscando: false, agora: Date.now() });
      else setAgenda((a) => ({ ...a, buscando: false }));
      return;
    }
    onRemarcado(res);
  };

  return (
    <motion.section
      key="remarcar"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={spring}
      className="pb-28"
    >
      {/* Barra superior compacta: voltar + o que está sendo trocado, numa linha só */}
      <div className="flex items-center gap-2 mb-3 sm:mb-5">
        <button
          type="button"
          onClick={onVoltar}
          aria-label="Voltar ao resumo"
          className="w-11 h-11 -ml-2 shrink-0 grid place-items-center rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="text-base sm:text-xl font-bold tracking-tight text-zinc-950 dark:text-white leading-tight">Escolha o novo horário</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
            Atual: {maiuscula(fmt(agendamento.data, { weekday: "short", day: "numeric", month: "short" }))} · {agendamento.horario}
          </p>
        </div>
      </div>

      {carregando ? (
        <div className="grid md:grid-cols-2 gap-3 sm:gap-5">
          {[0, 1].map((i) => (
            <div key={i} className="h-[340px] last:hidden md:last:block rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.06] animate-pulse" />
          ))}
        </div>
      ) : (
        <AgendamentoContext.Provider value={contexto}>
          <ModuleAgenda compacto />
        </AgendamentoContext.Provider>
      )}

      {/* Barra fixa de confirmação da remarcação */}
      <Flutuante>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.06] dark:border-white/[0.08] bg-surface/95 backdrop-blur-xl px-4 pt-2.5 pb-[max(10px,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-5xl flex items-center gap-3">
          <div className="flex-1 min-w-0 flex items-center gap-3">
            <div className={`hidden sm:flex w-10 h-10 rounded-xl items-center justify-center shrink-0 ${pronto ? "bg-[#9FC131]/20 text-brand-ink" : "bg-zinc-100 dark:bg-white/[0.06] text-zinc-400"}`}>
              <CalendarCheck2 size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-zinc-400">Novo horário</p>
              <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                {pronto
                  ? `${maiuscula(fmt(formData.data_agendamento, { weekday: "short", day: "numeric", month: "short" }))} · ${formData.horario_agendamento}`
                  : formData.data_agendamento
                  ? "Agora escolha um horário"
                  : "Escolha um dia no calendário"}
              </p>
            </div>
          </div>
          <Botao variante="confirmar" onClick={salvar} disabled={!pronto} carregando={salvando} className="shrink-0 min-h-[48px] px-4 sm:px-7">
            <span className="sm:hidden">Confirmar</span>
            <span className="hidden sm:inline">Confirmar novo horário</span>
            <ArrowRight size={17} />
          </Botao>
        </div>
      </div>
      </Flutuante>
    </motion.section>
  );
}

// ---------- Modal de cancelamento ----------
function ModalCancelamento({ aberto, onFechar, onRemarcar, onConfirmar, processando }) {
  const [motivo, setMotivo] = useState("");
  const [detalhe, setDetalhe] = useState("");

  useEffect(() => {
    if (!aberto) return;
    const esc = (e) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberto, onFechar]);

  return (
    <AnimatePresence>
      {aberto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-6"
          onClick={onFechar}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-cancelamento"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={spring}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white dark:bg-[#111113] rounded-t-2xl sm:rounded-2xl border border-black/[0.06] dark:border-white/[0.1] p-6 sm:p-7 pb-[max(24px,env(safe-area-inset-bottom))] shadow-2xl max-h-[92dvh] overflow-y-auto"
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700 sm:hidden" />
            <div className="flex items-start justify-between gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <CalendarX2 size={22} />
              </div>
              <button type="button" onClick={onFechar} aria-label="Fechar" className="p-2 -m-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-full cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <h2 id="titulo-cancelamento" className="mt-4 text-2xl font-black tracking-tight text-zinc-950 dark:text-white">
              Cancelar atendimento?
            </h2>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              O horário será liberado imediatamente para outro paciente. Se for só uma questão de data, você pode remarcar em segundos.
            </p>

            <button
              type="button"
              onClick={onRemarcar}
              className="mt-5 w-full flex items-center gap-3 text-left rounded-2xl border border-[#9FC131]/40 bg-[#9FC131]/10 hover:bg-[#9FC131]/15 px-4 py-3.5 transition-colors cursor-pointer"
            >
              <RotateCcw size={18} className="text-brand-ink shrink-0" />
              <span className="flex-1">
                <span className="block text-sm font-bold text-zinc-900 dark:text-white">Prefiro remarcar</span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">Escolher outro dia e horário disponível</span>
              </span>
              <ArrowRight size={16} className="text-zinc-400" />
            </button>

            <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">Motivo (opcional)</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {MOTIVOS_CANCELAMENTO.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={motivo === m}
                  onClick={() => setMotivo(motivo === m ? "" : m)}
                  className={`min-h-[40px] px-3.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                    motivo === m
                      ? "bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-black dark:border-white"
                      : "bg-transparent text-zinc-600 dark:text-zinc-300 border-black/[0.1] dark:border-white/[0.12] hover:border-black/30 dark:hover:border-white/30"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <textarea
              value={detalhe}
              onChange={(e) => setDetalhe(e.target.value)}
              maxLength={400}
              rows={2}
              placeholder="Quer deixar algum recado para a clínica?"
              className="mt-3 w-full rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-background dark:bg-white/[0.04] p-3.5 text-sm outline-none focus:border-zinc-400 dark:focus:border-zinc-500 resize-none"
            />

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Botao variante="secundario" onClick={onFechar} disabled={processando}>
                Manter
              </Botao>
              <Botao
                variante="perigo"
                carregando={processando}
                onClick={() => onConfirmar([motivo, detalhe.trim()].filter(Boolean).join(" — "))}
              >
                Cancelar
              </Botao>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------- Painel de ações ----------
function PainelAcoes({ dados, processando, onConfirmar, onRemarcar, onCancelar, compacto = false }) {
  const { agendamento, empresa } = dados;
  const chave = chaveStatus(agendamento);
  const podeAlterar = agendamento.situacao === "ativo";
  const whatsapp = empresa.whatsapp ? `https://wa.me/${formatarNumeroWhatsApp(empresa.whatsapp)}` : null;
  const agendaLinks = useMemo(() => linksAgenda(dados), [dados]);

  if (chave === "cancelado" || chave === "encerrado") {
    return (
      <div className={`flex ${compacto ? "flex-row" : "flex-col"} gap-2.5`}>
        <a
          href={`/${empresa.slug}/agendamentos`}
          className="flex-1 min-h-[52px] px-5 rounded-2xl text-[15px] font-bold inline-flex items-center justify-center gap-2 bg-zinc-950 text-white dark:bg-white dark:text-black"
        >
          <CalendarPlus size={18} /> Novo agendamento
        </a>
        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noreferrer"
            className="flex-1 min-h-[52px] px-5 rounded-2xl text-[15px] font-bold inline-flex items-center justify-center gap-2 bg-white/80 dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] text-zinc-900 dark:text-white"
          >
            <MessageCircle size={18} /> Falar com a clínica
          </a>
        )}
      </div>
    );
  }

  if (chave === "confirmado") {
    return (
      <div className="flex flex-col gap-2.5">
        <div className={`grid ${compacto ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-1"} gap-2.5`}>
          <a
            href={agendaLinks.google}
            target="_blank"
            rel="noreferrer"
            className="min-h-[52px] px-4 rounded-2xl text-sm font-bold inline-flex items-center justify-center gap-2 bg-zinc-950 text-white dark:bg-white dark:text-black"
          >
            <CalendarPlus size={17} /> Google Agenda
          </a>
          <a
            href={agendaLinks.ics}
            download="atendimento.ics"
            className="min-h-[52px] px-4 rounded-2xl text-sm font-bold inline-flex items-center justify-center gap-2 bg-white/80 dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] text-zinc-900 dark:text-white"
          >
            <CalendarCheck2 size={17} /> Apple / Outlook
          </a>
        </div>
        {podeAlterar && (
          <div className="flex items-center justify-center gap-1 text-sm">
            <span className="text-zinc-400 hidden sm:inline">Precisa mudar algo?</span>
            <button type="button" onClick={onRemarcar} className="min-h-[44px] px-2 font-bold text-zinc-800 dark:text-zinc-200 hover:underline cursor-pointer">
              Remarcar
            </button>
            <span className="text-zinc-300 dark:text-zinc-700">·</span>
            <button type="button" onClick={onCancelar} className="min-h-[44px] px-2 font-bold text-zinc-500 hover:text-rose-600 cursor-pointer">
              Cancelar
            </button>
          </div>
        )}
      </div>
    );
  }

  // Aguardando confirmação
  return (
    <div className="flex flex-col gap-2.5">
      <Botao variante="confirmar" onClick={onConfirmar} carregando={processando} disabled={!podeAlterar && agendamento.situacao !== "bloqueado_alteracao"} className="w-full text-base min-h-[56px]">
        <Check size={20} strokeWidth={3} /> Confirmar presença
      </Botao>
      {podeAlterar ? (
        <div className="grid grid-cols-2 gap-2.5">
          <Botao variante="secundario" onClick={onRemarcar}>
            <RotateCcw size={17} /> Remarcar
          </Botao>
          <Botao variante="secundario" onClick={onCancelar} className="hover:!text-rose-600">
            <CalendarX2 size={17} /> Cancelar
          </Botao>
        </div>
      ) : (
        whatsapp && (
          <a href={whatsapp} target="_blank" rel="noreferrer" className="min-h-[48px] inline-flex items-center justify-center gap-2 text-sm font-bold text-zinc-600 dark:text-zinc-300">
            <MessageCircle size={16} /> Para remarcar ou cancelar, fale com a clínica
          </a>
        )
      )}
    </div>
  );
}

// ---------- Tela principal ----------
export default function ConfirmacaoView({ token, inicial, erro }) {
  const reduzirMovimento = useReducedMotion();
  const [dados, setDados] = useState(inicial);
  const [modo, setModo] = useState("resumo");
  const [processando, setProcessando] = useState(false);
  const [cancelamentoAberto, setCancelamentoAberto] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [celebrar, setCelebrar] = useState(false);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 5200);
    return () => clearTimeout(t);
  }, [aviso]);

  const mostrarErro = useCallback((mensagem) => setAviso({ tipo: "erro", texto: mensagem }), []);
  const voltarResumo = useCallback(() => setModo("resumo"), []);

  if (!dados) return <TelaLinkInvalido mensagem={erro} />;

  const { agendamento, empresa, paciente } = dados;
  const chave = chaveStatus(agendamento);
  const primeiroNome = paciente.primeiroNome ? `, ${paciente.primeiroNome}` : "";

  const atualizarAgendamento = (parcial) => setDados((d) => ({ ...d, agendamento: { ...d.agendamento, ...parcial } }));

  const festejar = () => {
    setCelebrar(true);
    playDopamineSound("success");
    triggerHaptic("success");
    if (!reduzirMovimento) triggerConfetti({ count: 80, origin: { x: 0.5, y: 0.3 } });
  };

  const confirmar = async () => {
    setProcessando(true);
    playDopamineSound("click");
    const res = await confirmarPresencaPorLink(token);
    setProcessando(false);
    if (!res.success) {
      playDopamineSound("error");
      triggerHaptic("error");
      mostrarErro(res.error);
      return;
    }
    atualizarAgendamento({ status: "confirmado", confirmadoEm: res.confirmadoEm || new Date().toISOString() });
    festejar();
  };

  const cancelar = async (motivo) => {
    setProcessando(true);
    const res = await cancelarPorLink({ token, motivo });
    setProcessando(false);
    if (!res.success) {
      playDopamineSound("error");
      mostrarErro(res.error);
      return;
    }
    setCancelamentoAberto(false);
    setCelebrar(false);
    atualizarAgendamento({ status: "cancelado", situacao: "cancelado", canceladoEm: new Date().toISOString() });
    playDopamineSound("step");
    setAviso({ tipo: "ok", texto: "Atendimento cancelado. O horário foi liberado para outro paciente." });
  };

  const aoRemarcar = (res) => {
    atualizarAgendamento({
      data: res.data,
      horario: res.horario,
      status: "confirmado",
      confirmadoEm: res.confirmadoEm,
      remarcadoEm: new Date().toISOString()
    });
    setModo("resumo");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    festejar();
  };

  const titulo = {
    agendado: (
      <>
        Olá{primeiroNome}. <span className="text-zinc-400 dark:text-zinc-500">Podemos contar com você?</span>
      </>
    ),
    confirmado: (
      <>
        Tudo certo{primeiroNome}! <span className="text-zinc-400 dark:text-zinc-500">Sua presença está confirmada.</span>
      </>
    ),
    cancelado: (
      <>
        Atendimento cancelado. <span className="text-zinc-400 dark:text-zinc-500">Esperamos ver você em breve.</span>
      </>
    ),
    encerrado: (
      <>
        Este atendimento já passou. <span className="text-zinc-400 dark:text-zinc-500">Que tal agendar o próximo?</span>
      </>
    )
  }[chave];

  const subtitulo = {
    agendado: "Confirme em um toque. Se precisar, você também pode remarcar ou cancelar por aqui — sem ligações, sem espera.",
    confirmado: agendamento.remarcadoEm && celebrar
      ? "Seu novo horário foi reservado e já está confirmado. Adicione à sua agenda para não esquecer."
      : "Obrigado por confirmar. Adicione à sua agenda e receba um lembrete antes do horário.",
    cancelado: "O horário foi liberado. Quando quiser, faça um novo agendamento em poucos passos.",
    encerrado: "Este link vale apenas até o horário do atendimento."
  }[chave];

  return (
    <div className="min-h-[100dvh] text-zinc-950 dark:text-white antialiased">
      <FundoAmbiente />

      {/* Aviso flutuante */}
      <div aria-live="polite" className="fixed top-0 inset-x-0 z-[120] flex justify-center px-4 pt-[max(12px,env(safe-area-inset-top))] pointer-events-none">
        <AnimatePresence>
          {aviso && (
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16 }}
              transition={spring}
              className={`pointer-events-auto max-w-md w-full flex items-start gap-2.5 rounded-2xl px-4 py-3 text-sm font-semibold shadow-xl border backdrop-blur-xl ${
                aviso.tipo === "erro"
                  ? "bg-rose-50/95 dark:bg-rose-950/80 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-200"
                  : "bg-white/95 dark:bg-zinc-900/90 border-black/[0.06] dark:border-white/[0.1] text-zinc-800 dark:text-zinc-100"
              }`}
            >
              {aviso.tipo === "erro" ? <AlertTriangle size={17} className="shrink-0 mt-0.5" /> : <Check size={17} className="shrink-0 mt-0.5 text-emerald-500" />}
              <span>{aviso.texto}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-10 sm:pt-8 lg:pt-12 ${modo === "remarcar" ? "pt-[max(8px,env(safe-area-inset-top))]" : "pt-[max(16px,env(safe-area-inset-top))]"}`}>
        {/* No celular, ao remarcar, o cabeçalho da clínica sai para o calendário aparecer inteiro */}
        <div className={modo === "remarcar" ? "hidden sm:block" : ""}>
          <CabecalhoClinica empresa={empresa} />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {modo === "remarcar" ? (
            <div key="remarcar" id="conteudo" className="sm:mt-8 lg:mt-12 max-w-5xl mx-auto">
              <Remarcacao token={token} dados={dados} onVoltar={voltarResumo} onRemarcado={aoRemarcar} onErro={mostrarErro} />
            </div>
          ) : (
            <motion.main
              id="conteudo"
              key="resumo"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={spring}
              className="mt-5 sm:mt-10 lg:mt-14 grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-6 lg:gap-12 items-start pb-48 sm:pb-16"
            >
              {/* Coluna principal */}
              <div className="max-w-xl mx-auto w-full lg:max-w-none">
                <AnimatePresence>
                  {celebrar && chave === "confirmado" && (
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 16 }}
                      className="mb-5 w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-[0_14px_34px_-10px_rgba(16,185,129,0.35)]"
                    >
                      <Check size={28} strokeWidth={3} />
                    </motion.div>
                  )}
                </AnimatePresence>

                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-balance">{titulo}</h1>
                {/* No celular o subtítulo sai: os botões já dizem o que fazer */}
                <p className="hidden sm:block mt-3 text-base text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-lg text-pretty">{subtitulo}</p>

                <div className="mt-4 sm:mt-8">
                  <TicketAgendamento agendamento={agendamento} destaque={chave === "confirmado"} />
                </div>

                {/* Ações inline em tablets (no celular ficam fixas no rodapé; no desktop, na lateral) */}
                <div className="hidden sm:block lg:hidden mt-6">
                  <PainelAcoes
                    dados={dados}
                    processando={processando}
                    onConfirmar={confirmar}
                    onRemarcar={() => setModo("remarcar")}
                    onCancelar={() => setCancelamentoAberto(true)}
                  />
                </div>

                <p className="mt-6 flex items-center gap-2 text-xs text-zinc-400 justify-center lg:justify-start">
                  <Lock size={12} /> Este link é pessoal. Não compartilhe com outras pessoas.
                </p>
              </div>

              {/* Painel lateral (desktop) */}
              <aside className="hidden lg:block sticky top-10">
                <div className="rounded-2xl bg-white/80 dark:bg-[#111113]/80 backdrop-blur-2xl border border-black/[0.06] dark:border-white/[0.08] p-7 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.08)]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-400">
                    {chave === "agendado" ? "Sua resposta" : chave === "confirmado" ? "Não esqueça" : "Próximo passo"}
                  </p>
                  <p className="mt-2 text-lg font-bold tracking-tight">
                    {chave === "agendado"
                      ? "Confirme para garantir seu horário"
                      : chave === "confirmado"
                      ? "Salve na sua agenda"
                      : "Estamos à disposição"}
                  </p>
                  <div className="mt-6">
                    <PainelAcoes
                      dados={dados}
                      processando={processando}
                      onConfirmar={confirmar}
                      onRemarcar={() => setModo("remarcar")}
                      onCancelar={() => setCancelamentoAberto(true)}
                    />
                  </div>
                  {chave === "agendado" && (
                    <ul className="mt-7 space-y-3 text-sm text-zinc-500 dark:text-zinc-400">
                      <li className="flex gap-2.5"><Check size={16} className="text-emerald-500 shrink-0 mt-0.5" /> A clínica é avisada na hora.</li>
                      <li className="flex gap-2.5"><Check size={16} className="text-emerald-500 shrink-0 mt-0.5" /> Remarque escolhendo entre horários livres.</li>
                      <li className="flex gap-2.5"><Check size={16} className="text-emerald-500 shrink-0 mt-0.5" /> Cancelando, a vaga vai para outro paciente.</li>
                    </ul>
                  )}
                  {chave === "confirmado" && agendamento.confirmadoEm && (
                    <p className="mt-6 text-xs text-zinc-400 flex items-center gap-1.5">
                      <Clock3 size={12} /> Confirmado em{" "}
                      {new Date(agendamento.confirmadoEm).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </div>
              </aside>

              {/* Barra de ações fixa (celular) */}
              <Flutuante>
              <div className="sm:hidden fixed inset-x-0 bottom-0 z-40 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] bg-surface/95 backdrop-blur-xl border-t border-black/[0.06] dark:border-white/[0.08]">
                <PainelAcoes
                  compacto
                  dados={dados}
                  processando={processando}
                  onConfirmar={confirmar}
                  onRemarcar={() => setModo("remarcar")}
                  onCancelar={() => setCancelamentoAberto(true)}
                />
              </div>
              </Flutuante>
            </motion.main>
          )}
        </AnimatePresence>
      </div>

      <ModalCancelamento
        aberto={cancelamentoAberto}
        processando={processando}
        onFechar={() => setCancelamentoAberto(false)}
        onRemarcar={() => {
          setCancelamentoAberto(false);
          setModo("remarcar");
        }}
        onConfirmar={cancelar}
      />
    </div>
  );
}
