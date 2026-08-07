"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  Save,
  CreditCard,
  Link2,
  ShieldCheck,
  KeySquare,
  Server,
  ShieldAlert,
  Activity,
  UserPlus,
  ChevronDown,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Plus
} from "lucide-react";
import { fadeUp, spring, ButtonPrimary, ToggleSwitch, TextInput, CustomSelect } from "../components/SharedUI";
import {
  actionSalvarChavesIntegracao,
  actionCriarServico,
  actionMigrarNomeBloqueios,
  fetchAdminCustomization
} from "@/actions/adminData";
import { supabase } from "@/lib/supabase";

// ==========================================
// ITEM ÓRFÃO (RESOLUÇÃO DE NOMES DO ERP)
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
      showToast(`Profissional "${erpName}" cadastrado!`);
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
      <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center justify-center p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40 rounded-2xl h-[72px]">
        <CheckCircle2 className="text-green-500 mr-2" size={20} />
        <span className="text-green-700 dark:text-green-300 font-bold text-sm">Resolvido!</span>
      </motion.div>
    );
  }

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-[#111] border border-amber-200/60 dark:border-amber-900/40 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
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
            <button onClick={() => setMode("linking")} className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold text-xs hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2">
              <Link2 size={14} /> Associar
            </button>
            <button onClick={handleCreate} className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black font-bold text-xs hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-md">
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
// COMPONENTE PRINCIPAL UNIFICADO
// ==========================================
export default function IntegracoesView({ bloqueios = [], servicos = [], fetchBloqueios, fetchServicos, showToast }) {
  const [subTab, setSubTab] = useState("painel"); // "painel" | "medicalsys" | "mercadopago"
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [empresaId, setEmpresaId] = useState(null);

  const [chaves, setChaves] = useState({
    mp_public_key: "",
    mp_access_token: "",
    medicalsys_enabled: false,
    medicalsys_id_clinica: "9",
    medicalsys_id_medico: "1",
    medicalsys_apikey: "8FxD2eUsODMO8IZWMHZaNpt78av9Vy6k",
    medicalsys_customer_apikey: "SqdACjyxnXuYqL8ilnwTvXHroEOvFHFR",
    auto_sync_cadence: "manual" // "manual" | "diario" | "semanal" | "mensal"
  });

  useEffect(() => {
    const fetchDados = async () => {
      const { data } = await supabase.from("empresas").select("id, config_chaves").limit(1).single();
      if (data) {
        setEmpresaId(data.id);
        if (data.config_chaves) setChaves((prev) => ({ ...prev, ...data.config_chaves }));
      }
    };
    fetchDados();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await actionSalvarChavesIntegracao(chaves);
      if (showToast) showToast("Configurações de integração salvas com sucesso!");
    } catch (e) {
      console.error(e);
      if (showToast) showToast(`Erro ao salvar: ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncLoading(true);
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
      setSyncLoading(false);
    }
  };

  // Profissionais Órfãos do ERP
  const unmatchedProfessionals = useMemo(() => {
    const safeBloqueios = Array.isArray(bloqueios) ? bloqueios : [];
    const safeServicos = Array.isArray(servicos) ? servicos : [];

    const erpNames = [...new Set(safeBloqueios.map((b) => b.medico_profissional).filter(Boolean))];
    const officialNames = safeServicos.map((s) => s.nome.toLowerCase().trim());

    return erpNames.filter((name) => !officialNames.includes(name.toLowerCase().trim()));
  }, [bloqueios, servicos]);

  const handleResolutionComplete = async () => {
    if (typeof fetchServicos === "function") await fetchServicos();
    if (typeof fetchBloqueios === "function") await fetchBloqueios();
  };

  return (
    <motion.div key="integracoes" {...fadeUp} className="flex-1 flex flex-col h-full overflow-hidden w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      
      {/* PADRÃO UNIFICADO DE CABEÇALHO */}
      <div className="mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Link2 size={24} />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
              Central de Integrações
            </h2>
            <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
              Conecte o Medicalsys ERP para agendamentos e o Mercado Pago para recebimento financeiro.
            </p>
          </div>
        </div>

        {/* SUB-ABAS / SEGMENTED CONTROL */}
        <LayoutGroup>
          <div className="flex p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-sm overflow-x-auto w-full sm:w-auto">
            <button
              onClick={() => setSubTab("painel")}
              className={`relative px-5 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl transition-colors z-10 whitespace-nowrap flex items-center gap-2 ${
                subTab === "painel" ? "text-white" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              {subTab === "painel" && (
                <motion.div layoutId="subtab-int" className="absolute inset-0 bg-zinc-900 dark:bg-white dark:text-black rounded-xl -z-10 shadow-md" transition={spring} />
              )}
              <Link2 size={14} /> Conexões Ativas
            </button>

            <button
              onClick={() => setSubTab("medicalsys")}
              className={`relative px-5 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl transition-colors z-10 whitespace-nowrap flex items-center gap-2 ${
                subTab === "medicalsys" ? "text-white" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              {subTab === "medicalsys" && (
                <motion.div layoutId="subtab-int" className="absolute inset-0 bg-zinc-900 dark:bg-white dark:text-black rounded-xl -z-10 shadow-md" transition={spring} />
              )}
              <Server size={14} /> Agenda ERP (Medicalsys)
            </button>

            <button
              onClick={() => setSubTab("mercadopago")}
              className={`relative px-5 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl transition-colors z-10 whitespace-nowrap flex items-center gap-2 ${
                subTab === "mercadopago" ? "text-white" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              {subTab === "mercadopago" && (
                <motion.div layoutId="subtab-int" className="absolute inset-0 bg-zinc-900 dark:bg-white dark:text-black rounded-xl -z-10 shadow-md" transition={spring} />
              )}
              <CreditCard size={14} /> Pagamentos (Mercado Pago)
            </button>
          </div>
        </LayoutGroup>
      </div>

      {/* CONTEÚDO DAS SUB-ABAS */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-28">
        <AnimatePresence mode="wait">
          
          {/* SUB-ABA 1: PAINEL DE CONEXÕES ATIVAS & SINCRONIZAÇÃO RÁPIDA */}
          {subTab === "painel" && (
            <motion.div key="sub-painel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={spring} className="space-y-6">
              
              {/* CARD MEDICALSYS */}
              <div className="bg-white dark:bg-[#111] border border-zinc-200/80 dark:border-zinc-800 p-8 rounded-[2.5rem] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                    <Server size={28} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black text-zinc-900 dark:text-white">Medicalsys Agenda ERP</h3>
                      <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300">
                        Conectado
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-lg leading-relaxed">
                      Sincronize horários indisponíveis, nomes de pacientes e consultas agendadas diretamente com a plataforma Medicalsys.
                    </p>

                    {/* Cadência da Sincronização Automática */}
                    <div className="mt-4 flex items-center gap-3">
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                        <Clock size={14} /> Sincronização Automática:
                      </label>
                      <select
                        value={chaves.auto_sync_cadence || "manual"}
                        onChange={(e) => setChaves({ ...chaves, auto_sync_cadence: e.target.value })}
                        className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-bold text-zinc-900 dark:text-white outline-none"
                      >
                        <option value="manual">Apenas Manual (Botão Clique)</option>
                        <option value="diario">Diariamente (Automático)</option>
                        <option value="semanal">Semanalmente (Automático)</option>
                        <option value="mensal">Mensalmente (Automático)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
                  <button
                    onClick={handleSyncNow}
                    disabled={syncLoading}
                    className="px-6 py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-black font-bold text-xs uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 shadow-md"
                  >
                    {syncLoading ? <Activity size={16} className="animate-spin text-blue-500" /> : <RefreshCw size={16} />}
                    Sincronizar Agora
                  </button>
                  <button
                    onClick={() => setSubTab("medicalsys")}
                    className="px-5 py-3.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold text-xs uppercase tracking-widest rounded-2xl transition-colors"
                  >
                    Configurar API
                  </button>
                </div>
              </div>

              {/* CARD MERCADO PAGO */}
              <div className="bg-white dark:bg-[#111] border border-zinc-200/80 dark:border-zinc-800 p-8 rounded-[2.5rem] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                    <CreditCard size={28} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black text-zinc-900 dark:text-white">Mercado Pago Checkout</h3>
                      <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                        chaves.mp_public_key ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {chaves.mp_public_key ? "Configurado" : "Pendente de Chave"}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-lg leading-relaxed">
                      Provedor financeiro para recebimento de consultas e exames via cartão de crédito ou Pix instantâneo.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSubTab("mercadopago")}
                  className="px-6 py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-black transition-all shadow-md self-start lg:self-center"
                >
                  Configurar Credenciais
                </button>
              </div>

            </motion.div>
          )}

          {/* SUB-ABA 2: CONFIGURAÇÕES DO MEDICALSYS ERP */}
          {subTab === "medicalsys" && (
            <motion.div key="sub-medicalsys" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={spring} className="space-y-6">
              
              {/* PROFISSIONAIS ÓRFÃOS */}
              {unmatchedProfessionals.length > 0 && (
                <div className="p-6 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 rounded-3xl space-y-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={20} className="text-amber-600" />
                    <h4 className="font-bold text-amber-950 dark:text-amber-300 text-base">
                      {unmatchedProfessionals.length} Profissional(is) não mapeados vindos do ERP
                    </h4>
                  </div>
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
                </div>
              )}

              {/* TRAVA DE SEGURANÇA E ENVIOS */}
              <div className="bg-white dark:bg-[#111] border border-zinc-200/80 dark:border-zinc-800 p-8 rounded-[2.5rem] shadow-sm space-y-8">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
                  <h3 className="text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
                    <ShieldAlert size={20} className="text-amber-500" /> Controle de Inclusão de Agendamentos na API
                  </h3>
                </div>

                <div className="p-6 rounded-3xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-4">
                  <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                    Desabilite para rodar os testes de agendamento no seu ambiente sem enviar requisições reais para a clínica do Medicalsys. Quando desabilitado, os testes rodam com segurança no sistema.
                  </p>
                  <ToggleSwitch
                    checked={Boolean(chaves.medicalsys_enabled)}
                    onChange={(v) => setChaves({ ...chaves, medicalsys_enabled: v })}
                    label={chaves.medicalsys_enabled ? "Envio Automático Ativado (Produção)" : "Envio Desabilitado (Modo de Teste Protegido)"}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6 pt-2">
                  <TextInput
                    label="ID da Clínica no Medicalsys (id_clinica)"
                    placeholder="Ex: 9"
                    value={chaves.medicalsys_id_clinica || ""}
                    onChange={(e) => setChaves({ ...chaves, medicalsys_id_clinica: e.target.value })}
                  />

                  <TextInput
                    label="ID do Médico Padrão (medico)"
                    placeholder="Ex: 1"
                    value={chaves.medicalsys_id_medico || ""}
                    onChange={(e) => setChaves({ ...chaves, medicalsys_id_medico: e.target.value })}
                  />

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Chave API (apikey)</label>
                    <input
                      type="text"
                      value={chaves.medicalsys_apikey || ""}
                      onChange={(e) => setChaves({ ...chaves, medicalsys_apikey: e.target.value })}
                      className="w-full px-4 py-3.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl text-sm font-mono text-zinc-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Chave do Cliente (msys-costumer-apikey)</label>
                    <input
                      type="text"
                      value={chaves.medicalsys_customer_apikey || ""}
                      onChange={(e) => setChaves({ ...chaves, medicalsys_customer_apikey: e.target.value })}
                      className="w-full px-4 py-3.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl text-sm font-mono text-zinc-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

            </motion.div>
          )}

          {/* SUB-ABA 3: MERCADO PAGO */}
          {subTab === "mercadopago" && (
            <motion.div key="sub-mercadopago" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={spring} className="space-y-6">
              <div className="bg-white dark:bg-[#111] border border-zinc-200/80 dark:border-zinc-800 p-8 rounded-[2.5rem] shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-zinc-900 dark:text-white">Credenciais do Mercado Pago</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Chaves de integração para pagamentos de cartão e Pix no checkout transparente.
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                      <KeySquare size={14} /> Public Key
                    </label>
                    <input
                      type="text"
                      value={chaves.mp_public_key || ""}
                      onChange={(e) => setChaves({ ...chaves, mp_public_key: e.target.value })}
                      placeholder="APP_USR-xxxxxxxx-xxxx-xxxx..."
                      className="w-full px-4 py-3.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl text-sm font-mono text-zinc-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                      <KeySquare size={14} /> Access Token (Privado)
                    </label>
                    <input
                      type="password"
                      value={chaves.mp_access_token || ""}
                      onChange={(e) => setChaves({ ...chaves, mp_access_token: e.target.value })}
                      placeholder="APP_USR-xxxxxxxx-xxxx-xxxx..."
                      className="w-full px-4 py-3.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl text-sm font-mono text-zinc-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* RODAPÉ FIXO PARA SALVAR CHAVES COM SERVER ACTION */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-t border-zinc-200/80 dark:border-zinc-800 flex justify-end items-center z-50">
        <ButtonPrimary onClick={handleSave} disabled={loading} icon={Save} className="w-full md:w-auto px-12 py-4 text-sm">
          {loading ? "Salvando Integrações..." : "Salvar Configurações de Integração"}
        </ButtonPrimary>
      </div>

    </motion.div>
  );
}
