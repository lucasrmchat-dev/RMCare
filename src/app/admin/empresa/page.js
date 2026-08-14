"use client"; 

import { useState, useEffect, useMemo } from "react"; 
import { motion, AnimatePresence, LayoutGroup } from "framer-motion"; 
import {
  CalendarDays,
  Zap,
  X,
  Users,
  FileQuestion,
  Menu,
  Clock3,
  CheckCircle2,
  AlertCircle,
  LayoutTemplate,
  KeyRound,
  ChevronDown,
  ChevronRight,
  Link2
} from "lucide-react"; 
import AdminSessionBar from "@/components/AdminSessionBar";
import { spring } from "./components/SharedUI"; 
import {
  fetchAdminBloqueios,
  fetchAdminAgendamentos,
  fetchAdminServicos,
  fetchAdminPerguntas,
  fetchAdminRegras
} from "@/actions/adminData"; 
import { getSessionAdminInfo } from "@/actions/auth"; 
import AgendaView from "./modules/AgendaView"; 
import RestricoesView from "./modules/RestricoesView"; 
import EquipeView from "./modules/EquipeView"; 
import TriagemView from "./modules/TriagemView"; 
import PersonalizacaoView from "./modules/PersonalizacaoView"; 
import AccountView from "./modules/AccountView";
import PoliciesView from "./modules/PoliciesView";
import SyncView from "./modules/SyncView";

