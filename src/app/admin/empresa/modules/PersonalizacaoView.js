"use client";

import { useState, useEffect, useMemo } from "react";
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
  HeartPulse
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
  actionDispararMensagemManualAdmin
} from "@/actions/adminData";

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
    ocultar_triagem: false,
    ocultar_modalidade: false,
    ocultar_checkout: false,
    logo_url: "",
    modalidade_padrao: "Particular",
    modalidades_opcoes: [
      { id: "1", codigo_uri: "1", nome: "Particular", exige_senha: false, senha: "" },
      { id: "2", codigo_uri: "2", nome: "Convênio", exige_senha: false, senha: "" }
    ],
    categorias_atendimento: ["Consultas", "Exames"],
    especialidades_categorizadas: [],
    catalogo_enfermidades: [
      "Refluxo",
      "Gastrite",
      "Hipertensão",
      "Diabetes",
      "Doença Celíaca",
      "Hérnia de Hiato",
      "Esteatose Hepática",
      "Síndrome do Intestino Irritável"
    ],
    enviar_mensagens_importados_erp: true,
    tema: {
      cor_primaria: "#9FC131",
      cor_secundaria: "#10B981",
      densidade_texto: "compacto",
      estilo_cards: "moderno"
    }
  });

  const [regrasMensagens, setRegrasMensagens] = useState([]);
  const [filterEspecialidade, setFilterEspecialidade] = useState("Todas");
  const [filterGatilho, setFilterGatilho] = useState("Todos");
  const [visualizacaoMensagens, setVisualizacaoMensagens] = useState("cards");

  const [historicoMensagens, setHistoricoMensagens] = useState([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [disparandoId, setDisparandoId] = useState(null);
  const [mensagemVisualizar, setMensagemVisualizar] = useState(null);

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
      showToast("Mensagem disparada com sucesso para o WhatsApp!");
      carregarHistorico();
    } catch (e) {
      showToast(`Erro ao disparar: ${e.message}`, "error");
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
          setCampos((prev) => ({
            ...prev,
            ...emp.config_campos,
            whatsapp_atendimento: emp.whatsapp_atendimento || emp.telefone || emp.config_campos?.whatsapp_atendimento || prev.whatsapp_atendimento || "",
            logo_url: emp.logo_url || emp.config_campos.logo_url || prev.logo_url,
            modalidades_opcoes: emp.config_campos.modalidades_opcoes || prev.modalidades_opcoes,
            modalidade_padrao: emp.config_campos.modalidade_padrao || prev.modalidade_padrao,
            categorias_atendimento:
              emp.config_campos.categorias_atendimento || prev.categorias_atendimento || [
                "Consultas",
                "Exames"
              ],
            especialidades_categorizadas:
              emp.config_campos.especialidades_categorizadas ||
              prev.especialidades_categorizadas ||
              [],
            catalogo_enfermidades:
              emp.config_campos.catalogo_enfermidades || prev.catalogo_enfermidades || [
                "Refluxo",
                "Gastrite",
                "Hipertensão",
                "Diabetes",
                "Doença Celíaca",
                "Hérnia de Hiato",
                "Esteatose Hepática",
                "Síndrome do Intestino Irritável"
              ],
            tema: {
              ...prev.tema,
              ...(emp.config_campos.tema || {})
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
    }
    if (novoTema.cor_secundaria) {
      root.style.setProperty("--brand-secondary", novoTema.cor_secundaria);
    }
  };

  const handleSave = async () => {
    if (!empresaId) {
      showToast("Erro: ID da clínica não encontrado.", "error");
      return;
    }
    setLoading(true);
    try {
      await actionSalvarCustomization({ config_campos: campos, config_mensagens: regrasMensagens });
      if (campos.logo_url) {
        await actionSalvarLogoEmpresa(campos.logo_url);
      }
      aplicarTemaEmTempoReal(campos.tema);
      showToast("Personalização salva com sucesso!");
    } catch (e) {
      console.error(e);
      showToast(`Erro ao salvar: ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Upload de logotipo com limite ampliado (até 25MB)
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      showToast("A imagem deve ter no máximo 25MB.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setCampos((prev) => ({ ...prev, logo_url: reader.result }));
      showToast("Logotipo carregado! Clique em Salvar para persistir.");
    };
    reader.readAsDataURL(file);
  };

  // Funções de Modalidades
  const addModalidade = () => {
    setCampos((prev) => ({
      ...prev,
      modalidades_opcoes: [
        ...prev.modalidades_opcoes,
        {
          id: Date.now().toString(),
          codigo_uri: (prev.modalidades_opcoes.length + 1).toString(),
          nome: "Nova Modalidade",
          exige_senha: false,
          senha: ""
        }
      ]
    }));
  };

  const updateModalidade = (id, field, value) => {
    setCampos((prev) => ({
      ...prev,
      modalidades_opcoes: prev.modalidades_opcoes.map((m) =>
        m.id === id ? { ...m, [field]: value } : m
      )
    }));
  };

  const removeModalidade = (id) => {
    setCampos((prev) => ({
      ...prev,
      modalidades_opcoes: prev.modalidades_opcoes.filter((m) => m.id !== id)
    }));
  };

  // Funções de Mensagens
  const adicionarNovaRegra = () => {
    let alvoInicial = "Todas";
    if (filterEspecialidade !== "Todas") {
      alvoInicial = filterEspecialidade.startsWith("categoria:")
        ? filterEspecialidade
        : `especialidade:${filterEspecialidade}`;
    }

    const gatilhoInicial = filterGatilho !== "Todos" ? filterGatilho : "imediato";

    const novaRegra = {
      id: Date.now().toString(),
      alvo: alvoInicial,
      especialidade: filterEspecialidade !== "Todas" ? filterEspecialidade : "Todas",
      filtrar_enfermidade: false,
      enfermidade_alvo: (campos.catalogo_enfermidades && campos.catalogo_enfermidades[0]) || "Refluxo",
      gatilho: gatilhoInicial,
      dias_antes: 1,
      hora_envio: "08:00",
      referencia_pos: "termino",
      offset_valor: 0,
      offset_unidade: "minutos",
      filtro_idade_tipo: "todas",
      idade_minima: 0,
      idade_maxima: 999,
      mensagem: "Olá {nome}, seu agendamento de {servico} com {especialista} está confirmado!"
    };
    setRegrasMensagens([novaRegra, ...regrasMensagens]);
  };

  const atualizarRegra = (id, campo, valor) =>
    setRegrasMensagens((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [campo]: valor } : r))
    );

  const removerRegra = (id) =>
    setRegrasMensagens((prev) => prev.filter((r) => r.id !== id));

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

  // Lista dinâmica de categorias criadas pelo cliente
  const categoriasDinamicas = useMemo(() => {
    const fromConfig = Array.isArray(campos.categorias_atendimento)
      ? campos.categorias_atendimento
      : [];
    const fromEspec = Array.isArray(campos.especialidades_categorizadas)
      ? campos.especialidades_categorizadas.map((e) => e.categoria).filter(Boolean)
      : [];
    const setCats = new Set([...fromConfig, ...fromEspec]);
    if (setCats.size === 0) {
      setCats.add("Consultas");
      setCats.add("Exames");
    }
    return [...setCats].filter(Boolean);
  }, [campos.categorias_atendimento, campos.especialidades_categorizadas]);

  const catalogoEnfermidades = useMemo(() => {
    const list = Array.isArray(campos.catalogo_enfermidades) ? campos.catalogo_enfermidades : [];
    if (list.length === 0) {
      return [
        "Refluxo",
        "Gastrite",
        "Hipertensão",
        "Diabetes",
        "Doença Celíaca",
        "Hérnia de Hiato",
        "Esteatose Hepática",
        "Síndrome do Intestino Irritável"
      ];
    }
    return list;
  }, [campos.catalogo_enfermidades]);

  const especialidadesUnicas = useMemo(() => {
    const srvs = Array.isArray(servicos) ? servicos : [];
    const unicasSrv = srvs
      .filter((s) => s.especialidade)
      .flatMap((s) => s.especialidade.split(",").map((e) => e.trim()));
    const fromConfig = Array.isArray(campos.especialidades_categorizadas)
      ? campos.especialidades_categorizadas.map((e) => e.nome)
      : [];
    const base = [
      "Colonoscopia",
      "Endoscopia",
      "Gastroenterologia",
      "Cirurgia Geral",
      "Clínico Geral",
      "Psicologia"
    ];
    return [...new Set([...base, ...unicasSrv, ...fromConfig])].filter(Boolean).sort();
  }, [servicos, campos.especialidades_categorizadas]);

  // Opções de Alvo / Nicho com Categorias Dinâmicas, Especialidades e Profissionais
  const alvoOptions = useMemo(
    () => [
      { value: "Todas", label: "Todos os Atendimentos (Geral)" },
      // Categorias de Atendimento
      ...categoriasDinamicas.map((cat) => ({
        value: `categoria:${cat}`,
        label: `Categoria: ${cat}`
      })),
      // Especialidades
      ...especialidadesUnicas.map((e) => {
        const catObj = (campos.especialidades_categorizadas || []).find(
          (item) => item.nome?.toLowerCase() === e.toLowerCase()
        );
        const catLabel = catObj?.categoria ? ` (${catObj.categoria})` : "";
        return {
          value: `especialidade:${e}`,
          label: `Especialidade: ${e}${catLabel}`
        };
      }),
      // Profissionais Individuais
      ...servicos.map((s) => ({
        value: `servico:${s.nome}`,
        label: `Profissional: ${s.nome}`
      }))
    ],
    [categoriasDinamicas, especialidadesUnicas, campos.especialidades_categorizadas, servicos]
  );

  const filtroEspecialidadeOptions = useMemo(
    () => [
      { value: "Todas", label: "Todas as Categorias e Especialidades" },
      ...categoriasDinamicas.map((c) => ({ value: `categoria:${c}`, label: `Categoria: ${c}` })),
      ...especialidadesUnicas.map((e) => ({ value: e, label: `Especialidade: ${e}` }))
    ],
    [categoriasDinamicas, especialidadesUnicas]
  );

  const gatilhoOptions = [
    { value: "imediato", label: "Na hora do Agendamento (Instantâneo)" },
    { value: "agendado", label: "Dias antes do Atendimento (Lembrete)" },
    { value: "pos_atendimento", label: "Após Consulta / Exame (Pós-Atendimento)" },
    { value: "remarcado", label: "Quando Remarcado / Reagendado" },
    { value: "cancelado", label: "Quando Cancelado" },
    { value: "antes_pagamento", label: "Cobrança / Antes do Pagamento (Pendente)" },
    { value: "pagamento_aprovado", label: "Confirmação de Pagamento Aprovado" }
  ];

  const variaveisDisponiveis = [
    { tag: "{nome}", desc: "Nome do paciente" },
    { tag: "{servico}", desc: "Procedimento / Serviço" },
    { tag: "{especialista}", desc: "Nome do profissional" },
    { tag: "{especialidade}", desc: "Especialidade médica" },
    { tag: "{categoria}", desc: "Categoria (Exame/Consulta)" },
    { tag: "{tipo_servico}", desc: "Tipo do serviço" },
    { tag: "{enfermidade}", desc: "Enfermidade / Condição diagnosticada" },
    { tag: "{idade}", desc: "Idade calculada do paciente" },
    { tag: "{data}", desc: "Data do atendimento" },
    { tag: "{hora}", desc: "Horário agendado" },
    { tag: "{valor}", desc: "Valor a pagar" },
    { tag: "{chave_pix}", desc: "Chave Pix copia e cola" },
    { tag: "{link_pagamento}", desc: "Link direto do checkout" }
  ];

  const regrasFiltradas = useMemo(() => {
    return regrasMensagens.filter((regra) => {
      if (filterGatilho !== "Todos" && regra.gatilho !== filterGatilho) return false;
      if (filterEspecialidade !== "Todas") {
        const alvoRaw = (regra.alvo || "").toLowerCase();
        const targetClean = filterEspecialidade.toLowerCase().trim();
        if (alvoRaw === "todas") return true;
        if (targetClean.startsWith("categoria:")) {
          return alvoRaw === targetClean;
        }
        const matchAlvo = alvoRaw.includes(targetClean);
        const matchEsp = (regra.especialidade || "").toLowerCase().includes(targetClean);
        if (!matchAlvo && !matchEsp) return false;
      }
      return true;
    });
  }, [regrasMensagens, filterGatilho, filterEspecialidade]);

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
              {subTab === "jornada" && "Identificação & Logotipo"}
              {subTab === "aparencia" && "Design, Cores & Escala"}
              {subTab === "modalidades" && "Formas de Atendimento & Coberturas"}
              {subTab === "mensagens" && "Automações de Mensagens WhatsApp"}
              {subTab === "historico_mensagens" && "Histórico & Auditoria de Mensagens WhatsApp"}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Configurações salvas diretamente no perfil desta clínica.
            </p>
          </div>
        </div>

        <ButtonPrimary
          onClick={handleSave}
          disabled={loading}
          icon={Save}
          className="px-6 py-2 text-xs min-h-[38px] rounded-xl"
        >
          {loading ? "Salvando..." : "Salvar Alterações"}
        </ButtonPrimary>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pb-24 pr-1">
        <AnimatePresence mode="wait">
          {/* TAB 1: IDENTIFICAÇÃO E LOGO */}
          {subTab === "jornada" && (
            <motion.div
              key="jornada"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={spring}
              className="space-y-6"
            >
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
                      Exibido no portal de agendamento e nas mensagens. Limite de upload: até 25MB.
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-3">
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
                          className="text-xs text-red-500 hover:underline font-medium"
                        >
                          Remover logo
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 flex flex-col items-center justify-center text-center min-h-[140px]">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
                      Prévia do Logotipo
                    </span>
                    {campos.logo_url ? (
                      <div className="p-2.5 bg-white dark:bg-black rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm max-w-[200px]">
                        <img
                          src={campos.logo_url}
                          alt="Logo da Clínica"
                          className="max-h-12 max-w-full object-contain mx-auto"
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

              {/* SEÇÃO: WHATSAPP OFICIAL DA CLÍNICA */}
              <section className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-8 rounded-[2rem] shadow-sm space-y-4">
                <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-white/5 pb-4">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <MessageCircle size={18} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                      WhatsApp Oficial de Atendimento & Encaminhamento
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Cadastre o número do WhatsApp da sua clínica com DDD (ex: 5583999999999 ou 83999999999).
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
                    💡 <strong>Uso Automático:</strong> Este número é usado no botão do WhatsApp ao concluir agendamentos e para encaminhar pacientes ao selecionarem especialistas em modo <em>"Ativo Parcialmente (WhatsApp / Atendente)"</em>.
                  </div>
                </div>
              </section>

              <section className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-8 rounded-[2rem] shadow-sm">
                <h3 className="text-base font-bold text-zinc-950 dark:text-white mb-5 border-b border-zinc-100 dark:border-white/5 pb-3">
                  Campos Exigidos na Identificação
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
                  <ToggleSwitch
                    checked={campos.mostrar_cpf}
                    onChange={(v) => setCampos({ ...campos, mostrar_cpf: v })}
                    label="Exigir CPF"
                  />
                  <ToggleSwitch
                    checked={campos.mostrar_sobrenome}
                    onChange={(v) => setCampos({ ...campos, mostrar_sobrenome: v })}
                    label="Exigir Sobrenome"
                  />
                  <ToggleSwitch
                    checked={campos.mostrar_nascimento}
                    onChange={(v) => setCampos({ ...campos, mostrar_nascimento: v })}
                    label="Data de Nascimento"
                  />
                  <ToggleSwitch
                    checked={campos.mostrar_email}
                    onChange={(v) => setCampos({ ...campos, mostrar_email: v })}
                    label="Exigir E-mail"
                  />
                  <ToggleSwitch
                    checked={campos.mostrar_whatsapp}
                    onChange={(v) => setCampos({ ...campos, mostrar_whatsapp: v })}
                    label="Exigir WhatsApp"
                  />
                </div>

                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
                  Pular Etapas
                </h4>
                <div className="grid sm:grid-cols-3 gap-4 p-4 bg-zinc-50/70 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/60 dark:border-zinc-800">
                  <ToggleSwitch
                    checked={campos.ocultar_triagem}
                    onChange={(v) => setCampos({ ...campos, ocultar_triagem: v })}
                    label="Ocultar Triagem"
                  />
                  <ToggleSwitch
                    checked={campos.ocultar_modalidade}
                    onChange={(v) => setCampos({ ...campos, ocultar_modalidade: v })}
                    label="Ocultar Modalidade"
                  />
                  <ToggleSwitch
                    checked={campos.ocultar_checkout}
                    onChange={(v) => setCampos({ ...campos, ocultar_checkout: v })}
                    label="Ocultar Pagamento"
                  />
                </div>
              </section>
            </motion.div>
          )}

          {/* TAB 2: DESIGN & CORES */}
          {subTab === "aparencia" && (
            <motion.div
              key="aparencia"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={spring}
              className="space-y-6"
            >
              <div className="grid lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 space-y-6">
                  {/* DENSIDADE E ESCALA */}
                  <section className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-7 rounded-[2rem] shadow-sm space-y-5">
                    <div>
                      <h3 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                        <Type size={18} strokeWidth={1.5} /> Densidade & Escala de Texto
                      </h3>
                      <p className="text-xs text-zinc-500 mt-1">
                        Ajuste o tamanho dos menus, cabeçalhos e densidade de informação das telas.
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { id: "compacto", label: "Compacto", desc: "Mais dados na tela" },
                        { id: "padrao", label: "Padrão", desc: "Equilibrado" },
                        { id: "confortavel", label: "Confortável", desc: "Mais espaçado" }
                      ].map((item) => {
                        const isSel = campos.tema?.densidade_texto === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() =>
                              setCampos((prev) => ({
                                ...prev,
                                tema: { ...prev.tema, densidade_texto: item.id }
                              }))
                            }
                            className={`p-3.5 rounded-2xl border text-left transition-all min-h-[72px] flex flex-col justify-between ${
                              isSel
                                ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-zinc-950 dark:border-white shadow-sm font-bold"
                                : "bg-zinc-50/60 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300"
                            }`}
                          >
                            <span className="text-xs font-bold">{item.label}</span>
                            <span className="text-[10px] opacity-70">{item.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  {/* FORMATO DOS CARDS */}
                  <section className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-7 rounded-[2rem] shadow-sm space-y-5">
                    <div>
                      <h3 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                        <LayoutGrid size={18} strokeWidth={1.5} /> Dimensionamento & Raio dos Cards
                      </h3>
                      <p className="text-xs text-zinc-500 mt-1">
                        Estilo visual das bordas e arredondamento dos blocos da aplicação.
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { id: "minimalista", label: "Minimalista", desc: "Bordas finas (12px)" },
                        { id: "moderno", label: "Moderno", desc: "Equilibrado (18px)" },
                        { id: "luxo_apple", label: "Soft Apple", desc: "Vidro suave (24px)" }
                      ].map((item) => {
                        const isSel = campos.tema?.estilo_cards === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() =>
                              setCampos((prev) => ({
                                ...prev,
                                tema: { ...prev.tema, estilo_cards: item.id }
                              }))
                            }
                            className={`p-3.5 rounded-2xl border text-left transition-all min-h-[72px] flex flex-col justify-between ${
                              isSel
                                ? "bg-zinc-950 text-white dark:bg-white dark:text-black border-zinc-950 dark:border-white shadow-sm font-bold"
                                : "bg-zinc-50/60 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300"
                            }`}
                          >
                            <span className="text-xs font-bold">{item.label}</span>
                            <span className="text-[10px] opacity-70">{item.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  {/* CORES DA MARCA */}
                  <section className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-7 rounded-[2rem] shadow-sm space-y-5">
                    <div>
                      <h3 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                        <Sliders size={18} strokeWidth={1.5} /> Paleta de Cores da Marca
                      </h3>
                      <p className="text-xs text-zinc-500 mt-1">
                        Selecione as cores primária e secundária para botões, detalhes e realces.
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
                                setCampos((prev) => ({
                                  ...prev,
                                  tema: {
                                    ...prev.tema,
                                    cor_primaria: p.prim,
                                    cor_secundaria: p.sec
                                  }
                                }));
                                aplicarTemaEmTempoReal({
                                  cor_primaria: p.prim,
                                  cor_secundaria: p.sec
                                });
                              }}
                              className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
                                isSelected
                                  ? "border-zinc-950 dark:border-white bg-zinc-100 dark:bg-zinc-800"
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
                              setCampos((prev) => ({
                                ...prev,
                                tema: { ...prev.tema, cor_primaria: val }
                              }));
                              aplicarTemaEmTempoReal({ cor_primaria: val });
                            }}
                            className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                          />
                          <input
                            type="text"
                            value={campos.tema?.cor_primaria || "#9FC131"}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCampos((prev) => ({
                                ...prev,
                                tema: { ...prev.tema, cor_primaria: val }
                              }));
                              aplicarTemaEmTempoReal({ cor_primaria: val });
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
                              setCampos((prev) => ({
                                ...prev,
                                tema: { ...prev.tema, cor_secundaria: val }
                              }));
                              aplicarTemaEmTempoReal({ cor_secundaria: val });
                            }}
                            className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                          />
                          <input
                            type="text"
                            value={campos.tema?.cor_secundaria || "#10B981"}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCampos((prev) => ({
                                ...prev,
                                tema: { ...prev.tema, cor_secundaria: val }
                              }));
                              aplicarTemaEmTempoReal({ cor_secundaria: val });
                            }}
                            className="w-full bg-transparent text-xs font-mono font-bold uppercase outline-none text-zinc-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                {/* PRÉ-VISUALIZAÇÃO EM TEMPO REAL */}
                <div className="lg:col-span-5">
                  <div className="sticky top-6 bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 rounded-[2rem] shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b border-zinc-100 dark:border-white/5 pb-3">
                      <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest">
                        Pré-visualização do Paciente
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        {campos.tema?.densidade_texto || "compacto"}
                      </span>
                    </div>

                    <div
                      className="p-5 border transition-all space-y-4 bg-zinc-50/70 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800"
                      style={{
                        borderRadius:
                          campos.tema?.estilo_cards === "minimalista"
                            ? "12px"
                            : campos.tema?.estilo_cards === "luxo_apple"
                            ? "24px"
                            : "18px"
                      }}
                    >
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
                        className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-black transition-transform shadow-md flex items-center justify-center gap-2"
                        style={{
                          backgroundColor: campos.tema?.cor_primaria || "#9FC131"
                        }}
                      >
                        <Check size={14} strokeWidth={2.5} /> Confirmar Atendimento
                      </button>
                    </div>

                    <p className="text-[11px] text-zinc-400 text-center leading-relaxed">
                      As alterações visuais serão aplicadas no agendamento do paciente após clicar em <strong>Salvar</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: MODALIDADES */}
          {subTab === "modalidades" && (
            <motion.div
              key="modalidades"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={spring}
              className="space-y-6"
            >
              <section className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-8 rounded-[2rem] shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4 border-b border-zinc-100 dark:border-white/5 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                      <ListChecks size={18} strokeWidth={1.5} /> Formas de Atendimento & Coberturas
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">
                      Defina os métodos de cobertura aceitos e configure os IDs numéricos para links diretos (Ex: ?modalidade=1 ou ?modalidade=2).
                    </p>
                  </div>
                  <button
                    onClick={addModalidade}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-950 dark:bg-white text-white dark:text-black text-xs font-bold rounded-xl transition-all shadow-sm min-h-[38px]"
                  >
                    <Plus size={15} /> Adicionar Modalidade
                  </button>
                </div>

                <div className="mb-6 p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <CustomSelect
                      label="Modalidade Padrão Selecionada"
                      value={campos.modalidade_padrao}
                      onChange={(v) => setCampos({ ...campos, modalidade_padrao: v })}
                      options={campos.modalidades_opcoes.map((m) => ({
                        value: m.nome,
                        label: `${m.nome} (${m.codigo_uri ? `ID URI: ${m.codigo_uri}` : `ID: ${m.id}`})`
                      }))}
                    />
                  </div>
                  <div className="text-[11px] text-blue-700 dark:text-blue-300 font-medium bg-blue-100/60 dark:bg-blue-900/40 p-3 rounded-xl">
                    💡 <strong>Link Direto:</strong> Passe <code className="font-mono bg-white dark:bg-black px-1 py-0.5 rounded">?modalidade=ID</code> na URL para pré-selecionar a cobertura automaticamente.
                  </div>
                </div>

                <div className="space-y-3">
                  {campos.modalidades_opcoes.map((mod, index) => {
                    const idExibicao = mod.codigo_uri || String(index + 1);
                    return (
                      <div
                        key={mod.id}
                        className="p-4 sm:p-5 bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl flex flex-col md:flex-row gap-4 items-start md:items-center justify-between"
                      >
                        <div className="flex items-center gap-2 mb-2 md:mb-0">
                          <span className="px-2.5 py-1 rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-black font-mono text-[11px] font-extrabold whitespace-nowrap shadow-sm">
                            # ID: {idExibicao}
                          </span>
                        </div>

                        <div className="flex-1 w-full grid sm:grid-cols-3 gap-3">
                          <TextInput
                            label="Nome da Modalidade / Cobertura"
                            placeholder="Ex: Particular, Convênio Unimed"
                            value={mod.nome}
                            onChange={(e) => updateModalidade(mod.id, "nome", e.target.value)}
                          />
                          <TextInput
                            label="Código / ID na URI (URL)"
                            placeholder="Ex: 1, 2, convenio"
                            value={mod.codigo_uri || ""}
                            onChange={(e) => updateModalidade(mod.id, "codigo_uri", e.target.value)}
                          />
                          {mod.exige_senha ? (
                            <TextInput
                              label="Senha Exigida"
                              placeholder="Senha de acesso"
                              value={mod.senha || ""}
                              onChange={(e) => updateModalidade(mod.id, "senha", e.target.value)}
                            />
                          ) : (
                            <div className="hidden sm:flex items-center text-[10px] text-zinc-400 font-mono">
                              Link: ?modalidade={idExibicao}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                          <ToggleSwitch
                            checked={mod.exige_senha}
                            onChange={(v) => updateModalidade(mod.id, "exige_senha", v)}
                            label="Exigir Senha"
                          />
                          <button
                            onClick={() => removeModalidade(mod.id)}
                            className="p-2 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                            title="Remover modalidade"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </motion.div>
          )}

          {/* TAB 4: MENSAGENS WHATSAPP */}
          {subTab === "mensagens" && (
            <motion.div
              key="mensagens"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={spring}
              className="space-y-6"
            >
              <section className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-8 rounded-[2rem] shadow-sm">
                <div className="p-4 bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl mb-6 space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Filter size={13} /> Filtros de Automação
                  </span>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <CustomSelect
                      label="Categoria / Especialidade"
                      value={filterEspecialidade}
                      onChange={setFilterEspecialidade}
                      options={filtroEspecialidadeOptions}
                    />

                    <CustomSelect
                      label="Categoria / Gatilho"
                      value={filterGatilho}
                      onChange={setFilterGatilho}
                      options={[{ value: "Todos", label: "Todas as Categorias" }, ...gatilhoOptions]}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-zinc-100 dark:border-white/5 pb-4 gap-3">
                  <div>
                    <h3 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                      <MessageSquare size={17} strokeWidth={1.5} className="text-emerald-500" />{" "}
                      Automações de WhatsApp ({regrasFiltradas.length})
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Mensagens disparadas automaticamente conforme os gatilhos e regras configurados.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200/60 dark:border-zinc-700">
                      <button
                        type="button"
                        onClick={() => setVisualizacaoMensagens("cards")}
                        className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                          visualizacaoMensagens === "cards"
                            ? "bg-white dark:bg-black text-zinc-950 dark:text-white shadow-sm"
                            : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                        }`}
                        title="Visualização em Cards"
                      >
                        <LayoutGrid size={14} />
                        <span className="hidden sm:inline">Cards</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisualizacaoMensagens("lista")}
                        className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                          visualizacaoMensagens === "lista"
                            ? "bg-white dark:bg-black text-zinc-950 dark:text-white shadow-sm"
                            : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                        }`}
                        title="Visualização em Lista Compacta"
                      >
                        <ListChecks size={14} />
                        <span className="hidden sm:inline">Lista</span>
                      </button>
                    </div>

                    <button
                      onClick={adicionarNovaRegra}
                      className="flex items-center gap-1.5 px-4 py-2 bg-zinc-950 dark:bg-white text-white dark:text-black text-xs font-bold rounded-xl transition-all shadow-sm min-h-[38px]"
                    >
                      <Plus size={15} /> Nova Mensagem
                    </button>
                  </div>
                </div>

                <div className="space-y-5">
                  <AnimatePresence>
                    {regrasFiltradas.length === 0 ? (
                      <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-400 text-xs">
                        Nenhuma mensagem encontrada com os filtros selecionados.
                      </div>
                    ) : (
                      regrasFiltradas.map((regra, index) => (
                        <motion.div
                          key={regra.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          className="bg-zinc-50/60 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 relative flex flex-col lg:flex-row gap-6"
                        >
                          <button
                            onClick={() => removerRegra(regra.id)}
                            className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>

                          <div className="flex-1 space-y-4">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-black flex items-center justify-center text-[10px] font-bold">
                                {index + 1}
                              </span>
                              <h4 className="font-bold text-xs text-zinc-950 dark:text-white">
                                Critérios de Disparo
                              </h4>
                            </div>

                            <CustomSelect
                              label="Nicho / Categoria / Especialidade"
                              value={
                                regra.alvo ||
                                (regra.especialidade === "Todas"
                                  ? "Todas"
                                  : `especialidade:${regra.especialidade}`)
                              }
                              onChange={(v) => atualizarRegra(regra.id, "alvo", v)}
                              options={alvoOptions}
                            />

                            {/* SELEÇÃO OPCIONAL DE ENFERMIDADE ALVO */}
                            <div className="p-3.5 bg-white dark:bg-black/40 border border-zinc-200/80 dark:border-zinc-800 rounded-xl space-y-2.5">
                              <ToggleSwitch
                                checked={!!regra.filtrar_enfermidade}
                                onChange={(v) =>
                                  atualizarRegra(regra.id, "filtrar_enfermidade", v)
                                }
                                label="Segmentar por Enfermidade Específica"
                              />

                              {regra.filtrar_enfermidade && (
                                <div className="space-y-1 pt-1">
                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                                    Enfermidade Alvo
                                  </label>
                                  <select
                                    value={
                                      regra.enfermidade_alvo ||
                                      catalogoEnfermidades[0] ||
                                      "Refluxo"
                                    }
                                    onChange={(e) =>
                                      atualizarRegra(regra.id, "enfermidade_alvo", e.target.value)
                                    }
                                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none text-zinc-800 dark:text-zinc-200 font-bold"
                                  >
                                    {catalogoEnfermidades.map((enf) => (
                                      <option key={enf} value={enf}>
                                        Enfermidade: {enf}
                                      </option>
                                    ))}
                                  </select>
                                  <p className="text-[10px] text-zinc-400">
                                    A mensagem só será enviada se o paciente possuir esta condição cadastrada na sua ficha clínica.
                                  </p>
                                </div>
                              )}
                            </div>

                            <div className="grid sm:grid-cols-2 gap-3">
                              <CustomSelect
                                label="Gatilho"
                                value={regra.gatilho}
                                onChange={(v) => atualizarRegra(regra.id, "gatilho", v)}
                                options={gatilhoOptions}
                              />

                              {regra.gatilho === "agendado" && (
                                <div className="grid grid-cols-2 gap-2">
                                  <TextInput
                                    type="number"
                                    label="Dias Antes"
                                    value={regra.dias_antes ?? 1}
                                    onChange={(e) =>
                                      atualizarRegra(regra.id, "dias_antes", e.target.value)
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
                              )}

                              {regra.gatilho === "pos_atendimento" && (
                                <div className="grid grid-cols-2 gap-2">
                                  <TextInput
                                    type="number"
                                    label="Dias Após Atendimento"
                                    value={regra.dias_depois ?? regra.dias_antes ?? 1}
                                    onChange={(e) => {
                                      atualizarRegra(regra.id, "dias_depois", e.target.value);
                                      atualizarRegra(regra.id, "dias_antes", e.target.value);
                                    }}
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
                                    className="px-2 py-0.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded text-[10px] font-mono font-bold"
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
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </section>
            </motion.div>
          )}

          {/* TAB 5: HISTÓRICO & LOGS DE MENSAGENS */}
          {subTab === "historico_mensagens" && (
            <motion.div
              key="historico_mensagens"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={spring}
              className="space-y-6"
            >
              <section className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-8 rounded-[2rem] shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4 border-b border-zinc-100 dark:border-white/5 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                      <MessageSquare size={18} strokeWidth={1.5} className="text-emerald-500" />
                      Histórico e Fila de Disparos WhatsApp ({historicoMensagens.length})
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">
                      Acompanhe em tempo real todas as mensagens enviadas, programadas ou com falha.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={carregarHistorico}
                    disabled={loadingHistorico}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold rounded-xl transition-all min-h-[38px]"
                  >
                    {loadingHistorico ? "Atualizando..." : "Atualizar Logs"}
                  </button>
                </div>

                {loadingHistorico ? (
                  <div className="py-16 text-center text-xs text-zinc-400">
                    Carregando histórico de mensagens...
                  </div>
                ) : historicoMensagens.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-400 text-xs">
                    Nenhuma mensagem registrada na fila até o momento.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/40 dark:bg-black/20">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 font-bold uppercase tracking-wider text-zinc-400 text-[10px]">
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5">Paciente</th>
                          <th className="p-3.5">WhatsApp</th>
                          <th className="p-3.5">Gatilho</th>
                          <th className="p-3.5">Data / Hora</th>
                          <th className="p-3.5">Conteúdo</th>
                          <th className="p-3.5 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-medium">
                        {historicoMensagens.map((item) => {
                          const statusColor =
                            item.status === "enviado"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/50"
                              : item.status === "falha"
                              ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200/50"
                              : item.status === "rascunho"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/50"
                              : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/50";

                          return (
                            <tr key={item.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40 transition-colors">
                              <td className="p-3.5">
                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusColor}`}>
                                  {item.status}
                                </span>
                              </td>
                              <td className="p-3.5 font-bold text-zinc-900 dark:text-white">
                                {item.nome_paciente || "Paciente"}
                              </td>
                              <td className="p-3.5 font-mono text-zinc-600 dark:text-zinc-400">
                                {item.telefone_whatsapp || "-"}
                              </td>
                              <td className="p-3.5 text-zinc-700 dark:text-zinc-300 font-semibold">
                                {item.gatilho}
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
                              <td className="p-3.5 text-right space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => setMensagemVisualizar(item)}
                                  className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-[11px] font-bold"
                                >
                                  Ver
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDispararAgora(item.id)}
                                  disabled={disparandoId === item.id}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold"
                                >
                                  {disparandoId === item.id ? "Enviando..." : "Disparar"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* MODAL PARA VISUALIZAR TEXTO COMPLETO DA MENSAGEM */}
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
                          className="text-zinc-400 hover:text-zinc-950 dark:hover:text-white font-bold"
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
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                        >
                          Fechar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleDispararAgora(mensagemVisualizar.id);
                            setMensagemVisualizar(null);
                          }}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
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
    </motion.div>
  );
}
