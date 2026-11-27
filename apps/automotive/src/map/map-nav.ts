import { type Href, usePathname, useRouter } from 'expo-router';

export type MapParams = { rota?: 'dia' | 'cliente'; id?: string };

// Último modo do Mapa (rota do dia ou cliente escolhido). O menu volta para o Mapa com ele,
// para a rota e o cliente não sumirem ao ir a outra página e voltar (pedido de 27/11/2026).
let lastMap: MapParams = {};

/** O Mapa avisa o modo atual a cada troca. */
export function rememberMap(params: { rota?: string; id?: string }) {
  const rota = params.rota === 'dia' || params.rota === 'cliente' ? params.rota : undefined;
  lastMap = rota ? { rota, ...(params.id ? { id: params.id } : {}) } : {};
}

/** Destino do item "Mapa" no menu: o Mapa no último modo usado. */
export function mapHref(): Href {
  return lastMap.rota ? { pathname: '/mapa', params: { ...lastMap } } : '/mapa';
}

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
