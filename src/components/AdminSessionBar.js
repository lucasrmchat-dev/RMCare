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
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { logoutAdmin, refreshAdminSession, getSessionAdminInfo } from '@/actions/auth';
import { fetchAdminCustomization } from '@/actions/adminData';
import { playDopamineSound, triggerHaptic } from '@/lib/dopamine';

const SESSION_SECONDS = 30 * 60; // 30 minutos cravados
const appleSpring = { type: 'spring', stiffness: 450, damping: 32 };
const STORAGE_KEY_EXPIRES_AT = 'rmcare_session_expires_at';

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

  // Inicialização e sincronização de metadados
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

  // Fecha o menu ao clicar fora
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

  // Desconexão total e redirecionamento imediato para a tela de login
  const leave = useCallback(async () => {
    if (isLeavingRef.current) return;
    isLeavingRef.current = true;
    try {
      localStorage.removeItem(STORAGE_KEY_EXPIRES_AT);
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
      localStorage.removeItem(STORAGE_KEY_EXPIRES_AT);
      window.location.replace('/login');
    }
  }, []);

  // SISTEMA DE CRONÔMETRO POR TIMESTAMP REAL (WALL-CLOCK TIME)
  // Impossibilita congelamento do contador quando a aba fica em segundo plano ou o notebook dorme
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Inicializa o timestamp limite no localStorage se não existir
    let savedExpiry = parseInt(localStorage.getItem(STORAGE_KEY_EXPIRES_AT) || '0', 10);
    const now = Date.now();
    if (!savedExpiry || savedExpiry <= now || savedExpiry > now + SESSION_SECONDS * 1000 + 10000) {
      savedExpiry = now + SESSION_SECONDS * 1000;
      localStorage.setItem(STORAGE_KEY_EXPIRES_AT, String(savedExpiry));
    }

    const checkAndCalculateRemaining = () => {
      if (isLeavingRef.current) return;
      const currentExpiry = parseInt(localStorage.getItem(STORAGE_KEY_EXPIRES_AT) || '0', 10);
      const currentTime = Date.now();

      if (currentTime >= currentExpiry) {
        // Tempo real esgotado! Desconecta imediatamente
        void leave();
        return;
      }

      const diffSeconds = Math.max(0, Math.floor((currentExpiry - currentTime) / 1000));
      setRemaining(diffSeconds);
    };

    // 1. Tique a cada 1 segundo com cálculo pelo relógio absoluto
    const tick = setInterval(checkAndCalculateRemaining, 1000);

    // 2. Verificação imediata ao acordar o dispositivo ou voltar à aba (visibilitychange e focus)
    const handleWakeUp = () => {
      checkAndCalculateRemaining();
    };
    document.addEventListener('visibilitychange', handleWakeUp);
    window.addEventListener('focus', handleWakeUp);

    // 3. Reset da inatividade quando o usuário interagir ativamente na página
    const resetOnUserActivity = async () => {
      if (isLeavingRef.current) return;
      const currentTime = Date.now();
      const currentExpiry = parseInt(localStorage.getItem(STORAGE_KEY_EXPIRES_AT) || '0', 10);

      // Se já venceu enquanto estava ausente, não estende: desconecta na hora!
      if (currentTime >= currentExpiry) {
        void leave();
        return;
      }

      // Estende o prazo por mais 30 minutos a partir deste instante
      const newExpiry = currentTime + SESSION_SECONDS * 1000;
      localStorage.setItem(STORAGE_KEY_EXPIRES_AT, String(newExpiry));
      setRemaining(SESSION_SECONDS);

      // Atualiza o token no servidor a cada 60s de atividade
      if (currentTime - lastRefresh.current < 60000) return;
      lastRefresh.current = currentTime;
      try {
        const result = await refreshAdminSession();
        if (result && !result.success) {
          void leave();
        }
      } catch (e) {
        void leave();
      }
    };

    const userEvents = ['pointerdown', 'keydown', 'scroll'];
    userEvents.forEach((evt) => window.addEventListener(evt, resetOnUserActivity, { passive: true }));

    // Executa a primeira checagem de imediato
    checkAndCalculateRemaining();

    return () => {
      clearInterval(tick);
      document.removeEventListener('visibilitychange', handleWakeUp);
      window.removeEventListener('focus', handleWakeUp);
      userEvents.forEach((evt) => window.removeEventListener(evt, resetOnUserActivity));
    };
  }, [leave]);

  const minutes = String(Math.floor(remaining / 60)).padStart(2, '0');
  const seconds = String(remaining % 60).padStart(2, '0');
  const isExpiringSoon = remaining < 300; // Menos de 5 minutos
  const isCritical = remaining < 60; // Menos de 1 minuto

  const isMasterSystem = adminInfo?.role === 'sistema';
  const nomeExibicaoUsuario = adminInfo?.nome || adminInfo?.usuario || (isMasterSystem ? 'Super Master' : 'Administrador');
  const logoClinicaUrl = empresaInfo?.logo_url || empresaInfo?.config_campos?.logo_url;
  const nomeClinica = isMasterSystem ? 'Sistema Master Root' : (empresaInfo?.nome || 'Clínica');

  return (
    <div className="w-full px-3 sm:px-5 pt-3 sm:pt-4 pb-0 z-[9999] relative shrink-0">
      <motion.header
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        className="w-full max-w-[1760px] mx-auto h-14 px-3.5 sm:px-5 flex items-center justify-between rounded-2xl bg-white/85 dark:bg-[#161618]/85 backdrop-blur-2xl border border-black/[0.06] dark:border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.65)] text-zinc-900 dark:text-white transition-all select-none"
      >
        {/* LADO ESQUERDO: LOGO DA PLATAFORMA + CLÍNICA COM EFEITO APPLE */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          {/* LOGO RM CARE */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-black flex items-center justify-center font-black text-xs shadow-xs border border-black/[0.08] dark:border-white/[0.1]">
              <span className="text-[#34C759] dark:text-[#30D158] font-black tracking-tighter">RM</span>
            </div>
            <div className="hidden lg:flex flex-col">
              <span className="text-xs font-bold tracking-tight text-zinc-950 dark:text-white leading-tight">
                RMAgenda
              </span>
              <span className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none">
                Clinical OS
              </span>
            </div>
          </div>

          {/* DIVISOR SUTIL */}
          <div className="h-4 w-px bg-black/[0.08] dark:bg-white/[0.1] hidden sm:block" />

          {/* CLÍNICA IDENTIFICADA */}
          <div className="flex items-center gap-2 min-w-0">
            {logoClinicaUrl && !isMasterSystem ? (
              <div className="w-8 h-8 rounded-xl overflow-hidden bg-white dark:bg-[#222225] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center shrink-0 shadow-2xs">
                <img
                  src={logoClinicaUrl}
                  alt={nomeClinica}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs shadow-2xs border ${
                isMasterSystem
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              }`}>
                {isMasterSystem ? <ShieldCheck size={16} strokeWidth={2} /> : <Building2 size={15} strokeWidth={1.8} />}
              </div>
            )}
            <div className="min-w-0">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate block leading-tight max-w-[110px] sm:max-w-[200px]">
                {nomeClinica}
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 leading-none hidden sm:block">
                {isMasterSystem ? 'Master Root' : 'Painel Ativo'}
              </span>
            </div>
          </div>
        </div>

        {/* CENTRO: CÁPSULA FLUTUANTE DINÂMICA DE SESSÃO (DYNAMIC ISLAND STYLE) */}
        <div className="flex items-center">
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all duration-200 shadow-2xs ${
              isCritical
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300 animate-pulse'
                : isExpiringSoon
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300'
                : 'bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.04] dark:border-white/[0.07] text-zinc-700 dark:text-zinc-300'
            }`}
            title="Sessão com logout automático e real após 30 minutos de inatividade"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isCritical
                  ? 'bg-rose-500 animate-ping'
                  : isExpiringSoon
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-[#34C759]'
              }`}
            />
            <Clock size={12} className={isExpiringSoon ? 'animate-pulse' : 'text-zinc-400'} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 hidden md:inline">
              Sessão:
            </span>
            <span className="font-mono font-bold text-xs tracking-tight">
              {minutes}:{seconds}
            </span>
          </div>
        </div>

        {/* LADO DIREITO: CÁPSULA DE CONTROLES RÁPIDOS & PERFIL */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* BOTAO MODO ESCURO / CLARO */}
          <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
            className="w-8 h-8 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] border border-black/[0.04] dark:border-white/[0.06] flex items-center justify-center text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer shadow-2xs"
          >
            {isDark ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-zinc-600" />}
          </button>

          {/* BOTAO EFEITOS SONOROS */}
          <button
            type="button"
            onClick={toggleSound}
            title={isSoundMuted ? 'Ativar Efeitos Sonoros' : 'Silenciar Efeitos Sonoros'}
            className="w-8 h-8 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] border border-black/[0.04] dark:border-white/[0.06] flex items-center justify-center text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer shadow-2xs"
          >
            {isSoundMuted ? <VolumeX size={15} className="text-zinc-400" /> : <Volume2 size={15} className="text-[#34C759] dark:text-[#30D158]" />}
          </button>

          {/* DROPDOWN DO USUÁRIO */}
          <div className="relative" ref={menuRef}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={() => {
                playDopamineSound('click');
                setIsMenuOpen(!isMenuOpen);
              }}
              className={`flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                isMenuOpen
                  ? 'bg-black/[0.06] dark:bg-white/[0.1] border-black/20 dark:border-white/20'
                  : 'bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] border-black/[0.04] dark:border-white/[0.06]'
              }`}
              aria-expanded={isMenuOpen}
            >
              <div className="w-6 h-6 rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-black flex items-center justify-center text-[10px] font-bold uppercase shadow-2xs">
                {nomeExibicaoUsuario.charAt(0)}
              </div>
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-tight max-w-[100px] sm:max-w-[130px] truncate hidden sm:inline">
                {nomeExibicaoUsuario}
              </span>
              <ChevronDown
                size={12}
                className={`text-zinc-400 transition-transform duration-200 ${isMenuOpen ? 'rotate-180 text-zinc-900 dark:text-white' : ''}`}
              />
            </motion.button>

            {/* POPOVER APPLE COM ORQUESTRAÇÃO DE MOVIMENTOS */}
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={appleSpring}
                  className="absolute right-0 mt-2.5 w-72 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.1] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.65)] p-3 z-[10001] space-y-2.5"
                >
                  {/* CABEÇALHO DO PERFIL */}
                  <div className="flex items-center gap-3 p-2.5 bg-[#F8F8FA] dark:bg-[#252528] rounded-2xl border border-black/[0.04] dark:border-white/[0.06]">
                    <div className="w-10 h-10 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-sm uppercase shrink-0 shadow-xs">
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
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.05] text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer text-xs font-medium"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-300">
                          {isDark ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-zinc-600" />}
                        </div>
                        <span>Aparência</span>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        {isDark ? 'Escuro' : 'Claro'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={toggleSound}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.05] text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer text-xs font-medium"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-300">
                          {isSoundMuted ? <VolumeX size={14} className="text-zinc-400" /> : <Volume2 size={14} className="text-[#34C759] dark:text-[#30D158]" />}
                        </div>
                        <span>Sons do Sistema</span>
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
                      className="w-full flex items-center justify-center gap-2 p-2.5 bg-rose-500/10 hover:bg-rose-500/15 text-rose-600 dark:text-rose-400 rounded-2xl text-xs font-bold transition-all border border-rose-500/20 cursor-pointer shadow-xs active:scale-[0.98]"
                    >
                      <LogOut size={14} strokeWidth={2} />
                      <span>Encerrar Sessão</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.header>
    </div>
  );
}
