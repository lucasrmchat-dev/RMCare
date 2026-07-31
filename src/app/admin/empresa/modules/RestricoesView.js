"use client"; 
import { useState, useMemo } from "react"; 
import { motion, AnimatePresence, LayoutGroup } from "framer-motion"; 
import { CalendarDays, CheckCircle2, Plus, Settings2, Code2, Play, FileJson, Copy, Info, Zap, Clock, Trash2, Building, User } from "lucide-react"; 
import { fadeUp, spring, CustomSelect, ButtonPrimary, ToggleSwitch, TextInput } from "../components/SharedUI"; 
import { actionCriarRegraAgenda, actionCriarRegraMassa, actionDeletarRegra } from "@/actions/adminData"; 

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

export default function RestricoesView({ regras = [], servicosOptions = [], servicos = [], fetchRegras, showToast }) {   
    const [activeView, setActiveView] = useState("lista");   
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

    const tiposDinamicos = useMemo(() => {
        const items = new Set();
        
        items.add("Consulta Particular");
        items.add("Consulta Convênio");
    
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
            await actionCriarRegraAgenda(payload);       
            showToast("Regra criada e ativada com sucesso!");              
            if(fetchRegras) await fetchRegras();       
            setActiveView("lista");              
            setFormData(prev => ({ ...prev, dias_semana: [], tipos_permitidos: [] }));     
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
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">         
                <div>           
                    <h2 className="text-3xl font-black text-zinc-900 tracking-tight flex items-center gap-3">             
                        Motor de Atendimento <Zap size={24} className="text-amber-400 fill-amber-400" />           
                    </h2>           
                    <p className="text-sm text-zinc-500 mt-2 font-medium max-w-xl">             
                        Configure dias e horários de funcionamento. Crie as regras gerais da clínica ou restrições exclusivas para cada médico/colaborador.           
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
                            <Plus size={14} /> Nova Regra             
                        </button>           
                    </div>         
                </LayoutGroup>       
            </div>       
            <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">         
                <AnimatePresence mode="wait">                      
                    {activeView === "builder" && (             
                        <motion.div key="builder" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={spring} className="space-y-6">                              
                            <AnimatePresence mode="wait">                 
                                {builderMode === "visual" && (                   
                                    <motion.div key="visual" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white border border-zinc-200/80 rounded-[2.5rem] shadow-sm p-8 md:p-10 space-y-12">                                          
                                        <section>                       
                                            <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-900 mb-6">                         
                                                <span className="w-6 h-6 rounded-md bg-zinc-900 text-white flex items-center justify-center">1</span>                         
                                                Para quem é esta regra?                       
                                            </h4>                                              
                                            <div className="grid md:grid-cols-2 gap-4 mb-6">                         
                                                <button onClick={() => setTipoRegra("geral")} className={`p-6 rounded-2xl border-2 transition-all flex flex-col gap-3 text-left ${tipoRegra === "geral" ? "border-zinc-900 bg-zinc-50 shadow-md" : "border-zinc-200 hover:border-zinc-300 bg-white"}`}>                           
                                                    <Building size={24} className={tipoRegra === "geral" ? "text-zinc-900" : "text-zinc-400"} />                           
                                                    <div>                             
                                                        <span className="block font-bold text-zinc-900 text-lg">Geral da Clínica</span>                             
                                                        <span className="block text-sm text-zinc-500 mt-1">Aplica-se a todos os agendamentos. Útil para definir os dias que a clínica abre e fecha.</span>                           
                                                    </div>                         
                                                </button>                                                  
                                                <button onClick={() => setTipoRegra("especifica")} className={`p-6 rounded-2xl border-2 transition-all flex flex-col gap-3 text-left ${tipoRegra === "especifica" ? "border-zinc-900 bg-zinc-50 shadow-md" : "border-zinc-200 hover:border-zinc-300 bg-white"}`}>                           
                                                    <User size={24} className={tipoRegra === "especifica" ? "text-zinc-900" : "text-zinc-400"} />                           
                                                    <div>                             
                                                        <span className="block font-bold text-zinc-900 text-lg">Colaborador / Profissional</span>                             
                                                        <span className="block text-sm text-zinc-500 mt-1">Exclusivo para um médico. Ex: "Dra. Maria só atende às terças de manhã".</span>                           
                                                    </div>                         
                                                </button>                       
                                            </div>                       
                                            {tipoRegra === "especifica" && (                         
                                                <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} className="pt-4 relative z-50">                            
                                                    {servicosOptions.length === 0 ? (                                
                                                        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-sm font-medium">                                   
                                                            Nenhum colaborador encontrado. Você precisa cadastrar um profissional na aba <strong>Equipe Clínica</strong> primeiro.                                
                                                        </div>                            
                                                    ) : (                                
                                                        <CustomSelect label="Qual o profissional afetado?" value={formData.servico_id} onChange={(val) => setFormData({...formData, servico_id: val})} options={servicosOptions} />                            
                                                    )}                         
                                                </motion.div>                       
                                            )}                     
                                        </section>                     
                                        <hr className="border-zinc-100" />                     
                                        <section>                       
                                            <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-900 mb-6">                         
                                                <span className="w-6 h-6 rounded-md bg-zinc-900 text-white flex items-center justify-center">2</span>                         
                                                Dias de Atendimento                       
                                            </h4>                       
                                            <div className="bg-amber-50 border border-amber-200/60 p-4 rounded-xl mb-6 flex items-start gap-3">                         
                                                <Info size={18} className="text-amber-500 mt-0.5" />                         
                                                <p className="text-sm font-medium text-amber-800">                           
                                                    <strong>Atenção:</strong> Selecione APENAS os dias que haverá trabalho. <br/>Os dias que você <strong>não marcar</strong> ficarão automaticamente bloqueados/fechados no calendário de agendamento!                         
                                                </p>                       
                                            </div>                                              
                                            <div className="flex flex-wrap gap-3">                         
                                                {DIAS_SEMANA.map(dia => (                           
                                                    <button key={dia.id} onClick={() => toggleDia(dia.id)} className={`px-6 py-4 rounded-2xl text-sm font-bold transition-all border flex items-center justify-center ${formData.dias_semana.includes(dia.id) ? "bg-zinc-900 text-white border-zinc-900 shadow-[0_8px_16px_rgba(0,0,0,0.1)] scale-105" : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"}`}>                             
                                                        {dia.label}                           
                                                    </button>                         
                                                ))}                       
                                            </div>                     
                                        </section>                     
                                        <hr className="border-zinc-100" />                     
                                        <section>                       
                                            <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-900 mb-6">                         
                                                <span className="w-6 h-6 rounded-md bg-zinc-900 text-white flex items-center justify-center">3</span>                         
                                                Turno e Horários                       
                                            </h4>                                              
                                            <div className="grid md:grid-cols-3 gap-6 mb-8">                         
                                                <TextInput type="time" label="Hora que Inicia" value={formData.hora_inicio} onChange={(e) => setFormData({...formData, hora_inicio: e.target.value})} />                         
                                                <TextInput type="time" label="Hora que Encerra" value={formData.hora_fim} onChange={(e) => setFormData({...formData, hora_fim: e.target.value})} />                         
                                                <TextInput type="time" label="Último Agendamento Possível" value={formData.ultimo_horario_agendamento} onChange={(e) => setFormData({...formData, ultimo_horario_agendamento: e.target.value})} />                       
                                            </div>                                              
                                            <div className="grid md:grid-cols-2 gap-8 p-6 bg-zinc-50/50 rounded-3xl border border-zinc-100">                         
                                                <div className="relative z-40">                           
                                                    <CustomSelect label="Duração de cada Consulta (Slot)" value={formData.duracao_slot_minutos} onChange={(val) => setFormData({...formData, duracao_slot_minutos: val})} options={[ { value: 10, label: "10 Minutos" }, { value: 15, label: "15 Minutos" }, { value: 20, label: "20 Minutos" }, { value: 30, label: "30 Minutos" }, { value: 40, label: "40 Minutos" }, { value: 45, label: "45 Minutos" }, { value: 60, label: "1 Hora" }, { value: 90, label: "1h 30min" }, { value: 120, label: "2 Horas" } ]} />                         
                                                </div>                         
                                                <div className="flex flex-col justify-center">                           
                                                    <ToggleSwitch checked={formData.ocupacao_sequencial} onChange={(val) => setFormData({...formData, ocupacao_sequencial: val})} label="Obrigatório Sequencial" />                           
                                                    <p className="text-xs text-zinc-500 mt-2 ml-14 font-medium">Oculta os demais horários até que o primeiro livre seja preenchido (não deixa a agenda com buracos).</p>                         
                                                </div>                       
                                            </div>                     
                                        </section>                     
                                        <hr className="border-zinc-100" />                     
                                        <section>                       
                                            <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-900 mb-6">                         
                                                <span className="w-6 h-6 rounded-md bg-zinc-100 text-zinc-500 flex items-center justify-center">4</span>                         
                                                Restrição Opcional de Procedimento                       
                                            </h4>                       
                                            <p className="text-sm text-zinc-500 mb-4">Se você quiser que essa regra seja válida APENAS para procedimentos específicos, marque-os abaixo. Deixe tudo desmarcado se for válido para qualquer coisa.</p>                                              
                                            <div className="flex flex-wrap gap-3">                         
                                                {tiposDinamicos.map(tipo => (                           
                                                    <button key={tipo} onClick={() => toggleTipo(tipo)} className={`px-5 py-3 rounded-2xl text-sm font-bold transition-all border ${formData.tipos_permitidos.includes(tipo) ? "bg-zinc-900 text-white border-zinc-900 shadow-md" : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"}`}>                             
                                                        {tipo}                           
                                                    </button>                         
                                                ))}                       
                                            </div>                     
                                        </section>                     
                                        <div className="pt-6 flex flex-col md:flex-row justify-between items-center gap-4">                        
                                            <button onClick={() => setBuilderMode("massa")} className="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-700 transition-colors flex items-center gap-2">                          
                                                <Code2 size={14}/> Inserir Múltiplas Regras (Avançado)                        
                                            </button>                       
                                            <ButtonPrimary onClick={handleSalvarVisual} disabled={isProcessing} icon={CheckCircle2} className="w-full md:w-auto px-12 py-5 text-sm">                         
                                                {isProcessing ? "Processando..." : "Salvar Esta Regra"}                       
                                            </ButtonPrimary>                     
                                        </div>                   
                                    </motion.div>                 
                                )}                 
                                {builderMode === "massa" && (                   
                                    <motion.div key="massa" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="grid lg:grid-cols-3 gap-6">                     
                                        <div className="lg:col-span-1 space-y-4">                       
                                            <div className="bg-blue-50/50 border border-blue-200 rounded-[2rem] p-6 md:p-8">                         
                                                <button onClick={() => setBuilderMode("visual")} className="mb-6 text-blue-600 text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:text-blue-800">                           
                                                    &larr; Voltar para Painel Visual                         
                                                </button>                         
                                                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">                           
                                                    <FileJson size={24} />                         
                                                </div>                         
                                                <h3 className="text-xl font-black text-zinc-900 mb-3">Modo Programador</h3>                         
                                                <p className="text-sm text-zinc-600 font-medium leading-relaxed mb-6">                           
                                                    Cole múltiplas regras de uma vez enviando um Array JSON. Use "null" no servico_id para Regras Gerais.                         
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
                                            </div>                     
                                        </div>                                          
                                        <div className="lg:col-span-2 bg-zinc-950 rounded-[2.5rem] p-6 shadow-2xl flex flex-col h-[600px] border border-zinc-800">                       
                                            <div className="flex items-center justify-between mb-4 px-2">                         
                                                <div className="flex items-center gap-2">                           
                                                    <div className="w-3 h-3 rounded-full bg-red-500/80" />                           
                                                    <div className="w-3 h-3 rounded-full bg-amber-500/80" />                           
                                                    <div className="w-3 h-3 rounded-full bg-green-500/80" />                           
                                                    <span className="text-zinc-500 text-xs font-mono font-bold uppercase tracking-widest ml-4">Terminal_Lote.json</span>                         
                                                </div>                       
                                            </div>                                              
                                            <textarea value={jsonInput} onChange={(e) => setJsonInput(e.target.value)} placeholder="Cole o array [ { ... } ] com as regras aqui..." className="flex-1 w-full bg-transparent text-blue-300 font-mono text-sm leading-relaxed outline-none resize-none custom-scrollbar p-2 placeholder:text-zinc-700" spellCheck="false" />                       
                                            <div className="mt-4 pt-4 border-t border-zinc-800/80 flex justify-end">                         
                                                <button onClick={handleSalvarMassa} disabled={isProcessing} className="px-8 py-4 bg-white hover:bg-zinc-200 text-zinc-900 rounded-2xl font-black text-xs uppercase tracking-widest transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed">                           
                                                    {isProcessing ? "Validando..." : <><Play size={16} className="fill-zinc-900" /> Inserir JSON</>}                         
                                                </button>                       
                                            </div>                     
                                        </div>                   
                                    </motion.div>                 
                                )}               
                            </AnimatePresence>             
                        </motion.div>           
                    )}           
                    {activeView === "lista" && (             
                        <motion.div key="lista" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={spring}>               
                            {regras.length === 0 ? (                 
                                <div className="flex flex-col items-center justify-center py-32 text-center">                   
                                    <div className="w-20 h-20 bg-white border border-zinc-200 rounded-[2rem] flex items-center justify-center text-zinc-300 mb-6 shadow-sm">                     
                                        <CalendarDays size={28} />                   
                                    </div>                   
                                    <h4 className="text-lg font-bold text-zinc-900 mb-2">Nenhuma Regra de Atendimento</h4>                   
                                    <p className="text-sm text-zinc-500 max-w-sm mb-6 font-medium">Sua agenda está operando no modo padrão. Para limitar dias de funcionamento, crie a primeira regra.</p>                   
                                    <ButtonPrimary onClick={() => setActiveView("builder")} icon={Plus}>Nova Regra</ButtonPrimary>                 
                                </div>               
                            ) : (                 
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">                   
                                    {regras.map((regra) => {                     
                                        const profissional = regra.servico_id ? (servicosOptions.find(s => s.value === regra.servico_id) || { label: "Profissional Desconhecido" }) : { label: "Regra Geral da Clínica" };                                          
                                        const diasNomes = regra.dias_semana.map(dId => DIAS_SEMANA.find(d => d.id === dId)?.short).filter(Boolean).join(", ");                     
                                        return (                       
                                            <motion.div key={regra.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white border border-zinc-200/80 p-6 rounded-[2rem] flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow group">                         
                                                <div className="space-y-4">                           
                                                    <div className="flex items-start justify-between gap-4">                             
                                                        <div>                               
                                                            <h4 className="text-lg font-black text-zinc-900 leading-tight flex items-center gap-2">                                   
                                                                {!regra.servico_id && <Building size={16} className="text-blue-500" />}                                   
                                                                {profissional.label}                               
                                                            </h4>                               
                                                            <p className="text-xs font-bold text-zinc-400 mt-1 uppercase tracking-widest flex items-center gap-1.5">                                 
                                                                <CalendarDays size={14} /> {diasNomes}                               
                                                            </p>                             
                                                        </div>                                                          
                                                        <button onClick={async () => { await actionDeletarRegra(regra.id); if(fetchRegras) await fetchRegras(); showToast("Regra removida com sucesso!"); }} className="w-10 h-10 rounded-xl bg-zinc-50 text-zinc-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors flex-shrink-0" title="Remover Regra">                               
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
                                                        {regra.tipos_permitidos?.length > 0 ? (                                 
                                                            regra.tipos_permitidos.map(tipo => (                                     
                                                                <span key={tipo} className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 border border-zinc-200 px-2 py-1 rounded-md">                                     
                                                                    {tipo}                                     
                                                                </span>                                 
                                                            ))                             
                                                        ) : (                                 
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-green-600 bg-green-50 border border-green-100 px-2 py-1 rounded-md">                                   
                                                                Tudo Permitido                                 
                                                            </span>                             
                                                        )}                           
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