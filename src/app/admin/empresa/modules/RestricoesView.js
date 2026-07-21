"use client";

import { useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { 
  CalendarDays, CheckCircle2, 
  Plus, Settings2, Code2, Play, FileJson, Copy, Info, Zap,
  Clock, Trash2 
} from "lucide-react";
import { fadeUp, spring, CustomSelect, ButtonPrimary, ToggleSwitch, TextInput } from "../components/SharedUI";

// IMPORT CORRIGIDO E FUNCIONAL
import { actionCriarRegraAgenda, actionCriarRegraMassa, actionDeletarRegra } from "@/actions/adminData";

const DIAS_SEMANA = [
  { id: 1, label: "Seg", short: "S" },
  { id: 2, label: "Ter", short: "T" },
  { id: 3, label: "Qua", short: "Q" },
  { id: 4, label: "Qui", short: "Q" },
  { id: 5, label: "Sex", short: "S" },
  { id: 6, label: "Sáb", short: "S" },
  { id: 0, label: "Dom", short: "D" }
];

const TIPOS_ATENDIMENTO = ["Consulta Particular", "Consulta Convênio", "Exame (Endoscopia)", "Exame (Colonoscopia)", "Cirurgia Geral"];

const EXEMPLO_JSON = `[
  {
    "servico_id": "COLE_O_UUID_DO_MEDICO_AQUI",
    "dias_semana": [1, 2], 
    "hora_inicio": "08:00",
    "hora_fim": "11:00",
    "ultimo_horario_agendamento": "10:20",
    "tipos_permitidos": ["Consulta Particular"],
    "duracao_slot_minutos": 40,
    "ocupacao_sequencial": false
  },
  {
    "servico_id": "COLE_O_UUID_DO_MEDICO_AQUI",
    "dias_semana": [3], 
    "hora_inicio": "08:00",
    "hora_fim": "11:30",
    "ultimo_horario_agendamento": "11:15",
    "tipos_permitidos": ["Exame (Endoscopia)"],
    "duracao_slot_minutos": 15,
    "ocupacao_sequencial": true
  }
]`;

export default function RestricoesView({ regras = [], servicosOptions = [], fetchRegras, showToast }) {
  const [activeView, setActiveView] = useState("lista"); // 'lista' ou 'builder'
  const [builderMode, setBuilderMode] = useState("visual"); // 'visual' ou 'massa'
  
  // Estado do Rule Builder (Visual)
  const [formData, setFormData] = useState({
    servico_id: "",
    dias_semana: [],
    hora_inicio: "08:00",
    hora_fim: "12:00",
    ultimo_horario_agendamento: "11:30",
    tipos_permitidos: [],
    duracao_slot_minutos: 30,
    ocupacao_sequencial: false
  });

  // Estado do Modo em Massa
  const [jsonInput, setJsonInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const toggleDia = (id) => {
    setFormData(prev => ({
      ...prev,
      dias_semana: prev.dias_semana.includes(id) 
        ? prev.dias_semana.filter(d => d !== id) 
        : [...prev.dias_semana, id]
    }));
  };

  const toggleTipo = (tipo) => {
    setFormData(prev => ({
      ...prev,
      tipos_permitidos: prev.tipos_permitidos.includes(tipo)
        ? prev.tipos_permitidos.filter(t => t !== tipo)
        : [...prev.tipos_permitidos, tipo]
    }));
  };

  const handleSalvarVisual = async () => {
    if (!formData.servico_id || formData.dias_semana.length === 0 || formData.tipos_permitidos.length === 0) {
      showToast("Preencha o profissional, dias e tipos permitidos.", "error");
      return;
    }
    setIsProcessing(true);
    try {
      await actionCriarRegraAgenda(formData); // AWAIT ADICIONADO AQUI!
      showToast("Regra ativada com sucesso!");
      if(fetchRegras) await fetchRegras();
      setActiveView("lista");
    } catch (error) {
      showToast("Erro ao processar regra.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSalvarMassa = async () => {
    if (!jsonInput.trim()) {
      showToast("Cole o JSON com as regras antes de processar.", "error");
      return;
    }
    
    setIsProcessing(true);
    try {
      const parsedData = JSON.parse(jsonInput);
      if (!Array.isArray(parsedData)) throw new Error("O formato deve ser um Array (lista).");
      
      await actionCriarRegraMassa(parsedData);
      
      showToast(`${parsedData.length} regras inseridas com sucesso!`);
      setJsonInput(""); 
      if(fetchRegras) await fetchRegras();
      setActiveView("lista");
    } catch (error) {
      showToast(`Erro de Sintaxe JSON: ${error.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const copiarExemplo = () => {
    navigator.clipboard.writeText(EXEMPLO_JSON);
    showToast("Exemplo copiado para a área de transferência!");
  };

  return (
    <motion.div key="motor-regras" {...fadeUp} className="flex-1 flex flex-col h-full overflow-hidden w-full max-w-6xl mx-auto md:p-6 lg:p-8">
      
      {/* HEADER PRINCIPAL */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-zinc-900 tracking-tight flex items-center gap-3">
            Motor de Agendamento <Zap size={24} className="text-amber-400 fill-amber-400" />
          </h2>
          <p className="text-sm text-zinc-500 mt-2 font-medium max-w-xl">
            Orquestre a disponibilidade do corpo clínico definindo limites rígidos, tempo de intervalo dinâmico e restrições de convênio.
          </p>
        </div>
        
        <LayoutGroup>
          <div className="flex p-1.5 bg-white border border-zinc-200/80 rounded-2xl shadow-sm">
            <button onClick={() => setActiveView("lista")} className={`relative px-6 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-colors z-10 ${activeView === "lista" ? "text-white" : "text-zinc-500 hover:text-zinc-900"}`}>
              {activeView === "lista" && <motion.div layoutId="tab-main" className="absolute inset-0 bg-zinc-900 rounded-xl -z-10 shadow-md" transition={spring} />}
              Regras Ativas
            </button>
            <button onClick={() => setActiveView("builder")} className={`relative flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-colors z-10 ${activeView === "builder" ? "text-white" : "text-zinc-500 hover:text-zinc-900"}`}>
              {activeView === "builder" && <motion.div layoutId="tab-main" className="absolute inset-0 bg-zinc-900 rounded-xl -z-10 shadow-md" transition={spring} />}
              <Plus size={14} /> Nova Arquitetura
            </button>
          </div>
        </LayoutGroup>
      </div>

      {/* ÁREA DE CONTEÚDO */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
        <AnimatePresence mode="wait">
          
          {/* ==================================================== */}
          {/* VIEW: BUILDER (CRIAR REGRA)                          */}
          {/* ==================================================== */}
          {activeView === "builder" && (
            <motion.div 
              key="builder" 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              transition={spring}
              className="space-y-6"
            >
              {/* TOGGLE MODO VISUAL / MODO EM MASSA */}
              <div className="flex justify-center mb-8">
                <div className="flex p-1 bg-zinc-100 rounded-xl border border-zinc-200/60 shadow-inner">
                  <button onClick={() => setBuilderMode("visual")} className={`relative px-8 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors z-10 flex items-center gap-2 ${builderMode === "visual" ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-600"}`}>
                    {builderMode === "visual" && <motion.div layoutId="tab-mode" className="absolute inset-0 bg-white rounded-lg -z-10 shadow-sm border border-zinc-200/50" transition={spring} />}
                    <Settings2 size={14} /> Modo Interativo
                  </button>
                  <button onClick={() => setBuilderMode("massa")} className={`relative px-8 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors z-10 flex items-center gap-2 ${builderMode === "massa" ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-600"}`}>
                    {builderMode === "massa" && <motion.div layoutId="tab-mode" className="absolute inset-0 bg-white rounded-lg -z-10 shadow-sm border border-zinc-200/50" transition={spring} />}
                    <Code2 size={14} /> Em Massa (JSON)
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                
                {/* SUB-VIEW: MODO VISUAL */}
                {builderMode === "visual" && (
                  <motion.div key="visual" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white border border-zinc-200/80 rounded-[2.5rem] shadow-sm p-8 md:p-10 space-y-12">
                    {/* Seção 1: Profissional e Dias */}
                    <section>
                      <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-900 mb-6">
                        <span className="w-6 h-6 rounded-md bg-zinc-900 text-white flex items-center justify-center">1</span>
                        Profissional e Dias
                      </h4>
                      <div className="grid md:grid-cols-2 gap-8 items-start">
                        <CustomSelect label="Selecione o Profissional" value={formData.servico_id} onChange={(val) => setFormData({...formData, servico_id: val})} options={servicosOptions} />
                        <div>
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1 mb-3 block">Dias da Semana (0 = Dom)</label>
                          <div className="flex flex-wrap gap-2">
                            {DIAS_SEMANA.map(dia => (
                              <button key={dia.id} onClick={() => toggleDia(dia.id)} className={`w-12 h-12 rounded-2xl text-sm font-bold transition-all border flex items-center justify-center ${formData.dias_semana.includes(dia.id) ? "bg-zinc-900 text-white border-zinc-900 shadow-[0_8px_16px_rgba(0,0,0,0.1)] scale-105" : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"}`}>
                                {dia.short}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </section>

                    <hr className="border-zinc-100" />

                    {/* Seção 2: Turnos e Geometria */}
                    <section>
                      <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-900 mb-6">
                        <span className="w-6 h-6 rounded-md bg-zinc-100 text-zinc-400 flex items-center justify-center">2</span>
                        Turnos, Slots e Trava Sequencial
                      </h4>
                      <div className="grid md:grid-cols-3 gap-6 mb-8">
                        <TextInput type="time" label="Hora de Início" value={formData.hora_inicio} onChange={(e) => setFormData({...formData, hora_inicio: e.target.value})} />
                        <TextInput type="time" label="Hora de Término" value={formData.hora_fim} onChange={(e) => setFormData({...formData, hora_fim: e.target.value})} />
                        <TextInput type="time" label="Último Agendamento Permitido" value={formData.ultimo_horario_agendamento} onChange={(e) => setFormData({...formData, ultimo_horario_agendamento: e.target.value})} />
                      </div>
                      <div className="grid md:grid-cols-2 gap-8 p-6 bg-zinc-50/50 rounded-3xl border border-zinc-100">
                        <div>
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1 mb-3 block">Duração do Slot (Intervalo)</label>
                          <div className="flex items-center gap-4">
                            <input type="range" min="10" max="120" step="5" value={formData.duracao_slot_minutos} onChange={(e) => setFormData({...formData, duracao_slot_minutos: parseInt(e.target.value)})} className="flex-1 accent-zinc-900" />
                            <div className="bg-white border border-zinc-200 px-4 py-2 rounded-xl font-bold text-zinc-900 min-w-[80px] text-center shadow-sm">
                              {formData.duracao_slot_minutos} min
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col justify-center">
                          <ToggleSwitch checked={formData.ocupacao_sequencial} onChange={(val) => setFormData({...formData, ocupacao_sequencial: val})} label="Ocupação Sequencial Obrigatória" />
                          <p className="text-xs text-zinc-500 mt-2 ml-14 font-medium">Trava a agenda para não permitir "buracos" de horário.</p>
                        </div>
                      </div>
                    </section>

                    <hr className="border-zinc-100" />

                    {/* Seção 3: Tipos Permitidos */}
                    <section>
                      <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-900 mb-6">
                        <span className="w-6 h-6 rounded-md bg-zinc-100 text-zinc-400 flex items-center justify-center">3</span>
                        Restrição de Procedimento
                      </h4>
                      <div className="flex flex-wrap gap-3">
                        {TIPOS_ATENDIMENTO.map(tipo => (
                          <button key={tipo} onClick={() => toggleTipo(tipo)} className={`px-5 py-3 rounded-2xl text-sm font-bold transition-all border ${formData.tipos_permitidos.includes(tipo) ? "bg-zinc-900 text-white border-zinc-900 shadow-md" : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"}`}>
                            {tipo}
                          </button>
                        ))}
                      </div>
                    </section>

                    {/* Submit Visual */}
                    <div className="pt-6 flex justify-end">
                      <ButtonPrimary onClick={handleSalvarVisual} disabled={isProcessing} icon={CheckCircle2} className="w-full md:w-auto px-10">
                        {isProcessing ? "Processando..." : "Gravar Regra Única"}
                      </ButtonPrimary>
                    </div>
                  </motion.div>
                )}

                {/* SUB-VIEW: MODO EM MASSA (JSON) */}
                {builderMode === "massa" && (
                  <motion.div key="massa" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="grid lg:grid-cols-3 gap-6">
                    
                    {/* Painel de Instruções */}
                    <div className="lg:col-span-1 space-y-4">
                      <div className="bg-blue-50/50 border border-blue-200 rounded-[2rem] p-6 md:p-8">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                          <FileJson size={24} />
                        </div>
                        <h3 className="text-xl font-black text-zinc-900 mb-3">Formato Exigido</h3>
                        <p className="text-sm text-zinc-600 font-medium leading-relaxed mb-6">
                          Insira um <strong>Array JSON</strong> (uma lista entre colchetes <code>[]</code>) contendo os objetos de regra. O sistema validará a sintaxe antes de inserir no banco.
                        </p>
                        
                        <div className="bg-zinc-900 rounded-2xl p-4 relative group">
                          <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={copiarExemplo} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur-sm transition-colors" title="Copiar Exemplo">
                              <Copy size={14} />
                            </button>
                          </div>
                          <pre className="text-[10px] text-zinc-300 font-mono overflow-x-auto custom-scrollbar leading-loose">
                            {EXEMPLO_JSON}
                          </pre>
                        </div>
                        
                        <div className="mt-6 flex items-start gap-3 bg-amber-50 border border-amber-200/60 p-4 rounded-xl">
                          <Info size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                          <p className="text-[10px] font-bold text-amber-700/80 uppercase tracking-widest leading-relaxed">
                            Atenção: Os UUIDs dos médicos podem ser copiados na aba "Serviços & Preços". Dias da semana vão de 0 (Dom) a 6 (Sáb).
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Editor JSON */}
                    <div className="lg:col-span-2 bg-zinc-950 rounded-[2.5rem] p-6 shadow-2xl flex flex-col h-[600px] border border-zinc-800">
                      <div className="flex items-center justify-between mb-4 px-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500/80" />
                          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                          <div className="w-3 h-3 rounded-full bg-green-500/80" />
                          <span className="text-zinc-500 text-xs font-mono font-bold uppercase tracking-widest ml-4">Terminal_Lote.json</span>
                        </div>
                      </div>
                      
                      <textarea
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        placeholder="Cole o array [ { ... } ] com as regras aqui..."
                        className="flex-1 w-full bg-transparent text-blue-300 font-mono text-sm leading-relaxed outline-none resize-none custom-scrollbar p-2 placeholder:text-zinc-700"
                        spellCheck="false"
                      />

                      <div className="mt-4 pt-4 border-t border-zinc-800/80 flex justify-end">
                        <button 
                          onClick={handleSalvarMassa}
                          disabled={isProcessing}
                          className="px-8 py-4 bg-white hover:bg-zinc-200 text-zinc-900 rounded-2xl font-black text-xs uppercase tracking-widest transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isProcessing ? "Validando e Inserindo..." : <><Play size={16} className="fill-zinc-900" /> Processar Lote JSON</>}
                        </button>
                      </div>
                    </div>

                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ==================================================== */}
          {/* VIEW: LISTA DE REGRAS ATIVAS                         */}
          {/* ==================================================== */}
          {activeView === "lista" && (
            <motion.div key="lista" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={spring}>
              {regras.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-center">
                  <div className="w-20 h-20 bg-white border border-zinc-200 rounded-[2rem] flex items-center justify-center text-zinc-300 mb-6 shadow-sm">
                    <CalendarDays size={28} />
                  </div>
                  <h4 className="text-lg font-bold text-zinc-900 mb-2">Nenhuma Regra Avançada Configurada</h4>
                  <p className="text-sm text-zinc-500 max-w-sm mb-6 font-medium">Sua agenda está operando no modo padrão livre. Crie arquiteturas de tempo para otimizar os atendimentos.</p>
                  <ButtonPrimary onClick={() => setActiveView("builder")} icon={Plus}>Criar Primeira Regra</ButtonPrimary>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {regras.map((regra) => {
                    const profissional = servicosOptions.find(s => s.value === regra.servico_id) || { label: "Profissional Desconhecido" };
                    
                    const diasNomes = regra.dias_semana
                      .map(dId => DIAS_SEMANA.find(d => d.id === dId)?.label)
                      .filter(Boolean)
                      .join(", ");

                    return (
                      <motion.div 
                        key={regra.id} 
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white border border-zinc-200/80 p-6 rounded-[2rem] flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow group"
                      >
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h4 className="text-lg font-black text-zinc-900 leading-tight">{profissional.label}</h4>
                              <p className="text-xs font-bold text-zinc-400 mt-1 uppercase tracking-widest flex items-center gap-1.5">
                                <CalendarDays size={14} /> {diasNomes}
                              </p>
                            </div>
                            
                            <button 
                              onClick={async () => {
                                await actionDeletarRegra(regra.id);
                                if(fetchRegras) await fetchRegras();
                                showToast("Regra removida com sucesso!");
                              }}
                              className="w-10 h-10 rounded-xl bg-zinc-50 text-zinc-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors flex-shrink-0"
                              title="Remover Regra"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <div className="flex items-center gap-1.5 bg-zinc-100 text-zinc-700 px-3 py-1.5 rounded-lg text-xs font-bold">
                              <Clock size={14} /> {regra.hora_inicio?.substring(0,5)} às {regra.hora_fim?.substring(0,5)}
                            </div>
                            <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1.5 rounded-lg text-xs font-bold">
                              Slot: {regra.duracao_slot_minutos} min
                            </div>
                            {regra.ocupacao_sequencial && (
                              <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200/60 px-3 py-1.5 rounded-lg text-xs font-bold">
                                Sequencial
                              </div>
                            )}
                          </div>

                          <div className="pt-3 border-t border-zinc-100 flex flex-wrap gap-2">
                            {regra.tipos_permitidos?.map(tipo => (
                              <span key={tipo} className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 border border-zinc-200 px-2 py-1 rounded-md">
                                {tipo}
                              </span>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  );
}