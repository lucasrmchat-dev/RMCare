"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  CalendarDays,
  Clock3,
  FileQuestion,
  LayoutTemplate,
  Palette,
  Users,
  Link2,
  KeyRound,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Lock
} from "lucide-react";
import AdminSessionBar from "@/components/AdminSessionBar";
import { spring } from "./components/SharedUI";
import {
  fetchAdminBloqueios,
  fetchAdminAgendamentos,
  fetchAdminServicos,
  fetchAdminPerguntas,
  fetchAdminRegras,
  fetchAdminCustomization
} from "@/actions/adminData";
import { getSessionAdminInfo } from "@/actions/auth";
import AgendaView from "./modules/AgendaView";
import MetricasView from "./modules/MetricasView";
import RestricoesView from "./modules/RestricoesView";
import EquipeView from "./modules/EquipeView";
import TriagemView from "./modules/TriagemView";
import PersonalizacaoView from "./modules/PersonalizacaoView";
import AccountView from "./modules/AccountView";
import PoliciesView from "./modules/PoliciesView";
import SyncView from "./modules/SyncView";
import { playDopamineSound, triggerHaptic } from "@/lib/dopamine";

export default function EmpresaAdmin() {
  const [activeView, setActiveView] = useState("agenda");
  const [activeSubView, setActiveSubView] = useState("calendario");
  const [expandedMenu, setExpandedMenu] = useState("agenda");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [loggedAdmin, setLoggedAdmin] = useState(null);
  const [bloqueios, setBloqueios] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [perguntas, setPerguntas] = useState([]);
  const [regras, setRegras] = useState([]);
  const [toast, setToast] = useState(null);

  const fetchAllData = async () => {
    fetchBloqueios();
    fetchAgendamentos();
    fetchServicos();
    fetchPerguntas();
    fetchRegras();
    try {
      const emp = await fetchAdminCustomization();
      if (emp?.config_campos?.tema && typeof window !== "undefined") {
        const tema = emp.config_campos.tema;
        const escopo = tema.escopo_tema || "ambos";
        if (escopo === "ambos" || escopo === "admin") {
          const root = document.documentElement;
          if (tema.cor_primaria) {
            root.style.setProperty("--brand-primary", tema.cor_primaria);
            localStorage.setItem("rmcare_brand_primary", tema.cor_primaria);
          }
          if (tema.cor_secundaria) {
            root.style.setProperty("--brand-secondary", tema.cor_secundaria);
            localStorage.setItem("rmcare_brand_secondary", tema.cor_secundaria);
          }
        }
      }
    } catch (e) {}
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    if (type === "success") {
      playDopamineSound("step");
      triggerHaptic("light");
    } else {
      playDopamineSound("error");
      triggerHaptic("error");
    }
    setTimeout(() => setToast(null), 3500);
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
      showToast("Erro ao carregar triagem.", "error");
    }
  };

  const fetchRegras = async () => {
    try {
      const data = await fetchAdminRegras();
      setRegras(data || []);
    } catch (error) {
      showToast("Erro ao carregar regras.", "error");
    }
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

  // Estrutura completa de navegação com sub-menus e nomes autoexplicativos
  const baseMenuStructure = useMemo(
    () => [
      {
        id: "agenda",
        label: "Agenda",
        icon: CalendarDays,
        subItems: [
          { id: "calendario", label: "Pacientes do Dia" },
          { id: "lista", label: "Todos os Pacientes" }
        ]
      },
      {
        id: "metricas",
        label: "Métricas",
        icon: BarChart3,
        subItems: [
          { id: "visao_geral", label: "Visão Geral" },
          { id: "financeiro", label: "Financeiro & Faturamento" },
          { id: "pacientes", label: "Pacientes & Demografia" },
          { id: "especialidades", label: "Especialidades & Equipe" },
          { id: "operacional", label: "Operacional & Jornada" }
        ]
      },
      {
        id: "equipe",
        label: "Corpo Clínico",
        icon: Users,
        subItems: [
          { id: "corpo", label: "Lista de Especialistas" },
          { id: "formulario", label: "Cadastrar Especialista" },
          { id: "especialidades", label: "Especialidades" },
          { id: "modalidades", label: "Modalidades & Convênios" },
          { id: "pausas", label: "Pausas na Agenda" }
        ]
      },
      {
        id: "bloqueios",
        label: "Horários & Duração",
        icon: Clock3,
        subItems: [
          { id: "configurados", label: "Horários Configurados" },
          { id: "adicionar", label: "Adicionar Horário" }
        ]
      },
      {
        id: "politicas",
        label: "Políticas",
        icon: FileQuestion
      },
      {
        id: "triagem",
        label: "Triagem Clínica",
        icon: LayoutTemplate
      },
      {
        id: "personalizacao",
        label: "Aparência & Mensagens",
        icon: Palette,
        subItems: [
          { id: "jornada", label: "Identificação & Logo" },
          { id: "aparencia", label: "Design & Cores" },
          { id: "mensagens", label: "Mensagens WhatsApp" },
          { id: "historico_mensagens", label: "Histórico de Envios" }
        ]
      },
      {
        id: "integracoes",
        label: "Integrações ERP",
        icon: Link2
      },
      {
        id: "conta",
        label: "Acesso & Segurança",
        icon: KeyRound,
        subItems: [
          { id: "credenciais", label: "Minhas Credenciais" },
          { id: "usuarios", label: "Usuários & Permissões" },
          { id: "auditoria", label: "Auditoria do Sistema" }
        ]
      }
    ],
    []
  );

  const menuStructure = useMemo(() => {
    if (!loggedAdmin) return baseMenuStructure;
    if (loggedAdmin.is_owner || loggedAdmin.role === "sistema") return baseMenuStructure;

    const userPerms = loggedAdmin.permissoes || ["agenda", "metricas"];
    return baseMenuStructure.filter((item) => {
      if (item.id === "conta") return true;
      return userPerms.includes(item.id);
    });
  }, [loggedAdmin, baseMenuStructure]);

  const handleMainMenuClick = (item) => {
    playDopamineSound("click");
    triggerHaptic("light");
    setActiveView(item.id);

    if (item.subItems && item.subItems.length > 0) {
      if (isSidebarCollapsed) {
        setIsSidebarCollapsed(false);
        setExpandedMenu(item.id);
        setActiveSubView(item.subItems[0].id);
      } else {
        const isCurrentlyExpanded = expandedMenu === item.id;
        setExpandedMenu(isCurrentlyExpanded ? null : item.id);
        if (!isCurrentlyExpanded) {
          setActiveSubView(item.subItems[0].id);
        }
      }
    } else {
      setExpandedMenu(null);
      setActiveSubView("");
    }
    setIsMobileMenuOpen(false);
  };

  const handleSubMenuClick = (parentId, subId) => {
    playDopamineSound("select");
    triggerHaptic("light");
    setActiveView(parentId);
    setActiveSubView(subId);
    setExpandedMenu(parentId);
    setIsMobileMenuOpen(false);
  };

  const servicosOptions = (servicos || []).map((s) => ({ value: s.id, label: s.nome }));

  return (
    <div className="h-screen w-screen bg-[#F8FAFC] dark:bg-[#060A12] flex flex-col font-sans overflow-hidden text-zinc-900 dark:text-white selection:bg-[#9FC131] selection:text-black">
      <AdminSessionBar />

      <motion.button
        whileTap={{ scale: 0.9 }}
        aria-label="Abrir menu de navegação"
        className="md:hidden fixed bottom-5 right-5 z-50 p-3.5 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-full shadow-2xl min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </motion.button>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={spring}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-zinc-950/90 dark:bg-white/95 backdrop-blur-2xl text-white dark:text-black shadow-xl border border-white/10 dark:border-black/10"
          >
            {toast.type === "success" ? (
              <CheckCircle2 size={15} className="text-[#9FC131] dark:text-[#86a621]" />
            ) : (
              <AlertCircle size={15} className="text-red-400" />
            )}
            <span className="text-xs font-bold tracking-wide">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 overflow-hidden relative">
        <aside
          className={`absolute md:relative z-40 h-full bg-white/80 dark:bg-[#08080a]/85 backdrop-blur-3xl saturate-180 border-r border-zinc-200/70 dark:border-white/[0.08] flex flex-col py-4 px-3 transition-all duration-300 ease-out ${
            isMobileMenuOpen
              ? "translate-x-0 w-[250px] shadow-2xl"
              : "-translate-x-full md:translate-x-0"
          } ${isSidebarCollapsed ? "md:w-[68px]" : "md:w-[250px]"}`}
        >
          {/* TOPO DA SIDEBAR */}
          <div className="flex items-center justify-between mb-3 px-1">
            {!isSidebarCollapsed && (
              <div className="overflow-hidden">
                <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block">
                  Gestão Clínica
                </span>
                <p className="text-sm font-black text-zinc-950 dark:text-white tracking-tight truncate">
                  Painel de Controle
                </p>
              </div>
            )}
            <button
              onClick={() => {
                playDopamineSound("click");
                triggerHaptic("light");
                setIsSidebarCollapsed(!isSidebarCollapsed);
              }}
              title={isSidebarCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
              className="hidden md:flex p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ml-auto cursor-pointer"
            >
              <ChevronLeft
                size={16}
                className={`transition-transform duration-200 ${
                  isSidebarCollapsed ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>

          {/* NAVEGAÇÃO APPLE DESIGN */}
          <LayoutGroup>
            <nav className="flex flex-col gap-1 flex-1 overflow-y-auto custom-scrollbar pr-0.5">
              {menuStructure.map((item) => {
                const Icon = item.icon;
                const isMainActive = activeView === item.id;
                const isExpanded = expandedMenu === item.id;
                const hasSub = item.subItems && item.subItems.length > 0;

                return (
                  <div key={item.id} className="flex flex-col">
                    <button
                      onClick={() => handleMainMenuClick(item)}
                      title={isSidebarCollapsed ? item.label : undefined}
                      className={`group relative flex items-center w-full min-h-[38px] rounded-xl text-xs transition-all duration-200 cursor-pointer ${
                        isMainActive
                          ? "bg-zinc-950 text-white dark:bg-white dark:text-black font-bold shadow-sm"
                          : isExpanded
                          ? "bg-zinc-100/60 dark:bg-white/[0.04] text-zinc-950 dark:text-white font-semibold"
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/50 hover:text-zinc-950 dark:hover:text-white font-medium"
                      } ${isSidebarCollapsed ? "justify-center px-0" : "px-3 justify-between"}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          size={16}
                          strokeWidth={isMainActive ? 2 : 1.5}
                          className={`shrink-0 transition-colors ${
                            isMainActive
                              ? "text-white dark:text-black"
                              : "text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300"
                          }`}
                        />
                        {!isSidebarCollapsed && (
                          <span className="truncate text-left whitespace-nowrap">{item.label}</span>
                        )}
                      </div>

                      {!isSidebarCollapsed && hasSub && (
                        <div className="text-zinc-400 ml-1 shrink-0">
                          <ChevronRight
                            size={13}
                            className={`transition-transform duration-200 ${
                              isExpanded ? "rotate-90 text-zinc-900 dark:text-white" : ""
                            }`}
                          />
                        </div>
                      )}
                    </button>

                    {/* SUB-MENU ESTILO TREE VIEW */}
                    <AnimatePresence initial={false}>
                      {!isSidebarCollapsed && hasSub && isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ type: "spring", stiffness: 450, damping: 32 }}
                          className="relative pl-3 ml-4.5 my-1 border-l border-zinc-200/90 dark:border-zinc-800 space-y-0.5 overflow-hidden"
                        >
                          {item.subItems.map((sub) => {
                            const isSubActive = isMainActive && activeSubView === sub.id;
                            return (
                              <button
                                key={sub.id}
                                onClick={() => handleSubMenuClick(item.id, sub.id)}
                                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11.5px] transition-all min-h-[30px] flex items-center gap-2 group cursor-pointer ${
                                  isSubActive
                                    ? "bg-zinc-900/[0.06] dark:bg-white/10 text-zinc-950 dark:text-white font-bold shadow-[inset_0_0.5px_0_rgba(255,255,255,0.6)] dark:shadow-[inset_0_0.5px_0_rgba(255,255,255,0.08)]"
                                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.04] font-medium"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${
                                    isSubActive
                                      ? "bg-[#9FC131] shadow-[0_0_6px_rgba(159,193,49,0.8)]"
                                      : "bg-zinc-300 dark:bg-zinc-700 opacity-50 group-hover:opacity-100"
                                  }`}
                                />
                                <span className="truncate">{sub.label}</span>
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

        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        <main className="flex-1 flex flex-col relative overflow-hidden bg-[#F8FAFC] dark:bg-[#060A12]">
          <AnimatePresence mode="wait">
            {activeView === "agenda" && (
              <AgendaView
                subTab={activeSubView}
                setSubTab={setActiveSubView}
                agendamentos={agendamentos}
                bloqueios={bloqueios}
                servicos={servicos}
                fetchAgendamentos={fetchAgendamentos}
                showToast={showToast}
                permissoes={loggedAdmin?.permissoes}
                isOwner={loggedAdmin?.is_owner}
              />
            )}
            {activeView === "metricas" && (
              <MetricasView
                subTab={activeSubView}
                setSubTab={setActiveSubView}
                agendamentos={agendamentos}
                servicos={servicos}
                bloqueios={bloqueios}
                showToast={showToast}
              />
            )}
            {activeView === "equipe" && (
              <EquipeView
                subTab={activeSubView}
                setSubTab={setActiveSubView}
                servicos={servicos}
                showToast={showToast}
                fetchServicos={fetchServicos}
                permissoes={loggedAdmin?.permissoes}
                isOwner={loggedAdmin?.is_owner}
              />
            )}
            {activeView === "bloqueios" && (
              <RestricoesView
                subTab={activeSubView}
                setSubTab={setActiveSubView}
                regras={regras}
                fetchRegras={fetchRegras}
                servicosOptions={servicosOptions}
                servicos={servicos}
                showToast={showToast}
              />
            )}
            {activeView === "politicas" && <PoliciesView showToast={showToast} />}
            {activeView === "triagem" && (
              <TriagemView
                perguntas={perguntas}
                servicos={servicos}
                fetchPerguntas={fetchPerguntas}
                showToast={showToast}
              />
            )}
            {activeView === "personalizacao" && (
              <PersonalizacaoView
                subTab={activeSubView}
                showToast={showToast}
                servicos={servicos}
              />
            )}
            {activeView === "integracoes" && (
              <SyncView
                bloqueios={bloqueios}
                servicos={servicos}
                fetchBloqueios={fetchBloqueios}
                fetchServicos={fetchServicos}
                showToast={showToast}
              />
            )}
            {activeView === "conta" && (
              <AccountView
                subTab={activeSubView}
                showToast={showToast}
                loggedAdmin={loggedAdmin}
                permissoes={loggedAdmin?.permissoes}
                isOwner={loggedAdmin?.is_owner}
              />
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
