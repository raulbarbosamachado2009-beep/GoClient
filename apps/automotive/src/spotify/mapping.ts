import type { MockPlaylist, MockTrack } from '../mocks/data';

/**
 * Converte as respostas da Web API do Spotify para as mesmas formas usadas pelas telas
 * da Música (as do protótipo), para que as telas não precisem saber de onde vêm os dados.
 */

export interface SpImage {
  url: string;
  width?: number | null;
  height?: number | null;
}
export interface SpArtist {
  id: string;
  name: string;
  uri: string;
  images?: SpImage[];
}
export interface SpAlbum {
  id: string;
  name: string;
  uri: string;
  images?: SpImage[];
  artists?: SpArtist[];
  album_type?: string;
}
export interface SpTrack {
  id: string;
  name: string;
  uri: string;
  type?: string;
  duration_ms: number;
  explicit?: boolean;
  artists?: SpArtist[];
  album?: SpAlbum;
  /** Episódios de podcast trazem a imagem aqui. */
  images?: SpImage[];
  show?: { name: string };
}
export interface SpPlaylist {
  id: string;
  name: string;
  uri: string;
  images?: SpImage[] | null;
  owner?: { display_name?: string; id: string };
  items?: { total?: number };
  tracks?: { total?: number };
}
export interface SpShow {
  id: string;
  name: string;
  uri: string;
  images?: SpImage[];
  publisher?: string;
}

/** Imagem mais próxima do tamanho pedido (o Spotify manda 640, 300 e 64 px). */
export function pickImage(images: SpImage[] | null | undefined, target: number) {
  if (!images || images.length === 0) return undefined;
  const sorted = [...images].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  const best = sorted.find((i) => (i.width ?? 640) >= target) ?? sorted[sorted.length - 1];
  return best ? { uri: best.url } : undefined;
}

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function hslToHex(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const hex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`.toUpperCase();
}

/**
 * Cor de apoio estável por item. Sem uma biblioteca nativa de extração de cores, o app não
 * lê a cor real da capa remota: usa um tom escuro derivado do identificador.
 */
export function tintFor(key: string, lightness = 0.28): string {
  return hslToHex(hash(key) % 360, 0.42, lightness);
}

export function avatarColors(key: string): readonly [string, string] {
  return [tintFor(key, 0.62), tintFor(key, 0.46)];
}

function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function toTrack(t: SpTrack, albumFallback?: SpAlbum): MockTrack {
  const album = t.album ?? albumFallback;
  const images = album?.images ?? t.images;
  const art = pickImage(images, 300);
  const big = pickImage(images, 600) ?? art;
  const key = album?.id ?? t.id;
  return {
    id: t.uri,
    title: t.name,
    artists: t.artists?.map((a) => a.name).join(', ') ?? t.show?.name ?? '',
    album: album?.name ?? t.show?.name ?? t.name,
    cover: tintFor(key, 0.34),
    image: art ?? { uri: '' },
    backdrop: big ?? { uri: '' },
    // A capa remota (640 px) é desfocada na hora; o raio é bem menor que a imagem, o que
    // evita a queda do Android com raios maiores que o bitmap.
    backdropBlur: 24,
    tint: tintFor(key),
    duration: formatDuration(t.duration_ms),
    explicit: t.explicit,
    genres: [],
  };
}

export function toPlaylist(p: SpPlaylist): MockPlaylist {
  const total = p.items?.total ?? p.tracks?.total ?? 0;
  return {
    id: p.uri,
    uri: p.uri,
    name: p.name,
    detail: `Playlist • ${p.owner?.display_name ?? ''}`.replace(/ • $/, ''),
    kind: 'Playlist',
    cover: tintFor(p.id, 0.4),
    image: pickImage(p.images, 300),
    tracks: [],
    total,
  };
}

export function toAlbum(a: SpAlbum): MockPlaylist {
  return {
    id: a.uri,
    uri: a.uri,
    name: a.name,
    detail: `${a.album_type === 'single' ? 'Single' : 'Álbum'} • ${a.artists?.map((x) => x.name).join(', ') ?? ''}`,
    kind: 'Single',
    cover: tintFor(a.id, 0.4),
    image: pickImage(a.images, 300),
    tracks: [],
  };
}

export function toShow(s: SpShow) {
  return {
    id: s.uri,
    uri: s.uri,
    name: s.name,
    cover: tintFor(s.id, 0.4),
    image: pickImage(s.images, 300),
  };
}

export function toArtist(a: SpArtist) {
  return { id: a.uri, uri: a.uri, name: a.name, image: pickImage(a.images, 300) };
}
