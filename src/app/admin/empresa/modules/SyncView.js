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
  Settings2,
  KeySquare,
  ShieldAlert,
  Building,
  Save,
  Check,
  X,
  Columns,
  Filter
} from "lucide-react";
import { fadeUp, spring, ToggleSwitch, TextInput, ButtonPrimary, CustomSelect } from "../components/SharedUI";
import { actionCriarServico, actionMigrarNomeBloqueios, actionSalvarCustomization, fetchAdminCustomization } from "@/actions/adminData";
import { supabase } from "@/lib/supabase";

// ==========================================
// COMPONENTE: ITEM ÓRFÃO (RESOLUÇÃO)
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
// COMPONENTE PRINCIPAL (VIEW)
// ==========================================
export default function SyncView({ bloqueios = [], servicos = [], fetchBloqueios, fetchServicos, showToast }) {
  const [subTab, setSubTab] = useState("sync"); // "sync" | "unmatched" | "config"
  const [importLoading, setImportLoading] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // Configurações do Medicalsys (Ativação e Mapeamento de Colunas)
  const [empresaId, setEmpresaId] = useState(null);
  const [campos, setCampos] = useState({
    medicalsys_column_mapping: {
      convenio: "observacoes", // "observacoes" | "especialidade" | "eliminar_coluna"
      especialidade: "especialidade" // "especialidade" | "eliminar_coluna"
    }
  });

  const [medicalsysConfig, setMedicalsysConfig] = useState({
    medicalsys_enabled: false,
    medicalsys_id_clinica: "9",
    medicalsys_id_medico: "1",
    medicalsys_apikey: "8FxD2eUsODMO8IZWMHZaNpt78av9Vy6k",
    medicalsys_customer_apikey: "SqdACjyxnXuYqL8ilnwTvXHroEOvFHFR"
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
      const { data } = await supabase.from("empresas").select("id, config_chaves").limit(1).single();
      if (data && data.config_chaves) {
        setMedicalsysConfig((prev) => ({ ...prev, ...data.config_chaves }));
      }
    };
    loadConfig();
  }, []);

  const handleSaveMapping = async () => {
    setSavingConfig(true);
    try {
      await actionSalvarCustomization({ config_campos: campos, config_mensagens: [] });
      const { error } = await supabase
        .from("empresas")
        .update({ config_chaves: medicalsysConfig })
        .eq("id", empresaId);
      if (error) throw error;
      showToast("Configurações e mapeamento de colunas do Medicalsys salvos!");
    } catch (err) {
      showToast(`Erro ao salvar: ${err.message}`, "error");
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
        showToast(d.message);
        if (typeof fetchBloqueios === "function") await fetchBloqueios();
      } else {
        showToast(d.error, "error");
      }
    } catch (e) {
      showToast("Erro de conexão na API", "error");
    } finally {
      setImportLoading(false);
    }
  };

  const handleResolutionComplete = async () => {
    if (typeof fetchServicos === "function") await fetchServicos();
    if (typeof fetchBloqueios === "function") await fetchBloqueios();
  };

  return (
    <motion.div key="tech" {...fadeUp} className="p-6 md:p-10 mx-auto w-full max-w-5xl overflow-y-auto h-full custom-scrollbar relative pb-32">
      
      {/* Cabeçalho e Sub-abas */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-3">
            Integração ERP Medicalsys <Server size={24} className="text-blue-500" />
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 font-medium">
            Sincronize horários indisponíveis, mapeie colunas do ERP e gerencie a inclusão na API.
          </p>
        </div>

        <LayoutGroup>
          <div className="flex p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-sm overflow-x-auto">
            <button
              onClick={() => setSubTab("sync")}
              className={`relative px-5 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl transition-colors z-10 whitespace-nowrap flex items-center gap-2 ${
                subTab === "sync" ? "text-white" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              {subTab === "sync" && <motion.div layoutId="subtab-sync" className="absolute inset-0 bg-zinc-900 dark:bg-white dark:text-black rounded-xl -z-10 shadow-md" transition={spring} />}
              <Server size={14} /> Sincronizar Horários
            </button>

            <button
              onClick={() => setSubTab("unmatched")}
              className={`relative px-5 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl transition-colors z-10 whitespace-nowrap flex items-center gap-2 ${
                subTab === "unmatched" ? "text-white" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              {subTab === "unmatched" && <motion.div layoutId="subtab-sync" className="absolute inset-0 bg-zinc-900 dark:bg-white dark:text-black rounded-xl -z-10 shadow-md" transition={spring} />}
              <UserPlus size={14} /> Mapeamento Órfão ({unmatchedProfessionals.length})
            </button>

            <button
              onClick={() => setSubTab("config")}
              className={`relative px-5 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl transition-colors z-10 whitespace-nowrap flex items-center gap-2 ${
                subTab === "config" ? "text-white" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              {subTab === "config" && <motion.div layoutId="subtab-sync" className="absolute inset-0 bg-zinc-900 dark:bg-white dark:text-black rounded-xl -z-10 shadow-md" transition={spring} />}
              <Columns size={14} /> Mapeamento de Colunas & API
            </button>
          </div>
        </LayoutGroup>
      </div>

      <AnimatePresence mode="wait">
        
        {/* SUB-ABA 1: SINCRONIZAÇÃO */}
        {subTab === "sync" && (
          <motion.div key="sub-sync" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={spring} className="space-y-6">
            <div className="bg-gradient-to-br from-zinc-900 to-black p-8 md:p-12 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/20 blur-[100px] rounded-full pointer-events-none group-hover:bg-blue-500/30 transition-all duration-1000" />

              <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10 text-center md:text-left">
                <div
                  className={`w-20 h-20 rounded-[2rem] flex items-center justify-center flex-shrink-0 transition-all duration-700 shadow-2xl border ${
                    importLoading ? "bg-blue-900/50 border-blue-500 text-blue-400 scale-95" : "bg-zinc-800 border-zinc-700 text-zinc-300"
                  }`}
                >
                  <Server size={32} className={importLoading ? "animate-pulse" : ""} />
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-center md:justify-start gap-3">
                    <h3 className="text-2xl font-black text-white">Sincronização com Medicalsys</h3>
                    <span
                      className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full ${
                        medicalsysConfig.medicalsys_enabled ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {medicalsysConfig.medicalsys_enabled ? "Envio Ativo" : "Modo Teste / Leitura"}
                    </span>
                  </div>

                  <p className="text-sm text-zinc-400 mt-3 leading-relaxed max-w-xl">
                    Importa a agenda do Medicalsys atualizando nome dos pacientes, CPF, especialista e especialidades segundo o mapeamento configurado.
                  </p>

                  <button
                    onClick={handleSync}
                    disabled={importLoading}
                    className="mt-8 px-8 py-4 bg-white hover:bg-zinc-100 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-900 text-xs font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center md:justify-start w-full md:w-auto gap-3 shadow-lg"
                  >
                    {importLoading ? (
                      <>
                        <Activity size={16} className="animate-spin text-blue-500" /> Importando do Medicalsys...
                      </>
                    ) : (
                      "Sincronizar Agenda do Medicalsys Agora"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* SUB-ABA 2: PROFISSIONAIS ÓRFÃOS */}
        {subTab === "unmatched" && (
          <motion.div key="sub-unmatched" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={spring} className="space-y-6">
            <div className="bg-white dark:bg-[#111] border border-zinc-200/80 dark:border-zinc-800 p-8 rounded-[2rem] shadow-sm">
              <h3 className="text-lg font-black text-zinc-900 dark:text-white mb-2">Mapeamento de Nomes do ERP</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                Associe nomes retornados da API do Medicalsys a profissionais cadastrados no seu sistema para organizar as agendas.
              </p>

              {unmatchedProfessionals.length === 0 ? (
                <div className="text-center p-12 bg-green-50/50 dark:bg-green-950/20 border border-green-200/60 dark:border-green-900/40 rounded-2xl text-green-800 dark:text-green-300">
                  <CheckCircle2 size={32} className="mx-auto mb-3 text-green-600" />
                  <p className="font-bold text-base">Todos os profissionais estão perfeitamente mapeados!</p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">Nenhum nome pendente de associação.</p>
                </div>
              ) : (
                <div className="space-y-4">
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
            </div>
          </motion.div>
        )}

        {/* SUB-ABA 3: MAPEAMENTO DE COLUNAS & CONFIGURAÇÃO DA API */}
        {subTab === "config" && (
          <motion.div key="sub-config" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={spring} className="space-y-6">
            
            {/* MAPEAMENTO DE COLUNAS PERSONALIZADO */}
            <div className="bg-white dark:bg-[#111] border border-zinc-200/80 dark:border-zinc-800 p-8 rounded-[2.5rem] shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <div>
                  <h3 className="text-xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
                    <Columns size={20} className="text-blue-500" /> Mapeamento de Colunas do ERP (Antes de Integrar)
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Escolha onde cada informação vinda do Medicalsys deve ser gravada no seu sistema local.
                  </p>
                </div>

                <ButtonPrimary onClick={handleSaveMapping} disabled={savingConfig} icon={Save} className="px-6 py-3 text-xs">
                  {savingConfig ? "Salvando..." : "Salvar Mapeamento"}
                </ButtonPrimary>
              </div>

              <div className="grid md:grid-cols-2 gap-6 p-6 bg-zinc-50 dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800">
                <div className="space-y-3">
                  <CustomSelect
                    label="Como tratar a coluna 'convenio' do Medicalsys?"
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
                    Se 'convenio' contiver o plano de saúde escolhido no Medicalsys, você pode direcioná-lo para as observações ou descartá-lo antes da integração.
                  </p>
                </div>

                <div className="space-y-3">
                  <CustomSelect
                    label="Como tratar a coluna 'especialidade' do Medicalsys?"
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
                    Define se a especialidade do médico vinda da API deve ser associada diretamente ou descartada.
                  </p>
                </div>
              </div>

              {/* TRAVA DE SEGURANÇA E ENVIOS */}
              <div className="p-6 rounded-3xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 space-y-4">
                <ToggleSwitch
                  checked={Boolean(medicalsysConfig.medicalsys_enabled)}
                  onChange={(v) => setMedicalsysConfig({ ...medicalsysConfig, medicalsys_enabled: v })}
                  label={medicalsysConfig.medicalsys_enabled ? "Envio Automático Ativado (Produção)" : "Envio Desabilitado (Modo de Teste Protegido)"}
                />
              </div>

              {/* DADOS DA API */}
              <div className="grid md:grid-cols-2 gap-6 pt-2">
                <TextInput
                  label="ID da Clínica no Medicalsys (id_clinica)"
                  placeholder="Ex: 9"
                  value={medicalsysConfig.medicalsys_id_clinica || ""}
                  onChange={(e) => setMedicalsysConfig({ ...medicalsysConfig, medicalsys_id_clinica: e.target.value })}
                />

                <TextInput
                  label="ID do Médico Padrão (medico)"
                  placeholder="Ex: 1"
                  value={medicalsysConfig.medicalsys_id_medico || ""}
                  onChange={(e) => setMedicalsysConfig({ ...medicalsysConfig, medicalsys_id_medico: e.target.value })}
                />
              </div>

            </div>
          </motion.div>
        )}

      </AnimatePresence>

    </motion.div>
  );
}
