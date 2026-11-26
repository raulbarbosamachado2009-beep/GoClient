import { useEffect, useState, useSyncExternalStore } from 'react';

/**
 * Ligação de voz **simulada** do WhatsApp do Preview (pedido do usuário em 26/11/2026).
 * Fica fora da tela do WhatsApp para a chamada continuar quando o usuário vai para outra
 * página: lá ela vira um cartão mínimo no canto direito (ver `call-layer.tsx`).
 *
 * Nada liga de verdade: "Chamando…" vira uma chamada em andamento depois de alguns
 * segundos, com contador de duração. Só voz (a ligação de vídeo foi removida).
 */
export interface LiveCall {
  contact: string;
  name: string;
  group: boolean;
  status: 'ringing' | 'active';
  /** Quando foi atendida (ms), para o contador. */
  since: number;
  muted: boolean;
}

/** Tempo até o contato fictício "atender". */
const ANSWER_MS = 4000;

let current: LiveCall | null = null;
let answerTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function set(next: LiveCall | null) {
  current = next;
  for (const l of listeners) l();
}

export function startCall(who: { contact: string; name: string; group: boolean }) {
  if (answerTimer) clearTimeout(answerTimer);
  set({ ...who, status: 'ringing', since: 0, muted: false });
  answerTimer = setTimeout(() => {
    answerTimer = null;
    if (current) set({ ...current, status: 'active', since: Date.now() });
  }, ANSWER_MS);
}

export function hangUp() {
  if (answerTimer) clearTimeout(answerTimer);
  answerTimer = null;
  set(null);
}

export function toggleMute() {
  if (current) set({ ...current, muted: !current.muted });
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useLiveCall() {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => current,
  );
}

/** "Chamando…" ou a duração (m:ss), atualizada a cada segundo. */
export function useCallStatus(call: LiveCall | null) {
  const [now, setNow] = useState(Date.now());
  const active = call?.status === 'active';
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  if (!call) return '';
  if (!active) return 'Chamando…';
  const s = Math.max(0, Math.floor((now - call.since) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
