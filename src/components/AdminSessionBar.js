'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { LogOut, ShieldCheck, Sun, Moon, Clock } from 'lucide-react';
import { logoutAdmin, refreshAdminSession } from '@/actions/auth';
import { playDopamineSound, triggerHaptic } from '@/lib/dopamine';

const SESSION_SECONDS = 30 * 60;

export default function AdminSessionBar() {
  const [remaining, setRemaining] = useState(SESSION_SECONDS);
  const [isDark, setIsDark] = useState(false);
  const lastRefresh = useRef(0);
  const isLeavingRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsDark(document.documentElement.classList.contains('dark'));
    }
  }, []);

  const toggleTheme = () => {
    playDopamineSound('click');
    triggerHaptic('light');
    if (typeof window === 'undefined') return;
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
      html.classList.remove('dark');
      localStorage.setItem('rmagenda_theme', 'light');
      setIsDark(false);
    } else {
      html.classList.add('dark');
      localStorage.setItem('rmagenda_theme', 'dark');
      setIsDark(true);
    }
  };

  const leave = useCallback(async () => {
    if (isLeavingRef.current) return;
    isLeavingRef.current = true;
    try {
      await logoutAdmin();
    } catch (err) {
      console.error('Erro ao sair:', err);
    }
    if (typeof window !== 'undefined') {
      document.cookie = 'rmagenda_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'rmcare_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'rmagenda_auth_paciente=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'rmcare_auth_paciente=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      localStorage.removeItem('rmagenda_last_slug');
      window.location.replace('/login');
    }
  }, []);

  useEffect(() => {
    const tick = setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          clearInterval(tick);
          void leave();
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    const reset = async () => {
      if (isLeavingRef.current) return;
      const now = Date.now();
      setRemaining(SESSION_SECONDS);
      if (now - lastRefresh.current < 30000) return;
      lastRefresh.current = now;
      const result = await refreshAdminSession();
      if (!result.success) void leave();
    };

    const events = ['pointerdown', 'keydown', 'scroll'];
    events.forEach((event) => window.addEventListener(event, reset, { passive: true }));
    return () => {
      clearInterval(tick);
      events.forEach((event) => window.removeEventListener(event, reset));
    };
  }, [leave]);

  const minutes = String(Math.floor(remaining / 60)).padStart(2, '0');
  const seconds = String(remaining % 60).padStart(2, '0');
  const isExpiringSoon = remaining < 300;

  return (
    <header className="h-14 shrink-0 px-5 flex items-center justify-between bg-white/80 dark:bg-[#08080a]/80 backdrop-blur-2xl saturate-150 border-b border-zinc-200/70 dark:border-white/[0.08] text-zinc-900 dark:text-white transition-colors duration-300 z-50 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-2.5 font-extrabold text-zinc-950 dark:text-white tracking-tight">
        <div className="w-8 h-8 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black flex items-center justify-center shadow-sm">
          <ShieldCheck size={16} strokeWidth={1.75} />
        </div>
        <span className="text-xs sm:text-sm uppercase tracking-wider font-bold">Painel Clínico</span>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-zinc-100/70 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200/60 dark:border-zinc-700/60 transition-colors flex items-center justify-center min-w-[36px] min-h-[36px]"
          title={isDark ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
          aria-label={isDark ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
        >
          {isDark ? (
            <Sun size={15} strokeWidth={1.5} className="text-amber-400" />
          ) : (
            <Moon size={15} strokeWidth={1.5} className="text-zinc-600" />
          )}
        </button>

        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-bold ${
            isExpiringSoon
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 animate-pulse'
              : 'bg-zinc-100/50 dark:bg-zinc-900/50 border-zinc-200/60 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400'
          }`}
          aria-label="Tempo restante da sessão de administrador"
        >
          <Clock size={12} strokeWidth={1.5} />
          <span>
            {minutes}:{seconds}
          </span>
        </div>

        <button
          onClick={leave}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-black dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black text-xs font-bold transition-all shadow-sm active:scale-95 min-h-[36px]"
        >
          <LogOut size={13} strokeWidth={1.5} /> Sair
        </button>
      </div>
    </header>
  );
}
