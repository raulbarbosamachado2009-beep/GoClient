import { usePathname, useRouter } from 'expo-router';
import type { MockTrack } from '../mocks/data';
import { usePrototype } from '../prototype/state';

/**
 * Toca uma faixa (com a fila opcional) e abre o player. No Spotify, `context` é a
 * playlist/álbum de origem e `hint` a faixa, para o player já mostrar a capa certa.
 */
export function usePlay() {
  const { playTrack } = usePrototype();
  const router = useRouter();
  return (trackId = 't1', queue?: string[], context?: string, hint?: MockTrack) => {
    playTrack(trackId, queue, context, hint);
    router.push('/player');
  };
}

/** Toca uma playlist, álbum ou programa inteiro (Spotify) e abre o player. */
export function usePlayContext() {
  const { playContext } = usePrototype();
  const router = useRouter();
  return (uri?: string) => {
    if (uri) playContext(uri);
    else playContext('');
    router.push('/player');
  };
}

/** Abre a página de uma playlist/single. */
export function useOpenPlaylist() {
  const router = useRouter();
  const pathname = usePathname();
  // Lembra a origem para o "voltar" da playlist levar de volta ao lugar certo.
  const from = pathname.startsWith('/musica/biblioteca') ? 'biblioteca' : 'inicio';
  return (id: string) =>
    router.replace({ pathname: '/musica/playlist/[id]', params: { id, from } });
}