export default function EmpresaAdmin() {     
    const [activeView, setActiveView] = useState("agenda");     
    const [activeSubView, setActiveSubView] = useState("calendario");
    const [expandedMenu, setExpandedMenu] = useState("agenda");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);     

    const [loggedAdmin, setLoggedAdmin] = useState(null);
    const [bloqueios, setBloqueios] = useState([]);     
    const [agendamentos, setAgendamentos] = useState([]);     
    const [servicos, setServicos] = useState([]);     
    const [perguntas, setPerguntas] = useState([]);     
    const [regras, setRegras] = useState([]);     
    const [toast, setToast] = useState(null);     

    const fetchAllData = async () => {         
        fetchBloqueios(); fetchAgendamentos(); fetchServicos(); fetchPerguntas(); fetchRegras();     
    };     

    const showToast = (msg, type = "success") => {         
        setToast({ msg, type }); setTimeout(() => setToast(null), 3000);     
    };     

    const fetchBloqueios = async () => {         
        try { const data = await fetchAdminBloqueios(); setBloqueios(data); }         
        catch (error) { showToast("Erro ao carregar bloqueios.", "error"); }     
    };     

    const fetchAgendamentos = async () => {         
        try { const data = await fetchAdminAgendamentos(); setAgendamentos(data); }         
        catch (error) { showToast(`Erro na consulta: ${error.message}`, "error"); }     
    };     

    const fetchServicos = async () => {         
        try { const data = await fetchAdminServicos(); setServicos(data); }         
        catch (error) { showToast("Erro ao carregar serviços.", "error"); }     
    };     

    const fetchPerguntas = async () => {         
        try { const data = await fetchAdminPerguntas(); setPerguntas(data); }         
        catch (error) { showToast("Erro ao carregar triagem.", "error"); }     
    };     

    const fetchRegras = async () => {         
        try { const data = await fetchAdminRegras(); setRegras(data || []); }         
        catch (error) { showToast("Erro ao carregar regras.", "error"); }     
    };     

    useEffect(() => {
      const checkAccessAndFetch = async () => {
        try {
          const info = await getSessionAdminInfo();
          if (!info) {
            window.location.replace("/login");
            return;
          }
          if (info.role === "sistema") {
            window.location.replace("/admin/sistema");
            return;
          }
          if (!info.empresa_id) {
            showToast("Acesso restrito: administrador sem clínica vinculada.", "error");
            return;
          }
          setLoggedAdmin(info);
          fetchAllData();
        } catch (e) {
          console.error(e);
          window.location.replace("/login");
        }
      };
      checkAccessAndFetch();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ESTRUTURA DO MENU COMPLETO
    const baseMenuStructure = useMemo(() => [
      {
        id: "agenda",
        label: "Agenda de pacientes",
        icon: CalendarDays,
        subItems: [
          { id: "calendario", label: "Calendário Diário" },
          { id: "lista", label: "Lista Unificada" }
        ]
      },
      {
        id: "bloqueios",
        label: "Horários e duração",
        icon: Clock3,
        subItems: [
          { id: "configurados", label: "Horários Configurados" },
          { id: "adicionar", label: "Adicionar Horário" }
        ]
      },
      {
        id: "politicas",
        label: "Políticas de atendimento",
        icon: FileQuestion
      },
      {
        id: "triagem",
        label: "Formulários clínicos",
        icon: LayoutTemplate
      },
      {
        id: "personalizacao",
        label: "Mensagens e jornada",
        icon: Zap,
        subItems: [
          { id: "jornada", label: "Dados e Logotipo" },
          { id: "modalidades", label: "Formas de Atendimento" },
          { id: "mensagens", label: "Mensagens Automáticas" }
        ]
      },
      {
        id: "equipe",
        label: "Corpo Clínico & Especialistas",
        icon: Users,
        subItems: [
          { id: "corpo", label: "Lista de Especialistas" },
          { id: "formulario", label: "Cadastrar Especialista" },
          { id: "especialidades", label: "Especialidades" },
          { id: "pausas", label: "Pausas na Agenda" }
        ]
      },
      {
        id: "integracoes",
        label: "Sincronização & ERP",
        icon: Link2
      },
      {
        id: "conta",
        label: "Acesso e Usuários",
        icon: KeyRound,
        subItems: [
          { id: "credenciais", label: "Minhas Credenciais" },
          { id: "usuarios", label: "Usuários & Permissões" }
        ]
      }
    ], []);

    // FILTRO DINÂMICO DE ACESSO POR PERMISSÕES
    const menuStructure = useMemo(() => {
      if (!loggedAdmin) return baseMenuStructure;
      if (loggedAdmin.is_owner || loggedAdmin.role === "sistema") return baseMenuStructure;

      const userPerms = loggedAdmin.permissoes || ["agenda"];
      return baseMenuStructure.filter((item) => {
        if (item.id === "conta") return true; // Sempre pode ver suas próprias credenciais
        return userPerms.includes(item.id);
      });
    }, [loggedAdmin, baseMenuStructure]);

    const handleMainMenuClick = (item) => {
      setActiveView(item.id);
      if (item.subItems && item.subItems.length > 0) {
        setExpandedMenu(expandedMenu === item.id ? null : item.id);
        setActiveSubView(item.subItems[0].id);
      } else {
        setExpandedMenu(null);
        setActiveSubView("");
      }
      setIsMobileMenuOpen(false);
    };

    const handleSubMenuClick = (parentId, subId) => {
      setActiveView(parentId);
      setActiveSubView(subId);
      setIsMobileMenuOpen(false);
    };

    const servicosOptions = (servicos || []).map((s) => ({ value: s.id, label: s.nome }));     

    return (         
        <div className="h-screen w-screen bg-[#F4F4F5] dark:bg-black flex flex-col font-sans overflow-hidden text-zinc-900 dark:text-white selection:bg-zinc-900 selection:text-white">             
            {/* BARRA DE SESSÃO PADRONIZADA */}
            <AdminSessionBar />

            <motion.button whileTap={{ scale: 0.9 }} className="md:hidden fixed bottom-6 right-6 z-50 p-4 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-full shadow-2xl" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>                 
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}             
            </motion.button>             

            <AnimatePresence>                 
                {toast && (                     
                    <motion.div initial={{ opacity: 0, y: -40, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.9 }} transition={spring} className="fixed top-24 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-3 px-5 py-3 rounded-full bg-zinc-900/90 backdrop-blur-md text-white shadow-xl border border-white/10">                         
                        {toast.type === "success" ? <CheckCircle2 size={16} className="text-green-400" /> : <AlertCircle size={16} className="text-red-400" />}                         
                        <span className="text-sm font-medium tracking-wide">{toast.msg}</span>                     
                    </motion.div>                 
                )}             
            </AnimatePresence>             

            <div className="flex flex-1 overflow-hidden relative">                 
                {/* SIDEBAR COM ACORDEÃO EXPANDÍVEL */}
                <aside className={`absolute md:relative z-40 h-full w-[270px] bg-white dark:bg-[#0a0a0a] border-r border-zinc-200/60 dark:border-zinc-800 flex flex-col p-4 transition-transform duration-500 ease-out ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}`}>                     
                    <div className="mb-6 px-4 pt-3">                         
                        <h2 className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mb-0.5">RMAgenda</h2>                         
                        <p className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">Administração</p>                     
                    </div>                     

                    <LayoutGroup>                         
                        <nav className="flex flex-col gap-1.5 flex-1 overflow-y-auto custom-scrollbar pr-1">                             
                            {menuStructure.map((item) => {
                              const Icon = item.icon;
                              const isMainActive = activeView === item.id;
                              const isExpanded = expandedMenu === item.id;
                              const hasSub = item.subItems && item.subItems.length > 0;

                              return (
                                <div key={item.id} className="flex flex-col">
                                  <button
                                    onClick={() => handleMainMenuClick(item)}
                                    className={`relative flex items-center justify-between w-full px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                                      isMainActive
                                        ? "bg-zinc-900 text-white dark:bg-white dark:text-black shadow-sm"
                                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-white"
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <Icon size={18} />
                                      <span>{item.label}</span>
                                    </div>
                                    {hasSub && (
                                      isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                                    )}
                                  </button>

                                  {/* SUB-ITENS NO SIDEBAR */}
                                  <AnimatePresence>
                                    {hasSub && (isExpanded || isMainActive) && (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="flex flex-col pl-9 pt-1 pb-2 gap-1 overflow-hidden"
                                      >
                                        {item.subItems.map((sub) => {
                                          const isSubActive = isMainActive && activeSubView === sub.id;
                                          return (
                                            <button
                                              key={sub.id}
                                              onClick={() => handleSubMenuClick(item.id, sub.id)}
                                              className={`text-left px-3 py-2 rounded-xl text-[11px] font-bold transition-all ${
                                                isSubActive
                                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-black"
                                                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900/40"
                                              }`}
                                            >
                                              • {sub.label}
                                            </button>
                                          );
                                        })}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                        </nav>                     
                    </LayoutGroup>                 
                </aside>                 

                {isMobileMenuOpen && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-zinc-900/20 backdrop-blur-sm z-30 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}                 

                <main className="flex-1 flex flex-col relative overflow-hidden bg-[#F4F4F5] dark:bg-black md:rounded-tl-[2rem] border-t border-l border-zinc-200/50 dark:border-zinc-800 shadow-[-10px_-10px_30px_rgba(0,0,0,0.02)]">                     
                    <AnimatePresence mode="wait">                         
                        {activeView === "agenda" && ( <AgendaView subTab={activeSubView} setSubTab={setActiveSubView} agendamentos={agendamentos} bloqueios={bloqueios} servicos={servicos} fetchAgendamentos={fetchAgendamentos} showToast={showToast} permissoes={loggedAdmin?.permissoes} isOwner={loggedAdmin?.is_owner} /> )}                         
                        {activeView === "conta" && ( <AccountView subTab={activeSubView} setSubTab={setActiveSubView} showToast={showToast} loggedAdmin={loggedAdmin} /> )}
                        {activeView === "politicas" && ( <PoliciesView showToast={showToast} /> )}
                        {activeView === "bloqueios" && ( <RestricoesView subTab={activeSubView} setSubTab={setActiveSubView} regras={regras} fetchRegras={fetchRegras} servicosOptions={servicosOptions} servicos={servicos} showToast={showToast} /> )}                         
                        {activeView === "equipe" && ( <EquipeView subTab={activeSubView} setSubTab={setActiveSubView} servicos={servicos} showToast={showToast} fetchServicos={fetchServicos} /> )}                         
                        {activeView === "triagem" && ( <TriagemView perguntas={perguntas} servicos={servicos} fetchPerguntas={fetchPerguntas} showToast={showToast} /> )}                         
                        {activeView === "personalizacao" && ( <PersonalizacaoView subTab={activeSubView} setSubTab={setActiveSubView} showToast={showToast} servicos={servicos} /> )}                         
                        {activeView === "integracoes" && ( <SyncView bloqueios={bloqueios} servicos={servicos} fetchBloqueios={fetchBloqueios} fetchServicos={fetchServicos} showToast={showToast} /> )}
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
