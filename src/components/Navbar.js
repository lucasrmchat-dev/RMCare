'use client';

import { useEffect, useState } from 'react';
import { usePathname, useParams } from 'next/navigation';
import { House, CalendarDays, CalendarSearch, Moon, Sun } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { playDopamineSound, triggerHaptic } from '@/lib/dopamine';

const liquidSpring = { type: 'spring', stiffness: 420, damping: 30, mass: 0.8 };

const DockItem = ({ href, icon: Icon, label, activeMatch }) => {
  const pathname = usePathname();
  const isAtivo = activeMatch ? pathname === activeMatch : pathname === href;

  return (
    <Link
      href={href}
      aria-current={isAtivo ? 'page' : undefined}
      onClick={() => {
        playDopamineSound('click');
        triggerHaptic('light');
      }}
      className="relative flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[48px] px-2.5 outline-none group z-10 shrink-0 rounded-xl focus-visible:ring-2 focus-visible:ring-[#9FC131]"
    >
      {isAtivo && (
        <motion.div
          layoutId="mobile-dock-active-pill"
          transition={liquidSpring}
          className="absolute inset-0 bg-black/5 dark:bg-white/10 rounded-xl border border-black/5 dark:border-white/10 -z-10"
        />
      )}
      <Icon
        size={18}
        strokeWidth={isAtivo ? 2 : 1.6}
        aria-hidden
        className={`transition-colors duration-200 ${
          isAtivo ? 'text-zinc-950 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200'
        }`}
      />
      <span className={`text-[10.5px] leading-none ${isAtivo ? 'font-bold text-zinc-950 dark:text-white' : 'font-medium text-zinc-500 dark:text-zinc-400'}`}>
        {label}
      </span>
    </Link>
  );
};

export default function Navbar({ hasBottomBar = false }) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [lastSlug, setLastSlug] = useState('');

  const pathname = usePathname();
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

    if (currentSlug) {
      setLastSlug(currentSlug);
    } else {
      const savedSlug =
        localStorage.getItem('rmagenda_last_slug') || localStorage.getItem('rmcare_last_slug');
      if (savedSlug) setLastSlug(savedSlug);
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

  if (!mounted) return null;

  const agendamentoHref = lastSlug ? `/${lastSlug}/agendamentos` : '/';

  return (
    <nav
      aria-label="Navegação principal"
      className={`md:hidden fixed ${
        hasBottomBar ? 'bottom-[78px]' : 'bottom-3.5 sm:bottom-4'
      } left-0 right-0 z-[99999] flex justify-center pointer-events-none px-4 transition-all duration-300 ease-out`}
    >
      <motion.div
        layout
        transition={liquidSpring}
        className="relative flex items-center p-1.5 rounded-2xl bg-white/80 dark:bg-[#161618]/85 backdrop-blur-2xl border border-black/[0.06] dark:border-white/[0.08] shadow-[0_12px_36px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.75)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.06)] pointer-events-auto gap-1"
      >
        <DockItem href="/" icon={House} label="Início" />
        <DockItem
          href={agendamentoHref}
          icon={CalendarDays}
          label="Agendar"
          activeMatch={lastSlug ? `/${lastSlug}/agendamentos` : "#sem-clinica"}
        />
        <DockItem href="/consultar" icon={CalendarSearch} label="Meus horários" />

        <div className="w-[1px] h-5 bg-zinc-300/60 dark:bg-zinc-700/60 mx-1 shrink-0 rounded-full" />

        <motion.button
          layout
          onClick={toggleTheme}
          aria-label={isDark ? 'Mudar para Tema Claro' : 'Mudar para Tema Noturno'}
          whileTap={{ scale: 0.85 }}
          className="relative flex items-center justify-center min-w-[42px] min-h-[42px] w-[42px] h-[42px] outline-none group z-10 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors duration-300 shrink-0"
        >
          {isDark ? (
            <Sun
              size={17}
              strokeWidth={1.5}
              className="text-amber-400 group-hover:text-amber-300 transition-colors"
            />
          ) : (
            <Moon
              size={17}
              strokeWidth={1.5}
              className="text-zinc-500 group-hover:text-zinc-900 transition-colors"
            />
          )}
        </motion.button>
      </motion.div>
    </nav>
  );
}
