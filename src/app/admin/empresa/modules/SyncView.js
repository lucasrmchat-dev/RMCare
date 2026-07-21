"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Server, Activity, AlertTriangle, UserPlus, Link2, CheckCircle2, ChevronDown, ArrowRight } from "lucide-react";
import { fadeUp, spring } from "../components/SharedUI";
import { actionCriarServico, actionMigrarNomeBloqueios } from "@/actions/adminData";

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
      const targetService = servicosDisponiveiveis.find(s => s.id === selectedServiceId);
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
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white border border-amber-200/60 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group">
      
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 flex-shrink-0">
          <AlertTriangle size={18} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Desconhecido no ERP</p>
          <p className="font-bold text-zinc-900">{erpName}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {mode === "idle" && (
          <>
            <button onClick={() => setMode("linking")} className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-white border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 text-zinc-600 font-bold text-xs transition-colors flex items-center justify-center gap-2">
              <Link2 size={14} /> Associar
            </button>
            <button onClick={handleCreate} className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-black text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-md">
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
                className="w-full appearance-none bg-zinc-50 border border-zinc-200 text-zinc-700 text-sm font-medium rounded-xl px-4 py-2.5 pr-10 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all"
              >
                <option value="" disabled>Selecione o profissional...</option>
                {servicosDisponiveiveis.map(s => (
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
  const [importLoading, setImportLoading] = useState(false);

  // Lógica de Inteligência (COM PROTEÇÃO ARRAY)
  const unmatchedProfessionals = useMemo(() => {
    // Garante que é array antes de mapear, evitando o erro Type Error
    const safeBloqueios = Array.isArray(bloqueios) ? bloqueios : [];
    const safeServicos = Array.isArray(servicos) ? servicos : [];

    const erpNames = [...new Set(safeBloqueios.map(b => b.medico_profissional).filter(Boolean))];
    const officialNames = safeServicos.map(s => s.nome.toLowerCase().trim());
    
    return erpNames.filter(name => !officialNames.includes(name.toLowerCase().trim()));
  }, [bloqueios, servicos]);

  const handleSync = async () => {
    setImportLoading(true);
    try {
      const r = await fetch("/api/importar-agenda", { method: "POST" });
      const d = await r.json();
      if (d.success) {
        showToast(d.message);
        if (typeof fetchBloqueios === 'function') await fetchBloqueios();
      } else {
        showToast(d.error, "error");
      }
    } catch (e) {
      showToast("Erro API", "error");
    } finally {
      setImportLoading(false);
    }
  };

  const handleResolutionComplete = async () => {
    if (typeof fetchServicos === 'function') await fetchServicos();
    if (typeof fetchBloqueios === 'function') await fetchBloqueios();
  };

  return (
    <motion.div key="tech" {...fadeUp} className="p-6 md:p-10 mx-auto w-full max-w-4xl overflow-y-auto h-full custom-scrollbar relative pb-32">
      
      <div className="mb-10">
        <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Sincronização ERP</h2>
        <p className="text-sm text-zinc-500 mt-2 font-medium">Extraia horários indisponíveis do sistema interno da clínica (Medicalsys).</p>
      </div>

      <div className="bg-gradient-to-br from-zinc-900 to-black p-8 md:p-12 rounded-[2rem] shadow-[0_20px_40px_rgba(0,0,0,0.1)] relative overflow-hidden group mb-8">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/20 blur-[100px] rounded-full pointer-events-none group-hover:bg-blue-500/30 transition-all duration-1000"/>
        
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10 text-center md:text-left">
          <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center flex-shrink-0 transition-all duration-700 shadow-2xl border ${importLoading ? 'bg-blue-900/50 border-blue-500 text-blue-400 scale-95' : 'bg-zinc-800 border-zinc-700 text-zinc-300'}`}>
            <Server size={32} className={importLoading ? 'animate-pulse' : ''} />
          </div>
          
          <div className="flex-1">
            <h3 className="text-2xl font-black text-white">Medicalsys Webhook</h3>
            <p className="text-sm text-zinc-400 mt-3 leading-relaxed max-w-lg">
              Cruze as agendas locais e injete bloqueios automáticos no portal. O sistema mapeará automaticamente os profissionais conhecidos.
            </p>
            <button 
              onClick={handleSync} 
              disabled={importLoading} 
              className="mt-8 px-8 py-4 bg-white hover:bg-zinc-100 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-900 text-xs font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center md:justify-start w-full md:w-auto gap-3 shadow-[0_10px_40px_rgba(255,255,255,0.1)]"
            >
              {importLoading ? <><Activity size={16} className="animate-spin text-blue-500" /> Sincronizando Dados...</> : "Forçar Sincronização Agora"}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {unmatchedProfessionals.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0, y: 20 }} 
            animate={{ opacity: 1, height: "auto", y: 0 }} 
            exit={{ opacity: 0, height: 0, scale: 0.9 }}
            transition={spring}
            className="overflow-hidden"
          >
            <div className="pt-4 border-t border-zinc-200/60">
              <div className="flex items-center gap-3 mb-6 mt-4">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
                <h3 className="text-lg font-black text-zinc-900 tracking-tight">Ação Necessária: Profissionais não mapeados</h3>
              </div>
              
              <p className="text-sm text-zinc-500 mb-6 max-w-2xl font-medium">
                Detectamos <strong>{unmatchedProfessionals.length}</strong> profissionais vindos do ERP que ainda não existem no seu catálogo de Serviços & Preços. Resolva abaixo para habilitá-los nos filtros.
              </p>

              <LayoutGroup>
                <motion.div layout className="space-y-4">
                  <AnimatePresence>
                    {unmatchedProfessionals.map((erpName) => (
                      <UnmatchedItem 
                        key={`unmatched-${erpName}`} 
                        erpName={erpName} 
                        servicosDisponiveiveis={servicos} 
                        onResolve={handleResolutionComplete}
                        showToast={showToast}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              </LayoutGroup>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}