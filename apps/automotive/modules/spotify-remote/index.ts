import { requireOptionalNativeModule } from 'expo';

/**
 * Controle do app do Spotify por trás (SDK oficial App Remote, só Android). No Preview (web)
 * e em compilações sem o módulo, `SpotifyRemote` é null e o app usa só a API Web.
 */
export interface RemotePlayerState {
  isPaused: boolean;
  /** Posição em ms no momento do evento. */
  position: number;
  shuffle: boolean;
  /** 0 = desligado, 1 = faixa, 2 = lista. */
  repeat: number;
  track: {
    uri: string;
    name: string;
    artist: string;
    artists: { name: string; uri: string }[];
    album: string;
    albumUri: string;
    duration: number;
    /** `spotify:image:<id>` (convertido para https em spotify/transport.ts). */
    imageUri: string;
    isEpisode: boolean;
  } | null;
}

export interface RemotePlayerContext {
  uri: string;
  title: string;
  type: string;
}

interface SpotifyRemoteModule {
  isInstalled(): boolean;
  isConnected(): boolean;
  connect(clientId: string, redirectUri: string, showAuthView: boolean): Promise<boolean>;
  disconnect(): void;
  play(uri: string): Promise<boolean>;
  queue(uri: string): Promise<boolean>;
  resume(): Promise<boolean>;
  pause(): Promise<boolean>;
  skipNext(): Promise<boolean>;
  skipPrevious(): Promise<boolean>;
  skipToIndex(uri: string, index: number): Promise<boolean>;
  seekTo(ms: number): Promise<boolean>;
  setShuffle(on: boolean): Promise<boolean>;
  setRepeat(mode: number): Promise<boolean>;
  getPlayerState(): Promise<RemotePlayerState>;
  addListener(event: 'onPlayerState', cb: (s: RemotePlayerState) => void): { remove(): void };
  addListener(event: 'onPlayerContext', cb: (c: RemotePlayerContext) => void): { remove(): void };
  addListener(event: 'onDisconnected', cb: (e: { reason: string }) => void): { remove(): void };
}

export const SpotifyRemote = requireOptionalNativeModule<SpotifyRemoteModule>('SpotifyRemote');
