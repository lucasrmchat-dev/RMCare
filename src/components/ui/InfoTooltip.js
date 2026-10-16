"use client";

import { useId, useState } from "react";
import { HelpCircle } from "lucide-react";

/**
 * Ícone "?" que revela uma explicação curta ao passar o mouse, focar pelo teclado ou tocar.
 * Acessível: o texto é ligado ao botão por aria-describedby e fecha com Esc.
 */
export default function InfoTooltip({ texto, lado = "top", className = "" }) {
  const id = useId();
  const [aberto, setAberto] = useState(false);
  const posicao = lado === "bottom" ? "top-full mt-2" : "bottom-full mb-2";

  return (
    <span className={`relative inline-flex align-middle ${className}`}>
      <button
        type="button"
        aria-label="O que é isso?"
        aria-describedby={id}
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        onMouseEnter={() => setAberto(true)}
        onMouseLeave={() => setAberto(false)}
        onFocus={() => setAberto(true)}
        onBlur={() => setAberto(false)}
        onKeyDown={(e) => e.key === "Escape" && setAberto(false)}
        className="w-6 h-6 -m-1 grid place-items-center rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-help"
      >
        <HelpCircle size={14} aria-hidden />
      </button>
      <span
        id={id}
        role="tooltip"
        className={`absolute left-1/2 -translate-x-1/2 ${posicao} z-50 w-64 max-w-[80vw] rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium leading-relaxed normal-case tracking-normal px-3 py-2 shadow-lg transition-opacity duration-150 pointer-events-none ${
          aberto ? "opacity-100" : "opacity-0"
        }`}
      >
        {texto}
      </span>
    </span>
  );
}
