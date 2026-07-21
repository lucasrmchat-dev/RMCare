"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, User, CalendarDays, Stethoscope, CreditCard, Server, Filter } from "lucide-react";
import { getHojeLocal, fadeUp, staggerContainer, staggerItem, CustomSelect, ToggleSwitch } from "../components/SharedUI";

// ATUALIZADO: Trocamos 'servicosOptions' por 'servicos' para receber a tabela real
export default function AgendaView({ agendamentos, bloqueios, servicos = [] }) {
  const [filterMedico, setFilterMedico] = useState("Todos");
  const [showBlockedInAgenda, setShowBlockedInAgenda] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(getHojeLocal());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // NOVO: Constrói dinamicamente as opções do select baseado na tabela 'servicos' real
  const profissionaisOptions = useMemo(() => {
    const defaultOption = { value: "Todos", label: "Todos os Registros" };
    
    if (!servicos || servicos.length === 0) return [defaultOption];

    const options = servicos
      .filter(s => s.ativo !== false) // Opcional: mostrar apenas os ativos no filtro
      .map(s => ({
        value: s.nome,
        label: `${s.nome} (${s.tipo})`
      }));

    return [defaultOption, ...options];
  }, [servicos]);

  const agendamentosFiltrados = useMemo(() => {
    return agendamentos
      .filter(a => a.data_agendamento === selectedDay)
      .filter(a => {
        if (filterMedico === "Todos") return true;
        const profExame = a.tipo_servico === "Exame" ? a.subtipo_exame : a.medico_profissional;
        return profExame === filterMedico;
      });
  }, [agendamentos, selectedDay, filterMedico]);

  const bloqueiosFiltrados = useMemo(() => {
    return bloqueios
      .filter(b => b.data === selectedDay)
      .filter(b => filterMedico === "Todos" || b.medico_profissional === filterMedico);
  }, [bloqueios, selectedDay, filterMedico]);

  const eventosAgendaMista = useMemo(() => {
    const arr = [...agendamentosFiltrados.map(a => ({...a, tipo: 'agendamento'}))];
    if (showBlockedInAgenda) {
      arr.push(...bloqueiosFiltrados.map(b => ({...b, tipo: 'bloqueio'})));
    }
    return arr.sort((a, b) => {
      const hA = a.tipo === 'agendamento' ? a.horario_agendamento : a.horario;
      const hB = b.tipo === 'agendamento' ? b.horario_agendamento : b.horario;
      return (hA || "").localeCompare(hB || "");
    });
  }, [agendamentosFiltrados, bloqueiosFiltrados, showBlockedInAgenda]);

  return (
    <motion.div key="agenda" {...fadeUp} className="flex-1 flex flex-col h-full overflow-hidden w-full max-w-7xl mx-auto md:p-6 lg:p-8">
      <div className="bg-white rounded-[2rem] border border-zinc-200/60 shadow-sm flex flex-col h-full overflow-hidden">
        
        <div className="px-6 md:px-8 py-6 border-b border-zinc-100 flex flex-col md:flex-row gap-6 justify-between md:items-center bg-zinc-50/30">
          <div>
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Agenda de Pacientes</h2>
            <div className="flex items-center gap-4 mt-3">
              <ToggleSwitch checked={showBlockedInAgenda} onChange={setShowBlockedInAgenda} label="Ver Horários Bloqueados" />
            </div>
          </div>
          
          <div className="w-full md:w-72">
            {/* ATUALIZADO: Passando as opções dinâmicas */}
            <CustomSelect 
              label="Filtrar Agenda" 
              value={filterMedico} 
              onChange={setFilterMedico} 
              options={profissionaisOptions} 
              icon={Filter} 
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          <div className="w-full md:w-[320px] border-r border-zinc-100 p-6 flex flex-col overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <span className="font-bold capitalize text-zinc-900">{currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</span>
              <div className="flex gap-1 bg-zinc-50 rounded-lg p-0.5 border border-zinc-200/50">
                <button onClick={prevMonth} className="p-1.5 text-zinc-400 hover:text-zinc-900 transition-colors"><ChevronLeft size={16}/></button>
                <button onClick={nextMonth} className="p-1.5 text-zinc-400 hover:text-zinc-900 transition-colors"><ChevronRight size={16}/></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-y-2 gap-x-1">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d,i) => <div key={i} className="text-center text-[10px] font-bold text-zinc-300 uppercase">{d}</div>)}
              {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
                const isSel = selectedDay === dateStr;
                const isTod = getHojeLocal() === dateStr;
                
                const hasAgend = agendamentos.some(a => a.data_agendamento === dateStr && (filterMedico === "Todos" || (a.tipo_servico === "Exame" ? a.subtipo_exame === filterMedico : a.medico_profissional === filterMedico)));
                const hasBlock = showBlockedInAgenda && bloqueios.some(b => b.data === dateStr && (filterMedico === "Todos" || b.medico_profissional === filterMedico));

                return (
                  <button key={i} onClick={() => setSelectedDay(dateStr)} className={`relative h-10 w-full rounded-xl text-sm transition-all ${isSel ? "bg-zinc-900 text-white font-bold shadow-md" : isTod ? "bg-zinc-100 font-bold" : "hover:bg-zinc-50 text-zinc-600 font-medium"}`}>
                    {i + 1}
                    <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
                      {hasAgend && <div className={`w-1 h-1 rounded-full ${isSel ? 'bg-white' : 'bg-green-500'}`} />}
                      {hasBlock && <div className={`w-1 h-1 rounded-full ${isSel ? 'bg-red-300' : 'bg-red-400'}`} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar bg-[#FAFAFA]/50">
            <h3 className="text-lg font-bold text-zinc-900 mb-6 flex items-center gap-2">
              <CalendarDays size={18} className="text-zinc-400"/>
              {new Date(selectedDay + "T12:00:00").toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            
            <AnimatePresence mode="popLayout">
              {eventosAgendaMista.length === 0 ? (
                <motion.div key="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-20 text-center flex flex-col items-center justify-center">
                  <div className="w-20 h-20 bg-white border border-zinc-200 rounded-[2rem] flex items-center justify-center text-zinc-300 mb-6 shadow-sm"><User size={28}/></div>
                  <p className="text-zinc-500 text-sm font-medium">Nenhum evento corresponde aos filtros nesta data.</p>
                </motion.div>
              ) : (
                <motion.div key="list-state" variants={staggerContainer} initial="initial" animate="animate" exit={{ opacity: 0 }} className="space-y-4">
                  {eventosAgendaMista.map((ev) => {
                    const isAgendamento = ev.tipo === 'agendamento';
                    const tituloPrincipal = isAgendamento ? (ev.tipo_servico === "Exame" ? ev.subtipo_exame : ev.medico_profissional) : ev.medico_profissional;
                    const hrFormat = (ev.horario_agendamento || ev.horario)?.substring(0,5);

                    return (
                      <motion.div key={ev.id} variants={staggerItem} layout className={`bg-white border ${isAgendamento ? 'border-zinc-200/80 hover:border-zinc-300' : 'border-red-100 hover:border-red-200'} p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center gap-4 transition-colors relative overflow-hidden`}>
                        {!isAgendamento && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-400" />}
                        
                        <div className="bg-zinc-50 border border-zinc-100 px-4 py-3 rounded-xl text-center min-w-[76px] shadow-inner">
                          <span className="text-lg font-black text-zinc-900 tracking-tighter">{hrFormat}</span>
                        </div>
                        
                        <div className="flex-1">
                          {isAgendamento ? (
                            <>
                              <h4 className="text-base font-bold text-zinc-900 flex items-center flex-wrap gap-2">
                                {ev.pacientes?.nome_completo ? ev.pacientes.nome_completo : "Paciente não identificado"}
                                {ev.pacientes?.cpf && <span className="text-xs font-medium text-zinc-400 px-2 py-0.5 bg-zinc-100 rounded-md">CPF: {ev.pacientes.cpf}</span>}
                              </h4>
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                <span className="bg-zinc-100 text-zinc-700 text-[10px] font-bold uppercase px-2.5 py-1 rounded-md flex items-center gap-1"><Stethoscope size={12}/> {tituloPrincipal}</span>
                                <span className="bg-zinc-100 text-zinc-500 text-[10px] font-bold uppercase px-2.5 py-1 rounded-md">{ev.tipo_servico}</span>
                                <span className={`${ev.status_pagamento_antecipado ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'} text-[10px] font-bold uppercase px-2.5 py-1 rounded-md flex items-center gap-1`}><CreditCard size={12}/> {ev.status_pagamento_antecipado ? "Pago" : "Pendente"}</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <h4 className="text-base font-bold text-zinc-500 flex items-center gap-2">Paciente da Plataforma MedicalSys {ev.status === "importado" && <span className="bg-blue-50 text-blue-600 text-[9px] uppercase px-2 py-0.5 rounded-md flex items-center gap-1"><Server size={10}/> ERP</span>}</h4>
                              <p className="text-sm font-medium text-zinc-900 mt-1">{tituloPrincipal}</p>
                            </>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}