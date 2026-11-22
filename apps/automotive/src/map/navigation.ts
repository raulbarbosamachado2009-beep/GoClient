import * as Speech from 'expo-speech';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { LatLng, LiveRoute, RouteStep } from './routing';

/**
 * Navegação curva a curva dentro do GoClient, sobre a rota do OpenRouteService (que prefere
 * ruas de bairro). O app do Google Maps não é usado: ele refaria o caminho pelas avenidas.
 *
 * A cada leitura do GPS: acha o ponto da rota mais perto do carro, a próxima manobra e a
 * distância até ela, e fala a instrução em português (aos ~400 m, ~150 m e na hora de
 * virar). Ao passar por uma parada, avisa a chegada (`onArrive`).
 */
export interface Guidance {
  /** Próxima manobra (o que fazer). */
  next: RouteStep | null;
  /** Metros até a próxima manobra. */
  toNext: number;
  /** O que falta da viagem toda. */
  remainingMeters: number;
  remainingSeconds: number;
}

export function useTurnByTurn({
  route,
  position,
  active,
  onArrive,
}: {
  route: LiveRoute | null;
  position: LatLng | null;
  active: boolean;
  /** Chegou à parada `k` da rota (0 = a primeira). */
  onArrive?: (k: number) => void;
}): Guidance | null {
  const cum = useMemo(() => cumulative(route?.path ?? []), [route]);
  const hint = useRef(0);
  const spoken = useRef(new Set<string>());
  const arrived = useRef(new Set<number>());
  const [g, setG] = useState<Guidance | null>(null);

  // Rota nova (recalculada ou próxima parada): recomeça a contagem e as falas.
  // biome-ignore lint/correctness/useExhaustiveDependencies: zera só quando a rota muda
  useEffect(() => {
    hint.current = 0;
    spoken.current.clear();
    arrived.current.clear();
  }, [route]);

  useEffect(() => {
    if (!active) Speech.stop();
  }, [active]);

  useEffect(() => {
    if (!active || !route || !position || route.path.length < 2) {
      setG(null);
      return;
    }
    const loc = locate(route, cum, position, hint.current);
    hint.current = loc.index;
    const { next, nextIdx, toNext } = loc;
    setG({
      next,
      toNext,
      remainingMeters: loc.remaining,
      remainingSeconds: loc.remainingSeconds,
    });
    const steps = route.steps;

    if (!next) return;
    // Chegada numa parada (cada parada termina com uma manobra de "chegada", tipo 10).
    if (next.type === 10 && toNext < 35) {
      const k = steps.slice(0, nextIdx).filter((s) => s.type === 10).length;
      if (!arrived.current.has(k)) {
        arrived.current.add(k);
        say(next.instruction || 'Você chegou ao destino');
        onArrive?.(k);
      }
      return;
    }
    // Avisos antes da manobra.
    const key = (phase: string) => `${nextIdx}:${phase}`;
    if (toNext <= 40 && !spoken.current.has(key('now'))) {
      spoken.current.add(key('now'));
      say(next.instruction);
    } else if (toNext <= 170 && toNext > 60 && !spoken.current.has(key('150'))) {
      spoken.current.add(key('150'));
      say(`Em ${roundSpeech(toNext)}, ${lower(next.instruction)}`);
    } else if (toNext <= 450 && toNext > 250 && !spoken.current.has(key('400'))) {
      spoken.current.add(key('400'));
      say(`Em ${roundSpeech(toNext)}, ${lower(next.instruction)}`);
    }
  }, [active, route, position, cum, onArrive]);

  return g;
}

function say(text: string) {
  if (!text) return;
  Speech.stop();
  Speech.speak(text, { language: 'pt-BR', rate: 1.0 });
}

const lower = (t: string) => (t ? t.charAt(0).toLowerCase() + t.slice(1) : t);

function roundSpeech(m: number) {
  if (m >= 1000) return `${(m / 1000).toFixed(1).replace('.', ',')} quilômetros`;
  return `${Math.round(m / 50) * 50} metros`;
}

const M = 111320;

/** Onde o carro está na rota: próxima manobra, distância até ela e o que falta. */
export function locate(route: LiveRoute, cum: number[], position: LatLng, hint: number) {
  const { index, along } = nearest(position, route.path, hint);
  const at = (cum[index] ?? 0) + along;
  const total = cum[cum.length - 1] ?? 0;
  const steps = route.steps;
  const cur = Math.max(
    0,
    steps.findIndex((s) => index >= s.from && index < Math.max(s.to, s.from + 1)),
  );
  const nextIdx = Math.min(cur + 1, steps.length - 1);
  const next = steps[nextIdx] ?? null;
  const toNext = next ? Math.max(0, (cum[next.from] ?? total) - at) : 0;
  const remaining = Math.max(0, total - at);
  return {
    index,
    next,
    nextIdx,
    toNext,
    remaining,
    remainingSeconds: total > 0 ? (route.durationSeconds * remaining) / total : 0,
  };
}

/** Distância acumulada (m) ao longo da linha, ponto a ponto. */
export function cumulative(path: LatLng[]): number[] {
  const out = [0];
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1] as LatLng;
    const b = path[i] as LatLng;
    const k = Math.cos((a.latitude * Math.PI) / 180);
    const d = Math.hypot((b.longitude - a.longitude) * M * k, (b.latitude - a.latitude) * M);
    out.push((out[i - 1] ?? 0) + d);
  }
  return out;
}

/**
 * Trecho da rota mais perto do carro: índice do início do trecho e quantos metros já
 * foram percorridos nele. Procura perto da última posição (a rota não volta atrás).
 */
function nearest(p: LatLng, path: LatLng[], hint: number): { index: number; along: number } {
  const k = Math.cos((p.latitude * Math.PI) / 180);
  const xy = (q: LatLng) => ({
    x: (q.longitude - p.longitude) * M * k,
    y: (q.latitude - p.latitude) * M,
  });
  const lo = Math.max(1, hint - 5);
  const hi = Math.min(path.length - 1, hint + 400);
  let best = { index: hint, along: 0, d: Number.POSITIVE_INFINITY };
  for (let i = lo; i <= hi; i++) {
    const a = xy(path[i - 1] as LatLng);
    const b = xy(path[i] as LatLng);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const t = len2 > 0 ? Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / len2)) : 0;
    const d = Math.hypot(a.x + t * dx, a.y + t * dy);
    if (d < best.d) best = { index: i - 1, along: t * Math.sqrt(len2), d };
  }
  return { index: best.index, along: best.along };
}
