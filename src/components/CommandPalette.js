"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Calendar,
  CalendarCheck,
  Building2,
  Moon,
  Sun,
  ShieldCheck,
  Command,
  ArrowRight,
  Sparkles,
  KeyRound,
  X,
  Volume2,
  VolumeX
} from "lucide-react";
import { playDopamineSound, triggerConfetti, triggerHaptic } from "@/lib/dopamine";

export default function CommandPalette() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isDark, setIsDark] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [lastSlug, setLastSlug] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsDark(document.documentElement.classList.contains("dark"));
    setIsMuted(localStorage.getItem("rmcare_sound_muted") === "true");
    const slug = localStorage.getItem("rmagenda_last_slug") || localStorage.getItem("rmcare_last_slug") || "";
    if (slug) setLastSlug(slug);

    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => {
          if (!prev) {
            playDopamineSound("select");
            triggerHaptic("light");
          }
          return !prev;
        });
      }

      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const toggleTheme = () => {
    const nextState = !isDark;
    setIsDark(nextState);
    if (nextState) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("rmagenda_theme", "dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("rmagenda_theme", "light");
      localStorage.setItem("theme", "light");
    }
    playDopamineSound("click");
    triggerHaptic("light");
  };

  const toggleSound = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    localStorage.setItem("rmcare_sound_muted", String(nextMuted));
    if (!nextMuted) playDopamineSound("select");
  };

  const actions = useMemo(() => {
    const agendamentoUrl = lastSlug ? `/${lastSlug}/agendamentos` : "/";
    return [
      {
        id: "inicio",
        title: "Início da Plataforma",
        desc: "Ir para a página inicial de busca de clínicas",
        icon: Building2,
        category: "Navegação",
        perform: () => router.push("/")
      },
      {
        id: "agendar",
        title: "Novo Agendamento Clínico",
        desc: "Agendar consultas, exames ou procedimentos",
        icon: Calendar,
        category: "Navegação",
        perform: () => router.push(agendamentoUrl)
      },
      {
        id: "consultar",
        title: "Consultar Histórico de Agendamentos",
        desc: "Acessar, remarcar ou cancelar agendamentos existentes",
        icon: CalendarCheck,
        category: "Navegação",
        perform: () => router.push("/consultar")
      },
      {
        id: "login",
        title: "Acesso Administrativo / Login",
        desc: "Entrar no painel de controle da sua clínica",
        icon: KeyRound,
        category: "Acesso",
        perform: () => router.push("/login")
      },
      {
        id: "admin_empresa",
        title: "Painel da Clínica (Admin)",
        desc: "Visualizar agenda diária, equipe, regras e bloqueios",
        icon: ShieldCheck,
        category: "Acesso",
        perform: () => router.push("/admin/empresa")
      },
      {
        id: "theme",
        title: isDark ? "Mudar para Tema Claro" : "Mudar para Tema Noturno",
        desc: "Alternar modo de cores do sistema",
        icon: isDark ? Sun : Moon,
        category: "Preferências",
        perform: toggleTheme
      },
      {
        id: "sound",
        title: isMuted ? "Ativar Efeitos Sonoros Táteis" : "Silenciar Efeitos Sonoros",
        desc: "Micro-respostas e feedbacks auditivos do app",
        icon: isMuted ? VolumeX : Volume2,
        category: "Preferências",
        perform: toggleSound
      },
      {
        id: "celebrate",
        title: "Disparar Micro-Recompensa (Confetti)",
        desc: "Testar a animação e o som de vitória do sistema",
        icon: Sparkles,
        category: "Experiência",
        perform: () => {
          playDopamineSound("success");
          triggerConfetti({ count: 120 });
          triggerHaptic("success");
        }
      }
    ];
  }, [lastSlug, isDark, isMuted, router]);

  const filteredActions = useMemo(() => {
    if (!query.trim()) return actions;
    const q = query.toLowerCase().trim();
    return actions.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.desc.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
    );
  }, [actions, query]);

  const handleSelectAction = (action) => {
    playDopamineSound("select");
    triggerHaptic("light");
    setIsOpen(false);
    action.perform();
  };

  const handleKeyDown = (e) => {
    if (filteredActions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredActions.length);
      playDopamineSound("click");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredActions.length) % filteredActions.length);
      playDopamineSound("click");
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = filteredActions[selectedIndex];
      if (target) handleSelectAction(target);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-md flex items-start justify-center pt-20 sm:pt-28 px-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: -16, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: -16, opacity: 0 }}
              transition={{ type: "spring", stiffness: 450, damping: 32 }}
              className="w-full max-w-xl bg-white/90 dark:bg-[#0c0c0e]/90 backdrop-blur-3xl saturate-150 border border-zinc-200/80 dark:border-white/10 rounded-[2rem] shadow-[0_30px_90px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_30px_90px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08)] overflow-hidden flex flex-col max-h-[75vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center px-5 py-4 border-b border-zinc-200/60 dark:border-white/5 gap-3">
                <Search size={18} className="text-zinc-400 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="O que você deseja fazer? (Ex: agendar, tema, consultar)..."
                  className="w-full bg-transparent text-sm md:text-base font-medium text-zinc-900 dark:text-white outline-none placeholder:text-zinc-400"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-full"
                  >
                    <X size={16} />
                  </button>
                )}
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-1 text-[10px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-md border border-zinc-200 dark:border-zinc-700">
                  ESC
                </kbd>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
                {filteredActions.length === 0 ? (
                  <div className="py-12 text-center text-zinc-400 text-xs font-medium">
                    Nenhum comando ou atalho correspondente.
                  </div>
                ) : (
                  filteredActions.map((action, idx) => {
                    const isSelected = selectedIndex === idx;
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.id}
                        onClick={() => handleSelectAction(action)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left transition-all ${
                          isSelected
                            ? "bg-zinc-900 text-white dark:bg-white dark:text-black shadow-md scale-[1.01] font-semibold"
                            : "hover:bg-zinc-100/70 dark:hover:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? "bg-white/20 text-white dark:bg-black/20 dark:text-black"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                            }`}
                          >
                            <Icon size={18} />
                          </div>
                          <div className="truncate">
                            <p className="text-xs md:text-sm font-bold truncate">{action.title}</p>
                            <p
                              className={`text-[11px] truncate ${
                                isSelected ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-400"
                              }`}
                            >
                              {action.desc}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <span
                            className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${
                              isSelected
                                ? "bg-white/20 dark:bg-black/20 text-white dark:text-black"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            {action.category}
                          </span>
                          <ArrowRight
                            size={14}
                            className={`transition-transform ${
                              isSelected ? "translate-x-1 opacity-100" : "opacity-0"
                            }`}
                          />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="px-5 py-3 border-t border-zinc-200/60 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-950/40 flex items-center justify-between text-[11px] text-zinc-400">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 rounded bg-zinc-200/60 dark:bg-zinc-800 font-mono text-[9px] font-bold">
                      ↑↓
                    </kbd>
                    Navegar
                  </span>
                  <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 rounded bg-zinc-200/60 dark:bg-zinc-800 font-mono text-[9px] font-bold">
                      ENTER
                    </kbd>
                    Executar
                  </span>
                </div>
                <div className="flex items-center gap-1 font-semibold text-zinc-500 dark:text-zinc-400">
                  <Command size={12} /> RMAgenda Quick Actions
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
