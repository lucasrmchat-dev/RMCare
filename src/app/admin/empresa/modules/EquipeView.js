"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PenLine,
  Plus,
  X,
  Stethoscope,
  DollarSign,
  CalendarDays,
  CheckCircle2,
  Trash2,
  Layers,
  PauseCircle,
  Search,
  UserCheck,
  LayoutGrid,
  List,
  Hash,
  Link,
  Users
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
import { actionAtualizarServico, actionCriarServico } from "@/actions/adminData";

// ==========================================
// COMPONENTE: CARD DO SERVIÇO / PROFISSIONAL
// ==========================================
const ServicoCard = ({ srv, onEdit }) => {
  return (
    <motion.div
      variants={staggerItem}
      layoutId={`card-${srv.id}`}
      className="bg-white dark:bg-[#111] border border-zinc-200/80 dark:border-zinc-800 p-7 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-500 flex flex-col justify-between group relative overflow-hidden"
    >
      <button
        onClick={() => onEdit(srv)}
        className="absolute top-6 right-6 w-11 h-11 rounded-full bg-white/90 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-center text-zinc-400 opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 hover:text-zinc-900 dark:hover:text-white shadow-md z-20"
        title="Editar Profissional/Serviço"
      >
        <PenLine size={18} strokeWidth={2.5} />
      </button>

      <div className="relative z-10">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px] font-black uppercase tracking-widest rounded-lg">
            <Stethoscope size={12} />
            {srv.tipo || "Consulta"}
          </span>

          {srv.codigo_uri && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[10px] font-mono font-bold rounded-lg border border-purple-200/60 dark:border-purple-900/40" title={`Link direto: ?especialista=${srv.codigo_uri}`}>
              <Hash size={11} /> URI: {srv.codigo_uri}
            </span>
          )}

          {!srv.ativo && (
            <span className="inline-flex items-center px-3 py-1 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-widest rounded-lg">
              Inativo
            </span>
          )}

          {srv.agendamento_bloqueado_ate && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase tracking-widest rounded-lg border border-amber-200/50">
              <PauseCircle size={12} /> Pausado até {new Date(`${srv.agendamento_bloqueado_ate}T12:00:00`).toLocaleDateString("pt-BR")}
            </span>
          )}
        </div>

        <h3 className="font-black text-2xl text-zinc-900 dark:text-white mb-2 leading-tight pr-10">{srv.nome}</h3>

        {/* Especialidades */}
        {srv.especialidade && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {srv.especialidade.split(",").map((e) => e.trim()).map((esp, i) => (
              <span key={i} className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 px-2 py-0.5 rounded-md uppercase tracking-widest">
                {esp}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex-1">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Valor Particular</p>
            <p className="font-bold text-zinc-900 dark:text-white flex items-center gap-1">
              <DollarSign size={14} className="text-zinc-400" />
              {srv.preco ? Number(srv.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "0,00"}
            </p>
          </div>
          <div className="w-px h-8 bg-zinc-200/60 dark:bg-zinc-800" />
          <div className="flex-1">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Bloqueio Mínimo</p>
            <p className="font-bold text-zinc-900 dark:text-white flex items-center gap-1">
              <CalendarDays size={14} className="text-zinc-400" />
              {srv.dias_bloqueio_padrao > 0 ? `${srv.dias_bloqueio_padrao} ${srv.tipo_contagem_dias || "dias"}` : "Imediato"}
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
    codigo_uri: initialData?.codigo_uri || initialData?.numero_especialista ? String(initialData?.codigo_uri || initialData?.numero_especialista) : "",
    especialidade: initialData?.especialidade ? initialData.especialidade.split(",").map((e) => e.trim()) : [],
    tipo: initialData?.tipo || "Consulta",
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
      className="bg-white dark:bg-[#111] border border-zinc-200/80 dark:border-zinc-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-w-3xl mx-auto w-full relative z-50 my-6"
    >
      <div className="flex justify-between items-center px-8 md:px-10 py-8 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
        <div>
          <h3 className="font-black text-2xl text-zinc-900 dark:text-white tracking-tight">
            {isEditing ? "Editar Especialista / Serviço" : "Cadastrar Novo Especialista"}
          </h3>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-1">
            {isEditing ? "Ajuste o nome, especialidades, código URI e regras deste profissional." : "Cadastre um novo especialista para disponibilizá-lo na agenda online."}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="w-12 h-12 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all flex items-center justify-center"
        >
          <X size={20} />
        </button>
      </div>

      <div className="p-8 md:p-10 overflow-y-auto custom-scrollbar max-h-[65vh]">
        <div className="space-y-10">
          
          {/* SEÇÃO 1: INFORMAÇÕES BÁSICAS E CÓDIGO URI */}
          <section>
            <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white mb-6">
              <span className="w-6 h-6 rounded-md bg-zinc-900 text-white dark:bg-white dark:text-black flex items-center justify-center text-xs">1</span>
              Identificação & Direcionamento
            </h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <TextInput
                  label="Nome do Especialista / Serviço *"
                  placeholder="Ex: Dr. Tiago Lima"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              {/* NÚMERO / CÓDIGO URI */}
              <div className="space-y-1.5">
                <TextInput
                  label="Número / Código de Identificação na URI"
                  placeholder="Ex: 2 ou tiago-lima"
                  value={formData.codigo_uri}
                  onChange={(e) => setFormData({ ...formData, codigo_uri: e.target.value })}
                />
                <p className="text-[11px] text-zinc-400 ml-1">
                  Permite links diretos como <code className="text-purple-600 dark:text-purple-400 font-mono font-bold">?especialista={formData.codigo_uri || "2"}</code> ou <code className="text-purple-600 dark:text-purple-400 font-mono font-bold">?medico={formData.codigo_uri || "2"}</code>.
                </p>
              </div>

              {/* Múltipla escolha de especialidades */}
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1 mb-3 block">
                  Especialidades Vinculadas (Múltipla Escolha)
                </label>
                <div className="flex flex-wrap gap-2">
                  {especialidadesList.length === 0 ? (
                    <p className="text-xs text-amber-500 font-medium py-2">
                      Nenhuma especialidade cadastrada. Vá na aba "Especialidades" para criar.
                    </p>
                  ) : (
                    especialidadesList.map((esp) => {
                      const isSelected = formData.especialidade.includes(esp);
                      return (
                        <button
                          key={esp}
                          type="button"
                          onClick={() => toggleEspecialidade(esp)}
                          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                            isSelected
                              ? "bg-zinc-900 dark:bg-white text-white dark:text-black border-zinc-900 dark:border-white shadow-md scale-105"
                              : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                          }`}
                        >
                          {esp}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <CustomSelect
                label="Categoria do Serviço"
                value={formData.tipo}
                onChange={(val) => setFormData({ ...formData, tipo: val })}
                options={[
                  { value: "Consulta", label: "Consulta Médica" },
                  { value: "Exame", label: "Exame / Procedimento" },
                  { value: "Retorno", label: "Retorno Clínico" }
                ]}
              />

              <div className="flex items-center h-full pt-6">
                <ToggleSwitch
                  checked={formData.ativo}
                  onChange={(val) => setFormData({ ...formData, ativo: val })}
                  label="Cadastro Ativo na Agenda"
                />
              </div>
            </div>
          </section>

          {/* SEÇÃO 2: PAUSA TEMPORÁRIA DA AGENDA */}
          <section className="pt-8 border-t border-zinc-100 dark:border-zinc-800">
            <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white mb-6">
              <span className="w-6 h-6 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center text-xs">2</span>
              Pausa Temporária de Agendamentos por Especialista
            </h4>
            <div className="grid md:grid-cols-2 gap-6 p-6 rounded-3xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
              <TextInput
                label="Não aceitar agendamentos até"
                type="date"
                value={formData.agendamento_bloqueado_ate}
                onChange={(e) => setFormData({ ...formData, agendamento_bloqueado_ate: e.target.value })}
              />
              <TextInput
                label="Motivo exibido ao paciente"
                placeholder="Ex.: Férias, congresso médico..."
                value={formData.motivo_bloqueio_agenda}
                onChange={(e) => setFormData({ ...formData, motivo_bloqueio_agenda: e.target.value })}
              />
            </div>
          </section>

          {/* SEÇÃO 3: PRECIFICAÇÃO E ANTECEDÊNCIA */}
          <section className="pt-8 border-t border-zinc-100 dark:border-zinc-800">
            <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white mb-6">
              <span className="w-6 h-6 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center text-xs">3</span>
              Precificação e Padrões de Agenda
            </h4>
            <div className="grid md:grid-cols-3 gap-6">
              <TextInput
                label="Valor Particular (R$)"
                type="number"
                placeholder="0.00"
                value={formData.preco}
                onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
              />
              <TextInput
                label="Antecedência Mínima"
                type="number"
                placeholder="Ex: 1"
                value={formData.dias_bloqueio_padrao}
                onChange={(e) => setFormData({ ...formData, dias_bloqueio_padrao: e.target.value })}
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
      </div>

      <div className="px-8 md:px-10 py-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/50 flex flex-col sm:flex-row justify-end gap-4">
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
        >
          Cancelar
        </button>
        <ButtonPrimary
          onClick={handleSubmit}
          disabled={loading || !formData.nome.trim()}
          icon={isEditing ? CheckCircle2 : Plus}
          className="w-full sm:w-auto px-8"
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
export default function EquipeView({ subTab = "corpo", setSubTab, servicos = [], showToast, fetchServicos }) {
  const [viewMode, setViewMode] = useState("cards"); // "cards" | "tabela"
  const [editingServico, setEditingServico] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Estados para as Especialidades
  const [empresaId, setEmpresaId] = useState(null);
  const [especialidadesList, setEspecialidadesList] = useState([]);
  const [novaEspecialidade, setNovaEspecialidade] = useState("");

  useEffect(() => {
    const fetchEspecialidades = async () => {
      const { data } = await supabase.from("empresas").select("id, especialidades").limit(1).single();
      if (data) {
        setEmpresaId(data.id);
        if (data.especialidades) setEspecialidadesList(data.especialidades);
      }
    };
    fetchEspecialidades();
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
        numero_especialista: formData.codigo_uri && /^\d+$/.test(formData.codigo_uri.trim()) ? parseInt(formData.codigo_uri.trim(), 10) : null,
        especialidade: formData.especialidade.length > 0 ? formData.especialidade.join(", ") : null,
        tipo: formData.tipo || "Consulta",
        ativo: formData.ativo,
        tipo_contagem_dias: formData.tipo_contagem_dias || "corridos",
        preco: formData.preco ? parseFloat(formData.preco) : 0.0,
        dias_bloqueio_padrao: formData.dias_bloqueio_padrao ? parseInt(formData.dias_bloqueio_padrao, 10) : 0,
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
      showToast(isEditing ? "Erro ao atualizar especialista." : "Erro ao cadastrar especialista.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddEspecialidade = async () => {
    if (!novaEspecialidade.trim()) return;
    setIsProcessing(true);
    try {
      const newList = [...especialidadesList, novaEspecialidade.trim()];
      await supabase.from("empresas").update({ especialidades: newList }).eq("id", empresaId);
      setEspecialidadesList(newList);
      setNovaEspecialidade("");
      showToast("Especialidade registrada com sucesso!");
    } catch (e) {
      showToast("Erro ao adicionar especialidade.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveEspecialidade = async (esp) => {
    if (!window.confirm(`Apagar a especialidade "${esp}"?`)) return;
    setIsProcessing(true);
    try {
      const newList = especialidadesList.filter((e) => e !== esp);
      await supabase.from("empresas").update({ especialidades: newList }).eq("id", empresaId);
      setEspecialidadesList(newList);
      showToast("Especialidade removida!");
    } catch (e) {
      showToast("Erro ao remover.", "error");
    } finally {
      setIsProcessing(false);
    }
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

  return (
    <motion.div key="equipe" {...fadeUp} className="flex-1 flex flex-col h-full overflow-hidden w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      
      {/* CABEÇALHO UNIFICADO */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Users size={24} />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
              Corpo Clínico & Especialistas
            </h2>
            <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
              Cadastre e gerencie médicos, exames, códigos URI e pausas temporárias de agenda.
            </p>
          </div>
        </div>

        {subTab !== "formulario" && (
          <ButtonPrimary onClick={() => handleOpenForm()} icon={Plus} className="px-6 py-3 text-xs">
            Cadastrar Novo Especialista
          </ButtonPrimary>
        )}
      </div>

      {/* MODAL / TELA DE FORMULÁRIO */}
      <AnimatePresence>
        {subTab === "formulario" && (
          <ServicoForm
            initialData={editingServico}
            onSave={handleSaveServico}
            onCancel={handleCloseForm}
            loading={isProcessing}
            especialidadesList={especialidadesList}
          />
        )}
      </AnimatePresence>

      {/* CONTEÚDO PRINCIPAL DAS SUB-ABAS */}
      {subTab !== "formulario" && (
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-32 space-y-8">
          
          {/* SUB-ABA 1: CORPO CLÍNICO */}
          {(subTab === "corpo" || subTab === "adicionar") && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-[#111] p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
                <div className="relative w-full sm:w-80">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar especialista, URI ou especialidade..."
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-500">
                    {filteredServicos.length} especialista(s)
                  </span>
                </div>
              </div>

              {filteredServicos.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-[#111]">
                  <Stethoscope size={36} className="mx-auto text-zinc-400 mb-3" />
                  <h4 className="font-bold text-zinc-800 dark:text-zinc-200">Nenhum especialista encontrado</h4>
                  <p className="text-xs text-zinc-500 mt-1 mb-4">Cadastre seu primeiro especialista para disponibilizar na agenda.</p>
                  <ButtonPrimary onClick={() => handleOpenForm()} icon={Plus} className="px-6 py-2.5 text-xs mx-auto">
                    Cadastrar Especialista Agora
                  </ButtonPrimary>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredServicos.map((srv) => (
                    <ServicoCard key={srv.id} srv={srv} onEdit={handleOpenForm} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SUB-ABA 2: ESPECIALIDADES */}
          {subTab === "especialidades" && (
            <div className="bg-white dark:bg-[#111] border border-zinc-200/80 dark:border-zinc-800 p-8 rounded-[2.5rem] shadow-sm space-y-6">
              <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <h3 className="text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
                  <Layers size={20} className="text-blue-500" /> Especialidades Cadastradas
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Categorias de especialidades clínicas disponíveis para vincular aos colaboradores e formulários.
                </p>
              </div>

              <div className="flex gap-3">
                <input
                  type="text"
                  value={novaEspecialidade}
                  onChange={(e) => setNovaEspecialidade(e.target.value)}
                  placeholder="Ex: Colonoscopia, Gastroenterologia, Cardiologia..."
                  className="flex-1 px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none"
                  onKeyDown={(e) => e.key === "Enter" && handleAddEspecialidade()}
                />
                <ButtonPrimary onClick={handleAddEspecialidade} disabled={isProcessing || !novaEspecialidade.trim()} icon={Plus} className="px-6 py-3 text-xs">
                  Adicionar
                </ButtonPrimary>
              </div>

              <div className="flex flex-wrap gap-2.5 pt-4">
                {especialidadesList.map((esp) => (
                  <div
                    key={esp}
                    className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-3"
                  >
                    <span>{esp}</span>
                    <button
                      onClick={() => handleRemoveEspecialidade(esp)}
                      className="text-zinc-400 hover:text-red-500 transition-colors"
                      title="Excluir especialidade"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SUB-ABA 3: PAUSAS NA AGENDA */}
          {subTab === "pausas" && (
            <div className="bg-white dark:bg-[#111] border border-zinc-200/80 dark:border-zinc-800 p-8 rounded-[2.5rem] shadow-sm space-y-6">
              <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <h3 className="text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
                  <PauseCircle size={20} className="text-amber-500" /> Especialistas com Agenda Pausada
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
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
                    <div key={s.id} className="p-5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-zinc-900 dark:text-white text-sm">{s.nome}</h4>
                        <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                          Pausado até <strong>{new Date(`${s.agendamento_bloqueado_ate}T12:00:00`).toLocaleDateString("pt-BR")}</strong>
                        </p>
                        {s.motivo_bloqueio_agenda && (
                          <p className="text-[11px] text-zinc-500 mt-0.5">Motivo: {s.motivo_bloqueio_agenda}</p>
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
