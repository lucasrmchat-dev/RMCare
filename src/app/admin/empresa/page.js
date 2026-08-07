"use client"; 
import { useState, useEffect } from "react"; 
import { motion, AnimatePresence, LayoutGroup } from "framer-motion"; 
import { CalendarDays, Zap, X, Users, FileQuestion, Menu, Clock3, CheckCircle2, AlertCircle, LayoutTemplate, CreditCard, KeyRound } from "lucide-react"; 
import Navbar from "@/components/Navbar"; 
import AdminSessionBar from "@/components/AdminSessionBar";
import { SidebarItem, spring } from "./components/SharedUI"; 
import { fetchAdminBloqueios, fetchAdminAgendamentos, fetchAdminServicos, fetchAdminPerguntas, fetchAdminRegras } from "@/actions/adminData"; 
import AgendaView from "./modules/AgendaView"; 
import RestricoesView from "./modules/RestricoesView"; 
import FinanceiroView from "./modules/FinanceiroView"; 
import TriagemView from "./modules/TriagemView"; 
import SyncView from "./modules/SyncView"; 
import PersonalizacaoView from "./modules/PersonalizacaoView"; 
import IntegracoesView from "./modules/IntegracoesView"; 
import AccountView from "./modules/AccountView";
import PoliciesView from "./modules/PoliciesView";

export default function EmpresaAdmin() {     
    const [activeView, setActiveView] = useState("agenda");     
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);     
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

    // Os carregamentos são independentes e exibem feedback individual em caso de falha.
    useEffect(() => { fetchAllData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleMenuClick = (id) => {         
        setActiveView(id); setIsMobileMenuOpen(false);     
    };     

    // CORREÇÃO: Removemos o fallback "Todos" para não quebrar o UUID no banco     
    const servicosOptions = (servicos || []).map(s => ({ value: s.id, label: s.nome }));     

    return (         
        <div className="h-screen w-screen bg-[#F4F4F5] flex flex-col font-sans overflow-hidden text-zinc-900 selection:bg-zinc-900 selection:text-white">             
            <AdminSessionBar />
            <motion.button whileTap={{ scale: 0.9 }} className="md:hidden fixed bottom-6 right-6 z-50 p-4 bg-zinc-900 text-white rounded-full shadow-2xl" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>                 
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}             
            </motion.button>             
            <AnimatePresence>                 
                {toast && (                     
                    <motion.div initial={{ opacity: 0, y: -40, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.9 }} transition={spring}                         className="fixed top-24 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-3 px-5 py-3 rounded-full bg-zinc-900/90 backdrop-blur-md text-white shadow-xl border border-white/10">                         
                        {toast.type === "success" ? <CheckCircle2 size={16} className="text-green-400" /> : <AlertCircle size={16} className="text-red-400" />}                         
                        <span className="text-sm font-medium tracking-wide">{toast.msg}</span>                     
                    </motion.div>                 
                )}             
            </AnimatePresence>             
            <div className="flex flex-1 overflow-hidden relative">                 
                <aside className={`absolute md:relative z-40 h-full w-[260px] bg-white border-r border-zinc-200/60 flex flex-col p-4 transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}`}>                     
                    <div className="mb-8 px-4 pt-4">                         
                        <h2 className="text-[11px] font-semibold text-zinc-400 mb-1">RMCare</h2>                         
                        <p className="text-xl font-semibold text-zinc-900 tracking-tight">Administração</p>                     
                    </div>                     
                    <LayoutGroup>                         
                        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto custom-scrollbar">                             
                            <SidebarItem id="agenda" icon={CalendarDays} label="Agenda" activeView={activeView} onClick={handleMenuClick} />                             
                            <SidebarItem id="bloqueios" icon={Clock3} label="Horários e duração" activeView={activeView} onClick={handleMenuClick} />
                            <SidebarItem id="politicas" icon={FileQuestion} label="Políticas de atendimento" activeView={activeView} onClick={handleMenuClick} />
                            <SidebarItem id="triagem" icon={LayoutTemplate} label="Formulários clínicos" activeView={activeView} onClick={handleMenuClick} />                             
                            <SidebarItem id="personalizacao" icon={Zap} label="Mensagens e jornada" activeView={activeView} onClick={handleMenuClick} />
                            <SidebarItem id="equipe" icon={Users} label="Serviços e profissionais" activeView={activeView} onClick={handleMenuClick} />                             
                            <SidebarItem id="integracoes" icon={CreditCard} label="Pagamentos" activeView={activeView} onClick={handleMenuClick} />                             
                            <SidebarItem id="conta" icon={KeyRound} label="Acesso e segurança" activeView={activeView} onClick={handleMenuClick} />
                            <div className="mt-auto pt-4">                                 
                                <SidebarItem id="sync" icon={Zap} label="Integração ERP" activeView={activeView} onClick={handleMenuClick} />                             
                            </div>                         
                        </nav>                     
                    </LayoutGroup>                 
                </aside>                 
                {isMobileMenuOpen && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-zinc-900/20 backdrop-blur-sm z-30 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}                 
                <main className="flex-1 flex flex-col relative overflow-hidden bg-[#F4F4F5] md:rounded-tl-[2rem] border-t border-l border-zinc-200/50 shadow-[-10px_-10px_30px_rgba(0,0,0,0.02)]">                     
                    <AnimatePresence mode="wait">                         
                        {activeView === "agenda" && ( <AgendaView agendamentos={agendamentos} bloqueios={bloqueios} servicos={servicos} fetchAgendamentos={fetchAgendamentos} showToast={showToast} /> )}                         
                        {activeView === "conta" && ( <AccountView showToast={showToast} /> )}
                        {activeView === "politicas" && ( <PoliciesView showToast={showToast} /> )}
                        {activeView === "bloqueios" && ( <RestricoesView regras={regras} fetchRegras={fetchRegras} servicosOptions={servicosOptions} servicos={servicos} showToast={showToast} /> )}                         
                        {activeView === "equipe" && ( <FinanceiroView servicos={servicos} showToast={showToast} fetchServicos={fetchServicos} /> )}                         
                        {activeView === "triagem" && ( <TriagemView perguntas={perguntas} servicos={servicos} fetchPerguntas={fetchPerguntas} showToast={showToast} /> )}                         
                        {activeView === "personalizacao" && ( <PersonalizacaoView showToast={showToast} servicos={servicos} /> )}                         
                        {activeView === "integracoes" && ( <IntegracoesView showToast={showToast} /> )}                         
                        {activeView === "sync" && ( <SyncView bloqueios={bloqueios} fetchBloqueios={fetchBloqueios} fetchServicos={fetchServicos} servicos={servicos} showToast={showToast} /> )}                     
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
