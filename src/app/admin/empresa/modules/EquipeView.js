"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PenLine,
  Plus,
  X,
  DollarSign,
  CalendarDays,
  CheckCircle2,
  Trash2,
  Layers,
  MessageCircle,
  PauseCircle,
  Search,
  Hash,
  Users,
  Tag,
  ShieldCheck,
  List,
  LayoutGrid,
  Check,
  Ban,
  Clock,
  Stethoscope,
  Copy,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Pencil
} from "lucide-react";
import {
  fadeUp,
  staggerContainer,
  staggerItem,
  TextInput,
  CustomSelect,
  ButtonPrimary,
  ToggleSwitch,
  spring
} from "../components/SharedUI";
import { supabase } from "@/lib/supabase";
import {
  actionAtualizarServico,
  actionCriarServico,
  actionDeletarServico,
  actionSalvarCustomization,
  fetchAdminCustomization
} from "@/actions/adminData";
import { playDopamineSound, triggerHaptic } from "@/lib/dopamine";

// ==========================================
// COMPONENTE: CARD DO PROFISSIONAL
// ==========================================
const ServicoCard = ({ srv, onEdit, onDelete }) => {
  const especialidadesArray = srv.especialidade
    ? srv.especialidade.split(",").map((e) => e.trim()).filter(Boolean)
    : [];

  return (
    <motion.div
      variants={staggerItem}
      layoutId={`card-${srv.id}`}
      className="bg-white/85 dark:bg-[#0c0c0e]/85 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-7 rounded-[2rem] shadow-sm hover:shadow-xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
    >
      <div className="absolute top-5 right-5 flex items-center gap-1.5 z-20">
        <button
          onClick={() => onEdit(srv)}
          className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 flex items-center justify-center text-zinc-400 opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 hover:text-zinc-900 dark:hover:text-white shadow-md cursor-pointer"
          title="Editar Especialista"
        >
          <PenLine size={15} strokeWidth={2} />
        </button>
        <button
          onClick={() => onDelete(srv)}
          className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200/80 dark:border-red-900/60 flex items-center justify-center text-red-500 opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 hover:bg-red-100 dark:hover:bg-red-900/60 shadow-md cursor-pointer"
          title="Excluir Especialista"
        >
          <Trash2 size={15} strokeWidth={2} />
        </button>
      </div>

      <div className="relative z-10">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {srv.codigo_uri && (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[10px] font-mono font-bold rounded-lg border border-purple-200/60 dark:border-purple-900/40"
              title={`Link direto: ?especialista=${srv.codigo_uri}`}
            >
              <Hash size={10} /> URI: {srv.codigo_uri}
            </span>
          )}

          {srv.redirecionar_whatsapp || srv.status_agendamento === "whatsapp" ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[10px] font-extrabold uppercase tracking-wider rounded-lg border border-purple-200/60 dark:border-purple-900/40">
              <MessageCircle size={12} className="text-purple-600 dark:text-purple-400" /> Ativo Parcial
            </span>
          ) : !srv.ativo || srv.status_agendamento === "inativo" ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[10px] font-extrabold uppercase tracking-wider rounded-lg border border-rose-200/60 dark:border-rose-900/40">
              <Ban size={11} className="text-rose-500" /> Inativo
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider rounded-lg border border-emerald-200/60 dark:border-emerald-900/40">
              <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" /> Ativo Online
            </span>
          )}

          {srv.agendamento_bloqueado_ate && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase tracking-widest rounded-lg border border-amber-200/50">
              <PauseCircle size={11} /> Pausado até{" "}
              {new Date(`${srv.agendamento_bloqueado_ate}T12:00:00`).toLocaleDateString("pt-BR")}
            </span>
          )}
        </div>

        <h3 className="font-extrabold text-xl text-zinc-950 dark:text-white mb-2 leading-snug pr-8">
          {srv.nome}
        </h3>

        {/* Especialidades Vinculadas */}
        {especialidadesArray.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {especialidadesArray.map((esp, i) => (
              <span
                key={i}
                className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 px-2 py-0.5 rounded-lg uppercase tracking-wider"
              >
                {esp}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-400 italic mb-4">Nenhuma especialidade vinculada.</p>
        )}

        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-zinc-100 dark:border-white/5">
          <div className="flex-1">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">
              Valor Particular
            </p>
            <p className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-1">
              <DollarSign size={13} className="text-zinc-400" />
              {srv.preco
                ? Number(srv.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })
                : "0,00"}
            </p>
          </div>
          <div className="w-px h-7 bg-zinc-200/60 dark:border-white/10" />
          <div className="flex-1">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">
              Bloqueio Mínimo
            </p>
            <p className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-1">
              <CalendarDays size={13} className="text-zinc-400" />
              {srv.dias_bloqueio_padrao > 0
                ? `${srv.dias_bloqueio_padrao} ${srv.tipo_contagem_dias || "dias"}`
                : "Imediato"}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ==========================================
// COMPONENTE: FORMULÁRIO (CADASTRO E EDIÇÃO DE ESPECIALISTA)
// ==========================================
const ServicoForm = ({ initialData, onSave, onCancel, loading, especialidadesList }) => {
  const isEditing = !!initialData?.id;

  const [formData, setFormData] = useState({
    id: initialData?.id || "",
    nome: initialData?.nome || "",
    codigo_uri:
      initialData?.codigo_uri || initialData?.numero_especialista
        ? String(initialData?.codigo_uri || initialData?.numero_especialista)
        : "",
    especialidade: initialData?.especialidade
      ? initialData.especialidade.split(",").map((e) => e.trim()).filter(Boolean)
      : [],
    preco: initialData?.preco || "",
    dias_bloqueio_padrao: initialData?.dias_bloqueio_padrao || "",
    tipo_contagem_dias: initialData?.tipo_contagem_dias || "corridos",
    agendamento_bloqueado_ate: initialData?.agendamento_bloqueado_ate || "",
    motivo_bloqueio_agenda: initialData?.motivo_bloqueio_agenda || "",
    status_agendamento: initialData?.status_agendamento || (initialData?.redirecionar_whatsapp ? "whatsapp" : initialData?.ativo !== false ? "ativo" : "inativo"),
    redirecionar_whatsapp: Boolean(initialData?.redirecionar_whatsapp || initialData?.status_agendamento === "whatsapp"),
    ativo: initialData?.ativo !== false && initialData?.status_agendamento !== "inativo"
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData, isEditing);
  };

  const toggleEspecialidade = (esp) => {
    setFormData((prev) => {
      if (prev.especialidade.includes(esp)) {
        return { ...prev, especialidade: prev.especialidade.filter((e) => e !== esp) };
      } else {
        return { ...prev, especialidade: [...prev.especialidade, esp] };
      }
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 20 }}
      transition={spring}
      className="bg-white dark:bg-[#0c0c0e] border border-zinc-200/80 dark:border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-w-3xl mx-auto w-full relative z-50 my-4"
    >
      <div className="flex justify-between items-center px-6 md:px-8 py-6 border-b border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-900/30">
        <div>
          <h3 className="font-bold text-xl text-zinc-950 dark:text-white tracking-tight">
            {isEditing ? "Editar Especialista" : "Cadastrar Novo Especialista"}
          </h3>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">
            {isEditing
              ? "Ajuste o nome, especialidades vinculadas, código URI e regras de agenda."
              : "Cadastre um especialista para disponibilizá-lo nos agendamentos online."}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-all flex items-center justify-center cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar max-h-[65vh] space-y-8">
        {/* SEÇÃO 1: INFORMAÇÕES BÁSICAS */}
        <section className="space-y-4">
          <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-900 dark:text-white border-b border-zinc-100 dark:border-white/5 pb-2">
            <span className="w-5 h-5 rounded-md bg-zinc-950 text-white dark:bg-white dark:text-black flex items-center justify-center text-[10px] font-bold">
              1
            </span>
            Identificação do Especialista
          </h4>

          <div className="grid md:grid-cols-2 gap-4">
            <TextInput
              label="Nome do Especialista / Profissional *"
              placeholder="Ex: Dr. Tiago Lima"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              required
              autoFocus
            />

            <TextInput
              label="Código de Identificação na URI (Opcional)"
              placeholder="Ex: 2 ou tiago-lima"
              value={formData.codigo_uri}
              onChange={(e) => setFormData({ ...formData, codigo_uri: e.target.value })}
            />

            {/* Múltipla escolha de especialidades */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                Especialidades Vinculadas (Múltipla Escolha)
              </label>
              <div className="flex flex-wrap gap-2">
                {especialidadesList.length === 0 ? (
                  <p className="text-xs text-amber-500 font-medium py-2">
                    Nenhuma especialidade cadastrada. Vá na aba "Especialidades" para criar.
                  </p>
                ) : (
                  especialidadesList.map((espItem) => {
                    const espNome = typeof espItem === "object" ? espItem.nome : espItem;
                    const espCat = typeof espItem === "object" ? espItem.categoria : null;
                    const isSelected = formData.especialidade.includes(espNome);
                    return (
                      <button
                        key={espNome}
                        type="button"
                        onClick={() => toggleEspecialidade(espNome)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? "bg-zinc-950 dark:bg-white text-white dark:text-black border-zinc-950 dark:border-white shadow-sm scale-105"
                            : "bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                        }`}
                      >
                        <span>{espNome}</span>
                        {espCat && (
                          <span className="text-[9px] opacity-70 px-1.5 py-0.2 rounded bg-black/10 dark:bg-white/10 uppercase">
                            {espCat}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* STATUS DE DISPONIBILIDADE NA AGENDA */}
            <div className="md:col-span-2 space-y-2 pt-2 border-t border-zinc-100 dark:border-white/5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                Status de Disponibilidade na Agenda
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status_agendamento: "ativo", ativo: true, redirecionar_whatsapp: false })}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                    formData.status_agendamento === "ativo"
                      ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-200 shadow-sm ring-2 ring-emerald-500/30"
                      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" /> Ativo Online
                    </span>
                    {formData.status_agendamento === "ativo" && <Check size={14} className="text-emerald-600 dark:text-emerald-400 stroke-[3]" />}
                  </div>
                  <span className="text-[10px] opacity-80 mt-1">Agendamento 100% online automático</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status_agendamento: "whatsapp", ativo: true, redirecionar_whatsapp: true })}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                    formData.status_agendamento === "whatsapp"
                      ? "bg-purple-50/80 dark:bg-purple-950/40 border-purple-500 text-purple-950 dark:text-purple-200 shadow-sm ring-2 ring-purple-500/30"
                      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black flex items-center gap-1.5">
                      <MessageCircle size={14} className="text-purple-600 dark:text-purple-400" /> Ativo Parcial
                    </span>
                    {formData.status_agendamento === "whatsapp" && <Check size={14} className="text-purple-600 dark:text-purple-400 stroke-[3]" />}
                  </div>
                  <span className="text-[10px] opacity-80 mt-1">Redireciona para Atendente / WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status_agendamento: "inativo", ativo: false, redirecionar_whatsapp: false })}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                    formData.status_agendamento === "inativo"
                      ? "bg-rose-50/80 dark:bg-rose-950/40 border-rose-500 text-rose-950 dark:text-rose-200 shadow-sm ring-2 ring-rose-500/30"
                      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black flex items-center gap-1.5">
                      <Ban size={14} className="text-rose-600 dark:text-rose-400" /> Inativo
                    </span>
                    {formData.status_agendamento === "inativo" && <Check size={14} className="text-rose-600 dark:text-rose-400 stroke-[3]" />}
                  </div>
                  <span className="text-[10px] opacity-80 mt-1">Oculto do portal de agendamento</span>
                </button>
              </div>

              {formData.status_agendamento === "whatsapp" && (
                <div className="p-3 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/40 rounded-xl text-xs text-purple-900 dark:text-purple-300">
                  💬 <strong>Como funciona o Ativo Parcial:</strong> O paciente poderá ver este especialista na lista, mas em vez de abrir o calendário de horários, o sistema exibirá uma tela de redirecionamento para o WhatsApp da clínica com mensagem pré-preenchida com o nome do especialista.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* SEÇÃO 2: PAUSA TEMPORÁRIA */}
        <section className="space-y-4 pt-4 border-t border-zinc-100 dark:border-white/5">
          <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-900 dark:text-white border-b border-zinc-100 dark:border-white/5 pb-2">
            <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center text-[10px] font-bold">
              2
            </span>
            Pausa Temporária de Agenda
          </h4>
          <div className="grid md:grid-cols-2 gap-4 p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30">
            <TextInput
              label="Não aceitar agendamentos até"
              type="date"
              value={formData.agendamento_bloqueado_ate}
              onChange={(e) =>
                setFormData({ ...formData, agendamento_bloqueado_ate: e.target.value })
              }
            />
            <TextInput
              label="Motivo exibido ao paciente"
              placeholder="Ex.: Férias, recesso..."
              value={formData.motivo_bloqueio_agenda}
              onChange={(e) =>
                setFormData({ ...formData, motivo_bloqueio_agenda: e.target.value })
              }
            />
          </div>
        </section>

        {/* SEÇÃO 3: PRECIFICAÇÃO E ANTECEDÊNCIA */}
        <section className="space-y-4 pt-4 border-t border-zinc-100 dark:border-white/5">
          <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-900 dark:text-white border-b border-zinc-100 dark:border-white/5 pb-2">
            <span className="w-5 h-5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center text-[10px] font-bold">
              3
            </span>
            Precificação & Bloqueio de Dias
          </h4>
          <div className="grid md:grid-cols-3 gap-4">
            <TextInput
              label="Valor Particular (R$)"
              type="number"
              placeholder="0.00"
              value={formData.preco}
              onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
            />
            <TextInput
              label="Antecedência Mínima (Dias)"
              type="number"
              placeholder="Ex: 2"
              value={formData.dias_bloqueio_padrao}
              onChange={(e) =>
                setFormData({ ...formData, dias_bloqueio_padrao: e.target.value })
              }
            />
            <CustomSelect
              label="Tipo de Contagem"
              value={formData.tipo_contagem_dias}
              onChange={(val) => setFormData({ ...formData, tipo_contagem_dias: val })}
              options={[
                { value: "corridos", label: "Dias Corridos" },
                { value: "uteis", label: "Dias Úteis" }
              ]}
            />
          </div>
        </section>
      </div>

      <div className="px-6 md:px-8 py-4 border-t border-zinc-100 dark:border-white/5 bg-zinc-50/80 dark:bg-zinc-900/50 flex flex-col sm:flex-row justify-end gap-3">
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <ButtonPrimary
          onClick={handleSubmit}
          disabled={loading || !formData.nome.trim()}
          icon={isEditing ? CheckCircle2 : Plus}
          className="px-6 py-2.5 text-xs rounded-xl"
        >
          {loading ? "Processando..." : isEditing ? "Salvar Alterações" : "Cadastrar Especialista"}
        </ButtonPrimary>
      </div>
    </motion.div>
  );
};

// ==========================================
// COMPONENTE PRINCIPAL (VIEW)
// ==========================================
export default function EquipeView({
  subTab = "corpo",
  setSubTab,
  servicos = [],
  showToast,
  fetchServicos,
  permissoes = [],
  isOwner = false
}) {
  const [editingServico, setEditingServico] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Preferência visual: Lista vs Cards para Especialistas e Especialidades
  const [viewMode, setViewMode] = useState("lista");
  const [viewModeEspecialidades, setViewModeEspecialidades] = useState("lista");

  // Ordenação de colunas do Corpo Clínico
  const [sortEspecialistas, setSortEspecialistas] = useState({ key: "nome", direction: "asc" });

  // Ordenação de colunas de Especialidades
  const [sortEspecialidades, setSortEspecialidades] = useState({ key: "nome", direction: "asc" });

  useEffect(() => {
    try {
      const defaultMode = localStorage.getItem("rmcare_default_view_mode") || localStorage.getItem("rmcare_view_mode");
      if (defaultMode === "cards" || defaultMode === "lista") {
        setViewMode(defaultMode);
        setViewModeEspecialidades(defaultMode);
      }
    } catch (e) {}
  }, []);

  const handleToggleViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem("rmcare_view_mode", mode);
    } catch (e) {}
  };

  const handleToggleViewModeEspecialidades = (mode) => {
    setViewModeEspecialidades(mode);
  };

  // Estados para Especialidades e Modalidades
  const [empresaId, setEmpresaId] = useState(null);
  const [modalidadesOpcoes, setModalidadesOpcoes] = useState([
    { id: "1", codigo_uri: "1", nome: "Particular", exige_senha: false, senha: "" },
    { id: "2", codigo_uri: "2", nome: "Convênio", exige_senha: false, senha: "" }
  ]);
  const [modalidadePadrao, setModalidadePadrao] = useState("Particular");
  const [ocultarValorParticular, setOcultarValorParticular] = useState(false);

  const [especialidadesCategorizadas, setEspecialidadesCategorizadas] = useState([]);
  const [novaEspecialidadeNome, setNovaEspecialidadeNome] = useState("");
  const [novaEspecialidadeCodigoUri, setNovaEspecialidadeCodigoUri] = useState("");
  const [novaEspecialidadeCat, setNovaEspecialidadeCat] = useState("Consultas");
  const [novaEspecialidadeDuracao, setNovaEspecialidadeDuracao] = useState(30);
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");

  // Modal para editar Especialidade
  const [editingEspecialidade, setEditingEspecialidade] = useState(null);

  // Carregar dados
  useEffect(() => {
    const fetchDados = async () => {
      try {
        const emp = await fetchAdminCustomization();
        if (emp) {
          setEmpresaId(emp.id);
          const conf = emp.config_campos || {};

          if (Array.isArray(conf.modalidades_opcoes) && conf.modalidades_opcoes.length > 0) {
            setModalidadesOpcoes(conf.modalidades_opcoes);
          }
          if (conf.modalidade_padrao) {
            setModalidadePadrao(conf.modalidade_padrao);
          }
          if (conf.ocultar_valor_particular !== undefined) {
            setOcultarValorParticular(Boolean(conf.ocultar_valor_particular));
          } else if (conf.ocultar_valor_consulta !== undefined) {
            setOcultarValorParticular(Boolean(conf.ocultar_valor_consulta));
          }

          const mapCategorias = new Map();

          (servicos || []).forEach((s) => {
            if (s.especialidade) {
              s.especialidade
                .split(",")
                .map((e) => e.trim())
                .filter(Boolean)
                .forEach((espName) => {
                  const isExame = /(colonoscopia|endoscopia|ultrassom|exame|raio-x|tomografia|ressonancia)/i.test(
                    espName
                  );
                  mapCategorias.set(espName.toLowerCase(), {
                    nome: espName,
                    categoria: isExame ? "Exames" : "Consultas",
                    codigo_uri: null,
                    duracao_minutos: 30
                  });
                });
            }
          });

          if (Array.isArray(emp.especialidades)) {
            emp.especialidades.forEach((e) => {
              const espName = typeof e === "object" ? e.nome : e;
              if (espName && String(espName).trim()) {
                const nameClean = String(espName).trim();
                const isExame = /(colonoscopia|endoscopia|ultrassom|exame|raio-x|tomografia|ressonancia)/i.test(
                  nameClean
                );
                mapCategorias.set(nameClean.toLowerCase(), {
                  nome: nameClean,
                  categoria: isExame ? "Exames" : "Consultas",
                  codigo_uri: null,
                  duracao_minutos: 30
                });
              }
            });
          }

          if (Array.isArray(conf.especialidades_categorizadas)) {
            conf.especialidades_categorizadas.forEach((item) => {
              if (item?.nome && String(item.nome).trim()) {
                const nameClean = String(item.nome).trim();
                mapCategorias.set(nameClean.toLowerCase(), {
                  nome: nameClean,
                  categoria: item.categoria || "Consultas",
                  codigo_uri: item.codigo_uri ? String(item.codigo_uri).trim() : null,
                  duracao_minutos: Number(item.duracao_minutos) || 30
                });
              }
            });
          }

          if (mapCategorias.size === 0) {
            ["Nutricionista", "Gastroenterologista", "Colonoscopia", "Endoscopia", "Psicologia", "Cirurgia Geral"].forEach(
              (baseName) => {
                const isExame = /(colonoscopia|endoscopia|ultrassom|exame)/i.test(baseName);
                mapCategorias.set(baseName.toLowerCase(), {
                  nome: baseName,
                  categoria: isExame ? "Exames" : "Consultas",
                  codigo_uri: null,
                  duracao_minutos: 30
                });
              }
            );
          }

          const listaFinal = Array.from(mapCategorias.values()).sort((a, b) =>
            a.nome.localeCompare(b.nome)
          );
          setEspecialidadesCategorizadas(listaFinal);
        }
      } catch (err) {
        console.error("Erro ao carregar corpo clínico:", err);
      }
    };
    fetchDados();
  }, [servicos]);

  const handleOpenForm = (servico = null) => {
    setEditingServico(servico);
    if (setSubTab) setSubTab("formulario");
  };

  const handleCloseForm = () => {
    setEditingServico(null);
    if (setSubTab) setSubTab("corpo");
  };

  const handleSaveServico = async (formData, isEditing) => {
    setIsProcessing(true);
    try {
      const payload = {
        nome: formData.nome.trim(),
        codigo_uri: formData.codigo_uri?.trim() || null,
        numero_especialista:
          formData.codigo_uri && /^\d+$/.test(formData.codigo_uri.trim())
            ? parseInt(formData.codigo_uri.trim(), 10)
            : null,
        especialidade:
          formData.especialidade.length > 0 ? formData.especialidade.join(", ") : null,
        tipo: "Profissional",
        status_agendamento: formData.status_agendamento || (formData.redirecionar_whatsapp ? "whatsapp" : formData.ativo ? "ativo" : "inativo"),
        redirecionar_whatsapp: Boolean(formData.redirecionar_whatsapp || formData.status_agendamento === "whatsapp"),
        ativo: formData.status_agendamento !== "inativo" && formData.ativo !== false,
        tipo_contagem_dias: formData.tipo_contagem_dias || "corridos",
        preco: formData.preco ? parseFloat(formData.preco) : 0.0,
        dias_bloqueio_padrao: formData.dias_bloqueio_padrao
          ? parseInt(formData.dias_bloqueio_padrao, 10)
          : 0,
        agendamento_bloqueado_ate: formData.agendamento_bloqueado_ate || null,
        motivo_bloqueio_agenda: formData.motivo_bloqueio_agenda?.trim() || null
      };

      if (!isEditing && formData.id && formData.id.trim() !== "") {
        payload.id = formData.id.trim();
      }

      if (isEditing) {
        await actionAtualizarServico(formData.id, payload);
        showToast("Especialista atualizado com sucesso!");
      } else {
        await actionCriarServico(payload);
        showToast("Especialista cadastrado com sucesso!");
      }

      if (fetchServicos) {
        await fetchServicos();
      }

      handleCloseForm();
    } catch (error) {
      console.error(error);
      showToast(
        isEditing ? "Erro ao atualizar especialista." : "Erro ao cadastrar especialista.",
        "error"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Excluir Especialista
  const handleDeleteServico = async (srv) => {
    if (!window.confirm(`Deseja realmente excluir permanentemente o especialista "${srv.nome}"?`)) {
      return;
    }
    setIsProcessing(true);
    playDopamineSound("click");
    try {
      await actionDeletarServico(srv.id);
      showToast(`Especialista "${srv.nome}" excluído com sucesso!`);
      if (fetchServicos) {
        await fetchServicos();
      }
    } catch (error) {
      console.error(error);
      showToast(`Erro ao excluir especialista: ${error.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Persistir Modalidades
  const persistirModalidades = async (novasMods, padrao, ocultarVal) => {
    if (!empresaId) return;
    try {
      const { data: emp } = await supabase
        .from("empresas")
        .select("config_campos")
        .eq("id", empresaId)
        .single();

      const valOcultar = ocultarVal !== undefined ? ocultarVal : ocultarValorParticular;

      const updatedConfig = {
        ...(emp?.config_campos || {}),
        modalidades_opcoes: novasMods,
        modalidade_padrao: padrao || modalidadePadrao,
        ocultar_valor_particular: valOcultar,
        ocultar_valor_consulta: valOcultar
      };

      await supabase
        .from("empresas")
        .update({ config_campos: updatedConfig })
        .eq("id", empresaId);
    } catch (err) {
      console.error("Erro ao persistir modalidades:", err);
    }
  };

  const handleToggleOcultarValorGlobal = async (v) => {
    setOcultarValorParticular(v);
    await persistirModalidades(modalidadesOpcoes, modalidadePadrao, v);
    showToast(v ? "Valor da consulta ocultado no agendamento (mantido para métricas)." : "Valor da consulta visível no agendamento.");
  };

  const handleAddModalidade = async () => {
    const nova = {
      id: Date.now().toString(),
      codigo_uri: (modalidadesOpcoes.length + 1).toString(),
      nome: "Nova Modalidade",
      exige_senha: false,
      senha: ""
    };
    const updated = [...modalidadesOpcoes, nova];
    setModalidadesOpcoes(updated);
    await persistirModalidades(updated, modalidadePadrao);
    showToast("Modalidade adicionada!");
  };

  const handleUpdateModalidade = async (id, field, value) => {
    const updated = modalidadesOpcoes.map((m) => (m.id === id ? { ...m, [field]: value } : m));
    setModalidadesOpcoes(updated);
    await persistirModalidades(updated, modalidadePadrao);
  };

  const handleRemoveModalidade = async (id) => {
    if (modalidadesOpcoes.length <= 1) {
      showToast("Mantenha pelo menos uma modalidade de atendimento.", "error");
      return;
    }
    const updated = modalidadesOpcoes.filter((m) => m.id !== id);
    setModalidadesOpcoes(updated);
    await persistirModalidades(updated, modalidadePadrao);
    showToast("Modalidade removida.");
  };

  // Persistir Especialidades
  const persistirEspecialidades = async (novasEsps) => {
    if (!empresaId) return;
    try {
      const { data: emp } = await supabase
        .from("empresas")
        .select("config_campos")
        .eq("id", empresaId)
        .single();
      const updatedConfig = {
        ...(emp?.config_campos || {}),
        especialidades_categorizadas: novasEsps
      };

      const nomesSimples = novasEsps.map((e) => e.nome);

      await supabase
        .from("empresas")
        .update({
          config_campos: updatedConfig,
          especialidades: nomesSimples
        })
        .eq("id", empresaId);
    } catch (err) {
      console.error("Erro ao persistir especialidades:", err);
    }
  };

  const handleAddEspecialidade = async () => {
    const nomeLimpo = novaEspecialidadeNome.trim();
    if (!nomeLimpo) return;
    if (especialidadesCategorizadas.some((e) => e.nome.toLowerCase() === nomeLimpo.toLowerCase())) {
      showToast("Esta especialidade já está cadastrada.", "error");
      return;
    }

    const novaEsp = {
      nome: nomeLimpo,
      codigo_uri: novaEspecialidadeCodigoUri.trim() || null,
      categoria: novaEspecialidadeCat || "Consultas",
      duracao_minutos: Number(novaEspecialidadeDuracao) || 30
    };
    const updatedEsps = [...especialidadesCategorizadas, novaEsp];
    setEspecialidadesCategorizadas(updatedEsps);
    setNovaEspecialidadeNome("");
    setNovaEspecialidadeCodigoUri("");
    await persistirEspecialidades(updatedEsps);
    showToast(`Especialidade "${nomeLimpo}" cadastrada com sucesso!`);
  };

  const handleSaveEditedEspecialidade = async (originalNome, editedData) => {
    const updatedEsps = especialidadesCategorizadas.map((e) => {
      if (e.nome === originalNome) {
        return {
          ...e,
          nome: editedData.nome.trim() || e.nome,
          codigo_uri: editedData.codigo_uri ? String(editedData.codigo_uri).trim() : null,
          categoria: editedData.categoria || e.categoria || "Consultas",
          duracao_minutos: Number(editedData.duracao_minutos) || 30
        };
      }
      return e;
    });

    setEspecialidadesCategorizadas(updatedEsps);
    await persistirEspecialidades(updatedEsps);
    setEditingEspecialidade(null);
    showToast(`Especialidade "${editedData.nome || originalNome}" atualizada com sucesso!`);
  };

  const handleChangeEspecialidadeCategoria = async (espNome, novaCat) => {
    const updatedEsps = especialidadesCategorizadas.map((e) =>
      e.nome === espNome ? { ...e, categoria: novaCat } : e
    );
    setEspecialidadesCategorizadas(updatedEsps);
    await persistirEspecialidades(updatedEsps);
    showToast(`"${espNome}" classificada em "${novaCat}".`);
  };

  const handleChangeEspecialidadeUri = async (espNome, novoUri) => {
    const updatedEsps = especialidadesCategorizadas.map((e) =>
      e.nome === espNome ? { ...e, codigo_uri: novoUri.trim() || null } : e
    );
    setEspecialidadesCategorizadas(updatedEsps);
    await persistirEspecialidades(updatedEsps);
  };

  const handleChangeEspecialidadeDuracao = async (espNome, novaDuracao) => {
    const updatedEsps = especialidadesCategorizadas.map((e) =>
      e.nome === espNome ? { ...e, duracao_minutos: Number(novaDuracao) || 30 } : e
    );
    setEspecialidadesCategorizadas(updatedEsps);
    await persistirEspecialidades(updatedEsps);
    showToast(`Duração de "${espNome}" atualizada para ${novaDuracao} min.`);
  };

  const handleRemoveEspecialidade = async (espNome) => {
    if (!window.confirm(`Excluir a especialidade "${espNome}"?`)) return;
    const updatedEsps = especialidadesCategorizadas.filter((e) => e.nome !== espNome);
    setEspecialidadesCategorizadas(updatedEsps);
    await persistirEspecialidades(updatedEsps);
    showToast(`Especialidade "${espNome}" removida.`);
  };

  // Ordenação de Especialistas
  const handleSortEspecialistas = (key) => {
    let direction = "asc";
    if (sortEspecialistas.key === key && sortEspecialistas.direction === "asc") {
      direction = "desc";
    }
    setSortEspecialistas({ key, direction });
    playDopamineSound("click");
  };

  const filteredServicos = useMemo(() => {
    let list = servicos;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (s) =>
          s.nome.toLowerCase().includes(term) ||
          (s.codigo_uri && String(s.codigo_uri).toLowerCase().includes(term)) ||
          (s.especialidade && s.especialidade.toLowerCase().includes(term))
      );
    }

    if (sortEspecialistas.key) {
      list = [...list].sort((a, b) => {
        let valA = "";
        let valB = "";

        if (sortEspecialistas.key === "nome") {
          valA = a.nome || "";
          valB = b.nome || "";
        } else if (sortEspecialistas.key === "especialidade") {
          valA = a.especialidade || "";
          valB = b.especialidade || "";
        } else if (sortEspecialistas.key === "uri") {
          const numA = parseInt(a.codigo_uri || a.numero_especialista, 10);
          const numB = parseInt(b.codigo_uri || b.numero_especialista, 10);
          if (!isNaN(numA) && !isNaN(numB)) {
            return sortEspecialistas.direction === "asc" ? numA - numB : numB - numA;
          }
          valA = String(a.codigo_uri || a.numero_especialista || "");
          valB = String(b.codigo_uri || b.numero_especialista || "");
        } else if (sortEspecialistas.key === "disponibilidade") {
          valA = a.status_agendamento || (a.ativo ? "ativo" : "inativo");
          valB = b.status_agendamento || (b.ativo ? "ativo" : "inativo");
        } else if (sortEspecialistas.key === "preco") {
          const pA = Number(a.preco) || 0;
          const pB = Number(b.preco) || 0;
          return sortEspecialistas.direction === "asc" ? pA - pB : pB - pA;
        } else if (sortEspecialistas.key === "antecedencia") {
          const dA = Number(a.dias_bloqueio_padrao) || 0;
          const dB = Number(b.dias_bloqueio_padrao) || 0;
          return sortEspecialistas.direction === "asc" ? dA - dB : dB - dA;
        }

        const cmp = String(valA).localeCompare(String(valB), "pt-BR", { sensitivity: "base" });
        return sortEspecialistas.direction === "asc" ? cmp : -cmp;
      });
    }

    return list;
  }, [servicos, searchTerm, sortEspecialistas]);

  const servicosPausados = useMemo(() => {
    return servicos.filter((s) => s.agendamento_bloqueado_ate);
  }, [servicos]);

  // Ordenação de Especialidades
  const handleSortEspecialidades = (key) => {
    let direction = "asc";
    if (sortEspecialidades.key === key && sortEspecialidades.direction === "asc") {
      direction = "desc";
    }
    setSortEspecialidades({ key, direction });
    playDopamineSound("click");
  };

  const especialidadesFiltradas = useMemo(() => {
    let list = especialidadesCategorizadas;
    if (filtroCategoria !== "Todas") {
      list = list.filter((e) => e.categoria === filtroCategoria);
    }

    if (sortEspecialidades.key) {
      list = [...list].sort((a, b) => {
        let valA = "";
        let valB = "";

        if (sortEspecialidades.key === "nome") {
          valA = a.nome || "";
          valB = b.nome || "";
        } else if (sortEspecialidades.key === "categoria") {
          valA = a.categoria || "";
          valB = b.categoria || "";
        } else if (sortEspecialidades.key === "uri") {
          const numA = parseInt(a.codigo_uri, 10);
          const numB = parseInt(b.codigo_uri, 10);
          if (!isNaN(numA) && !isNaN(numB)) {
            return sortEspecialidades.direction === "asc" ? numA - numB : numB - numA;
          }
          valA = String(a.codigo_uri || "");
          valB = String(b.codigo_uri || "");
        } else if (sortEspecialidades.key === "duracao") {
          const dA = Number(a.duracao_minutos) || 30;
          const dB = Number(b.duracao_minutos) || 30;
          return sortEspecialidades.direction === "asc" ? dA - dB : dB - dA;
        }

        const cmp = String(valA).localeCompare(String(valB), "pt-BR", { sensitivity: "base" });
        return sortEspecialidades.direction === "asc" ? cmp : -cmp;
      });
    }

    return list;
  }, [especialidadesCategorizadas, filtroCategoria, sortEspecialidades]);

  return (
    <motion.div
      key="equipe"
      {...fadeUp}
      className="flex-1 flex flex-col h-full overflow-hidden w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8"
    >
      {/* CABEÇALHO UNIFICADO */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200/80 dark:border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Users size={20} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-950 dark:text-white tracking-tight">
              {subTab === "corpo" && "Corpo Clínico & Especialistas"}
              {subTab === "especialidades" && "Especialidades Médicas & Exames"}
              {subTab === "modalidades" && "Modalidades & Convênios"}
              {subTab === "pausas" && "Especialistas com Agenda Pausada"}
              {subTab === "formulario" && "Cadastro de Especialista"}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Gerencie colaboradores, categorias de atendimento, convênios, exames e pausas na agenda.
            </p>
          </div>
        </div>

        {subTab !== "formulario" && (
          <ButtonPrimary
            onClick={() => handleOpenForm()}
            icon={Plus}
            className="px-5 py-2 text-xs min-h-[38px] rounded-xl cursor-pointer"
          >
            Novo Especialista
          </ButtonPrimary>
        )}
      </div>

      {/* FORMULÁRIO */}
      <AnimatePresence>
        {subTab === "formulario" && (
          <ServicoForm
            initialData={editingServico}
            onSave={handleSaveServico}
            onCancel={handleCloseForm}
            loading={isProcessing}
            especialidadesList={especialidadesCategorizadas}
          />
        )}
      </AnimatePresence>

      {/* CONTEÚDO PRINCIPAL */}
      {subTab !== "formulario" && (
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-32 space-y-6 pr-1">
          {/* SUB-ABA 1: CORPO CLÍNICO */}
          {(subTab === "corpo" || subTab === "adicionar") && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl p-3.5 rounded-2xl border border-zinc-200/80 dark:border-white/10">
                <div className="relative w-full sm:w-80">
                  <Search
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                  />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar especialista, URI ou especialidade..."
                    className="w-full pl-9 pr-4 py-2 bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-[#9FC131]"
                  />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  {/* ALTERNADOR DE VISUALIZAÇÃO PADRONIZADO: CARDS VS LISTA */}
                  <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200/70 dark:border-zinc-700/60 shadow-inner">
                    <button
                      type="button"
                      onClick={() => handleToggleViewMode("cards")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        viewMode === "cards"
                          ? "bg-white dark:bg-black text-zinc-950 dark:text-white shadow-sm"
                          : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                      }`}
                      title="Visualizar em formato de Cards"
                    >
                      <LayoutGrid size={14} /> Cards
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleViewMode("lista")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        viewMode === "lista"
                          ? "bg-white dark:bg-black text-zinc-950 dark:text-white shadow-sm"
                          : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                      }`}
                      title="Visualizar em formato de Lista"
                    >
                      <List size={14} /> Lista
                    </button>
                  </div>

                  <span className="text-xs font-bold text-zinc-500 whitespace-nowrap">
                    {filteredServicos.length} especialista(s)
                  </span>
                </div>
              </div>

              {filteredServicos.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white/40 dark:bg-white/[0.02]">
                  <Users size={36} className="mx-auto text-zinc-400 mb-3" />
                  <h4 className="font-bold text-zinc-800 dark:text-zinc-200">
                    Nenhum especialista encontrado
                  </h4>
                  <p className="text-xs text-zinc-500 mt-1 mb-4">
                    Cadastre os profissionais da clínica para que fiquem disponíveis na agenda.
                  </p>
                  <ButtonPrimary
                    onClick={() => handleOpenForm()}
                    icon={Plus}
                    className="px-6 py-2.5 text-xs mx-auto"
                  >
                    Cadastrar Especialista
                  </ButtonPrimary>
                </div>
              ) : viewMode === "lista" ? (
                /* VISUALIZAÇÃO EM LISTA (TABELA MODERNA COM ORDENAÇÃO E BOTÃO EXCLUIR) */
                <div className="bg-white/85 dark:bg-[#0c0c0e]/85 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 text-zinc-400 font-bold uppercase tracking-wider text-[10px] select-none">
                          <th
                            onClick={() => handleSortEspecialistas("nome")}
                            className="p-4 cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors"
                          >
                            <div className="flex items-center gap-1">
                              <span>Especialista</span>
                              {sortEspecialistas.key === "nome" ? (
                                sortEspecialistas.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                              ) : (
                                <ArrowUpDown size={11} className="opacity-40" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortEspecialistas("especialidade")}
                            className="p-4 cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors"
                          >
                            <div className="flex items-center gap-1">
                              <span>Especialidades</span>
                              {sortEspecialistas.key === "especialidade" ? (
                                sortEspecialistas.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                              ) : (
                                <ArrowUpDown size={11} className="opacity-40" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortEspecialistas("uri")}
                            className="p-4 cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors"
                          >
                            <div className="flex items-center gap-1">
                              <span>URI</span>
                              {sortEspecialistas.key === "uri" ? (
                                sortEspecialistas.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                              ) : (
                                <ArrowUpDown size={11} className="opacity-40" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortEspecialistas("disponibilidade")}
                            className="p-4 cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors"
                          >
                            <div className="flex items-center gap-1">
                              <span>Disponibilidade</span>
                              {sortEspecialistas.key === "disponibilidade" ? (
                                sortEspecialistas.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                              ) : (
                                <ArrowUpDown size={11} className="opacity-40" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortEspecialistas("preco")}
                            className="p-4 cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors"
                          >
                            <div className="flex items-center gap-1">
                              <span>Particular</span>
                              {sortEspecialistas.key === "preco" ? (
                                sortEspecialistas.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                              ) : (
                                <ArrowUpDown size={11} className="opacity-40" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortEspecialistas("antecedencia")}
                            className="p-4 cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors"
                          >
                            <div className="flex items-center gap-1">
                              <span>Antecedência</span>
                              {sortEspecialistas.key === "antecedencia" ? (
                                sortEspecialistas.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                              ) : (
                                <ArrowUpDown size={11} className="opacity-40" />
                              )}
                            </div>
                          </th>
                          <th className="p-4 text-right whitespace-nowrap">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-medium">
                        {filteredServicos.map((srv) => {
                          const esps = srv.especialidade
                            ? srv.especialidade.split(",").map((e) => e.trim()).filter(Boolean)
                            : [];
                          return (
                            <tr key={srv.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40 transition-colors">
                              <td className="p-4 font-bold text-zinc-950 dark:text-white">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-600 dark:text-zinc-300">
                                    {srv.nome.charAt(0)}
                                  </div>
                                  <span className="font-extrabold text-sm">{srv.nome}</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                  {esps.length > 0 ? (
                                    esps.map((esp, i) => (
                                      <span
                                        key={i}
                                        className="text-[9.5px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 px-2 py-0.5 rounded"
                                      >
                                        {esp}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-zinc-400 italic text-[11px]">Geral</span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4">
                                {srv.codigo_uri ? (
                                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/50">
                                    #{srv.codigo_uri}
                                  </span>
                                ) : (
                                  <span className="text-zinc-400">-</span>
                                )}
                              </td>
                              <td className="p-4">
                                {srv.redirecionar_whatsapp || srv.status_agendamento === "whatsapp" ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/50">
                                    <MessageCircle size={11} /> Ativo Parcial
                                  </span>
                                ) : !srv.ativo || srv.status_agendamento === "inativo" ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/50">
                                    <Ban size={11} /> Inativo
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50">
                                    <CheckCircle2 size={11} /> Ativo Online
                                  </span>
                                )}
                              </td>
                              <td className="p-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                                {srv.preco ? `R$ ${Number(srv.preco).toFixed(2)}` : "R$ 0,00"}
                              </td>
                              <td className="p-4 text-zinc-600 dark:text-zinc-400">
                                {srv.dias_bloqueio_padrao > 0
                                  ? `${srv.dias_bloqueio_padrao} ${srv.tipo_contagem_dias || "dias"}`
                                  : "Imediato"}
                              </td>
                              <td className="p-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleOpenForm(srv)}
                                    className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition-all cursor-pointer border border-zinc-200/80 dark:border-zinc-700"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    onClick={() => handleDeleteServico(srv)}
                                    className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-red-200/60"
                                    title="Excluir especialista permanentemente"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* VISUALIZAÇÃO EM CARDS */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredServicos.map((srv) => (
                    <ServicoCard
                      key={srv.id}
                      srv={srv}
                      onEdit={handleOpenForm}
                      onDelete={handleDeleteServico}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SUB-ABA 2: ESPECIALIDADES MÉDICAS & EXAMES (COM LISTA, CARDS, EDIÇÃO E DURAÇÃO) */}
          {subTab === "especialidades" && (
            <div className="space-y-6">
              <section className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-8 rounded-[2rem] shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-white/5 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                      <Layers size={18} className="text-emerald-500" strokeWidth={1.5} /> Especialidades Médicas & Exames
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Cadastre as especialidades atendidas na clínica, atribua um Código URI e defina o tempo/duração exato de cada atendimento.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* ALTERNADOR DE VISUALIZAÇÃO EM ESPECIALIDADES: CARDS VS LISTA */}
                    <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200/70 dark:border-zinc-700/60 shadow-inner">
                      <button
                        type="button"
                        onClick={() => handleToggleViewModeEspecialidades("cards")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          viewModeEspecialidades === "cards"
                            ? "bg-white dark:bg-black text-zinc-950 dark:text-white shadow-sm"
                            : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                        }`}
                        title="Visualizar Especialidades em Cards"
                      >
                        <LayoutGrid size={14} /> Cards
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleViewModeEspecialidades("lista")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          viewModeEspecialidades === "lista"
                            ? "bg-white dark:bg-black text-zinc-950 dark:text-white shadow-sm"
                            : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                        }`}
                        title="Visualizar Especialidades em Lista"
                      >
                        <List size={14} /> Lista
                      </button>
                    </div>

                    {/* FILTRO POR CATEGORIA */}
                    <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
                      {["Todas", "Consultas", "Exames"].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setFiltroCategoria(cat)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                            filtroCategoria === cat
                              ? "bg-zinc-950 dark:bg-white text-white dark:text-black shadow-sm"
                              : "bg-zinc-100/70 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* FORMULÁRIO DE NOVA ESPECIALIDADE */}
                <div className="grid sm:grid-cols-12 gap-3 p-4 bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl">
                  <div className="sm:col-span-4">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                      Nome da Especialidade / Exame *
                    </label>
                    <input
                      type="text"
                      value={novaEspecialidadeNome}
                      onChange={(e) => setNovaEspecialidadeNome(e.target.value)}
                      placeholder="Ex: Nutricionista, Colonoscopia..."
                      className="w-full px-3.5 py-2 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none focus:border-[#9FC131] font-semibold text-zinc-900 dark:text-white"
                      onKeyDown={(e) => e.key === "Enter" && handleAddEspecialidade()}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                      Código URI (Opcional)
                    </label>
                    <input
                      type="text"
                      value={novaEspecialidadeCodigoUri}
                      onChange={(e) => setNovaEspecialidadeCodigoUri(e.target.value)}
                      placeholder="Ex: 8 ou nutri"
                      className="w-full px-3 py-2 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono outline-none focus:border-[#9FC131] text-zinc-800 dark:text-zinc-200"
                      onKeyDown={(e) => e.key === "Enter" && handleAddEspecialidade()}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                      Categoria
                    </label>
                    <select
                      value={novaEspecialidadeCat}
                      onChange={(e) => setNovaEspecialidadeCat(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none text-zinc-800 dark:text-zinc-200 font-bold cursor-pointer"
                    >
                      <option value="Consultas">Consultas</option>
                      <option value="Exames">Exames</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                      Duração (Tempo)
                    </label>
                    <select
                      value={novaEspecialidadeDuracao}
                      onChange={(e) => setNovaEspecialidadeDuracao(Number(e.target.value))}
                      className="w-full px-2.5 py-2 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none text-zinc-800 dark:text-zinc-200 font-bold cursor-pointer"
                    >
                      <option value={10}>10 min</option>
                      <option value={15}>15 min</option>
                      <option value={20}>20 min</option>
                      <option value={30}>30 min</option>
                      <option value={40}>40 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>60 min (1h)</option>
                      <option value={90}>90 min</option>
                      <option value={120}>120 min (2h)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 flex items-end">
                    <ButtonPrimary
                      onClick={handleAddEspecialidade}
                      disabled={!novaEspecialidadeNome.trim()}
                      icon={Plus}
                      className="w-full py-2 text-xs min-h-[36px] rounded-xl justify-center"
                    >
                      Adicionar
                    </ButtonPrimary>
                  </div>
                </div>

                {/* MODAL DE EDIÇÃO DE ESPECIALIDADE */}
                <AnimatePresence>
                  {editingEspecialidade && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                      <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
                        <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
                          <h4 className="font-bold text-sm text-zinc-950 dark:text-white flex items-center gap-2">
                            <Pencil size={15} className="text-blue-500" /> Editar Especialidade
                          </h4>
                          <button
                            type="button"
                            onClick={() => setEditingEspecialidade(null)}
                            className="text-zinc-400 hover:text-zinc-950 dark:hover:text-white font-bold cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="space-y-3.5">
                          <TextInput
                            label="Nome da Especialidade *"
                            value={editingEspecialidade.nome}
                            onChange={(e) =>
                              setEditingEspecialidade({ ...editingEspecialidade, nome: e.target.value })
                            }
                          />

                          <TextInput
                            label="Código URI (URL)"
                            placeholder="Ex: 8"
                            value={editingEspecialidade.codigo_uri || ""}
                            onChange={(e) =>
                              setEditingEspecialidade({
                                ...editingEspecialidade,
                                codigo_uri: e.target.value
                              })
                            }
                          />

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                                Categoria
                              </label>
                              <select
                                value={editingEspecialidade.categoria || "Consultas"}
                                onChange={(e) =>
                                  setEditingEspecialidade({
                                    ...editingEspecialidade,
                                    categoria: e.target.value
                                  })
                                }
                                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold outline-none text-zinc-800 dark:text-zinc-200"
                              >
                                <option value="Consultas">Consultas</option>
                                <option value="Exames">Exames</option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                                Duração (Tempo)
                              </label>
                              <select
                                value={editingEspecialidade.duracao_minutos || 30}
                                onChange={(e) =>
                                  setEditingEspecialidade({
                                    ...editingEspecialidade,
                                    duracao_minutos: Number(e.target.value)
                                  })
                                }
                                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold outline-none text-blue-600 dark:text-blue-400"
                              >
                                <option value={10}>10 min</option>
                                <option value={15}>15 min</option>
                                <option value={20}>20 min</option>
                                <option value={30}>30 min</option>
                                <option value={40}>40 min</option>
                                <option value={45}>45 min</option>
                                <option value={60}>60 min (1h)</option>
                                <option value={90}>90 min</option>
                                <option value={120}>120 min (2h)</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                          <button
                            type="button"
                            onClick={() => setEditingEspecialidade(null)}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <ButtonPrimary
                            onClick={() =>
                              handleSaveEditedEspecialidade(
                                editingEspecialidade.originalNome || editingEspecialidade.nome,
                                editingEspecialidade
                              )
                            }
                            icon={CheckCircle2}
                            className="px-5 py-2 text-xs rounded-xl"
                          >
                            Salvar Alterações
                          </ButtonPrimary>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* LISTAGEM DE ESPECIALIDADES EM LISTA OU CARDS */}
                {especialidadesFiltradas.length === 0 ? (
                  <div className="py-12 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                    Nenhuma especialidade encontrada nesta categoria.
                  </div>
                ) : viewModeEspecialidades === "lista" ? (
                  /* VISUALIZAÇÃO EM LISTA (TABELA) */
                  <div className="bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-800/70 text-zinc-400 font-bold uppercase tracking-wider text-[10px] select-none">
                            <th className="p-3.5 w-12 text-center">#</th>
                            <th
                              onClick={() => handleSortEspecialidades("nome")}
                              className="p-3.5 cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors"
                            >
                              <div className="flex items-center gap-1">
                                <span>Especialidade / Exame</span>
                                {sortEspecialidades.key === "nome" ? (
                                  sortEspecialidades.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                                ) : (
                                  <ArrowUpDown size={11} className="opacity-40" />
                                )}
                              </div>
                            </th>
                            <th
                              onClick={() => handleSortEspecialidades("uri")}
                              className="p-3.5 cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors"
                            >
                              <div className="flex items-center gap-1">
                                <span>Código URI</span>
                                {sortEspecialidades.key === "uri" ? (
                                  sortEspecialidades.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                                ) : (
                                  <ArrowUpDown size={11} className="opacity-40" />
                                )}
                              </div>
                            </th>
                            <th
                              onClick={() => handleSortEspecialidades("categoria")}
                              className="p-3.5 cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors"
                            >
                              <div className="flex items-center gap-1">
                                <span>Categoria</span>
                                {sortEspecialidades.key === "categoria" ? (
                                  sortEspecialidades.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                                ) : (
                                  <ArrowUpDown size={11} className="opacity-40" />
                                )}
                              </div>
                            </th>
                            <th
                              onClick={() => handleSortEspecialidades("duracao")}
                              className="p-3.5 cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors"
                            >
                              <div className="flex items-center gap-1">
                                <span>Duração (Slot)</span>
                                {sortEspecialidades.key === "duracao" ? (
                                  sortEspecialidades.direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                                ) : (
                                  <ArrowUpDown size={11} className="opacity-40" />
                                )}
                              </div>
                            </th>
                            <th className="p-3.5 text-right whitespace-nowrap">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
                          {especialidadesFiltradas.map((esp, idx) => (
                            <tr key={esp.nome} className="hover:bg-white dark:hover:bg-zinc-800/50 transition-colors">
                              <td className="p-3.5 text-center font-bold text-zinc-400 font-mono text-[11px]">
                                {idx + 1}
                              </td>
                              <td className="p-3.5 font-bold text-zinc-950 dark:text-white">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                                    <Stethoscope size={14} />
                                  </div>
                                  <span className="text-sm">{esp.nome}</span>
                                </div>
                              </td>
                              <td className="p-3.5">
                                {esp.codigo_uri ? (
                                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/50">
                                    #{esp.codigo_uri}
                                  </span>
                                ) : (
                                  <span className="text-zinc-400">-</span>
                                )}
                              </td>
                              <td className="p-3.5">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                                  {esp.categoria || "Consultas"}
                                </span>
                              </td>
                              <td className="p-3.5 font-bold text-blue-600 dark:text-blue-400">
                                {esp.duracao_minutos || 30} min
                              </td>
                              <td className="p-3.5 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditingEspecialidade({
                                        ...esp,
                                        originalNome: esp.nome
                                      })
                                    }
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                                    title="Editar especialidade"
                                  >
                                    <Pencil size={11} /> Editar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveEspecialidade(esp.nome)}
                                    className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-red-200/60"
                                    title="Excluir especialidade"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  /* VISUALIZAÇÃO EM CARDS */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                    {especialidadesFiltradas.map((esp) => (
                      <div
                        key={esp.nome}
                        className="p-4 bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl flex flex-col justify-between gap-3 group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-sm text-zinc-950 dark:text-white truncate">
                                {esp.nome}
                              </h4>
                              {esp.codigo_uri && (
                                <span className="inline-flex items-center px-1.5 py-0.5 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[10px] font-mono font-bold rounded border border-purple-200/60 dark:border-purple-900/40 shrink-0">
                                  #{esp.codigo_uri}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                setEditingEspecialidade({
                                  ...esp,
                                  originalNome: esp.nome
                                })
                              }
                              className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                              title="Editar especialidade"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleRemoveEspecialidade(esp.nome)}
                              className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Excluir especialidade"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-100 dark:border-white/5">
                          <div>
                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">
                              Código URI
                            </label>
                            <input
                              type="text"
                              defaultValue={esp.codigo_uri || ""}
                              onBlur={(e) => handleChangeEspecialidadeUri(esp.nome, e.target.value)}
                              placeholder="Ex: 8"
                              className="w-full text-xs font-mono font-bold bg-white dark:bg-black border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 outline-none text-zinc-800 dark:text-zinc-200 focus:border-[#9FC131]"
                            />
                          </div>

                          <div>
                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">
                              Categoria
                            </label>
                            <select
                              value={esp.categoria || "Consultas"}
                              onChange={(e) =>
                                handleChangeEspecialidadeCategoria(esp.nome, e.target.value)
                              }
                              className="w-full text-[10px] font-extrabold uppercase tracking-wider bg-white dark:bg-black border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1.5 outline-none text-zinc-700 dark:text-zinc-300 cursor-pointer"
                            >
                              <option value="Consultas">Consultas</option>
                              <option value="Exames">Exames</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">
                              Duração
                            </label>
                            <select
                              value={esp.duracao_minutos || 30}
                              onChange={(e) =>
                                handleChangeEspecialidadeDuracao(esp.nome, e.target.value)
                              }
                              className="w-full text-[10px] font-extrabold bg-white dark:bg-black border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 outline-none text-blue-600 dark:text-blue-400 cursor-pointer"
                            >
                              <option value={10}>10 min</option>
                              <option value={15}>15 min</option>
                              <option value={20}>20 min</option>
                              <option value={30}>30 min</option>
                              <option value={40}>40 min</option>
                              <option value={45}>45 min</option>
                              <option value={60}>60 min</option>
                              <option value={90}>90 min</option>
                              <option value={120}>120 min</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* SUB-ABA 3: MODALIDADES & CONVÊNIOS */}
          {subTab === "modalidades" && (
            <div className="space-y-6">
              <section className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-8 rounded-[2rem] shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4 border-b border-zinc-100 dark:border-white/5 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                      <ShieldCheck size={18} strokeWidth={1.5} className="text-emerald-500" /> Modalidades de Atendimento & Convênios
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">
                      Configure os planos aceitos, coberturas particulares e seus códigos URI para acesso direto por link.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddModalidade}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-950 dark:bg-white text-white dark:text-black text-xs font-bold rounded-xl transition-all shadow-sm min-h-[38px] cursor-pointer"
                  >
                    <Plus size={15} /> Adicionar Modalidade
                  </button>
                </div>

                {/* CONFIGURAÇÃO DE EXIBIÇÃO DE VALOR NO AGENDAMENTO */}
                <div className="mb-6 p-5 bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                  <div className="space-y-1">
                    <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                      <DollarSign size={15} className="text-[#9FC131]" /> Exibição de Valores na Última Etapa de Agendamento
                    </h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-2xl">
                      Habilite ou desabilite a visualização do valor da consulta para o paciente no checkout / confirmação final. O valor é preservado internamente no banco de dados para cálculos de faturamento e métricas da clínica.
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={ocultarValorParticular}
                    onChange={handleToggleOcultarValorGlobal}
                    label={ocultarValorParticular ? "Valor Ocultado" : "Valor Visível"}
                  />
                </div>

                <div className="mb-6 p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <CustomSelect
                      label="Modalidade Padrão Inicial"
                      value={modalidadePadrao}
                      onChange={(v) => {
                        setModalidadePadrao(v);
                        persistirModalidades(modalidadesOpcoes, v);
                      }}
                      options={modalidadesOpcoes.map((m) => ({
                        value: m.nome,
                        label: `${m.nome} (${m.codigo_uri ? `ID URI: ${m.codigo_uri}` : `ID: ${m.id}`})`
                      }))}
                    />
                  </div>
                  <div className="text-[11px] text-blue-700 dark:text-blue-300 font-medium bg-blue-100/60 dark:bg-blue-900/40 p-3 rounded-xl">
                    💡 <strong>Link Direto:</strong> Adicione <code className="font-mono bg-white dark:bg-black px-1 py-0.5 rounded">?modalidade=ID</code> ao link da clínica para pré-selecionar a modalidade automaticamente.
                  </div>
                </div>

                <div className="space-y-3">
                  {modalidadesOpcoes.map((mod, index) => {
                    const idExibicao = mod.codigo_uri || String(index + 1);
                    return (
                      <div
                        key={mod.id}
                        className="p-4 sm:p-5 bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl flex flex-col md:flex-row gap-4 items-start md:items-center justify-between shadow-sm"
                      >
                        <div className="flex items-center gap-2 mb-2 md:mb-0">
                          <span className="px-2.5 py-1 rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-black font-mono text-[11px] font-extrabold whitespace-nowrap shadow-sm">
                            # ID: {idExibicao}
                          </span>
                        </div>

                        <div className="flex-1 w-full grid sm:grid-cols-3 gap-3">
                          <TextInput
                            label="Nome da Modalidade / Convênio"
                            placeholder="Ex: Particular, Unimed, Bradesco"
                            value={mod.nome}
                            onChange={(e) => handleUpdateModalidade(mod.id, "nome", e.target.value)}
                          />
                          <TextInput
                            label="Código / ID na URI (URL)"
                            placeholder="Ex: 1, 2, unimed"
                            value={mod.codigo_uri || ""}
                            onChange={(e) => handleUpdateModalidade(mod.id, "codigo_uri", e.target.value)}
                          />
                          {mod.exige_senha ? (
                            <TextInput
                              label="Senha / Token Exigido"
                              placeholder="Senha de autorização"
                              value={mod.senha || ""}
                              onChange={(e) => handleUpdateModalidade(mod.id, "senha", e.target.value)}
                            />
                          ) : (
                            <div className="hidden sm:flex items-center text-[10px] text-zinc-400 font-mono">
                              Link: ?modalidade={idExibicao}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end flex-wrap">
                          <ToggleSwitch
                            checked={Boolean(mod.ocultar_valor)}
                            onChange={(v) => handleUpdateModalidade(mod.id, "ocultar_valor", v)}
                            label="Ocultar Valor"
                          />
                          <ToggleSwitch
                            checked={mod.exige_senha}
                            onChange={(v) => handleUpdateModalidade(mod.id, "exige_senha", v)}
                            label="Exigir Senha"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveModalidade(mod.id)}
                            className="p-2 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
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
            </div>
          )}

          {/* SUB-ABA 4: PAUSAS NA AGENDA */}
          {subTab === "pausas" && (
            <div className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-8 rounded-[2rem] shadow-sm space-y-6">
              <div className="border-b border-zinc-100 dark:border-white/5 pb-4">
                <h3 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                  <PauseCircle size={18} className="text-amber-500" strokeWidth={1.5} /> Especialistas com Agenda Pausada
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Profissionais que estão temporariamente indisponíveis para novos agendamentos online.
                </p>
              </div>

              {servicosPausados.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs">
                  Nenhum especialista com pausa temporária ativa no momento.
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {servicosPausados.map((s) => (
                    <div
                      key={s.id}
                      className="p-5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl flex items-center justify-between"
                    >
                      <div>
                        <h4 className="font-bold text-zinc-900 dark:text-white text-sm">
                          {s.nome}
                        </h4>
                        <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                          Pausado até{" "}
                          <strong>
                            {new Date(`${s.agendamento_bloqueado_ate}T12:00:00`).toLocaleDateString(
                              "pt-BR"
                            )}
                          </strong>
                        </p>
                        {s.motivo_bloqueio_agenda && (
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            Motivo: {s.motivo_bloqueio_agenda}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleOpenForm(s)}
                        className="px-4 py-2 bg-white dark:bg-zinc-800 border border-amber-200 text-amber-900 dark:text-amber-300 text-xs font-bold rounded-xl cursor-pointer"
                      >
                        Editar Pausa
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
