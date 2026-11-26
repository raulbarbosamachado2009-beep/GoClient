/** Nomes mal ouvidos pelo reconhecimento de voz: comparação tolerante a letras trocadas. */
const norm = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/** Distância de edição entre dois textos (para nomes mal ouvidos). */
function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0] ?? 0;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j] ?? 0;
      row[j] = Math.min(
        (row[j] ?? 0) + 1,
        (row[j - 1] ?? 0) + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      prev = tmp;
    }
  }
  return row[b.length] ?? 0;
}

/**
 * Quão parecido um nome de cliente é com o que foi dito (0 a 1): compara cada palavra dita
 * com a palavra mais próxima do nome, tolerando letras trocadas ("Adilsom" ≈ "Adilson").
 */
export function similarity(said: string, name: string): number {
  const words = (t: string) =>
    norm(t)
      .split(/[^a-z0-9]+/)
      .filter(
        (w) => w.length > 2 && !/^(barbearia|barber|shop|salao|studio|do|da|de|dos)$/.test(w),
      );
  const ws = words(said);
  const wn = words(name);
  if (!ws.length || !wn.length) return 0;
  let total = 0;
  for (const w of ws) {
    let best = 0;
    for (const n of wn) {
      const d = editDistance(w, n);
      best = Math.max(best, 1 - d / Math.max(w.length, n.length));
    }
    total += best;
  }
  return total / ws.length;
}

/** Nomes parecidos com o dito, do mais ao menos parecido. */
export function closest(said: string, names: string[], min = 0.6): string[] {
  return names
    .map((n) => ({ n, s: similarity(said, n) }))
    .filter((x) => x.s >= min)
    .sort((a, b) => b.s - a.s)
    .slice(0, 4)
    .map((x) => x.n);
}
