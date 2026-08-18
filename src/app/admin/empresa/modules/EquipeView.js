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
  PauseCircle,
  Search,
  Hash,
  Users,
  Tag,
  FolderPlus
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
import { actionAtualizarServico, actionCriarServico, actionSalvarCustomization, fetchAdminCustomization } from "@/actions/adminData";

// ==========================================
// COMPONENTE: CARD DO PROFISSIONAL
// ==========================================
const ServicoCard = ({ srv, onEdit }) => {
  const especialidadesArray = srv.especialidade
    ? srv.especialidade.split(",").map((e) => e.trim()).filter(Boolean)
    : [];

  return (
    <motion.div
      variants={staggerItem}
      layoutId={`card-${srv.id}`}
      className="bg-white/85 dark:bg-[#0c0c0e]/85 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-7 rounded-[2rem] shadow-sm hover:shadow-xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
    >
      <button
        onClick={() => onEdit(srv)}
        className="absolute top-5 right-5 w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 flex items-center justify-center text-zinc-400 opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 hover:text-zinc-900 dark:hover:text-white shadow-md z-20"
        title="Editar Especialista"
      >
        <PenLine size={16} strokeWidth={2} />
      </button>

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

          {!srv.ativo ? (
            <span className="inline-flex items-center px-2.5 py-0.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-widest rounded-lg">
              Inativo
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-lg">
              Ativo
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
// COMPONENTE: FORMULÁRIO (CADASTRO E EDIÇÃO)
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
    ativo: initialData?.ativo !== false
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
          className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-all flex items-center justify-center"
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
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
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

            <div className="flex items-center h-full pt-2">
              <ToggleSwitch
                checked={formData.ativo}
                onChange={(val) => setFormData({ ...formData, ativo: val })}
                label="Cadastro Ativo na Agenda"
              />
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
              placeholder="Ex: 1"
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
          className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
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
  fetchServicos
}) {
  const [editingServico, setEditingServico] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Estados para Categorias e Especialidades
  const [empresaId, setEmpresaId] = useState(null);
  const [categoriasList, setCategoriasList] = useState(["Consultas", "Exames"]);
  const [novaCategoria, setNovaCategoria] = useState("");

  // Especialidades estruturadas: [{ nome: "Cardiologia", categoria: "Consultas" }, ...]
  const [especialidadesCategorizadas, setEspecialidadesCategorizadas] = useState([]);
  const [novaEspecialidadeNome, setNovaEspecialidadeNome] = useState("");
  const [novaEspecialidadeCat, setNovaEspecialidadeCat] = useState("Consultas");
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");

  useEffect(() => {
    const fetchDados = async () => {
      const { data } = await supabase
        .from("empresas")
        .select("id, especialidades, config_campos")
        .limit(1)
        .single();
      if (data) {
        setEmpresaId(data.id);
        const conf = data.config_campos || {};

        // 1. Categorias
        const savedCats = Array.isArray(conf.categorias_atendimento) && conf.categorias_atendimento.length > 0
          ? conf.categorias_atendimento
          : ["Consultas", "Exames"];
        setCategoriasList(savedCats);
        setNovaEspecialidadeCat(savedCats[0] || "Consultas");

        // 2. Especialidades categorizadas
        let savedEspCat = [];
        if (Array.isArray(conf.especialidades_categorizadas) && conf.especialidades_categorizadas.length > 0) {
          savedEspCat = conf.especialidades_categorizadas;
        } else if (Array.isArray(data.especialidades)) {
          // Migrar especialidades antigas simples
          savedEspCat = data.especialidades.map((e) => {
            const nomeStr = typeof e === "object" ? e.nome : e;
            const isExame = /(colonoscopia|endoscopia|ultrassom|exame|raio-x|tomografia|ressonancia)/i.test(nomeStr);
            return {
              nome: nomeStr,
              categoria: isExame ? "Exames" : "Consultas"
            };
          });
        }
        setEspecialidadesCategorizadas(savedEspCat);
      }
    };
    fetchDados();
  }, []);

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
        ativo: formData.ativo,
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

  // Persistir Categorias e Especialidades
  const persistirCategoriasEEspecialidades = async (novasCats, novasEsps) => {
    if (!empresaId) return;
    try {
      const { data: emp } = await supabase
        .from("empresas")
        .select("config_campos")
        .eq("id", empresaId)
        .single();
      const updatedConfig = {
        ...(emp?.config_campos || {}),
        categorias_atendimento: novasCats,
        especialidades_categorizadas: novasEsps
      };

      // Array simples de nomes de especialidades para manter compatibilidade
      const nomesSimples = novasEsps.map((e) => e.nome);

      await Promise.all([
        supabase
          .from("empresas")
          .update({
            config_campos: updatedConfig,
            especialidades: nomesSimples
          })
          .eq("id", empresaId)
      ]);
    } catch (err) {
      console.error("Erro ao persistir especialidades:", err);
    }
  };

  // Ações de Categorias
  const handleAddCategoria = async () => {
    const nomeLimpo = novaCategoria.trim();
    if (!nomeLimpo) return;
    if (categoriasList.some((c) => c.toLowerCase() === nomeLimpo.toLowerCase())) {
      showToast("Esta categoria já existe.", "error");
      return;
    }
    const updated = [...categoriasList, nomeLimpo];
    setCategoriasList(updated);
    setNovaCategoria("");
    await persistirCategoriasEEspecialidades(updated, especialidadesCategorizadas);
    showToast(`Categoria "${nomeLimpo}" adicionada!`);
  };

  const handleRemoveCategoria = async (catNome) => {
    if (categoriasList.length <= 1) {
      showToast("Mantenha pelo menos uma categoria cadastrada.", "error");
      return;
    }
    if (!window.confirm(`Excluir a categoria "${catNome}"? As especialidades dela serão movidas para a categoria padrão.`)) return;

    const fallbackCat = categoriasList.find((c) => c !== catNome) || "Geral";
    const updatedCats = categoriasList.filter((c) => c !== catNome);
    const updatedEsps = especialidadesCategorizadas.map((e) =>
      e.categoria === catNome ? { ...e, categoria: fallbackCat } : e
    );

    setCategoriasList(updatedCats);
    setEspecialidadesCategorizadas(updatedEsps);
    await persistirCategoriasEEspecialidades(updatedCats, updatedEsps);
    showToast(`Categoria "${catNome}" removida.`);
  };

  // Ações de Especialidades
  const handleAddEspecialidade = async () => {
    const nomeLimpo = novaEspecialidadeNome.trim();
    if (!nomeLimpo) return;
    if (especialidadesCategorizadas.some((e) => e.nome.toLowerCase() === nomeLimpo.toLowerCase())) {
      showToast("Esta especialidade já está cadastrada.", "error");
      return;
    }

    const novaEsp = {
      nome: nomeLimpo,
      categoria: novaEspecialidadeCat || categoriasList[0] || "Consultas"
    };
    const updatedEsps = [...especialidadesCategorizadas, novaEsp];
    setEspecialidadesCategorizadas(updatedEsps);
    setNovaEspecialidadeNome("");
    await persistirCategoriasEEspecialidades(categoriasList, updatedEsps);
    showToast(`Especialidade "${nomeLimpo}" cadastrada em "${novaEsp.categoria}"!`);
  };

  const handleChangeEspecialidadeCategoria = async (espNome, novaCat) => {
    const updatedEsps = especialidadesCategorizadas.map((e) =>
      e.nome === espNome ? { ...e, categoria: novaCat } : e
    );
    setEspecialidadesCategorizadas(updatedEsps);
    await persistirCategoriasEEspecialidades(categoriasList, updatedEsps);
    showToast(`"${espNome}" agora está em "${novaCat}".`);
  };

  const handleRemoveEspecialidade = async (espNome) => {
    if (!window.confirm(`Excluir a especialidade "${espNome}"?`)) return;
    const updatedEsps = especialidadesCategorizadas.filter((e) => e.nome !== espNome);
    setEspecialidadesCategorizadas(updatedEsps);
    await persistirCategoriasEEspecialidades(categoriasList, updatedEsps);
    showToast(`Especialidade "${espNome}" removida.`);
  };

  const filteredServicos = useMemo(() => {
    if (!searchTerm.trim()) return servicos;
    const term = searchTerm.toLowerCase();
    return servicos.filter(
      (s) =>
        s.nome.toLowerCase().includes(term) ||
        (s.codigo_uri && s.codigo_uri.toLowerCase().includes(term)) ||
        (s.especialidade && s.especialidade.toLowerCase().includes(term))
    );
  }, [servicos, searchTerm]);

  const servicosPausados = useMemo(() => {
    return servicos.filter((s) => s.agendamento_bloqueado_ate);
  }, [servicos]);

  const especialidadesFiltradas = useMemo(() => {
    if (filtroCategoria === "Todas") return especialidadesCategorizadas;
    return especialidadesCategorizadas.filter((e) => e.categoria === filtroCategoria);
  }, [especialidadesCategorizadas, filtroCategoria]);

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
              {subTab === "especialidades" && "Categorias & Especialidades"}
              {subTab === "pausas" && "Especialistas com Agenda Pausada"}
              {subTab === "formulario" && "Cadastro de Especialista"}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Gerencie colaboradores, categorias de atendimento, exames, consultas e pausas de agenda.
            </p>
          </div>
        </div>

        {subTab !== "formulario" && (
          <ButtonPrimary
            onClick={() => handleOpenForm()}
            icon={Plus}
            className="px-5 py-2 text-xs min-h-[38px] rounded-xl"
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

                <span className="text-xs font-bold text-zinc-500">
                  {filteredServicos.length} especialista(s) cadastrado(s)
                </span>
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
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredServicos.map((srv) => (
                    <ServicoCard key={srv.id} srv={srv} onEdit={handleOpenForm} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SUB-ABA 2: CATEGORIAS & ESPECIALIDADES */}
          {subTab === "especialidades" && (
            <div className="space-y-6">
              {/* BLOCO 1: CATEGORIAS DE ATENDIMENTO (CRIADAS PELO CLIENTE) */}
              <section className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-8 rounded-[2rem] shadow-sm space-y-5">
                <div className="border-b border-zinc-100 dark:border-white/5 pb-3">
                  <h3 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                    <FolderPlus size={18} className="text-blue-500" strokeWidth={1.5} /> Categorias de Atendimento
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Crie categorias personalizadas (como Consultas, Exames, Procedimentos, etc.). Elas são usadas para agrupar especialidades e aparecem automaticamente no motor de mensagens.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={novaCategoria}
                    onChange={(e) => setNovaCategoria(e.target.value)}
                    placeholder="Ex: Consultas, Exames, Procedimentos, Cirurgias..."
                    className="flex-1 px-4 py-2.5 bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-[#9FC131]"
                    onKeyDown={(e) => e.key === "Enter" && handleAddCategoria()}
                  />
                  <ButtonPrimary
                    onClick={handleAddCategoria}
                    disabled={!novaCategoria.trim()}
                    icon={Plus}
                    className="px-5 py-2.5 text-xs min-h-[38px] rounded-xl"
                  >
                    Adicionar Categoria
                  </ButtonPrimary>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {categoriasList.map((cat) => (
                    <div
                      key={cat}
                      className="px-3.5 py-1.5 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-2 shadow-sm"
                    >
                      <Tag size={12} className="text-blue-500" />
                      <span>{cat}</span>
                      <button
                        onClick={() => handleRemoveCategoria(cat)}
                        className="text-zinc-400 hover:text-red-500 transition-colors p-0.5"
                        title={`Excluir categoria "${cat}"`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {/* BLOCO 2: ESPECIALIDADES CADASTRADAS E ASSOCIAÇÃO À CATEGORIA */}
              <section className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-8 rounded-[2rem] shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-white/5 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                      <Layers size={18} className="text-emerald-500" strokeWidth={1.5} /> Especialidades & Classificação
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Cadastre as especialidades médicas ou exames e vincule-os à respectiva categoria de atendimento.
                    </p>
                  </div>

                  {/* FILTRO POR CATEGORIA */}
                  <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
                    {["Todas", ...categoriasList].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setFiltroCategoria(cat)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
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

                {/* FORMULÁRIO DE NOVA ESPECIALIDADE */}
                <div className="grid sm:grid-cols-12 gap-3 p-4 bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl">
                  <div className="sm:col-span-6">
                    <input
                      type="text"
                      value={novaEspecialidadeNome}
                      onChange={(e) => setNovaEspecialidadeNome(e.target.value)}
                      placeholder="Nome da especialidade (ex: Colonoscopia, Cardiologia...)"
                      className="w-full px-4 py-2.5 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none focus:border-[#9FC131]"
                      onKeyDown={(e) => e.key === "Enter" && handleAddEspecialidade()}
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <select
                      value={novaEspecialidadeCat}
                      onChange={(e) => setNovaEspecialidadeCat(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none text-zinc-800 dark:text-zinc-200 font-bold"
                    >
                      {categoriasList.map((c) => (
                        <option key={c} value={c}>
                          Categoria: {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2 flex items-center">
                    <ButtonPrimary
                      onClick={handleAddEspecialidade}
                      disabled={!novaEspecialidadeNome.trim()}
                      icon={Plus}
                      className="w-full py-2.5 text-xs min-h-[38px] rounded-xl justify-center"
                    >
                      Adicionar
                    </ButtonPrimary>
                  </div>
                </div>

                {/* LISTA DE ESPECIALIDADES CADASTRADAS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                  {especialidadesFiltradas.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                      Nenhuma especialidade encontrada nesta categoria.
                    </div>
                  ) : (
                    especialidadesFiltradas.map((esp) => (
                      <div
                        key={esp.nome}
                        className="p-3.5 bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl flex items-center justify-between gap-2 group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-xs text-zinc-950 dark:text-white truncate">
                            {esp.nome}
                          </h4>
                          <div className="mt-1">
                            <select
                              value={esp.categoria}
                              onChange={(e) =>
                                handleChangeEspecialidadeCategoria(esp.nome, e.target.value)
                              }
                              className="text-[10px] font-extrabold uppercase tracking-wider bg-white dark:bg-black border border-zinc-200 dark:border-zinc-700 rounded-md px-2 py-0.5 outline-none text-zinc-700 dark:text-zinc-300 cursor-pointer"
                            >
                              {categoriasList.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveEspecialidade(esp.nome)}
                          className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                          title="Excluir especialidade"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          )}

          {/* SUB-ABA 3: PAUSAS NA AGENDA */}
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
                        className="px-4 py-2 bg-white dark:bg-zinc-800 border border-amber-200 text-amber-900 dark:text-amber-300 text-xs font-bold rounded-xl"
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
