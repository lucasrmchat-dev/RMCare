"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Search,
  Activity,
  ShieldCheck,
  Clock,
  Building2,
  CalendarDays
} from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";
import { playDopamineSound, triggerHaptic } from "@/lib/dopamine";

export default function Home() {
  const [search, setSearch] = useState("");
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const fetchEmpresas = async () => {
      const { data } = await supabase
        .from("empresas")
        .select("nome, slug, logo_url, config_campos")
        .order("nome");
      if (data) setEmpresas(data);
      setLoading(false);
    };
    fetchEmpresas();
  }, []);

  const filtered = empresas.filter(
    (e) =>
      e.nome.toLowerCase().includes(search.toLowerCase()) ||
      e.slug.toLowerCase().includes(search.toLowerCase())
  );

  const handleKeyDown = (e) => {
    if (filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filtered.length);
      playDopamineSound("click");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      playDopamineSound("click");
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      playDopamineSound("select");
      window.location.href = `/${filtered[selectedIndex].slug}/agendamentos`;
    } else if (e.key === "Escape") {
      setSearch("");
    }
  };

  return (
    <main className="relative min-h-[100dvh] bg-[#F8FAFC] dark:bg-[#060A12] overflow-x-hidden antialiased text-gray-950 dark:text-white transition-colors duration-400 selection:bg-[#9FC131] selection:text-black flex flex-col justify-between">
      <Navbar />

      <div className="absolute top-[-8%] left-[-10%] w-[550px] h-[550px] bg-[#9FC131]/8 dark:bg-[#9FC131]/5 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/5 dark:bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />

      <section className="relative max-w-4xl mx-auto pt-24 md:pt-32 pb-16 px-6 flex flex-col items-center text-center z-10 w-full">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/80 dark:bg-[#111622]/80 backdrop-blur-xl border border-zinc-200/80 dark:border-white/10 text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 shadow-sm mb-6"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-[#9FC131]" />
          <span>Plataforma RMAgenda</span>
          <span className="text-zinc-300 dark:text-zinc-700">·</span>
          <span className="text-[10px] text-zinc-400">Atendimento Clínico</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-950 dark:text-white leading-[1.18] max-w-2xl"
        >
          Agendamento clínico simplificado,{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#86a621] via-emerald-600 to-teal-600 dark:from-[#9FC131] dark:via-emerald-400 dark:to-teal-400">
            inteligente e seguro.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-4 text-sm sm:text-base text-zinc-500 dark:text-zinc-400 max-w-lg font-normal leading-relaxed"
        >
          Localize sua clínica ou profissional, consulte horários disponíveis em tempo real e confirme seu atendimento.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8 w-full max-w-md relative"
        >
          <div className="relative flex items-center group">
            <Search
              className="absolute left-4 text-zinc-400 group-focus-within:text-[#9FC131] transition-colors pointer-events-none"
              size={17}
              strokeWidth={1.5}
            />
            <input
              ref={searchInputRef}
              type="text"
              role="combobox"
              aria-expanded={search.length > 0}
              aria-label="Buscar clínica ou especialidade médica"
              placeholder="Buscar por clínica ou especialidade..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              className="w-full bg-white/90 dark:bg-[#0f141f]/90 backdrop-blur-2xl border border-zinc-200/90 dark:border-white/10 rounded-full px-5 py-3.5 pl-11 pr-10 text-xs sm:text-sm outline-none focus:border-[#9FC131] dark:focus:border-[#9FC131] shadow-sm transition-all placeholder:text-zinc-400 font-medium"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Limpar busca"
                className="absolute right-3.5 p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-full transition-colors text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <AnimatePresence>
            {search.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.99 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white/95 dark:bg-[#0f141f]/95 backdrop-blur-3xl border border-zinc-200/90 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden z-50 max-h-64 overflow-y-auto custom-scrollbar text-left p-1.5 divide-y divide-zinc-100 dark:divide-zinc-800/40"
              >
                {loading ? (
                  <div className="p-6 text-center text-xs text-zinc-500 flex flex-col items-center justify-center gap-2">
                    <Activity className="animate-spin text-[#9FC131]" size={18} strokeWidth={1.5} />
                    <span>Localizando clínicas...</span>
                  </div>
                ) : filtered.length > 0 ? (
                  filtered.map((emp, index) => {
                    const isSelected = selectedIndex === index;
                    const logo = emp.logo_url || emp.config_campos?.logo_url;
                    const formato = emp.config_campos?.formato_logo || "arredondada";
                    const shapeClass =
                      formato === "circular"
                        ? "rounded-full"
                        : formato === "quadrada"
                        ? "rounded-lg"
                        : "rounded-xl";
                    return (
                      <Link
                        key={emp.slug}
                        href={`/${emp.slug}/agendamentos`}
                        onClick={() => {
                          playDopamineSound("select");
                          triggerHaptic("light");
                        }}
                      >
                        <div
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
                            isSelected
                              ? "bg-zinc-100 dark:bg-white/10"
                              : "hover:bg-zinc-50 dark:hover:bg-white/5"
                          }`}
                        >
                          <div className={`w-9 h-9 ${shapeClass} bg-[#9FC131]/10 border border-[#9FC131]/20 flex items-center justify-center text-[#9FC131] shrink-0 overflow-hidden shadow-sm`}>
                            {logo ? (
                              <img src={logo} alt={emp.nome} className="w-full h-full object-cover" />
                            ) : (
                              <Building2 size={16} strokeWidth={1.5} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-zinc-950 dark:text-white text-xs sm:text-sm truncate">
                              {emp.nome}
                            </h4>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                              <CalendarDays size={11} strokeWidth={1.5} className="text-emerald-500" />
                              <span>Acessar portal</span>
                            </p>
                          </div>
                          <ArrowRight
                            size={14}
                            strokeWidth={1.5}
                            className={`text-zinc-400 transition-transform ${
                              isSelected ? "translate-x-1 text-[#9FC131]" : ""
                            }`}
                          />
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-xs text-zinc-500">
                    Nenhuma clínica encontrada.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full border-t border-zinc-200/70 dark:border-white/[0.06] pt-10 text-left"
        >
          <div className="flex gap-3.5 items-start bg-white/60 dark:bg-[#0c101a]/50 backdrop-blur-xl p-5 rounded-2xl border border-zinc-200/70 dark:border-white/[0.06]">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/50 dark:border-emerald-800/50">
              <ShieldCheck size={18} strokeWidth={1.5} />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-zinc-950 dark:text-white">Privacidade & LGPD</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                Dados clínicos protegidos de ponta a ponta.
              </p>
            </div>
          </div>

          <div className="flex gap-3.5 items-start bg-white/60 dark:bg-[#0c101a]/50 backdrop-blur-xl p-5 rounded-2xl border border-zinc-200/70 dark:border-white/[0.06]">
            <div className="w-9 h-9 rounded-xl bg-[#9FC131]/10 text-[#86a621] dark:text-[#9FC131] flex items-center justify-center shrink-0 border border-[#9FC131]/20">
              <Activity size={18} strokeWidth={1.5} />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-zinc-950 dark:text-white">Especialistas</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                Acesso direto a médicos e exames da clínica.
              </p>
            </div>
          </div>

          <div className="flex gap-3.5 items-start bg-white/60 dark:bg-[#0c101a]/50 backdrop-blur-xl p-5 rounded-2xl border border-zinc-200/70 dark:border-white/[0.06]">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/50 dark:border-blue-800/50">
              <Clock size={18} strokeWidth={1.5} />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-zinc-950 dark:text-white">Disponibilidade 24/7</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                Consulte horários e marque sem filas.
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      <footer className="w-full py-6 text-center text-[11px] text-zinc-400 border-t border-zinc-200/60 dark:border-white/[0.06] relative z-10">
        <p className="font-medium">
          © {new Date().getFullYear()} RMAgenda · Sistema Clínico Digital
        </p>
      </footer>
    </main>
  );
}
