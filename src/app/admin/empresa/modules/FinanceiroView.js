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
  List
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
            {srv.tipo}
          </span>

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
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Valor</p>
            <p className="font-bold text-zinc-900 dark:text-white flex items-center gap-1">
              <DollarSign size={14} className="text-zinc-400" />
              {srv.preco ? Number(srv.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "0,00"}
            </p>
          </div>
          <div className="w-px h-8 bg-zinc-200/60 dark:bg-zinc-800" />
          <div className="flex-1">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Bloqueio Padrão</p>
            <p className="font-bold text-zinc-900 dark:text-white flex items-center gap-1">
              <CalendarDays size={14} className="text-zinc-400" />
              {srv.dias_bloqueio_padrao > 0 ? `${srv.dias_bloqueio_padrao} ${srv.tipo_contagem_dias}` : "Sem restrição"}
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
      className="bg-white dark:bg-[#111] border border-zinc-200/80 dark:border-zinc-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-w-3xl mx-auto w-full relative z-50"
    >
      <div className="flex justify-between items-center px-8 md:px-10 py-8 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
        <div>
          <h3 className="font-black text-2xl text-zinc-900 dark:text-white tracking-tight">
            {isEditing ? "Editar Profissional" : "Novo Profissional"}
          </h3>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-1">
            {isEditing ? "Ajuste as configurações e regras de agendamento." : "Cadastre um novo profissional na plataforma."}
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
          <section>
            <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white mb-6">
              <span className="w-6 h-6 rounded-md bg-zinc-900 text-white dark:bg-white dark:text-black flex items-center justify-center">1</span>
              Informações Básicas
            </h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <TextInput
                  label="Nome do Profissional / Serviço *"
                  placeholder="Ex: Dr. Carlos Eduardo"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                  autoFocus
                />
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
                label="Categoria"
                value={formData.tipo}
                onChange={(val) => setFormData({ ...formData, tipo: val })}
                options={[
                  { value: "Consulta", label: "Profissional / Consulta" },
                  { value: "Exame", label: "Exame / Procedimento" }
                ]}
              />

              <div className="flex items-center h-full pt-6">
                <ToggleSwitch
                  checked={formData.ativo}
                  onChange={(val) => setFormData({ ...formData, ativo: val })}
                  label="Cadastro Ativo"
                />
              </div>
            </div>
          </section>

          {/* PAUSA TEMPORÁRIA DA AGENDA ATÉ DETERMINADA DATA */}
          <section className="pt-8 border-t border-zinc-100 dark:border-zinc-800">
            <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white mb-6">
              <span className="w-6 h-6 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center">2</span>
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

          <section className="pt-8 border-t border-zinc-100 dark:border-zinc-800">
            <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white mb-6">
              <span className="w-6 h-6 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center">3</span>
              Precificação e Padrões de Agenda
            </h4>
            <div className="grid md:grid-cols-3 gap-6">
              <TextInput
                label="Valor Total (R$)"
                type="number"
                placeholder="0.00"
                value={formData.preco}
                onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
              />
              <TextInput
                label="Dias de Antecedência Mínima"
                type="number"
                placeholder="Ex: 1"
                value={formData.dias_bloqueio_padrao}
                onChange={(e) => setFormData({ ...formData, dias_bloqueio_padrao: e.target.value })}
              />
              <CustomSelect
                label="Contagem"
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
          className="w-full sm:w-auto"
        >
          {loading ? "Processando..." : isEditing ? "Salvar Alterações" : "Cadastrar Profissional"}
        </ButtonPrimary>
      </div>
    </motion.div>
  );
};

