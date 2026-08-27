"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  MessageCircle,
  Sparkles,
  Trash2,
  Plus,
  Save,
  Filter,
  ListChecks,
  Image as ImageIcon,
  Upload,
  Palette,
  Sliders,
  Type,
  LayoutGrid,
  Check,
  Calendar,
  Tag,
  HeartPulse,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  RotateCcw,
  UserRound,
  ShieldCheck,
  Stethoscope,
  ClipboardCheck,
  CreditCard,
  Layers,
  Copy,
  Lock,
  List,
  Eye,
  Send,
  Pencil,
  Search,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Clock3,
  Zap,
  Activity,
  X,
  Play,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import {
  fadeUp,
  CustomSelect,
  ToggleSwitch,
  ButtonPrimary,
  TextInput,
  spring
} from "../components/SharedUI";
import {
  fetchAdminCustomization,
  actionSalvarCustomization,
  actionSalvarLogoEmpresa,
  actionListarHistoricoMensagensAdmin,
  actionDispararMensagemManualAdmin,
  actionTestarMensagemWhatsAppTemplate,
  actionTestarWebhookFluxoInteligente
} from "@/actions/adminData";
import { playDopamineSound, triggerHaptic } from "@/lib/dopamine";
import { formatarTelefoneEnvio, formatarTelefoneExibicao } from "@/lib/phoneUtils";

const PALETAS_PRESETS = [
  { nome: "Verde Lima (Padrão)", prim: "#9FC131", sec: "#10B981" },
  { nome: "Esmeralda Clínico", prim: "#10B981", sec: "#059669" },
  { nome: "Azul Safira Elegance", prim: "#2563EB", sec: "#3B82F6" },
  { nome: "Índigo Real", prim: "#6366F1", sec: "#4F46E5" },
  { nome: "Teal Oceano", prim: "#0D9488", sec: "#14B8A6" },
  { nome: "Âmbar Dourado", prim: "#F59E0B", sec: "#D97706" },
  { nome: "Preto Titanium", prim: "#18181B", sec: "#3F3F46" },
  { nome: "Rosa Quartzo", prim: "#EC4899", sec: "#DB2777" }
];

const ETAPAS_CATALOGO = {
  boas_vindas: {
    id: "boas_vindas",
    nome: "Boas-vindas",
    desc: "Apresentação e recepção com o logotipo da clínica em destaque",
    icon: Sparkles,
    color: "text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-900/60",
    obrigatoria: true
  },
  identificacao: {
    id: "identificacao",
    nome: "Identificação do Paciente",
    desc: "Coleta de Nome, CPF, WhatsApp, E-mail e Data de Nascimento",
    icon: UserRound,
    color: "text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200/60 dark:border-blue-900/60",
    obrigatoria: true
  },
  modalidade: {
    id: "modalidade",
    nome: "Modalidade & Convênio",
    desc: "Seleção entre Convênio, Particular ou formas cadastradas",
    icon: ShieldCheck,
    color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-900/60",
    obrigatoria: false
  },
  especialidade: {
    id: "especialidade",
    nome: "Atendimento Clínico & Especialista",
    desc: "Seleção da especialidade médica, exame e do profissional especialista",
    icon: Stethoscope,
    color: "text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-200/60 dark:border-purple-900/60",
    obrigatoria: false
  },
  triagem: {
    id: "triagem",
    nome: "Triagem Clínica & Perguntas",
    desc: "Questionário de saúde e orientações prévias para o paciente",
    icon: ClipboardCheck,
    color: "text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-900/60",
    obrigatoria: false
  },
  agenda: {
    id: "agenda",
    nome: "Data & Horário",
    desc: "Calendário com vagas reais e horários disponíveis para agendamento",
    icon: Calendar,
    color: "text-sky-500 bg-sky-50 dark:bg-sky-950/40 border-sky-200/60 dark:border-sky-900/60",
    obrigatoria: true
  },
  checkout: {
    id: "checkout",
    nome: "Pagamento / Entrada",
    desc: "Checkout Pix ou Cartão para pacientes particulares",
    icon: CreditCard,
    color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200/60 dark:border-indigo-900/60",
    obrigatoria: false
  }
};

const DEFAULT_ORDEM_ETAPAS = [
  "boas_vindas",
  "identificacao",
  "especialidade",
  "triagem",
  "modalidade",
  "agenda",
  "checkout"
];

// Helper para limpar prefixos "categoria:", "especialidade:", "modalidade:"
const limparNomeAlvo = (str) => {
  if (!str) return "Todas";
  return String(str)
    .replace(/^(categoria|especialidade|modalidade|tipo|servico):\s*/gi, "")
    .trim() || "Todas";
};

// Helper visual para badges de alvos
const obterBadgeAlvo = (alvoStr) => {
  if (!alvoStr || alvoStr === "Todas" || alvoStr === "todos") {
    return {
      tipo: "global",
      texto: "Todas",
      badgeClass: "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200/60 dark:border-zinc-700/60"
    };
  }
  const str = String(alvoStr).trim();
  if (str.startsWith("categoria:")) {
    return {
      tipo: "categoria",
      texto: `Cat: ${str.replace("categoria:", "").trim()}`,
      badgeClass: "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200/50"
    };
  }
  if (str.startsWith("especialidade:")) {
    return {
      tipo: "especialidade",
      texto: `Esp: ${str.replace("especialidade:", "").trim()}`,
      badgeClass: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200/50"
    };
  }
  if (str.startsWith("modalidade:")) {
    return {
      tipo: "modalidade",
      texto: `Mod: ${str.replace("modalidade:", "").trim()}`,
      badgeClass: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/50"
    };
  }
  if (str.startsWith("tipo:")) {
    return {
      tipo: "tipo",
      texto: `Tipo: ${str.replace("tipo:", "").trim()}`,
      badgeClass: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/50"
    };
  }
  return {
    tipo: "especialidade",
    texto: str,
    badgeClass: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200/50"
  };
};

// Helper para normalizar o valor do select de alvo
const normalizarAlvoValue = (alvo, options) => {
  if (!alvo || alvo === "Todas" || alvo === "todos") return "Todas";
  if (options.some((o) => o.value === alvo)) return alvo;
  const clean = alvo.replace(/^(categoria|especialidade|modalidade|tipo|servico):\s*/i, "").trim().toLowerCase();
  const match = options.find((o) => {
    const oClean = o.value.replace(/^(categoria|especialidade|modalidade|tipo|servico):\s*/i, "").trim().toLowerCase();
    return oClean === clean;
  });
  if (match) return match.value;
  return alvo;
};

// Helper universal para formatar os Dias / Tempo de Envio / Antecedência
export const formatarTempoRegra = (regra) => {
  if (!regra) return { texto: "Imediato", resumo: "0 dias", badgeClass: "bg-zinc-100 text-zinc-700" };
  const gat = regra.gatilho;

  if (gat === "imediato") {
    return {
      texto: "No momento do agendamento (0 dias / Imediato)",
      resumo: "0 dias (Imediato)",
      badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/50"
    };
  }
  if (gat === "agendado") {
    const qtd = regra.dias_antes ?? 1;
    const unid = regra.unidade_antes === "horas" ? "h" : qtd === 1 ? "dia" : "dias";
    const hora = regra.hora_envio ? ` às ${regra.hora_envio}` : "";
    return {
      texto: `${qtd} ${unid} antes do atendimento${hora}`,
      resumo: `${qtd} ${unid} antes`,
      badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/50"
    };
  }
  if (gat === "pos_atendimento") {
    const tempo = regra.pos_tempo ?? (regra.dias_depois || 30);
    const unid = regra.pos_unidade || "minutos";
    const base = regra.pos_base === "inicio" ? "início" : "término";
    const hora = unid === "dias" && regra.hora_envio ? ` às ${regra.hora_envio}` : "";
    return {
      texto: `${tempo} ${unid} após ${base}${hora}`,
      resumo: `${tempo} ${unid} pós-${base}`,
      badgeClass: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200/50"
    };
  }
  if (gat === "remarcado") {
    return {
      texto: "Imediatamente ao remarcar (0 dias)",
      resumo: "Ao remarcar (Imediato)",
      badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/50"
    };
  }
  if (gat === "cancelado") {
    return {
      texto: "Imediatamente ao cancelar (0 dias)",
      resumo: "Ao cancelar (Imediato)",
      badgeClass: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/50"
    };
  }
  if (gat === "antes_pagamento") {
    return {
      texto: "Imediatamente ao gerar cobrança (0 dias)",
      resumo: "Cobrança (Imediato)",
      badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/50"
    };
  }
  if (gat === "pagamento_aprovado") {
    return {
      texto: "Imediatamente ao aprovar pagamento (0 dias)",
      resumo: "Aprovação (Imediato)",
      badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/50"
    };
  }

  return {
    texto: "Imediato",
    resumo: "Imediato",
    badgeClass: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200/60"
  };
};

