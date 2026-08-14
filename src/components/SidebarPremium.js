'use client';
import { useEffect, useState } from 'react';
import { usePathname, useParams } from 'next/navigation';
import { House, CalendarDays, CalendarSearch, Sun, Moon, ChevronLeft, Activity } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from "@/lib/supabase";

const sidebarSpring = { type: "spring", stiffness: 300, damping: 30, mass: 1 };
const itemSpring = { type: "spring", stiffness: 400, damping: 30 };

const Tooltip = ({ children, text, isVisible }) => (
  <div className="relative flex items-center group/tooltip w-full">
    {children}
    {isVisible && (
      <div className="absolute left-[calc(100%+20px)] px-3.5 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black text-[10px] font-bold tracking-widest uppercase rounded-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.15)] whitespace-nowrap z-[99999] pointer-events-none">
        {text}
        <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-zinc-900 dark:bg-white rotate-45 rounded-sm" />
      </div>
    )}
  </div>
);

const SidebarItem = ({ href, icon: Icon, label, isExpanded }) => {
  const pathname = usePathname();
  const isAtivo = pathname === href;
  return (
    <Tooltip text={label} isVisible={!isExpanded}>
      <Link 
        href={href} 
        className={`relative flex items-center w-full transition-all duration-300 outline-none group ${
          isAtivo ? "bg-black/[0.02] dark:bg-white/[0.04]" : "hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
        }`}
      >
        {isAtivo && (
          <motion.div 
            layoutId="active-sidebar-bg"
            transition={itemSpring}
            className="absolute inset-0 border-y border-black/5 dark:border-white/5 -z-10 shadow-[inset_0_1px_0px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_0px_rgba(255,255,255,0.02)]" 
          />
        )}
        
        {isAtivo && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-zinc-900 dark:bg-white rounded-r-sm" />
        )}
        
        <div className="flex items-center justify-center w-[88px] h-[56px] shrink-0">
          <Icon 
            size={20} 
            strokeWidth={isAtivo ? 2 : 1.5} 
            className={`transition-colors duration-300 ${
              isAtivo 
                ? "text-zinc-900 dark:text-white" 
                : "text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200"
            }`} 
          />
        </div>
        
        <AnimatePresence mode="wait">
          {isExpanded && (
            <motion.div 
              initial={{ opacity: 0, filter: "blur(4px)", x: -10 }}
              animate={{ opacity: 1, filter: "blur(0px)", x: 0 }}
              exit={{ opacity: 0, filter: "blur(4px)", x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 overflow-hidden pr-6"
            >
              <span className={`text-[13px] tracking-wide whitespace-nowrap transition-colors ${
                isAtivo ? "font-semibold text-zinc-900 dark:text-white" : "font-medium text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200"
              }`}>
                {label}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </Link>
    </Tooltip>
  );
};

export default function SidebarPremium({ isExpanded, setIsExpanded }) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [empresaNome, setEmpresaNome] = useState("RM AGENDA");
  const [empresaLogo, setEmpresaLogo] = useState(null);
  const [lastSlug, setLastSlug] = useState("");
  
  const params = useParams();
  const currentSlug = params?.slug;

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('rmagenda_theme') || localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDark(true); document.documentElement.classList.add('dark');
    } else {
      setIsDark(false); document.documentElement.classList.remove('dark');
    }

    const targetSlug = currentSlug || localStorage.getItem('rmagenda_last_slug') || localStorage.getItem('rmcare_last_slug');
    if (targetSlug) {
      setLastSlug(targetSlug);
      supabase.from('empresas').select('nome, logo_url, config_campos').eq('slug', targetSlug).maybeSingle().then(({ data }) => {
        if (data) {
          if (data.nome) setEmpresaNome(data.nome);
          const logo = data.logo_url || data.config_campos?.logo_url;
          if (logo) setEmpresaLogo(logo);
        }
      });
    }
  }, [currentSlug]);

  const toggleTheme = () => {
    const nextState = !isDark;
    setIsDark(nextState);
    if (nextState) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('rmagenda_theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('rmagenda_theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  };

  const agendamentoHref = lastSlug ? `/${lastSlug}/agendamentos` : "/";

  if (!mounted) return null;

  return (
    <motion.aside 
      initial={false}
      animate={{ width: isExpanded ? 280 : 88 }}
      transition={sidebarSpring}
      className="hidden md:flex flex-col fixed inset-y-0 left-0 z-[99999] bg-[#FAFAFA]/80 dark:bg-[#050505]/80 backdrop-blur-3xl saturate-150 border-r border-zinc-200/80 dark:border-white/[0.06] shadow-[10px_0_50px_rgba(0,0,0,0.02)] dark:shadow-[10px_0_50px_rgba(0,0,0,0.3)] overflow-visible"
    >
      <div className="absolute top-10 -right-3.5 z-[999999]">
         <motion.button 
           whileHover={{ scale: 1.1 }}
           whileTap={{ scale: 0.9 }}
           onClick={() => setIsExpanded(!isExpanded)} 
           className="w-7 h-7 bg-white dark:bg-[#111111] border border-zinc-200 dark:border-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white shadow-sm hover:shadow-md transition-all outline-none"
         >
            <motion.div animate={{ rotate: isExpanded ? 0 : 180 }} transition={{ duration: 0.3, ease: "easeInOut" }}>
              <ChevronLeft size={14} strokeWidth={2.5} />
            </motion.div>
         </motion.button>
      </div>

      <div className="mt-10 mb-10 flex items-center h-12 w-full">
        <Link href="/" className="flex items-center group w-full outline-none">
          <div className="w-[88px] flex justify-center shrink-0">
            {empresaLogo ? (
              <div className="w-10 h-10 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-1 flex items-center justify-center shadow-sm overflow-hidden">
                <img src={empresaLogo} alt={empresaNome} className="max-h-full max-w-full object-contain" />
              </div>
            ) : (
              <div className="relative w-10 h-10 bg-zinc-900 dark:bg-white rounded-2xl flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.1)] transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3">
                <Activity className="text-white dark:text-zinc-900" size={20} strokeWidth={2.5} />
                <div className="absolute top-1 right-1 w-2 h-2 bg-[#9FC131] rounded-full shadow-[0_0_8px_rgba(159,193,49,0.8)]" />
              </div>
            )}
          </div>
          
          <AnimatePresence>
            {isExpanded && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex flex-col whitespace-nowrap overflow-hidden flex-1 pr-6"
              >
                <span className="font-semibold text-[15px] tracking-tight text-zinc-900 dark:text-white leading-none mb-1">{empresaNome.toUpperCase()}</span>
                <span className="text-[9px] font-bold tracking-[0.2em] text-zinc-400 uppercase">Plataforma RMAgenda</span>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
      </div>

      <nav className="flex-1 flex flex-col w-full overflow-y-auto overflow-x-hidden custom-scrollbar">
        <SidebarItem href="/" icon={House} label="Início da Plataforma" isExpanded={isExpanded} />
        <SidebarItem href={agendamentoHref} icon={CalendarDays} label="Agendamentos" isExpanded={isExpanded} />
        <SidebarItem href="/consultar" icon={CalendarSearch} label="Consultar Histórico" isExpanded={isExpanded} />
      </nav>

      <div className="pb-8 pt-4 w-full flex flex-col items-center border-t border-zinc-200/80 dark:border-white/[0.04]">
        <Tooltip text={isDark ? "Mudar para Claro" : "Mudar para Noturno"} isVisible={!isExpanded}>
          <button 
            onClick={toggleTheme}
            className="flex items-center bg-zinc-100/50 dark:bg-[#111111]/50 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl transition-all duration-300 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 outline-none group mx-4 w-[calc(100%-32px)] h-[48px] overflow-hidden"
          >
            <div className="w-[56px] flex justify-center shrink-0">
              <AnimatePresence mode="wait">
                {isDark ? (
                  <motion.div key="moon" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                    <Moon className="text-zinc-500 group-hover:text-white transition-colors" size={18} strokeWidth={2} />
                  </motion.div>
                ) : (
                  <motion.div key="sun" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                    <Sun className="text-zinc-500 group-hover:text-zinc-900 transition-colors" size={18} strokeWidth={2} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <AnimatePresence>
              {isExpanded && (
                <motion.div 
                  initial={{ opacity: 0, width: 0 }} 
                  animate={{ opacity: 1, width: "auto" }} 
                  exit={{ opacity: 0, width: 0 }} 
                  className="flex-1 flex items-center justify-between pr-4 overflow-hidden"
                >
                  <span className="text-[12px] font-semibold text-zinc-600 dark:text-zinc-400 tracking-wide whitespace-nowrap">
                    {isDark ? "Tema Claro" : "Tema Noturno"}
                  </span>
                  
                  <div className="w-9 h-5 bg-zinc-200 dark:bg-zinc-800 rounded-full relative flex items-center shadow-inner shrink-0 overflow-hidden border border-black/5 dark:border-white/5">
                    <motion.div 
                      layout
                      transition={itemSpring}
                      className={`w-3.5 h-3.5 rounded-full absolute shadow-sm ${isDark ? 'right-1 bg-white' : 'left-1 bg-zinc-900'}`} 
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </Tooltip>
      </div>
    </motion.aside>
  );
}
