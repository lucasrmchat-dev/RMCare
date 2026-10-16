"use client";

import { RotateCcw } from "lucide-react";
import TelaRecuperacao from "@/components/TelaRecuperacao";

export default function ErroInesperado({ reset }) {
  return (
    <TelaRecuperacao
      codigo="Algo saiu do esperado"
      titulo="Não conseguimos carregar esta tela."
      descricao="Pode ser uma instabilidade momentânea na conexão. Tente de novo em alguns segundos."
      acao={
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-2 min-h-[48px] px-5 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-sm font-bold shadow-md hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors cursor-pointer"
        >
          <RotateCcw size={16} aria-hidden /> Tentar novamente
        </button>
      }
    />
  );
}
