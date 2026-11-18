import { useRouter } from 'expo-router';
import { usePrototype } from '../prototype/state';

/** Toca uma faixa (com a fila opcional) e abre o player. */
export function usePlay() {
  const { playTrack } = usePrototype();
  const router = useRouter();
  return (trackId = 't1', queue?: string[]) => {
    playTrack(trackId, queue);
    router.push('/player');
  };
}

/** Abre a página de uma playlist/single. */
export function useOpenPlaylist() {
  const router = useRouter();
  return (id: string) => router.push({ pathname: '/musica/playlist/[id]', params: { id } });
}
