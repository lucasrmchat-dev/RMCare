"use client"; 
import { useState, useMemo } from "react"; 
import { motion, AnimatePresence, LayoutGroup } from "framer-motion"; 
import { CalendarDays, CheckCircle2, Plus, Settings2, Code2, Play, FileJson, Copy, Info, Zap, Clock, Clock3, Trash2, Building, User, Pencil, X, LayoutGrid, List } from "lucide-react"; 
import { fadeUp, spring, CustomSelect, ButtonPrimary, ToggleSwitch, TextInput } from "../components/SharedUI"; 
import { actionCriarRegraAgenda, actionAtualizarRegraAgenda, actionCriarRegraMassa, actionDeletarRegra } from "@/actions/adminData"; 

const DIAS_SEMANA = [   
    { id: 1, label: "Segunda", short: "Seg" },   
    { id: 2, label: "Terça", short: "Ter" },   
    { id: 3, label: "Quarta", short: "Qua" },   
    { id: 4, label: "Quinta", short: "Qui" },   
    { id: 5, label: "Sexta", short: "Sex" },   
    { id: 6, label: "Sábado", short: "Sáb" },   
    { id: 0, label: "Domingo", short: "Dom" } 
];

const EXEMPLO_JSON = `[
    {
        "servico_id": null,
        "dias_semana": [1, 2, 3, 4, 5],
        "hora_inicio": "08:00",
        "hora_fim": "18:00",
        "ultimo_horario_agendamento": "17:30",
        "tipos_permitidos": [],
        "duracao_slot_minutos": 30,
        "ocupacao_sequencial": false
    }
]`;

