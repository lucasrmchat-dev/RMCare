"use client"; 

import { useEffect, useRef } from "react"; 
import { motion } from "framer-motion"; 
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Activity, Clock3, Check } from "lucide-react"; 
import { useAgendamento } from "../context"; 
import { helpers, calcularDataLimite } from "../utils"; 
import { playDopamineSound, triggerHaptic } from "@/lib/dopamine";
import { SkeletonSlots } from "@/components/SkeletonLoaders";

export default function ModuleAgenda() {     
    const { formData, setValue, calendarMonth, setCalendarMonth, selectedSrv, bloqueioExtraCalculado, agenda, timeSlotsRef, regrasGlobais } = useAgendamento();     
    
    const getDiaSemana = (dataStr) => {       
        if (!dataStr) return null;       
        const [y, m, d] = dataStr.split('-').map(Number);       
        return new Date(y, m - 1, d).getDay();     
    };     
    
    const diaSelecionado = getDiaSemana(formData.data_agendamento);     
    
    const rMedico = (regrasGlobais || []).filter(r => r.servico_id && r.servico_id === selectedSrv?.id && r.ativo !== false);     
    const rGeral = (regrasGlobais || []).filter(r => !r.servico_id && r.ativo !== false);     
    const regrasAplicaveis = rMedico.length > 0 ? rMedico : rGeral;          
    
    const isRuleValidForCurrentSelection = (r) => {
        if (!r.tipos_permitidos || !Array.isArray(r.tipos_permitidos) || r.tipos_permitidos.length === 0) {
            return true;
        }

        const especialidadeStr = (formData.especialidade || "").toLowerCase().trim();
        const modalidadeStr = (formData.modalidade || "").toLowerCase().trim();
        const tipoServicoStr = (formData.tipo_servico || "").toLowerCase().trim();

        return r.tipos_permitidos.some(tpRaw => {
            const tp = String(tpRaw).toLowerCase().trim();
            if (!tp || tp === "todos" || tp === "todas") return true;
            if (tp === tipoServicoStr) return true;
            
            if (especialidadeStr !== "") {
                if (tp === especialidadeStr || tp.includes(especialidadeStr) || especialidadeStr.includes(tp)) return true;
            }

            if (modalidadeStr !== "") {
                if (tp.includes(modalidadeStr)) return true;
            }

            if (tipoServicoStr === "consulta" && tp.includes("consulta")) return true;
            if (tipoServicoStr === "exame" && tp.includes("exame")) return true;
            if (tipoServicoStr === "retorno" && tp.includes("retorno")) return true;

            return false;
        });
    };

    const regrasAplicaveisEValidas = regrasAplicaveis.filter(isRuleValidForCurrentSelection);
    
    const aplicarBloqueioTemporario = (limite) => {
        if (!selectedSrv?.agendamento_bloqueado_ate) return limite;
        const bloqueadoAte = new Date(`${selectedSrv.agendamento_bloqueado_ate}T12:00:00`);
        bloqueadoAte.setDate(bloqueadoAte.getDate() + 1);
        return bloqueadoAte > limite ? bloqueadoAte : limite;
    };
    
    const regrasDoDia = regrasAplicaveisEValidas.filter(r => {
        const diasArray = (r.dias_semana || []).map(d => parseInt(d, 10));
        return diasArray.includes(diaSelecionado);
    });     
    
    const isDiaPermitidoPelasRegras = (dataStr) => {       
        const diaWeek = getDiaSemana(dataStr);              
        
        if (regrasAplicaveisEValidas.length > 0) {         
            return regrasAplicaveisEValidas.some(r => {
                const diasArray = (r.dias_semana || []).map(d => parseInt(d, 10));
                return diasArray.includes(diaWeek);
            });       
        }              
        
        if (rMedico.length > 0) {
            return false;
        }

        if (rGeral.length > 0) {
            return rGeral.some(r => {
                const diasArray = (r.dias_semana || []).map(d => parseInt(d, 10));
                return diasArray.includes(diaWeek);
            });
        }

        return [1, 2, 3, 4, 5].includes(diaWeek);      
    };     
    
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
        <motion.div initial="hidden" animate="show" exit="exit" variants={{hidden:{opacity:0},show:{opacity:1,transition:{staggerChildren:.08}},exit:{opacity:0,y:-8}}} className="max-w-4xl mx-auto text-left">             
            <motion.div variants={{hidden:{opacity:0,y:14},show:{opacity:1,y:0}}} className="mb-6 md:mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold mb-3 shadow-sm">
                    <CalendarIcon size={14} strokeWidth={2} /> Seleção de Data e Horário
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-zinc-950 dark:text-white leading-tight">Qual o melhor dia para você?</h2>
                <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm mt-1.5 leading-relaxed">Selecione a data no calendário e, em seguida, escolha um dos horários disponíveis.</p>
                {selectedSrv?.agendamento_bloqueado_ate && (
                    <p className="mt-3 text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3">
                        Agenda liberada a partir de {new Date(`${selectedSrv.agendamento_bloqueado_ate}T12:00:00`).toLocaleDateString("pt-BR")}{selectedSrv.motivo_bloqueio_agenda ? ` · ${selectedSrv.motivo_bloqueio_agenda}` : ""}
                    </p>
                )}
            </motion.div>             

            <motion.div variants={{hidden:{opacity:0,y:18},show:{opacity:1,y:0}}} className="flex flex-col md:flex-row gap-5 md:gap-8">                                  
                
                <div className="w-full md:w-1/2 rounded-[2rem] border border-zinc-200/80 dark:border-white/10 p-5 md:p-6 bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl shadow-sm">                     
                    <div className="flex justify-between items-center mb-6">
                        <button
                          onClick={() => {
                            playDopamineSound('click');
                            setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
                          }}
                          aria-label="Mês anterior"
                          className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                        >
                            <ChevronLeft size={18} strokeWidth={2.5}/>
                        </button>
                        <h3 className="font-extrabold text-sm sm:text-base capitalize text-zinc-900 dark:text-white">
                          {calendarMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                        </h3>
                        <button
                          onClick={() => {
                            playDopamineSound('click');
                            setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
                          }}
                          aria-label="Próximo mês"
                          className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                        >
                            <ChevronRight size={18} strokeWidth={2.5}/>
                        </button>
                    </div>                     
                    
                    <div className="grid grid-cols-7 gap-1 text-center mb-2.5">
                        {['D','S','T','Q','Q','S','S'].map((d,i)=><div key={i} className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-wider">{d}</div>)}
                    </div>                     
                    
                    <div className="grid grid-cols-7 gap-1.5 md:gap-2">                         
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
                                    whileTap={!isPastOrBlocked ? { scale: 0.88 } : {}}
                                    key={d}                                      
                                    disabled={isPastOrBlocked}                                      
                                    onClick={() => {                                          
                                        playDopamineSound("select");
                                        triggerHaptic("light");
                                        if (formData.data_agendamento !== dateStr) setValue("horario_agendamento", "");
                                        setValue("data_agendamento", dateStr);                                          
                                        setTimeout(() => { 
                                          timeSlotsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }); 
                                        }, 100);                                      
                                    }}                                      
                                    className={`relative aspect-square rounded-2xl text-xs sm:text-sm transition-all duration-200 min-h-[40px] flex items-center justify-center ${
                                      isPastOrBlocked
                                        ? "opacity-20 cursor-not-allowed text-zinc-400 dark:text-zinc-600"
                                        : isSel
                                        ? "bg-zinc-950 text-white dark:bg-white dark:text-black font-black shadow-lg shadow-black/10 dark:shadow-white/10 ring-2 ring-[#9FC131] scale-105"
                                        : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold"
                                    }`}                                 
                                >                                     
                                    {d}                                 
                                    {isSel && (
                                      <motion.span
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="absolute -right-1 -top-1 w-4 h-4 rounded-full bg-[#9FC131] text-black flex items-center justify-center shadow-sm"
                                      >
                                        <Check size={10} strokeWidth={3} />
                                      </motion.span>
                                    )}
                                </motion.button>                             
                            );                         
                        })}                     
                    </div>                 
                </div>                                  
                
                <div className="w-full md:w-1/2 rounded-[2rem] border border-zinc-200/80 dark:border-white/10 p-5 md:p-6 bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl shadow-sm flex flex-col justify-between scroll-mt-20" ref={timeSlotsRef}>                     
                    {formData.data_agendamento ? (                         
                        <div>                             
                            <div className="flex justify-between items-center border-b border-zinc-200/80 dark:border-white/10 pb-4 mb-4">                                 
                                <h4 className="font-bold text-sm flex items-center gap-2 text-zinc-900 dark:text-white">                                   
                                    <Clock3 size={16} className="text-[#9FC131]" /> Horários Disponíveis                                 
                                </h4>                                 
                                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-bold capitalize">                                   
                                    {new Date(formData.data_agendamento + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}                                 
                                </span>                             
                            </div>                             
                            
                            {agenda.buscando ? (                                 
                                <div className="py-6">
                                  <SkeletonSlots />
                                </div>                             
                            ) : slotsRender.length === 0 ? (                                 
                                <div className="py-12 text-center text-zinc-400 text-xs font-medium border border-dashed rounded-2xl border-zinc-200 dark:border-zinc-800 p-6">                                     
                                    Nenhum horário disponível para esta data. Selecione outro dia no calendário.                             
                                </div>                             
                            ) : (                                 
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-[320px] overflow-y-auto custom-scrollbar pr-1 py-1">                                     
                                    {slotsRender.map(({ h, off }) => {                                         
                                        const isSel = formData.horario_agendamento === h;                                         
                                        return (                                             
                                            <motion.button
                                                whileHover={!off ? { scale: 1.04 } : {}}
                                                whileTap={!off ? { scale: 0.95 } : {}}
                                                key={h}                                                 
                                                disabled={off}                                                 
                                                onClick={() => {
                                                  playDopamineSound("select");
                                                  triggerHaptic("medium");
                                                  setValue("horario_agendamento", h);
                                                }}                                                 
                                                className={`min-h-[48px] py-3 px-2 rounded-2xl text-xs font-bold transition-all flex items-center justify-center ${
                                                  off
                                                    ? "opacity-25 cursor-not-allowed bg-zinc-100 dark:bg-zinc-900 text-zinc-400 line-through"
                                                    : isSel
                                                    ? "bg-[#9FC131] text-black shadow-lg shadow-[#9FC131]/20 font-black ring-2 ring-[#9FC131] scale-105"
                                                    : "bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 hover:border-[#9FC131] text-zinc-800 dark:text-zinc-200"
                                                }`}                                             
                                            >                                                 
                                                {h}                                             
                                            </motion.button>                                         
                                        );                                     
                                    })}                                 
                                </div>                             
                            )}                         
                        </div>                     
                    ) : (                         
                        <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-8 text-zinc-400">                             
                            <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-3 text-zinc-400">
                              <CalendarIcon size={26} strokeWidth={1.5} />
                            </div>
                            <p className="text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-400 max-w-xs">
                              Selecione uma data no calendário ao lado para visualizar os horários de atendimento.
                            </p>                         
                        </div>                     
                    )}                 
                </div>             
            </motion.div>         
        </motion.div>     
    ); 
}
