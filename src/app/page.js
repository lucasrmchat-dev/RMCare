"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Search, Activity, ShieldCheck, Clock, Building2 } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [search, setSearch] = useState("");
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmpresas = async () => {
      // Busca a lista de clínicas cadastradas para a barra de pesquisa
      const { data } = await supabase.from("empresas").select("nome, slug").order('nome');
      if (data) setEmpresas(data);
      setLoading(false);
    };
    fetchEmpresas();
  }, []);

  const filtered = empresas.filter(e => e.nome.toLowerCase().includes(search.toLowerCase()));

  return (
    <main className="relative min-h-screen bg-[#F8FAFC] dark:bg-[#060A12] overflow-hidden antialiased text-gray-950 dark:text-white transition-colors duration-500 selection:bg-[#9FC131] selection:text-black">
      <Navbar />
      
      <div className="absolute top-[-5%] left-[-10%] w-[600px] h-[600px] bg-[#9FC131]/10 dark:bg-[#9FC131]/5 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[500px] h-[500px] bg-emerald-600/5 dark:bg-blue-600/5 rounded-full blur-[130px] pointer-events-none" />
      
      <section className="relative max-w-4xl mx-auto pt-32 pb-24 px-6 flex flex-col items-center text-center z-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-[#111827] border border-gray-200/80 dark:border-slate-800 text-xs font-semibold text-gray-600 dark:text-slate-300 shadow-sm mb-8"
        >
          <Activity size={14} className="text-[#9FC131]" />
          <span>Plataforma Oficial RM Care</span>
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-4xl md:text-6xl font-black tracking-tight text-gray-900 dark:text-white leading-[1.15]"
        >
          Agendamento Clínico de forma <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9FC131] to-emerald-600">direta e digital.</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-6 text-base md:text-lg text-gray-500 dark:text-slate-400 max-w-xl font-normal leading-relaxed"
        >
          Pesquise a clínica ou profissional desejado e garanta seu atendimento em poucos segundos, com total segurança.
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-10 w-full max-w-lg relative"
        >
          <div className="relative flex items-center">
            <Search className="absolute left-6 text-gray-400" size={20} />
            <input 
              type="text"
              placeholder="Buscar por clínica ou hospital..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white dark:bg-[#111827] border border-gray-200 dark:border-slate-800 rounded-full px-6 py-4 pl-14 text-base outline-none focus:ring-2 focus:ring-[#9FC131]/50 focus:border-[#9FC131] shadow-lg transition-all"
            />
          </div>

          {/* Menu Suspenso de Resultados */}
          {search.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#111827] border border-gray-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden z-50 max-h-64 overflow-y-auto custom-scrollbar text-left">
              {loading ? (
                <div className="p-6 text-center text-sm text-gray-500 flex justify-center"><Activity className="animate-spin" size={20}/></div>
              ) : filtered.length > 0 ? (
                filtered.map(emp => (
                  <Link key={emp.slug} href={`/${emp.slug}/agendamentos`}>
                    <div className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors border-b border-gray-100 dark:border-slate-800 last:border-0 cursor-pointer">
                      <div className="w-10 h-10 rounded-full bg-[#9FC131]/10 flex items-center justify-center text-[#9FC131] shrink-0">
                        <Building2 size={18} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">{emp.nome}</h4>
                        <p className="text-xs text-gray-500">Acessar portal de agendamento</p>
                      </div>
                      <ArrowRight size={16} className="text-gray-300 ml-auto" />
                    </div>
                  </Link>
                ))
              ) : (
                <div className="p-6 text-center text-sm text-gray-500">Nenhuma clínica encontrada.</div>
              )}
            </div>
          )}
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="mt-24 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full border-t border-gray-200/80 dark:border-slate-800/80 pt-12 text-left"
        >
          <div className="flex gap-3 items-start bg-white dark:bg-[#111827]/40 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
            <ShieldCheck size={24} className="text-[#9FC131] shrink-0" />
            <div>
              <h4 className="font-bold text-sm text-gray-900 dark:text-white">Privacidade (LGPD)</h4>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Garantimos o sigilo de seus dados médicos de ponta a ponta.</p>
            </div>
          </div>
          <div className="flex gap-3 items-start bg-white dark:bg-[#111827]/40 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
            <Activity size={24} className="text-[#9FC131] shrink-0" />
            <div>
              <h4 className="font-bold text-sm text-gray-900 dark:text-white">Multi-Clínicas</h4>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Conecte-se com especialistas de diversas unidades de saúde.</p>
            </div>
          </div>
          <div className="flex gap-3 items-start bg-white dark:bg-[#111827]/40 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
            <Clock size={24} className="text-[#9FC131] shrink-0" />
            <div>
              <h4 className="font-bold text-sm text-gray-900 dark:text-white">Agendamento Online</h4>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Consulte disponibilidade 24h por dia, sem filas de espera.</p>
            </div>
          </div>
        </motion.div>
      </section>
    </main>
  );
}