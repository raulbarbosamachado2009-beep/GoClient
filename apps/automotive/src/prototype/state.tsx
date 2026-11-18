import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';
import { type MockTrack, NOW_PLAYING } from '../mocks/data';

/**
 * Estado APENAS visual do protótipo de design: o que está aberto, minimizado ou
 * selecionado. Nada aqui é persistido nem fala com a API.
 */
interface PrototypeState {
  musicConnected: boolean;
  setMusicConnected: (v: boolean) => void;
  nowPlaying: MockTrack | null;
  setNowPlaying: (t: MockTrack | null) => void;
  overlay: ReactNode;
  setOverlay: (node: ReactNode) => void;
}

const Ctx = createContext<PrototypeState | null>(null);

export function PrototypeProvider({ children }: { children: ReactNode }) {
  const [musicConnected, setMusicConnected] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<MockTrack | null>(null);
  const [overlay, setOverlay] = useState<ReactNode>(null);
  const value = useMemo(
    () => ({ musicConnected, setMusicConnected, nowPlaying, setNowPlaying, overlay, setOverlay }),
    [musicConnected, nowPlaying, overlay],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrototype(): PrototypeState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePrototype fora do PrototypeProvider');
  return ctx;
}

export { NOW_PLAYING };
