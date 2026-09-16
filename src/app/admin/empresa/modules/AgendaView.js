"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
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
  ArrowUpDown,
  MessageSquare,
  Send,
  Paperclip,
  Edit3,
  AlertCircle,
  Check,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  CreditCard,
  AlertTriangle,
  CalendarPlus,
  Stethoscope,
  Building2,
  DollarSign,
  ArrowRight,
  ArrowLeft,
  Copy
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
  actionAprovarPagamentoAgendamento,
  actionRejeitarPagamentoAgendamento,
  actionCriarAgendamentoManualAdmin,
  fetchAdminCustomization,
  fetchAdminRegras,
  actionSalvarEnfermidadesPaciente,
  actionAdicionarObservacaoAgendamento,
  actionSalvarCatalogoEnfermidades,
  actionBuscarMensagensDoAgendamento,
  actionAtualizarMensagemFila,
  actionCancelarMensagemFila,
  actionCriarMensagemFilaAvulsa,
  actionDispararMensagemManualAdmin
} from "@/actions/adminData";
import { playDopamineSound, triggerHaptic } from "@/lib/dopamine";
import { formatarTelefoneEnvio, formatarTelefoneExibicao } from "@/lib/phoneUtils";

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

// Formatação amigável de data e hora ISO
const formatarDataHoraAmigavel = (isoString) => {
  if (!isoString) return "--/--/---- às --:--";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch (e) {
    return isoString;
  }
};

// Helpers de tempo para a Agenda Inteligente
const timeToMin = (tStr) => {
  if (!tStr) return 0;
  const parts = tStr.trim().split(":");
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || "0", 10);
};

const minToTime = (min) => {
  const h = Math.floor(min / 60)
    .toString()
    .padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
};

// Helper para identificação de modalidade particular (apenas particular requer pagamento manual)
const isItemParticular = (item) => {
  if (!item) return false;
  const mod = String(item.modalidade || item.convenio || "").toLowerCase().trim();
  if (mod.includes("conv") || mod.includes("plano") || mod.includes("retorno") || mod.includes("cortesia")) {
    return false;
  }
  return mod === "particular" || mod.includes("particular") || !mod;
};

// ==========================================
// APPLE HIG DESIGN HELPERS PARA CARDS E BADGES
// ==========================================
const renderStatusAtendimentoBadge = (item) => {
  const isCanceled = item.statusAtendimento === "cancelado";
  if (isCanceled) {
    return (
      <span className="text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 inline-flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        Cancelado
      </span>
    );
  }
  if (item.remarcado) {
    return (
      <span className="text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 inline-flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Reagendado
      </span>
    );
  }
  return (
    <span className="text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      Confirmado
    </span>
  );
};

const renderStatusPagamentoBadge = (item) => {
  if (item.tipo !== "rmclick") return null;
  if (isItemParticular(item)) {
    if (item.pago) {
      return (
        <span className="text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
          <CheckCircle2 size={12} strokeWidth={2} /> Pago
        </span>
      );
    }
    return (
      <span className="text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 inline-flex items-center gap-1">
        <Clock3 size={12} strokeWidth={2} /> Pendente
      </span>
    );
  }
  return (
    <span className="text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 inline-flex items-center gap-1">
      <CreditCard size={12} strokeWidth={2} /> {item.modalidade || "Convênio"}
    </span>
  );
};

const renderOrigemBadge = (item) => {
  if (item.tipo === "medicalsys") {
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20 inline-flex items-center gap-1">
        <Server size={10} /> MedicalSYS
      </span>
    );
  }
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-400 border border-black/[0.04] dark:border-white/[0.06] inline-flex items-center gap-1">
      RMAgenda
    </span>
  );
};

const renderAvatarMonograma = () => {
  return (
    <div className="w-10 h-10 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.08] flex items-center justify-center text-zinc-500 dark:text-zinc-400 shadow-2xs shrink-0 select-none">
      <User size={16} strokeWidth={1.8} />
    </div>
  );
};


