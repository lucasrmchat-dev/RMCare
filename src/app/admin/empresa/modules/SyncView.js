"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
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
  RefreshCw
} from "lucide-react";
import { fadeUp, spring, ButtonPrimary, CustomSelect } from "../components/SharedUI";
import { actionCriarServico, actionMigrarNomeBloqueios, actionSalvarCustomization, fetchAdminCustomization } from "@/actions/adminData";
import { supabase } from "@/lib/supabase";

// ==========================================
// COMPONENTE: ITEM ÓRFÃO (RESOLUÇÃO DE NOMES)
// ==========================================
const UnmatchedItem = ({ erpName, servicosDisponiveiveis, onResolve, showToast }) => {
  const [mode, setMode] = useState("idle");
  const [selectedServiceId, setSelectedServiceId] = useState("");

  const handleCreate = async () => {
    setMode("processing");
    try {
      await actionCriarServico({
        nome: erpName,
        tipo: "Consulta",
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
      const targetService = servicosDisponiveiveis.find((s) => s.id === selectedServiceId);
      await actionMigrarNomeBloqueios(erpName, targetService.nome);

      showToast(`Agendas vinculadas a "${targetService.nome}"!`);
      setMode("resolved");
      setTimeout(() => onResolve(), 800);
    } catch (e) {
      showToast("Erro ao associar registros.", "error");
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
            <button onClick={() => setMode("linking")} className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 text-zinc-600 dark:text-zinc-300 font-bold text-xs transition-colors flex items-center justify-center gap-2">
              <Link2 size={14} /> Associar
            </button>
            <button onClick={handleCreate} className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-black font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-md">
              <UserPlus size={14} /> Cadastrar
            </button>
          </>
        )}

        {mode === "linking" && (
          <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-56">
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full appearance-none bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 text-sm font-medium rounded-xl px-4 py-2.5 pr-10 outline-none focus:border-zinc-900"
              >
                <option value="" disabled>Selecione o profissional...</option>
                {servicosDisponiveiveis.map((s) => (
                  <option key={s.id} value={s.id}>{s.nome} ({s.tipo})</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            </div>
            <button onClick={handleLink} disabled={!selectedServiceId} className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-200 text-white flex items-center justify-center flex-shrink-0 transition-colors">
              <ArrowRight size={16} />
            </button>
            <button onClick={() => setMode("idle")} className="text-xs font-bold text-zinc-400 hover:text-zinc-700 px-2">Cancelar</button>
          </motion.div>
        )}

        {mode === "processing" && (
          <div className="h-10 px-6 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 w-full md:w-auto">
            <Activity size={16} className="animate-spin" />
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

  // Mapeamento de Colunas do ERP na Empresa
  const [empresaId, setEmpresaId] = useState(null);
  const [campos, setCampos] = useState({
    medicalsys_column_mapping: {
      convenio: "observacoes", // "observacoes" | "especialidade" | "eliminar_coluna"
      especialidade: "especialidade" // "especialidade" | "eliminar_coluna"
    }
  });

  useEffect(() => {
    const loadConfig = async () => {
      const emp = await fetchAdminCustomization();
      if (emp) {
        setEmpresaId(emp.id);
        if (emp.config_campos) {
          setCampos((prev) => ({ ...prev, ...emp.config_campos }));
        }
      }
    };
    loadConfig();
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

  // Profissionais Órfãos
  const unmatchedProfessionals = useMemo(() => {
    const safeBloqueios = Array.isArray(bloqueios) ? bloqueios : [];
    const safeServicos = Array.isArray(servicos) ? servicos : [];

    const erpNames = [...new Set(safeBloqueios.map((b) => b.medico_profissional).filter(Boolean))];
    const officialNames = safeServicos.map((s) => s.nome.toLowerCase().trim());

    return erpNames.filter((name) => !officialNames.includes(name.toLowerCase().trim()));
  }, [bloqueios, servicos]);

  const handleSync = async () => {
    setImportLoading(true);
    try {
      const r = await fetch("/api/importar-agenda", { method: "POST" });
      const d = await r.json();
      if (d.success) {
        if (showToast) showToast(d.message);
        if (typeof fetchBloqueios === "function") await fetchBloqueios();
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

  return (
    <motion.div key="tech" {...fadeUp} className="p-6 md:p-10 mx-auto w-full max-w-5xl overflow-y-auto h-full custom-scrollbar relative pb-32 space-y-8">
      
      {/* CABEÇALHO UNIFICADO DA EMPRESA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Server size={24} />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
              Sincronização com o Medicalsys
            </h2>
            <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
              Execute a importação manual da agenda e gerencie a associação de colunas e profissionais.
            </p>
          </div>
        </div>

        <button
          onClick={handleSync}
          disabled={importLoading}
          className="px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-black font-black text-xs uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg disabled:opacity-50"
        >
          {importLoading ? <Activity size={18} className="animate-spin text-blue-500" /> : <RefreshCw size={18} />}
          {importLoading ? "Sincronizando Agenda..." : "Sincronizar Agenda Agora"}
        </button>
      </div>

      {/* MAPEAMENTO DE COLUNAS PERSONALIZADO */}
      <section className="bg-white dark:bg-[#111] border border-zinc-200/80 dark:border-zinc-800 p-8 rounded-[2.5rem] shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div>
            <h3 className="text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
              <Columns size={20} className="text-blue-500" /> Mapeamento de Colunas do ERP
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Defina para qual coluna local as informações vindas da outra plataforma devem ser gravadas.
            </p>
          </div>

          <ButtonPrimary onClick={handleSaveMapping} disabled={savingConfig} icon={Save} className="px-6 py-3 text-xs">
            {savingConfig ? "Salvando..." : "Salvar Mapeamento"}
          </ButtonPrimary>
        </div>

        <div className="grid md:grid-cols-2 gap-6 p-6 bg-zinc-50 dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800">
          <div className="space-y-3">
            <CustomSelect
              label="Tratamento da coluna 'convenio' do Medicalsys:"
              value={campos.medicalsys_column_mapping?.convenio || "observacoes"}
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
                { value: "observacoes", label: "Preencher em Observações do Agendamento (Recomendado)" },
                { value: "especialidade", label: "Preencher no Campo Especialidade" },
                { value: "eliminar_coluna", label: "Eliminar / Descartar esta Coluna" }
              ]}
            />
            <p className="text-[11px] text-zinc-400">
              Se 'convenio' contiver o plano de saúde escolhido no Medicalsys, você pode direcioná-lo para as observações ou descartá-lo.
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
                { value: "especialidade", label: "Preencher no Campo Especialidade" },
                { value: "eliminar_coluna", label: "Eliminar / Usar Especialidade 'Geral'" }
              ]}
            />
            <p className="text-[11px] text-zinc-400">
              Define se a especialidade do médico vinda da API deve ser gravada no campo especialidade local.
            </p>
          </div>
        </div>
      </section>

      {/* PROFISSIONAIS ÓRFÃOS */}
      <section className="bg-white dark:bg-[#111] border border-zinc-200/80 dark:border-zinc-800 p-8 rounded-[2.5rem] shadow-sm space-y-6">
        <h3 className="text-lg font-black text-zinc-900 dark:text-white">Mapeamento de Profissionais do ERP</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Associe nomes retornados da API do Medicalsys a profissionais cadastrados no seu sistema local.
        </p>

        {unmatchedProfessionals.length === 0 ? (
          <div className="text-center p-8 bg-green-50/50 dark:bg-green-950/20 border border-green-200/60 dark:border-green-900/40 rounded-3xl text-green-800 dark:text-green-300">
            <CheckCircle2 size={32} className="mx-auto mb-2 text-green-600" />
            <p className="font-bold text-sm">Todos os profissionais estão perfeitamente mapeados!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {unmatchedProfessionals.map((erpName) => (
              <UnmatchedItem
                key={`unmatched-${erpName}`}
                erpName={erpName}
                servicosDisponiveiveis={servicos}
                onResolve={handleResolutionComplete}
                showToast={showToast}
              />
            ))}
          </div>
        )}
      </section>

    </motion.div>
  );
}
