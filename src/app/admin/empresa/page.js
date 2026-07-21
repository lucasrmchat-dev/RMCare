"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { 
  CalendarDays, Zap, X, DollarSign, FileQuestion, Menu, Lock, CheckCircle2, AlertCircle
} from "lucide-react";

import Navbar from "@/components/Navbar";
import { SidebarItem, spring } from "./components/SharedUI";

// Importação das Server Actions de busca (apenas leitura global)
import {
  fetchAdminBloqueios,
  fetchAdminAgendamentos,
  fetchAdminServicos,
  fetchAdminPerguntas,
  fetchAdminRegras // <-- Descomente/adicione quando criar a action no adminData.js
} from "@/actions/adminData"; 

// Importação dos Módulos
import AgendaView from "./modules/AgendaView";
import RestricoesView from "./modules/RestricoesView";
import FinanceiroView from "./modules/FinanceiroView";
import TriagemView from "./modules/TriagemView";
import SyncView from "./modules/SyncView";

export default function EmpresaAdmin() {
  const [activeView, setActiveView] = useState("agenda");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Global Data States
  const [bloqueios, setBloqueios] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [perguntas, setPerguntas] = useState([]);
  const [regras, setRegras] = useState([]); // <-- Estado adicionado para corrigir o erro
  
  // UI States globais
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    fetchBloqueios();
    fetchAgendamentos();
    fetchServicos();
    fetchPerguntas();
    fetchRegras(); // <-- Chamada adicionada
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchBloqueios = async () => {
    try {
      const data = await fetchAdminBloqueios();
      setBloqueios(data);
    } catch (error) {
      showToast("Erro ao carregar bloqueios.", "error");
    }
  };

  const fetchAgendamentos = async () => {
    try {
      const data = await fetchAdminAgendamentos();
      setAgendamentos(data);
    } catch (error) {
      console.error("🚨 ERRO SUPABASE (Agendamentos):", error.message);
      showToast(`Erro na consulta: ${error.message}`, "error");
    }
  };

  const fetchServicos = async () => {
    try {
      const data = await fetchAdminServicos();
      setServicos(data);
    } catch (error) {
      showToast("Erro ao carregar serviços.", "error");
    }
  };

  const fetchPerguntas = async () => {
    try {
      const data = await fetchAdminPerguntas();
      setPerguntas(data);
    } catch (error) {
      showToast("Erro ao carregar motor de triagem.", "error");
    }
  };

  // <-- Função fetchRegras adicionada para evitar o ReferenceError
  const fetchRegras = async () => {
    try {
      const data = await fetchAdminRegras();
      setRegras(data || []);
    } catch (error) {
      console.error("Erro ao buscar regras:", error);
      showToast("Erro ao carregar regras.", "error");
    }
  };

  const handleMenuClick = (id) => {
    setActiveView(id);
    setIsMobileMenuOpen(false);
  };

  // Pré-computa as opções de serviços/médicos que serão usadas na Agenda e Restrições
  // Para lidar com array vazio e evitar quebra, adicionamos um fallback (servicos || [])
  const servicosOptions = [
    { value: "Todos", label: "Todos os Profissionais/Exames" },
    ...(servicos || []).map(s => ({ value: s.id, label: s.nome })) // <- Ajustado de s.nome para s.id no value para cruzar corretamente os UUIDs
  ];

  return (
    <div className="h-screen w-screen bg-[#F4F4F5] flex flex-col font-sans overflow-hidden text-zinc-900 selection:bg-zinc-900 selection:text-white">
      <Navbar />

      <motion.button whileTap={{ scale: 0.9 }} className="md:hidden fixed bottom-6 right-6 z-50 p-4 bg-zinc-900 text-white rounded-full shadow-2xl" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </motion.button>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -40, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.9 }} transition={spring}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-3 px-5 py-3 rounded-full bg-zinc-900/90 backdrop-blur-md text-white shadow-xl border border-white/10">
            {toast.type === "success" ? <CheckCircle2 size={16} className="text-green-400" /> : <AlertCircle size={16} className="text-red-400" />}
            <span className="text-sm font-medium tracking-wide">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 pt-[72px] overflow-hidden relative">
        
        {/* Sidebar */}
        <aside className={`absolute md:relative z-40 h-full w-[260px] bg-white border-r border-zinc-200/60 flex flex-col p-4 transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}`}>
          <div className="mb-8 px-4 pt-4">
            <h2 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Painel Admin</h2>
            <p className="text-xl font-black text-zinc-900 tracking-tight">Gestão Clínica</p>
          </div>
          <LayoutGroup>
            <nav className="flex flex-col gap-1 flex-1">
              <SidebarItem id="agenda" icon={CalendarDays} label="Agendamentos" activeView={activeView} onClick={handleMenuClick} />
              <SidebarItem id="bloqueios" icon={Lock} label="Restrições" activeView={activeView} onClick={handleMenuClick} />
              <SidebarItem id="financeiro" icon={DollarSign} label="Serviços & Preços" activeView={activeView} onClick={handleMenuClick} />
              <SidebarItem id="triagem" icon={FileQuestion} label="Motor de Triagem" activeView={activeView} onClick={handleMenuClick} />
              <div className="mt-auto"><SidebarItem id="sync" icon={Zap} label="Integração ERP" activeView={activeView} onClick={handleMenuClick} /></div>
            </nav>
          </LayoutGroup>
        </aside>

        {isMobileMenuOpen && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-zinc-900/20 backdrop-blur-sm z-30 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-[#F4F4F5] md:rounded-tl-[2rem] border-t border-l border-zinc-200/50 shadow-[-10px_-10px_30px_rgba(0,0,0,0.02)]">
          <AnimatePresence mode="wait">
            
            {activeView === "agenda" && (
              <AgendaView 
                agendamentos={agendamentos} 
                bloqueios={bloqueios} 
                servicos={servicos} 
              />
            )}

            {activeView === "bloqueios" && (
              <RestricoesView 
                regras={regras} 
                fetchRegras={fetchRegras} 
                servicosOptions={servicosOptions} 
                showToast={showToast} 
              />
            )}

            {activeView === "financeiro" && (
              <FinanceiroView 
                servicos={servicos} 
                showToast={showToast} 
                fetchServicos={fetchServicos} 
              />
            )}

            {activeView === "triagem" && (
              <TriagemView 
                perguntas={perguntas} 
                servicos={servicos} 
                fetchPerguntas={fetchPerguntas} 
                showToast={showToast} 
              />
            )}

            {activeView === "sync" && (
              <SyncView 
                bloqueios={bloqueios} 
                fetchBloqueios={fetchBloqueios} 
                fetchServicos={fetchServicos} 
                servicos={servicos} 
                showToast={showToast} 
              />
            )}

          </AnimatePresence>
        </main>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E4E4E7; border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: #D4D4D8; }
      `}} />
    </div>
  );
}