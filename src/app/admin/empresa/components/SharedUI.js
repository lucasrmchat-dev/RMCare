"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { playDopamineSound, triggerHaptic } from "@/lib/dopamine";

export const HORARIOS_OPCOES = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00"
];

export const getHojeLocal = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export const spring = { type: "spring", stiffness: 420, damping: 30 };

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
  <button
    onClick={() => {
      playDopamineSound("click");
      triggerHaptic("light");
      onClick(id);
    }}
    className={`group w-full min-h-[48px] flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all duration-300 relative ${
      activeView === id
        ? "text-zinc-950 dark:text-white font-extrabold"
        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 font-medium"
    }`}
  >
    {activeView === id && (
      <motion.div
        layoutId="active-tab"
        className="absolute inset-0 bg-white dark:bg-zinc-800/90 shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-zinc-200/70 dark:border-white/10 rounded-2xl -z-10"
        transition={spring}
      />
    )}
    <Icon
      size={18}
      strokeWidth={activeView === id ? 2.2 : 1.75}
      className={`shrink-0 ${
        activeView === id
          ? "text-zinc-950 dark:text-white"
          : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors"
      }`}
    />
    <span className="text-xs leading-4">{label}</span>
  </button>
);

export const CustomSelect = ({ value, onChange, options, label, icon: Icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);
  useOutsideClick(ref, () => setIsOpen(false));
  const selectedOption = options.find((o) => o.value === value) || options[0];

  return (
    <div className="relative flex flex-col gap-1.5 w-full" ref={ref}>
      {label && (
        <label className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => {
          playDopamineSound("click");
          setIsOpen(!isOpen);
        }}
        className={`flex items-center justify-between w-full px-4 py-3.5 min-h-[48px] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border ${
          isOpen
            ? "border-[#9FC131] dark:border-[#9FC131] ring-4 ring-[#9FC131]/15"
            : "border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700"
        } rounded-2xl text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white transition-all shadow-sm`}
      >
        <div className="flex items-center gap-2 truncate">
          {Icon && <Icon size={16} className="text-zinc-400 dark:text-zinc-500 shrink-0" />}
          <span className="truncate">{selectedOption?.label}</span>
        </div>
        <ChevronDown
          size={16}
          className={`text-zinc-400 transition-transform duration-300 shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full left-0 right-0 mt-2 bg-white/95 dark:bg-[#121216]/95 backdrop-blur-3xl border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.18)] overflow-hidden flex flex-col max-h-60 overflow-y-auto custom-scrollbar p-1"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  playDopamineSound("select");
                  triggerHaptic("light");
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs transition-colors min-h-[40px] ${
                  value === opt.value
                    ? "bg-zinc-100 dark:bg-zinc-800 font-extrabold text-zinc-950 dark:text-white"
                    : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 font-medium"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {value === opt.value && (
                  <Check size={14} strokeWidth={2.5} className="text-[#86a621] dark:text-[#9FC131] flex-shrink-0 ml-2" />
                )}
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
    playDopamineSound("select");
    triggerHaptic("light");
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const displayDate = value
    ? new Date(value + "T12:00:00").toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      })
    : "Selecionar Data";

  return (
    <div className="relative flex flex-col gap-1.5 w-full" ref={ref}>
      {label && (
        <label className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => {
          playDopamineSound("click");
          setIsOpen(!isOpen);
        }}
        className={`flex items-center justify-between w-full px-4 py-3.5 min-h-[48px] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border ${
          isOpen
            ? "border-[#9FC131] dark:border-[#9FC131] ring-4 ring-[#9FC131]/15"
            : "border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700"
        } rounded-2xl text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white transition-all shadow-sm`}
      >
        <div className="flex items-center gap-2 font-medium">
          <CalendarIcon size={16} className="text-zinc-400 dark:text-zinc-500" />
          {displayDate}
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.98 }}
            className="absolute z-50 top-full left-0 mt-2 w-72 bg-white/95 dark:bg-[#121216]/95 backdrop-blur-3xl border border-zinc-200/80 dark:border-zinc-800 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] p-5"
          >
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-sm capitalize text-zinc-900 dark:text-white">
                {calDate.toLocaleString("pt-BR", { month: "long", year: "numeric" })}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    playDopamineSound("click");
                    setCalDate(new Date(year, month - 1, 1));
                  }}
                  className="p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playDopamineSound("click");
                    setCalDate(new Date(year, month + 1, 1));
                  }}
                  className="p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-y-2 gap-x-1 text-center">
              {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                <div key={i} className="text-[10px] font-extrabold text-zinc-400 uppercase">
                  {d}
                </div>
              ))}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const d = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                const isSelected = value === dateStr;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleSelect(d)}
                    className={`h-8 w-full rounded-xl text-xs transition-all flex items-center justify-center ${
                      isSelected
                        ? "bg-zinc-950 text-white dark:bg-white dark:text-black font-extrabold shadow-sm"
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 font-semibold"
                    }`}
                  >
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
    {label && (
      <label className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">
        {label}
      </label>
    )}
    <input
      type={type}
      className="w-full min-h-[48px] px-4 py-3.5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800 rounded-2xl text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white outline-none transition-all duration-300 focus:border-[#9FC131] dark:focus:border-[#9FC131] focus:ring-4 focus:ring-[#9FC131]/15 shadow-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
      {...props}
    />
  </div>
);

export const ToggleSwitch = ({ checked, onChange, label }) => (
  <label className="flex items-center cursor-pointer select-none gap-3 min-h-[44px]">
    <div className="relative">
      <input
        type="checkbox"
        className="sr-only"
        checked={!!checked}
        onChange={(e) => {
          playDopamineSound("click");
          triggerHaptic("light");
          onChange(e.target.checked);
        }}
      />
      <div
        className={`block w-11 h-6 rounded-full transition-colors duration-300 ${
          checked ? "bg-[#86a621] dark:bg-[#9FC131]" : "bg-zinc-300 dark:bg-zinc-800"
        }`}
      />
      <div
        className={`absolute left-1 top-1 bg-white dark:bg-black w-4 h-4 rounded-full transition-transform duration-300 shadow-sm ${
          checked ? "transform translate-x-5" : ""
        }`}
      />
    </div>
    {label && (
      <span className="text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-300">
        {label}
      </span>
    )}
  </label>
);

export const ButtonPrimary = ({ children, onClick, disabled, className = "", icon: Icon }) => (
  <motion.button
    whileHover={!disabled ? { scale: 1.02 } : {}}
    whileTap={!disabled ? { scale: 0.96 } : {}}
    onClick={(e) => {
      playDopamineSound("click");
      triggerHaptic("light");
      if (onClick) onClick(e);
    }}
    disabled={disabled}
    className={`relative overflow-hidden min-h-[48px] bg-zinc-950 hover:bg-black dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black px-6 py-3.5 rounded-2xl font-extrabold text-xs sm:text-sm shadow-[0_8px_20px_rgba(0,0,0,0.12)] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
  >
    {Icon && <Icon size={16} strokeWidth={2.2} />}
    {children}
  </motion.button>
);

export const CapsuleSpinner = ({ size = "md", className = "" }) => {
  const sizeMap = {
    xs: "w-3.5 h-3.5 border-[2px]",
    sm: "w-4 h-4 border-[2px]",
    md: "w-5 h-5 border-[2.5px]",
    lg: "w-7 h-7 border-[3px]",
    xl: "w-10 h-10 border-[3.5px]"
  };
  return (
    <div
      className={`inline-block rounded-full border-zinc-300 dark:border-zinc-700 border-t-zinc-950 dark:border-t-white animate-spin shrink-0 ${
        sizeMap[size] || sizeMap.md
      } ${className}`}
      role="status"
      aria-label="Carregando"
    />
  );
};

export const CapsulePillLoader = ({ text = "Processando...", className = "" }) => (
  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold shadow-xs ${className}`}>
    <span className="w-2.5 h-4 rounded-full border-2 border-zinc-400 dark:border-zinc-500 border-t-[#86a621] dark:border-t-[#9FC131] animate-spin" />
    <span>{text}</span>
  </div>
);

export const ModuleHeader = ({ icon: Icon, title, description, badge, rightElement }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/80 dark:border-white/10 pb-4 text-left">
    <div className="flex items-start sm:items-center gap-3.5">
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-zinc-900/5 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10 text-zinc-900 dark:text-white flex items-center justify-center shrink-0 shadow-xs">
          <Icon size={22} strokeWidth={1.8} className="text-[#86a621] dark:text-[#9FC131]" />
        </div>
      )}
      <div>
        {badge && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-wider mb-1">
            {badge}
          </span>
        )}
        <h2 className="text-xl font-bold text-zinc-950 dark:text-white tracking-tight leading-tight">
          {title}
        </h2>
        {description && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5 leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </div>
    {rightElement && <div className="flex items-center gap-2.5 shrink-0">{rightElement}</div>}
  </div>
);
