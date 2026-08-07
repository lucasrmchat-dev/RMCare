"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LogOut, ShieldCheck, Sun, Moon } from "lucide-react";
import { logoutAdmin, refreshAdminSession } from "@/actions/auth";

const SESSION_SECONDS = 30 * 60;

export default function AdminSessionBar() {
  const [remaining, setRemaining] = useState(SESSION_SECONDS);
  const [isDark, setIsDark] = useState(false);
  const lastRefresh = useRef(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsDark(document.documentElement.classList.contains("dark"));
    }
  }, []);

  const toggleTheme = () => {
    if (typeof window === "undefined") return;
    const html = document.documentElement;
    if (html.classList.contains("dark")) {
      html.classList.remove("dark");
      localStorage.setItem("rmagenda_theme", "light");
      setIsDark(false);
    } else {
      html.classList.add("dark");
      localStorage.setItem("rmagenda_theme", "dark");
      setIsDark(true);
    }
  };

  const leave = useCallback(async () => {
    try {
      await logoutAdmin();
    } catch (err) {
      console.error("Erro ao sair:", err);
    }
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setRemaining((value) => {
      if (value <= 1) { clearInterval(tick); void leave(); return 0; }
      return value - 1;
    }), 1000);
    const reset = async () => {
      const now = Date.now();
      setRemaining(SESSION_SECONDS);
      if (now - lastRefresh.current < 30000) return;
      lastRefresh.current = now;
      const result = await refreshAdminSession();
      if (!result.success) void leave();
    };
    const events = ["pointerdown", "keydown", "scroll"];
    events.forEach((event) => window.addEventListener(event, reset, { passive: true }));
    return () => { clearInterval(tick); events.forEach((event) => window.removeEventListener(event, reset)); };
  }, [leave]);

  const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
  const seconds = String(remaining % 60).padStart(2, "0");

  return (
    <header className="h-16 shrink-0 px-5 flex items-center justify-between bg-white dark:bg-[#0a0a0a] border-b border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white transition-colors duration-300 z-50">
      <div className="flex items-center gap-2 font-black text-zinc-900 dark:text-white">
        <ShieldCheck size={20} className="text-[#86a621]" /> RMAgenda Admin
      </div>
      <div className="flex items-center gap-4">
        {/* BOTÃO ALTERNADOR DE TEMA (CLARO / ESCURO) */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center"
          title={isDark ? "Mudar para Tema Claro" : "Mudar para Tema Escuro"}
        >
          {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
        </button>

        <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400" aria-label="Tempo restante da sessão">
          Sessão {minutes}:{seconds}
        </span>
        
        <button onClick={leave} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black text-xs font-bold hover:bg-black dark:hover:bg-zinc-200 transition-colors">
          <LogOut size={15} /> Sair
        </button>
      </div>
    </header>
  );
}
