import Link from "next/link";
import { CalendarSearch, CalendarPlus, House } from "lucide-react";

/** Tela de recuperação compartilhada por 404 e erros: explica o que houve e oferece caminhos de volta. */
export default function TelaRecuperacao({ codigo, titulo, descricao, acao }) {
  const caminhos = [
    { href: "/", icone: House, titulo: "Página inicial", texto: "Buscar a sua clínica" },
    { href: "/consultar", icone: CalendarSearch, titulo: "Meus agendamentos", texto: "Consultar, remarcar ou cancelar" },
    { href: "/login", icone: CalendarPlus, titulo: "Área da clínica", texto: "Entrar no painel de gestão" }
  ];

  return (
    <main id="conteudo" className="min-h-[100dvh] bg-background text-zinc-900 dark:text-zinc-100 flex items-center">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid lg:grid-cols-[1.618fr_1fr] gap-10 lg:gap-16 items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-ink">{codigo}</p>
          <h1 className="mt-3 text-4xl sm:text-5xl font-black tracking-tight text-zinc-950 dark:text-white max-w-[18ch]">{titulo}</h1>
          <p className="mt-4 text-base text-muted max-w-[50ch]">{descricao}</p>
          {acao && <div className="mt-7">{acao}</div>}
        </div>
        <nav aria-label="Caminhos sugeridos" className="rounded-2xl bg-surface border border-black/[0.06] dark:border-white/[0.08] shadow-sm divide-y divide-black/[0.06] dark:divide-white/[0.08]">
          {caminhos.map(({ href, icone: Icone, titulo: t, texto }) => (
            <Link key={href} href={href} className="flex items-center gap-3.5 p-4 min-h-[64px] hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors first:rounded-t-2xl last:rounded-b-2xl">
              <span className="w-10 h-10 rounded-full bg-background grid place-items-center text-brand-ink shrink-0">
                <Icone size={18} aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-bold text-zinc-950 dark:text-white">{t}</span>
                <span className="block text-xs text-muted">{texto}</span>
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