export default function RestricoesView({ subTab = "configurados", setSubTab, regras = [], servicosOptions = [], servicos = [], fetchRegras, showToast }) {   
    const [viewMode, setViewMode] = useState("cards"); // "cards" | "tabela"
    const [tipoRegra, setTipoRegra] = useState("especifica");   
    const [builderMode, setBuilderMode] = useState("visual");    
    const [formData, setFormData] = useState({     
        servico_id: "",     
        dias_semana: [],     
        hora_inicio: "08:00",     
        hora_fim: "18:00",     
        ultimo_horario_agendamento: "17:30",     
        tipos_permitidos: [],     
        duracao_slot_minutos: 30,     
        ocupacao_sequencial: false   
    });   
    const [jsonInput, setJsonInput] = useState("");   
    const [isProcessing, setIsProcessing] = useState(false);   
    const [editingId, setEditingId] = useState(null);

    const activeView = subTab === "adicionar" ? "builder" : "lista";

    const resetForm = () => {
        setEditingId(null);
        setTipoRegra("especifica");
        setFormData({ servico_id: "", dias_semana: [], hora_inicio: "08:00", hora_fim: "18:00", ultimo_horario_agendamento: "17:30", tipos_permitidos: [], duracao_slot_minutos: 30, ocupacao_sequencial: false });
    };

    const editarRegra = (regra) => {
        setEditingId(regra.id);
        setTipoRegra(regra.servico_id ? "especifica" : "geral");
        setFormData({
            servico_id: regra.servico_id || "", dias_semana: regra.dias_semana || [],
            hora_inicio: regra.hora_inicio?.slice(0, 5) || "08:00", hora_fim: regra.hora_fim?.slice(0, 5) || "18:00",
            ultimo_horario_agendamento: regra.ultimo_horario_agendamento?.slice(0, 5) || "17:30",
            tipos_permitidos: regra.tipos_permitidos || [], duracao_slot_minutos: regra.duracao_slot_minutos || 30,
            ocupacao_sequencial: Boolean(regra.ocupacao_sequencial), ativo: regra.ativo !== false
        });
        setBuilderMode("visual"); 
        if (setSubTab) setSubTab("adicionar");
    };

    const tiposDinamicos = useMemo(() => {
        const items = new Set();
        
        items.add("Consulta Particular");
        items.add("Consulta Convênio");
        items.add("Consulta Particular Inicial");
        items.add("Retorno");
    
        if (Array.isArray(servicos)) {
            servicos.forEach(s => {
                if (s.especialidade) {
                    s.especialidade.split(',').forEach(e => items.add(e.trim()));
                }
                if (s.tipo) {
                    items.add(s.tipo);
                }
            });
        }
        
        return Array.from(items).sort();
    }, [servicos]);

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
        if (tipoRegra === "especifica" && !formData.servico_id) {       
            showToast("Selecione qual profissional esta regra afeta.", "error");       
            return;     
        }     
        if (formData.dias_semana.length === 0) {       
            showToast("Selecione ao menos um dia de funcionamento.", "error");       
            return;     
        }     
        setIsProcessing(true);     
        try {       
            const payload = { ...formData };       
            if (tipoRegra === "geral") {         
                payload.servico_id = null;       
            }       
            if (editingId) await actionAtualizarRegraAgenda(editingId, payload);
            else await actionCriarRegraAgenda(payload);       
            showToast(editingId ? "Alterações salvas na agenda." : "Regra adicionada à agenda.");              
            if(fetchRegras) await fetchRegras();       
            if (setSubTab) setSubTab("configurados");              
            resetForm();     
        } catch (error) {       
            showToast("Erro ao processar regra. Tente novamente.", "error");     
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
            if (setSubTab) setSubTab("configurados");     
        } catch (error) {       
            showToast(`Erro de Sintaxe JSON: ${error.message}`, "error");     
        } finally {       
            setIsProcessing(false);     
        }   
    };   

    return (     
        <motion.div key="motor-regras" {...fadeUp} className="flex-1 flex flex-col h-full overflow-hidden w-full max-w-6xl mx-auto p-4 md:p-6 lg:p-8">              
            {/* PADRÃO UNIFICADO DE CABEÇALHO */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">         
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Clock3 size={24} />
                    </div>
                    <div>           
                        <h2 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">             
                            Disponibilidade da Agenda
                        </h2>           
                        <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">             
                            Defina quando cada atendimento pode ser marcado e a duração de cada horário.
                        </p>         
                    </div>
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

            <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">         
                <AnimatePresence mode="wait">                      
                    {activeView === "builder" && (             
                        <motion.div key="builder" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={spring} className="space-y-6">                              
                            <div className="bg-white dark:bg-[#111] border border-zinc-200/80 dark:border-zinc-800 rounded-[2.5rem] shadow-sm p-8 md:p-10 space-y-12">
                                {editingId && <div className="flex items-center justify-between rounded-2xl bg-blue-50 border border-blue-100 px-5 py-4"><div><strong className="text-blue-950">Editando horário existente</strong><p className="text-sm text-blue-700 mt-1">Altere os campos abaixo e salve para substituir a configuração anterior.</p></div><button onClick={() => { resetForm(); if (setSubTab) setSubTab("configurados"); }} className="p-2 text-blue-600"><X size={18}/></button></div>}                                          
                                <section>                       
                                    <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white mb-6">                         
                                        <span className="w-6 h-6 rounded-md bg-zinc-900 dark:bg-white text-white dark:text-black flex items-center justify-center">1</span>                         
                                        Para quem é esta regra?                       
                                    </h4>                                              
                                    <div className="grid md:grid-cols-2 gap-4 mb-6">                         
                                        <button onClick={() => setTipoRegra("geral")} className={`p-6 rounded-2xl border-2 transition-all flex flex-col gap-3 text-left ${tipoRegra === "geral" ? "border-zinc-900 bg-zinc-50 dark:bg-zinc-900 shadow-md" : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111]"}`}>                           
                                            <Building size={24} className={tipoRegra === "geral" ? "text-zinc-900 dark:text-white" : "text-zinc-400"} />                           
                                            <div>                             
                                                <span className="block font-bold text-zinc-900 dark:text-white text-lg">Geral da Clínica</span>                             
                                                <span className="block text-sm text-zinc-500 mt-1">Aplica-se a todos os agendamentos da clínica.</span>                           
                                            </div>                         
                                        </button>                                                  
                                        <button onClick={() => setTipoRegra("especifica")} className={`p-6 rounded-2xl border-2 transition-all flex flex-col gap-3 text-left ${tipoRegra === "especifica" ? "border-zinc-900 bg-zinc-50 dark:bg-zinc-900 shadow-md" : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111]"}`}>                           
                                            <User size={24} className={tipoRegra === "especifica" ? "text-zinc-900 dark:text-white" : "text-zinc-400"} />                           
                                            <div>                             
                                                <span className="block font-bold text-zinc-900 dark:text-white text-lg">Colaborador / Profissional</span>                             
                                                <span className="block text-sm text-zinc-500 mt-1">Exclusivo para um médico específico.</span>                           
                                            </div>                         
                                        </button>                       
                                    </div>                       
                                    {tipoRegra === "especifica" && (                         
                                        <div className="pt-4 relative z-50">                            
                                            <CustomSelect label="Qual o profissional afetado?" value={formData.servico_id} onChange={(val) => setFormData({...formData, servico_id: val})} options={servicosOptions} />                            
                                        </div>                       
                                    )}                     
                                </section>                     
                                <hr className="border-zinc-100 dark:border-zinc-800" />                     
                                <section>                       
                                    <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white mb-6">                         
                                        <span className="w-6 h-6 rounded-md bg-zinc-900 dark:bg-white text-white dark:text-black flex items-center justify-center">2</span>                         
                                        Dias de Atendimento                       
                                    </h4>                                              
                                    <div className="flex flex-wrap gap-3">                         
                                        {DIAS_SEMANA.map(dia => (                           
                                            <button key={dia.id} onClick={() => toggleDia(dia.id)} className={`px-6 py-4 rounded-2xl text-sm font-bold transition-all border flex items-center justify-center ${formData.dias_semana.includes(dia.id) ? "bg-zinc-900 text-white dark:bg-white dark:text-black border-zinc-900 shadow-md scale-105" : "bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800"}`}>                             
                                                {dia.label}                           
                                            </button>                         
                                        ))}                       
                                    </div>                     
                                </section>                     
                                <hr className="border-zinc-100 dark:border-zinc-800" />                     
                                <section>                       
                                    <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white mb-6">                         
                                        <span className="w-6 h-6 rounded-md bg-zinc-900 dark:bg-white text-white dark:text-black flex items-center justify-center">3</span>                         
                                        Turno e Horários                       
                                    </h4>                                              
                                    <div className="grid md:grid-cols-3 gap-6 mb-8">                         
                                        <TextInput type="time" label="Hora que Inicia" value={formData.hora_inicio} onChange={(e) => setFormData({...formData, hora_inicio: e.target.value})} />                         
                                        <TextInput type="time" label="Hora que Encerra" value={formData.hora_fim} onChange={(e) => setFormData({...formData, hora_fim: e.target.value})} />                         
                                        <TextInput type="time" label="Último Agendamento Possível" value={formData.ultimo_horario_agendamento} onChange={(e) => setFormData({...formData, ultimo_horario_agendamento: e.target.value})} />                       
                                    </div>                                              
                                    <div className="grid md:grid-cols-2 gap-8 p-6 bg-zinc-50/50 dark:bg-zinc-900/50 rounded-3xl border border-zinc-100 dark:border-zinc-800">                         
                                        <CustomSelect label="Duração de cada Consulta (Slot)" value={formData.duracao_slot_minutos} onChange={(val) => setFormData({...formData, duracao_slot_minutos: val})} options={[ { value: 10, label: "10 Minutos" }, { value: 15, label: "15 Minutos" }, { value: 20, label: "20 Minutos" }, { value: 30, label: "30 Minutos" }, { value: 40, label: "40 Minutos" }, { value: 45, label: "45 Minutos" }, { value: 60, label: "1 Hora" }, { value: 90, label: "1h 30min" }, { value: 120, label: "2 Horas" } ]} />                         
                                        <div className="flex flex-col justify-center">                           
                                            <ToggleSwitch checked={formData.ocupacao_sequencial} onChange={(val) => setFormData({...formData, ocupacao_sequencial: val})} label="Obrigatório Sequencial" />                           
                                        </div>                       
                                    </div>                     
                                </section>                     
                                <div className="pt-6 flex justify-end">                        
                                    <ButtonPrimary onClick={handleSalvarVisual} disabled={isProcessing} icon={CheckCircle2} className="px-12 py-4 text-sm">                         
                                        {isProcessing ? "Salvando..." : editingId ? "Salvar alterações" : "Adicionar à agenda"}                       
                                    </ButtonPrimary>                     
                                </div>                   
                            </div>                 
                        </motion.div>           
                    )}           
                    {activeView === "lista" && (             
                        <motion.div key="lista" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={spring}>               
                            {regras.length === 0 ? (                 
                                <div className="flex flex-col items-center justify-center py-32 text-center">                   
                                    <div className="w-20 h-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] flex items-center justify-center text-zinc-300 mb-6 shadow-sm">                     
                                        <CalendarDays size={28} />                   
                                    </div>                   
                                    <h4 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Nenhuma Regra de Atendimento</h4>                   
                                    <ButtonPrimary onClick={() => { resetForm(); if (setSubTab) setSubTab("adicionar"); }} icon={Plus}>Nova Regra</ButtonPrimary>                 
                                </div>               
                            ) : viewMode === "cards" ? (                 
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">                   
                                    {regras.map((regra) => {                     
                                        const profissional = regra.servico_id ? (servicosOptions.find(s => s.value === regra.servico_id) || { label: "Profissional Desconhecido" }) : { label: "Regra Geral da Clínica" };                                          
                                        const diasNomes = regra.dias_semana.map(dId => DIAS_SEMANA.find(d => d.id === dId)?.short).filter(Boolean).join(", ");                     
                                        return (                       
                                            <motion.div key={regra.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-[#111] border border-zinc-200/80 dark:border-zinc-800 p-6 rounded-[2rem] flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow group">                         
                                                <div className="space-y-4">                           
                                                    <div className="flex items-start justify-between gap-4">                             
                                                        <div>                               
                                                            <h4 className="text-lg font-black text-zinc-900 dark:text-white leading-tight flex items-center gap-2">                                   
                                                                {!regra.servico_id && <Building size={16} className="text-blue-500" />}                                   
                                                                {profissional.label}                               
                                                            </h4>                               
                                                            <p className="text-xs font-bold text-zinc-400 mt-1 uppercase tracking-widest flex items-center gap-1.5">                                 
                                                                <CalendarDays size={14} /> {diasNomes}                               
                                                            </p>                             
                                                        </div>                                                          
                                                        <div className="flex gap-2">
                                                            <button onClick={() => editarRegra(regra)} className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center transition-colors" title="Editar"><Pencil size={16} /></button>
                                                            <button onClick={async () => { await actionDeletarRegra(regra.id); if(fetchRegras) await fetchRegras(); showToast("Horário removido."); }} className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-900 text-zinc-400 hover:text-red-500 flex items-center justify-center transition-colors" title="Remover"><Trash2 size={16} /></button>
                                                        </div>                           
                                                    </div>                           
                                                    <div className="flex flex-wrap gap-2">                             
                                                        <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-lg text-xs font-bold">                               
                                                            <Clock size={14} /> {regra.hora_inicio?.substring(0,5)} às {regra.hora_fim?.substring(0,5)}                             
                                                        </div>                             
                                                        <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 border border-blue-100 dark:border-blue-900/40 px-3 py-1.5 rounded-lg text-xs font-bold">                               
                                                            Slot: {regra.duracao_slot_minutos} min                             
                                                        </div>                             
                                                    </div>                           
                                                </div>                       
                                            </motion.div>                     
                                        );                   
                                    })}                 
                                </div>               
                            ) : (
                                /* VISÃO EM TABELA / LISTA COMPACTA */
                                <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-x-auto shadow-sm">
                                  <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                      <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 font-bold uppercase tracking-wider text-zinc-400">
                                        <th className="p-4">Profissional</th>
                                        <th className="p-4">Dias</th>
                                        <th className="p-4">Horário</th>
                                        <th className="p-4">Duração Slot</th>
                                        <th className="p-4 text-right">Ações</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
                                      {regras.map((regra) => {
                                        const profissional = regra.servico_id ? (servicosOptions.find(s => s.value === regra.servico_id) || { label: "Desconhecido" }) : { label: "Geral da Clínica" };
                                        const diasNomes = regra.dias_semana.map(dId => DIAS_SEMANA.find(d => d.id === dId)?.short).filter(Boolean).join(", ");
                                        return (
                                          <tr key={regra.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                                            <td className="p-4 font-bold text-zinc-900 dark:text-white">{profissional.label}</td>
                                            <td className="p-4 font-semibold text-zinc-700 dark:text-zinc-300">{diasNomes}</td>
                                            <td className="p-4 text-zinc-600 dark:text-zinc-400">{regra.hora_inicio?.substring(0,5)} - {regra.hora_fim?.substring(0,5)}</td>
                                            <td className="p-4 font-bold text-blue-600">{regra.duracao_slot_minutos} min</td>
                                            <td className="p-4 text-right space-x-2">
                                              <button onClick={() => editarRegra(regra)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil size={16}/></button>
                                              <button onClick={async () => { await actionDeletarRegra(regra.id); if(fetchRegras) await fetchRegras(); showToast("Removido."); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                                            </td>
                                          </tr>
                                        );
                                      })} className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium"
                                    </tbody>
                                  </table>
                                </div>
                            )}             
                        </motion.div>           
                    )}         
                </AnimatePresence>       
            </div>     
        </motion.div>   
    ); 
}
