import type { MockTrack } from '../mocks/data';
import { tintFor } from './mapping';

/**
 * Regras puras da reprodução do Spotify (sem React Native), para poderem ser testadas:
 * como montar cada pedido de "tocar", qual aparelho usar e quando aceitar o estado lido.
 */

/** Marca as Músicas Curtidas (não têm URI de contexto na Web API). */
export const LIKED_CONTEXT = 'spotify:collection';

export interface PlayRequest {
  /** Playlist, álbum, programa ou `LIKED_CONTEXT`. */
  contextUri?: string;
  /** Lista avulsa de faixas, na ordem da tela (ex.: Músicas Curtidas, resultado da busca). */
  uris?: string[];
  /** Faixa por onde começar. */
  offsetUri?: string;
  /** Ordem das faixas do contexto como a tela mostra (para achar a posição da escolhida). */
  order?: string[];
  /** Liga (true) ou desliga (false) o aleatório antes de tocar; indefinido = como estiver. */
  shuffle?: boolean;
  /** Faixa já conhecida, para o player mostrar na hora (antes da confirmação do Spotify). */
  hint?: MockTrack;
  /** Nome do que está tocando (playlist/álbum), para o cabeçalho do player. */
  contextTitle?: string;
}

export type RepeatMode = 'off' | 'track' | 'context';

export interface Playback {
  track: MockTrack | null;
  isPlaying: boolean;
  /** Próximas faixas (as primeiras da fila do Spotify). */
  queue: MockTrack[];
  device: string | null;
  /** Posição em ms lida em `at` (Date.now()). */
  positionMs: number;
  durationMs: number;
  at: number;
  shuffle: boolean;
  repeat: RepeatMode;
  /** De onde a faixa está tocando. */
  context: { uri: string; title: string } | null;
  /** Artistas da faixa atual (com URI, para buscar foto). */
  artists: { name: string; uri: string }[];
  /** De onde veio o estado: SDK do aparelho (instantâneo) ou Web API (lido a cada 4 s). */
  source: 'remote' | 'web' | null;
}

export const EMPTY_PLAYBACK: Playback = {
  track: null,
  isPlaying: false,
  queue: [],
  device: null,
  positionMs: 0,
  durationMs: 0,
  at: 0,
  shuffle: false,
  repeat: 'off',
  context: null,
  artists: [],
  source: null,
};

/** `spotify:image:<id>` (App Remote) → endereço https da mesma imagem. */
export function remoteImage(raw: string | null | undefined): string | undefined {
  const m = /^spotify:image:([A-Za-z0-9]+)$/.exec(raw ?? '');
  return m ? `https://i.scdn.co/image/${m[1]}` : undefined;
}