// ==========================================
// COMPONENTE PRINCIPAL (VIEW)
// ==========================================
export default function FinanceiroView({ subTab = "corpo", setSubTab, servicos = [], showToast, fetchServicos }) {
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
        especialidade: formData.especialidade.length > 0 ? formData.especialidade.join(", ") : null,
        tipo: formData.tipo,
        ativo: formData.ativo,
        tipo_contagem_dias: formData.tipo_contagem_dias,
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
        showToast("Profissional atualizado com sucesso!");
      } else {
        await actionCriarServico(payload);
        showToast("Profissional cadastrado com sucesso!");
      }

      if (fetchServicos) {
        await fetchServicos();
      }

      handleCloseForm();
    } catch (error) {
      console.error(error);
      showToast(isEditing ? "Erro ao atualizar." : "Erro ao cadastrar.", "error");
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
        (s.especialidade && s.especialidade.toLowerCase().includes(term))
    );
  }, [servicos, searchTerm]);

  const servicosPausados = useMemo(() => {
    return servicos.filter((s) => s.agendamento_bloqueado_ate);
  }, [servicos]);

  return (
    <motion.div key="financeiro" {...fadeUp} className="p-6 md:p-10 mx-auto w-full max-w-7xl overflow-y-auto h-full custom-scrollbar relative">
      
      {/* PADRÃO UNIFICADO DE CABEÇALHO */}
      <div className="mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Serviços e Profissionais</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
            Gerencie especialidades, corpo clínico e pausamento temporário de horários.
          </p>
        </div>

        {/* MODOS DE VISUALIZAÇÃO (CARDS OU TABELA) */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mr-1">Visualização:</span>
          <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
            <button
              onClick={() => setViewMode("cards")}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "cards" ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-400 hover:text-zinc-700"
              }`}
              title="Visão em Cards"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode("tabela")}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "tabela" ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-400 hover:text-zinc-700"
              }`}
              title="Visão em Tabela"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        
        {/* SUB-ABA 1: CORPO CLÍNICO */}
        {subTab === "corpo" && (
          <motion.div key="grid" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={spring} className="space-y-6">
            <div className="relative max-w-md">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar por nome ou especialidade..."
                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl text-sm font-medium outline-none focus:border-zinc-900"
              />
            </div>

            {filteredServicos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] flex items-center justify-center text-zinc-300 dark:text-zinc-700 mb-6 shadow-sm">
                  <Stethoscope size={28} />
                </div>
                <h4 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Nenhum profissional cadastrado</h4>
                <ButtonPrimary onClick={() => handleOpenForm(null)} icon={Plus}>Adicionar Primeiro Cadastro</ButtonPrimary>
              </div>
            ) : viewMode === "cards" ? (
              <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredServicos.map((srv) => (
                  <ServicoCard key={srv.id} srv={srv} onEdit={handleOpenForm} />
                ))}
              </motion.div>
            ) : (
              /* VISÃO EM TABELA / LISTA COMPACTA */
              <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-x-auto shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 font-bold uppercase tracking-wider text-zinc-400">
                      <th className="p-4">Profissional / Serviço</th>
                      <th className="p-4">Categoria</th>
                      <th className="p-4">Especialidade(s)</th>
                      <th className="p-4">Valor Total</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
                    {filteredServicos.map((srv) => (
                      <tr key={srv.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                        <td className="p-4 font-bold text-zinc-900 dark:text-white">{srv.nome}</td>
                        <td className="p-4 text-zinc-600 dark:text-zinc-400">{srv.tipo}</td>
                        <td className="p-4 text-zinc-600 dark:text-zinc-400">{srv.especialidade || "-"}</td>
                        <td className="p-4 font-bold text-zinc-900 dark:text-white">R$ {srv.preco ? Number(srv.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "0,00"}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${srv.ativo ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"}`}>
                            {srv.ativo ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => handleOpenForm(srv)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><PenLine size={16}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {/* SUB-ABA 2: ESPECIALIDADES */}
        {subTab === "especialidades" && (
          <motion.div key="especialidades" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={spring} className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-[#111] p-8 border border-zinc-200/80 dark:border-zinc-800 rounded-[2.5rem] shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center">
                  <Layers size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-zinc-900 dark:text-white">Gerenciar Especialidades</h3>
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Crie as categorias para organizar seu corpo clínico.</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <div className="flex-1">
                  <TextInput value={novaEspecialidade} onChange={(e) => setNovaEspecialidade(e.target.value)} placeholder="Ex: Gastroenterologia" />
                </div>
                <ButtonPrimary onClick={handleAddEspecialidade} disabled={isProcessing || !novaEspecialidade.trim()} icon={Plus}>
                  Adicionar
                </ButtonPrimary>
              </div>

              <div className="space-y-3">
                {especialidadesList.length === 0 ? (
                  <div className="text-center p-6 bg-zinc-50 dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                    <p className="text-zinc-400 font-medium text-sm">Nenhuma especialidade criada.</p>
                  </div>
                ) : (
                  especialidadesList.map((esp) => (
                    <div key={esp} className="flex justify-between items-center p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl">
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">{esp}</span>
                      <button onClick={() => handleRemoveEspecialidade(esp)} disabled={isProcessing} className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* SUB-ABA 3: PAUSAS POR ESPECIALISTA */}
        {subTab === "pausas" && (
          <motion.div key="pausas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={spring} className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white dark:bg-[#111] p-8 border border-zinc-200/80 dark:border-zinc-800 rounded-[2.5rem] shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
                  <PauseCircle size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-zinc-900 dark:text-white">Pausas Temporárias de Agenda</h3>
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Especialistas com agenda pausada até uma data específica.</p>
                </div>
              </div>

              {servicosPausados.length === 0 ? (
                <div className="text-center p-12 bg-zinc-50 dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl text-zinc-500">
                  <UserCheck size={36} className="mx-auto mb-3 text-zinc-300 dark:text-zinc-700" />
                  <p className="font-bold text-base">Todos os especialistas estão com agenda liberada normalmente!</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {servicosPausados.map((srv) => (
                    <div key={srv.id} className="p-6 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-zinc-900 dark:text-white text-lg">{srv.nome}</h4>
                          <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 rounded-md">
                            Pausado
                          </span>
                        </div>
                        <p className="text-xs text-amber-800 dark:text-amber-300 mt-2 font-medium">
                          Indisponível até: <strong>{new Date(`${srv.agendamento_bloqueado_ate}T12:00:00`).toLocaleDateString("pt-BR")}</strong>
                        </p>
                      </div>

                      <button onClick={() => handleOpenForm(srv)} className="px-4 py-2.5 bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors self-start sm:self-center">
                        Editar Pausa
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* SUB-ABA 4: FORMULÁRIO */}
        {subTab === "formulario" && (
          <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={spring} className="flex items-start justify-center py-4">
            <ServicoForm
              initialData={editingServico}
              onSave={handleSaveServico}
              onCancel={handleCloseForm}
              loading={isProcessing}
              especialidadesList={especialidadesList}
            />
          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  );
}
