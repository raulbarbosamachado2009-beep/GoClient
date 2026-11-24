import { usePathname, useRouter } from 'expo-router';

export type MapParams = { rota?: 'dia' | 'cliente'; id?: string };

/**
 * Abre o Mapa num modo (rota do dia, cliente ou explorar). Já no Mapa, só troca os parâmetros
 * (`setParams`): a tela continua montada e os cartões e o mapa fazem a transição. Um
 * `replace` montaria a tela de novo (corte seco).
 */
export function useMapNav() {
  const router = useRouter();
  const pathname = usePathname();
  return (params: MapParams = {}) => {
    if (pathname === '/mapa') {
      router.setParams({ rota: params.rota ?? '', id: params.id ?? '' });
      return;
    }
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v));
    router.replace({ pathname: '/mapa', params: clean });
  };
}
