import { createContext, useContext } from 'react';

/** Seções do Kyte no GoClient (menu ☰). "vender" abre a página real do Kyte. */
export type Section = 'inicio' | 'vender' | 'produtos' | 'clientes' | 'historico';

export const SECTIONS: { key: Section; label: string; icon: string }[] = [
  { key: 'inicio', label: 'Início', icon: 'home-outline' },
  { key: 'vender', label: 'Vender', icon: 'cart-outline' },
  { key: 'produtos', label: 'Produtos', icon: 'cube-outline' },
  { key: 'clientes', label: 'Clientes', icon: 'people-outline' },
  { key: 'historico', label: 'Histórico', icon: 'receipt-outline' },
];

/** Telas por cima de uma seção (detalhes). */
export type Detail =
  | { type: 'client'; id: string }
  | { type: 'sale'; id: string }
  | { type: 'product'; id: string }
  | { type: 'receipt'; id: string }
  | { type: 'diagnostico' }
  /** Cadastros manuais de produto e cliente. */
  | { type: 'newProduct' }
  | { type: 'newClient' };

export interface KyteNav {
  section: Section;
  go: (s: Section) => void;
  open: (d: Detail) => void;
  back: () => void;
  /** Abre o menu ☰ das seções. */
  menu: () => void;
  /** Abre a Havena (cadastros de cliente e produto são feitos por ela, com confirmação). */
  havena: () => void;
}

export const KyteNavContext = createContext<KyteNav | null>(null);

export function useKyteNav(): KyteNav {
  const n = useContext(KyteNavContext);
  if (!n) throw new Error('useKyteNav fora da área do Kyte');
  return n;
}
