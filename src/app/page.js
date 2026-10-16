"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { ArrowRight, Search, Building2, CalendarSearch, LockKeyhole, X, LogIn } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";
import { filtrarPorBusca } from "@/lib/buscaTolerante";
import { playDopamineSound, triggerHaptic } from "@/lib/dopamine";

const PASSOS = [
  {
    titulo: "Encontre sua clínica",
    texto: "Digite o nome da clínica ou da especialidade. Pode escrever sem acento ou com erro — a busca entende."
  },
  {
    titulo: "Escolha um horário livre",
    texto: "O calendário mostra só os horários que a clínica realmente tem disponíveis naquele dia."
  },
  {
    titulo: "Confirme pelo WhatsApp",
    texto: "Você recebe um link pessoal para confirmar, remarcar ou cancelar sem precisar ligar."
  }
];

export default function Home() {
  const [search, setSearch] = useState("");
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listaRef = useRef(null);

  useEffect(() => {
    const fetchEmpresas = async () => {
      const { data } = await supabase.from("empresas").select("nome, slug, logo_url, config_campos").order("nome");
      if (data) setEmpresas(data);
      setLoading(false);
    };
    fetchEmpresas();
  }, []);

  const filtered = useMemo(
    () => filtrarPorBusca(empresas, search, ["nome", "slug"]).slice(0, 8),
    [empresas, search]
  );
  const aberto = search.trim().length > 0;

  const irPara = (emp) => {
    playDopamineSound("select");
    triggerHaptic("light");
    window.location.href = `/${emp.slug}/agendamentos`;
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") return setSearch("");
    if (filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      irPara(filtered[selectedIndex]);
    }
  };

  return (
    <div className="relative min-h-[100dvh] bg-background text-zinc-900 dark:text-zinc-100 flex flex-col">
      <Navbar />

      {/* Cabeçalho: marca à esquerda (início da leitura em F), acesso da clínica à direita */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-7 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight text-zinc-950 dark:text-white">
          <span aria-hidden className="w-8 h-8 rounded-lg bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 grid place-items-center text-xs font-black">
            RM
          </span>
          RMAgenda
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-lg text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
        >
          <LogIn size={15} aria-hidden /> Sou da clínica
        </Link>
      </header>

      <main id="conteudo" className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 lg:pt-24 pb-28 md:pb-20">
        {/* Grade assimétrica na proporção áurea (1.618 : 1) */}
        <div className="grid lg:grid-cols-[1.618fr_1fr] gap-12 lg:gap-16 items-start">
          <section aria-labelledby="titulo-home">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-ink">Para pacientes</p>
            <h1 id="titulo-home" className="mt-3 text-4xl sm:text-5xl font-black tracking-tight text-zinc-950 dark:text-white max-w-[16ch]">
              Marque sua consulta sem ligar para a clínica.
            </h1>
            <p className="mt-5 text-base sm:text-lg text-muted max-w-[52ch]">
              Escolha a clínica, veja os horários livres e reserve pelo celular. Recebeu um link no WhatsApp? Ele já leva direto ao seu agendamento.
            </p>

            {/* Busca com sugestões automáticas e tolerância a erros */}
            <div className="mt-8 max-w-xl relative">
              <label htmlFor="busca-clinica" className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                Qual é a sua clínica?
              </label>
              <div className="relative">
                <Search aria-hidden size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <input
                  id="busca-clinica"
                  type="text"
                  role="combobox"
                  autoComplete="off"
                  aria-expanded={aberto}
                  aria-controls="sugestoes-clinica"
                  aria-activedescendant={aberto && filtered[selectedIndex] ? `clinica-${filtered[selectedIndex].slug}` : undefined}
                  placeholder="Ex.: e-Gastro, cardiologia…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSelectedIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  className="w-full min-h-[56px] rounded-xl bg-surface border border-black/[0.1] dark:border-white/[0.12] pl-11 pr-11 text-base text-zinc-900 dark:text-white placeholder:text-zinc-400 shadow-sm outline-none focus:border-zinc-900 dark:focus:border-zinc-300 focus:ring-4 focus:ring-black/[0.05] dark:focus:ring-white/[0.08] transition-[border-color,box-shadow]"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Limpar busca"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 grid place-items-center rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {aberto && (
                <div
                  ref={listaRef}
                  className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl bg-surface border border-black/[0.08] dark:border-white/[0.1] shadow-xl overflow-hidden"
                >
                  {loading ? (
                    <p className="p-5 text-sm text-muted">Carregando clínicas…</p>
                  ) : filtered.length > 0 ? (
                    <ul id="sugestoes-clinica" role="listbox" aria-label="Clínicas encontradas" className="max-h-80 overflow-y-auto custom-scrollbar p-1.5">
                      {filtered.map((emp, index) => {
                        const logo = emp.logo_url || emp.config_campos?.logo_url;
                        const ativo = selectedIndex === index;
                        return (
                          <li
                            key={emp.slug}
                            id={`clinica-${emp.slug}`}
                            role="option"
                            aria-selected={ativo}
                            onMouseEnter={() => setSelectedIndex(index)}
                            onClick={() => irPara(emp)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                              ativo ? "bg-black/[0.05] dark:bg-white/[0.08]" : ""
                            }`}
                          >
                            <span className="w-10 h-10 rounded-full bg-background border border-black/[0.06] dark:border-white/[0.08] grid place-items-center overflow-hidden shrink-0 text-zinc-500">
                              {logo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={logo} alt="" loading="lazy" className="w-full h-full object-cover" />
                              ) : (
                                <Building2 size={17} aria-hidden />
                              )}
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-sm font-semibold text-zinc-950 dark:text-white truncate">{emp.nome}</span>
                              <span className="block text-xs text-muted">Ver horários e agendar</span>
                            </span>
                            <ArrowRight size={16} aria-hidden className={`shrink-0 transition-transform ${ativo ? "translate-x-0.5 text-brand-ink" : "text-zinc-300"}`} />
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="p-5 text-sm">
                      <p className="font-semibold text-zinc-900 dark:text-white">Nenhuma clínica com esse nome.</p>
                      <p className="mt-1 text-muted">Confira a grafia ou peça à clínica o link de agendamento dela.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Link
              href="/consultar"
              className="mt-6 inline-flex items-center gap-2 min-h-[44px] text-sm font-semibold text-zinc-800 dark:text-zinc-200 group"
            >
              <CalendarSearch size={17} aria-hidden className="text-brand-ink" />
              <span className="underline underline-offset-4 decoration-zinc-300 dark:decoration-zinc-600 group-hover:decoration-current">
                Já tem horário marcado? Consulte, remarque ou cancele
              </span>
              <ArrowRight size={15} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </section>

          {/* Coluna menor: como funciona, em etapas numeradas */}
          <aside aria-labelledby="como-funciona" className="lg:mt-14 rounded-2xl bg-surface border border-black/[0.06] dark:border-white/[0.08] shadow-sm p-6 sm:p-7">
            <h2 id="como-funciona" className="text-lg font-bold tracking-tight text-zinc-950 dark:text-white">
              Como funciona
            </h2>
            <ol className="mt-5 space-y-5">
              {PASSOS.map((passo, i) => (
                <li key={passo.titulo} className="grid grid-cols-[auto_1fr] gap-x-3.5">
                  <span aria-hidden className="w-7 h-7 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 grid place-items-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white leading-7">{passo.titulo}</h3>
                    <p className="mt-0.5 text-sm text-muted">{passo.texto}</p>
                  </div>
                </li>
              ))}
            </ol>
            <hr className="my-6 border-black/[0.06] dark:border-white/[0.08]" />
            <p className="flex gap-2.5 text-xs text-muted">
              <LockKeyhole size={15} aria-hidden className="shrink-0 mt-0.5 text-zinc-400" />
              Seus dados ficam com a sua clínica e são tratados conforme a LGPD.
            </p>
          </aside>
        </div>
      </main>

      <footer className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 mb-20 md:mb-0 flex flex-col sm:flex-row gap-3 sm:items-center justify-between text-xs text-muted border-t border-black/[0.06] dark:border-white/[0.08]">
        <p>© {new Date().getFullYear()} RMAgenda</p>
        <nav aria-label="Links do rodapé" className="flex gap-5">
          <Link href="/consultar" className="hover:text-zinc-900 dark:hover:text-white underline-offset-4 hover:underline">Meus agendamentos</Link>
          <Link href="/login" className="hover:text-zinc-900 dark:hover:text-white underline-offset-4 hover:underline">Área da clínica</Link>
        </nav>
      </footer>
    </div>
  );
}
