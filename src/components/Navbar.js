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
      aria-label={label}
      onClick={() => {
        playDopamineSound('click');
        triggerHaptic('light');
      }}
      className="relative flex items-center justify-center min-w-[46px] min-h-[46px] w-[46px] h-[46px] outline-none group z-10 shrink-0 rounded-full focus-visible:ring-2 focus-visible:ring-[#9FC131]"
    >
      {isAtivo && (
        <motion.div
          layoutId="mobile-dock-active-pill"
          transition={liquidSpring}
          className="absolute inset-0 bg-black/5 dark:bg-white/10 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.06)] border border-black/5 dark:border-white/10 -z-10"
        />
      )}

      <motion.div
        layout
        whileTap={{ scale: 0.85 }}
        animate={{ scale: isAtivo ? 1.05 : 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 22 }}
        className="relative z-10 flex items-center justify-center"
      >
        <Icon
          size={19}
          strokeWidth={isAtivo ? 1.75 : 1.35}
          className={`transition-colors duration-300 ${
            isAtivo
              ? 'text-zinc-950 dark:text-white drop-shadow-sm'
              : 'text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300'
          }`}
        />
      </motion.div>
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
      aria-label="Navegação Principal"
      className={`md:hidden fixed ${
        hasBottomBar ? 'bottom-[78px]' : 'bottom-3.5 sm:bottom-4'
      } left-0 right-0 z-[99999] flex justify-center pointer-events-none px-4 transition-all duration-300 ease-out`}
    >
      <motion.div
        layout
        transition={liquidSpring}
        className="relative flex items-center p-1.5 rounded-full bg-white/70 dark:bg-[#0c0c0e]/75 backdrop-blur-[36px] saturate-[1.8] border border-zinc-200/70 dark:border-white/[0.08] shadow-[0_12px_36px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.75)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.06)] pointer-events-auto gap-1"
      >
        <DockItem href="/" icon={House} label="Início" />
        <DockItem
          href={agendamentoHref}
          icon={CalendarDays}
          label="Agendamentos"
          activeMatch={lastSlug ? `/${lastSlug}/agendamentos` : null}
        />
        <DockItem href="/consultar" icon={CalendarSearch} label="Consultar" />

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
