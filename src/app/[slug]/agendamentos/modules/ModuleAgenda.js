"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Activity } from "lucide-react";
import { useAgendamento } from "../context";
import { helpers, calcularDataLimite, HORARIOS_BASE } from "../utils";

export default function ModuleAgenda() {
  const { formData, setValue, calendarMonth, setCalendarMonth, selectedSrv, bloqueioExtraCalculado, agenda, timeSlotsRef } = useAgendamento();
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="max-w-4xl mx-auto">
      <div className="mb-8"><h2 className="text-3xl font-medium">Agendamento</h2><p className="text-zinc-500 text-sm mt-2">Sincronize uma data.</p></div>
      <div className="flex flex-col md:flex-row gap-8">
        
        <div className="w-full md:w-1/2">
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
              const limiteFinalData = (!bloqueioExtraCalculado || dataSrv > bloqueioExtraCalculado) ? dataSrv : bloqueioExtraCalculado;
              
              const cellDate = new Date(y, m, d);
              const isPastOrBlocked = cellDate <= limiteFinalData || [0, 6].includes(cellDate.getDay());
              const isSel = formData.data_agendamento === dateStr;
              
              return (
                <button 
                  key={d} 
                  disabled={isPastOrBlocked} 
                  onClick={() => {
                    setValue("data_agendamento", dateStr);
                    setTimeout(() => {
                      timeSlotsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 150);
                  }} 
                  className={`aspect-square rounded-2xl text-sm transition-all duration-300 ${isPastOrBlocked ? "opacity-30 cursor-not-allowed text-zinc-400 dark:text-zinc-600" : isSel ? "bg-zinc-900 text-white dark:bg-white dark:text-black font-bold scale-[1.05] shadow-md" : "hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium active:scale-95"}`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="w-full md:w-1/2" ref={timeSlotsRef}>
          {formData.data_agendamento ? (
              <div>
                <div className="flex justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-4 pt-4 md:pt-0"><h4 className="font-medium text-sm">Horários</h4>{agenda.buscando && <Activity size={16} className="text-zinc-400 animate-spin"/>}</div>
                <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-[260px] pr-2 custom-scrollbar">
                  {HORARIOS_BASE.map(h => {
                    const off = agenda.ocupados.includes(h) || (formData.data_agendamento === helpers.getToday() && new Date().setHours(...h.split(':'),0,0) <= Date.now() + 3600000);
                    return <button key={h} disabled={off} onClick={() => setValue("horario_agendamento", h)} className={`py-3.5 rounded-2xl text-sm border transition-all ${off ? "border-transparent text-zinc-300 dark:text-zinc-700 line-through cursor-not-allowed" : formData.horario_agendamento === h ? "bg-zinc-900 border-zinc-900 text-white dark:bg-white dark:border-white dark:text-black font-bold shadow-md scale-[1.02]" : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"}`}>{h}</button>;
                  })}
                </div>
              </div>
          ) : <div className="h-full border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl flex flex-col items-center justify-center text-zinc-500 min-h-[250px]"><CalendarIcon size={32} className="mb-4 opacity-40"/><p className="text-sm">Selecione uma data</p></div>}
        </div>
      </div>
    </motion.div>
  );
}