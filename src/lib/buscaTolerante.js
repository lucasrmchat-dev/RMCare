/**
 * Busca tolerante a acentos e erros de digitação ("gastro" acha "Clínica e-Gastro",
 * "cardilogia" acha "Cardiologia"). Sem dependências — roda no navegador e no servidor.
 */

export const normalizarBusca = (texto) =>
  String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Distância de edição com transposição ("gastor" → "gastro" conta como 1 erro)
function distancia(a, b, limite) {
  if (Math.abs(a.length - b.length) > limite) return limite + 1;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + custo);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

const toleranciaPara = (palavra) => (palavra.length <= 3 ? 0 : palavra.length <= 6 ? 1 : 2);

/** Pontua o quanto `texto` combina com `termo` (0 = não combina; maior = melhor). */
export function pontuarBusca(texto, termo) {
  const alvo = normalizarBusca(texto);
  const busca = normalizarBusca(termo);
  if (!busca) return 1;
  if (!alvo) return 0;
  if (alvo === busca) return 100;
  if (alvo.startsWith(busca)) return 90;
  if (alvo.includes(busca)) return 75;

  // Cada palavra digitada precisa combinar com alguma palavra do texto (prefixo ou erro pequeno)
  const palavrasAlvo = alvo.split(" ");
  let total = 0;
  for (const p of busca.split(" ")) {
    let melhor = 0;
    for (const w of palavrasAlvo) {
      if (w.startsWith(p)) melhor = Math.max(melhor, 60);
      else if (w.includes(p)) melhor = Math.max(melhor, 50);
      else {
        const lim = toleranciaPara(p);
        const trecho = w.slice(0, Math.max(p.length, Math.min(w.length, p.length + lim)));
        const d = Math.min(distancia(p, w, lim), distancia(p, trecho, lim));
        if (d <= lim) melhor = Math.max(melhor, 40 - d * 10);
      }
    }
    if (!melhor) return 0;
    total += melhor;
  }
  return total / busca.split(" ").length;
}

/** Filtra e ordena itens pela melhor pontuação entre os campos informados. */
export function filtrarPorBusca(itens, termo, campos) {
  if (!normalizarBusca(termo)) return itens;
  return itens
    .map((item) => ({ item, pontos: Math.max(...campos.map((c) => pontuarBusca(typeof c === "function" ? c(item) : item[c], termo))) }))
    .filter((r) => r.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos)
    .map((r) => r.item);
}
