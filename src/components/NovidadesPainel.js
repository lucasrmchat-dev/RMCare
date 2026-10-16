"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Sparkles, X } from "lucide-react";

// Changelog visível ao gestor. Adicione novas entradas no topo.
const NOVIDADES = [
  {
    data: "2026-10-15",
    titulo: "Painel mais fácil de navegar",
    itens: [
      "Trilha no topo mostra em qual seção você está.",
      "Busca (Ctrl/⌘ + K) entende palavras sem acento e com erro de digitação."
    ]
  },
  {
    data: "2026-10-14",
    titulo: "Link de confirmação para o paciente",
    itens: [
      "Botão Link em cada atendimento copia o link pessoal do paciente.",
      "O paciente confirma, remarca ou cancela sozinho; a agenda fica verde quando ele confirma.",
      "Use a variável {link_confirmacao} nas mensagens automáticas de WhatsApp."
    ]
  }
];

const CHAVE_VISTO = "rmcare_novidades_vistas";

export default function NovidadesPainel() {
  const [aberto, setAberto] = useState(false);
  const [vistoAgora, setVistoAgora] = useState(false);
  const ref = useRef(null);
  const ultimaVista = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return localStorage.getItem(CHAVE_VISTO);
      } catch {
        return NOVIDADES[0].data;
      }
    },
    () => NOVIDADES[0].data
  );
  const temNovo = !vistoAgora && ultimaVista !== NOVIDADES[0].data;

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e) => {
      if (e.key === "Escape" || (e.type === "mousedown" && ref.current && !ref.current.contains(e.target))) setAberto(false);
    };
    document.addEventListener("keydown", fechar);
    document.addEventListener("mousedown", fechar);
    return () => {
      document.removeEventListener("keydown", fechar);
      document.removeEventListener("mousedown", fechar);
    };
  }, [aberto]);

  const alternar = () => {
    setAberto((v) => !v);
    setVistoAgora(true);
    try {
      localStorage.setItem(CHAVE_VISTO, NOVIDADES[0].data);
    } catch {}
  };

  return (
    <div ref={ref} className="relative ml-auto shrink-0">
      <button
        type="button"
        onClick={alternar}
        aria-expanded={aberto}
        aria-controls="painel-novidades"
        className="relative inline-flex items-center gap-1.5 min-h-[32px] px-2.5 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer"
      >
        <Sparkles size={13} aria-hidden className="text-brand-ink" />
        Novidades
        {temNovo && <span className="w-1.5 h-1.5 rounded-full bg-[#9FC131]" aria-label="há novidades não vistas" />}
      </button>
      {aberto && (
        <div
          id="painel-novidades"
          role="dialog"
          aria-label="Novidades do sistema"
          className="absolute right-0 top-full mt-2 z-50 w-[min(360px,85vw)] rounded-xl bg-surface border border-black/[0.08] dark:border-white/[0.1] shadow-xl p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-zinc-950 dark:text-white">Novidades</h2>
            <button type="button" onClick={() => setAberto(false)} aria-label="Fechar novidades" className="w-8 h-8 -m-1.5 grid place-items-center rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer">
              <X size={15} />
            </button>
          </div>
          <ol className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {NOVIDADES.map((n) => (
              <li key={n.data + n.titulo}>
                <p className="text-[11px] font-semibold text-zinc-400">
                  {new Date(`${n.data}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{n.titulo}</h3>
                <ul className="mt-1.5 space-y-1 list-disc pl-4 text-xs text-muted">
                  {n.itens.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