const normalizeText = (t) =>
  String(t || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

// Helper para separar e estruturar observações importadas e manuais da clínica
const getIniciais = (nome) => {
  if (!nome) return "PA";
  const partes = String(nome).trim().split(" ").filter(Boolean);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
};

const extrairObservacoes = (item) => {
  if (!item) return { obsImportada: "", ehImportado: false, notasManuais: [] };

  const rawObs = String(
    item.rawItem?.observacoes ||
    item.observacoes ||
    item.rawItem?.observacao ||
    item.rawItem?.obs ||
    ""
  ).trim();

  const historico = Array.isArray(item.rawItem?.historico_observacoes)
    ? item.rawItem.historico_observacoes
    : [];

  const ehImportado =
    item.tipo === "medicalsys" ||
    Boolean(item.medicalsysId) ||
    Boolean(item.rawItem?.medicalsys_id) ||
    item.rawItem?.status === "importado";

  let obsImportada = "";
  const notasManuais = [...historico];

  if (rawObs) {
    const regexLinhas = /\[(\d{1,2}\/\d{1,2}\/\d{4}[^\]]*)\]:\s*([\s\S]*?)(?=(\[\d{1,2}\/\d{1,2}\/\d{4}|$))/g;
    let match;
    const extraidasDoTexto = [];

    while ((match = regexLinhas.exec(rawObs)) !== null) {
      const cabecalho = match[1] || "";
      const corpo = (match[2] || "").trim();
      const partes = cabecalho.split(" - ");
      const dataHora = partes[0]?.trim() || "";
      const autor = partes[1]?.trim() || "Equipe Clínica";

      if (corpo) {
        extraidasDoTexto.push({
          id: `texto_${dataHora}_${autor}_${extraidasDoTexto.length}`,
          texto: corpo,
          autor,
          data_hora_str: dataHora
        });
      }
    }

    if (extraidasDoTexto.length > 0) {
      obsImportada = rawObs.split(/\[\d{1,2}\/\d{1,2}\/\d{4}/)[0]?.trim();
      if (notasManuais.length === 0) {
        extraidasDoTexto.forEach((n) => notasManuais.push(n));
      }
    } else {
      obsImportada = rawObs;
    }
  }

  return {
    obsImportada,
    ehImportado,
    notasManuais
  };
};

export default function AgendaView({
  subTab = "calendario",
  setSubTab,
  agendamentos = [],
  bloqueios = [],
  servicos = [],
  fetchAgendamentos,
  fetchBloqueios,
  showToast,
  permissoes = [],
  isOwner = false,
  loggedAdmin = null
}) {
  const currentSubTab = subTab === "lista" ? "lista" : "calendario";
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== "undefined") {
      const saved =
        localStorage.getItem("rmcare_default_view_mode") ||
        localStorage.getItem("rmcare_view_mode");
      if (saved === "lista" || saved === "tabela") return "tabela";
      if (saved === "cards") return "cards";
    }
    return "cards";
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [novaObsTexto, setNovaObsTexto] = useState("");
  const [isSavingObs, setIsSavingObs] = useState(false);
  const [copiedCpf, setCopiedCpf] = useState(false);

  const handleCopyCpf = (cpf) => {
    if (!cpf) return;
    navigator.clipboard.writeText(cpf);
    setCopiedCpf(true);
    playDopamineSound("click");
    setTimeout(() => setCopiedCpf(false), 2000);
  };

  useEffect(() => {
    setMounted(true);
    setLastSyncedAt(new Date());
    if (agendamentos.length > 0 || bloqueios.length > 0) {
      setIsLoadingData(false);
    } else {
      const timer = setTimeout(() => setIsLoadingData(false), 800);
      return () => clearTimeout(timer);
    }
  }, [agendamentos, bloqueios]);

  useEffect(() => {
    const handleModeChange = (e) => {
      const mode =
        e?.detail ||
        localStorage.getItem("rmcare_default_view_mode") ||
        localStorage.getItem("rmcare_view_mode");
      if (mode === "lista" || mode === "tabela") {
        setViewMode("tabela");
      } else if (mode === "cards") {
        setViewMode("cards");
      }
    };
    window.addEventListener("rmcare_view_mode_changed", handleModeChange);
    return () => window.removeEventListener("rmcare_view_mode_changed", handleModeChange);
  }, []);

  // Sincronizador Automático de 1 minuto (60s) para manter os dados atualizados em tempo real
  useEffect(() => {
    const autoSyncInterval = setInterval(async () => {
      try {
        if (fetchAgendamentos) await fetchAgendamentos();
        if (fetchBloqueios) await fetchBloqueios();
        setLastSyncedAt(new Date());
      } catch (e) {
        console.warn("Falha silenciosa no auto-sync da agenda:", e);
      }
    }, 60000);

    return () => clearInterval(autoSyncInterval);
  }, [fetchAgendamentos, fetchBloqueios]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    playDopamineSound("click");
    triggerHaptic("light");
    try {
      if (fetchAgendamentos) await fetchAgendamentos();
      if (fetchBloqueios) await fetchBloqueios();
      setLastSyncedAt(new Date());
      if (showToast) showToast("Dados da agenda atualizados do banco com sucesso!");
    } catch (err) {
      if (showToast) showToast("Erro ao sincronizar dados com o banco.", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Verificação estrita de permissão para Ficha Clínica e Dados Sigilosos
  const temPermissaoSigiloClinico = useMemo(() => {
    if (isOwner) return true;
    const perms = Array.isArray(permissoes) ? permissoes : [];
    return perms.includes("sigilo_clinico") || perms.includes("dados_sensiveis");
  }, [isOwner, permissoes]);

  const [searchTerm, setSearchTerm] = useState("");
  const [origemFilter, setOrigemFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [modalidadeFilter, setModalidadeFilter] = useState("todas");
  const [pagamentoFilter, setPagamentoFilter] = useState("todos");
  const [filterMedico, setFilterMedico] = useState("Todos");

  // Ordenação de colunas da tabela e cards de pacientes
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(getHojeLocal());

  // Regras de Agenda da Empresa
  const [regrasAgenda, setRegrasAgenda] = useState([]);
  const [empresaConfig, setEmpresaConfig] = useState(null);

  // Modais de Ações
  const [confirmApproveModalItem, setConfirmApproveModalItem] = useState(null);
  const [rejectModalItem, setRejectModalItem] = useState(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState("");
  const [mensagemCustomRejeicao, setMensagemCustomRejeicao] = useState("");
  const [enviarMensagemRejeicao, setEnviarMensagemRejeicao] = useState(true);
  const [isRejecting, setIsRejecting] = useState(false);
  const [cancelModalItem, setCancelModalItem] = useState(null);
  const [cancelReason, setReason] = useState("");
  const [mensagemCustomCancel, setMensagemCustomCancel] = useState("");
  const [enviarMensagemCancel, setEnviarMensagemCancel] = useState(true);
  const [confirmarCancelamentoStep, setConfirmarCancelamentoStep] = useState(false);

  // Modal Inteligente de Remarcação (com Calendário e Horários em Tempo Real)
  const [rescheduleModalItem, setRescheduleModalItem] = useState(null);
  const [rescheduleMonth, setRescheduleMonth] = useState(new Date());
  const [rescheduleSelectedDate, setRescheduleSelectedDate] = useState("");
  const [rescheduleSelectedTime, setRescheduleSelectedTime] = useState("");

  // Modal de Novo Agendamento Interno (com Calendário e Horários em Tempo Real)
  const [isNovoAgendamentoOpen, setIsNovoAgendamentoOpen] = useState(false);
  const [novoAgendMonth, setNovoAgendMonth] = useState(new Date());
  const [novoAgendForm, setNovoAgendForm] = useState({
    cpf: "",
    nome: "",
    telefone: "",
    email: "",
    data_nascimento: "",
    tipo_servico: "Consulta",
    especialidade: "",
    medico_profissional: "",
    subtipo_exame: "",
    modalidade: "Particular",
    convenio_nome: "",
    data_agendamento: "",
    horario_agendamento: "",
    observacoes: ""
  });
  const [cpfAutofillFound, setCpfAutofillFound] = useState(false);

  // Modal de Dados Sensíveis, Enfermidades & Mensagens da Fila
  const [sensitiveModalItem, setSensitiveModalItem] = useState(null);
  const [fichaSubTab, setFichaSubTab] = useState("dados"); // "dados" | "mensagens"
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
  const [approvingPaymentId, setApprovingPaymentId] = useState(null);

  // Estados da Fila de Mensagens do Agendamento / Exame
  const [mensagensAgendamento, setMensagensAgendamento] = useState([]);
  const [loadingMensagens, setLoadingMensagens] = useState(false);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editMsgTexto, setEditMsgTexto] = useState("");
  const [editMsgDataHora, setEditMsgDataHora] = useState("");
  const [editMsgAnexoUrl, setEditMsgAnexoUrl] = useState("");
  const [isCriandoMensagem, setIsCriandoMensagem] = useState(false);
  const [novaMsgTexto, setNovaMsgTexto] = useState("");
  const [novaMsgDataHora, setNovaMsgDataHora] = useState("");
  const [novaMsgAnexoUrl, setNovaMsgAnexoUrl] = useState("");
  const [disparandoMsgId, setDisparandoMsgId] = useState(null);

  // Carregar regras e configurações da clínica
  useEffect(() => {
    const carregarConfigGeral = async () => {
      try {
        const [emp, regras] = await Promise.all([
          fetchAdminCustomization(),
          fetchAdminRegras()
        ]);
        if (emp) {
          setEmpresaConfig(emp);
          if (emp.config_campos?.catalogo_enfermidades) {
            setCatalogoEnfermidades(emp.config_campos.catalogo_enfermidades);
          }
        }
        if (Array.isArray(regras)) {
          setRegrasAgenda(regras);
        }
      } catch (e) {
        console.error("Erro ao carregar configurações da agenda:", e);
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
    const defaultOption = { value: "Todos", label: "Todos os Profissionais / Exames" };
    if (!servicos || servicos.length === 0) return [defaultOption];

    const options = servicos
      .filter((s) => s.ativo !== false)
      .map((s) => ({
        value: s.nome,
        label: s.nome
      }));

    return [defaultOption, ...options];
  }, [servicos]);

  const especialidadesOptions = useMemo(() => {
    const defaultOption = { value: "", label: "Selecione uma especialidade..." };
    const confCats = empresaConfig?.config_campos?.especialidades_categorizadas || [];
    const fromConf = confCats.map((c) => c.nome).filter(Boolean);
    const fromSrv = (servicos || [])
      .flatMap((s) => (s.especialidade ? s.especialidade.split(",").map((e) => e.trim()) : []))
      .filter(Boolean);

    const todas = [...new Set([...fromConf, ...fromSrv])].filter(Boolean).sort();
    return [
      defaultOption,
      ...todas.map((e) => ({
        value: e,
        label: e
      }))
    ];
  }, [empresaConfig, servicos]);

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

  // Resolução Semântica Limpa: Especialista vs Especialidade vs Categoria
  const listaUnificadaTodosPacientes = useMemo(() => {
    const locais = agendamentos.map((a) => {
      const pac = a.pacientes || {};
      const enfermidadesList = Array.isArray(pac.enfermidades)
        ? pac.enfermidades
        : Array.isArray(a.enfermidades)
        ? a.enfermidades
        : [];

      let profLimpo = a.medico_profissional;
      let espLimpa = a.especialidade;
      let subLimpo = a.subtipo_exame;
      let tipoServ = a.tipo_servico || "Consulta";

      const isProfNomeExame =
        profLimpo &&
        /(endoscopia|colonoscopia|ultrassom|tomografia|ressonancia|raio-x|biopsia|exame)/i.test(
          profLimpo
        );

      if (isProfNomeExame) {
        if (!subLimpo) subLimpo = profLimpo;
        if (!espLimpa || espLimpa === "Consulta" || espLimpa === "Exame") espLimpa = profLimpo;
        profLimpo = "Corpo Clínico";
        tipoServ = "Exame";
      }

      if (!espLimpa || espLimpa === "Consulta" || espLimpa === "Exame") {
        if (subLimpo) espLimpa = subLimpo;
        else if (profLimpo && profLimpo !== "Corpo Clínico") {
          const srv = servicos.find((s) => s.nome === profLimpo);
          if (srv?.especialidade) espLimpa = srv.especialidade.split(",")[0].trim();
        }
      }

      if (!espLimpa) espLimpa = tipoServ === "Exame" ? "Exame Clínico" : "Clínica Geral";

      return {
        id: a.id,
        pacienteId: a.paciente_id || pac.id,
        tipo: "rmclick",
        data: a.data_agendamento,
        horario: a.horario_agendamento?.substring(0, 5),
        nomePaciente: (pac.nome_completo || a.nome_paciente || pac.nome || a.nome || "Paciente RMAgenda").trim(),
        cpfPaciente: pac.cpf || null,
        telefonePaciente: pac.telefone_whatsapp || null,
        emailPaciente: pac.email || null,
        dataNascimento: pac.data_nascimento || null,
        enfermidades: enfermidadesList,
        medicoProfissional: profLimpo || "Corpo Clínico",
        especialidade: espLimpa,
        subtipoExame: subLimpo || null,
        tipoServico: tipoServ,
        modalidade: a.modalidade || "Particular",
        convenio: a.modalidade === "Convênio" ? "Convênio" : null,
        statusAtendimento: a.status_atendimento || "agendado",
        pago: Boolean(a.status_pagamento_antecipado),
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
        nomePaciente: (b.nome_paciente || b.paciente_nome || b.nome || "Paciente ERP").trim(),
        cpfPaciente: b.cpf_paciente || null,
        telefonePaciente: b.telefone_paciente || null,
        emailPaciente: null,
        dataNascimento: null,
        enfermidades: [],
        medicoProfissional: b.medico_profissional || "ERP Medicalsys",
        especialidade: b.especialidade || "Geral",
        subtipoExame: null,
        tipoServico: "Consulta",
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
        if (modalidadeFilter === "todas") return true;
        if (modalidadeFilter === "particular") return isItemParticular(item);
        if (modalidadeFilter === "convenio") return !isItemParticular(item);
        return true;
      })
      .filter((item) => {
        if (pagamentoFilter === "todos") return true;
        if (pagamentoFilter === "pago") return item.pago === true;
        if (pagamentoFilter === "pendente")
          return (
            item.pago === false &&
            isItemParticular(item) &&
            item.tipo === "rmclick" &&
            item.statusAtendimento !== "cancelado"
          );
        return true;
      })
      .filter((item) => {
        if (filterMedico === "Todos") return true;
        return (
          item.medicoProfissional === filterMedico ||
          item.especialidade === filterMedico ||
          item.subtipoExame === filterMedico
        );
      })
      .filter((item) =>
        matchesSearch(item.nomePaciente, item.cpfPaciente, item.telefonePaciente)
      );

        if (sortConfig.key) {
      result.sort((a, b) => {
        let valA = "";
        let valB = "";

        if (sortConfig.key === "horario") {
          valA = a.horario || "";
          valB = b.horario || "";
          const cmp = valA.localeCompare(valB);
          if (cmp !== 0) return sortConfig.direction === "asc" ? cmp : -cmp;
          return normalizeText(a.nomePaciente).localeCompare(normalizeText(b.nomePaciente), "pt-BR");
        } else if (sortConfig.key === "paciente") {
          valA = a.nomePaciente || "";
          valB = b.nomePaciente || "";
          const cmp = normalizeText(valA).localeCompare(normalizeText(valB), "pt-BR");
          if (cmp !== 0) return sortConfig.direction === "asc" ? cmp : -cmp;
          return (a.horario || "").localeCompare(b.horario || "");
        } else if (sortConfig.key === "data") {
          valA = a.data || "";
          valB = b.data || "";
          const cmp = valA.localeCompare(valB);
          if (cmp !== 0) return sortConfig.direction === "asc" ? cmp : -cmp;
          return (a.horario || "").localeCompare(b.horario || "");
        } else if (sortConfig.key === "origem") {
          valA = a.tipo || "";
          valB = b.tipo || "";
        } else if (sortConfig.key === "especialista") {
          valA = a.medicoProfissional || "";
          valB = b.medicoProfissional || "";
          const cmp = normalizeText(valA).localeCompare(normalizeText(valB), "pt-BR");
          if (cmp !== 0) return sortConfig.direction === "asc" ? cmp : -cmp;
          return (a.horario || "").localeCompare(b.horario || "");
        } else if (sortConfig.key === "status") {
          valA = a.statusAtendimento || "";
          valB = b.statusAtendimento || "";
        } else if (sortConfig.key === "pagamento") {
          valA = isItemParticular(a) ? (a.pago ? "pago" : "pendente") : (a.modalidade || "convenio");
          valB = isItemParticular(b) ? (b.pago ? "pago" : "pendente") : (b.modalidade || "convenio");
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
  }, [
    agendamentos,
    bloqueios,
    statusFilter,
    origemFilter,
    modalidadeFilter,
    pagamentoFilter,
    filterMedico,
    searchTerm,
    sortConfig,
    servicos
  ]);

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key) {
      direction = sortConfig.direction === "asc" ? "desc" : "asc";
    }
    setSortConfig({ key, direction });
    playDopamineSound("click");
    triggerHaptic("light");
  };

  // Respeita fielmente a ordenação escolhida pelo usuário em "Pacientes do Dia" (ou padrão horário)
  const eventosAgendaMistaDiaria = useMemo(() => {
    const doDia = listaUnificadaTodosPacientes.filter((item) => item.data === selectedDay);
    return [...doDia].sort((a, b) => {
      if (sortConfig.key === "paciente") {
        const cmp = normalizeText(a.nomePaciente).localeCompare(normalizeText(b.nomePaciente), "pt-BR");
        if (cmp !== 0) return sortConfig.direction === "asc" ? cmp : -cmp;
        return (a.horario || "").localeCompare(b.horario || "");
      } else if (sortConfig.key === "horario") {
        const cmp = (a.horario || "").localeCompare(b.horario || "");
        if (cmp !== 0) return sortConfig.direction === "asc" ? cmp : -cmp;
        return normalizeText(a.nomePaciente).localeCompare(normalizeText(b.nomePaciente), "pt-BR");
      } else if (sortConfig.key === "especialista") {
        const cmp = normalizeText(a.medicoProfissional).localeCompare(normalizeText(b.medicoProfissional), "pt-BR");
        if (cmp !== 0) return sortConfig.direction === "asc" ? cmp : -cmp;
        return (a.horario || "").localeCompare(b.horario || "");
      } else if (sortConfig.key === "status") {
        const cmp = String(a.statusAtendimento || "").localeCompare(String(b.statusAtendimento || ""), "pt-BR");
        if (cmp !== 0) return sortConfig.direction === "asc" ? cmp : -cmp;
        return (a.horario || "").localeCompare(b.horario || "");
      } else if (sortConfig.key === "pagamento") {
        const valA = isItemParticular(a) ? (a.pago ? "pago" : "pendente") : (a.modalidade || "convenio");
        const valB = isItemParticular(b) ? (b.pago ? "pago" : "pendente") : (b.modalidade || "convenio");
        const cmp = String(valA).localeCompare(String(valB), "pt-BR");
        if (cmp !== 0) return sortConfig.direction === "asc" ? cmp : -cmp;
        return (a.horario || "").localeCompare(b.horario || "");
      }
      return (a.horario || "").localeCompare(b.horario || "");
    });
  }, [listaUnificadaTodosPacientes, selectedDay, sortConfig]);

  // MOTOR UNIVERSAL DE CÁLCULO DE VAGAS E HORÁRIOS DISPONÍVEIS
  const calcularSlotsDisponiveis = ({
    targetDate,
    targetMedico,
    targetEspecialidade,
    targetTipoServico,
    targetModalidade,
    excludeId = null
  }) => {
    if (!targetDate) return { isEnabled: false, slots: [] };

    const [y, m, d] = targetDate.split("-").map(Number);
    const diaWeek = new Date(y, m - 1, d).getDay();

    const srvAlvo = (servicos || []).find((s) => {
      if (s.ativo === false) return false;
      const cleanSrv = normalizeText(s.nome);
      const cleanTarget = normalizeText(targetMedico);
      return cleanSrv === cleanTarget || (cleanTarget && cleanSrv.includes(cleanTarget));
    });

    const espStr = normalizeText(targetEspecialidade);
    const tipoStr = normalizeText(targetTipoServico || "Consulta");
    const modStr = normalizeText(targetModalidade || "Particular");

    // Validação de regras ativas
    const isRuleValid = (r) => {
      if (!r.tipos_permitidos || !Array.isArray(r.tipos_permitidos) || r.tipos_permitidos.length === 0)
        return true;
      const permitidos = r.tipos_permitidos.map(normalizeText).filter(Boolean);
      if (permitidos.includes("todos") || permitidos.includes("todas")) return true;

      const tipoRestr = permitidos.filter((p) => ["consulta", "exame", "retorno"].includes(p));
      if (tipoRestr.length > 0 && !tipoRestr.includes(tipoStr)) return false;

      const modRestr = permitidos.filter((p) => ["particular", "convenio"].includes(p));
      if (modRestr.length > 0) {
        const isConv = modStr === "convenio" || modStr.includes("conv");
        if (isConv && !modRestr.includes("convenio")) return false;
        if (!isConv && !modRestr.includes("particular")) return false;
      }
      return true;
    };

    const rMedico = (regrasAgenda || []).filter(
      (r) => r.servico_id && r.servico_id === srvAlvo?.id && r.ativo !== false && isRuleValid(r)
    );

    const rEspecialidade = (regrasAgenda || []).filter((r) => {
      if (r.servico_id || r.ativo === false || !isRuleValid(r)) return false;
      const permitidos = (r.tipos_permitidos || []).map(normalizeText);
      const rEsp = normalizeText(r.especialidade);
      return (
        espStr &&
        (permitidos.some((p) => p === espStr || p.includes(espStr) || espStr.includes(p)) ||
          rEsp === espStr ||
          rEsp.includes(espStr) ||
          espStr.includes(rEsp))
      );
    });

    const rGeral = (regrasAgenda || []).filter((r) => {
      if (r.servico_id || r.ativo === false) return false;
      if (r.especialidade && r.especialidade !== "Todas") return false;
      return isRuleValid(r);
    });

    // Interseção estrita de dia
    const medicoRulesToday = rMedico.filter((r) =>
      (r.dias_semana || []).map((d) => parseInt(d, 10)).includes(diaWeek)
    );
    const espRulesToday = rEspecialidade.filter((r) =>
      (r.dias_semana || []).map((d) => parseInt(d, 10)).includes(diaWeek)
    );
    const geralRulesToday = rGeral.filter((r) =>
      (r.dias_semana || []).map((d) => parseInt(d, 10)).includes(diaWeek)
    );

    let isDiaValido = false;
    if (rMedico.length > 0 && rEspecialidade.length > 0) {
      if (medicoRulesToday.length > 0 && espRulesToday.length > 0) isDiaValido = true;
    } else if (rMedico.length > 0) {
      isDiaValido = medicoRulesToday.length > 0;
    } else if (rEspecialidade.length > 0) {
      isDiaValido = espRulesToday.length > 0;
    } else if (rGeral.length > 0) {
      isDiaValido = geralRulesToday.length > 0;
    } else {
      isDiaValido = [1, 2, 3, 4, 5].includes(diaWeek); // Seg a Sex padrão
    }

    if (!isDiaValido) return { isEnabled: false, slots: [] };

    // Montar janelas e intervalos ocupados
    const janelas = [];
    if (rMedico.length > 0 && rEspecialidade.length > 0) {
      medicoRulesToday.forEach((dr) => {
        espRulesToday.forEach((sr) => {
          const sMin = Math.max(timeToMin(dr.hora_inicio), timeToMin(sr.hora_inicio));
          const eMin = Math.min(timeToMin(dr.hora_fim), timeToMin(sr.hora_fim));
          if (sMin < eMin) {
            const drLast = dr.ultimo_horario_agendamento
              ? timeToMin(dr.ultimo_horario_agendamento)
              : null;
            const srLast = sr.ultimo_horario_agendamento
              ? timeToMin(sr.ultimo_horario_agendamento)
              : null;
            let effLast = null;
            if (drLast !== null && srLast !== null) effLast = Math.min(drLast, srLast);
            else if (srLast !== null) effLast = srLast;
            else if (drLast !== null) effLast = drLast;

            const durSlot =
              sr.duracao_slot_minutos > 0
                ? sr.duracao_slot_minutos
                : dr.duracao_slot_minutos > 0
                ? dr.duracao_slot_minutos
                : 30;

            janelas.push({
              startStr: minToTime(sMin),
              endStr: minToTime(eMin),
              duracao: durSlot,
              ultimoHorario: effLast ? minToTime(effLast) : null,
              ocupacaoSequencial: Boolean(dr.ocupacao_sequencial || sr.ocupacao_sequencial)
            });
          }
        });
      });
    } else if (rMedico.length > 0) {
      medicoRulesToday.forEach((dr) => {
        janelas.push({
          startStr: dr.hora_inicio,
          endStr: dr.hora_fim,
          duracao: dr.duracao_slot_minutos > 0 ? dr.duracao_slot_minutos : 30,
          ultimoHorario: dr.ultimo_horario_agendamento || null,
          ocupacaoSequencial: Boolean(dr.ocupacao_sequencial)
        });
      });
    } else if (rEspecialidade.length > 0) {
      espRulesToday.forEach((sr) => {
        janelas.push({
          startStr: sr.hora_inicio,
          endStr: sr.hora_fim,
          duracao: sr.duracao_slot_minutos > 0 ? sr.duracao_slot_minutos : 30,
          ultimoHorario: sr.ultimo_horario_agendamento || null,
          ocupacaoSequencial: Boolean(sr.ocupacao_sequencial)
        });
      });
    } else if (geralRulesToday.length > 0) {
      geralRulesToday.forEach((gr) => {
        janelas.push({
          startStr: gr.hora_inicio,
          endStr: gr.hora_fim,
          duracao: gr.duracao_slot_minutos > 0 ? gr.duracao_slot_minutos : 30,
          ultimoHorario: gr.ultimo_horario_agendamento || null,
          ocupacaoSequencial: Boolean(gr.ocupacao_sequencial)
        });
      });
    } else {
      janelas.push(
        { startStr: "08:00", endStr: "12:00", duracao: 30, ultimoHorario: null, ocupacaoSequencial: false },
        { startStr: "14:00", endStr: "18:00", duracao: 30, ultimoHorario: null, ocupacaoSequencial: false }
      );
    }

    // Identificar intervalos ocupados na data
    const intervals = [];
    const profTargetNorm = normalizeText(targetMedico);
    const espTargetNorm = normalizeText(targetEspecialidade);

    (agendamentos || []).forEach((a) => {
      if (a.data_agendamento !== targetDate || a.status_atendimento === "cancelado") return;
      if (excludeId && (a.id === excludeId || a.agendamento_id === excludeId)) return;

      const aProf = normalizeText(a.medico_profissional);
      const aEsp = normalizeText(a.especialidade);
      const aSub = normalizeText(a.subtipo_exame);

      const matchProf = profTargetNorm && (aProf.includes(profTargetNorm) || profTargetNorm.includes(aProf));
      const matchEsp = espTargetNorm && (aEsp === espTargetNorm || aSub === espTargetNorm);

      if (matchProf || matchEsp || !profTargetNorm) {
        const startMin = timeToMin(a.horario_agendamento);
        const dur = 30;
        intervals.push({ startMin, endMin: startMin + dur, hora: a.horario_agendamento?.substring(0, 5) });
      }
    });

    (bloqueios || []).forEach((b) => {
      if (b.data !== targetDate) return;
      const bProf = normalizeText(b.medico_profissional);
      const bEsp = normalizeText(b.especialidade);

      const matchProf =
        !b.medico_profissional ||
        b.medico_profissional === "Todos" ||
        (profTargetNorm && (bProf.includes(profTargetNorm) || profTargetNorm.includes(bProf)));
      const matchEsp = !b.especialidade || (espTargetNorm && bEsp === espTargetNorm);

      if (matchProf || matchEsp) {
        const startMin = timeToMin(b.horario);
        intervals.push({ startMin, endMin: startMin + 30, hora: b.horario?.substring(0, 5) });
      }
    });

    // Gerar slots para cada janela
    const slotsMap = new Map();
    let isSeqAtiva = false;

    janelas.forEach((j) => {
      if (j.ocupacaoSequencial) isSeqAtiva = true;
      const startMin = timeToMin(j.startStr);
      const endMin = timeToMin(j.endStr);
      const dur = j.duracao;
      let lastAllowed = endMin - dur;
      if (j.ultimoHorario) {
        const customLast = timeToMin(j.ultimoHorario);
        if (customLast > 0) lastAllowed = Math.min(lastAllowed, customLast);
      }

      for (let m = startMin; m <= lastAllowed; m += dur) {
        const hStr = minToTime(m);
        const hasCollision = intervals.some((iv) => Math.max(m, iv.startMin) < Math.min(m + dur, iv.endMin));

        if (!slotsMap.has(hStr) || (slotsMap.get(hStr).isOccupied && !hasCollision)) {
          slotsMap.set(hStr, { h: hStr, isOccupied: hasCollision });
        }
      }
    });

    const sortedSlots = Array.from(slotsMap.values()).sort((a, b) => a.h.localeCompare(b.h));
    const hojeStr = getHojeLocal();
    const agoraMin = new Date().getHours() * 60 + new Date().getMinutes();

    let encontrouPrimeiroLivre = false;
    const finalSlots = sortedSlots.map(({ h, isOccupied }) => {
      const isPast = targetDate === hojeStr && timeToMin(h) <= agoraMin + 30;
      let off = isPast || isOccupied;

      if (isSeqAtiva && !off) {
        if (encontrouPrimeiroLivre) off = true;
        else encontrouPrimeiroLivre = true;
      }
      return { h, off, isOccupied };
    });

    return { isEnabled: finalSlots.some((s) => !s.off), slots: finalSlots };
  };

  // APROVAR PAGAMENTO MANUAL
  const handleAbrirRejeicaoPagamento = (item) => {
    playDopamineSound("click");
    setRejectModalItem(item.rawItem || item);
    setMotivoRejeicao("Comprovante de pagamento não aprovado ou inválido");
    setMensagemCustomRejeicao("");
    setEnviarMensagemRejeicao(true);
    setConfirmApproveModalItem(null);
  };

  const handleConfirmarRejeicaoPagamento = async () => {
    if (!rejectModalItem) return;
    setIsRejecting(true);
    playDopamineSound("select");
    triggerHaptic("medium");

    try {
      const motivoFinal = motivoRejeicao?.trim() || "Comprovante de pagamento não aprovado ou inválido";
      const msgCustom = enviarMensagemRejeicao ? (mensagemCustomRejeicao?.trim() || null) : null;
      const res = await actionRejeitarPagamentoAgendamento(rejectModalItem.id, motivoFinal, msgCustom);
      if (res && res.success === false) {
        throw new Error(res.error || "Falha ao rejeitar pagamento.");
      }
      if (showToast) showToast("Pagamento rejeitado e horário liberado com sucesso!");
      if (fetchAgendamentos) await fetchAgendamentos();
      setRejectModalItem(null);
      setMotivoRejeicao("");
      setMensagemCustomRejeicao("");
    } catch (err) {
      console.error("Erro ao rejeitar pagamento:", err);
      if (showToast) showToast(err.message || "Erro ao rejeitar pagamento.", "error");
    } finally {
      setIsRejecting(false);
    }
  };

  const handleAdicionarObservacao = async () => {
    if (!sensitiveModalItem || !novaObsTexto.trim()) return;
    setIsSavingObs(true);
    playDopamineSound("select");
    triggerHaptic("medium");

    try {
      const agId = sensitiveModalItem.id;
      const pacId = sensitiveModalItem.pacienteId;
      const autorNome = loggedAdmin?.nome || loggedAdmin?.usuario || loggedAdmin?.email || "Atendente";
      const textoSalvo = novaObsTexto.trim();

      const res = await actionAdicionarObservacaoAgendamento({
        agendamentoId: agId,
        pacienteId: pacId,
        texto: textoSalvo,
        autor: autorNome
      });

      if (res && res.success) {
        if (showToast) showToast("Observação adicionada com sucesso!");
        setNovaObsTexto("");
        if (fetchAgendamentos) await fetchAgendamentos();
        if (fetchBloqueios) await fetchBloqueios();

        const notaCriada = res.novaNota || {
          id: `nota_${Date.now()}`,
          texto: textoSalvo,
          autor: autorNome,
          data_hora: new Date().toISOString()
        };

        setSensitiveModalItem((prev) => {
          if (!prev) return prev;
          const currentHistorico = Array.isArray(prev.rawItem?.historico_observacoes)
            ? prev.rawItem.historico_observacoes
            : [];
          const newHistorico = [notaCriada, ...currentHistorico];
          const currentObs = prev.rawItem?.observacoes || prev.observacoes || "";
          const newObs = currentObs
            ? `${currentObs}\n\n[${new Date().toLocaleString("pt-BR")} - ${autorNome}]: ${textoSalvo}`
            : `[${new Date().toLocaleString("pt-BR")} - ${autorNome}]: ${textoSalvo}`;

          return {
            ...prev,
            observacoes: newObs,
            rawItem: {
              ...prev.rawItem,
              observacoes: newObs,
              historico_observacoes: newHistorico
            }
          };
        });
      }
    } catch (err) {
      console.error("Erro ao salvar observação:", err);
      if (showToast) showToast(err.message || "Erro ao adicionar observação.", "error");
    } finally {
      setIsSavingObs(false);
    }
  };

  const handleAprovarPagamento = async (item) => {
    if (!item?.id) return;
    setApprovingPaymentId(item.id);
    playDopamineSound("select");
    triggerHaptic("success");

    try {
      const res = await actionAprovarPagamentoAgendamento(item.id);
      if (res?.success) {
        if (showToast) showToast("Pagamento aprovado com sucesso! Confirmação enviada.");
        if (fetchAgendamentos) await fetchAgendamentos();
      } else {
        if (showToast) showToast(res?.error || "Erro ao aprovar pagamento.", "error");
      }
    } catch (e) {
      if (showToast) showToast(`Erro: ${e.message}`, "error");
    } finally {
      setApprovingPaymentId(null);
    }
  };

  // CANCELAR AGENDAMENTO COM SEGURANÇA E MOTIVO PADRÃO PROFISSIONAL
  const handleAbrirModalCancelamento = (item) => {
    playDopamineSound("click");
    setCancelModalItem(item.rawItem || item);
    setReason("");
    setConfirmarCancelamentoStep(false);
  };

  const handleCancelarAdmin = async () => {
    if (!cancelModalItem) return;
    setIsProcessing(true);
    playDopamineSound("click");
    try {
      const motivoFinal =
        cancelReason.trim() ||
        "Readequação operacional da grade de atendimentos da clínica";

      const msgCustom = enviarMensagemCancel ? (mensagemCustomCancel?.trim() || null) : null;
      await actionCancelarAgendamentoAdmin(cancelModalItem.id, motivoFinal, msgCustom);
      if (showToast) showToast("Agendamento cancelado. Horário liberado na agenda!");
      if (fetchAgendamentos) await fetchAgendamentos();
      setCancelModalItem(null);
      setReason("");
      setConfirmarCancelamentoStep(false);
    } catch (err) {
      if (showToast) showToast(`Erro ao cancelar: ${err.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // REMARCAÇÃO INTELIGENTE (CALENDÁRIO & HORÁRIOS INTERATIVOS)
  const handleAbrirRemarcacao = (item) => {
    playDopamineSound("click");
    triggerHaptic("light");
    const target = item.rawItem || item;
    setRescheduleModalItem(target);

    const initialDate = target.data_agendamento || target.data || selectedDay;
    setRescheduleSelectedDate(initialDate);
    setRescheduleSelectedTime(target.horario_agendamento?.substring(0, 5) || target.horario || "");
    if (initialDate) {
      const [y, m] = initialDate.split("-").map(Number);
      setRescheduleMonth(new Date(y, m - 1, 1));
    }
  };

  const slotsRemarcacao = useMemo(() => {
    if (!rescheduleModalItem || !rescheduleSelectedDate) return { isEnabled: false, slots: [] };
    return calcularSlotsDisponiveis({
      targetDate: rescheduleSelectedDate,
      targetMedico: rescheduleModalItem.medico_profissional || rescheduleModalItem.medicoProfissional,
      targetEspecialidade: rescheduleModalItem.especialidade,
      targetTipoServico: rescheduleModalItem.tipo_servico || rescheduleModalItem.tipoServico,
      targetModalidade: rescheduleModalItem.modalidade,
      excludeId: rescheduleModalItem.id
    });
  }, [rescheduleModalItem, rescheduleSelectedDate, regrasAgenda, agendamentos, bloqueios]);

  const handleConfirmarRemarcacao = async () => {
    if (!rescheduleModalItem || !rescheduleSelectedDate || !rescheduleSelectedTime) {
      if (showToast) showToast("Selecione uma nova data e um novo horário disponível.", "error");
      return;
    }
    setIsProcessing(true);
    playDopamineSound("select");
    triggerHaptic("success");
    try {
      await actionRemarcarAgendamentoAdmin(
        rescheduleModalItem.id,
        rescheduleSelectedDate,
        rescheduleSelectedTime
      );
      if (showToast) showToast("Agendamento remarcado com sucesso! Notificação enviada ao paciente.");
      if (fetchAgendamentos) await fetchAgendamentos();
      setRescheduleModalItem(null);
    } catch (err) {
      if (showToast) showToast(`Erro ao remarcar: ${err.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // NOVO AGENDAMENTO INTERNO (PELO ADMINISTRADOR / RECEPÇÃO)
  const handleAbrirNovoAgendamento = () => {
    playDopamineSound("click");
    triggerHaptic("medium");
    setNovoAgendForm({
      cpf: "",
      nome: "",
      telefone: "",
      email: "",
      data_nascimento: "",
      tipo_servico: "Consulta",
      especialidade: especialidadesOptions[1]?.value || "",
      medico_profissional: "",
      subtipo_exame: "",
      modalidade: "Particular",
      convenio_nome: "",
      data_agendamento: selectedDay || getHojeLocal(),
      horario_agendamento: "",
      observacoes: ""
    });
    setCpfAutofillFound(false);
    setNovoAgendMonth(new Date());
    setIsNovoAgendamentoOpen(true);
  };

  // Auto-lookup de CPF para Novo Agendamento Interno
  const handleLookupCpfInterno = (cpfDigitado) => {
    const limpo = cpfDigitado.replace(/\D/g, "");
    if (limpo.length === 11) {
      const matchLocal = agendamentos.find((a) => {
        const pac = a.pacientes || {};
        return (pac.cpf || "").replace(/\D/g, "") === limpo;
      });
      if (matchLocal?.pacientes) {
        const p = matchLocal.pacientes;
        setNovoAgendForm((prev) => ({
          ...prev,
          nome: p.nome_completo || prev.nome,
          telefone: p.telefone_whatsapp || prev.telefone,
          email: p.email || prev.email,
          data_nascimento: p.data_nascimento || prev.data_nascimento
        }));
        setCpfAutofillFound(true);
        playDopamineSound("unlock");
        if (showToast) showToast("Paciente identificado no banco da clínica!");
      }
    }
  };

  const slotsNovoAgendamento = useMemo(() => {
    if (!isNovoAgendamentoOpen || !novoAgendForm.data_agendamento)
      return { isEnabled: false, slots: [] };
    return calcularSlotsDisponiveis({
      targetDate: novoAgendForm.data_agendamento,
      targetMedico: novoAgendForm.medico_profissional,
      targetEspecialidade: novoAgendForm.especialidade,
      targetTipoServico: novoAgendForm.tipo_servico,
      targetModalidade: novoAgendForm.modalidade
    });
  }, [isNovoAgendamentoOpen, novoAgendForm, regrasAgenda, agendamentos, bloqueios]);

  const handleSalvarNovoAgendamentoInterno = async () => {
    if (
      !novoAgendForm.nome?.trim() ||
      !novoAgendForm.data_agendamento ||
      !novoAgendForm.horario_agendamento
    ) {
      if (showToast) showToast("Preencha o nome do paciente, data e horário.", "error");
      return;
    }

    setIsProcessing(true);
    playDopamineSound("select");
    triggerHaptic("success");
    try {
      const res = await actionCriarAgendamentoManualAdmin({
        nome: novoAgendForm.nome.trim(),
        cpf: novoAgendForm.cpf || null,
        telefone: novoAgendForm.telefone || null,
        email: novoAgendForm.email || null,
        data_nascimento: novoAgendForm.data_nascimento || null,
        tipo_servico: novoAgendForm.tipo_servico,
        especialidade: novoAgendForm.especialidade || "Clínica Geral",
        medico_profissional: novoAgendForm.medico_profissional || "Corpo Clínico",
        subtipo_exame:
          novoAgendForm.tipo_servico === "Exame"
            ? novoAgendForm.subtipo_exame || novoAgendForm.especialidade
            : null,
        modalidade:
          novoAgendForm.modalidade === "Convênio" && novoAgendForm.convenio_nome
            ? `Convênio (${novoAgendForm.convenio_nome.trim()})`
            : novoAgendForm.modalidade,
        data_agendamento: novoAgendForm.data_agendamento,
        horario_agendamento: novoAgendForm.horario_agendamento,
        observacoes: novoAgendForm.observacoes || null
      });

      if (res?.success) {
        if (showToast) showToast("Agendamento interno registrado com sucesso!");
        if (fetchAgendamentos) await fetchAgendamentos();
        setIsNovoAgendamentoOpen(false);
      } else {
        if (showToast) showToast(res?.error || "Erro ao criar agendamento interno.", "error");
      }
    } catch (e) {
      if (showToast) showToast(`Erro: ${e.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Carregar mensagens da fila para este agendamento/exame
  const carregarMensagensPaciente = async (itemAlvo) => {
    if (!itemAlvo) return;
    setLoadingMensagens(true);
    try {
      const msgs = await actionBuscarMensagensDoAgendamento({
        agendamentoId: itemAlvo.id,
        telefone: itemAlvo.telefonePaciente
      });
      setMensagensAgendamento(msgs || []);
    } catch (err) {
      console.error("Erro ao buscar mensagens do agendamento:", err);
    } finally {
      setLoadingMensagens(false);
    }
  };

  // Abrir Ficha do Paciente e Dados Sensíveis com Proteção de Permissão
  const handleOpenSensitiveModal = (item) => {
    if (!temPermissaoSigiloClinico) {
      if (showToast) {
        showToast(
          "Acesso restrito: você não possui permissão de Sigilo Clínico para visualizar ou editar fichas médicas.",
          "error"
        );
      }
      return;
    }
    playDopamineSound("click");
    triggerHaptic("light");
    setSensitiveModalItem(item);
    setEnfermidadesPaciente(item.enfermidades || []);
    setSearchEnfermidade("");
    setFichaSubTab("dados");
    setEditingMsgId(null);
    setIsCriandoMensagem(false);
    setNovaMsgTexto("");
    setNovaMsgDataHora(item.data ? `${item.data}T08:00` : "");
    setNovaMsgAnexoUrl("");
    carregarMensagensPaciente(item);
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
    if (showToast) showToast(`"${limpo}" adicionada ao catálogo e vinculada ao paciente!`);
  };

  const handleRemoveEnfermidadeFromPatient = (enfNome) => {
    if (!temPermissaoSigiloClinico) return;
    setEnfermidadesPaciente((prev) => prev.filter((e) => e !== enfNome));
  };

  const handleSaveSensitiveData = async () => {
    if (!temPermissaoSigiloClinico) {
      if (showToast) showToast("Acesso negado: sem permissão de sigilo clínico.", "error");
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
      if (showToast) showToast("Ficha clínica e enfermidades salvas com sucesso!");
      setSensitiveModalItem(null);
    } catch (e) {
      if (showToast) showToast(`Erro ao salvar dados clínicos: ${e.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Iniciar edição de mensagem
  const handleStartEditMensagem = (msg) => {
    playDopamineSound("click");
    setEditingMsgId(msg.id);
    setEditMsgTexto(msg.mensagem || "");
    const dateFormatted = msg.data_hora_programada
      ? new Date(msg.data_hora_programada).toISOString().slice(0, 16)
      : "";
    setEditMsgDataHora(dateFormatted);
    setEditMsgAnexoUrl(msg.anexo_url || "");
  };

  // Salvar edição de mensagem na fila
  const handleSalvarEdicaoMensagem = async (msgId) => {
    if (!editMsgTexto.trim()) {
      if (showToast) showToast("O texto da mensagem não pode estar vazio.", "error");
      return;
    }
    setIsProcessing(true);
    playDopamineSound("select");
    triggerHaptic("light");
    try {
      await actionAtualizarMensagemFila({
        id: msgId,
        mensagem: editMsgTexto.trim(),
        data_hora_programada: editMsgDataHora ? new Date(editMsgDataHora).toISOString() : undefined,
        anexo_url: editMsgAnexoUrl?.trim() || null
      });

      setMensagensAgendamento((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                mensagem: editMsgTexto.trim(),
                data_hora_programada: editMsgDataHora
                  ? new Date(editMsgDataHora).toISOString()
                  : m.data_hora_programada,
                anexo_url: editMsgAnexoUrl?.trim() || null
              }
            : m
        )
      );

      setEditingMsgId(null);
      if (showToast) showToast("Mensagem atualizada na fila com sucesso!");
    } catch (err) {
      if (showToast) showToast(`Erro ao atualizar mensagem: ${err.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Cancelar envio de uma mensagem específica
  const handleCancelarMensagemFila = async (msgId) => {
    setIsProcessing(true);
    playDopamineSound("click");
    try {
      await actionCancelarMensagemFila(msgId);
      setMensagensAgendamento((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, status: "cancelada" } : m))
      );
      if (showToast) showToast("Envio da mensagem cancelado!");
    } catch (err) {
      if (showToast) showToast(`Erro ao cancelar mensagem: ${err.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Disparar mensagem imediatamente pelo WhatsApp
  const handleDispararAgora = async (msgId) => {
    setDisparandoMsgId(msgId);
    playDopamineSound("select");
    triggerHaptic("success");
    try {
      await actionDispararMensagemManualAdmin(msgId);
      setMensagensAgendamento((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, status: "enviada" } : m))
      );
      if (showToast) showToast("Mensagem disparada com sucesso para o WhatsApp!");
    } catch (err) {
      if (showToast) showToast(`Erro ao disparar: ${err.message}`, "error");
    } finally {
      setDisparandoMsgId(null);
    }
  };

  // Criar e enfileirar nova mensagem personalizada para este paciente/exame
  const handleCriarMensagemAvulsa = async () => {
    if (!novaMsgTexto.trim()) {
      if (showToast) showToast("Digite o conteúdo da mensagem.", "error");
      return;
    }
    if (!sensitiveModalItem?.telefonePaciente) {
      if (showToast) showToast("Este paciente não possui telefone de WhatsApp cadastrado.", "error");
      return;
    }

    setIsProcessing(true);
    playDopamineSound("select");
    triggerHaptic("success");
    try {
      const nova = await actionCriarMensagemFilaAvulsa({
        agendamentoId: sensitiveModalItem.id,
        telefone: sensitiveModalItem.telefonePaciente,
        nomePaciente: sensitiveModalItem.nomePaciente,
        mensagem: novaMsgTexto.trim(),
        dataHoraProgramada: novaMsgDataHora
          ? new Date(novaMsgDataHora).toISOString()
          : new Date().toISOString(),
        anexo_url: novaMsgAnexoUrl?.trim() || null,
        gatilho: "avulsa_manual"
      });

      if (nova) {
        setMensagensAgendamento((prev) => [...prev, nova]);
      } else {
        await carregarMensagensPaciente(sensitiveModalItem);
      }

      setIsCriandoMensagem(false);
      setNovaMsgTexto("");
      setNovaMsgAnexoUrl("");
      if (showToast) showToast("Nova mensagem agendada com sucesso!");
    } catch (err) {
      if (showToast) showToast(`Erro ao agendar mensagem: ${err.message}`, "error");
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

  // Contagem de status das mensagens daquele agendamento
  const statsMensagensAgendamento = useMemo(() => {
    const total = mensagensAgendamento.length;
    const pendentes = mensagensAgendamento.filter(
      (m) => m.status === "pendente" || m.status === "rascunho"
    ).length;
    const enviadas = mensagensAgendamento.filter(
      (m) => m.status === "enviada" || m.status === "enviado"
    ).length;
    const canceladas = mensagensAgendamento.filter(
      (m) => m.status === "cancelada" || m.status === "falha"
    ).length;
    return { total, pendentes, enviadas, canceladas };
  }, [mensagensAgendamento]);

  return (
    <motion.div
      key="agenda"
      {...fadeUp}
      className="flex-1 flex flex-col h-full overflow-hidden w-full p-3 sm:p-5 lg:p-6 min-h-0"
    >
      <div className="bg-white dark:bg-[#161618] rounded-3xl border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col h-full overflow-hidden">
        {/* CABEÇALHO & TOOLBAR PADRÃO APPLE MACOS */}
        <div className="px-5 sm:px-7 py-4 border-b border-black/[0.06] dark:border-white/[0.08] bg-black/[0.01] dark:bg-white/[0.01] flex flex-col gap-3.5 shrink-0">
          {/* LINHA SUPERIOR: TÍTULO, SUB-TABS CENTRAIS, MODO DE VISUALIZAÇÃO E AÇÕES */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3.5">
            {/* LADO ESQUERDO: TÍTULO + STATUS */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-zinc-900 dark:text-white shadow-2xs shrink-0">
                <CalendarDays size={20} strokeWidth={2} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-zinc-950 dark:text-white tracking-tight">
                    Agenda
                  </h2>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-400 border border-black/[0.04] dark:border-white/[0.06]">
                    {(currentSubTab === "calendario" ? eventosAgendaMistaDiaria.length : listaUnificadaTodosPacientes.length)} atendimentos
                  </span>
                </div>
                <p className="text-xs text-zinc-400 hidden sm:block">
                  Visão consolidada de consultas e sincronização em tempo real
                </p>
              </div>
            </div>

            {/* CENTRO: APPLE SEGMENTED CONTROL (Pacientes do Dia vs Todos os Pacientes) */}
            <div className="flex p-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-2xl border border-black/[0.04] dark:border-white/[0.04] gap-1 relative self-stretch sm:self-auto justify-center">
              <button
                type="button"
                onClick={() => {
                  playDopamineSound("click");
                  triggerHaptic("light");
                  setSubTab("calendario");
                }}
                className={`relative px-4 py-1.5 rounded-xl transition-colors min-h-[32px] flex items-center gap-2 cursor-pointer text-xs font-semibold z-10 ${
                  currentSubTab === "calendario"
                    ? "text-zinc-950 dark:text-white font-bold"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                {currentSubTab === "calendario" && (
                  <motion.div
                    layoutId="agenda-subtab-pill"
                    className="absolute inset-0 bg-white dark:bg-[#2C2C2E] rounded-xl shadow-xs border border-black/[0.04] dark:border-white/[0.08] -z-10"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                <CalendarDays size={14} />
                <span>Pacientes do Dia</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  playDopamineSound("click");
                  triggerHaptic("light");
                  setSubTab("lista");
                }}
                className={`relative px-4 py-1.5 rounded-xl transition-colors min-h-[32px] flex items-center gap-2 cursor-pointer text-xs font-semibold z-10 ${
                  currentSubTab === "lista"
                    ? "text-zinc-950 dark:text-white font-bold"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                {currentSubTab === "lista" && (
                  <motion.div
                    layoutId="agenda-subtab-pill"
                    className="absolute inset-0 bg-white dark:bg-[#2C2C2E] rounded-xl shadow-xs border border-black/[0.04] dark:border-white/[0.08] -z-10"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                <Users size={14} />
                <span>Todos os Pacientes</span>
              </button>
            </div>

            {/* LADO DIREITO: CARDS / LISTA + ATUALIZAR + NOVO AGENDAMENTO */}
            <div className="flex items-center justify-end gap-2.5 flex-wrap w-full lg:w-auto">
              <div className="flex p-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-2xl border border-black/[0.04] dark:border-white/[0.04] gap-1 relative">
                <button
                  type="button"
                  onClick={() => {
                    playDopamineSound("click");
                    triggerHaptic("light");
                    setViewMode("cards");
                    try {
                      localStorage.setItem("rmcare_default_view_mode", "cards");
                      localStorage.setItem("rmcare_view_mode", "cards");
                    } catch (e) {}
                  }}
                  className={`relative px-3.5 py-1.5 rounded-xl transition-colors min-h-[32px] flex items-center gap-1.5 cursor-pointer text-xs font-semibold z-10 ${
                    viewMode === "cards"
                      ? "text-zinc-950 dark:text-white font-bold"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                  title="Visão em Cards"
                >
                  {viewMode === "cards" && (
                    <motion.div
                      layoutId="agenda-view-mode-pill"
                      className="absolute inset-0 bg-white dark:bg-[#2C2C2E] rounded-xl shadow-xs border border-black/[0.04] dark:border-white/[0.08] -z-10"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  <LayoutGrid size={14} />
                  <span className="hidden sm:inline">Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playDopamineSound("click");
                    triggerHaptic("light");
                    setViewMode("tabela");
                    try {
                      localStorage.setItem("rmcare_default_view_mode", "tabela");
                      localStorage.setItem("rmcare_view_mode", "tabela");
                    } catch (e) {}
                  }}
                  className={`relative px-3.5 py-1.5 rounded-xl transition-colors min-h-[32px] flex items-center gap-1.5 cursor-pointer text-xs font-semibold z-10 ${
                    viewMode === "tabela"
                      ? "text-zinc-950 dark:text-white font-bold"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                  title="Visão em Lista / Tabela"
                >
                  {viewMode === "tabela" && (
                    <motion.div
                      layoutId="agenda-view-mode-pill"
                      className="absolute inset-0 bg-white dark:bg-[#2C2C2E] rounded-xl shadow-xs border border-black/[0.04] dark:border-white/[0.08] -z-10"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  <List size={14} />
                  <span className="hidden sm:inline">Lista</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="min-h-[36px] px-3.5 py-1.5 bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-zinc-800 dark:text-zinc-200 font-semibold text-xs rounded-2xl flex items-center gap-1.5 transition-all shadow-2xs border border-black/[0.04] dark:border-white/[0.06] cursor-pointer disabled:opacity-50"
                title="Puxar novos dados do banco agora"
              >
                <RefreshCw size={13} className={isRefreshing ? "animate-spin text-[#34C759]" : ""} />
                <span>{isRefreshing ? "Atualizando..." : "Atualizar"}</span>
              </button>

              <button
                type="button"
                onClick={handleAbrirNovoAgendamento}
                className="min-h-[36px] px-4 py-1.5 bg-zinc-950 hover:bg-black dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-semibold text-xs rounded-2xl flex items-center gap-2 shadow-xs transition-all cursor-pointer shrink-0"
              >
                <CalendarPlus size={15} strokeWidth={2} />
                <span>Novo Agendamento</span>
              </button>
            </div>
          </div>

          {/* LINHA INFERIOR: BARRA DE BUSCA E FILTROS COMPACTOS NO ESTILO APPLE TOOLBAR */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-black/[0.04] dark:border-white/[0.06]">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar paciente, CPF..."
                className="w-full h-9 pl-9 pr-8 bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] rounded-xl text-xs text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:border-black/30 dark:focus:border-white/30 focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="w-[145px]">
              <CustomSelect
                value={origemFilter}
                onChange={setOrigemFilter}
                options={[
                  { value: "todos", label: "Origem: Todas" },
                  { value: "rmclick", label: "RMAgenda" },
                  { value: "medicalsys", label: "MedicalSYS" }
                ]}
              />
            </div>

            <div className="w-[155px]">
              <CustomSelect
                value={modalidadeFilter}
                onChange={setModalidadeFilter}
                options={[
                  { value: "todas", label: "Modalidade: Todas" },
                  { value: "particular", label: "Particular" },
                  { value: "convenio", label: "Convênio" }
                ]}
              />
            </div>

            <div className="w-[155px]">
              <CustomSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "todos", label: "Status: Todos" },
                  { value: "agendado", label: "Agendados" },
                  { value: "reagendado", label: "Reagendados" },
                  { value: "cancelado", label: "Cancelados" }
                ]}
              />
            </div>

            <div className="w-[165px]">
              <CustomSelect
                value={pagamentoFilter}
                onChange={setPagamentoFilter}
                options={[
                  { value: "todos", label: "Pagamento: Todos" },
                  { value: "pendente", label: "Pendente" },
                  { value: "pago", label: "Pago / Aprovado" }
                ]}
              />
            </div>

            <div className="w-[185px]">
              <CustomSelect
                value={filterMedico}
                onChange={setFilterMedico}
                options={profissionaisOptions}
                icon={Filter}
              />
            </div>

            {(searchTerm || origemFilter !== "todos" || modalidadeFilter !== "todas" || statusFilter !== "todos" || pagamentoFilter !== "todos" || filterMedico !== "todos") && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setOrigemFilter("todos");
                  setModalidadeFilter("todas");
                  setStatusFilter("todos");
                  setPagamentoFilter("todos");
                  setFilterMedico("todos");
                }}
                className="h-9 px-3 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1 border border-rose-500/20"
              >
                <X size={13} />
                <span>Limpar filtros</span>
              </button>
            )}

            <div className="text-[11px] text-zinc-400 font-medium ml-auto hidden sm:flex items-center gap-1.5" suppressHydrationWarning>
              <span className="w-1.5 h-1.5 rounded-full bg-[#34C759]" />
              {mounted && lastSyncedAt
                ? `Atualizado às ${lastSyncedAt.toLocaleTimeString("pt-BR")}`
                : "Sincronizado em tempo real"}
            </div>
          </div>
        </div>
        {/* CONTEÚDO PRINCIPAL: CALENDÁRIO OU LISTA */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {currentSubTab === "calendario" && (
              <motion.div
                key="subtab-cal"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                className="flex flex-col md:flex-row h-full overflow-hidden flex-1 min-h-0"
              >
                {/* CALENDÁRIO MENSAL */}
                <div className="w-full md:w-[320px] border-r border-black/[0.06] dark:border-white/[0.08] p-5 flex flex-col overflow-y-auto bg-black/[0.01] dark:bg-white/[0.01]">
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

                      const hasAgend = listaUnificadaTodosPacientes.some(
                        (a) => a.data === dateStr && a.statusAtendimento !== "cancelado"
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
                              ? "bg-zinc-950 text-white dark:bg-white dark:text-black font-bold shadow-xs scale-105"
                              : isTod
                              ? "bg-black/[0.05] dark:bg-white/[0.08] font-bold text-zinc-950 dark:text-white"
                              : "hover:bg-black/[0.03] dark:hover:bg-white/[0.05] text-zinc-700 dark:text-zinc-300 font-medium"
                          }`}
                        >
                          {i + 1}
                          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
                            {hasAgend && (
                              <div
                                className={`w-1 h-1 rounded-full ${
                                  isSel ? "bg-white dark:bg-black" : "bg-[#34C759] dark:bg-[#30D158]"
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
                <div className="flex-1 p-5 md:p-6 overflow-y-auto custom-scrollbar bg-transparent">
                  <div className="flex justify-between items-center mb-6 pb-4 border-b border-black/[0.04] dark:border-white/[0.06]">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                        <CalendarDays size={18} className="text-[#9FC131]" />
                        {new Date(selectedDay + "T12:00:00").toLocaleDateString("pt-BR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric"
                        })}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Mostrando atendimentos agendados para a data selecionada no calendário.
                      </p>
                    </div>

                    <span className="text-xs font-bold px-3.5 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-700 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-700/50">
                      {eventosAgendaMistaDiaria.length} paciente(s)
                    </span>
                  </div>

                  {/* BARRA DE ORDENAÇÃO RÁPIDA (EXIBIDA APENAS NA VISUALIZAÇÃO EM CARDS) */}
                  {viewMode === "cards" && eventosAgendaMistaDiaria.length > 0 && (
                    <div className="flex items-center justify-between gap-2 mb-4 p-2.5 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl rounded-2xl border border-zinc-200/70 dark:border-white/5 flex-wrap">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-semibold flex-wrap">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                          <ArrowUpDown size={11} /> Ordenar Cards:
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSort("horario")}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                            sortConfig.key === "horario"
                              ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-zinc-950 dark:border-white shadow-xs font-black"
                              : "bg-white/90 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                          }`}
                        >
                          <span>Horário</span>
                          {sortConfig.key === "horario" && (
                            sortConfig.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSort("paciente")}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                            sortConfig.key === "paciente"
                              ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-zinc-950 dark:border-white shadow-xs font-black"
                              : "bg-white/90 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                          }`}
                        >
                          <span>Nome Paciente</span>
                          {sortConfig.key === "paciente" && (
                            sortConfig.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSort("especialista")}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                            sortConfig.key === "especialista"
                              ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-zinc-950 dark:border-white shadow-xs font-black"
                              : "bg-white/90 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                          }`}
                        >
                          <span>Especialista</span>
                          {sortConfig.key === "especialista" && (
                            sortConfig.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSort("status")}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                            sortConfig.key === "status"
                              ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-zinc-950 dark:border-white shadow-xs font-black"
                              : "bg-white/90 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                          }`}
                        >
                          <span>Status</span>
                          {sortConfig.key === "status" && (
                            sortConfig.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                          )}
                        </button>

                        {sortConfig.key && (
                          <button
                            type="button"
                            onClick={() => setSortConfig({ key: null, direction: "asc" })}
                            className="text-[10.5px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 underline font-bold ml-1 cursor-pointer"
                          >
                            Limpar Ordenação
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {eventosAgendaMistaDiaria.length === 0 ? (
                    <div className="mt-16 text-center flex flex-col items-center justify-center p-8 border border-dashed rounded-3xl border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-white/[0.02]">
                      <div className="w-16 h-16 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl flex items-center justify-center text-zinc-400 mb-4 shadow-sm">
                        <User size={26} />
                      </div>
                      <p className="text-zinc-600 dark:text-zinc-400 text-sm font-semibold">
                        Nenhum atendimento agendado para esta data.
                      </p>
                      <button
                        type="button"
                        onClick={handleAbrirNovoAgendamento}
                        className="mt-4 px-4 py-2 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Plus size={14} /> Agendar Paciente
                      </button>
                    </div>
                  ) : viewMode === "cards" ? (
                    <div className="grid gap-3.5">
                      {eventosAgendaMistaDiaria.map((item) => {
                        const isCanceled = item.statusAtendimento === "cancelado";
                        const isApproving = approvingPaymentId === item.id;

                        return (
                          <motion.div
                            key={item.id}
                            whileHover={{ scale: 1.008, y: -1 }}
                            whileTap={{ scale: 0.99 }}
                            transition={{ type: "spring", stiffness: 450, damping: 32 }}
                            className={`p-4 sm:p-5 rounded-3xl border ${
                              isCanceled
                                ? "bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.04] dark:border-white/[0.06] opacity-60"
                                : "bg-white dark:bg-[#161618] border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
                            } transition-all flex flex-col md:flex-row md:items-center justify-between gap-4`}
                          >
                            <div className="flex items-start md:items-center gap-3.5 min-w-0">
                              <div className="bg-[#F8F8FA] dark:bg-[#222225] border border-black/[0.06] dark:border-white/[0.08] px-3 py-2 rounded-2xl text-center min-w-[68px] shadow-2xs shrink-0">
                                <span className="text-sm sm:text-base font-bold text-zinc-950 dark:text-white tracking-tight">
                                  {item.horario || "--:--"}
                                </span>
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="font-bold text-zinc-950 dark:text-white text-sm sm:text-base tracking-tight truncate">
                                    {item.nomePaciente}
                                  </h4>
                                  {renderOrigemBadge(item)}
                                  {item.cpfPaciente && (
                                    <span className="text-[11px] font-medium text-zinc-400 bg-black/[0.04] dark:bg-white/[0.06] px-2.5 py-0.5 rounded-full">
                                      CPF: {item.cpfPaciente}
                                    </span>
                                  )}
                                  {renderStatusAtendimentoBadge(item)}
                                  {renderStatusPagamentoBadge(item)}
                                </div>

                                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                                  <span>
                                    <strong className="font-semibold text-zinc-900 dark:text-zinc-200">Especialista:</strong> {item.medicoProfissional}
                                  </span>
                                  <span>
                                    <strong className="font-semibold text-zinc-900 dark:text-zinc-200">Especialidade:</strong> {item.especialidade}
                                  </span>
                                  {item.subtipoExame && item.subtipoExame !== item.especialidade && (
                                    <span>
                                      <strong className="font-semibold text-zinc-900 dark:text-zinc-200">Procedimento:</strong> {item.subtipoExame}
                                    </span>
                                  )}
                                  <span className="px-2 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-[10px] font-semibold uppercase text-zinc-700 dark:text-zinc-300">
                                    {item.tipoServico}
                                  </span>
                                  {item.modalidade && (
                                    <span>
                                      <strong className="font-semibold text-zinc-900 dark:text-zinc-200">Modalidade:</strong> {item.modalidade}
                                    </span>
                                  )}
                                  {item.telefonePaciente && (
                                    <a
                                      href={`https://wa.me/${formatarTelefoneEnvio(item.telefonePaciente)}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                                      title={`WhatsApp: ${formatarTelefoneExibicao(item.telefonePaciente)}`}
                                    >
                                      <Phone size={12} /> {formatarTelefoneExibicao(item.telefonePaciente)}
                                    </a>
                                  )}
                                </div>

                                {temPermissaoSigiloClinico &&
                                  item.enfermidades &&
                                  item.enfermidades.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {item.enfermidades.map((enf, idx) => (
                                        <span
                                          key={idx}
                                          className="text-[10px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full flex items-center gap-1"
                                        >
                                          <HeartPulse size={10} /> {enf}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                              </div>
                            </div>

                            {/* AÇÕES NO CARD */}
                            <div className="flex items-center gap-2 self-end md:self-center flex-wrap shrink-0">
                              {!item.pago &&
                                item.tipo === "rmclick" &&
                                isItemParticular(item) &&
                                !isCanceled && (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmApproveModalItem(item.rawItem || item)}
                                    disabled={isApproving}
                                    className="min-h-[38px] px-3.5 py-1.5 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                                    title="Confirmar que o paciente particular efetuou o pagamento"
                                  >
                                    {isApproving ? (
                                      <Activity size={14} className="animate-spin" />
                                    ) : (
                                      <CheckCircle2 size={14} />
                                    )}
                                    <span>Aprovar Pagamento</span>
                                  </button>
                                )}

                              {temPermissaoSigiloClinico ? (
                                <button
                                  onClick={() => handleOpenSensitiveModal(item)}
                                  className="min-h-[38px] px-3.5 py-1.5 rounded-2xl bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-zinc-900 dark:text-white border border-black/[0.04] dark:border-white/[0.06] flex items-center gap-1.5 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                                  title="Ver Ficha Clínica, Enfermidades & Mensagens"
                                >
                                  <ShieldCheck size={14} className="text-blue-500" />
                                  <span>Ficha</span>
                                </button>
                              ) : (
                                <span
                                  className="min-h-[38px] px-3 py-1.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] text-zinc-400 text-[11px] font-medium inline-flex items-center gap-1 border border-black/[0.04] dark:border-white/[0.06] opacity-60 cursor-not-allowed"
                                  title="Acesso Restrito: Requer permissão de Sigilo Clínico"
                                >
                                  <Lock size={12} /> Ficha Restrita
                                </span>
                              )}

                              {!isCanceled && (
                                <>
                                  <button
                                    onClick={() => handleAbrirRemarcacao(item)}
                                    className="min-h-[38px] px-3.5 py-1.5 rounded-2xl bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-zinc-900 dark:text-white border border-black/[0.04] dark:border-white/[0.06] flex items-center gap-1.5 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                                  >
                                    <RotateCcw
                                      size={13}
                                      className="text-zinc-600 dark:text-zinc-400"
                                    />
                                    <span>Remarcar</span>
                                  </button>
                                  <button
                                    onClick={() => handleAbrirModalCancelamento(item)}
                                    className="min-h-[38px] px-3.5 py-1.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1.5 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                                  >
                                    <Trash2 size={13} />
                                    <span>Cancelar</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </motion.div>
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
                                  sortConfig.direction === "asc" ? (
                                    <ArrowUp size={11} />
                                  ) : (
                                    <ArrowDown size={11} />
                                  )
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
                                  sortConfig.direction === "asc" ? (
                                    <ArrowUp size={11} />
                                  ) : (
                                    <ArrowDown size={11} />
                                  )
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
                                <span>Especialista / Atendimento</span>
                                {sortConfig.key === "especialista" ? (
                                  sortConfig.direction === "asc" ? (
                                    <ArrowUp size={11} />
                                  ) : (
                                    <ArrowDown size={11} />
                                  )
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
                                  sortConfig.direction === "asc" ? (
                                    <ArrowUp size={11} />
                                  ) : (
                                    <ArrowDown size={11} />
                                  )
                                ) : (
                                  <ArrowUpDown size={11} className="opacity-40" />
                                )}
                              </div>
                            </th>
                            <th
                              onClick={() => handleSort("pagamento")}
                              className="p-4 cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors"
                            >
                              <div className="flex items-center gap-1">
                                <span>Pagamento</span>
                                {sortConfig.key === "pagamento" ? (
                                  sortConfig.direction === "asc" ? (
                                    <ArrowUp size={11} />
                                  ) : (
                                    <ArrowDown size={11} />
                                  )
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
                              </td>
                              <td className="p-4">
                                <div className="text-zinc-900 dark:text-zinc-100 font-bold">
                                  {item.medicoProfissional}
                                </div>
                                <div className="text-[10px] text-zinc-400">
                                  {item.especialidade} • {item.tipoServico}
                                </div>
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
                              <td className="p-4">
                                {isItemParticular(item) ? (
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                      item.pago
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-amber-100 text-amber-800"
                                    }`}
                                  >
                                    {item.pago ? "Pago" : "Pendente"}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                                    {item.modalidade || "Convênio"}
                                  </span>
                                )}
                              </td>

                              {/* COLUNA DE AÇÕES */}
                              <td className="p-4 text-right pr-6 whitespace-nowrap">
                                <div className="inline-flex items-center justify-end gap-2">
                                  {!item.pago &&
                                    item.tipo === "rmclick" &&
                                    isItemParticular(item) &&
                                    item.statusAtendimento !== "cancelado" && (
                                      <button
                                        type="button"
                                        onClick={() => setConfirmApproveModalItem(item.rawItem || item)}
                                        className="min-h-[34px] px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-extrabold inline-flex items-center gap-1 shadow-sm cursor-pointer"
                                        title="Aprovar Pagamento Manual"
                                      >
                                        <CheckCircle2 size={12} />
                                        <span>Aprovar</span>
                                      </button>
                                    )}

                                  {temPermissaoSigiloClinico && (
                                    <button
                                      onClick={() => handleOpenSensitiveModal(item)}
                                      className="min-h-[34px] px-3 py-1.5 border border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                                    >
                                      <ShieldCheck size={13} className="text-blue-500" />
                                      <span>Ficha</span>
                                    </button>
                                  )}

                                  {item.statusAtendimento !== "cancelado" && (
                                    <>
                                      <button
                                        onClick={() => handleAbrirRemarcacao(item)}
                                        className="min-h-[34px] px-3 py-1.5 border border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] font-bold inline-flex items-center gap-1 transition-colors shadow-sm cursor-pointer"
                                      >
                                        <RotateCcw
                                          size={12}
                                          className="text-[#86a621] dark:text-[#9FC131]"
                                        />
                                        <span>Remarcar</span>
                                      </button>
                                      <button
                                        onClick={() => handleAbrirModalCancelamento(item)}
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

            {currentSubTab === "lista" && (
              <motion.div
                key="subtab-lista"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                className="p-5 lg:p-7 h-full overflow-y-auto custom-scrollbar flex-1 min-h-0"
              >
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-black/[0.04] dark:border-white/[0.06]">
                  <div>
                    <h3 className="text-lg font-bold text-zinc-950 dark:text-white">
                      Lista Geral de Todos os Atendimentos
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Visão unificada de todos os pacientes locais e integrados do ERP com filtros avançados e ordenação dinâmica.
                    </p>
                  </div>

                  <span className="text-xs font-bold px-3.5 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-700 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-700/50">
                    {listaUnificadaTodosPacientes.length} paciente(s)
                  </span>
                </div>

                {/* BARRA DE ORDENAÇÃO RÁPIDA DE TODOS OS PACIENTES (APENAS NA VISUALIZAÇÃO EM CARDS) */}
                {viewMode === "cards" && listaUnificadaTodosPacientes.length > 0 && (
                  <div className="flex items-center justify-between gap-2 mb-4 p-2.5 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl rounded-2xl border border-zinc-200/70 dark:border-white/5 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-semibold flex-wrap">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                        <ArrowUpDown size={11} /> Ordenar Cards:
                      </span>
                    <button
                      type="button"
                      onClick={() => handleSort("data")}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                        sortConfig.key === "data"
                          ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-zinc-950 dark:border-white shadow-xs font-black"
                          : "bg-white/90 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                      }`}
                    >
                      <span>Data</span>
                      {sortConfig.key === "data" && (
                        sortConfig.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSort("horario")}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                        sortConfig.key === "horario"
                          ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-zinc-950 dark:border-white shadow-xs font-black"
                          : "bg-white/90 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                      }`}
                    >
                      <span>Horário</span>
                      {sortConfig.key === "horario" && (
                        sortConfig.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSort("paciente")}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                        sortConfig.key === "paciente"
                          ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-zinc-950 dark:border-white shadow-xs font-black"
                          : "bg-white/90 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                      }`}
                    >
                      <span>Nome Paciente</span>
                      {sortConfig.key === "paciente" && (
                        sortConfig.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSort("especialista")}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                        sortConfig.key === "especialista"
                          ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-zinc-950 dark:border-white shadow-xs font-black"
                          : "bg-white/90 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                      }`}
                    >
                      <span>Especialista</span>
                      {sortConfig.key === "especialista" && (
                        sortConfig.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSort("status")}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                        sortConfig.key === "status"
                          ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-zinc-950 dark:border-white shadow-xs font-black"
                          : "bg-white/90 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                      }`}
                    >
                      <span>Status</span>
                      {sortConfig.key === "status" && (
                        sortConfig.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSort("pagamento")}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                        sortConfig.key === "pagamento"
                          ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-zinc-950 dark:border-white shadow-xs font-black"
                          : "bg-white/90 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                      }`}
                    >
                      <span>Pagamento</span>
                      {sortConfig.key === "pagamento" && (
                        sortConfig.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                      )}
                    </button>

                    {sortConfig.key && (
                      <button
                        type="button"
                        onClick={() => setSortConfig({ key: null, direction: "asc" })}
                        className="text-[10.5px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 underline font-bold ml-1 cursor-pointer"
                      >
                        Limpar Ordenação
                      </button>
                    )}
                  </div>
                </div>
                )}

                {listaUnificadaTodosPacientes.length === 0 ? (
                  <div className="py-20 text-center rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-500 bg-white/40 dark:bg-white/[0.02]">
                    Nenhum paciente encontrado com esses filtros de busca.
                  </div>
                ) : viewMode === "cards" ? (
                  <div className="grid gap-3.5">
                    {listaUnificadaTodosPacientes.map((item) => {
                      const isCanceled = item.statusAtendimento === "cancelado";
                      const isApproving = approvingPaymentId === item.id;

                      return (
                          <motion.div
                            key={item.id}
                            whileHover={{ scale: 1.008, y: -1 }}
                            whileTap={{ scale: 0.99 }}
                            transition={{ type: "spring", stiffness: 450, damping: 32 }}
                            className={`p-4 sm:p-5 rounded-3xl border ${
                              isCanceled
                                ? "bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.04] dark:border-white/[0.06] opacity-60"
                                : "bg-white dark:bg-[#161618] border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
                            } transition-all flex flex-col md:flex-row md:items-center justify-between gap-4`}
                          >
                            <div className="flex items-start md:items-center gap-3.5 min-w-0">
                              <div className="bg-[#F8F8FA] dark:bg-[#222225] border border-black/[0.06] dark:border-white/[0.08] px-3 py-2 rounded-2xl text-center min-w-[68px] shadow-2xs shrink-0">
                                <span className="text-sm sm:text-base font-bold text-zinc-950 dark:text-white tracking-tight">
                                  {item.horario || "--:--"}
                                </span>
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="font-bold text-zinc-950 dark:text-white text-sm sm:text-base tracking-tight truncate">
                                    {item.nomePaciente}
                                  </h4>
                                  {renderOrigemBadge(item)}
                                  {item.cpfPaciente && (
                                    <span className="text-[11px] font-medium text-zinc-400 bg-black/[0.04] dark:bg-white/[0.06] px-2.5 py-0.5 rounded-full">
                                      CPF: {item.cpfPaciente}
                                    </span>
                                  )}
                                  {renderStatusAtendimentoBadge(item)}
                                  {renderStatusPagamentoBadge(item)}
                                </div>

                                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                                  <span>
                                    <strong className="font-semibold text-zinc-900 dark:text-zinc-200">Especialista:</strong> {item.medicoProfissional}
                                  </span>
                                  <span>
                                    <strong className="font-semibold text-zinc-900 dark:text-zinc-200">Especialidade:</strong> {item.especialidade}
                                  </span>
                                  {item.subtipoExame && item.subtipoExame !== item.especialidade && (
                                    <span>
                                      <strong className="font-semibold text-zinc-900 dark:text-zinc-200">Procedimento:</strong> {item.subtipoExame}
                                    </span>
                                  )}
                                  <span className="px-2 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-[10px] font-semibold uppercase text-zinc-700 dark:text-zinc-300">
                                    {item.tipoServico}
                                  </span>
                                  {item.modalidade && (
                                    <span>
                                      <strong className="font-semibold text-zinc-900 dark:text-zinc-200">Modalidade:</strong> {item.modalidade}
                                    </span>
                                  )}
                                  {item.telefonePaciente && (
                                    <a
                                      href={`https://wa.me/${formatarTelefoneEnvio(item.telefonePaciente)}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                                      title={`WhatsApp: ${formatarTelefoneExibicao(item.telefonePaciente)}`}
                                    >
                                      <Phone size={12} /> {formatarTelefoneExibicao(item.telefonePaciente)}
                                    </a>
                                  )}
                                </div>

                                {temPermissaoSigiloClinico &&
                                  item.enfermidades &&
                                  item.enfermidades.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {item.enfermidades.map((enf, idx) => (
                                        <span
                                          key={idx}
                                          className="text-[10px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full flex items-center gap-1"
                                        >
                                          <HeartPulse size={10} /> {enf}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                              </div>
                            </div>

                            {/* AÇÕES NO CARD */}
                            <div className="flex items-center gap-2 self-end md:self-center flex-wrap shrink-0">
                              {!item.pago &&
                                item.tipo === "rmclick" &&
                                isItemParticular(item) &&
                                !isCanceled && (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmApproveModalItem(item.rawItem || item)}
                                    disabled={isApproving}
                                    className="min-h-[38px] px-3.5 py-1.5 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                                    title="Confirmar que o paciente particular efetuou o pagamento"
                                  >
                                    {isApproving ? (
                                      <Activity size={14} className="animate-spin" />
                                    ) : (
                                      <CheckCircle2 size={14} />
                                    )}
                                    <span>Aprovar Pagamento</span>
                                  </button>
                                )}

                              {temPermissaoSigiloClinico ? (
                                <button
                                  onClick={() => handleOpenSensitiveModal(item)}
                                  className="min-h-[38px] px-3.5 py-1.5 rounded-2xl bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-zinc-900 dark:text-white border border-black/[0.04] dark:border-white/[0.06] flex items-center gap-1.5 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                                  title="Ver Ficha Clínica, Enfermidades & Mensagens"
                                >
                                  <ShieldCheck size={14} className="text-blue-500" />
                                  <span>Ficha</span>
                                </button>
                              ) : (
                                <span
                                  className="min-h-[38px] px-3 py-1.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] text-zinc-400 text-[11px] font-medium inline-flex items-center gap-1 border border-black/[0.04] dark:border-white/[0.06] opacity-60 cursor-not-allowed"
                                  title="Acesso Restrito: Requer permissão de Sigilo Clínico"
                                >
                                  <Lock size={12} /> Ficha Restrita
                                </span>
                              )}

                              {!isCanceled && (
                                <>
                                  <button
                                    onClick={() => handleAbrirRemarcacao(item)}
                                    className="min-h-[38px] px-3.5 py-1.5 rounded-2xl bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-zinc-900 dark:text-white border border-black/[0.04] dark:border-white/[0.06] flex items-center gap-1.5 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                                  >
                                    <RotateCcw
                                      size={13}
                                      className="text-zinc-600 dark:text-zinc-400"
                                    />
                                    <span>Remarcar</span>
                                  </button>
                                  <button
                                    onClick={() => handleAbrirModalCancelamento(item)}
                                    className="min-h-[38px] px-3.5 py-1.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1.5 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                                  >
                                    <Trash2 size={13} />
                                    <span>Cancelar</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </motion.div>
                        );
                    })}
                  </div>
                ) : (
                  /* TABELA COMPLETA PARA TODOS OS PACIENTES */
                  <div className="bg-white dark:bg-[#111116] border border-zinc-200/80 dark:border-zinc-800 rounded-2xl overflow-x-auto shadow-sm">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 font-bold uppercase tracking-wider text-zinc-400 select-none">
                          <th
                            onClick={() => handleSort("data")}
                            className="p-4 cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors"
                          >
                            <div className="flex items-center gap-1">
                              <span>Data</span>
                              {sortConfig.key === "data" ? (
                                sortConfig.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                              ) : (
                                <ArrowUpDown size={11} className="opacity-40" />
                              )}
                            </div>
                          </th>
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
                            onClick={() => handleSort("especialista")}
                            className="p-4 cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors"
                          >
                            <div className="flex items-center gap-1">
                              <span>Especialista / Atendimento</span>
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
                          <th
                            onClick={() => handleSort("pagamento")}
                            className="p-4 cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors"
                          >
                            <div className="flex items-center gap-1">
                              <span>Pagamento</span>
                              {sortConfig.key === "pagamento" ? (
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
                        {listaUnificadaTodosPacientes.map((item) => (
                          <tr
                            key={item.id}
                            className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                          >
                            <td className="p-4 font-bold text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                              {item.data ? item.data.split("-").reverse().join("/") : "--/--/----"}
                            </td>
                            <td className="p-4 font-black text-zinc-950 dark:text-white whitespace-nowrap">
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
                            </td>
                            <td className="p-4">
                              <div className="text-zinc-900 dark:text-zinc-100 font-bold">
                                {item.medicoProfissional}
                              </div>
                              <div className="text-[10px] text-zinc-400">
                                {item.especialidade} • {item.tipoServico}
                              </div>
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
                            <td className="p-4">
                              {isItemParticular(item) ? (
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                    item.pago
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {item.pago ? "Pago" : "Pendente"}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                                  {item.modalidade || "Convênio"}
                                </span>
                              )}
                            </td>

                            {/* COLUNA DE AÇÕES */}
                            <td className="p-4 text-right pr-6 whitespace-nowrap">
                              <div className="inline-flex items-center justify-end gap-2">
                                {!item.pago &&
                                  item.tipo === "rmclick" &&
                                  isItemParticular(item) &&
                                  item.statusAtendimento !== "cancelado" && (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmApproveModalItem(item.rawItem || item)}
                                      className="min-h-[34px] px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-extrabold inline-flex items-center gap-1 shadow-sm cursor-pointer"
                                      title="Aprovar Pagamento Manual"
                                    >
                                      <CheckCircle2 size={12} />
                                      <span>Aprovar</span>
                                    </button>
                                  )}

                                {temPermissaoSigiloClinico && (
                                  <button
                                    onClick={() => handleOpenSensitiveModal(item)}
                                    className="min-h-[34px] px-3 py-1.5 border border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                                  >
                                    <ShieldCheck size={13} className="text-blue-500" />
                                    <span>Ficha</span>
                                  </button>
                                )}

                                {item.statusAtendimento !== "cancelado" && (
                                  <>
                                    <button
                                      onClick={() => handleAbrirRemarcacao(item)}
                                      className="min-h-[34px] px-3 py-1.5 border border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] font-bold inline-flex items-center gap-1 transition-colors shadow-sm cursor-pointer"
                                    >
                                      <RotateCcw
                                        size={12}
                                        className="text-[#86a621] dark:text-[#9FC131]"
                                      />
                                      <span>Remarcar</span>
                                    </button>
                                    <button
                                      onClick={() => handleAbrirModalCancelamento(item)}
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* MODAL INTELIGENTE: REMARCAÇÃO COM CALENDÁRIO E HORÁRIOS EM TEMPO REAL */}
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
              className="bg-white/95 dark:bg-[#121216]/95 backdrop-blur-3xl rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl border border-black/[0.06] dark:border-white/[0.08] space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-start border-b border-black/[0.04] dark:border-white/[0.06] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-sm">
                    <RotateCcw size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white tracking-tight">
                      Remarcar Atendimento
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Paciente:{" "}
                      <strong>
                        {rescheduleModalItem.pacientes?.nome_completo ||
                          rescheduleModalItem.nomePaciente ||
                          rescheduleModalItem.nome_paciente}
                      </strong>{" "}
                      •{" "}
                      {rescheduleModalItem.especialidade ||
                        rescheduleModalItem.medico_profissional}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setRescheduleModalItem(null)}
                  className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-full cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* CALENDÁRIO INTERATIVO & SLOTS */}
              <div className="grid md:grid-cols-2 gap-5">
                {/* CALENDÁRIO MENSAL */}
                <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-[#F8F8FA] dark:bg-[#222225]">
                  <div className="flex justify-between items-center mb-4">
                    <button
                      type="button"
                      onClick={() => {
                        playDopamineSound("click");
                        setRescheduleMonth(
                          new Date(
                            rescheduleMonth.getFullYear(),
                            rescheduleMonth.getMonth() - 1,
                            1
                          )
                        );
                      }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-black capitalize text-zinc-900 dark:text-white">
                      {rescheduleMonth.toLocaleString("pt-BR", {
                        month: "long",
                        year: "numeric"
                      })}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        playDopamineSound("click");
                        setRescheduleMonth(
                          new Date(
                            rescheduleMonth.getFullYear(),
                            rescheduleMonth.getMonth() + 1,
                            1
                          )
                        );
                      }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {["D", "S", "T", "Q", "Q", "S", "S"].map((d, idx) => (
                      <span key={idx} className="text-[10px] font-extrabold text-zinc-400">
                        {d}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({
                      length: new Date(
                        rescheduleMonth.getFullYear(),
                        rescheduleMonth.getMonth(),
                        1
                      ).getDay()
                    }).map((_, i) => (
                      <div key={`rem-e-${i}`} className="aspect-square" />
                    ))}
                    {Array.from({
                      length: new Date(
                        rescheduleMonth.getFullYear(),
                        rescheduleMonth.getMonth() + 1,
                        0
                      ).getDate()
                    }).map((_, i) => {
                      const d = i + 1;
                      const y = rescheduleMonth.getFullYear();
                      const m = rescheduleMonth.getMonth();
                      const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(
                        d
                      ).padStart(2, "0")}`;

                      const isSelected = rescheduleSelectedDate === dateStr;
                      const hojeStr = getHojeLocal();
                      const isPast = dateStr < hojeStr;

                      return (
                        <button
                          key={d}
                          type="button"
                          disabled={isPast}
                          onClick={() => {
                            playDopamineSound("select");
                            triggerHaptic("light");
                            setRescheduleSelectedDate(dateStr);
                            setRescheduleSelectedTime("");
                          }}
                          className={`aspect-square rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                            isPast
                              ? "opacity-20 cursor-not-allowed text-zinc-400"
                              : isSelected
                              ? "bg-zinc-950 text-white dark:bg-white dark:text-black shadow-md ring-2 ring-[#9FC131] scale-105"
                              : "hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                          }`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* HORÁRIOS DISPONÍVEIS */}
                <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-[#F8F8FA] dark:bg-[#222225] flex flex-col">
                  <div className="flex justify-between items-center border-b border-zinc-200/60 dark:border-zinc-800 pb-2 mb-3">
                    <span className="text-xs font-extrabold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <Clock3 size={14} className="text-[#9FC131]" /> Horários Livres
                    </span>
                    <span className="text-[10px] text-zinc-400 font-bold">
                      {rescheduleSelectedDate
                        ? rescheduleSelectedDate.split("-").reverse().join("/")
                        : "Selecione a data"}
                    </span>
                  </div>

                  {!rescheduleSelectedDate ? (
                    <div className="py-12 text-center text-xs text-zinc-400 italic">
                      Selecione uma data no calendário ao lado para ver os horários.
                    </div>
                  ) : slotsRemarcacao.slots.length === 0 ? (
                    <div className="py-12 text-center text-xs text-zinc-400 border border-dashed rounded-xl border-zinc-200 dark:border-zinc-800 p-4">
                      Nenhum horário livre nesta data para este profissional.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                      {slotsRemarcacao.slots.map(({ h, off }) => {
                        const isSel = rescheduleSelectedTime === h;
                        return (
                          <button
                            key={h}
                            type="button"
                            disabled={off}
                            onClick={() => {
                              playDopamineSound("select");
                              triggerHaptic("medium");
                              setRescheduleSelectedTime(h);
                            }}
                            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                              off
                                ? "opacity-25 cursor-not-allowed bg-zinc-100 dark:bg-zinc-900 line-through text-zinc-400"
                                : isSel
                                ? "bg-[#9FC131] text-black shadow-md font-black ring-2 ring-[#9FC131] scale-105"
                                : "bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 hover:border-[#9FC131] text-zinc-800 dark:text-zinc-200"
                            }`}
                          >
                            {h}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-black/[0.04] dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setRescheduleModalItem(null)}
                  disabled={isProcessing}
                  className="min-h-[46px] rounded-2xl border border-zinc-200/80 dark:border-zinc-800 font-bold text-xs uppercase text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarRemarcacao}
                  disabled={
                    isProcessing || !rescheduleSelectedDate || !rescheduleSelectedTime
                  }
                  className="min-h-[46px] rounded-2xl bg-zinc-950 hover:bg-black dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-extrabold text-xs uppercase flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <Activity size={16} className="animate-spin" />
                  ) : (
                    "Confirmar Remarcação"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL INTELIGENTE: NOVO AGENDAMENTO INTERNO (PELO ADMINISTRADOR / ATENDENTE) */}
      <AnimatePresence>
        {isNovoAgendamentoOpen && (
          <div
            className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-md p-4 flex items-center justify-center"
            onClick={() => setIsNovoAgendamentoOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/95 dark:bg-[#121216]/95 backdrop-blur-3xl rounded-3xl p-6 md:p-8 max-w-3xl w-full shadow-2xl border border-black/[0.06] dark:border-white/[0.08] space-y-6 max-h-[92vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-start border-b border-black/[0.04] dark:border-white/[0.06] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm">
                    <CalendarPlus size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white tracking-tight">
                      Novo Agendamento Interno
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Cadastro manual de paciente com cálculo automático de vagas livres.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsNovoAgendamentoOpen(false)}
                  className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-full cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* SEÇÃO 1: DADOS DO PACIENTE */}
              <div className="p-4 bg-zinc-50/80 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                    <User size={13} /> 1. Dados do Paciente
                  </span>
                  {cpfAutofillFound && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 text-emerald-300 rounded-md">
                      ✓ Paciente Identificado
                    </span>
                  )}
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  <TextInput
                    label="CPF (Busca Automática)"
                    placeholder="000.000.000-00"
                    value={novoAgendForm.cpf}
                    onChange={(e) => {
                      const v = e.target.value;
                      setNovoAgendForm({ ...novoAgendForm, cpf: v });
                      handleLookupCpfInterno(v);
                    }}
                  />
                  <div className="sm:col-span-2">
                    <TextInput
                      label="Nome Completo *"
                      placeholder="Nome do paciente"
                      value={novoAgendForm.nome}
                      onChange={(e) => setNovoAgendForm({ ...novoAgendForm, nome: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  <TextInput
                    label="WhatsApp / Celular"
                    placeholder="(83) 99999-9999"
                    value={novoAgendForm.telefone}
                    onChange={(e) =>
                      setNovoAgendForm({ ...novoAgendForm, telefone: e.target.value })
                    }
                  />
                  <TextInput
                    label="Data de Nascimento"
                    type="date"
                    value={novoAgendForm.data_nascimento}
                    onChange={(e) =>
                      setNovoAgendForm({ ...novoAgendForm, data_nascimento: e.target.value })
                    }
                  />
                  <TextInput
                    label="E-mail (Opcional)"
                    placeholder="paciente@email.com"
                    type="email"
                    value={novoAgendForm.email}
                    onChange={(e) =>
                      setNovoAgendForm({ ...novoAgendForm, email: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* SEÇÃO 2: ATENDIMENTO CLÍNICO */}
              <div className="p-4 bg-zinc-50/80 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 space-y-3">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                  <Stethoscope size={13} /> 2. Atendimento Clínico & Especialista
                </span>

                <div className="grid sm:grid-cols-3 gap-3">
                  <CustomSelect
                    label="Categoria"
                    value={novoAgendForm.tipo_servico}
                    onChange={(v) => setNovoAgendForm({ ...novoAgendForm, tipo_servico: v })}
                    options={[
                      { value: "Consulta", label: "Consulta Médica" },
                      { value: "Exame", label: "Exame / Procedimento" },
                      { value: "Retorno", label: "Retorno" }
                    ]}
                  />

                  <CustomSelect
                    label="Especialidade"
                    value={novoAgendForm.especialidade}
                    onChange={(v) =>
                      setNovoAgendForm({
                        ...novoAgendForm,
                        especialidade: v,
                        horario_agendamento: ""
                      })
                    }
                    options={especialidadesOptions}
                  />

                  <CustomSelect
                    label="Médico / Especialista"
                    value={novoAgendForm.medico_profissional}
                    onChange={(v) =>
                      setNovoAgendForm({
                        ...novoAgendForm,
                        medico_profissional: v,
                        horario_agendamento: ""
                      })
                    }
                    options={[
                      { value: "", label: "Corpo Clínico / A definir" },
                      ...servicos
                        .filter((s) => s.ativo !== false)
                        .map((s) => ({ value: s.nome, label: s.nome }))
                    ]}
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-3 pt-1">
                  <CustomSelect
                    label="Modalidade"
                    value={novoAgendForm.modalidade}
                    onChange={(v) => setNovoAgendForm({ ...novoAgendForm, modalidade: v })}
                    options={[
                      { value: "Particular", label: "Particular" },
                      { value: "Convênio", label: "Convênio" },
                      { value: "Retorno", label: "Retorno" }
                    ]}
                  />

                  {novoAgendForm.modalidade === "Convênio" && (
                    <TextInput
                      label="Nome do Convênio / Plano"
                      placeholder="Ex: Unimed, Bradesco..."
                      value={novoAgendForm.convenio_nome}
                      onChange={(e) =>
                        setNovoAgendForm({ ...novoAgendForm, convenio_nome: e.target.value })
                      }
                    />
                  )}
                </div>
              </div>

              {/* SEÇÃO 3: CALENDÁRIO & HORÁRIOS LIVRES */}
              <div className="p-4 bg-zinc-50/80 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 space-y-3">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                  <Calendar size={13} /> 3. Data & Horário Disponível
                </span>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* CALENDÁRIO MENSAL */}
                  <div className="p-3 bg-white dark:bg-black rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <div className="flex justify-between items-center mb-3">
                      <button
                        type="button"
                        onClick={() =>
                          setNovoAgendMonth(
                            new Date(
                              novoAgendMonth.getFullYear(),
                              novoAgendMonth.getMonth() - 1,
                              1
                            )
                          )
                        }
                        className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="text-xs font-black capitalize text-zinc-900 dark:text-white">
                        {novoAgendMonth.toLocaleString("pt-BR", {
                          month: "long",
                          year: "numeric"
                        })}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setNovoAgendMonth(
                            new Date(
                              novoAgendMonth.getFullYear(),
                              novoAgendMonth.getMonth() + 1,
                              1
                            )
                          )
                        }
                        className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({
                        length: new Date(
                          novoAgendMonth.getFullYear(),
                          novoAgendMonth.getMonth(),
                          1
                        ).getDay()
                      }).map((_, i) => (
                        <div key={`novo-e-${i}`} className="aspect-square" />
                      ))}
                      {Array.from({
                        length: new Date(
                          novoAgendMonth.getFullYear(),
                          novoAgendMonth.getMonth() + 1,
                          0
                        ).getDate()
                      }).map((_, i) => {
                        const d = i + 1;
                        const y = novoAgendMonth.getFullYear();
                        const m = novoAgendMonth.getMonth();
                        const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(
                          d
                        ).padStart(2, "0")}`;

                        const isSel = novoAgendForm.data_agendamento === dateStr;
                        const isPast = dateStr < getHojeLocal();

                        return (
                          <button
                            key={d}
                            type="button"
                            disabled={isPast}
                            onClick={() => {
                              playDopamineSound("select");
                              setNovoAgendForm({
                                ...novoAgendForm,
                                data_agendamento: dateStr,
                                horario_agendamento: ""
                              });
                            }}
                            className={`aspect-square rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                              isPast
                                ? "opacity-20 cursor-not-allowed text-zinc-400"
                                : isSel
                                ? "bg-zinc-950 text-white dark:bg-white dark:text-black font-black ring-2 ring-[#9FC131]"
                                : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                            }`}
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* SLOTS LIVRES */}
                  <div className="p-3 bg-white dark:bg-black rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col">
                    <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-2 mb-2">
                      <span className="text-xs font-extrabold text-zinc-900 dark:text-white flex items-center gap-1">
                        <Clock3 size={13} className="text-[#9FC131]" /> Horários Livres
                      </span>
                      <span className="text-[10px] text-zinc-400 font-bold">
                        {novoAgendForm.data_agendamento
                          ? novoAgendForm.data_agendamento.split("-").reverse().join("/")
                          : ""}
                      </span>
                    </div>

                    {slotsNovoAgendamento.slots.length === 0 ? (
                      <div className="py-10 text-center text-xs text-zinc-400 italic">
                        Nenhum horário disponível para esta combinação.
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                        {slotsNovoAgendamento.slots.map(({ h, off }) => {
                          const isSel = novoAgendForm.horario_agendamento === h;
                          return (
                            <button
                              key={h}
                              type="button"
                              disabled={off}
                              onClick={() => {
                                playDopamineSound("select");
                                setNovoAgendForm({ ...novoAgendForm, horario_agendamento: h });
                              }}
                              className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                                off
                                  ? "opacity-25 cursor-not-allowed bg-zinc-100 dark:bg-zinc-900 line-through text-zinc-400"
                                  : isSel
                                  ? "bg-[#9FC131] text-black font-black ring-2 ring-[#9FC131] scale-105"
                                  : "bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 hover:border-[#9FC131]"
                              }`}
                            >
                              {h}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* BOTÕES SALVAR */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-black/[0.04] dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsNovoAgendamentoOpen(false)}
                  disabled={isProcessing}
                  className="min-h-[46px] rounded-2xl border border-zinc-200/80 dark:border-zinc-800 font-bold text-xs uppercase text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleSalvarNovoAgendamentoInterno}
                  disabled={
                    isProcessing ||
                    !novoAgendForm.nome?.trim() ||
                    !novoAgendForm.data_agendamento ||
                    !novoAgendForm.horario_agendamento
                  }
                  className="min-h-[46px] rounded-2xl bg-zinc-950 hover:bg-black dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-extrabold text-xs uppercase flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Activity size={16} className="animate-spin" />
                  ) : (
                    "Confirmar Agendamento"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CANCELAR AGENDAMENTO COM SEGURANÇA E MOTIVO PADRÃO PROFISSIONAL */}
      <AnimatePresence>
        {/* MODAL DE CONFIRMAÇÃO DE APROVAÇÃO DE PAGAMENTO */}
        {confirmApproveModalItem && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
            onClick={() => setConfirmApproveModalItem(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={spring}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#111116] border border-zinc-200/90 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 text-left"
            >
              <div className="flex items-center justify-between border-b border-black/[0.04] dark:border-white/[0.06] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 size={20} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-zinc-950 dark:text-white">
                      Confirmar Aprovação
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Liberação de pagamento e disparo de notificações
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmApproveModalItem(null)}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl border border-black/[0.04] dark:border-white/[0.06] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Paciente</span>
                  <span className="font-extrabold text-zinc-900 dark:text-white truncate max-w-[220px]">
                    {confirmApproveModalItem.pacientes?.nome_completo ||
                      confirmApproveModalItem.nomePaciente ||
                      confirmApproveModalItem.nome_paciente ||
                      "Paciente"}
                  </span>
                </div>
                <div className="flex justify-between border-t border-black/[0.04] dark:border-white/[0.06] pt-2">
                  <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Atendimento</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[220px]">
                    {confirmApproveModalItem.medico_profissional ||
                      confirmApproveModalItem.medicoProfissional ||
                      confirmApproveModalItem.subtipo_exame ||
                      confirmApproveModalItem.especialidade ||
                      "Atendimento"}
                  </span>
                </div>
                <div className="flex justify-between border-t border-black/[0.04] dark:border-white/[0.06] pt-2">
                  <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Data & Horário</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    {(confirmApproveModalItem.data_agendamento || confirmApproveModalItem.data)?.split("-").reverse().join("/")} às {confirmApproveModalItem.horario_agendamento || confirmApproveModalItem.horario}h
                  </span>
                </div>
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Deseja confirmar a aprovação do pagamento deste atendimento? O agendamento será marcado como pago e as mensagens de confirmação (push/WhatsApp) serão enviadas ao paciente.
              </p>

              <div className="flex gap-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setConfirmApproveModalItem(null)}
                  className="flex-1 py-3 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleAbrirRejeicaoPagamento(confirmApproveModalItem)}
                  className="flex-1 py-3 px-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-extrabold text-xs hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <X size={14} />
                  <span>Não Aprovar</span>
                </button>
                <button
                  type="button"
                  disabled={approvingPaymentId === confirmApproveModalItem.id}
                  onClick={async () => {
                    const itemParaAprovar = confirmApproveModalItem;
                    setConfirmApproveModalItem(null);
                    await handleAprovarPagamento(itemParaAprovar);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <CheckCircle2 size={15} />
                  <span>{approvingPaymentId === confirmApproveModalItem.id ? "Aprovando..." : "Confirmar e Aprovar"}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

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
              className="bg-white/95 dark:bg-[#121216]/95 backdrop-blur-3xl rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-black/[0.06] dark:border-white/[0.08] space-y-5"
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
                  {confirmarCancelamentoStep
                    ? "Confirmar Cancelamento?"
                    : "Cancelar Agendamento"}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Paciente:{" "}
                  <strong>
                    {cancelModalItem.pacientes?.nome_completo ||
                      cancelModalItem.nomePaciente ||
                      cancelModalItem.nome_paciente}
                  </strong>{" "}
                  em <strong>{cancelModalItem.data_agendamento || cancelModalItem.data}</strong> às{" "}
                  <strong>{cancelModalItem.horario_agendamento || cancelModalItem.horario}</strong>
                </p>
              </div>

              {!confirmarCancelamentoStep ? (
                <>
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-900 dark:text-amber-300 space-y-2">
                    <div className="flex items-start gap-2">
                      <Info size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                      <p>
                        O horário será liberado imediatamente no sistema e as notificações automáticas
                        serão desativadas.
                      </p>
                    </div>
                    <p className="text-[11px] opacity-80 pt-1 border-t border-amber-500/20">
                      💡 <strong>Motivo Padrão de Proteção:</strong> Se você deixar o campo de justificativa em branco, o sistema enviará automaticamente o motivo profissional <em>\"Readequação operacional da grade de atendimentos da clínica\"</em> para evitar conflitos com o paciente.
                    </p>
                  </div>

                  <TextInput
                    label="Justificativa Personalizada (Opcional)"
                    placeholder="Ex.: Solicitação do paciente, readequação..."
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
                      onClick={() => {
                        playDopamineSound("click");
                        setConfirmarCancelamentoStep(true);
                      }}
                      className="min-h-[48px] rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase flex items-center justify-center gap-2 shadow-md cursor-pointer"
                    >
                      Avançar para Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-900 dark:text-red-300 space-y-2">
                    <div className="flex items-start gap-2 font-bold">
                      <AlertTriangle size={17} className="text-red-500 shrink-0 mt-0.5" />
                      <span>Atenção: Esta ação é definitiva e liberará a vaga para outros pacientes.</span>
                    </div>
                    <p className="text-[11px] opacity-90">
                      Motivo enviado:{" "}
                      <strong>
                        {cancelReason.trim() ||
                          "Readequação operacional da grade de atendimentos da clínica"}
                      </strong>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => setConfirmarCancelamentoStep(false)}
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
                      {isProcessing ? (
                        <Activity size={16} className="animate-spin" />
                      ) : (
                        "Confirmar Cancelamento"
                      )}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

              {/* MODAL DE NÃO APROVAÇÃO / REJEIÇÃO DE PAGAMENTO COM MENSAGEM CUSTOMIZADA */}
        {rejectModalItem && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
            onClick={() => setRejectModalItem(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#111116] border border-zinc-200/90 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 text-left animate-in fade-in zoom-in-95 duration-200"
            >
              <div className="flex items-center justify-between border-b border-black/[0.04] dark:border-white/[0.06] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center">
                    <X size={20} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-zinc-950 dark:text-white">
                      Não Aprovar Pagamento
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Liberar o horário e notificar o paciente
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRejectModalItem(null)}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl border border-black/[0.04] dark:border-white/[0.06] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Paciente</span>
                  <span className="font-extrabold text-zinc-950 dark:text-white">
                    {rejectModalItem.pacientes?.nome_completo ||
                      rejectModalItem.nomePaciente ||
                      rejectModalItem.nome_paciente ||
                      "Paciente"}
                  </span>
                </div>
                <div className="flex justify-between border-t border-black/[0.04] dark:border-white/[0.06] pt-2">
                  <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Data & Horário</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    {(rejectModalItem.data_agendamento || rejectModalItem.data)?.split("-").reverse().join("/")} às{" "}
                    {rejectModalItem.horario_agendamento || rejectModalItem.horario}h
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                  Motivo da Não Aprovação
                </label>
                <input
                  type="text"
                  value={motivoRejeicao}
                  onChange={(e) => setMotivoRejeicao(e.target.value)}
                  placeholder="Ex: Comprovante divergente ou ilegível..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white outline-none focus:border-red-500"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                    Enviar Mensagem de Não Aprovação no WhatsApp
                  </label>
                  <input
                    type="checkbox"
                    checked={enviarMensagemRejeicao}
                    onChange={(e) => setEnviarMensagemRejeicao(e.target.checked)}
                    className="rounded accent-red-600 cursor-pointer"
                  />
                </div>

                {enviarMensagemRejeicao && (
                  <textarea
                    value={mensagemCustomRejeicao}
                    onChange={(e) => setMensagemCustomRejeicao(e.target.value)}
                    placeholder="Digite a mensagem personalizada que o paciente receberá no WhatsApp (ou deixe em branco para usar o padrão da clínica)..."
                    rows={3}
                    className="w-full p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white outline-none focus:border-red-500"
                  />
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setRejectModalItem(null)}
                  className="flex-1 py-3 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  disabled={isRejecting}
                  onClick={handleConfirmarRejeicaoPagamento}
                  className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/20 transition-all cursor-pointer"
                >
                  <X size={15} />
                  <span>{isRejecting ? "Rejeitando..." : "Confirmar Não Aprovação"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

      {/* TELA COMPLETA ESTILO APPLE: FICHA CLÍNICA, DADOS DO PACIENTE, OBSERVAÇÕES & MENSAGENS */}
      <AnimatePresence>
        {sensitiveModalItem && temPermissaoSigiloClinico && (
          <motion.div
            initial={{ opacity: 0, scale: 0.992 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.992 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[99999] bg-[#F5F5F7] dark:bg-[#000000] text-zinc-900 dark:text-zinc-100 flex flex-col overflow-hidden font-sans antialiased selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-black"
          >
            {/* 1. BARRA SUPERIOR TRANSLÚCIDA (macOS / iOS Navigation Bar) */}
            <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#161618]/80 backdrop-blur-2xl border-b border-black/[0.06] dark:border-white/[0.08] px-4 md:px-8 py-3 flex items-center justify-between transition-colors">
              {/* ESQUERDA: VOLTAR & BREADCRUMB */}
              <div className="flex items-center gap-3 min-w-0">
                <motion.button
                  whileHover={{ x: -2 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setSensitiveModalItem(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-zinc-700 dark:text-zinc-200 text-xs font-semibold transition-all cursor-pointer flex-shrink-0"
                >
                  <ChevronLeft size={16} strokeWidth={2.5} />
                  <span>Agenda</span>
                </motion.button>

                <div className="h-4 w-px bg-black/[0.08] dark:bg-white/[0.1] hidden sm:block flex-shrink-0" />

                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/10 to-indigo-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 flex-shrink-0 shadow-2xs">
                    <ShieldCheck size={16} strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="text-xs text-zinc-400 hidden md:inline">Prontuário /</span>
                    <h1 className="text-sm md:text-base font-bold text-zinc-950 dark:text-white tracking-tight truncate">
                      {sensitiveModalItem.nomePaciente || "Ficha do Paciente"}
                    </h1>
                    {sensitiveModalItem.tipo === "medicalsys" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 flex-shrink-0">
                        <Tag size={10} /> ERP MedicalSYS
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 flex-shrink-0">
                        <Tag size={10} /> RMCare
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* CENTRO: SEGMENTED CONTROL ESTILO APPLE (TABS DESLIZANTES) */}
              <div className="hidden lg:flex items-center justify-center">
                <div className="inline-flex p-1 bg-black/[0.04] dark:bg-white/[0.06] backdrop-blur-xl rounded-full border border-black/[0.04] dark:border-white/[0.06] relative">
                  <button
                    type="button"
                    onClick={() => {
                      playDopamineSound("click");
                      setFichaSubTab("dados");
                    }}
                    className={`relative px-4 py-1.5 text-xs font-semibold rounded-full transition-colors z-10 flex items-center gap-1.5 cursor-pointer ${
                      fichaSubTab === "dados"
                        ? "text-zinc-950 dark:text-white"
                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                    }`}
                  >
                    {fichaSubTab === "dados" && (
                      <motion.div
                        layoutId="apple-segmented-pill"
                        className="absolute inset-0 bg-white dark:bg-[#2C2C2E] rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.5)] border border-black/[0.04] dark:border-white/[0.08] -z-10"
                        transition={{ type: "spring", stiffness: 480, damping: 36 }}
                      />
                    )}
                    <HeartPulse size={14} className={fichaSubTab === "dados" ? "text-rose-500" : "text-zinc-400"} />
                    <span>Ficha & Observações</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playDopamineSound("click");
                      setFichaSubTab("mensagens");
                      carregarMensagensPaciente(sensitiveModalItem);
                    }}
                    className={`relative px-4 py-1.5 text-xs font-semibold rounded-full transition-colors z-10 flex items-center gap-1.5 cursor-pointer ${
                      fichaSubTab === "mensagens"
                        ? "text-zinc-950 dark:text-white"
                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                    }`}
                  >
                    {fichaSubTab === "mensagens" && (
                      <motion.div
                        layoutId="apple-segmented-pill"
                        className="absolute inset-0 bg-white dark:bg-[#2C2C2E] rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.5)] border border-black/[0.04] dark:border-white/[0.08] -z-10"
                        transition={{ type: "spring", stiffness: 480, damping: 36 }}
                      />
                    )}
                    <MessageSquare size={14} className={fichaSubTab === "mensagens" ? "text-emerald-500" : "text-zinc-400"} />
                    <span>WhatsApp</span>
                    {statsMensagensAgendamento.total > 0 && (
                      <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-black/10 dark:bg-white/10 text-zinc-700 dark:text-zinc-200">
                        {statsMensagensAgendamento.total}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* DIREITA: ATALHOS RÁPIDOS & FECHAR */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {sensitiveModalItem.telefonePaciente && (
                  <motion.a
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    href={`https://wa.me/${formatarTelefoneEnvio(sensitiveModalItem.telefonePaciente)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Phone size={13} className="text-emerald-600 dark:text-emerald-400" />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </motion.a>
                )}

                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setSensitiveModalItem(null)}
                  className="w-8 h-8 rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-zinc-500 hover:text-zinc-950 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Fechar (Esc)"
                >
                  <X size={15} strokeWidth={2.2} />
                </motion.button>
              </div>
            </header>

            {/* SEGMENTED CONTROL MOBILE */}
            <div className="lg:hidden bg-white/70 dark:bg-[#161618]/70 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.08] px-4 py-2 flex justify-center">
              <div className="inline-flex p-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-full border border-black/[0.04] dark:border-white/[0.06] w-full max-w-sm">
                <button
                  type="button"
                  onClick={() => {
                    playDopamineSound("click");
                    setFichaSubTab("dados");
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-full transition-all text-center ${
                    fichaSubTab === "dados"
                      ? "bg-white dark:bg-[#2C2C2E] text-zinc-950 dark:text-white shadow-xs"
                      : "text-zinc-500"
                  }`}
                >
                  Ficha & Observações
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playDopamineSound("click");
                    setFichaSubTab("mensagens");
                    carregarMensagensPaciente(sensitiveModalItem);
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-full transition-all text-center ${
                    fichaSubTab === "mensagens"
                      ? "bg-white dark:bg-[#2C2C2E] text-zinc-950 dark:text-white shadow-xs"
                      : "text-zinc-500"
                  }`}
                >
                  WhatsApp ({statsMensagensAgendamento.total})
                </button>
              </div>
            </div>

            {/* CORPO PRINCIPAL COM MOTION ORQUESTRADO */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 lg:p-10">
              <div className="w-full">
                <AnimatePresence mode="wait">
                  {fichaSubTab === "dados" ? (
                    <motion.div
                      key="dados-tab"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      {(() => {
                        const { obsImportada, ehImportado, notasManuais } = extrairObservacoes(sensitiveModalItem);
                        const iniciais = getIniciais(sensitiveModalItem.nomePaciente);

                        return (
                          <div className="grid lg:grid-cols-12 gap-8 items-start">
                            {/* COLUNA ESQUERDA (5 COLUNAS): DOSSIER CLÍNICO & DADOS */}
                            <div className="lg:col-span-5 space-y-6">
                              {/* 1. HERO PROFILE CARD */}
                              <motion.div
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ type: "spring", stiffness: 380, damping: 28 }}
                                className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_18px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] space-y-6"
                              >
                                {/* AVATAR & NOME PRINCIPAL */}
                                <div className="flex items-start gap-4">
                                  <div className="w-12 h-12 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-zinc-600 dark:text-zinc-300 shadow-2xs flex-shrink-0">
                                    <User size={20} strokeWidth={1.8} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h2 className="text-lg font-bold text-zinc-950 dark:text-white tracking-tight leading-snug">
                                      {sensitiveModalItem.nomePaciente}
                                    </h2>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                                        {sensitiveModalItem.modalidade || sensitiveModalItem.convenio || "Particular"}
                                      </span>
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300">
                                        {sensitiveModalItem.statusAtendimento || "agendado"}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* INSET GROUPED LIST (ESTILO APPLE SETTINGS / HEALTH) */}
                                <div className="bg-[#F8F8FA] dark:bg-[#252528] rounded-2xl p-4 divide-y divide-black/[0.04] dark:divide-white/[0.06] text-xs">
                                  {/* DOCUMENTO CPF */}
                                  <div className="flex items-center justify-between py-2.5 first:pt-0">
                                    <span className="text-zinc-400 dark:text-zinc-500 font-medium">CPF</span>
                                    <div className="flex items-center gap-1.5 font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                                      <span>{sensitiveModalItem.cpfPaciente || "Não informado"}</span>
                                      {sensitiveModalItem.cpfPaciente && (
                                        <button
                                          type="button"
                                          onClick={() => handleCopyCpf(sensitiveModalItem.cpfPaciente)}
                                          className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors rounded-md cursor-pointer"
                                          title="Copiar CPF"
                                        >
                                          {copiedCpf ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* NASCIMENTO & IDADE */}
                                  <div className="flex items-center justify-between py-2.5">
                                    <span className="text-zinc-400 dark:text-zinc-500 font-medium">Nascimento</span>
                                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                      {sensitiveModalItem.dataNascimento
                                        ? `${sensitiveModalItem.dataNascimento.split("-").reverse().join("/")} (${calcularIdadeDataNasc(sensitiveModalItem.dataNascimento) || "--"} anos)`
                                        : "Não informado"}
                                    </span>
                                  </div>

                                  {/* WHATSAPP */}
                                  <div className="flex items-center justify-between py-2.5">
                                    <span className="text-zinc-400 dark:text-zinc-500 font-medium">WhatsApp</span>
                                    {sensitiveModalItem.telefonePaciente ? (
                                      <a
                                        href={`https://wa.me/${formatarTelefoneEnvio(sensitiveModalItem.telefonePaciente)}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                                      >
                                        <span>{formatarTelefoneExibicao(sensitiveModalItem.telefonePaciente)}</span>
                                        <ExternalLink size={10} />
                                      </a>
                                    ) : (
                                      <span className="text-zinc-400 font-medium">Não informado</span>
                                    )}
                                  </div>

                                  {/* ESPECIALISTA */}
                                  <div className="flex items-center justify-between py-2.5">
                                    <span className="text-zinc-400 dark:text-zinc-500 font-medium">Profissional</span>
                                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-right truncate max-w-[200px]">
                                      {sensitiveModalItem.medicoProfissional}
                                    </span>
                                  </div>

                                  {/* ESPECIALIDADE / PROCEDIMENTO */}
                                  <div className="flex items-center justify-between py-2.5">
                                    <span className="text-zinc-400 dark:text-zinc-500 font-medium">Serviço</span>
                                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-right truncate max-w-[200px]">
                                      {sensitiveModalItem.especialidade}
                                    </span>
                                  </div>

                                  {/* DATA E HORA */}
                                  <div className="flex items-center justify-between py-2.5 last:pb-0">
                                    <span className="text-zinc-400 dark:text-zinc-500 font-medium">Horário</span>
                                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                      {sensitiveModalItem.data ? sensitiveModalItem.data.split("-").reverse().join("/") : "--/--"} às {sensitiveModalItem.horario || sensitiveModalItem.hora || "--:--"}
                                    </span>
                                  </div>
                                </div>
                              </motion.div>

                              {/* 2. ENFERMIDADES CLÍNICAS (APPLE HEALTH PILLS) */}
                              <motion.div
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ type: "spring", stiffness: 380, damping: 28, delay: 0.08 }}
                                className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_18px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] space-y-4"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <HeartPulse size={16} className="text-rose-500" />
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                                      Enfermidades & Condições
                                    </h3>
                                  </div>
                                  <span className="text-[11px] font-semibold text-zinc-400">
                                    {enfermidadesPaciente.length} ativa(s)
                                  </span>
                                </div>

                                <div className="flex flex-wrap gap-1.5 min-h-[36px]">
                                  {enfermidadesPaciente.length === 0 ? (
                                    <p className="text-xs text-zinc-400 italic py-1">
                                      Nenhuma enfermidade vinculada a este paciente.
                                    </p>
                                  ) : (
                                    <AnimatePresence>
                                      {enfermidadesPaciente.map((enf) => (
                                        <motion.div
                                          layout
                                          key={enf}
                                          initial={{ scale: 0.8, opacity: 0 }}
                                          animate={{ scale: 1, opacity: 1 }}
                                          exit={{ scale: 0.8, opacity: 0 }}
                                          transition={{ type: "spring", stiffness: 450, damping: 30 }}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/[0.08] dark:bg-rose-500/[0.14] border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-semibold"
                                        >
                                          <span>{enf}</span>
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveEnfermidadeFromPatient(enf)}
                                            className="hover:bg-rose-500/20 rounded-full p-0.5 transition-colors cursor-pointer"
                                            title="Desvincular"
                                          >
                                            <X size={11} strokeWidth={2.5} />
                                          </button>
                                        </motion.div>
                                      ))}
                                    </AnimatePresence>
                                  )}
                                </div>

                                <div className="relative">
                                  <div className="relative flex items-center">
                                    <Search size={14} className="absolute left-3.5 text-zinc-400" />
                                    <input
                                      type="text"
                                      value={searchEnfermidade}
                                      onChange={(e) => setSearchEnfermidade(e.target.value)}
                                      placeholder="Adicionar condição clínica..."
                                      className="w-full pl-9 pr-4 py-2 bg-[#F8F8FA] dark:bg-[#252528] rounded-xl text-xs outline-none text-zinc-900 dark:text-white placeholder-zinc-400 border border-transparent focus:border-black/[0.1] dark:focus:border-white/[0.15] transition-all"
                                    />
                                  </div>

                                  {searchEnfermidade.trim() && (
                                    <motion.div
                                      initial={{ opacity: 0, y: 4, scale: 0.98 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      className="absolute top-full left-0 right-0 z-40 mt-1.5 bg-white/95 dark:bg-[#1E1E22]/95 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.1] rounded-2xl shadow-xl p-1.5 space-y-1 max-h-48 overflow-y-auto custom-scrollbar"
                                    >
                                      {sugestoesEnfermidades.map((sug) => (
                                        <button
                                          key={sug}
                                          type="button"
                                          onClick={() => handleAddEnfermidadeToPatient(sug)}
                                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] flex items-center justify-between transition-colors cursor-pointer"
                                        >
                                          <span>{sug}</span>
                                          <span className="text-[10px] text-zinc-400 font-bold uppercase">+ Vincular</span>
                                        </button>
                                      ))}

                                      {!exactMatchExists && (
                                        <button
                                          type="button"
                                          onClick={handleCreateAndLinkEnfermidade}
                                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-zinc-950 dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] flex items-center gap-1.5 transition-colors cursor-pointer border-t border-black/[0.04] dark:border-white/[0.06] pt-2 mt-1"
                                        >
                                          <Plus size={13} strokeWidth={2.5} />
                                          <span>Cadastrar "{searchEnfermidade.trim()}"</span>
                                        </button>
                                      )}
                                    </motion.div>
                                  )}
                                </div>

                                <motion.button
                                  whileHover={{ scale: 1.01 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={handleSaveSensitiveData}
                                  disabled={isProcessing}
                                  className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-black text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                                >
                                  {isProcessing ? <Activity size={13} className="animate-spin" /> : <Check size={14} strokeWidth={2.5} />}
                                  <span>Salvar Condições</span>
                                </motion.button>
                              </motion.div>
                            </div>

                            {/* COLUNA DIREITA (7 COLUNAS): CENTRAL DE OBSERVAÇÕES (APPLE NOTES STYLE) */}
                            <div className="lg:col-span-7 space-y-6">
                              <motion.div
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ type: "spring", stiffness: 380, damping: 28, delay: 0.05 }}
                                className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 md:p-8 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_18px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] space-y-6"
                              >
                                {/* HEADER DA CENTRAL DE NOTAS */}
                                <div className="flex items-center justify-between pb-4 border-b border-black/[0.05] dark:border-white/[0.06]">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                      <FileText size={16} strokeWidth={2.2} />
                                    </div>
                                    <div>
                                      <h3 className="text-sm font-bold text-zinc-950 dark:text-white tracking-tight">
                                        Observações & Anotações
                                      </h3>
                                      <p className="text-[11px] text-zinc-400">
                                        Histórico clínico e financeiro sincronizado
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-100 dark:bg-[#252528] text-zinc-600 dark:text-zinc-300 font-mono">
                                      {(obsImportada ? 1 : 0) + notasManuais.length} nota(s)
                                    </span>
                                  </div>
                                </div>

                                {/* 1. OBSERVAÇÃO IMPORTADA DO ERP MEDICALSYS */}
                                {obsImportada && (
                                  <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-5 rounded-2xl bg-amber-500/[0.05] dark:bg-amber-500/[0.08] border border-amber-500/20 space-y-2.5 relative overflow-hidden"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/25">
                                        <Tag size={10} /> {ehImportado ? "Importado MedicalSYS" : "Observação Inicial"}
                                      </span>
                                      <span className="text-[11px] text-zinc-400 font-medium">ERP Sincronizado</span>
                                    </div>
                                    <p className="text-xs md:text-sm text-zinc-900 dark:text-zinc-100 font-medium leading-relaxed whitespace-pre-wrap pl-0.5">
                                      {obsImportada}
                                    </p>
                                  </motion.div>
                                )}

                                {/* 2. APPLE NOTES COMPOSER (DIGITAR NOVA OBSERVAÇÃO) */}
                                <div className="rounded-2xl bg-[#F8F8FA] dark:bg-[#252528] p-4 border border-black/[0.04] dark:border-white/[0.06] space-y-3 transition-all focus-within:border-zinc-300 dark:focus-within:border-zinc-600 focus-within:ring-4 focus-within:ring-black/[0.02]">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                                      <Plus size={13} strokeWidth={2.5} className="text-blue-500" /> Nova Anotação
                                    </span>
                                    <span className="text-zinc-400">
                                      {loggedAdmin?.nome || loggedAdmin?.usuario || "Você"}
                                    </span>
                                  </div>

                                  <textarea
                                    rows={3}
                                    value={novaObsTexto}
                                    onChange={(e) => setNovaObsTexto(e.target.value)}
                                    onKeyDown={(e) => {
                                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                                        e.preventDefault();
                                        handleAdicionarObservacao();
                                      }
                                    }}
                                    placeholder="Digite uma observação clínica, financeira ou operacional... (⌘+Enter para salvar)"
                                    className="w-full bg-transparent text-xs md:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 outline-none resize-none leading-relaxed"
                                  />

                                  <div className="flex items-center justify-between pt-1 border-t border-black/[0.04] dark:border-white/[0.06]">
                                    <span className="text-[10px] text-zinc-400 font-mono hidden sm:inline">
                                      Atalho: ⌘ + Enter
                                    </span>
                                    <motion.button
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.97 }}
                                      type="button"
                                      onClick={handleAdicionarObservacao}
                                      disabled={isSavingObs || !novaObsTexto.trim()}
                                      className="ml-auto px-4 py-2 rounded-xl bg-zinc-950 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-black font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                                    >
                                      {isSavingObs ? (
                                        <Activity size={13} className="animate-spin" />
                                      ) : (
                                        <CheckCircle2 size={13} strokeWidth={2.2} />
                                      )}
                                      <span>{isSavingObs ? "Salvando..." : "Salvar Anotação"}</span>
                                    </motion.button>
                                  </div>
                                </div>

                                {/* 3. HISTÓRICO DE ANOTAÇÕES REGISTRADAS */}
                                <div className="space-y-3 pt-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                                      Linha do Tempo
                                    </span>
                                    <span className="text-[11px] text-zinc-400 font-mono">
                                      {notasManuais.length} registro(s)
                                    </span>
                                  </div>

                                  {notasManuais.length === 0 ? (
                                    <div className="py-10 text-center rounded-2xl border border-dashed border-black/[0.06] dark:border-white/[0.08] p-6 space-y-1.5">
                                      <FileText size={22} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-1" />
                                      <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                        Nenhuma anotação manual registrada.
                                      </p>
                                      <p className="text-[11px] text-zinc-400">
                                        Use o campo acima para adicionar notas rápidas para este atendimento.
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      <AnimatePresence>
                                        {notasManuais.map((nota, idx) => (
                                          <motion.div
                                            layout
                                            key={nota.id || idx}
                                            initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.96 }}
                                            transition={{ type: "spring", stiffness: 450, damping: 32 }}
                                            className="p-4 rounded-2xl bg-[#F8F8FA] dark:bg-[#252528] border border-black/[0.04] dark:border-white/[0.06] space-y-2 hover:border-black/[0.08] dark:hover:border-white/[0.12] transition-colors shadow-2xs"
                                          >
                                            <div className="flex items-center justify-between text-xs">
                                              <div className="flex items-center gap-2">
                                                <span className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                                                  <div className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px] font-bold">
                                                    {(nota.autor || "A")[0].toUpperCase()}
                                                  </div>
                                                  {nota.autor || "Atendente"}
                                                </span>
                                                <span className="text-zinc-300 dark:text-zinc-600">•</span>
                                                <span className="text-zinc-400 text-[11px] font-mono">
                                                  {nota.data_hora_str || (nota.data_hora ? formatarDataHoraAmigavel(nota.data_hora) : "")}
                                                </span>
                                              </div>
                                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                                Clínica
                                              </span>
                                            </div>
                                            <p className="text-xs md:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap pl-0.5">
                                              {nota.texto}
                                            </p>
                                          </motion.div>
                                        ))}
                                      </AnimatePresence>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            </div>
                          </div>
                        );
                      })()}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="mensagens-tab"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 md:p-8 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_18px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] space-y-6"
                    >
                      {/* BARRA DE STATUS DA FILA & NOVO DISPARO */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-[#F8F8FA] dark:bg-[#252528] rounded-2xl border border-black/[0.04] dark:border-white/[0.06]">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-semibold text-zinc-500">Fila de Disparo:</span>
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold text-[11px]">
                            {statsMensagensAgendamento.pendentes} Pendente(s)
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
                            {statsMensagensAgendamento.enviadas} Enviada(s)
                          </span>
                        </div>

                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          type="button"
                          onClick={() => {
                            playDopamineSound("click");
                            setIsCriandoMensagem(!isCriandoMensagem);
                          }}
                          className="px-4 py-2 bg-zinc-950 dark:bg-white text-white dark:text-black font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        >
                          <Plus size={14} strokeWidth={2.5} />
                          <span>{isCriandoMensagem ? "Fechar Formulário" : "Nova Mensagem"}</span>
                        </motion.button>
                      </div>

                      {/* FORMULÁRIO DE NOVA MENSAGEM AVULSA */}
                      <AnimatePresence>
                        {isCriandoMensagem && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-5 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08] border border-emerald-500/20 rounded-2xl space-y-4">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                                  <Sparkles size={14} /> Agendar Mensagem Personalizada
                                </h4>
                              </div>

                              <div className="space-y-1.5">
                                <textarea
                                  rows={4}
                                  value={novaMsgTexto}
                                  onChange={(e) => setNovaMsgTexto(e.target.value)}
                                  placeholder="Digite a mensagem personalizada que será enviada via WhatsApp..."
                                  className="w-full p-3 bg-white dark:bg-black/50 border border-black/[0.08] dark:border-white/[0.1] rounded-xl text-xs outline-none focus:border-emerald-500 leading-relaxed custom-scrollbar"
                                />
                              </div>

                              <div className="grid sm:grid-cols-2 gap-3">
                                <TextInput
                                  type="datetime-local"
                                  label="Data e Horário de Envio"
                                  value={novaMsgDataHora}
                                  onChange={(e) => setNovaMsgDataHora(e.target.value)}
                                />
                                <TextInput
                                  type="url"
                                  label="Link do Anexo (PDF/Foto)"
                                  placeholder="https://clinica.com/preparo.pdf"
                                  value={novaMsgAnexoUrl}
                                  onChange={(e) => setNovaMsgAnexoUrl(e.target.value)}
                                />
                              </div>

                              <div className="flex justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setIsCriandoMensagem(false)}
                                  className="px-4 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.1] text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-black/[0.04] cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.97 }}
                                  type="button"
                                  onClick={handleCriarMensagemAvulsa}
                                  disabled={isProcessing}
                                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
                                >
                                  {isProcessing ? (
                                    <Activity size={13} className="animate-spin" />
                                  ) : (
                                    <CheckCircle2 size={13} strokeWidth={2.2} />
                                  )}
                                  <span>Agendar Mensagem</span>
                                </motion.button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* LISTA DE MENSAGENS */}
                      {loadingMensagens ? (
                        <div className="py-12 flex flex-col items-center justify-center text-zinc-400 gap-2">
                          <Activity size={22} className="animate-spin text-emerald-500" />
                          <span className="text-xs font-medium">Sincronizando mensagens...</span>
                        </div>
                      ) : mensagensAgendamento.length === 0 ? (
                        <div className="py-12 text-center rounded-2xl border border-dashed border-black/[0.06] dark:border-white/[0.08] p-6 space-y-1.5">
                          <MessageSquare size={22} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-1" />
                          <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                            Nenhuma mensagem agendada para este atendimento.
                          </p>
                          <p className="text-[11px] text-zinc-400">
                            Mensagens automáticas de confirmação e lembretes serão listadas aqui.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {mensagensAgendamento.map((msg, idx) => {
                            const isSent = msg.status === "enviada" || msg.status === "enviado";
                            const isCanceled = msg.status === "cancelada";
                            const isDisparando = disparandoMsgId === msg.id;

                            return (
                              <motion.div
                                key={msg.id || idx}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`p-4 md:p-5 rounded-2xl border transition-all ${
                                  isSent
                                    ? "bg-emerald-500/[0.02] border-emerald-500/20"
                                    : isCanceled
                                    ? "bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.05] dark:border-white/[0.06] opacity-50"
                                    : "bg-[#F8F8FA] dark:bg-[#252528] border-black/[0.04] dark:border-white/[0.06]"
                                }`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/[0.04] dark:border-white/[0.06] pb-2.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/[0.06] text-zinc-700 dark:text-zinc-300">
                                      {msg.gatilho || "Mensagem"}
                                    </span>
                                    <span className="text-[11px] text-zinc-400 font-mono">
                                      {formatarDataHoraAmigavel(msg.data_hora_programada)}
                                    </span>
                                  </div>

                                  <span
                                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                      isSent
                                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                        : isCanceled
                                        ? "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                                        : "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                                    }`}
                                  >
                                    {isSent ? "Enviada" : isCanceled ? "Cancelada" : "Pendente"}
                                  </span>
                                </div>

                                <p className="mt-3 text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
                                  {msg.mensagem}
                                </p>

                                <div className="flex justify-end gap-2 pt-2">
                                  <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.97 }}
                                    type="button"
                                    onClick={() => handleDispararAgora(msg.id)}
                                    disabled={isDisparando || isProcessing}
                                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                                  >
                                    {isDisparando ? (
                                      <Activity size={12} className="animate-spin" />
                                    ) : (
                                      <Send size={12} />
                                    )}
                                    <span>{isSent ? "Reenviar" : "Disparar Agora"}</span>
                                  </motion.button>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}