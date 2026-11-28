import { useEffect, useState } from 'react';

/**
 * Tema "Automático" pelo horário (pedido do usuário em 28/11/2026): escuro das 17h às 5h59,
 * claro das 6h às 16h59. Troca sozinho na virada da hora, sem reabrir o app.
 */
export type ClockMode = 'dark' | 'light';

export const DARK_FROM = 17;
export const LIGHT_FROM = 6;

export function modeAt(date: Date): ClockMode {
  const h = date.getHours();
  return h >= DARK_FROM || h < LIGHT_FROM ? 'dark' : 'light';
}

/** Milissegundos até a próxima hora cheia (quando o modo pode mudar). */
export function msToNextHour(date: Date): number {
  const next = new Date(date);
  next.setHours(date.getHours() + 1, 0, 0, 0);
  return next.getTime() - date.getTime();
}

/** Modo do horário atual; só agenda a troca quando `enabled`. */
export function useClockMode(enabled: boolean): ClockMode {
  const [mode, setMode] = useState<ClockMode>(() => modeAt(new Date()));
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const now = new Date();
      setMode(modeAt(now));
      // +500 ms de folga para cair já dentro da nova hora.
      timer = setTimeout(tick, msToNextHour(now) + 500);
    };
    tick();
    return () => clearTimeout(timer);
  }, [enabled]);
  return mode;
}