export default function PersonalizacaoView({ subTab = "jornada", showToast, servicos = [] }) {
  const [loading, setLoading] = useState(false);
  const [empresaId, setEmpresaId] = useState(null);

  // Configurações gerais e campos
  const [campos, setCampos] = useState({
    mostrar_cpf: true,
    mostrar_sobrenome: true,
    mostrar_nascimento: true,
    mostrar_email: true,
    mostrar_whatsapp: true,
    whatsapp_atendimento: "",
    mensagem_redirecionamento_whatsapp: "",
    tipo_checkout_pagamento: "online",
    msg_pagamento_whatsapp: "",
    ordem_etapas: [...DEFAULT_ORDEM_ETAPAS],
    ocultar_boas_vindas: false,
    ocultar_especialidade: false,
    ocultar_triagem: false,
    ocultar_modalidade: false,
    ocultar_checkout: false,
    logo_url: "",
    formato_logo: "arredondada",
    enviar_mensagens_importados_erp: true,
    categorias_atendimento: ["Consultas", "Exames"],
    especialidades_categorizadas: [],
    tema: {
      escopo_tema: "ambos",
      cor_primaria: "#9FC131",
      cor_secundaria: "#10B981",
      densidade_texto: "compacto",
      estilo_cards: "moderno",
      visualizacao_padrao: "lista"
    }
  });

  const [regrasMensagens, setRegrasMensagens] = useState([]);
  const [filterEspecialidade, setFilterEspecialidade] = useState("Todas");
  const [filterGatilho, setFilterGatilho] = useState("Todos");
  const [filterTextoMensagem, setFilterTextoMensagem] = useState("");
  const [visualizacaoMensagens, setVisualizacaoMensagens] = useState("lista");

  // Estado para regra em edição inline / expandida
  const [editingRegraId, setEditingRegraId] = useState(null);

  // Ordenação de colunas para tabela de mensagens
  const [sortMensagens, setSortMensagens] = useState({ key: "index", direction: "asc" });

  // Ordenação de colunas para tabela de histórico
  const [sortHistorico, setSortHistorico] = useState({ key: "data_hora", direction: "desc" });

  // Filtros avançados do Histórico de Mensagens
  const [filtroHistoricoPaciente, setFiltroHistoricoPaciente] = useState("");
  const [filtroHistoricoData, setFiltroHistoricoData] = useState("");
  const [filtroHistoricoStatus, setFiltroHistoricoStatus] = useState("todos");
  const [filtroHistoricoGatilho, setFiltroHistoricoGatilho] = useState("todos");

  const [historicoMensagens, setHistoricoMensagens] = useState([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [disparandoId, setDisparandoId] = useState(null);
  const [mensagemVisualizar, setMensagemVisualizar] = useState(null);

  // Modal Interativo de Teste de Mensagem / Webhook
  const [testModalRegra, setTestModalRegra] = useState(null);
  const [testPhoneNumber, setTestPhoneNumber] = useState("558494229126");
  const [isTestingRule, setIsTestingRule] = useState(false);
  const [testRuleResult, setTestRuleResult] = useState(null);

  // Categorias disponíveis extraídas dinamicamente
  const categoriasDisponiveis = useMemo(() => {
    const setCat = new Set();
    setCat.add("Consultas");
    setCat.add("Exames");

    if (Array.isArray(campos?.categorias_atendimento)) {
      campos.categorias_atendimento.forEach((c) => {
        if (typeof c === "string" && c.trim()) setCat.add(c.trim());
        else if (c?.nome) setCat.add(c.nome.trim());
      });
    }

    if (Array.isArray(campos?.especialidades_categorizadas)) {
      campos.especialidades_categorizadas.forEach((ec) => {
        if (ec?.categoria && ec.categoria.trim()) setCat.add(ec.categoria.trim());
      });
    }

    return Array.from(setCat);
  }, [campos.categorias_atendimento, campos.especialidades_categorizadas]);

  // Catálogo de especialidades disponíveis
  const catalogoEspecialidades = useMemo(() => {
    const map = new Map();
    (servicos || [])
      .filter((s) => s.ativo !== false)
      .forEach((s) => {
        const nome = (s.especialidade || s.nome || "").trim();
        if (nome && !map.has(nome)) {
          map.set(nome, { nome, categoria: s.tipo || "Geral" });
        }
      });

    if (Array.isArray(campos?.especialidades_categorizadas)) {
      campos.especialidades_categorizadas.forEach((ec) => {
        if (ec?.nome && ec.nome.trim()) {
          const nomeClean = ec.nome.trim();
          map.set(nomeClean, { nome: nomeClean, categoria: ec.categoria || "Geral" });
        }
      });
    }

    return Array.from(map.values());
  }, [servicos, campos.especialidades_categorizadas]);

  // Lista estruturada para o Select de Alvo
  const listaOpcoesAlvo = useMemo(() => {
    const opts = [
      { value: "Todas", label: "Todas (Qualquer atendimento / Global)" }
    ];

    // 1. Categorias dinâmicas
    categoriasDisponiveis.forEach((cat) => {
      opts.push({
        value: `categoria:${cat}`,
        label: `📁 Categoria: ${cat}`
      });
    });

    // 2. Especialidades
    catalogoEspecialidades.forEach((esp) => {
      opts.push({
        value: `especialidade:${esp.nome}`,
        label: `🩺 Especialidade: ${esp.nome} (${esp.categoria})`
      });
    });

    // 3. Modalidades
    const modalidades = ["Particular", "Convênio", "Retorno"];
    modalidades.forEach((mod) => {
      opts.push({
        value: `modalidade:${mod}`,
        label: `💳 Modalidade: ${mod}`
      });
    });

    return opts;
  }, [categoriasDisponiveis, catalogoEspecialidades]);

  const carregarHistorico = async () => {
    setLoadingHistorico(true);
    try {
      const data = await actionListarHistoricoMensagensAdmin();
      setHistoricoMensagens(data || []);
    } catch (e) {
      console.error("Erro ao listar histórico de mensagens:", e);
    } finally {
      setLoadingHistorico(false);
    }
  };

  useEffect(() => {
    if (subTab === "historico_mensagens") {
      carregarHistorico();
    }
  }, [subTab]);

  const handleDispararAgora = async (id) => {
    setDisparandoId(id);
    try {
      await actionDispararMensagemManualAdmin(id);
      if (showToast) showToast("Mensagem disparada com sucesso para o WhatsApp!");
      carregarHistorico();
    } catch (e) {
      if (showToast) showToast(`Erro ao disparar: ${e.message}`, "error");
    } finally {
      setDisparandoId(null);
    }
  };

  // Carregar dados salvos
  useEffect(() => {
    const fetchDados = async () => {
      const emp = await fetchAdminCustomization();
      if (emp) {
        setEmpresaId(emp.id);
        if (emp.config_campos) {
          const loadedDefaultView = emp.config_campos?.tema?.visualizacao_padrao || "lista";
          try {
            const savedLocalView = localStorage.getItem("rmcare_default_view_mode") || localStorage.getItem("rmcare_view_mode");
            if (savedLocalView) {
              setVisualizacaoMensagens(savedLocalView);
            } else {
              setVisualizacaoMensagens(loadedDefaultView);
            }
          } catch (e) {}

          setCampos((prev) => ({
            ...prev,
            ...emp.config_campos,
            whatsapp_atendimento:
              emp.whatsapp_atendimento ||
              emp.telefone ||
              emp.config_campos?.whatsapp_atendimento ||
              prev.whatsapp_atendimento ||
              "",
            mensagem_redirecionamento_whatsapp:
              emp.config_campos?.mensagem_redirecionamento_whatsapp ||
              prev.mensagem_redirecionamento_whatsapp ||
              "",
            tipo_checkout_pagamento:
              emp.config_campos?.tipo_checkout_pagamento ||
              prev.tipo_checkout_pagamento ||
              "online",
            msg_pagamento_whatsapp:
              emp.config_campos?.msg_pagamento_whatsapp ||
              prev.msg_pagamento_whatsapp ||
              "",
            ordem_etapas:
              Array.isArray(emp.config_campos?.ordem_etapas) && emp.config_campos.ordem_etapas.length > 0
                ? emp.config_campos.ordem_etapas
                : prev.ordem_etapas,
            logo_url: emp.logo_url || emp.config_campos.logo_url || prev.logo_url,
            formato_logo: emp.config_campos.formato_logo || prev.formato_logo || "arredondada",
            tema: {
              ...prev.tema,
              ...(emp.config_campos.tema || {}),
              visualizacao_padrao: emp.config_campos?.tema?.visualizacao_padrao || prev.tema?.visualizacao_padrao || "lista"
            }
          }));
        }
        if (Array.isArray(emp.config_mensagens)) setRegrasMensagens(emp.config_mensagens);
      }
    };
    fetchDados();
  }, [servicos]);

  const aplicarTemaEmTempoReal = (novoTema) => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    if (novoTema.cor_primaria) {
      root.style.setProperty("--brand-primary", novoTema.cor_primaria);
      localStorage.setItem("rmcare_brand_primary", novoTema.cor_primaria);
      localStorage.setItem("rmagenda_brand_primary", novoTema.cor_primaria);
    }
    if (novoTema.cor_secundaria) {
      root.style.setProperty("--brand-secondary", novoTema.cor_secundaria);
      localStorage.setItem("rmcare_brand_secondary", novoTema.cor_secundaria);
      localStorage.setItem("rmagenda_brand_secondary", novoTema.cor_secundaria);
    }
    if (novoTema.escopo_tema) {
      localStorage.setItem("rmcare_escopo_tema", novoTema.escopo_tema);
    }
    if (novoTema.visualizacao_padrao) {
      localStorage.setItem("rmcare_default_view_mode", novoTema.visualizacao_padrao);
      localStorage.setItem("rmcare_view_mode", novoTema.visualizacao_padrao);
    }
  };

  const handleSave = async () => {
    if (!empresaId) {
      if (showToast) showToast("Erro: ID da clínica não encontrado.", "error");
      return;
    }
    setLoading(true);
    try {
      await actionSalvarCustomization({ config_campos: campos, config_mensagens: regrasMensagens });
      if (campos.logo_url) {
        await actionSalvarLogoEmpresa(campos.logo_url);
      }
      aplicarTemaEmTempoReal(campos.tema);
      if (showToast) showToast("Personalização e configurações salvas com sucesso!");
    } catch (e) {
      console.error(e);
      if (showToast) showToast(`Erro ao salvar: ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      if (showToast) showToast("A imagem deve ter no máximo 25MB.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setCampos((prev) => ({ ...prev, logo_url: reader.result }));
      if (showToast) showToast("Logotipo carregado! Clique em Salvar para persistir.");
    };
    reader.readAsDataURL(file);
  };

  // Reordenação de Etapas
  const moveStepUp = (index) => {
    if (index === 0) return;
    playDopamineSound("click");
    triggerHaptic("light");
    setCampos((prev) => {
      const list = [...(prev.ordem_etapas || DEFAULT_ORDEM_ETAPAS)];
      const temp = list[index - 1];
      list[index - 1] = list[index];
      list[index] = temp;
      return { ...prev, ordem_etapas: list };
    });
  };

  const moveStepDown = (index) => {
    setCampos((prev) => {
      const list = [...(prev.ordem_etapas || DEFAULT_ORDEM_ETAPAS)];
      if (index >= list.length - 1) return prev;
      playDopamineSound("click");
      triggerHaptic("light");
      const temp = list[index + 1];
      list[index + 1] = list[index];
      list[index] = temp;
      return { ...prev, ordem_etapas: list };
    });
  };

  const resetDefaultOrder = () => {
    playDopamineSound("click");
    triggerHaptic("medium");
    setCampos((prev) => ({
      ...prev,
      ordem_etapas: [...DEFAULT_ORDEM_ETAPAS]
    }));
    if (showToast) showToast("Ordem padrão das etapas restaurada!");
  };

  // Funções de Mensagens
  const adicionarNovaRegra = () => {
    const novaRegra = {
      id: Date.now().toString(),
      alvo: filterEspecialidade !== "Todas" ? filterEspecialidade : "Todas",
      tipo_envio: "whatsapp", // "whatsapp" | "webhook"
      url_webhook_customizada: "",
      gatilho: filterGatilho !== "Todos" ? filterGatilho : "imediato",
      // Configurações para Lembrete Antes do Atendimento ("agendado")
      dias_antes: 1,
      unidade_antes: "dias", // "dias" | "horas"
      hora_envio: "08:00",
      // Configurações para Pós-Atendimento ("pos_atendimento")
      pos_base: "termino", // "termino" | "inicio"
      pos_unidade: "minutos", // "minutos" | "horas" | "dias"
      pos_tempo: 30, // 30 min, 1h, 1 dia
      // Filtros de refinamento adicionais
      filtro_modalidade: "todas", // "todas" | "Particular" | "Convênio" | "Retorno"
      filtrar_enfermidade: false,
      enfermidade_alvo: "Refluxo",
      mensagem: "Olá {nome}, seu agendamento de {servico} com {especialista} ({modalidade}) está confirmado!"
    };
    setRegrasMensagens([novaRegra, ...regrasMensagens]);
    setEditingRegraId(novaRegra.id);
    if (showToast) showToast("Nova automação de mensagem criada!");
  };

  const duplicarRegra = (regraOriginal) => {
    const clone = {
      ...regraOriginal,
      id: Date.now().toString(),
      mensagem: `${regraOriginal.mensagem}`
    };
    setRegrasMensagens([clone, ...regrasMensagens]);
    if (showToast) showToast("Mensagem duplicada com sucesso!");
  };

  const atualizarRegra = (id, campo, valor) =>
    setRegrasMensagens((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [campo]: valor } : r))
    );

  const removerRegra = (id) => {
    setRegrasMensagens((prev) => prev.filter((r) => r.id !== id));
    if (editingRegraId === id) setEditingRegraId(null);
    if (showToast) showToast("Regra removida.");
  };

  const inserirVariavelNaRegra = (id, tag) => {
    setRegrasMensagens((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const msgAtual = r.mensagem || "";
          return { ...r, mensagem: `${msgAtual} ${tag}`.trim() };
        }
        return r;
      })
    );
  };

  const inserirVariavelRedirect = (tag) => {
    setCampos((prev) => ({
      ...prev,
      mensagem_redirecionamento_whatsapp: `${prev.mensagem_redirecionamento_whatsapp || ""} ${tag}`.trim()
    }));
  };

  const inserirVariavelPagamentoWhatsApp = (tag) => {
    setCampos((prev) => ({
      ...prev,
      msg_pagamento_whatsapp: `${prev.msg_pagamento_whatsapp || ""} ${tag}`.trim()
    }));
  };

  // Execução do Teste de Mensagem / Webhook
  const handleAbrirModalTeste = (regra) => {
    playDopamineSound("click");
    triggerHaptic("light");
    setTestModalRegra(regra);
    setTestRuleResult(null);
    if (campos.whatsapp_atendimento) {
      setTestPhoneNumber(campos.whatsapp_atendimento);
    }
  };

  const handleExecutarTesteRegra = async () => {
    if (!testModalRegra) return;
    setIsTestingRule(true);
    setTestRuleResult(null);
    playDopamineSound("click");
    try {
      const res = await actionTestarMensagemWhatsAppTemplate({
        regra: testModalRegra,
        telefone: testPhoneNumber || "5583999999999",
        nomePaciente: "Paciente Exemplo"
      });

      if (res?.success) {
        setTestRuleResult({
          success: true,
          message: `Disparo realizado com sucesso! (Status HTTP ${res.status})`,
          details: res
        });
        playDopamineSound("success");
        triggerHaptic("success");
      } else {
        setTestRuleResult({
          success: false,
          message: res?.error || "Falha no disparo do teste."
        });
        playDopamineSound("error");
      }
    } catch (err) {
      setTestRuleResult({
        success: false,
        message: `Falha no teste: ${err.message}`
      });
      playDopamineSound("error");
    } finally {
      setIsTestingRule(false);
    }
  };

  const tipoEnvioOptions = [
    { value: "whatsapp", label: "💬 Mensagem WhatsApp Normal (Texto / Anexo)" },
    { value: "webhook", label: "⚡ Disparo de Webhook (Fluxo Inteligente / Chatbot)" }
  ];

  const gatilhoOptions = [
    { value: "imediato", label: "Na hora do Agendamento (Instantâneo / 0 dias)" },
    { value: "agendado", label: "Antes do Atendimento (Lembrete Programado)" },
    { value: "pos_atendimento", label: "Após Consulta / Exame (Pós-Atendimento)" },
    { value: "remarcado", label: "Quando Remarcado / Reagendado (Imediato)" },
    { value: "cancelado", label: "Quando Cancelado (Imediato)" },
    { value: "antes_pagamento", label: "Cobrança / Antes do Pagamento (Pendente)" },
    { value: "pagamento_aprovado", label: "Confirmação de Pagamento Aprovado (Imediato)" }
  ];

  const variaveisDisponiveis = [
    { tag: "{nome}", desc: "Primeiro nome do paciente" },
    { tag: "{sobrenome}", desc: "Sobrenome do paciente" },
    { tag: "{nome_completo}", desc: "Nome completo do paciente" },
    { tag: "{modalidade}", desc: "Modalidade (Convênio, Particular...)" },
    { tag: "{clinica}", desc: "Nome da clínica" },
    { tag: "{servico}", desc: "Procedimento / Serviço" },
    { tag: "{especialista}", desc: "Nome do profissional" },
    { tag: "{especialidade}", desc: "Especialidade médica" },
    { tag: "{telefone}", desc: "WhatsApp do paciente" },
    { tag: "{cpf}", desc: "CPF do paciente" },
    { tag: "{data}", desc: "Data do atendimento (ou nova data remarcada)" },
    { tag: "{hora}", desc: "Horário agendado (ou novo horário remarcado)" },
    { tag: "{data_anterior}", desc: "Data anterior (em remarcações)" },
    { tag: "{hora_anterior}", desc: "Horário anterior (em remarcações)" },
    { tag: "{motivo_cancelamento}", desc: "Motivo / Justificativa do cancelamento" },
    { tag: "{motivo}", desc: "Motivo informado pela clínica" },
    { tag: "{valor}", desc: "Valor a pagar" },
    { tag: "{chave_pix}", desc: "Chave Pix copia e cola" },
    { tag: "{link_pagamento}", desc: "Link direto do checkout" }
  ];

  const handleSortMensagens = (key) => {
    let direction = "asc";
    if (sortMensagens.key === key && sortMensagens.direction === "asc") {
      direction = "desc";
    }
    setSortMensagens({ key, direction });
    playDopamineSound("click");
    triggerHaptic("light");
  };

  const regrasFiltradas = useMemo(() => {
    let filtered = regrasMensagens.filter((regra) => {
      // 1. Filtro por Gatilho
      if (filterGatilho !== "Todos" && regra.gatilho !== filterGatilho) return false;

      // 2. Filtro por Alvo (Especialidade, Categoria ou Modalidade)
      if (filterEspecialidade !== "Todas") {
        const alvoRaw = (regra.alvo || regra.especialidade || "").toLowerCase().trim();
        const targetClean = filterEspecialidade.toLowerCase().trim();

        if (alvoRaw === "todas" || alvoRaw === "todos") return true;

        if (targetClean.startsWith("categoria:")) {
          const cat = targetClean.replace("categoria:", "").trim();
          if (alvoRaw.includes(cat)) return true;
        } else if (targetClean.startsWith("especialidade:")) {
          const esp = targetClean.replace("especialidade:", "").trim();
          if (alvoRaw.includes(esp)) return true;
        } else if (targetClean.startsWith("modalidade:")) {
          const mod = targetClean.replace("modalidade:", "").trim();
          if (alvoRaw.includes(mod) || (regra.filtro_modalidade && regra.filtro_modalidade.toLowerCase().includes(mod))) return true;
        } else {
          if (alvoRaw.includes(targetClean) || targetClean.includes(alvoRaw)) return true;
        }
        return false;
      }

      // 3. Filtro por Texto na Mensagem
      if (filterTextoMensagem.trim()) {
        const query = filterTextoMensagem.toLowerCase().trim();
        const msg = (regra.mensagem || "").toLowerCase();
        const alvoStr = (regra.alvo || regra.especialidade || "").toLowerCase();
        if (!msg.includes(query) && !alvoStr.includes(query)) return false;
      }

      return true;
    });

    if (sortMensagens.key) {
      filtered = [...filtered].sort((a, b) => {
        let valA = "";
        let valB = "";
        if (sortMensagens.key === "gatilho") {
          valA = gatilhoOptions.find((g) => g.value === a.gatilho)?.label || a.gatilho || "";
          valB = gatilhoOptions.find((g) => g.value === b.gatilho)?.label || b.gatilho || "";
        } else if (sortMensagens.key === "alvo") {
          valA = limparNomeAlvo(a.alvo || a.especialidade);
          valB = limparNomeAlvo(b.alvo || b.especialidade);
        } else if (sortMensagens.key === "dias") {
          valA = formatarTempoRegra(a).texto;
          valB = formatarTempoRegra(b).texto;
        } else if (sortMensagens.key === "mensagem") {
          valA = a.mensagem || "";
          valB = b.mensagem || "";
        } else {
          return 0;
        }

        const cmp = String(valA).localeCompare(String(valB), "pt-BR", { sensitivity: "base" });
        return sortMensagens.direction === "asc" ? cmp : -cmp;
      });
    }

    return filtered;
  }, [regrasMensagens, filterGatilho, filterEspecialidade, filterTextoMensagem, sortMensagens]);

  const handleSortHistorico = (key) => {
    let direction = "asc";
    if (sortHistorico.key === key && sortHistorico.direction === "asc") {
      direction = "desc";
    }
    setSortHistorico({ key, direction });
    playDopamineSound("click");
    triggerHaptic("light");
  };

  const historicoFiltrado = useMemo(() => {
    let list = historicoMensagens.filter((item) => {
      // 1. Filtro por Paciente / WhatsApp / Texto
      if (filtroHistoricoPaciente.trim()) {
        const term = filtroHistoricoPaciente.toLowerCase().trim();
        const termNum = term.replace(/\D/g, "");
        const nomePac = (item.nome_paciente || "").toLowerCase();
        const telPac = (item.telefone_whatsapp || "").replace(/\D/g, "");
        const msg = (item.mensagem || "").toLowerCase();

        const matchNome = nomePac.includes(term);
        const matchTel = termNum.length > 2 && telPac.includes(termNum);
        const matchMsg = msg.includes(term);

        if (!matchNome && !matchTel && !matchMsg) return false;
      }

      // 2. Filtro por Data
      if (filtroHistoricoData) {
        const targetDate = filtroHistoricoData;
        const itemDateProg = item.data_hora_programada ? item.data_hora_programada.substring(0, 10) : "";
        const itemDateCreated = item.created_at ? item.created_at.substring(0, 10) : "";
        const itemDateAgendamento = item.data_agendamento ? item.data_agendamento.substring(0, 10) : "";

        if (
          itemDateProg !== targetDate &&
          itemDateCreated !== targetDate &&
          itemDateAgendamento !== targetDate
        ) {
          return false;
        }
      }

      // 3. Filtro por Status
      if (filtroHistoricoStatus !== "todos") {
        const itemStatus = (item.status || "").toLowerCase();
        const itemGatilho = (item.gatilho || "").toLowerCase();

        if (filtroHistoricoStatus === "cancelada") {
          if (itemStatus !== "cancelado" && itemStatus !== "cancelada" && itemGatilho !== "cancelado") {
            return false;
          }
        } else if (filtroHistoricoStatus === "enviada") {
          if (
            (itemStatus !== "enviado" && itemStatus !== "enviada") ||
            itemGatilho === "cancelado"
          ) {
            return false;
          }
        } else if (filtroHistoricoStatus === "pendente") {
          if (itemStatus !== "pendente") return false;
        } else if (filtroHistoricoStatus === "falha") {
          if (itemStatus !== "falha" && itemStatus !== "erro") return false;
        } else if (filtroHistoricoStatus === "rascunho") {
          if (itemStatus !== "rascunho") return false;
        }
      }

      // 4. Filtro por Gatilho
      if (filtroHistoricoGatilho !== "todos") {
        if (item.gatilho !== filtroHistoricoGatilho) return false;
      }

      return true;
    });

    if (sortHistorico.key) {
      list = [...list].sort((a, b) => {
        let valA = "";
        let valB = "";

        if (sortHistorico.key === "status") {
          valA = a.status || "";
          valB = b.status || "";
        } else if (sortHistorico.key === "paciente") {
          valA = a.nome_paciente || "";
          valB = b.nome_paciente || "";
        } else if (sortHistorico.key === "whatsapp") {
          valA = a.telefone_whatsapp || "";
          valB = b.telefone_whatsapp || "";
        } else if (sortHistorico.key === "gatilho") {
          valA = a.gatilho || "";
          valB = b.gatilho || "";
        } else if (sortHistorico.key === "data_hora") {
          valA = new Date(a.data_hora_programada || a.created_at || 0).getTime();
          valB = new Date(b.data_hora_programada || b.created_at || 0).getTime();
          return sortHistorico.direction === "asc" ? valA - valB : valB - valA;
        } else if (sortHistorico.key === "mensagem") {
          valA = a.mensagem || "";
          valB = b.mensagem || "";
        }

        const cmp = String(valA).localeCompare(String(valB), "pt-BR", { sensitivity: "base" });
        return sortHistorico.direction === "asc" ? cmp : -cmp;
      });
    }

    return list;
  }, [historicoMensagens, filtroHistoricoPaciente, filtroHistoricoData, filtroHistoricoStatus, filtroHistoricoGatilho, sortHistorico]);

  const ordemAtual = useMemo(() => {
    const list = Array.isArray(campos.ordem_etapas) && campos.ordem_etapas.length > 0
      ? campos.ordem_etapas
      : DEFAULT_ORDEM_ETAPAS;
    const validSet = new Set(DEFAULT_ORDEM_ETAPAS);
    const filtered = list.filter((id) => validSet.has(id));
    const missing = DEFAULT_ORDEM_ETAPAS.filter((id) => !filtered.includes(id));
    return [...filtered, ...missing];
  }, [campos.ordem_etapas]);

  return (
    <motion.div
      key="personalizacao"
      {...fadeUp}
      className="flex-1 flex flex-col h-full overflow-hidden w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8"
    >
      {/* CABEÇALHO COM TÍTULO E BOTÃO SALVAR */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200/80 dark:border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-black flex items-center justify-center shrink-0 shadow-sm">
            <Palette size={18} strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-950 dark:text-white tracking-tight">
              {subTab === "jornada" && "Jornada do Paciente, Etapas & Logotipo"}
              {subTab === "aparencia" && "Design, Cores & Escopo de Personalização"}
              {subTab === "mensagens" && "Automações de Mensagens WhatsApp"}
              {subTab === "historico_mensagens" && "Histórico & Auditoria de Mensagens WhatsApp"}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Configure o fluxo do paciente, a identidade visual e as automações desta clínica.
            </p>
          </div>
        </div>

        <ButtonPrimary
          onClick={handleSave}
          disabled={loading}
          icon={Save}
          className="px-6 py-2 text-xs min-h-[38px] rounded-xl cursor-pointer"
        >
          {loading ? "Salvando..." : "Salvar Alterações"}
        </ButtonPrimary>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pb-24 pr-1">
        <AnimatePresence mode="wait">
          {/* TAB 1: JORNADA, ETAPAS & IDENTIFICAÇÃO INTEGRADA */}
          {subTab === "jornada" && (
            <motion.div
              key="jornada"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={spring}
              className="space-y-6"
            >
              {/* REORDENAÇÃO E HABILITAÇÃO INTEGRADA DAS ETAPAS */}
              <section className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-8 rounded-[2rem] shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-zinc-100 dark:border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center text-purple-600 dark:text-purple-400">
                      <Layers size={18} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                        Ordem & Ativação das Etapas do Paciente
                      </h3>
                      <p className="text-xs text-zinc-500">
                        Ative, desative ou reordene a sequência das etapas exibidas durante o agendamento.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={resetDefaultOrder}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white text-xs font-bold transition-colors shadow-sm self-start sm:self-auto min-h-[34px] cursor-pointer"
                  >
                    <RotateCcw size={13} /> Restaurar Padrão
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300 leading-relaxed">
                  🔒 <strong>Etapas Obrigatórias Bloqueadas:</strong> As etapas de <strong>Boas-vindas</strong>, <strong>Identificação</strong> e <strong>Data & Horário</strong> são essenciais para o fluxo e não podem ser desativadas. As etapas de <strong>Atendimento Clínico</strong>, <strong>Triagem</strong>, <strong>Modalidade/Convênio</strong> e <strong>Pagamento</strong> podem ser habilitadas ou desabilitadas diretamente no interruptor de cada card.
                </div>

                <div className="space-y-3">
                  {ordemAtual.map((stepKey, index) => {
                    const info = ETAPAS_CATALOGO[stepKey] || {
                      id: stepKey,
                      nome: stepKey,
                      desc: "Etapa de agendamento",
                      icon: Sparkles,
                      color: "text-zinc-500 bg-zinc-100 dark:bg-zinc-800 border-zinc-200",
                      obrigatoria: false
                    };
                    const Icon = info.icon;

                    const isDesativada =
                      (stepKey === "especialidade" && campos.ocultar_especialidade) ||
                      (stepKey === "triagem" && campos.ocultar_triagem) ||
                      (stepKey === "modalidade" && campos.ocultar_modalidade) ||
                      (stepKey === "checkout" && campos.ocultar_checkout);

                    const handleToggleStep = (ativo) => {
                      if (info.obrigatoria) return;
                      const desativar = !ativo;
                      if (stepKey === "especialidade") setCampos((p) => ({ ...p, ocultar_especialidade: desativar }));
                      if (stepKey === "triagem") setCampos((p) => ({ ...p, ocultar_triagem: desativar }));
                      if (stepKey === "modalidade") setCampos((p) => ({ ...p, ocultar_modalidade: desativar }));
                      if (stepKey === "checkout") setCampos((p) => ({ ...p, ocultar_checkout: desativar }));
                    };

                    return (
                      <motion.div
                        key={stepKey}
                        layout
                        transition={{ type: "spring", stiffness: 450, damping: 32 }}
                        className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col gap-4 ${
                          isDesativada
                            ? "bg-zinc-100/60 dark:bg-zinc-900/30 border-zinc-200/50 dark:border-zinc-800/50 opacity-60"
                            : "bg-zinc-50/70 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800 shadow-sm"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            <div className="flex flex-col items-center justify-center shrink-0 w-8">
                              <span className="text-[11px] font-black text-zinc-400 dark:text-zinc-500 font-mono">
                                #{index + 1}
                              </span>
                            </div>

                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${info.color}`}
                            >
                              <Icon size={18} strokeWidth={2} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-extrabold text-sm text-zinc-950 dark:text-white truncate">
                                  {info.nome}
                                </h4>
                                {info.obrigatoria ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                                    <Lock size={9} /> Obrigatória
                                  </span>
                                ) : isDesativada ? (
                                  <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/50">
                                    Desativada
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50">
                                    Ativa no fluxo
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                                {info.desc}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                            {!info.obrigatoria && (
                              <ToggleSwitch
                                checked={!isDesativada}
                                onChange={handleToggleStep}
                                label={!isDesativada ? "Habilitada" : "Desabilitada"}
                              />
                            )}

                            <div className="flex items-center gap-1 pl-2 border-l border-zinc-200 dark:border-zinc-700">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => moveStepUp(index)}
                                title="Mover etapa para cima"
                                className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-all shadow-sm min-h-[34px] min-w-[34px] flex items-center justify-center cursor-pointer"
                              >
                                <ArrowUp size={15} strokeWidth={2.2} />
                              </button>
                              <button
                                type="button"
                                disabled={index === ordemAtual.length - 1}
                                onClick={() => moveStepDown(index)}
                                title="Mover etapa para baixo"
                                className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-all shadow-sm min-h-[34px] min-w-[34px] flex items-center justify-center cursor-pointer"
                              >
                                <ArrowDown size={15} strokeWidth={2.2} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {stepKey === "identificacao" && (
                          <div className="pt-3 mt-1 border-t border-zinc-200/60 dark:border-zinc-800/80 space-y-2">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                              Campos Exigidos Nesta Etapa:
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                              <ToggleSwitch
                                checked={campos.mostrar_cpf}
                                onChange={(v) => setCampos({ ...campos, mostrar_cpf: v })}
                                label="Exigir CPF"
                              />
                              <ToggleSwitch
                                checked={campos.mostrar_sobrenome}
                                onChange={(v) => setCampos({ ...campos, mostrar_sobrenome: v })}
                                label="Sobrenome"
                              />
                              <ToggleSwitch
                                checked={campos.mostrar_nascimento}
                                onChange={(v) => setCampos({ ...campos, mostrar_nascimento: v })}
                                label="Nascimento"
                              />
                              <ToggleSwitch
                                checked={campos.mostrar_email}
                                onChange={(v) => setCampos({ ...campos, mostrar_email: v })}
                                label="E-mail"
                              />
                              <ToggleSwitch
                                checked={campos.mostrar_whatsapp}
                                onChange={(v) => setCampos({ ...campos, mostrar_whatsapp: v })}
                                label="WhatsApp"
                              />
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </section>

              {/* LOGOTIPO DA CLÍNICA */}
              <section className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-8 rounded-[2rem] shadow-sm">
                <div className="flex items-center gap-3 mb-6 border-b border-zinc-100 dark:border-white/5 pb-4">
                  <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
                    <ImageIcon size={18} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                      Logotipo da Clínica
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Exibido no portal de agendamento e no cabeçalho executivo. Limite: até 25MB.
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 items-start">
                  <div className="space-y-4">
                    <TextInput
                      label="URL Direta da Imagem"
                      placeholder="https://suaclinica.com.br/logo.png"
                      value={campos.logo_url || ""}
                      onChange={(e) => setCampos({ ...campos, logo_url: e.target.value })}
                    />

                    <div className="flex items-center gap-3 pt-1">
                      <label className="cursor-pointer px-4 py-2 bg-zinc-950 dark:bg-white text-white dark:text-black text-xs font-bold rounded-xl flex items-center gap-2 hover:bg-zinc-800 transition-all min-h-[38px] shadow-sm">
                        <Upload size={14} strokeWidth={1.75} /> Upload de Imagem (PNG/JPG/SVG)
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                      {campos.logo_url && (
                        <button
                          type="button"
                          onClick={() => setCampos({ ...campos, logo_url: "" })}
                          className="text-xs text-red-500 hover:underline font-medium cursor-pointer"
                        >
                          Remover logo
                        </button>
                      )}
                    </div>

                    <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-white/5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                        Moldura do Logotipo
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: "arredondada", label: "Arredondada", desc: "Boleada moderna" },
                          { id: "circular", label: "Circular", desc: "100% Redonda" },
                          { id: "quadrada", label: "Quadrada", desc: "Cantos retos" },
                          { id: "original", label: "Retangular", desc: "Proporção livre" }
                        ].map((f) => {
                          const isSelected = (campos.formato_logo || "arredondada") === f.id;
                          return (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => setCampos({ ...campos, formato_logo: f.id })}
                              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-zinc-950 dark:border-white shadow-sm font-bold ring-2 ring-[#9FC131]"
                                  : "bg-zinc-50/70 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300"
                              }`}
                            >
                              <div className="text-xs font-bold">{f.label}</div>
                              <div className="text-[9px] opacity-70 mt-0.5">{f.desc}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 flex flex-col items-center justify-center text-center min-h-[180px]">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">
                      Prévia do Logotipo
                    </span>
                    {campos.logo_url ? (
                      <div
                        className={`overflow-hidden border border-zinc-200/80 dark:border-zinc-800 shadow-md bg-white dark:bg-[#111116] flex items-center justify-center transition-all ${
                          campos.formato_logo === "circular"
                            ? "w-24 h-24 rounded-full"
                            : campos.formato_logo === "quadrada"
                            ? "w-24 h-24 rounded-lg"
                            : campos.formato_logo === "original"
                            ? "w-36 h-24 rounded-2xl"
                            : "w-24 h-24 rounded-[1.75rem]"
                        }`}
                      >
                        <img
                          src={campos.logo_url}
                          alt="Logo da Clínica"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="text-zinc-400 text-xs flex flex-col items-center gap-1">
                        <ImageIcon size={26} strokeWidth={1.2} className="opacity-40" />
                        Nenhum logotipo configurado.
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* WHATSAPP OFICIAL DE ATENDIMENTO & MENSAGEM MANUAL DE ATIVO PARCIAL */}
              <section className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-8 rounded-[2rem] shadow-sm space-y-5">
                <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-white/5 pb-4">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <MessageCircle size={18} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                      WhatsApp Oficial de Atendimento & Encaminhamento
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Configure o número da clínica e personalize a mensagem manual enviada pelo paciente ao selecionar especialistas com atendimento parcial.
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 items-center">
                  <TextInput
                    label="Número do WhatsApp da Clínica"
                    placeholder="Ex: 5583988887777 ou 83988887777"
                    value={campos.whatsapp_atendimento || ""}
                    onChange={(e) => setCampos({ ...campos, whatsapp_atendimento: e.target.value })}
                  />
                  <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30 text-xs text-emerald-900 dark:text-emerald-300">
                    💡 <strong>Uso Automático:</strong> Este número é acionado no botão de suporte e ao selecionar colaboradores com status <em>"Ativo Parcial"</em>.
                  </div>
                </div>

                {/* MENSAGEM DE ENCAMINHAMENTO MANUAL */}
                <div className="pt-3 border-t border-zinc-100 dark:border-white/5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white block">
                        Mensagem Pré-Preenchida do WhatsApp (Ativo Parcial)
                      </label>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Texto manual gerado quando o cliente clica para falar com a atendente sobre um profissional com atendimento parcial.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {["{especialista}", "{especialidade}", "{clinica}", "{paciente}", "{modalidade}"].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => inserirVariavelRedirect(tag)}
                          className="px-2 py-0.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors"
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3.5 bg-zinc-50/80 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
                    <textarea
                      value={campos.mensagem_redirecionamento_whatsapp || ""}
                      onChange={(e) =>
                        setCampos({ ...campos, mensagem_redirecionamento_whatsapp: e.target.value })
                      }
                      placeholder="Olá! Gostaria de agendar um atendimento de {especialidade} com {especialista} na clínica {clinica}..."
                      className="w-full bg-transparent text-xs font-medium text-zinc-900 dark:text-zinc-100 outline-none min-h-[90px] resize-none custom-scrollbar"
                    />
                  </div>
                </div>
              </section>

              {/* FORMA DE PAGAMENTO NO CHECKOUT */}
              <section className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-8 rounded-[2rem] shadow-sm space-y-5">
                <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-white/5 pb-4">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <CreditCard size={18} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                      Forma de Cobrança & Checkout de Pacientes Particulares
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Defina se o paciente paga automaticamente pelo Mercado Pago ou é direcionado ao WhatsApp da clínica para cobrança manual pela atendente.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                    Modo de Pagamento / Checkout:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        id: "online",
                        label: "Pagamento Online Automático",
                        desc: "Mercado Pago: Pix Copia e Cola, QR Code e Cartão de Crédito com conciliação automática."
                      },
                      {
                        id: "whatsapp",
                        label: "Cobrança Manual via WhatsApp",
                        desc: "O paciente é redirecionado ao WhatsApp da clínica com todos os dados preenchidos para a atendente gerar o Pix/cobrança e aprovar no painel."
                      },
                      {
                        id: "ambos",
                        label: "Híbrido / Ambos os Canais",
                        desc: "O paciente pode escolher entre pagar online instantaneamente ou falar com a atendente no WhatsApp."
                      }
                    ].map((opt) => {
                      const isSel = (campos.tipo_checkout_pagamento || "online") === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            playDopamineSound("select");
                            triggerHaptic("light");
                            setCampos((prev) => ({ ...prev, tipo_checkout_pagamento: opt.id }));
                          }}
                          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                            isSel
                              ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-zinc-950 dark:border-white shadow-md font-bold ring-2 ring-[#9FC131]"
                              : "bg-zinc-50/70 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black">{opt.label}</span>
                            {isSel && <Check size={14} className="text-[#9FC131]" />}
                          </div>
                          <p className="text-[11px] opacity-75 leading-relaxed">{opt.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* TEMPLATE DA MENSAGEM DE WHATSAPP PARA PAGAMENTO */}
                {((campos.tipo_checkout_pagamento || "online") === "whatsapp" || (campos.tipo_checkout_pagamento || "online") === "ambos") && (
                  <div className="pt-4 border-t border-zinc-100 dark:border-white/5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white block">
                          Mensagem de Cobrança Enviada ao WhatsApp da Atendente
                        </label>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          Texto gerado para o cliente enviar à atendente contendo resumo completo do agendamento para emissão da chave Pix / pagamento.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {[
                          "{nome}",
                          "{cpf}",
                          "{telefone}",
                          "{servico}",
                          "{especialista}",
                          "{especialidade}",
                          "{data}",
                          "{hora}",
                          "{valor}",
                          "{modalidade}",
                          "{clinica}"
                        ].map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => inserirVariavelPagamentoWhatsApp(tag)}
                            className="px-2 py-0.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors"
                          >
                            + {tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-3.5 bg-zinc-50/80 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
                      <textarea
                        value={campos.msg_pagamento_whatsapp || ""}
                        onChange={(e) =>
                          setCampos({ ...campos, msg_pagamento_whatsapp: e.target.value })
                        }
                        placeholder="Olá! Gostaria de confirmar meu agendamento na {clinica}:&#10;👤 Paciente: {nome}&#10;📄 CPF: {cpf}&#10;📱 Telefone: {telefone}&#10;🩺 Atendimento: {servico} ({modalidade})&#10;👨‍⚕️ Especialista: {especialista}&#10;📅 Data: {data} às {hora}&#10;💰 Valor da Entrada: {valor}&#10;&#10;Por favor, me envie a chave Pix ou link para pagamento e garantia da vaga!"
                        className="w-full bg-transparent text-xs font-medium text-zinc-900 dark:text-zinc-100 outline-none min-h-[110px] resize-none custom-scrollbar leading-relaxed"
                      />
                    </div>
                  </div>
                )}
              </section>
            </motion.div>
          )}

          {/* TAB 2: DESIGN, CORES & CONFIGURAÇÃO GLOBAL DE VISUALIZAÇÃO */}
          {subTab === "aparencia" && (
            <motion.div
              key="aparencia"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={spring}
              className="space-y-6"
            >
              {/* CONFIGURAÇÃO DE VISUALIZAÇÃO PADRÃO DO SISTEMA */}
              <section className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-7 rounded-[2rem] shadow-sm space-y-4">
                <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-white/5 pb-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <LayoutGrid size={18} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                      Modo de Visualização Padrão do Sistema
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Defina como todas as áreas (Corpo Clínico, Especialidades, Horários e Mensagens) devem ser abertas por padrão.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: "lista", label: "Visualização em Lista (Tabela)", desc: "Modo compacto e denso, ideal para visualização rápida de muitos itens", icon: List },
                    { id: "cards", label: "Visualização em Cards (Grade)", desc: "Modo visual em blocos modernos com destaque detalhado por card", icon: LayoutGrid }
                  ].map((m) => {
                    const isSel = (campos.tema?.visualizacao_padrao || "lista") === m.id;
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          const newTheme = { ...campos.tema, visualizacao_padrao: m.id };
                          setCampos((prev) => ({ ...prev, tema: newTheme }));
                          aplicarTemaEmTempoReal(newTheme);
                          setVisualizacaoMensagens(m.id);
                          if (showToast) showToast(`Visualização padrão definida como "${m.label.split(" ")[2] || m.label}".`);
                        }}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                          isSel
                            ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-zinc-950 dark:border-white shadow-sm font-bold ring-2 ring-[#9FC131]"
                            : "bg-zinc-50/60 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300"
                        }`}
                      >
                        <div className={`p-2 rounded-xl ${isSel ? "bg-white/20 dark:bg-black/20" : "bg-zinc-100 dark:bg-zinc-800"}`}>
                          <Icon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold flex items-center justify-between">
                            <span>{m.label}</span>
                            {isSel && <Check size={14} className="text-[#9FC131]" />}
                          </div>
                          <p className="text-[10.5px] opacity-75 mt-0.5 leading-tight">{m.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* SELETOR DE ESCOPO */}
              <section className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 rounded-[2rem] shadow-sm space-y-3">
                <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest block">
                  Escopo de Aplicação Visual
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: "ambos", label: "Geral (Ambos os Painéis)", desc: "Aplica no portal e no painel admin" },
                    { id: "paciente", label: "Portal do Paciente", desc: "Apenas para os clientes no agendamento" },
                    { id: "admin", label: "Painel Administrativo", desc: "Apenas para operadores da clínica" }
                  ].map((esc) => {
                    const isSel = (campos.tema?.escopo_tema || "ambos") === esc.id;
                    return (
                      <button
                        key={esc.id}
                        type="button"
                        onClick={() => {
                          const newTheme = { ...campos.tema, escopo_tema: esc.id };
                          setCampos((prev) => ({ ...prev, tema: newTheme }));
                          aplicarTemaEmTempoReal(newTheme);
                        }}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSel
                            ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-zinc-950 dark:border-white shadow-sm font-bold ring-2 ring-[#9FC131]"
                            : "bg-zinc-50/60 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300"
                        }`}
                      >
                        <span className="text-xs font-bold block">{esc.label}</span>
                        <span className="text-[10px] opacity-70 block mt-0.5">{esc.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <div className="grid lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 space-y-6">
                  {/* CORES DA MARCA */}
                  <section className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-7 rounded-[2rem] shadow-sm space-y-5">
                    <div>
                      <h3 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                        <Sliders size={18} strokeWidth={1.5} /> Paleta de Cores da Marca
                      </h3>
                      <p className="text-xs text-zinc-500 mt-1">
                        Personalize os tons primário e secundário de destaque. As cores são aplicadas em tempo real nos botões, ícones e destaques.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                        Paletas Recomendadas:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {PALETAS_PRESETS.map((p) => {
                          const isSelected =
                            campos.tema?.cor_primaria === p.prim &&
                            campos.tema?.cor_secundaria === p.sec;
                          return (
                            <button
                              key={p.nome}
                              type="button"
                              onClick={() => {
                                const newTheme = {
                                  ...campos.tema,
                                  cor_primaria: p.prim,
                                  cor_secundaria: p.sec
                                };
                                setCampos((prev) => ({ ...prev, tema: newTheme }));
                                aplicarTemaEmTempoReal(newTheme);
                              }}
                              className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                                isSelected
                                  ? "border-zinc-950 dark:border-white bg-zinc-100 dark:bg-zinc-800 ring-2 ring-[#9FC131]"
                                  : "border-zinc-200/70 dark:border-zinc-800 hover:border-zinc-300"
                              }`}
                            >
                              <div className="flex -space-x-1">
                                <div
                                  className="w-4 h-4 rounded-full border border-black/10"
                                  style={{ backgroundColor: p.prim }}
                                />
                                <div
                                  className="w-4 h-4 rounded-full border border-black/10"
                                  style={{ backgroundColor: p.sec }}
                                />
                              </div>
                              <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 truncate">
                                {p.nome.split(" ")[0]}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                          Cor Primária (Hexadecimal)
                        </label>
                        <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2">
                          <input
                            type="color"
                            value={campos.tema?.cor_primaria || "#9FC131"}
                            onChange={(e) => {
                              const val = e.target.value;
                              const newTheme = { ...campos.tema, cor_primaria: val };
                              setCampos((prev) => ({ ...prev, tema: newTheme }));
                              aplicarTemaEmTempoReal(newTheme);
                            }}
                            className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                          />
                          <input
                            type="text"
                            value={campos.tema?.cor_primaria || "#9FC131"}
                            onChange={(e) => {
                              const val = e.target.value;
                              const newTheme = { ...campos.tema, cor_primaria: val };
                              setCampos((prev) => ({ ...prev, tema: newTheme }));
                              aplicarTemaEmTempoReal(newTheme);
                            }}
                            className="w-full bg-transparent text-xs font-mono font-bold uppercase outline-none text-zinc-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                          Cor Secundária (Hexadecimal)
                        </label>
                        <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2">
                          <input
                            type="color"
                            value={campos.tema?.cor_secundaria || "#10B981"}
                            onChange={(e) => {
                              const val = e.target.value;
                              const newTheme = { ...campos.tema, cor_secundaria: val };
                              setCampos((prev) => ({ ...prev, tema: newTheme }));
                              aplicarTemaEmTempoReal(newTheme);
                            }}
                            className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                          />
                          <input
                            type="text"
                            value={campos.tema?.cor_secundaria || "#10B981"}
                            onChange={(e) => {
                              const val = e.target.value;
                              const newTheme = { ...campos.tema, cor_secundaria: val };
                              setCampos((prev) => ({ ...prev, tema: newTheme }));
                              aplicarTemaEmTempoReal(newTheme);
                            }}
                            className="w-full bg-transparent text-xs font-mono font-bold uppercase outline-none text-zinc-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                {/* PRÉ-VISUALIZAÇÃO */}
                <div className="lg:col-span-5">
                  <div className="sticky top-6 bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 rounded-[2rem] shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b border-zinc-100 dark:border-white/5 pb-3">
                      <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest">
                        Pré-visualização do Portal
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        {campos.tema?.escopo_tema || "ambos"}
                      </span>
                    </div>

                    <div className="p-5 border transition-all space-y-4 bg-zinc-50/70 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-black font-bold shadow-sm"
                            style={{
                              backgroundColor: campos.tema?.cor_primaria || "#9FC131"
                            }}
                          >
                            <Calendar size={18} strokeWidth={2} />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-xs text-zinc-950 dark:text-white">
                              Dr. Lucas Amorim
                            </h4>
                            <p className="text-[11px] text-zinc-500">Gastroenterologia</p>
                          </div>
                        </div>

                        <span
                          className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full"
                          style={{
                            color: campos.tema?.cor_secundaria || "#10B981",
                            backgroundColor: `${campos.tema?.cor_secundaria || "#10B981"}20`
                          }}
                        >
                          Disponível
                        </span>
                      </div>

                      <div className="p-3 bg-white dark:bg-black/60 rounded-xl border border-zinc-200/60 dark:border-zinc-800/80 flex items-center justify-between text-xs font-semibold">
                        <span className="text-zinc-500">Horário Selecionado:</span>
                        <span className="font-bold text-zinc-950 dark:text-white">09:30 h</span>
                      </div>

                      <button
                        type="button"
                        className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-black transition-transform shadow-md flex items-center justify-center gap-2 cursor-pointer"
                        style={{
                          backgroundColor: campos.tema?.cor_primaria || "#9FC131"
                        }}
                      >
                        <Check size={14} strokeWidth={2.5} /> Confirmar Atendimento
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: MENSAGENS WHATSAPP COM COLUNA DE DIAS E BOTÕES DE TESTE */}
          {subTab === "mensagens" && (
            <motion.div
              key="mensagens"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={spring}
              className="space-y-6"
            >
              <section className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-8 rounded-[2rem] shadow-sm space-y-6">
                {/* PAINEL DE FILTROS RESPONSIVO E ALINHADO */}
                <div className="p-4 bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <Filter size={13} /> Filtrar Automações de Mensagens
                    </span>
                    {(filterTextoMensagem || filterGatilho !== "Todos" || filterEspecialidade !== "Todas") && (
                      <button
                        type="button"
                        onClick={() => {
                          setFilterTextoMensagem("");
                          setFilterGatilho("Todos");
                          setFilterEspecialidade("Todas");
                          if (showToast) showToast("Filtros limpos!");
                        }}
                        className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-white font-bold underline cursor-pointer"
                      >
                        Limpar Filtros
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-6 space-y-1">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block ml-1">
                        Buscar na Mensagem / Especialidade / Alvo
                      </label>
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                          type="text"
                          value={filterTextoMensagem}
                          onChange={(e) => setFilterTextoMensagem(e.target.value)}
                          placeholder="Digite para filtrar por texto, variável ou alvo..."
                          className="w-full pl-8 pr-3 py-2 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none focus:border-[#9FC131] text-zinc-900 dark:text-white font-medium"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-3 space-y-1">
                      <CustomSelect
                        label="Gatilho de Disparo"
                        value={filterGatilho}
                        onChange={setFilterGatilho}
                        options={[{ value: "Todos", label: "Todos os Gatilhos" }, ...gatilhoOptions]}
                      />
                    </div>

                    <div className="md:col-span-3 space-y-1">
                      <CustomSelect
                        label="Alvo / Especialidade / Categoria"
                        value={filterEspecialidade}
                        onChange={setFilterEspecialidade}
                        options={[
                          { value: "Todas", label: "Todos os Alvos" },
                          ...listaOpcoesAlvo.filter((o) => o.value !== "Todas")
                        ]}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-100 dark:border-white/5 pb-4 gap-3">
                  <div>
                    <h3 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                      <MessageSquare size={17} strokeWidth={1.5} className="text-emerald-500" />
                      Automações de WhatsApp ({regrasFiltradas.length})
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Mensagens enviadas automaticamente para o WhatsApp dos pacientes com controle de dias, horários e webhooks.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* ALTERNADOR LISTA VS CARDS */}
                    <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200/60 dark:border-zinc-700">
                      <button
                        type="button"
                        onClick={() => setVisualizacaoMensagens("lista")}
                        className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          visualizacaoMensagens === "lista"
                            ? "bg-white dark:bg-black text-zinc-950 dark:text-white shadow-sm"
                            : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                        }`}
                        title="Visualização em Lista"
                      >
                        <List size={14} />
                        <span className="hidden sm:inline">Lista</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisualizacaoMensagens("cards")}
                        className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          visualizacaoMensagens === "cards"
                            ? "bg-white dark:bg-black text-zinc-950 dark:text-white shadow-sm"
                            : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                        }`}
                        title="Visualização em Cards"
                      >
                        <LayoutGrid size={14} />
                        <span className="hidden sm:inline">Cards</span>
                      </button>
                    </div>

                    <button
                      onClick={adicionarNovaRegra}
                      className="flex items-center gap-1.5 px-4 py-2 bg-zinc-950 dark:bg-white text-white dark:text-black text-xs font-bold rounded-xl transition-all shadow-sm min-h-[38px] cursor-pointer"
                    >
                      <Plus size={15} /> Nova Mensagem
                    </button>
                  </div>
                </div>

                {/* RENDERIZAÇÃO EM TABELA OU CARDS */}
                {regrasFiltradas.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-400 text-xs">
                    Nenhuma mensagem encontrada com os filtros selecionados.
                  </div>
                ) : visualizacaoMensagens === "lista" ? (
                  /* TABELA COMPLETA COM NOVA COLUNA DE DIAS / ANTECEDÊNCIA */
                  <div className="bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-800/70 text-zinc-400 font-bold uppercase tracking-wider text-[10px] select-none">
                            <th className="p-3.5 w-10 text-center">#</th>
                            <th
                              onClick={() => handleSortMensagens("gatilho")}
                              className="p-3.5 w-36 lg:w-44 cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors"
                            >
                              <div className="flex items-center gap-1">
                                <span>Gatilho</span>
                                {sortMensagens.key === "gatilho" ? (
                                  sortMensagens.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                                ) : (
                                  <ArrowUpDown size={11} className="opacity-40" />
                                )}
                              </div>
                            </th>
                            <th
                              onClick={() => handleSortMensagens("alvo")}
                              className="p-3.5 w-32 lg:w-36 cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors"
                            >
                              <div className="flex items-center gap-1">
                                <span>Alvo</span>
                                {sortMensagens.key === "alvo" ? (
                                  sortMensagens.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                                ) : (
                                  <ArrowUpDown size={11} className="opacity-40" />
                                )}
                              </div>
                            </th>
                            {/* NOVA COLUNA SOLICITADA: DIAS / TEMPO DE ENVIO / ANTECEDÊNCIA */}
                            <th
                              onClick={() => handleSortMensagens("dias")}
                              className="p-3.5 w-40 lg:w-48 cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors"
                            >
                              <div className="flex items-center gap-1">
                                <span>Dias / Tempo Envio</span>
                                {sortMensagens.key === "dias" ? (
                                  sortMensagens.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                                ) : (
                                  <ArrowUpDown size={11} className="opacity-40" />
                                )}
                              </div>
                            </th>
                            <th
                              onClick={() => handleSortMensagens("mensagem")}
                              className="p-3.5 cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors"
                            >
                              <div className="flex items-center gap-1">
                                <span>Prévia do Texto</span>
                                {sortMensagens.key === "mensagem" ? (
                                  sortMensagens.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                                ) : (
                                  <ArrowUpDown size={11} className="opacity-40" />
                                )}
                              </div>
                            </th>
                            <th className="p-3.5 w-32 hidden lg:table-cell text-zinc-400">
                              <span>Modificado</span>
                            </th>
                            <th className="p-3.5 w-52 text-right whitespace-nowrap pr-4">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
                          {regrasFiltradas.map((regra, idx) => {
                            const isExpanded = editingRegraId === regra.id;
                            const badgeAlvo = obterBadgeAlvo(regra.alvo || regra.especialidade);
                            const infoTempo = formatarTempoRegra(regra);

                            return (
                              <React.Fragment key={regra.id}>
                                <tr className="hover:bg-white dark:hover:bg-zinc-800/50 transition-colors group">
                                  <td className="p-3.5 text-center font-bold text-zinc-400 font-mono text-[11px]">
                                    {idx + 1}
                                  </td>

                                  <td className="p-3.5">
                                    <div className="space-y-1">
                                      <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold text-[10px] border border-blue-200/50 block truncate max-w-[140px]">
                                        {gatilhoOptions.find((g) => g.value === regra.gatilho)?.label?.split("(")[0]?.trim() || regra.gatilho}
                                      </span>
                                      
                                      <div className="flex items-center gap-1 flex-wrap">
                                        {regra.tipo_envio === "webhook" ? (
                                          <span className="px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[8.5px] font-extrabold uppercase inline-flex items-center gap-1 border border-amber-200/40">
                                            <Zap size={8} /> Webhook
                                          </span>
                                        ) : (
                                          <span className="px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[8.5px] font-extrabold uppercase inline-flex items-center gap-1 border border-emerald-200/40">
                                            <MessageSquare size={8} /> WhatsApp
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>

                                  <td className="p-3.5 font-bold text-zinc-900 dark:text-white">
                                    <span
                                      className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border inline-block truncate max-w-[130px] ${badgeAlvo.badgeClass}`}
                                      title={badgeAlvo.texto}
                                    >
                                      {badgeAlvo.texto}
                                    </span>
                                  </td>

                                  {/* CÉLULA DA NOVA COLUNA DIAS / TEMPO */}
                                  <td className="p-3.5">
                                    <span
                                      className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold border inline-flex items-center gap-1 truncate max-w-[170px] ${infoTempo.badgeClass}`}
                                      title={infoTempo.texto}
                                    >
                                      <Clock3 size={11} />
                                      <span>{infoTempo.resumo}</span>
                                    </span>
                                  </td>

                                  <td className="p-3.5 text-zinc-600 dark:text-zinc-400 text-xs">
                                    <span
                                      title={regra.mensagem}
                                      className="truncate block max-w-[180px] sm:max-w-xs md:max-w-sm lg:max-w-md xl:max-w-lg font-sans text-[11.5px] leading-relaxed cursor-help"
                                    >
                                      {regra.mensagem}
                                    </span>
                                  </td>

                                  <td className="p-3.5 hidden lg:table-cell text-zinc-400 text-[10px]">
                                    {regra.alterado_em ? (
                                      <div>
                                        <span className="font-semibold text-zinc-700 dark:text-zinc-300 block">
                                          {new Date(regra.alterado_em).toLocaleDateString("pt-BR")}
                                        </span>
                                        <span className="opacity-70 block truncate max-w-[100px]">
                                          @{regra.alterado_por || "admin"}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-zinc-400 italic">Padrão da Clínica</span>
                                    )}
                                  </td>

                                  {/* BOTÕES DE AÇÃO: TESTAR, EDITAR, DUPLICAR, EXCLUIR */}
                                  <td className="p-3.5 text-right whitespace-nowrap pr-4">
                                    <div className="flex items-center justify-end gap-1">
                                      {/* BOTÃO TESTAR */}
                                      <button
                                        type="button"
                                        onClick={() => handleAbrirModalTeste(regra)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-black transition-all cursor-pointer shadow-xs"
                                        title={regra.tipo_envio === "webhook" ? "Testar Webhook" : "Testar Template WhatsApp"}
                                      >
                                        <Play size={10} fill="currentColor" />
                                        <span>Testar</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => setEditingRegraId(isExpanded ? null : regra.id)}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                                          isExpanded
                                            ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-zinc-950 dark:border-white shadow-xs"
                                            : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border-zinc-200/80 dark:border-zinc-700"
                                        }`}
                                        title={isExpanded ? "Recolher edição" : "Editar mensagem"}
                                      >
                                        <Pencil size={11} /> {isExpanded ? "Recolher" : "Editar"}
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => duplicarRegra(regra)}
                                        className="p-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700 rounded-lg transition-colors cursor-pointer"
                                        title="Duplicar esta mensagem"
                                      >
                                        <Copy size={12} />
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => removerRegra(regra.id)}
                                        className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-red-200/60"
                                        title="Excluir mensagem"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>

                                {/* PAINEL EXPANSÍVEL DE EDIÇÃO INLINE */}
                                {isExpanded && (
                                  <tr>
                                    <td colSpan={7} className="p-0 border-t border-zinc-200/80 dark:border-zinc-800">
                                      <div className="p-5 bg-white dark:bg-[#0e0e12] space-y-4 shadow-inner">
                                        <div className="grid lg:grid-cols-2 gap-5">
                                          <div className="space-y-3">
                                            <CustomSelect
                                              label="Alvo da Mensagem (Especialidade, Categoria ou Modalidade)"
                                              value={normalizarAlvoValue(regra.alvo || regra.especialidade, listaOpcoesAlvo)}
                                              onChange={(v) => atualizarRegra(regra.id, "alvo", v)}
                                              options={listaOpcoesAlvo}
                                            />

                                            <div className="grid sm:grid-cols-2 gap-3">
                                              <CustomSelect
                                                label="Gatilho de Disparo"
                                                value={regra.gatilho}
                                                onChange={(v) => atualizarRegra(regra.id, "gatilho", v)}
                                                options={gatilhoOptions}
                                              />

                                              <CustomSelect
                                                label="Tipo de Disparo"
                                                value={regra.tipo_envio || "whatsapp"}
                                                onChange={(v) => atualizarRegra(regra.id, "tipo_envio", v)}
                                                options={tipoEnvioOptions}
                                              />
                                            </div>

                                            {regra.tipo_envio === "webhook" && (
                                              <TextInput
                                                label="URL de Webhook Específica (Opcional)"
                                                placeholder="https://n8n.exemplo.com/webhook/..."
                                                value={regra.url_webhook_customizada || ""}
                                                onChange={(e) => atualizarRegra(regra.id, "url_webhook_customizada", e.target.value)}
                                              />
                                            )}

                                            {/* CONFIGURAÇÃO DE TEMPO PARA PÓS-ATENDIMENTO */}
                                            {regra.gatilho === "pos_atendimento" && (
                                              <div className="p-3.5 bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/30 rounded-2xl space-y-3">
                                                <div className="flex items-center justify-between">
                                                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                                                    <Clock3 size={13} /> Tempo de Disparo Pós-Atendimento
                                                  </span>
                                                  <span className="text-[10px] text-zinc-400 font-medium">
                                                    {regra.pos_base === "inicio" ? "A partir do início" : "A partir do término"}
                                                  </span>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                                  <CustomSelect
                                                    label="Referência"
                                                    value={regra.pos_base || "termino"}
                                                    onChange={(v) => atualizarRegra(regra.id, "pos_base", v)}
                                                    options={[
                                                      { value: "termino", label: "Após o Término da Consulta/Exame" },
                                                      { value: "inicio", label: "Após o Horário de Início" }
                                                    ]}
                                                  />

                                                  <CustomSelect
                                                    label="Unidade de Tempo"
                                                    value={regra.pos_unidade || "minutos"}
                                                    onChange={(v) => atualizarRegra(regra.id, "pos_unidade", v)}
                                                    options={[
                                                      { value: "minutos", label: "Minutos" },
                                                      { value: "horas", label: "Horas" },
                                                      { value: "dias", label: "Dias" }
                                                    ]}
                                                  />

                                                  <TextInput
                                                    type="number"
                                                    label="Quantidade / Tempo"
                                                    placeholder="Ex: 30"
                                                    value={regra.pos_tempo ?? (regra.dias_depois || 30)}
                                                    onChange={(e) =>
                                                      atualizarRegra(regra.id, "pos_tempo", parseInt(e.target.value, 10) || 0)
                                                    }
                                                  />
                                                </div>

                                                {regra.pos_unidade === "dias" && (
                                                  <div className="pt-2 border-t border-emerald-500/20">
                                                    <TextInput
                                                      type="time"
                                                      label="Horário de Envio no Dia Programado"
                                                      value={regra.hora_envio || "08:00"}
                                                      onChange={(e) => atualizarRegra(regra.id, "hora_envio", e.target.value)}
                                                    />
                                                  </div>
                                                )}
                                              </div>
                                            )}

                                            {/* CONFIGURAÇÃO DE TEMPO PARA LEMBRETE ANTES DO ATENDIMENTO */}
                                            {regra.gatilho === "agendado" && (
                                              <div className="p-3.5 bg-blue-500/5 dark:bg-blue-950/20 border border-blue-500/30 rounded-2xl space-y-3">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                                                  <Clock3 size={13} /> Tempo de Disparo do Lembrete
                                                </span>

                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                                  <CustomSelect
                                                    label="Unidade"
                                                    value={regra.unidade_antes || "dias"}
                                                    onChange={(v) => atualizarRegra(regra.id, "unidade_antes", v)}
                                                    options={[
                                                      { value: "dias", label: "Dias Antes" },
                                                      { value: "horas", label: "Horas Antes" }
                                                    ]}
                                                  />

                                                  <TextInput
                                                    type="number"
                                                    label="Quantidade"
                                                    value={regra.dias_antes ?? 1}
                                                    onChange={(e) =>
                                                      atualizarRegra(regra.id, "dias_antes", parseInt(e.target.value, 10) || 1)
                                                    }
                                                  />

                                                  <TextInput
                                                    type="time"
                                                    label="Hora Fixo Envio"
                                                    value={regra.hora_envio || "08:00"}
                                                    onChange={(e) =>
                                                      atualizarRegra(regra.id, "hora_envio", e.target.value)
                                                    }
                                                  />
                                                </div>
                                              </div>
                                            )}

                                            {/* FILTROS DE REFINAMENTO OPCIONAL */}
                                            <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-3">
                                              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                                                <Filter size={12} /> Refinamento Adicional de Filtros (Opcional)
                                              </span>

                                              <div className="grid sm:grid-cols-2 gap-3">
                                                <CustomSelect
                                                  label="Filtrar por Modalidade"
                                                  value={regra.filtro_modalidade || "todas"}
                                                  onChange={(v) => atualizarRegra(regra.id, "filtro_modalidade", v)}
                                                  options={[
                                                    { value: "todas", label: "Todas as Modalidades" },
                                                    { value: "Particular", label: "Apenas Particular" },
                                                    { value: "Convênio", label: "Apenas Convênio" },
                                                    { value: "Retorno", label: "Apenas Retorno" }
                                                  ]}
                                                />

                                                <div className="flex items-center justify-between pt-5 px-2">
                                                  <ToggleSwitch
                                                    checked={Boolean(regra.filtrar_enfermidade)}
                                                    onChange={(v) => atualizarRegra(regra.id, "filtrar_enfermidade", v)}
                                                    label="Filtrar por Enfermidade"
                                                  />
                                                </div>
                                              </div>

                                              {regra.filtrar_enfermidade && (
                                                <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800">
                                                  <TextInput
                                                    label="Nome da Enfermidade Alvo"
                                                    placeholder="Ex: Refluxo, Gastrite, Hipertensão..."
                                                    value={regra.enfermidade_alvo || ""}
                                                    onChange={(e) => atualizarRegra(regra.id, "enfermidade_alvo", e.target.value)}
                                                  />
                                                </div>
                                              )}
                                            </div>
                                          </div>

                                          <div className="space-y-2 flex flex-col justify-between">
                                            <div>
                                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">
                                                Inserir Variável:
                                              </span>
                                              <div className="flex flex-wrap gap-1">
                                                {variaveisDisponiveis.map((v) => (
                                                  <button
                                                    key={v.tag}
                                                    type="button"
                                                    onClick={() => inserirVariavelNaRegra(regra.id, v.tag)}
                                                    className="px-2 py-0.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors"
                                                    title={v.desc}
                                                  >
                                                    + {v.tag}
                                                  </button>
                                                ))}
                                              </div>
                                            </div>

                                            <div className="bg-emerald-50/70 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40">
                                              <textarea
                                                value={regra.mensagem}
                                                onChange={(e) =>
                                                  atualizarRegra(regra.id, "mensagem", e.target.value)
                                                }
                                                placeholder="Texto da mensagem enviada..."
                                                className="w-full bg-transparent text-xs font-medium text-zinc-900 dark:text-zinc-100 outline-none min-h-[85px] resize-none custom-scrollbar"
                                              />
                                            </div>

                                            <div className="flex justify-end gap-2 pt-1">
                                              <button
                                                type="button"
                                                onClick={() => handleAbrirModalTeste(regra)}
                                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer"
                                              >
                                                <Play size={12} fill="currentColor" />
                                                <span>Testar Esta Mensagem</span>
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  /* VISUALIZAÇÃO EM CARDS COMPLETOS COM COLUNA DE DIAS E BOTÃO DE TESTE */
                  <div className="space-y-5">
                    {regrasFiltradas.map((regra, index) => {
                      const infoTempo = formatarTempoRegra(regra);
                      return (
                        <motion.div
                          key={regra.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          className="bg-zinc-50/60 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 relative flex flex-col lg:flex-row gap-6 shadow-sm"
                        >
                          <div className="absolute top-4 right-4 flex items-center gap-1.5">
                            {/* BOTÃO TESTAR NO CARD */}
                            <button
                              type="button"
                              onClick={() => handleAbrirModalTeste(regra)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-black flex items-center gap-1 shadow-xs cursor-pointer"
                              title="Testar envio"
                            >
                              <Play size={10} fill="currentColor" />
                              <span>Testar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => duplicarRegra(regra)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                              title="Duplicar esta mensagem"
                            >
                              <Copy size={15} />
                            </button>
                            <button
                              onClick={() => removerRegra(regra.id)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                              title="Excluir mensagem"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>

                          <div className="flex-1 space-y-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="w-5 h-5 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-black flex items-center justify-center text-[10px] font-bold">
                                {index + 1}
                              </span>
                              <h4 className="font-bold text-xs text-zinc-950 dark:text-white">
                                Critérios de Disparo & Alvo
                              </h4>
                              {/* BADGE DE DIAS / ANTECEDÊNCIA */}
                              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border inline-flex items-center gap-1 ${infoTempo.badgeClass}`}>
                                <Clock3 size={11} /> {infoTempo.texto}
                              </span>
                            </div>

                            <CustomSelect
                              label="Alvo da Mensagem (Especialidade, Categoria ou Modalidade)"
                              value={normalizarAlvoValue(regra.alvo || regra.especialidade, listaOpcoesAlvo)}
                              onChange={(v) => atualizarRegra(regra.id, "alvo", v)}
                              options={listaOpcoesAlvo}
                            />

                            <div className="grid sm:grid-cols-2 gap-3">
                              <CustomSelect
                                label="Gatilho"
                                value={regra.gatilho}
                                onChange={(v) => atualizarRegra(regra.id, "gatilho", v)}
                                options={gatilhoOptions}
                              />

                              <CustomSelect
                                label="Tipo de Disparo"
                                value={regra.tipo_envio || "whatsapp"}
                                onChange={(v) => atualizarRegra(regra.id, "tipo_envio", v)}
                                options={tipoEnvioOptions}
                              />
                            </div>

                            {regra.tipo_envio === "webhook" && (
                              <TextInput
                                label="URL de Webhook Específica (Opcional)"
                                placeholder="https://n8n.exemplo.com/webhook/..."
                                value={regra.url_webhook_customizada || ""}
                                onChange={(e) => atualizarRegra(regra.id, "url_webhook_customizada", e.target.value)}
                              />
                            )}

                            {/* PÓS-ATENDIMENTO NO CARD */}
                            {regra.gatilho === "pos_atendimento" && (
                              <div className="p-3.5 bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/30 rounded-2xl space-y-3">
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                                  <Clock3 size={13} /> Configuração de Disparo Pós-Atendimento
                                </span>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                  <CustomSelect
                                    label="Referência"
                                    value={regra.pos_base || "termino"}
                                    onChange={(v) => atualizarRegra(regra.id, "pos_base", v)}
                                    options={[
                                      { value: "termino", label: "Após Término da Consulta/Exame" },
                                      { value: "inicio", label: "Após Horário de Início" }
                                    ]}
                                  />

                                  <CustomSelect
                                    label="Unidade"
                                    value={regra.pos_unidade || "minutos"}
                                    onChange={(v) => atualizarRegra(regra.id, "pos_unidade", v)}
                                    options={[
                                      { value: "minutos", label: "Minutos" },
                                      { value: "horas", label: "Horas" },
                                      { value: "dias", label: "Dias" }
                                    ]}
                                  />

                                  <TextInput
                                    type="number"
                                    label="Tempo"
                                    value={regra.pos_tempo ?? (regra.dias_depois || 30)}
                                    onChange={(e) =>
                                      atualizarRegra(regra.id, "pos_tempo", parseInt(e.target.value, 10) || 0)
                                    }
                                  />
                                </div>

                                {regra.pos_unidade === "dias" && (
                                  <TextInput
                                    type="time"
                                    label="Horário Fixo de Envio"
                                    value={regra.hora_envio || "08:00"}
                                    onChange={(e) => atualizarRegra(regra.id, "hora_envio", e.target.value)}
                                  />
                                )}
                              </div>
                            )}

                            {/* LEMBRETE NO CARD */}
                            {regra.gatilho === "agendado" && (
                              <div className="p-3.5 bg-blue-500/5 dark:bg-blue-950/20 border border-blue-500/30 rounded-2xl space-y-3">
                                <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                                  <Clock3 size={13} /> Tempo do Lembrete
                                </span>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                  <CustomSelect
                                    label="Unidade"
                                    value={regra.unidade_antes || "dias"}
                                    onChange={(v) => atualizarRegra(regra.id, "unidade_antes", v)}
                                    options={[
                                      { value: "dias", label: "Dias Antes" },
                                      { value: "horas", label: "Horas Antes" }
                                    ]}
                                  />

                                  <TextInput
                                    type="number"
                                    label="Quantidade"
                                    value={regra.dias_antes ?? 1}
                                    onChange={(e) =>
                                      atualizarRegra(regra.id, "dias_antes", parseInt(e.target.value, 10) || 1)
                                    }
                                  />

                                  <TextInput
                                    type="time"
                                    label="Hora Envio"
                                    value={regra.hora_envio || "08:00"}
                                    onChange={(e) =>
                                      atualizarRegra(regra.id, "hora_envio", e.target.value)
                                    }
                                  />
                                </div>
                              </div>
                            )}

                            {/* REFINAMENTOS NO CARD */}
                            <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-3">
                              <CustomSelect
                                label="Filtrar por Modalidade (Opcional)"
                                value={regra.filtro_modalidade || "todas"}
                                onChange={(v) => atualizarRegra(regra.id, "filtro_modalidade", v)}
                                options={[
                                  { value: "todas", label: "Todas as Modalidades" },
                                  { value: "Particular", label: "Apenas Particular" },
                                  { value: "Convênio", label: "Apenas Convênio" },
                                  { value: "Retorno", label: "Apenas Retorno" }
                                ]}
                              />

                              <div className="flex items-center justify-between pt-1">
                                <ToggleSwitch
                                  checked={Boolean(regra.filtrar_enfermidade)}
                                  onChange={(v) => atualizarRegra(regra.id, "filtrar_enfermidade", v)}
                                  label="Filtrar por Enfermidade"
                                />
                              </div>

                              {regra.filtrar_enfermidade && (
                                <TextInput
                                  label="Nome da Enfermidade"
                                  placeholder="Ex: Refluxo..."
                                  value={regra.enfermidade_alvo || ""}
                                  onChange={(e) => atualizarRegra(regra.id, "enfermidade_alvo", e.target.value)}
                                />
                              )}
                            </div>
                          </div>

                          <div className="flex-1 flex flex-col justify-between space-y-3">
                            <div>
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">
                                Variáveis Disponíveis:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {variaveisDisponiveis.map((v) => (
                                  <button
                                    key={v.tag}
                                    type="button"
                                    onClick={() => inserirVariavelNaRegra(regra.id, v.tag)}
                                    className="px-2 py-0.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded text-[10px] font-mono font-bold cursor-pointer"
                                    title={v.desc}
                                  >
                                    + {v.tag}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="bg-emerald-50/70 dark:bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40">
                              <textarea
                                value={regra.mensagem}
                                onChange={(e) =>
                                  atualizarRegra(regra.id, "mensagem", e.target.value)
                                }
                                placeholder="Texto da mensagem..."
                                className="w-full bg-transparent text-xs font-medium text-zinc-900 dark:text-zinc-100 outline-none min-h-[100px] resize-none custom-scrollbar"
                              />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </section>
            </motion.div>
          )}

          {/* TAB 4: HISTÓRICO & AUDITORIA */}
          {subTab === "historico_mensagens" && (
            <motion.div
              key="historico_mensagens"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={spring}
              className="space-y-6"
            >
              <section className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-8 rounded-[2rem] shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-zinc-100 dark:border-white/5 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                      <MessageSquare size={18} strokeWidth={1.5} className="text-emerald-500" />
                      Histórico e Auditoria de Disparos WhatsApp ({historicoFiltrado.length})
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">
                      Auditoria de disparos de mensagens WhatsApp em tempo real com filtros por paciente e data.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={carregarHistorico}
                    disabled={loadingHistorico}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold rounded-xl transition-all min-h-[38px] cursor-pointer"
                  >
                    {loadingHistorico ? "Atualizando..." : "Atualizar Logs"}
                  </button>
                </div>

                {/* PAINEL DE FILTROS AVANÇADOS DO HISTÓRICO */}
                <div className="p-4 bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Filter size={13} /> Filtrar Histórico & Disparos
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* FILTRO POR PACIENTE / WHATSAPP */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block ml-1">
                        Paciente / WhatsApp
                      </label>
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                          type="text"
                          value={filtroHistoricoPaciente}
                          onChange={(e) => setFiltroHistoricoPaciente(e.target.value)}
                          placeholder="Buscar por nome ou número..."
                          className="w-full pl-8 pr-3 py-2 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none focus:border-[#9FC131] text-zinc-900 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* FILTRO POR DATA */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block ml-1">
                        Data do Atendimento / Disparo
                      </label>
                      <input
                        type="date"
                        value={filtroHistoricoData}
                        onChange={(e) => setFiltroHistoricoData(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none focus:border-[#9FC131] text-zinc-900 dark:text-white [color-scheme:dark]"
                      />
                    </div>

                    {/* FILTRO POR STATUS */}
                    <div className="space-y-1">
                      <CustomSelect
                        label="Status do Disparo"
                        value={filtroHistoricoStatus}
                        onChange={setFiltroHistoricoStatus}
                        options={[
                          { value: "todos", label: "Todos os Status" },
                          { value: "enviada", label: "Enviadas" },
                          { value: "cancelada", label: "Canceladas / Cancelamento" },
                          { value: "pendente", label: "Pendentes na Fila" },
                          { value: "falha", label: "Falhas de Envio" },
                          { value: "rascunho", label: "Rascunhos ERP" }
                        ]}
                      />
                    </div>

                    {/* FILTRO POR GATILHO */}
                    <div className="space-y-1">
                      <CustomSelect
                        label="Gatilho"
                        value={filtroHistoricoGatilho}
                        onChange={setFiltroHistoricoGatilho}
                        options={[
                          { value: "todos", label: "Todos os Gatilhos" },
                          ...gatilhoOptions
                        ]}
                      />
                    </div>
                  </div>

                  {(filtroHistoricoPaciente || filtroHistoricoData || filtroHistoricoStatus !== "todos" || filtroHistoricoGatilho !== "todos") && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setFiltroHistoricoPaciente("");
                          setFiltroHistoricoData("");
                          setFiltroHistoricoStatus("todos");
                          setFiltroHistoricoGatilho("todos");
                          if (showToast) showToast("Filtros limpos!");
                        }}
                        className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-white font-bold underline cursor-pointer"
                      >
                        Limpar todos os filtros
                      </button>
                    </div>
                  )}
                </div>

                {loadingHistorico ? (
                  <div className="py-16 text-center text-xs text-zinc-400">
                    Carregando histórico de mensagens...
                  </div>
                ) : historicoFiltrado.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-400 text-xs">
                    Nenhuma mensagem registrada na fila com os filtros selecionados.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/40 dark:bg-black/20">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 font-bold uppercase tracking-wider text-zinc-400 text-[10px] select-none">
                          <th
                            onClick={() => handleSortHistorico("status")}
                            className="p-3.5 cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors"
                          >
                            <div className="flex items-center gap-1">
                              <span>Status</span>
                              {sortHistorico.key === "status" ? (
                                sortHistorico.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                              ) : (
                                <ArrowUpDown size={11} className="opacity-40" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortHistorico("paciente")}
                            className="p-3.5 cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors"
                          >
                            <div className="flex items-center gap-1">
                              <span>Paciente</span>
                              {sortHistorico.key === "paciente" ? (
                                sortHistorico.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                              ) : (
                                <ArrowUpDown size={11} className="opacity-40" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortHistorico("whatsapp")}
                            className="p-3.5 cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors"
                          >
                            <div className="flex items-center gap-1">
                              <span>WhatsApp</span>
                              {sortHistorico.key === "whatsapp" ? (
                                sortHistorico.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                              ) : (
                                <ArrowUpDown size={11} className="opacity-40" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortHistorico("gatilho")}
                            className="p-3.5 cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors"
                          >
                            <div className="flex items-center gap-1">
                              <span>Gatilho</span>
                              {sortHistorico.key === "gatilho" ? (
                                sortHistorico.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                              ) : (
                                <ArrowUpDown size={11} className="opacity-40" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortHistorico("data_hora")}
                            className="p-3.5 cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors"
                          >
                            <div className="flex items-center gap-1">
                              <span>Data / Hora</span>
                              {sortHistorico.key === "data_hora" ? (
                                sortHistorico.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                              ) : (
                                <ArrowUpDown size={11} className="opacity-40" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortHistorico("mensagem")}
                            className="p-3.5 cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors"
                          >
                            <div className="flex items-center gap-1">
                              <span>Conteúdo</span>
                              {sortHistorico.key === "mensagem" ? (
                                sortHistorico.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                              ) : (
                                <ArrowUpDown size={11} className="opacity-40" />
                              )}
                            </div>
                          </th>
                          <th className="p-3.5 text-right whitespace-nowrap">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-medium">
                        {historicoFiltrado.map((item) => {
                          const isCancelado =
                            item.status === "cancelado" ||
                            item.status === "cancelada" ||
                            item.gatilho === "cancelado";

                          const isEnviado =
                            !isCancelado && (item.status === "enviado" || item.status === "enviada");

                          const isFalha = item.status === "falha" || item.status === "erro";
                          const isRascunho = item.status === "rascunho";
                          const isPendente = !isCancelado && !isEnviado && !isFalha && !isRascunho;

                          const statusLabel = isCancelado
                            ? "Cancelada"
                            : isEnviado
                            ? "Enviada"
                            : isFalha
                            ? "Falha"
                            : isRascunho
                            ? "Rascunho"
                            : "Pendente";

                          const statusBadgeClass = isCancelado
                            ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/50"
                            : isEnviado
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/50"
                            : isFalha
                            ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200/50"
                            : isRascunho
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/50"
                            : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/50";

                          return (
                            <tr key={item.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40 transition-colors">
                              <td className="p-3.5">
                                <div className="flex flex-col gap-1">
                                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusBadgeClass}`}>
                                    {statusLabel}
                                  </span>
                                  {item.tipo_envio === "webhook" ? (
                                    <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[9px] font-extrabold uppercase inline-flex items-center gap-1 border border-amber-200/40">
                                      <Zap size={9} /> Webhook
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[9px] font-extrabold uppercase inline-flex items-center gap-1 border border-emerald-200/40">
                                      <MessageSquare size={9} /> WhatsApp
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3.5 font-bold text-zinc-900 dark:text-white">
                                <div>{item.nome_paciente || "Paciente"}</div>
                                {item.resposta_recebida && (
                                  <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-extrabold text-[10px]">
                                    💬 Resposta: {item.resposta_recebida}
                                  </span>
                                )}
                              </td>
                              <td className="p-3.5 font-mono text-zinc-600 dark:text-zinc-400">
                                {item.telefone_whatsapp || "-"}
                              </td>
                              <td className="p-3.5 text-zinc-700 dark:text-zinc-300 font-semibold">
                                {gatilhoOptions.find((g) => g.value === item.gatilho)?.label || item.gatilho}
                              </td>
                              <td className="p-3.5 text-zinc-500 text-[11px]">
                                {item.data_hora_programada
                                  ? new Date(item.data_hora_programada).toLocaleString("pt-BR")
                                  : item.created_at
                                  ? new Date(item.created_at).toLocaleString("pt-BR")
                                  : "-"}
                              </td>
                              <td className="p-3.5 max-w-xs truncate text-zinc-600 dark:text-zinc-400">
                                <span title={item.mensagem} className="truncate block">
                                  {item.mensagem}
                                </span>
                              </td>

                              {/* BOTÕES VER E DISPARAR */}
                              <td className="p-3.5 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setMensagemVisualizar(item)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                                    title="Visualizar mensagem"
                                  >
                                    <Eye size={12} /> Ver
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDispararAgora(item.id)}
                                    disabled={disparandoId === item.id}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer shadow-xs"
                                    title="Disparar mensagem para o WhatsApp"
                                  >
                                    <Send size={11} /> {disparandoId === item.id ? "Enviando..." : "Disparar"}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* MODAL DE VISUALIZAÇÃO */}
              <AnimatePresence>
                {mensagemVisualizar && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                  >
                    <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
                      <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
                        <h4 className="font-bold text-sm text-zinc-950 dark:text-white">
                          Mensagem para {mensagemVisualizar.nome_paciente}
                        </h4>
                        <button
                          type="button"
                          onClick={() => setMensagemVisualizar(null)}
                          className="text-zinc-400 hover:text-zinc-950 dark:hover:text-white font-bold cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 text-xs font-mono whitespace-pre-wrap text-zinc-800 dark:text-zinc-200 max-h-80 overflow-y-auto">
                        {mensagemVisualizar.mensagem}
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setMensagemVisualizar(null)}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                        >
                          Fechar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleDispararAgora(mensagemVisualizar.id);
                            setMensagemVisualizar(null);
                          }}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                        >
                          Disparar Novamente
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MODAL INTERATIVO DE TESTE DE AUTOMAÇÃO WHATSAPP & WEBHOOK */}
      <AnimatePresence>
        {testModalRegra && (
          <div
            className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-md p-4 flex items-center justify-center"
            onClick={() => setTestModalRegra(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#121216] backdrop-blur-3xl rounded-[2.5rem] p-6 md:p-8 max-w-xl w-full shadow-2xl border border-zinc-200/80 dark:border-white/10 space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-start border-b border-zinc-100 dark:border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm">
                    {testModalRegra.tipo_envio === "webhook" ? <Zap size={22} /> : <MessageSquare size={22} />}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-zinc-950 dark:text-white tracking-tight flex items-center gap-2">
                      <span>Testar {testModalRegra.tipo_envio === "webhook" ? "Webhook" : "Mensagem WhatsApp"}</span>
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Gatilho: <strong>{testModalRegra.gatilho}</strong> • Alvo: <strong>{limparNomeAlvo(testModalRegra.alvo || testModalRegra.especialidade)}</strong>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setTestModalRegra(null)}
                  className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-full cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* DADOS E PREVIA DO DISPARO */}
              <div className="space-y-3 text-xs">
                <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-zinc-600 dark:text-zinc-400">Tempo / Dias:</span>
                    <span className="font-black text-zinc-900 dark:text-zinc-100">{formatarTempoRegra(testModalRegra).texto}</span>
                  </div>
                  {testModalRegra.tipo_envio === "webhook" && testModalRegra.url_webhook_customizada && (
                    <div className="text-[11px] pt-1 border-t border-zinc-200/50 dark:border-zinc-800/60">
                      <span className="font-bold text-zinc-600 dark:text-zinc-400 block">URL do Webhook:</span>
                      <span className="font-mono text-[10px] text-zinc-500 break-all">{testModalRegra.url_webhook_customizada}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 block ml-1">
                    Número do WhatsApp de Teste (com DDD)
                  </label>
                  <input
                    type="text"
                    value={testPhoneNumber}
                    onChange={(e) => setTestPhoneNumber(e.target.value)}
                    placeholder="Ex: 5583999999999"
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-black/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono outline-none focus:border-[#9FC131] text-zinc-900 dark:text-white"
                  />
                  <p className="text-[10.5px] text-zinc-400 ml-1">
                    Informe seu próprio WhatsApp ou o número corporativo para receber o teste.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 block ml-1">
                    Prévia do Conteúdo Processado
                  </span>
                  <div className="p-4 bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/30 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap text-zinc-800 dark:text-zinc-200 font-sans">
                    {testModalRegra.mensagem}
                  </div>
                </div>

                {testRuleResult && (
                  <div className={`p-4 rounded-2xl text-xs font-semibold flex flex-col gap-1 border ${
                    testRuleResult.success
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                      : "bg-red-500/15 border-red-500/30 text-red-800 dark:text-red-300"
                  }`}>
                    <div className="flex items-center gap-2 font-bold">
                      {testRuleResult.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                      <span>{testRuleResult.message}</span>
                    </div>
                    {testRuleResult.details?.resposta && (
                      <p className="font-mono text-[10.5px] mt-1 opacity-80 break-all">
                        Resposta do Servidor: {testRuleResult.details.resposta}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* BOTÕES DO MODAL */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setTestModalRegra(null)}
                  disabled={isTestingRule}
                  className="min-h-[42px] px-5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 font-bold text-xs uppercase text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={handleExecutarTesteRegra}
                  disabled={isTestingRule || !testPhoneNumber.trim()}
                  className="min-h-[42px] px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase rounded-xl shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isTestingRule ? <Activity size={14} className="animate-spin" /> : <Play size={12} fill="currentColor" />}
                  <span>{isTestingRule ? "Enviando Teste..." : "Disparar Teste Agora"}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
