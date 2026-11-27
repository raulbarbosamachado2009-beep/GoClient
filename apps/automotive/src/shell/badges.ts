import { useEffect, useState } from 'react';

/**
 * Bolinha de notificação nos ícones do menu (barra de abas do celular e barra lateral da
 * multimídia). Pedido de 27/11/2026: só quando precisa, por exemplo mensagem nova no WhatsApp
 * ou venda nova no Kyte. Quem está aberto não ganha bolinha, e abrir o app limpa a dele.
 */
export type BadgeApp = 'kyte' | 'whatsapp';

const counts: Record<BadgeApp, number> = { kyte: 0, whatsapp: 0 };
let current: BadgeApp | null = null;
const listeners = new Set<() => void>();
const emit = () => {
  for (const l of listeners) l();
};

/** Seção aberta agora (o layout avisa a cada troca de página). Abrir um app limpa a bolinha dele. */
export function setCurrentApp(section: string) {
  current = section === 'kyte' || section === 'whatsapp' ? section : null;
  if (current && counts[current]) {
    counts[current] = 0;
    emit();
  }
}

/** Valor total (ex.: conversas não lidas do WhatsApp). Com o app aberto, não marca nada. */
export function setBadge(app: BadgeApp, n: number) {
  const v = app === current ? 0 : Math.max(0, n);
  if (counts[app] === v) return;
  counts[app] = v;
  emit();
}

/** Soma novidades (ex.: vendas novas no Kyte). Com o app aberto, não marca nada. */
export function bumpBadge(app: BadgeApp, n = 1) {
  if (app === current || n <= 0) return;
  counts[app] += n;
  emit();
}

export const badgeCount = (app: BadgeApp) => counts[app];

export function useBadge(app: BadgeApp | null | undefined): number {
  const [, tick] = useState(0);
  useEffect(() => {
    const l = () => tick((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return app ? counts[app] : 0;
}