export function formatMs(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export interface RemoteTrack {
  uri: string;
  name: string;
  artist: string;
  artists?: { name: string; uri: string }[];
  album: string;
  albumUri?: string;
  duration: number;
  imageUri: string;
}

/** Faixa do App Remote no formato das telas. */
export function remoteTrack(t: RemoteTrack): MockTrack {
  const img = remoteImage(t.imageUri);
  const key = t.albumUri || t.uri;
  const names = t.artists?.length ? t.artists.map((a) => a.name).join(', ') : t.artist;
  return {
    id: t.uri,
    title: t.name,
    artists: names,
    album: t.album || t.name,
    cover: tintFor(key, 0.34),
    image: img ? { uri: img } : { uri: '' },
    backdrop: img ? { uri: img } : { uri: '' },
    backdropBlur: 24,
    tint: tintFor(key),
    duration: formatMs(t.duration),
    genres: [],
  };
}

export const repeatFromRemote = (n: number): RepeatMode =>
  n === 1 ? 'track' : n === 2 ? 'context' : 'off';
export const repeatToRemote = (m: RepeatMode): number =>
  m === 'track' ? 1 : m === 'context' ? 2 : 0;
/** Ordem do botão "Repetir", como no app do Spotify. */
export const nextRepeat = (m: RepeatMode): RepeatMode =>
  m === 'off' ? 'context' : m === 'context' ? 'track' : 'off';

/** Comando para o SDK do aparelho (App Remote). */
export type RemotePlan =
  | { kind: 'index'; uri: string; index: number }
  | { kind: 'play'; uri: string }
  | { kind: 'resume' };

const indexable = (uri: string) =>
  uri.includes(':playlist:') || uri.includes(':album:') || uri === LIKED_CONTEXT;

/**
 * Traduz o pedido para o App Remote. Antes, o pedido caía em `play(uris[0])` ou tocava a
 * playlist desde o começo: por isso começava "uma música completamente diferente".
 * Agora a faixa escolhida é sempre a primeira a tocar.
 */
export function planRemotePlay(req: PlayRequest, userId?: string): RemotePlan {
  const list = req.order ?? req.uris;
  if (req.contextUri && indexable(req.contextUri) && req.offsetUri && list) {
    const index = list.indexOf(req.offsetUri);
    const uri =
      req.contextUri === LIKED_CONTEXT
        ? userId
          ? `spotify:user:${userId}:collection`
          : null
        : req.contextUri;
    if (index >= 0 && uri) return { kind: 'index', uri, index };
  }
  // Sem posição conhecida: toca a própria faixa (certa), mesmo perdendo o resto da lista.
  if (req.offsetUri) return { kind: 'play', uri: req.offsetUri };
  if (req.contextUri && req.contextUri !== LIKED_CONTEXT)
    return { kind: 'play', uri: req.contextUri };
  const first = req.uris?.[0];
  if (first) return { kind: 'play', uri: first };
  if (req.contextUri === LIKED_CONTEXT && userId)
    return { kind: 'play', uri: `spotify:user:${userId}:collection` };
  return { kind: 'resume' };
}

/** Corpo do PUT /me/player/play da Web API. */
export function webPlayBody(req: PlayRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  const isLiked = req.contextUri === LIKED_CONTEXT;
  if (req.contextUri && !isLiked) body.context_uri = req.contextUri;
  const list = isLiked ? (req.order ?? req.uris) : req.uris;
  if (list && !body.context_uri) {
    // O Spotify aceita até 100 faixas por pedido: manda uma janela em volta da escolhida.
    const at = req.offsetUri ? Math.max(0, list.indexOf(req.offsetUri)) : 0;
    const start = Math.max(0, Math.min(at - 10, list.length - 100));
    body.uris = list.slice(start, start + 100);
  }
  if (req.offsetUri) {
    if (body.uris) body.offset = { uri: req.offsetUri };
    else if (req.contextUri && indexable(req.contextUri)) body.offset = { uri: req.offsetUri };
    else if (!body.context_uri) body.uris = [req.offsetUri];
  }
  return body;
}

export interface WebDevice {
  id: string;
  name: string;
  type?: string;
  is_active?: boolean;
  is_restricted: boolean;
}

/** Aparelho para a Web API: o ativo; senão o primeiro que aceita comandos. */
export function pickDevice(devices: WebDevice[]): WebDevice | null {
  const usable = devices.filter((d) => !d.is_restricted);
  return usable.find((d) => d.is_active) ?? usable[0] ?? null;
}

/**
 * Depois de um "tocar", o Spotify leva alguns segundos para trocar a faixa. Leituras que
 * ainda mostram a faixa antiga são ignoradas até `until` (senão o player "pisca" de volta
 * para a música anterior e as informações ficam erradas).
 */
export function acceptReading(
  expected: { uri: string; until: number } | null,
  readUri: string | null,
  now: number,
): boolean {
  if (!expected || now > expected.until) return true;
  return readUri === expected.uri;
}

/** Posição estimada agora (o estado é lido de tempos em tempos). */
export function positionNow(p: Playback, now: number): number {
  if (!p.isPlaying || !p.at) return p.positionMs;
  return Math.min(p.durationMs || Number.POSITIVE_INFINITY, p.positionMs + (now - p.at));
}

/** Mesmo estado na tela? (a posição só conta se fugiu mais de 1,5 s da estimativa). */
export function samePlayback(a: Playback, b: Playback): boolean {
  const keys: (keyof Playback)[] = [
    'isPlaying',
    'device',
    'durationMs',
    'shuffle',
    'repeat',
    'source',
  ];
  if (keys.some((k) => a[k] !== b[k])) return false;
  if (a.track?.id !== b.track?.id || a.track?.image !== b.track?.image) return false;
  if (a.context?.uri !== b.context?.uri || a.context?.title !== b.context?.title) return false;
  if (a.queue.map((t) => t.id).join() !== b.queue.map((t) => t.id).join()) return false;
  if (a.artists.map((x) => x.uri).join() !== b.artists.map((x) => x.uri).join()) return false;
  return Math.abs(positionNow(a, b.at) - b.positionMs) < 1500;
}
