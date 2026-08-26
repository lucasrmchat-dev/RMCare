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
          fetchAdminCustomization()
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

  const nomeExibicaoUsuario = adminInfo?.nome || adminInfo?.usuario || 'Administrador';
  const logoClinicaUrl = empresaInfo?.logo_url || empresaInfo?.config_campos?.logo_url;
  const nomeClinica = empresaInfo?.nome || 'Clínica';

  return (
    <header className="h-14 shrink-0 px-4 sm:px-6 flex items-center justify-between bg-white/85 dark:bg-[#08080a]/90 backdrop-blur-2xl saturate-150 border-b border-zinc-200/80 dark:border-white/[0.08] text-zinc-900 dark:text-white transition-colors duration-300 z-50 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
      {/* BRANDING PARCEIRAS: RM AGENDA + LOGO CLÍNICA */}
      <div className="flex items-center gap-3">
        {/* LOGO RM AGENDA */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-black flex items-center justify-center font-black text-xs shadow-sm border border-zinc-200 dark:border-white/10">
            <span className="text-[#9FC131] dark:text-[#86a621] font-black">RM</span>
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-xs font-black tracking-tight text-zinc-950 dark:text-white leading-tight">
              RM Agenda
            </span>
            <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none">
              Plataforma
            </span>
          </div>
        </div>

        {/* DIVISOR SUTIL */}
        <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-800 mx-0.5" />

        {/* LOGO DA CLÍNICA + NOME */}
        <div className="flex items-center gap-2 min-w-0">
          {logoClinicaUrl ? (
            <div className="w-8 h-8 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-center shrink-0 shadow-sm">
              <img
                src={logoClinicaUrl}
                alt={nomeClinica}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/60 flex items-center justify-center shrink-0 font-bold text-xs">
              <Building2 size={15} strokeWidth={2} />
            </div>
          )}
          <div className="min-w-0">
            <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 truncate block leading-tight max-w-[140px] sm:max-w-[200px]">
              {nomeClinica}
            </span>
            <span className="text-[9px] font-bold text-emerald-600 dark:text-[#9FC131] uppercase tracking-widest leading-none block">
              Painel de Gestão
            </span>
          </div>
        </div>

        {/* TIMER DE SESSÃO ATIVA DESTACADO NO LADO ESQUERDO (FORA DO CARD) */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100/90 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 text-xs shadow-xs ml-1 sm:ml-2"
          title="Tempo de inatividade restante da sessão do colaborador"
        >
          <Clock size={13} className={isExpiringSoon ? 'text-amber-500 animate-pulse' : 'text-[#86a621] dark:text-[#9FC131]'} />
          <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider hidden sm:inline">
            Sessão Ativa:
          </span>
          <span
            className={`font-mono font-black text-xs px-1.5 py-0.5 rounded ${
              isExpiringSoon
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 animate-pulse'
                : 'bg-zinc-200/70 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
            }`}
          >
            {minutes}:{seconds}
          </span>
        </div>
      </div>

      {/* CÁPSULA EXPANSÍVEL DO USUÁRIO COM DROPDOWN (ONLY SHOWS USER NAME/AVATAR, EXPANDS OPTIONS ON CLICK) */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => {
            playDopamineSound('click');
            setIsMenuOpen(!isMenuOpen);
          }}
          className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl border transition-all cursor-pointer shadow-sm ${
            isMenuOpen
              ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-white/20 ring-2 ring-[#9FC131]/30'
              : 'bg-white/90 dark:bg-zinc-900/80 hover:bg-zinc-50 dark:hover:bg-zinc-800/90 border-zinc-200/80 dark:border-white/[0.08]'
          }`}
          aria-expanded={isMenuOpen}
        >
          <div className="w-6 h-6 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-black flex items-center justify-center text-[10.5px] font-black uppercase shadow-xs">
            {nomeExibicaoUsuario.charAt(0)}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-extrabold text-zinc-950 dark:text-white leading-tight max-w-[130px] truncate">
              {nomeExibicaoUsuario}
            </span>
          </div>
          <ChevronDown
            size={14}
            className={`text-zinc-400 transition-transform duration-200 ${isMenuOpen ? 'rotate-180 text-zinc-900 dark:text-white' : ''}`}
          />
        </button>

        {/* DROPDOWN EXPANSÍVEL COM FRAMER MOTION */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="absolute right-0 mt-2 w-72 bg-white/95 dark:bg-[#0c0c0e]/95 backdrop-blur-2xl border border-zinc-200/90 dark:border-white/10 rounded-2xl shadow-2xl p-3 z-50 space-y-3"
            >
              {/* CABEÇALHO DO PERFIL */}
              <div className="flex items-center gap-3 p-2 bg-zinc-50/80 dark:bg-zinc-900/60 rounded-xl border border-zinc-100 dark:border-white/5">
                <div className="w-10 h-10 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-black flex items-center justify-center font-black text-sm uppercase shrink-0 shadow-sm">
                  {nomeExibicaoUsuario.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-zinc-950 dark:text-white truncate block">
                      {nomeExibicaoUsuario}
                    </span>
                    {adminInfo?.is_owner && (
                      <span className="px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 rounded border border-purple-200/50">
                        Owner
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 block truncate">
                    @{adminInfo?.usuario || 'admin'}
                  </span>
                </div>
              </div>

              {/* OPÇÕES RÁPIDAS: SOM, TEMA, TIMER */}
              <div className="space-y-1 pt-1 border-t border-zinc-100 dark:border-white/5">
                {/* TOGGLE MODO NOTURNO */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer text-xs font-semibold"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                      {isDark ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-zinc-600" />}
                    </div>
                    <span>Modo de Exibição</span>
                  </div>
                  <span className="text-[11px] font-bold text-zinc-400 uppercase">
                    {isDark ? 'Escuro' : 'Claro'}
                  </span>
                </button>

                {/* TOGGLE EFEITOS SONOROS */}
                <button
                  type="button"
                  onClick={toggleSound}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer text-xs font-semibold"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                      {isSoundMuted ? <VolumeX size={14} className="text-zinc-400" /> : <Volume2 size={14} className="text-[#86a621] dark:text-[#9FC131]" />}
                    </div>
                    <span>Efeitos Sonoros</span>
                  </div>
                  <span className={`text-[11px] font-bold uppercase ${!isSoundMuted ? 'text-[#86a621] dark:text-[#9FC131]' : 'text-zinc-400'}`}>
                    {isSoundMuted ? 'Mudo' : 'Ativo'}
                  </span>
                </button>

                {/* TIMER DE SESSÃO */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/40 text-xs">
                  <div className="flex items-center gap-2.5 text-zinc-500 dark:text-zinc-400 font-medium">
                    <Clock size={14} />
                    <span>Sessão Ativa</span>
                  </div>
                  <span
                    className={`font-mono font-black text-xs px-2 py-0.5 rounded-md ${
                      isExpiringSoon
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 animate-pulse'
                        : 'bg-zinc-200/60 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {minutes}:{seconds}
                  </span>
                </div>
              </div>

              {/* BOTÃO DE SAIR */}
              <div className="pt-2 border-t border-zinc-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={leave}
                  className="w-full flex items-center justify-center gap-2 p-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition-all border border-rose-200/50 dark:border-rose-900/40 cursor-pointer shadow-xs"
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
