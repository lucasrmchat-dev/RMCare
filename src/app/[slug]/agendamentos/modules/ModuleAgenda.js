"use client"; 
import { useEffect, useRef } from "react"; 
import { motion } from "framer-motion"; 
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Activity, Clock3, Check } from "lucide-react"; 
import { useAgendamento } from "../context"; 
import { helpers, calcularDataLimite } from "../utils"; 

export default function ModuleAgenda() {     
    const { formData, setValue, calendarMonth, setCalendarMonth, selectedSrv, bloqueioExtraCalculado, agenda, timeSlotsRef, regrasGlobais } = useAgendamento();     
    
    const getDiaSemana = (dataStr) => {       
        if (!dataStr) return null;       
        const [y, m, d] = dataStr.split('-');       
        return new Date(y, m - 1, d).getDay();     
    };     
    
    const diaSelecionado = getDiaSemana(formData.data_agendamento);     
    
    // 1. Hierarquia de Regras: Médico Override Clínica     
    const rMedico = regrasGlobais?.filter(r => r.servico_id === selectedSrv?.id && r.ativo !== false) || [];     
    const rGeral = regrasGlobais?.filter(r => !r.servico_id && r.ativo !== false) || [];     
    const regrasAplicaveis = rMedico.length > 0 ? rMedico : rGeral;          
    
    // 2. Filtro robusto de validação: cruza a regra com a especialidade e modalidade
    const isRuleValidForCurrentSelection = (r) => {
        if (!r.tipos_permitidos || r.tipos_permitidos.length === 0) return true;

        const especialidadeStr = (formData.especialidade || "").toLowerCase().trim();
        const modalidadeStr = (formData.modalidade || "").toLowerCase().trim();
        const tipoServicoStr = (formData.tipo_servico || "").toLowerCase().trim(); // "profissional" ou "exame"

        return r.tipos_permitidos.some(tpRaw => {
            const tp = tpRaw.toLowerCase().trim();
            if (tp === tipoServicoStr) return true;
            
            // 2.1 Igualdade exata ou cruza com a especialidade (ex: "Exame (Colonoscopia)" inclui "Colonoscopia")
            if (tp === especialidadeStr) return true;
            if (especialidadeStr !== "") {
                if (tp.includes(especialidadeStr)) return true;
                if (especialidadeStr.includes(tp)) return true;
            }

            // 2.2 Regras de Modalidade Genérica (ex: "Consulta Convênio")
            // Só libera se o serviço não for um Exame (pois exames têm suas próprias regras)
            if (tipoServicoStr !== "exame") {
                const currentConsultaStr = `consulta ${modalidadeStr}`.trim();
                if (tp === currentConsultaStr) return true;
                if (tipoServicoStr === "consulta" && modalidadeStr === "particular" && tp === "consulta particular inicial") return true;
                if (tp === "consulta") return true;
            }

            return false;
        });
    };

    // Filtramos apenas as regras que de fato servem para o que o paciente está agendando
    const regrasAplicaveisEValidas = regrasAplicaveis.filter(isRuleValidForCurrentSelection);
    const aplicarBloqueioTemporario = (limite) => {
        if (!selectedSrv?.agendamento_bloqueado_ate) return limite;
        const bloqueadoAte = new Date(`${selectedSrv.agendamento_bloqueado_ate}T12:00:00`);
        bloqueadoAte.setDate(bloqueadoAte.getDate() + 1);
        return bloqueadoAte > limite ? bloqueadoAte : limite;
    };
    
    // 3. Regras estritas aplicáveis para o dia clicado     
    const regrasDoDia = regrasAplicaveisEValidas.filter(r => r.dias_semana.includes(diaSelecionado));     
    
    const isDiaPermitidoPelasRegras = (dataStr) => {       
        const diaWeek = getDiaSemana(dataStr);              
        
        // Se há regras válidas para essa especialidade, libera apenas os dias dessas regras
        if (regrasAplicaveisEValidas.length > 0) {         
            return regrasAplicaveisEValidas.some(r => r.dias_semana.includes(diaWeek));       
        }              
        
        // Se o médico TEM regras, mas NENHUMA é para essa especialidade, bloqueia tudo
        if (regrasAplicaveis.length > 0) {
            return false;
        }

        // Fallback: Se a clínica estiver zerada sem nenhuma regra cadastrada
        return [1, 2, 3, 4, 5].includes(diaWeek);      
    };     
    
    // AUTO AVANÇO INTELIGENTE 
    const lastEvaluatedSrvId = useRef('uninitialized');     
    
    useEffect(() => {         
        if (!regrasGlobais) return;                  
        if (formData.medico_profissional && !selectedSrv) return;         
        
        const currentSrvId = selectedSrv?.id || null;         
        if (lastEvaluatedSrvId.current === currentSrvId) return;         
        
        const hoje = new Date();         
        const minDiasBloqueio = formData.tipo_servico === "Exame" ? 1 : 0;         
        const diasBloqueioPadrao = Math.max(selectedSrv?.dias_bloqueio_padrao || 0, minDiasBloqueio);         
        const dataSrv = calcularDataLimite(hoje, diasBloqueioPadrao, selectedSrv?.tipo_contagem_dias || "corridos");         
        const limiteBase = (!bloqueioExtraCalculado || dataSrv > bloqueioExtraCalculado) ? dataSrv : bloqueioExtraCalculado;
        const limiteFinalData = aplicarBloqueioTemporario(limiteBase);                  
        
        const limiteMidnight = new Date(limiteFinalData.getFullYear(), limiteFinalData.getMonth(), limiteFinalData.getDate());         
        let hasAvailableDayInCurrentMonth = false;         
        const daysInCurrentMonth = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();         
        
        for (let d = hoje.getDate(); d <= daysInCurrentMonth; d++) {             
            const dateStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;             
            const cellDate = new Date(hoje.getFullYear(), hoje.getMonth(), d);                          
            const isPastOrBlocked = cellDate < limiteMidnight || !isDiaPermitidoPelasRegras(dateStr);             
            if (!isPastOrBlocked) {                 
                hasAvailableDayInCurrentMonth = true;                 
                break;             
            }         
        }         
        
        if (!hasAvailableDayInCurrentMonth) {             
            setCalendarMonth(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1));         
        } else {             
            setCalendarMonth(new Date(hoje.getFullYear(), hoje.getMonth(), 1));         
        }         
        lastEvaluatedSrvId.current = currentSrvId;     
    }, [selectedSrv, formData.medico_profissional, regrasGlobais, bloqueioExtraCalculado, formData.tipo_servico]);     
    
    const gerarSlotsParaTurno = (startStr, endStr, duracaoMinutos, customLastAllowed) => {       
        let slots = [];       
        if (!startStr || !endStr) return slots;       
        const [sh, sm] = startStr.split(':').map(Number);       
        const [eh, em] = endStr.split(':').map(Number);              
        
        if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return slots;       
        const duracaoSegura = Math.max(parseInt(duracaoMinutos, 10) || 30, 10);              
        let current = new Date(2000, 0, 1, sh, sm);       
        const end = new Date(2000, 0, 1, eh, em);              
        
        let limit = new Date(end.getTime() - (duracaoSegura * 60000));              
        if (customLastAllowed) {         
            const [lh, lm] = customLastAllowed.split(':').map(Number);         
            if (!isNaN(lh) && !isNaN(lm)) {            
                const customLimitDate = new Date(2000, 0, 1, lh, lm);            
                if (customLimitDate < limit) limit = customLimitDate;         
            }       
        }       
        
        let safeLoop = 0;        
        while (current <= limit && safeLoop < 100) {         
            slots.push(current.toTimeString().substring(0, 5));         
            current = new Date(current.getTime() + (duracaoSegura * 60000));         
            safeLoop++;       
        }       
        return slots;     
    };     
    
    let slotsRender = [];     
    let ocupacaoSeqAtiva = false;     
    
    if (formData.data_agendamento) {       
        let slotsGerados = [];              
        
        if (regrasDoDia.length > 0) {         
            regrasDoDia.forEach(r => {           
                const gerados = gerarSlotsParaTurno(r.hora_inicio, r.hora_fim, r.duracao_slot_minutos, r.ultimo_horario_agendamento);           
                slotsGerados.push(...gerados);           
                if (r.ocupacao_sequencial) ocupacaoSeqAtiva = true;         
            });       
        } else if (regrasAplicaveis.length === 0) {         
            let duracaoFallback = 40;         
            if (formData.tipo_servico === "Retorno" || formData.modalidade === "Convênio") duracaoFallback = 20;                  
            slotsGerados.push(...gerarSlotsParaTurno("08:00", "12:00", duracaoFallback));         
            slotsGerados.push(...gerarSlotsParaTurno("14:00", "18:00", duracaoFallback));       
        }       
        
        slotsGerados.sort();       
        slotsGerados = [...new Set(slotsGerados)];       
        let encontrouPrimeiroLivre = false;              
        
        slotsRender = slotsGerados.map(h => {         
            const isPastTime = formData.data_agendamento === helpers.getToday() && new Date().setHours(...h.split(':'), 0, 0) <= (agenda.agora || 0) + 1800000;         
            const isOccupied = agenda.ocupados.includes(h) || isPastTime;                  
            
            let off = isOccupied;                  
            
            if (ocupacaoSeqAtiva) {           
                if (!isOccupied) {             
                    if (encontrouPrimeiroLivre) {               
                        off = true;             
                    } else {               
                        encontrouPrimeiroLivre = true;             
                    }           
                }         
            }         
            return { h, off };       
        });     
    }     
    
    return (         
        <motion.div initial="hidden" animate="show" exit="exit" variants={{hidden:{opacity:0},show:{opacity:1,transition:{staggerChildren:.08}},exit:{opacity:0,y:-8}}} className="max-w-4xl mx-auto">             
            <motion.div variants={{hidden:{opacity:0,y:14},show:{opacity:1,y:0}}} className="mb-6 md:mb-8"><div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-3"><CalendarIcon size={13}/> Escolha sua vaga</div><h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Qual o melhor momento?</h2><p className="text-zinc-500 text-sm md:text-base mt-2">Selecione o dia e, em seguida, um horário disponível.</p>{selectedSrv?.agendamento_bloqueado_ate && <p className="mt-3 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">Agenda disponível após {new Date(`${selectedSrv.agendamento_bloqueado_ate}T12:00:00`).toLocaleDateString("pt-BR")}{selectedSrv.motivo_bloqueio_agenda ? ` · ${selectedSrv.motivo_bloqueio_agenda}` : ""}</p>}</motion.div>             
            <motion.div variants={{hidden:{opacity:0,y:18},show:{opacity:1,y:0}}} className="flex flex-col md:flex-row gap-5 md:gap-8">                                  
                <div className="w-full md:w-1/2 rounded-[1.75rem] border border-zinc-200/80 dark:border-zinc-800 p-4 md:p-5 bg-white dark:bg-[#0d0d0d] shadow-sm">                     
                    <div className="flex justify-between items-center mb-6"><button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} className="p-1.5"><ChevronLeft size={16}/></button><h3 className="font-medium text-sm capitalize">{calendarMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</h3><button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} className="p-1.5"><ChevronRight size={16}/></button></div>                     
                    <div className="grid grid-cols-7 gap-1 text-center mb-2">{['D','S','T','Q','Q','S','S'].map((d,i)=><div key={i} className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{d}</div>)}</div>                     
                    <div className="grid grid-cols-7 gap-1 md:gap-1.5">                         
                        {Array.from({ length: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay() }).map((_, i) => <div key={`e-${i}`} className="aspect-square"/>)}                         
                        {Array.from({ length: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate() }).map((_, i) => {                             
                            const d = i + 1, y = calendarMonth.getFullYear(), m = calendarMonth.getMonth();                             
                            const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;                                                          
                            
                            const minDiasBloqueio = formData.tipo_servico === "Exame" ? 1 : 0;                             
                            const diasBloqueioPadrao = Math.max(selectedSrv?.dias_bloqueio_padrao || 0, minDiasBloqueio);                             
                            const dataSrv = calcularDataLimite(new Date(), diasBloqueioPadrao, selectedSrv?.tipo_contagem_dias || "corridos");                             
                            const limiteBase = (!bloqueioExtraCalculado || dataSrv > bloqueioExtraCalculado) ? dataSrv : bloqueioExtraCalculado;
                            const limiteFinalData = aplicarBloqueioTemporario(limiteBase);                                                          
                            
                            const limiteMidnight = new Date(limiteFinalData.getFullYear(), limiteFinalData.getMonth(), limiteFinalData.getDate());                             
                            const cellDate = new Date(y, m, d);                                                          
                            
                            const isPastOrBlocked = cellDate < limiteMidnight || !isDiaPermitidoPelasRegras(dateStr);                             
                            const isSel = formData.data_agendamento === dateStr;                                                          
                            
                            return (                                 
                                <motion.button
                                    whileTap={{scale:.88}}
                                    key={d}                                      
                                    disabled={isPastOrBlocked}                                      
                                    onClick={() => {                                          
                                        if (formData.data_agendamento !== dateStr) setValue("horario_agendamento", "");
                                        setValue("data_agendamento", dateStr);                                          
                                        setTimeout(() => { timeSlotsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 150);                                      
                                    }}                                      
                                    className={`relative aspect-square rounded-xl md:rounded-2xl text-sm transition-colors duration-200 ${isPastOrBlocked ? "opacity-25 cursor-not-allowed text-zinc-400 dark:text-zinc-600" : isSel ? "bg-zinc-900 text-white dark:bg-white dark:text-black font-bold shadow-lg" : "hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium"}`}                                 
                                >                                     
                                    {d}                                 
                                    {isSel && <motion.span initial={{scale:0}} animate={{scale:1}} className="absolute -right-1 -top-1 w-4 h-4 rounded-full bg-[#9FC131] text-black flex items-center justify-center"><Check size={10}/></motion.span>}
                                </motion.button>                             
                            );                         
                        })}                     
                    </div>                 
                </div>                                  
                
                <div className="w-full md:w-1/2 rounded-[1.75rem] border border-zinc-200/80 dark:border-zinc-800 p-4 md:p-5 bg-white dark:bg-[#0d0d0d] shadow-sm" ref={timeSlotsRef}>                     
                    {formData.data_agendamento ? (                         
                        <div>                             
                            <div className="flex justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-4 pt-4 md:pt-0">                                 
                                <h4 className="font-medium text-sm flex items-center gap-2">                                   
                                    <Clock3 size={16} className="text-blue-500"/> Horários disponíveis                                    
                                    {ocupacaoSeqAtiva && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] uppercase tracking-widest font-bold">Sequencial</span>}                                 
                                </h4>                                 
                                {agenda.buscando && <Activity size={16} className="text-zinc-400 animate-spin"/>}                             
                            </div>                                                          
                            
                            {slotsRender.length === 0 ? (                               
                                <div className="text-center p-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800">                                 
                                    <p className="text-sm text-zinc-500">Nenhum atendimento configurado ou disponível nesta data.</p>                               
                                </div>                             
                            ) : (                               
                                <motion.div initial="hidden" animate="show" variants={{show:{transition:{staggerChildren:.035}}}} className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 gap-2 overflow-y-auto max-h-[300px] pr-1 custom-scrollbar">                                 
                                    {slotsRender.map(slot => (                                   
                                        <motion.button
                                            variants={{hidden:{opacity:0,y:8},show:{opacity:1,y:0}}}
                                            whileTap={!slot.off ? {scale:.92} : {}}
                                            key={slot.h}                                       
                                            disabled={slot.off}                                       
                                            onClick={() => setValue("horario_agendamento", slot.h)}                                       
                                            className={`py-3.5 rounded-2xl text-sm border transition-all ${slot.off ? "border-transparent text-zinc-300 dark:text-zinc-800 line-through cursor-not-allowed" : formData.horario_agendamento === slot.h ? "bg-zinc-900 border-zinc-900 text-white dark:bg-white dark:border-white dark:text-black font-bold shadow-md scale-[1.02]" : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 font-medium text-zinc-800 dark:text-zinc-200"}`}                                   
                                        >                                     
                                            {slot.h}                                   
                                        </motion.button>                                 
                                    ))}                               
                                </motion.div>                             
                            )}                         
                        </div>                     
                    ) : (
                        <div className="h-full border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl flex flex-col items-center justify-center text-zinc-500 min-h-[250px]">
                            <CalendarIcon size={32} className="mb-4 opacity-40"/>
                            <p className="text-sm">Selecione uma data</p>
                        </div>
                    )}                 
                </div>             
            </motion.div>         
        </motion.div>     
    ); 
}
