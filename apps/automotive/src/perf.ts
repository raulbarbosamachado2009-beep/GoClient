/**
 * Cronômetro de tempo de resposta (pedido de 26/11/2026: o app tem que ser extremamente
 * rápido). Cada etapa importante marca quanto tempo levou desde que o app abriu (ou desde
 * que ela começou), e o Diagnóstico (Ajustes → Diagnóstico das integrações) mostra a lista,
 * para medir no aparelho de verdade. Fica só na memória: some ao fechar o app.
 */
const appStart = Date.now();

export interface PerfEntry {
  name: string;
  /** Milissegundos da etapa (desde a abertura do app, se não tiver início próprio). */
  ms: number;
  at: number;
}

const entries: PerfEntry[] = [];
const firsts = new Set<string>();
const MAX = 60;

/** Registra uma etapa que levou `ms` (ex.: uma leitura do Kyte). */
export function perfRecord(name: string, ms: number) {
  entries.push({ name, ms: Math.round(ms), at: Date.now() });
  if (entries.length > MAX) entries.shift();
}

/** Marca, só na primeira vez, quanto tempo depois da abertura do app algo ficou pronto. */
export function perfFirst(name: string) {
  if (firsts.has(name)) return;
  firsts.add(name);
  perfRecord(name, Date.now() - appStart);
}

/** Cronômetro: `const end = perfStart('Kyte: clientes'); …; end();` */
export function perfStart(name: string) {
  const t = Date.now();
  return () => perfRecord(name, Date.now() - t);
}

export const perfEntries = (): readonly PerfEntry[] => entries;
