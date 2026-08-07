"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LogOut, ShieldCheck } from "lucide-react";
import { logoutAdmin, refreshAdminSession } from "@/actions/auth";
import { useRouter } from "next/navigation";

const SESSION_SECONDS = 30 * 60;

export default function AdminSessionBar() {
  const router = useRouter();
  const [remaining, setRemaining] = useState(SESSION_SECONDS);
  const lastRefresh = useRef(0);

  const leave = useCallback(async () => {
    await logoutAdmin();
    router.replace("/login");
    router.refresh();
  }, [router]);

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
    <header className="h-16 shrink-0 px-5 flex items-center justify-between bg-white border-b border-zinc-200 z-50">
      <div className="flex items-center gap-2 font-black text-zinc-900"><ShieldCheck size={20} className="text-[#86a621]" /> RMCare Admin</div>
      <div className="flex items-center gap-4">
        <span className="text-xs font-bold text-zinc-500" aria-label="Tempo restante da sessão">Sessão {minutes}:{seconds}</span>
        <button onClick={leave} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-black"><LogOut size={15} /> Sair</button>
      </div>
    </header>
  );
}
