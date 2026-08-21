"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Server,
  Activity,
  AlertTriangle,
  UserPlus,
  Link2,
  CheckCircle2,
  ChevronDown,
  ArrowRight,
  Columns,
  Save,
  RefreshCw,
  MessageSquare,
  ShieldCheck,
  Eye,
  Trash2,
  X,
  CheckSquare,
  Square,
  Ban,
  Unlock,
  Edit,
  Pencil,
  Table,
  Search,
  Check
} from "lucide-react";
import { fadeUp, ButtonPrimary, CustomSelect, TextInput } from "../components/SharedUI";
import {
  actionCriarServico,
  actionMigrarNomeBloqueios,
  actionSalvarCustomization,
  fetchAdminCustomization,
  actionFetchMensagensRascunhoERP,
  actionAprovarMensagensRascunhoERP,
  actionDescartarMensagensRascunhoERP,
  actionReprocessarMapeamentoBanco,
  actionBloquearProfissionalERP,
  actionDesbloquearProfissionalERP,
  actionAtualizarBloqueioERP,
  actionDeletarBloqueioERP
} from "@/actions/adminData";

// ==========================================
// COMPONENTE: ITEM ÓRFÃO (RESOLUÇÃO DE NOMES)
// ==========================================
const UnmatchedItem = ({ erpName, servicosDisponiveis, onResolve, onBloquear, showToast }) => {
  const [mode, setMode] = useState("idle");
  const [selectedServiceId, setSelectedServiceId] = useState("");

  const handleCreate = async () => {
    setMode("processing");
    try {
      await actionCriarServico({
        nome: erpName,
        tipo: "Profissional",
        ativo: true,
        preco: 0,
        dias_bloqueio_padrao: 0
      });
      showToast(`Profissional "${erpName}" criado com sucesso!`);
      setMode("resolved");
      setTimeout(() => onResolve(), 800);
    } catch (e) {
      showToast("Erro ao criar cadastro.", "error");
      setMode("idle");
    }
  };

  const handleLink = async () => {
    if (!selectedServiceId) return;
    setMode("processing");
    try {
      const targetService = servicosDisponiveis.find((s) => s.id === selectedServiceId);
      await actionMigrarNomeBloqueios(erpName, targetService.nome);

      showToast(`Agendas vinculadas a "${targetService.nome}"!`);
      setMode("resolved");
      setTimeout(() => onResolve(), 800);
    } catch (e) {
      showToast("Erro ao associar registros.", "error");
      setMode("idle");
    }
  };

  const handleBlock = async () => {
    if (!window.confirm(`Bloquear "${erpName}" permanentemente para não aceitar agendamentos nem importar?`)) return;
    setMode("processing");
    try {
      await onBloquear(erpName);
      setMode("resolved");
      setTimeout(() => onResolve(), 600);
    } catch (e) {
      setMode("idle");
    }
  };

  if (mode === "resolved") {
    return (
      <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center justify-center p-4 bg-green-50 border border-green-200 rounded-2xl h-[72px]">
        <CheckCircle2 className="text-green-500 mr-2" size={20} />
        <span className="text-green-700 font-bold text-sm">Resolvido!</span>
      </motion.div>
    );
  }

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-[#111] border border-amber-200/60 dark:border-amber-900/40 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-500 flex-shrink-0">
          <AlertTriangle size={18} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Desconhecido no ERP</p>
          <p className="font-bold text-zinc-900 dark:text-white">{erpName}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {mode === "idle" && (
          <>
            <button onClick={() => setMode("linking")} className="px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 text-zinc-700 dark:text-zinc-300 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
              <Link2 size={13} /> Associar
            </button>
            <button onClick={handleCreate} className="px-3.5 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-black font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer">
              <UserPlus size={13} /> Cadastrar
            </button>
            <button onClick={handleBlock} className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/60 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer" title="Bloquear especialista permanentemente">
              <Ban size={13} /> Bloquear Sempre
            </button>
          </>
        )}

        {mode === "linking" && (
          <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-56">
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full appearance-none bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-bold rounded-xl px-3 py-2 pr-8 outline-none focus:border-zinc-900 cursor-pointer"
              >
                <option value="" disabled>Selecione o profissional...</option>
                {servicosDisponiveis.map((s) => (
                  <option key={s.id} value={s.id}>{s.nome} ({s.tipo})</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            </div>
            <button onClick={handleLink} disabled={!selectedServiceId} className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-200 text-white flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer">
              <ArrowRight size={14} />
            </button>
            <button onClick={() => setMode("idle")} className="text-xs font-bold text-zinc-400 hover:text-zinc-700 px-2 cursor-pointer">Cancelar</button>
          </motion.div>
        )}

        {mode === "processing" && (
          <div className="h-9 px-4 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 w-full md:w-auto">
            <Activity size={15} className="animate-spin" />
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ==========================================
// COMPONENTE PRINCIPAL (VIEW NA EMPRESA)
// ==========================================
export default function SyncView({ bloqueios = [], servicos = [], fetchBloqueios, fetchServicos, showToast }) {
  const [importLoading, setImportLoading] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);

  // Mapeamento de Colunas do ERP e Bloqueados
  const [empresaId, setEmpresaId] = useState(null);
  const [bloqueadosERP, setBloqueadosERP] = useState([]);
  const [campos, setCampos] = useState({
    medicalsys_column_mapping: {
      convenio: "coluna_convenio",
      especialidade: "especialidade"
    }
  });

  // Modal de Histórico de Importações Anteriores (Todas as Colunas)
  const [showTabelaImportacoes, setShowTabelaImportacoes] = useState(false);
  const [buscaTabela, setBuscaTabela] = useState("");
  const [editingItem, setEditingItem] = useState(null);

  // Estado de Mensagens Rascunho ERP
  const [rascunhos, setRascunhos] = useState([]);
  const [showRascunhosModal, setShowRascunhosModal] = useState(false);
  const [selectedRascunhos, setSelectedRascunhos] = useState([]);
  const [isApproving, setIsApproving] = useState(false);

  const carregarRascunhos = async () => {
    try {
      const data = await actionFetchMensagensRascunhoERP();
      setRascunhos(data || []);
      setSelectedRascunhos((data || []).map((m) => m.id));
    } catch (e) {
      console.error("Erro ao buscar rascunhos:", e);
    }
  };

  useEffect(() => {
    const loadConfig = async () => {
      const emp = await fetchAdminCustomization();
      if (emp) {
        setEmpresaId(emp.id);
        if (emp.config_campos) {
          setCampos((prev) => ({ ...prev, ...emp.config_campos }));
          if (Array.isArray(emp.config_campos.profissionais_erp_bloqueados)) {
            setBloqueadosERP(emp.config_campos.profissionais_erp_bloqueados);
          }
        }
      }
    };
    loadConfig();
    carregarRascunhos();
  }, []);

  const handleSaveMapping = async () => {
    setSavingConfig(true);
    try {
      await actionSalvarCustomization({ config_campos: campos, config_mensagens: [] });
      if (showToast) showToast("Mapeamento de colunas do ERP salvo!");
    } catch (err) {
      if (showToast) showToast(`Erro ao salvar: ${err.message}`, "error");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleReprocessarBanco = async () => {
    setReprocessing(true);
    try {
      const res = await actionReprocessarMapeamentoBanco();
      if (showToast) showToast(`Re-processamento concluído! ${res.count || 0} registros foram corrigidos e tiveram Convênio separado de Especialidade.`);
      if (typeof fetchBloqueios === "function") await fetchBloqueios();
    } catch (err) {
      if (showToast) showToast(`Erro ao re-processar: ${err.message}`, "error");
    } finally {
      setReprocessing(false);
    }
  };

  const handleBloquearProfissional = async (nome) => {
    try {
      const res = await actionBloquearProfissionalERP(nome);
      setBloqueadosERP(res.bloqueados || []);
      if (showToast) showToast(`"${nome}" bloqueado permanentemente.`);
      if (typeof fetchBloqueios === "function") await fetchBloqueios();
    } catch (e) {
      if (showToast) showToast(`Erro ao bloquear: ${e.message}`, "error");
    }
  };

  const handleDesbloquearProfissional = async (nome) => {
    try {
      const res = await actionDesbloquearProfissionalERP(nome);
      setBloqueadosERP(res.bloqueados || []);
      if (showToast) showToast(`"${nome}" desbloqueado com sucesso.`);
      if (typeof fetchBloqueios === "function") await fetchBloqueios();
    } catch (e) {
      if (showToast) showToast(`Erro ao desbloquear: ${e.message}`, "error");
    }
  };

  // Profissionais Órfãos (excluindo os já bloqueados)
  const unmatchedProfessionals = useMemo(() => {
    const safeBloqueios = Array.isArray(bloqueios) ? bloqueios : [];
    const safeServicos = Array.isArray(servicos) ? servicos : [];

    const erpNames = [...new Set(safeBloqueios.map((b) => b.medico_profissional).filter(Boolean))];
    const officialNames = safeServicos.map((s) => s.nome.toLowerCase().trim());
    const blockedNamesLower = bloqueadosERP.map((b) => b.toLowerCase().trim());

    return erpNames.filter(
      (name) =>
        !officialNames.includes(name.toLowerCase().trim()) &&
        !blockedNamesLower.includes(name.toLowerCase().trim())
    );
  }, [bloqueios, servicos, bloqueadosERP]);

  const handleSync = async () => {
    setImportLoading(true);
    try {
      const r = await fetch("/api/importar-agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "import" })
      });
      const d = await r.json();
      if (d.success) {
        if (showToast) showToast(d.message);
        if (typeof fetchBloqueios === "function") await fetchBloqueios();
        await carregarRascunhos();
      } else {
        if (showToast) showToast(d.error, "error");
      }
    } catch (e) {
      if (showToast) showToast("Erro de conexão com o servidor.", "error");
    } finally {
      setImportLoading(false);
    }
  };

  const handleResolutionComplete = async () => {
    if (typeof fetchServicos === "function") await fetchServicos();
    if (typeof fetchBloqueios === "function") await fetchBloqueios();
  };

  // Seleção e Aprovação de Mensagens Rascunho
  const toggleSelectAllRascunhos = () => {
    if (selectedRascunhos.length === rascunhos.length) {
      setSelectedRascunhos([]);
    } else {
      setSelectedRascunhos(rascunhos.map((m) => m.id));
    }
  };

  const toggleSelectRascunho = (id) => {
    if (selectedRascunhos.includes(id)) {
      setSelectedRascunhos(selectedRascunhos.filter((i) => i !== id));
    } else {
      setSelectedRascunhos([...selectedRascunhos, id]);
    }
  };

  const handleAprovarSelecionadas = async () => {
    if (selectedRascunhos.length === 0) return;
    setIsApproving(true);
    try {
      await actionAprovarMensagensRascunhoERP(selectedRascunhos);
      if (showToast) showToast(`${selectedRascunhos.length} mensagens aprovadas e liberadas para o envio!`);
      await carregarRascunhos();
      setShowRascunhosModal(false);
    } catch (e) {
      if (showToast) showToast(`Erro ao aprovar: ${e.message}`, "error");
    } finally {
      setIsApproving(false);
    }
  };

  const handleDescartarSelecionadas = async () => {
    if (selectedRascunhos.length === 0) return;
    setIsApproving(true);
    try {
      await actionDescartarMensagensRascunhoERP(selectedRascunhos);
      if (showToast) showToast(`${selectedRascunhos.length} rascunhos descartados.`);
      await carregarRascunhos();
    } catch (e) {
      if (showToast) showToast(`Erro ao descartar: ${e.message}`, "error");
    } finally {
      setIsApproving(false);
    }
  };

  // Filtragem da Tabela Completa de Importações
  const bloqueiosFiltrados = useMemo(() => {
    if (!buscaTabela.trim()) return bloqueios;
    const term = buscaTabela.toLowerCase();
    return (bloqueios || []).filter(
      (b) =>
        (b.medico_profissional && b.medico_profissional.toLowerCase().includes(term)) ||
        (b.especialidade && b.especialidade.toLowerCase().includes(term)) ||
        (b.convenio && b.convenio.toLowerCase().includes(term)) ||
        (b.observacoes && b.observacoes.toLowerCase().includes(term)) ||
        (b.data && b.data.includes(term))
    );
  }, [bloqueios, buscaTabela]);

  const handleSalvarEdicaoBloqueio = async () => {
    if (!editingItem) return;
    try {
      await actionAtualizarBloqueioERP(editingItem.id, {
        medico_profissional: editingItem.medico_profissional,
        especialidade: editingItem.especialidade,
        convenio: editingItem.convenio,
        observacoes: editingItem.observacoes
      });
      if (showToast) showToast("Registro atualizado no banco de dados!");
      setEditingItem(null);
      if (typeof fetchBloqueios === "function") await fetchBloqueios();
    } catch (e) {
      if (showToast) showToast(`Erro ao atualizar: ${e.message}`, "error");
    }
  };

  const handleExcluirBloqueioItem = async (id) => {
    if (!window.confirm("Deseja excluir este registro de importação?")) return;
    try {
      await actionDeletarBloqueioERP(id);
      if (showToast) showToast("Registro removido.");
      if (typeof fetchBloqueios === "function") await fetchBloqueios();
    } catch (e) {
      if (showToast) showToast(`Erro ao remover: ${e.message}`, "error");
    }
  };

  return (
    <motion.div key="tech" {...fadeUp} className="p-6 md:p-10 mx-auto w-full max-w-5xl overflow-y-auto h-full custom-scrollbar relative pb-32 space-y-8">
      
      {/* CABEÇALHO UNIFICADO DA EMPRESA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-200/80 dark:border-white/10 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Server size={24} />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
              Integrações & Sincronização ERP
            </h2>
            <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
              Sincronize a agenda do Medicalsys, gerencie profissionais bloqueados e audite todas as colunas importadas.
            </p>
          </div>
        </div>

        <button
          onClick={handleSync}
          disabled={importLoading}
          className="px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-black font-black text-xs uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg disabled:opacity-50 cursor-pointer"
        >
          {importLoading ? <Activity size={18} className="animate-spin text-blue-500" /> : <RefreshCw size={18} />}
          {importLoading ? "Sincronizando Agenda..." : "Sincronizar Agenda Agora"}
        </button>
      </div>

      {/* BANNER DE VALIDAÇÃO DE MENSAGENS EM RASCUNHO */}
      {rascunhos.length > 0 && (
        <section className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={26} />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-900 dark:text-amber-200">
                {rascunhos.length} mensagem(ns) em Rascunho para Validação
              </h3>
              <p className="text-xs text-amber-800/80 dark:text-amber-300 mt-1 max-w-2xl">
                Mensagens geradas pela sincronização com o ERP ficam retidas em <strong>Rascunho</strong> até que você as revise e aprove o disparo.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowRascunhosModal(true)}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors shadow-md flex items-center gap-2 flex-shrink-0 cursor-pointer"
          >
            <Eye size={16} /> Validar Rascunhos ({rascunhos.length})
          </button>
        </section>
      )}

      {/* MAPEAMENTO DE COLUNAS & CORREÇÃO COM VISUALIZAÇÃO COMPLETA */}
      <section className="bg-white dark:bg-[#0c0c0e] border border-zinc-200/80 dark:border-white/10 p-8 rounded-[2.5rem] shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4 gap-4">
          <div>
            <h3 className="text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
              <Columns size={20} className="text-blue-500" /> Associação de Colunas & Auditoria Completa
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Separe Convênio de Especialidade e veja todas as colunas existentes nos registros da agenda.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowTabelaImportacoes(true)}
              className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-900/50 dark:text-blue-300 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              title="Abrir tabela com todas as colunas"
            >
              <Table size={15} /> Ver Todas as Colunas Importadas
            </button>

            <button
              onClick={handleReprocessarBanco}
              disabled={reprocessing}
              className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/50 dark:text-amber-300 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              {reprocessing ? <Activity size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {reprocessing ? "Corrigindo..." : "Reprocessar Convênios"}
            </button>

            <ButtonPrimary onClick={handleSaveMapping} disabled={savingConfig} icon={Save} className="px-5 py-2.5 text-xs rounded-xl">
              {savingConfig ? "Salvando..." : "Salvar Mapeamento"}
            </ButtonPrimary>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 p-6 bg-zinc-50 dark:bg-zinc-900/60 rounded-3xl border border-zinc-100 dark:border-zinc-800">
          <div className="space-y-3">
            <CustomSelect
              label="Tratamento da coluna 'convenio' do Medicalsys:"
              value={campos.medicalsys_column_mapping?.convenio || "coluna_convenio"}
              onChange={(v) =>
                setCampos({
                  ...campos,
                  medicalsys_column_mapping: {
                    ...(campos.medicalsys_column_mapping || {}),
                    convenio: v
                  }
                })
              }
              options={[
                { value: "coluna_convenio", label: "Gravar na Coluna 'Convênio / Plano' (Separada - Recomendado)" },
                { value: "observacoes", label: "Gravar apenas nas Observações do Agendamento" },
                { value: "eliminar_coluna", label: "Descartar / Não salvar informação de Convênio" }
              ]}
            />
            <p className="text-[11px] text-zinc-400">
              O plano de saúde (Unimed, Bradesco, etc.) será salvo em coluna própria e NUNCA misturado com a especialidade médica.
            </p>
          </div>

          <div className="space-y-3">
            <CustomSelect
              label="Tratamento da coluna 'especialidade' do Medicalsys:"
              value={campos.medicalsys_column_mapping?.especialidade || "especialidade"}
              onChange={(v) =>
                setCampos({
                  ...campos,
                  medicalsys_column_mapping: {
                    ...(campos.medicalsys_column_mapping || {}),
                    especialidade: v
                  }
                })
              }
              options={[
                { value: "especialidade", label: "Gravar no Campo 'Especialidade / Procedimento'" },
                { value: "eliminar_coluna", label: "Usar Especialidade Padrão 'Geral'" }
              ]}
            />
            <p className="text-[11px] text-zinc-400">
              Define se procedimentos e especialidades (Colonoscopia, Endoscopia, etc.) devem ser salvos diretamente no campo de especialidade.
            </p>
          </div>
        </div>
      </section>

      {/* PROFISSIONAIS ÓRFÃOS & GESTÃO DE BLOQUEIOS PERMANENTES */}
      <section className="bg-white dark:bg-[#0c0c0e] border border-zinc-200/80 dark:border-white/10 p-8 rounded-[2.5rem] shadow-sm space-y-6">
        <div>
          <h3 className="text-lg font-black text-zinc-900 dark:text-white">Mapeamento de Profissionais do ERP</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Associe os nomes vindos do ERP a profissionais cadastrados, ou bloqueie especialistas permanentemente.
          </p>
        </div>

        {unmatchedProfessionals.length === 0 ? (
          <div className="text-center p-8 bg-green-50/50 dark:bg-green-950/20 border border-green-200/60 dark:border-green-900/40 rounded-3xl text-green-800 dark:text-green-300">
            <CheckCircle2 size={32} className="mx-auto mb-2 text-green-600" />
            <p className="font-bold text-sm">Todos os profissionais do ERP estão mapeados ou bloqueados!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {unmatchedProfessionals.map((erpName) => (
              <UnmatchedItem
                key={`unmatched-${erpName}`}
                erpName={erpName}
                servicosDisponiveis={servicos}
                onResolve={handleResolutionComplete}
                onBloquear={handleBloquearProfissional}
                showToast={showToast}
              />
            ))}
          </div>
        )}

        {/* LISTA DE ESPECIALISTAS BLOQUEADOS PERMANENTEMENTE */}
        {bloqueadosERP.length > 0 && (
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <Ban size={14} /> Especialistas Bloqueados Permanentemente ({bloqueadosERP.length})
            </h4>
            <p className="text-[11px] text-zinc-500">
              Profissionais nesta lista têm agendamentos bloqueados e não serão importados nem criados automaticamente.
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {bloqueadosERP.map((nome) => (
                <div
                  key={nome}
                  className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 rounded-xl text-xs font-bold text-rose-900 dark:text-rose-300 shadow-sm"
                >
                  <span>{nome}</span>
                  <button
                    type="button"
                    onClick={() => handleDesbloquearProfissional(nome)}
                    className="p-1 rounded hover:bg-rose-200/60 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 cursor-pointer"
                    title="Desbloquear profissional"
                  >
                    <Unlock size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* MODAL: TABELA COMPLETA COM TODAS AS COLUNAS IMPORTADAS */}
      <AnimatePresence>
        {showTabelaImportacoes && (
          <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm p-4 flex items-center justify-center" onClick={() => setShowTabelaImportacoes(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#0c0c0e] rounded-3xl p-6 md:p-8 max-w-5xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex justify-between items-start pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-600 flex items-center justify-center">
                    <Table size={22} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Todas as Colunas Importadas do ERP</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Visualize, audite e edite diretamente qualquer coluna dos registros importados ({bloqueios.length} registros).
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowTabelaImportacoes(false)} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-full cursor-pointer">
                  <X size={20} />
                </button>
              </div>

              {/* BUSCA NA TABELA */}
              <div className="py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={buscaTabela}
                    onChange={(e) => setBuscaTabela(e.target.value)}
                    placeholder="Filtrar por médico, especialidade, convênio, data..."
                    className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-blue-500"
                  />
                </div>
                <span className="text-xs text-zinc-400 font-bold whitespace-nowrap">
                  {bloqueiosFiltrados.length} registro(s)
                </span>
              </div>

              {/* TABELA COM TODAS AS COLUNAS */}
              <div className="flex-1 overflow-y-auto custom-scrollbar my-3 pr-1">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-900 z-10">
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 font-bold uppercase tracking-wider text-[10px] text-zinc-500">
                      <th className="p-3">Médico / Especialista</th>
                      <th className="p-3">Especialidade</th>
                      <th className="p-3">Convênio / Plano</th>
                      <th className="p-3">Observações</th>
                      <th className="p-3">Data</th>
                      <th className="p-3">Horário</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
                    {bloqueiosFiltrados.map((item) => (
                      <tr key={item.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-900/50 transition-colors">
                        <td className="p-3 font-bold text-zinc-900 dark:text-white">
                          {item.medico_profissional || "Todos"}
                        </td>
                        <td className="p-3 text-blue-600 dark:text-blue-400 font-semibold">
                          {item.especialidade || "Geral"}
                        </td>
                        <td className="p-3">
                          {item.convenio ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold text-[10.5px]">
                              {item.convenio}
                            </span>
                          ) : (
                            <span className="text-zinc-400 italic">-</span>
                          )}
                        </td>
                        <td className="p-3 text-zinc-500 max-w-xs truncate" title={item.observacoes}>
                          {item.observacoes || "-"}
                        </td>
                        <td className="p-3 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                          {item.data ? new Date(`${item.data}T12:00:00`).toLocaleDateString("pt-BR") : "-"}
                        </td>
                        <td className="p-3 text-zinc-700 dark:text-zinc-300 font-mono whitespace-nowrap">
                          {item.horario?.slice(0, 5) || "-"}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap space-x-1">
                          <button
                            type="button"
                            onClick={() => setEditingItem({ ...item })}
                            className="p-1.5 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                            title="Editar colunas deste registro"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExcluirBloqueioItem(item.id)}
                            className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                            title="Excluir registro"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* FORMULÁRIO DE EDIÇÃO INLINE DO REGISTRO */}
              {editingItem && (
                <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-blue-200 dark:border-blue-900 space-y-3 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-blue-900 dark:text-blue-300">
                      Editando Registro #{editingItem.id}
                    </span>
                    <button onClick={() => setEditingItem(null)} className="text-xs text-zinc-400 hover:text-zinc-700 cursor-pointer">
                      Cancelar
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <TextInput
                      label="Médico"
                      value={editingItem.medico_profissional || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, medico_profissional: e.target.value })}
                    />
                    <TextInput
                      label="Especialidade"
                      value={editingItem.especialidade || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, especialidade: e.target.value })}
                    />
                    <TextInput
                      label="Convênio / Plano"
                      value={editingItem.convenio || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, convenio: e.target.value })}
                    />
                    <TextInput
                      label="Observações"
                      value={editingItem.observacoes || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, observacoes: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleSalvarEdicaoBloqueio}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Check size={14} /> Salvar Alterações
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                <button onClick={() => setShowTabelaImportacoes(false)} className="px-6 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl cursor-pointer">
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE VALIDAÇÃO DE MENSAGENS EM RASCUNHO */}
      <AnimatePresence>
        {showRascunhosModal && (
          <div className="fixed inset-0 z-[99999] bg-black/50 backdrop-blur-sm p-4 flex items-center justify-center" onClick={() => setShowRascunhosModal(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#111] rounded-3xl p-6 md:p-8 max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex justify-between items-start pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Central de Validação de Mensagens</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Revise e autorize as mensagens importadas antes do envio.</p>
                  </div>
                </div>
                <button onClick={() => setShowRascunhosModal(false)} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-full cursor-pointer">
                  <X size={20} />
                </button>
              </div>

              <div className="py-4 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 text-xs">
                <button onClick={toggleSelectAllRascunhos} className="flex items-center gap-2 font-bold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 cursor-pointer">
                  {selectedRascunhos.length === rascunhos.length ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} />}
                  <span>{selectedRascunhos.length === rascunhos.length ? "Desmarcar Todos" : "Selecionar Todos"} ({selectedRascunhos.length}/{rascunhos.length})</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDescartarSelecionadas}
                    disabled={isApproving || selectedRascunhos.length === 0}
                    className="px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 size={14} /> Descartar
                  </button>
                  <button
                    onClick={handleAprovarSelecionadas}
                    disabled={isApproving || selectedRascunhos.length === 0}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-40 flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    {isApproving ? <Activity size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    {isApproving ? "Aprovando..." : `Aprovar e Liberar (${selectedRascunhos.length})`}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar my-4 space-y-3 pr-2">
                {rascunhos.map((m) => {
                  const isSel = selectedRascunhos.includes(m.id);
                  return (
                    <div
                      key={m.id}
                      onClick={() => toggleSelectRascunho(m.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
                        isSel ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800" : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 opacity-60"
                      }`}
                    >
                      <div className="mt-1">
                        {isSel ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} className="text-zinc-400" />}
                      </div>

                      <div className="flex-1 space-y-1 text-xs">
                        <div className="flex items-center justify-between font-bold text-zinc-900 dark:text-white">
                          <span>{m.nome_paciente} ({m.telefone_whatsapp})</span>
                          <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 px-2 py-0.5 rounded-md uppercase font-extrabold">Rascunho</span>
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-300 bg-white dark:bg-black p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800 text-xs font-medium">
                          {m.mensagem}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                <button onClick={() => setShowRascunhosModal(false)} className="px-6 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl cursor-pointer">
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
