import { useEffect, useRef } from 'react';
import type { SimMessage } from './data';

/**
 * Mensagens mandadas ao WhatsApp simulado de fora dele (ex.: o recibo do Kyte em
 * "Compartilhar"). Fica um registro: a tela do WhatsApp (celular ou multimídia) aplica tudo
 * ao abrir e recebe as novas enquanto está aberta. Só no Preview; dados fictícios.
 */
export type Delivery = { chatId: string; messages: SimMessage[] };

const log: Delivery[] = [];
const listeners = new Set<() => void>();

export function deliver(items: Delivery[]) {
  if (!items.length) return;
  log.push(...items);
  for (const l of listeners) l();
}

/** Chama `apply` com cada entrega ainda não vista por esta tela (as antigas no início). */
export function useOutbox(apply: (d: Delivery) => void) {
  const seen = useRef(0);
  const fn = useRef(apply);
  fn.current = apply;
  useEffect(() => {
    const flush = () => {
      while (seen.current < log.length) {
        const d = log[seen.current] as Delivery;
        seen.current += 1;
        fn.current(d);
      }
    };
    flush();
    listeners.add(flush);
    return () => {
      listeners.delete(flush);
    };
  }, []);
}

export const simNow = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export type AttachKind = 'doc' | 'photo' | 'audio' | 'location';

/** Mensagem de exemplo para cada opção do "+" (arquivo, foto, áudio, localização). */
export function attachMessage(kind: AttachKind): SimMessage {
  const base = { id: `a${Date.now()}`, out: true, time: simNow(), day: 'Hoje' } as const;
  switch (kind) {
    case 'doc':
      return { ...base, kind, text: 'Catálogo de produtos', meta: 'PDF · 4 páginas' };
    case 'photo':
      return { ...base, kind, text: '' };
    case 'audio':
      return { ...base, kind, text: '0:08' };
    case 'location':
      return { ...base, kind, text: 'Localização atual', meta: 'Av. Brasil, 1200 · Campinas' };
  }
}

/* Abrir uma conversa vinda de fora (ex.: tocar numa conversa do cartão do WhatsApp no Mapa). */
let openRequest: string | null = null;
const openListeners = new Set<() => void>();

export function requestOpenChat(chatId: string) {
  openRequest = chatId;
  for (const l of openListeners) l();
}

/** A tela do WhatsApp abre a conversa pedida (ao montar ou quando o pedido chega). */
export function useOpenRequest(open: (chatId: string) => void) {
  const fn = useRef(open);
  fn.current = open;
  useEffect(() => {
    const take = () => {
      if (!openRequest) return;
      const id = openRequest;
      openRequest = null;
      fn.current(id);
    };
    take();
    openListeners.add(take);
    return () => {
      openListeners.delete(take);
    };
  }, []);
}
