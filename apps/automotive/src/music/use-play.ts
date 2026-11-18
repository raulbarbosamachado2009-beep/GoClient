import { useRouter } from 'expo-router';
import { NOW_PLAYING } from '../mocks/data';
import { usePrototype } from '../prototype/state';

/** Simula "tocar" no protótipo: define a faixa atual e abre o player. */
export function usePlay() {
  const { setNowPlaying } = usePrototype();
  const router = useRouter();
  return () => {
    setNowPlaying(NOW_PLAYING);
    router.push('/player');
  };
}
