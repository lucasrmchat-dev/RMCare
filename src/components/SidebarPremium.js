'use client';

import { useEffect, useState } from 'react';
import { usePathname, useParams } from 'next/navigation';
import {
  House,
  CalendarDays,
  CalendarSearch,
  Sun,
  Moon,
  ChevronLeft,
  Activity
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { playDopamineSound, triggerHaptic } from '@/lib/dopamine';

const sidebarSpring = { type: 'spring', stiffness: 320, damping: 30, mass: 0.9 };
const itemSpring = { type: 'spring', stiffness: 420, damping: 28 };

const Tooltip = ({ children, text, isVisible }) => (
  <div className="relative flex items-center group/tooltip w-full">
    {children}
    {isVisible && (
      <div className="absolute left-[calc(100%+12px)] px-3 py-1.5 bg-zinc-900/95 dark:bg-white/95 backdrop-blur-md text-white dark:text-black text-[10px] font-bold tracking-wider uppercase rounded-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-150 shadow-md whitespace-nowrap z-[99999] pointer-events-none flex items-center gap-1.5 border border-white/10 dark:border-black/10">
        <span>{text}</span>
        <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-zinc-900/95 dark:bg-white/95 rotate-45 rounded-sm" />
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
        aria-label={label}
        onClick={() => {
          playDopamineSound('click');
          triggerHaptic('light');
        }}
        className={`relative flex items-center w-full transition-all duration-200 outline-none group min-h-[46px] rounded-2xl mx-2 w-[calc(100%-16px)] ${
          isAtivo
            ? 'bg-zinc-100 dark:bg-white/[0.08] text-zinc-950 dark:text-white font-bold'
            : 'hover:bg-zinc-100/60 dark:hover:bg-white/[0.03] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-medium'
        }`}
      >
        <div className="flex items-center justify-center w-[52px] h-[46px] shrink-0">
          <Icon
            size={18}
            strokeWidth={isAtivo ? 1.75 : 1.35}
            className={`transition-colors duration-200 ${
              isAtivo
                ? 'text-zinc-950 dark:text-white'
                : 'text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200'
            }`}
          />
        </div>

        <AnimatePresence mode="wait">
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.15 }}
              className="flex-1 overflow-hidden pr-4"
            >
              <span className="text-xs tracking-tight whitespace-nowrap truncate block">
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
  const [empresaNome, setEmpresaNome] = useState('RM AGENDA');
  const [empresaLogo, setEmpresaLogo] = useState(null);
  const [lastSlug, setLastSlug] = useState('');

  const params = useParams();
  const currentSlug = params?.slug;

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('rmagenda_theme') || localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }

    const targetSlug =
      currentSlug ||
      localStorage.getItem('rmagenda_last_slug') ||
      localStorage.getItem('rmcare_last_slug');
    if (targetSlug) {
      setLastSlug(targetSlug);
      supabase
        .from('empresas')
        .select('nome, logo_url, config_campos')
        .eq('slug', targetSlug)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            if (data.nome) setEmpresaNome(data.nome);
            const logo = data.logo_url || data.config_campos?.logo_url;
            if (logo) setEmpresaLogo(logo);
          }
        });
    }
  }, [currentSlug]);

  const toggleTheme = () => {
    playDopamineSound('click');
    triggerHaptic('light');
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

  const agendamentoHref = lastSlug ? `/${lastSlug}/agendamentos` : '/';

  if (!mounted) return null;

  return (
    <motion.aside
      initial={false}
      animate={{ width: isExpanded ? 240 : 68 }}
      transition={sidebarSpring}
      aria-label="Barra Lateral da Plataforma"
      className="hidden md:flex flex-col fixed inset-y-0 left-0 z-[99999] bg-white/80 dark:bg-[#08080a]/85 backdrop-blur-3xl saturate-150 border-r border-zinc-200/70 dark:border-white/[0.08] shadow-[10px_0_40px_rgba(0,0,0,0.02)] dark:shadow-[10px_0_40px_rgba(0,0,0,0.4)] overflow-visible"
    >
      <div className="absolute top-8 -right-3 z-[999999]">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label={isExpanded ? 'Recolher menu lateral' : 'Expandir menu lateral'}
          onClick={() => {
            playDopamineSound('click');
            triggerHaptic('light');
            setIsExpanded(!isExpanded);
          }}
          className="w-6 h-6 bg-white dark:bg-[#111111] border border-zinc-200 dark:border-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white shadow-sm hover:shadow-md transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#9FC131]"
        >
          <motion.div
            animate={{ rotate: isExpanded ? 0 : 180 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <ChevronLeft size={12} strokeWidth={2} />
          </motion.div>
        </motion.button>
      </div>

      <div className="mt-6 mb-6 flex items-center h-12 w-full px-2">
        <Link href="/" className="flex items-center group w-full outline-none">
          <div className="w-[52px] flex justify-center shrink-0">
            {empresaLogo ? (
              <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform shadow-md">
                <img
                  src={empresaLogo}
                  alt={empresaNome}
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
            ) : (
              <div className="w-11 h-11 bg-zinc-950 dark:bg-white rounded-full flex items-center justify-center shadow-md transition-transform duration-300 group-hover:scale-105">
                <Activity
                  className="text-white dark:text-zinc-900"
                  size={20}
                  strokeWidth={2}
                />
              </div>
            )}
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                className="flex flex-col whitespace-nowrap overflow-hidden flex-1 pr-3 pl-1"
              >
                <span className="font-bold text-xs tracking-tight text-zinc-900 dark:text-white leading-none mb-0.5 truncate">
                  {empresaNome.toUpperCase()}
                </span>
                <span className="text-[8px] font-bold tracking-widest text-zinc-400 uppercase">
                  RMAgenda
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
      </div>

      <nav className="flex-1 flex flex-col w-full overflow-y-auto overflow-x-hidden custom-scrollbar gap-1 py-1">
        <SidebarItem href="/" icon={House} label="Início" isExpanded={isExpanded} />
        <SidebarItem
          href={agendamentoHref}
          icon={CalendarDays}
          label="Agendamentos"
          isExpanded={isExpanded}
        />
        <SidebarItem
          href="/consultar"
          icon={CalendarSearch}
          label="Consultar"
          isExpanded={isExpanded}
        />
      </nav>

      <div className="pb-5 pt-3 w-full flex flex-col items-center border-t border-zinc-200/60 dark:border-white/[0.06] px-2">
        <Tooltip text={isDark ? 'Tema Claro' : 'Tema Escuro'} isVisible={!isExpanded}>
          <button
            onClick={toggleTheme}
            aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
            className="flex items-center w-full min-h-[42px] rounded-xl hover:bg-zinc-100/70 dark:hover:bg-white/[0.04] transition-colors outline-none text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          >
            <div className="w-[52px] flex justify-center shrink-0">
              {isDark ? (
                <Sun
                  className="text-amber-400"
                  size={16}
                  strokeWidth={1.5}
                />
              ) : (
                <Moon
                  className="text-zinc-500"
                  size={16}
                  strokeWidth={1.5}
                />
              )}
            </div>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  className="flex-1 flex items-center justify-between pr-3 overflow-hidden text-xs font-semibold text-zinc-600 dark:text-zinc-400"
                >
                  <span>{isDark ? 'Tema Claro' : 'Tema Noturno'}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </Tooltip>
      </div>
    </motion.aside>
  );
}
