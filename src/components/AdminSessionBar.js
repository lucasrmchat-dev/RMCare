'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut,
  ShieldCheck,
  Sun,
  Moon,
  Clock,
  Volume2,
  VolumeX,
  User,
  Activity,
  Building2,
  ChevronDown
} from 'lucide-react';
import { logoutAdmin, refreshAdminSession, getSessionAdminInfo } from '@/actions/auth';
import { fetchAdminCustomization } from '@/actions/adminData';
import { playDopamineSound, triggerHaptic } from '@/lib/dopamine';

const SESSION_SECONDS = 30 * 60;
const appleSpring = { type: 'spring', stiffness: 450, damping: 32 };

export default function AdminSessionBar() {
  const [remaining, setRemaining] = useState(SESSION_SECONDS);
  const [isDark, setIsDark] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [adminInfo, setAdminInfo] = useState(null);
  const [empresaInfo, setEmpresaInfo] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const lastRefresh = useRef(0);
  const isLeavingRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsDark(document.documentElement.classList.contains('dark'));
      const muted =
        localStorage.getItem('rmagenda_sound_muted') === 'true' ||
        localStorage.getItem('rmcare_sound_muted') === 'true';
      setIsSoundMuted(muted);
    }

    const fetchMeta = async () => {
      try {
        const [adm, emp] = await Promise.all([
          getSessionAdminInfo(),
          fetchAdminCustomization().catch(() => null)
        ]);
        if (adm) setAdminInfo(adm);
        if (emp) {
          setEmpresaInfo(emp);
          if (typeof window !== 'undefined' && emp.config_campos?.tema) {
            const tema = emp.config_campos.tema;
            const escopo = tema.escopo_tema || 'ambos';
            if (escopo === 'ambos' || escopo === 'admin') {
              const root = document.documentElement;
              if (tema.cor_primaria) {
                root.style.setProperty('--brand-primary', tema.cor_primaria);
                localStorage.setItem('rmcare_brand_primary', tema.cor_primaria);
              }
              if (tema.cor_secundaria) {
                root.style.setProperty('--brand-secondary', tema.cor_secundaria);
                localStorage.setItem('rmcare_brand_secondary', tema.cor_secundaria);
              }
            }
          }
        }
      } catch (e) {
        console.warn('Aviso ao carregar metadados do cabeçalho:', e);
      }
    };
    fetchMeta();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const toggleTheme = () => {
    playDopamineSound('click');
    triggerHaptic('light');
    if (typeof window === 'undefined') return;
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
      html.classList.remove('dark');
      localStorage.setItem('rmagenda_theme', 'light');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      html.classList.add('dark');
      localStorage.setItem('rmagenda_theme', 'dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  const toggleSound = () => {
    const nextState = !isSoundMuted;
    setIsSoundMuted(nextState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('rmagenda_sound_muted', String(nextState));
      localStorage.setItem('rmcare_sound_muted', String(nextState));
    }
    if (!nextState) {
      playDopamineSound('unlock');
      triggerHaptic('medium');
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

  const isMasterSystem = adminInfo?.role === 'sistema';
  const nomeExibicaoUsuario = adminInfo?.nome || adminInfo?.usuario || (isMasterSystem ? 'Super Master' : 'Administrador');
  const logoClinicaUrl = empresaInfo?.logo_url || empresaInfo?.config_campos?.logo_url;
  const nomeClinica = isMasterSystem ? 'Sistema Master Root' : (empresaInfo?.nome || 'Clínica');

  return (
    <header className="relative z-[9999] h-14 shrink-0 px-4 sm:px-6 flex items-center justify-between bg-white/80 dark:bg-[#161618]/80 backdrop-blur-2xl border-b border-black/[0.06] dark:border-white/[0.08] text-zinc-900 dark:text-white transition-colors duration-250">
      {/* BRANDING PARCEIRAS: RM AGENDA + LOGO CLÍNICA + SESSÃO ATIVA */}
      <div className="flex items-center gap-3">
        {/* LOGO RM AGENDA */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-black flex items-center justify-center font-black text-xs shadow-xs border border-black/[0.06] dark:border-white/[0.1]">
            <span className="text-[#34C759] dark:text-[#30D158] font-black">RM</span>
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-xs font-bold tracking-tight text-zinc-950 dark:text-white leading-tight">
              RM Agenda
            </span>
            <span className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none">
              Plataforma
            </span>
          </div>
        </div>

        {/* DIVISOR SUTIL */}
        <div className="h-4 w-px bg-black/[0.06] dark:bg-white/[0.08] mx-0.5" />

        {/* LOGO DA CLÍNICA / SISTEMA + NOME */}
        <div className="flex items-center gap-2 min-w-0">
          {logoClinicaUrl && !isMasterSystem ? (
            <div className="w-8 h-8 rounded-xl overflow-hidden bg-white dark:bg-[#222225] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center shrink-0 shadow-xs">
              <img
                src={logoClinicaUrl}
                alt={nomeClinica}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs shadow-xs border ${
              isMasterSystem
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
            }`}>
              {isMasterSystem ? <ShieldCheck size={16} strokeWidth={2} /> : <Building2 size={15} strokeWidth={1.75} />}
            </div>
          )}
          <div className="min-w-0">
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate block leading-tight max-w-[130px] sm:max-w-[200px]">
              {nomeClinica}
            </span>
            <span className={`text-[9px] font-semibold uppercase tracking-widest leading-none block ${
              isMasterSystem ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {isMasterSystem ? 'Master Root' : 'Gestão Clínica'}
            </span>
          </div>
        </div>

        {/* TIMER DE SESSÃO ATIVA DESTACADO NA BARRA PRINCIPAL */}
        <div
          className="flex items-center gap-2 px-3 py-1 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.06] text-xs shadow-xs ml-1 sm:ml-2"
          title="Tempo de inatividade restante da sessão"
        >
          <Clock size={13} className={isExpiringSoon ? 'text-amber-500 animate-pulse' : 'text-zinc-400 dark:text-zinc-500'} />
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider hidden sm:inline">
            Sessão:
          </span>
          <span
            className={`font-mono font-bold text-xs px-1.5 py-0.5 rounded ${
              isExpiringSoon
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 animate-pulse'
                : 'text-zinc-800 dark:text-zinc-200'
            }`}
          >
            {minutes}:{seconds}
          </span>
        </div>
      </div>

      {/* CÁPSULA DO USUÁRIO ESTILO APPLE */}
      <div className="relative z-[10000]" ref={menuRef}>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => {
            playDopamineSound('click');
            setIsMenuOpen(!isMenuOpen);
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            isMenuOpen
              ? 'bg-black/[0.06] dark:bg-white/[0.1] border-black/20 dark:border-white/20'
              : 'bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] border-black/[0.04] dark:border-white/[0.06]'
          }`}
          aria-expanded={isMenuOpen}
        >
          <div className="w-6 h-6 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-black flex items-center justify-center text-[10px] font-black uppercase shadow-xs">
            {nomeExibicaoUsuario.charAt(0)}
          </div>
          <span className="text-xs font-semibold text-zinc-950 dark:text-white leading-tight max-w-[120px] sm:max-w-[150px] truncate">
            {nomeExibicaoUsuario}
          </span>
          <ChevronDown
            size={13}
            className={`text-zinc-400 transition-transform duration-200 ${isMenuOpen ? 'rotate-180 text-zinc-900 dark:text-white' : ''}`}
          />
        </motion.button>

        {/* DROPDOWN EXPANSÍVEL ESTILO APPLE POPOVER */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={appleSpring}
              className="absolute right-0 mt-2 w-72 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.1] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] p-3 z-[10001] space-y-2.5"
            >
              {/* CABEÇALHO DO PERFIL */}
              <div className="flex items-center gap-3 p-2.5 bg-[#F8F8FA] dark:bg-[#252528] rounded-2xl border border-black/[0.04] dark:border-white/[0.06]">
                <div className="w-10 h-10 rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-sm uppercase shrink-0 shadow-xs">
                  {nomeExibicaoUsuario.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-zinc-950 dark:text-white truncate block">
                      {nomeExibicaoUsuario}
                    </span>
                    {adminInfo?.is_owner && (
                      <span className="px-1.5 py-0.2 text-[8px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-700 dark:text-purple-300 rounded-md border border-purple-500/20">
                        Owner
                      </span>
                    )}
                    {isMasterSystem && (
                      <span className="px-1.5 py-0.2 text-[8px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded-md border border-amber-500/20">
                        Master
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 block truncate">
                    @{adminInfo?.usuario || 'admin'}
                  </span>
                </div>
              </div>

              {/* OPÇÕES RÁPIDAS */}
              <div className="space-y-0.5 pt-1 border-t border-black/[0.04] dark:border-white/[0.06]">
                {/* TOGGLE MODO NOTURNO */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.05] text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer text-xs font-medium"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-300">
                      {isDark ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-zinc-600" />}
                    </div>
                    <span>Modo de Exibição</span>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    {isDark ? 'Escuro' : 'Claro'}
                  </span>
                </button>

                {/* TOGGLE EFEITOS SONOROS */}
                <button
                  type="button"
                  onClick={toggleSound}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.05] text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer text-xs font-medium"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-300">
                      {isSoundMuted ? <VolumeX size={14} className="text-zinc-400" /> : <Volume2 size={14} className="text-[#34C759] dark:text-[#30D158]" />}
                    </div>
                    <span>Efeitos Sonoros</span>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${!isSoundMuted ? 'text-[#34C759] dark:text-[#30D158]' : 'text-zinc-400'}`}>
                    {isSoundMuted ? 'Mudo' : 'Ativo'}
                  </span>
                </button>
              </div>

              {/* BOTÃO DE SAIR */}
              <div className="pt-2 border-t border-black/[0.04] dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={leave}
                  className="w-full flex items-center justify-center gap-2 p-2.5 bg-rose-500/10 hover:bg-rose-500/15 text-rose-600 dark:text-rose-400 rounded-2xl text-xs font-bold transition-all border border-rose-500/20 cursor-pointer shadow-xs"
                >
                  <LogOut size={14} strokeWidth={2} />
                  <span>Sair da Conta</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
