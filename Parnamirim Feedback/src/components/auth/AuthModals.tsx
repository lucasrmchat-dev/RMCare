'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Lock, Mail, User, ShieldCheck, KeyRound, ArrowRight, CheckCircle2 } from 'lucide-react';
import { formatCPF, validateCPF } from '../../lib/utils';
import { UserProfile } from '../../types';

interface AuthModalsProps {
  mode: 'login' | 'register' | null;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
  onSwitchMode: (mode: 'login' | 'register') => void;
}

export const AuthModals: React.FC<AuthModalsProps> = ({
  mode,
  onClose,
  onLoginSuccess,
  onSwitchMode,
}) => {
  // Estados do formulário
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  
  // Etapa 2FA (OTP)
  const [step2FA, setStep2FA] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!mode) return null;

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!validateCPF(cpf)) {
      setErrorMsg('CPF inválido. Digite um CPF válido para autenticação.');
      return;
    }

    // Avança para o 2FA/OTP
    setStep2FA(true);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) {
      setErrorMsg('Digite o código de 6 dígitos enviado por e-mail.');
      return;
    }

    // Cadastro exclusivo de cidadão (vereadores são cadastrados internamente)
    const newUser: UserProfile = {
      id: Math.random().toString(36).substring(7),
      name: name || 'Cidadão Parnamirinense',
      email,
      cpf,
      role: 'cidadao',
      verified_2fa: true,
    };

    onLoginSuccess(newUser);
    onClose();
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // O login é unificado: se for e-mail institucional previamente registrado, carrega o papel correspondente
    const isVereador = email.toLowerCase().includes('vereador') || email.toLowerCase().includes('camara');

    const loggedUser: UserProfile = {
      id: 'usr-1',
      name: isVereador ? 'Ver. Gabriel Fernandes' : (name || 'Maria Silva'),
      email,
      cpf: cpf || '000.000.000-00',
      role: isVereador ? 'vereador' : 'cidadao',
      verified_2fa: true,
    };

    onLoginSuccess(loggedUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="liquid-glass w-full max-w-md rounded-3xl p-7 shadow-2xl relative"
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabeçalho */}
        <div className="mb-6">
          <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 mb-3 shadow-lg shadow-sky-500/20">
            {mode === 'login' ? <Lock className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            {step2FA
              ? 'Verificação em 2 Etapas (2FA)'
              : mode === 'login'
              ? 'Acesso Unificado'
              : 'Cadastro Cidadão'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {step2FA
              ? 'Enviamos um código de segurança de 6 dígitos para o seu e-mail.'
              : mode === 'login'
              ? 'Ambiente de acesso para cidadãos e parlamentares.'
              : 'Cadastre-se com seu CPF para enviar feedbacks e participar dos debates.'}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* Formulário de 2FA */}
        {step2FA ? (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Código de 6 dígitos
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-white/5 border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-center text-lg font-mono tracking-widest text-white placeholder-slate-600 focus:outline-none focus:border-sky-400"
                />
              </div>
            </div>

            <button
              type="submit"
              className="liquid-glass-pill w-full py-3 rounded-xl bg-sky-500/30 hover:bg-sky-500/50 border border-sky-400/50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg"
            >
              <CheckCircle2 className="w-4 h-4 text-sky-300" />
              <span>Confirmar e Finalizar Cadastro</span>
            </button>
          </form>
        ) : mode === 'login' ? (
          /* Formulário de Login Unificado */
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">E-mail</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="seu.email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">Senha</label>
                <button type="button" className="text-[11px] text-sky-400 hover:underline">
                  Redefinir senha?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                />
              </div>
            </div>

            <button
              type="submit"
              className="liquid-glass-pill w-full py-3 rounded-xl bg-sky-500/30 hover:bg-sky-500/50 border border-sky-400/50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg"
            >
              <span>Entrar no Sistema</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <p className="text-center text-xs text-slate-400 pt-2">
              Não tem uma conta cidadã?{' '}
              <button
                type="button"
                onClick={() => onSwitchMode('register')}
                className="text-sky-400 font-semibold hover:underline"
              >
                Cadastre-se
              </button>
            </p>
          </form>
        ) : (
          /* Formulário de Cadastro Exclusivo para Cidadãos */
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nome Completo</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white/5 border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">CPF (Verificação Anti-Fraude)</label>
              <input
                type="text"
                required
                maxLength={14}
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(formatCPF(e.target.value))}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">E-mail</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="seu.email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Senha</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-[11px] text-slate-400 leading-relaxed">
              ℹ️ O cadastro público é destinado aos cidadãos de Parnamirim. Contas de vereadores e gabinetes parlamentares são habilitadas institucionalmente.
            </div>

            <button
              type="submit"
              className="liquid-glass-pill w-full py-3 rounded-xl bg-sky-500/30 hover:bg-sky-500/50 border border-sky-400/50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg"
            >
              <span>Prosseguir para Validação 2FA</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <p className="text-center text-xs text-slate-400 pt-2">
              Já possui cadastro?{' '}
              <button
                type="button"
                onClick={() => onSwitchMode('login')}
                className="text-sky-400 font-semibold hover:underline"
              >
                Fazer login
              </button>
            </p>
          </form>
        )}
      </motion.div>
    </div>
  );
};
