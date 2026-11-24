/**
 * Ordem manual da rota do dia (lista "Rota" do Mapa, arrastável como a fila do Spotify).
 * Funções puras: a interface só calcula para onde o item foi e grava a nova ordem.
 */

/** Move o item de `from` para `to`, devolvendo uma lista nova. Índices fora da lista são ajustados. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  if (from < 0 || from >= next.length) return next;
  const target = Math.min(Math.max(to, 0), next.length - 1);
  const [item] = next.splice(from, 1);
  next.splice(target, 0, item as T);
  return next;
}

/**
 * Para onde vai a linha arrastada: a partir do índice inicial e do deslocamento vertical
 * (em pontos), com linhas de altura fixa `rowHeight`. Troca de lugar ao passar da metade.
 */
export function dropIndex(from: number, dy: number, rowHeight: number, count: number): number {
  if (count <= 0 || rowHeight <= 0) return 0;
  return Math.min(Math.max(from + Math.round(dy / rowHeight), 0), count - 1);
}

/**
 * Aplica uma ordem manual sobre os ids atuais: os que estão na ordem manual vêm primeiro
 * (nessa ordem); os novos (acrescentados depois) entram no fim, na ordem em que chegaram.
 * Ids da ordem manual que saíram da rota são ignorados.
 */
export function applyOrder(ids: readonly string[], order: readonly string[] | null): string[] {
  if (!order) return [...ids];
  const present = new Set(ids);
  const kept = order.filter((id) => present.has(id));
  const known = new Set(kept);
  return [...kept, ...ids.filter((id) => !known.has(id))];
}
