import { createContext, useContext } from 'react';

/** Estado de uma tela mantida aberta (ver kept-screens.tsx). */
export type Params = Record<string, string | undefined>;
export const KeptContext = createContext<{ active: boolean; params: Params }>({
  active: true,
  params: {},
});

/** A tela mantida está à mostra? (escondida, ela continua viva, mas não deve pedir nada) */
export const useKeptActive = () => useContext(KeptContext).active;

/**
 * Parâmetros da rota (`?rota=dia`, `?secao=clientes`…) para uma tela mantida. Enquanto ela
 * está escondida, valem os últimos que ela recebeu (os de outra aba não chegam a ela).
 */
export function useKeptParams<T extends Params>(): T {
  return useContext(KeptContext).params as T;
}
