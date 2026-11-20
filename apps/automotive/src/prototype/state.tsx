import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import {
  ALL_TRACK_IDS,
  type MockSpotifyAccount,
  type MockTrack,
  SPOTIFY_ACCOUNTS,
  trackById,
} from '../mocks/data';
import { avatarColors } from '../spotify/mapping';
import { useSpotify } from '../spotify/provider';

/**
 * Estado da interface: o que está aberto, minimizado ou tocando.
 * Com uma conta do Spotify conectada (compilação com Client ID), a reprodução e a conta
 * vêm do Spotify (spotify/provider.tsx); sem ela, tudo é a demonstração do protótipo.
 */
interface PrototypeState {
  musicConnected: boolean;
  /** Janela do Kyte aberta (o login em si fica salvo nos cookies da janela). */
  kyteOpen: boolean;
  setKyteOpen: (v: boolean) => void;
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
  /**
   * Toca uma faixa; a fila padrão é a lista inteira. No Spotify, `context` é a playlist ou
   * álbum de onde ela veio e `hint` a própria faixa (mostrada na hora no player).
   */
  playTrack: (trackId: string, queue?: string[], context?: string, hint?: MockTrack) => void;
  /** Toca uma playlist, álbum ou programa inteiro do Spotify. */
  playContext: (uri: string) => void;
  next: () => void;
  previous: () => void;
  togglePlaying: () => void;
  overlay: ReactNode;
  setOverlay: (node: ReactNode) => void;
}

const Ctx = createContext<PrototypeState | null>(null);

export function PrototypeProvider({ children }: { children: ReactNode }) {
  const sp = useSpotify();
  const live = sp.enabled && sp.active !== null;
  const [musicConnected, setMusicConnected] = useState(false);
  const [kyteOpen, setKyteOpen] = useState(false);
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
    const base = {
      kyteOpen,
      setKyteOpen,
      overlay,
      setOverlay,
    };
    if (sp.enabled) {
      // Compilação com Spotify real: sem conta conectada, a Música mostra o login.
      const acc = sp.active;
      return {
        ...base,
        musicConnected: live,
        setMusicConnected: (v: boolean) => (v ? sp.openLogin() : undefined),
        spotifyAccount: acc
          ? { id: acc.id, name: acc.name, colors: avatarColors(acc.id) }
          : (SPOTIFY_ACCOUNTS[0] as MockSpotifyAccount),
        setSpotifyAccount: sp.setActive,
        nowPlaying: sp.playback.track,
        upNext: sp.playback.upNext,
        queue: [],
        playing: sp.playback.isPlaying,
        playTrack: (trackId, list, context, hint) =>
          sp.play(
            context
              ? { contextUri: context, offsetUri: trackId, hint }
              : { uris: list && list.length > 0 ? list : [trackId], offsetUri: trackId, hint },
          ),
        playContext: (uri) => sp.play({ contextUri: uri }),
        next: sp.next,
        previous: sp.previous,
        togglePlaying: sp.toggle,
      };
    }
    return {
      ...base,
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
      playContext: () => playTrack('t1'),
      next: () => step(1),
      previous: () => step(-1),
      togglePlaying: () => setPlaying((p) => !p),
    };
  }, [
    sp,
    live,
    musicConnected,
    kyteOpen,
    accountId,
    index,
    queue,
    playing,
    playTrack,
    step,
    overlay,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrototype(): PrototypeState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePrototype fora do PrototypeProvider');
  return ctx;
}
