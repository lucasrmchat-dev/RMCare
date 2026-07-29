"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

export const HORARIOS_OPCOES = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", 
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", 
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00"
];

export const getHojeLocal = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export const spring = { type: "spring", stiffness: 400, damping: 30 };

export const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0, transition: spring },
  exit: { opacity: 0, y: -10, transition: { duration: 0.15 } }
};

export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.05 } }
};

export const staggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: spring }
};

export function useOutsideClick(ref, callback) {
  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        callback();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref, callback]);
}

export const SidebarItem = ({ id, icon: Icon, label, activeView, onClick }) => (
  <button onClick={() => onClick(id)} className={`group w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all duration-300 relative ${activeView === id ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-900"}`}>
    {activeView === id && <motion.div layoutId="active-tab" className="absolute inset-0 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-zinc-200/50 rounded-2xl -z-10" transition={spring} />}
    <Icon size={18} className={activeView === id ? "text-zinc-900" : "text-zinc-400 group-hover:text-zinc-900 transition-colors"} />
    <span className="text-sm font-semibold tracking-wide">{label}</span>
  </button>
);

export const CustomSelect = ({ value, onChange, options, label, icon: Icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);
  useOutsideClick(ref, () => setIsOpen(false));
  const selectedOption = options.find(o => o.value === value) || options[0];
  return (
    <div className="relative flex flex-col gap-1.5 w-full" ref={ref}>
      {label && <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">{label}</label>}
      <button type="button" onClick={() => setIsOpen(!isOpen)} className={`flex items-center justify-between w-full px-4 py-3.5 bg-white border ${isOpen ? 'border-zinc-900 ring-4 ring-zinc-900/5' : 'border-zinc-200/80 hover:border-zinc-300'} rounded-2xl text-sm font-medium text-zinc-900 transition-all shadow-sm`}>
        <div className="flex items-center gap-2">
          {Icon && <Icon size={16} className="text-zinc-400" />}
          <span className="truncate">{selectedOption?.label}</span>
        </div>
        <ChevronDown size={16} className={`text-zinc-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: 5, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5, scale: 0.98 }} transition={{ duration: 0.15 }} className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-zinc-200 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col max-h-60 overflow-y-auto custom-scrollbar">
            {options.map((opt) => (
              <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setIsOpen(false); }} className={`flex items-center justify-between px-4 py-3 text-sm transition-colors ${value === opt.value ? 'bg-zinc-50 font-bold text-zinc-900' : 'text-zinc-600 hover:bg-zinc-50 font-medium'}`}>
                {opt.label}
                {value === opt.value && <Check size={14} className="text-zinc-900" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const CustomDatePicker = ({ value, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [calDate, setCalDate] = useState(value ? new Date(value + "T12:00:00") : new Date());
  const ref = useRef(null);
  useOutsideClick(ref, () => setIsOpen(false));
  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const handleSelect = (d) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    onChange(dateStr);
    setIsOpen(false);
  };
  const displayDate = value ? new Date(value + "T12:00:00").toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : "Selecionar Data";
  return (
    <div className="relative flex flex-col gap-1.5 w-full" ref={ref}>
      {label && <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">{label}</label>}
      <button type="button" onClick={() => setIsOpen(!isOpen)} className={`flex items-center justify-between w-full px-4 py-3.5 bg-white border ${isOpen ? 'border-zinc-900 ring-4 ring-zinc-900/5' : 'border-zinc-200/80 hover:border-zinc-300'} rounded-2xl text-sm text-zinc-900 transition-all shadow-sm`}>
        <div className="flex items-center gap-2 font-medium">
          <CalendarIcon size={16} className="text-zinc-400" />
          {displayDate}
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: 5, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5, scale: 0.98 }} className="absolute z-50 top-full left-0 mt-2 w-72 bg-white border border-zinc-200 rounded-[2rem] shadow-[0_20px_40px_rgba(0,0,0,0.12)] p-5">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-sm capitalize">{calDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</span>
              <div className="flex gap-1">
                <button type="button" onClick={() => setCalDate(new Date(year, month - 1, 1))} className="p-1.5 text-zinc-400 hover:bg-zinc-50 rounded-lg transition-colors"><ChevronLeft size={16}/></button>
                <button type="button" onClick={() => setCalDate(new Date(year, month + 1, 1))} className="p-1.5 text-zinc-400 hover:bg-zinc-50 rounded-lg transition-colors"><ChevronRight size={16}/></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-y-2 gap-x-1 text-center">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d,i) => <div key={i} className="text-[10px] font-bold text-zinc-300 uppercase">{d}</div>)}
              {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const d = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const isSelected = value === dateStr;
                return (
                  <button key={d} type="button" onClick={() => handleSelect(d)} className={`h-8 w-full rounded-xl text-xs transition-all flex items-center justify-center ${isSelected ? 'bg-zinc-900 text-white font-bold' : 'hover:bg-zinc-100 text-zinc-700 font-medium'}`}>
                    {d}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const TextInput = ({ label, type = "text", ...props }) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">{label}</label>}
    <input type={type} className="w-full px-4 py-3.5 bg-white border border-zinc-200/80 rounded-2xl text-sm font-medium text-zinc-900 outline-none transition-all duration-300 focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5 shadow-sm placeholder:text-zinc-300" {...props} />
  </div>
);

export const ToggleSwitch = ({ checked, onChange, label }) => (
  <label className="flex items-center cursor-pointer select-none gap-3">
    <div className="relative">
      {/* CORREÇÃO: Transformação forçada em Booleano (!!checked) para evitar erro de Uncontrolled Component no React */}
      <input type="checkbox" className="sr-only" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <div className={`block w-10 h-6 rounded-full transition-colors ${checked ? 'bg-zinc-900' : 'bg-zinc-200'}`}></div>
      <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'transform translate-x-4' : ''}`}></div>
    </div>
    {label && <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{label}</span>}
  </label>
);

export const ButtonPrimary = ({ children, onClick, disabled, className = "", icon: Icon }) => (
  <motion.button whileTap={!disabled ? { scale: 0.97 } : {}} onClick={onClick} disabled={disabled} className={`relative overflow-hidden bg-zinc-900 hover:bg-black text-white px-6 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-[0_8px_20px_rgba(0,0,0,0.12)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}>
    {Icon && <Icon size={16} />}
    {children}
  </motion.button>
);