import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import {
  ALL_TRACK_IDS,
  type MockSpotifyAccount,
  type MockTrack,
  SPOTIFY_ACCOUNTS,
  trackById,
} from '../mocks/data';

/**
 * Estado APENAS visual do protótipo de design: o que está aberto, minimizado ou tocando.
 * Nada aqui é persistido nem fala com a API ou com o Spotify.
 */
interface PrototypeState {
  musicConnected: boolean;
  setMusicConnected: (v: boolean) => void;
  /** Conta do Spotify em uso no seletor de contas. */
  spotifyAccount: MockSpotifyAccount;
  setSpotifyAccount: (id: string) => void;
  /** Faixa atual (null enquanto nada foi tocado). */
  nowPlaying: MockTrack | null;
  /** Fila de reprodução (IDs) e posição atual. */
  queue: string[];
  upNext: MockTrack | null;
  playing: boolean;
  /** Toca uma faixa; a fila padrão é a lista inteira. */
  playTrack: (trackId: string, queue?: string[]) => void;
  next: () => void;
  previous: () => void;
  togglePlaying: () => void;
  overlay: ReactNode;
  setOverlay: (node: ReactNode) => void;
}

const Ctx = createContext<PrototypeState | null>(null);

export function PrototypeProvider({ children }: { children: ReactNode }) {
  const [musicConnected, setMusicConnected] = useState(false);
  const [accountId, setSpotifyAccount] = useState('raul');
  const [queue, setQueue] = useState<string[]>(ALL_TRACK_IDS);
  const [index, setIndex] = useState<number | null>(null);
  const [playing, setPlaying] = useState(true);
  const [overlay, setOverlay] = useState<ReactNode>(null);

  const playTrack = useCallback((trackId: string, nextQueue?: string[]) => {
    // Uma playlist com uma faixa só (single) continua na lista completa, para que
    // "próxima" e "anterior" sempre tenham para onde ir.
    const q = nextQueue && nextQueue.length > 1 ? nextQueue : ALL_TRACK_IDS;
    setQueue(q);
    setIndex(Math.max(0, q.indexOf(trackId)));
    setPlaying(true);
  }, []);

  const step = useCallback(
    (delta: number) =>
      setIndex((i) => (i === null ? 0 : (i + delta + queue.length) % queue.length)),
    [queue.length],
  );

  const value = useMemo<PrototypeState>(() => {
    const currentId = index === null ? null : queue[index];
    const nextId = index === null ? null : queue[(index + 1) % queue.length];
    return {
      musicConnected,
      setMusicConnected,
      spotifyAccount:
        SPOTIFY_ACCOUNTS.find((a) => a.id === accountId) ??
        (SPOTIFY_ACCOUNTS[0] as MockSpotifyAccount),
      setSpotifyAccount,
      nowPlaying: currentId ? trackById(currentId) : null,
      upNext: nextId ? trackById(nextId) : null,
      queue,
      playing,
      playTrack,
      next: () => step(1),
      previous: () => step(-1),
      togglePlaying: () => setPlaying((p) => !p),
      overlay,
      setOverlay,
    };
  }, [musicConnected, accountId, index, queue, playing, playTrack, step, overlay]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrototype(): PrototypeState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePrototype fora do PrototypeProvider');
  return ctx;
}
