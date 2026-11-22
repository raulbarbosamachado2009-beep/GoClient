import { requireOptionalNativeModule } from 'expo';

/**
 * Controle do app do Spotify por trás (SDK oficial App Remote, só Android). No Preview (web)
 * e em compilações sem o módulo, `SpotifyRemote` é null e o app usa só a API Web.
 */
export interface RemotePlayerState {
  isPaused: boolean;
  position: number;
  track: {
    uri: string;
    name: string;
    artist: string;
    album: string;
    duration: number;
    imageUri: string;
  } | null;
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
  addListener(event: 'onPlayerState', cb: (s: RemotePlayerState) => void): { remove(): void };
  addListener(event: 'onDisconnected', cb: (e: { reason: string }) => void): { remove(): void };
}

export const SpotifyRemote = requireOptionalNativeModule<SpotifyRemoteModule>('SpotifyRemote');
