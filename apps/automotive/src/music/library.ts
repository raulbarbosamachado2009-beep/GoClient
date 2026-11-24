import { useEffect, useState } from 'react';
import {
  ARTISTS,
  COVERS,
  type MockArtist,
  type MockPlaylist,
  type MockShow,
  type MockTrack,
  PLAYLISTS,
  playlistById,
  SHOWS,
  TRACKS,
  trackById,
} from '../mocks/data';
import {
  type SpAlbum,
  type SpArtist,
  type SpPlaylist,
  type SpShow,
  type SpTrack,
  toAlbum,
  toArtist,
  toPlaylist,
  toShow,
  toTrack,
} from '../spotify/mapping';
import { useSpotify, useSpotifyLive } from '../spotify/provider';

/**
 * Dados das telas da Música. Com uma conta do Spotify conectada vêm da Web API; sem ela,
 * do protótipo. As telas usam sempre os mesmos formatos.
 */

const cache = new Map<string, unknown>();

/** GET na Web API com cache por conta durante o uso do app. `path` nulo = não buscar. */
export function useSpotifyGet<T, R>(path: string | null, map: (raw: T) => R) {
  const { call, active } = useSpotify();
  const key = path && active ? `${active.id}|${path}` : null;
  const [state, setState] = useState<{ key: string | null; data?: R; error?: string }>(() => ({
    key,
    data: key ? (cache.get(key) as R | undefined) : undefined,
  }));

  // biome-ignore lint/correctness/useExhaustiveDependencies: refaz a busca só quando a chave muda
  useEffect(() => {
    if (!key || !path) return;
    const hit = cache.get(key) as R | undefined;
    if (hit !== undefined) {
      setState({ key, data: hit });
      return;
    }
    let alive = true;
    setState({ key });
    // "all:" = busca todas as páginas (segue o "next" do Spotify, até 2.000 itens).
    const load = path.startsWith('all:')
      ? (async () => {
          let next: string | null = path.slice(4);
          const items: unknown[] = [];
          while (next && items.length < 2000) {
            const page: { items?: unknown[]; next?: string | null } | null = await call(next);
            items.push(...(page?.items ?? []));
            next = page?.next ? page.next.replace('https://api.spotify.com/v1', '') : null;
          }
          return { items } as T;
        })()
      : call<T>(path);
    load
      .then((raw) => {
        const data = map(raw as T);
        cache.set(key, data);
        if (alive) setState({ key, data });
      })
      .catch((e: unknown) => {
        if (alive) setState({ key, error: e instanceof Error ? e.message : 'Erro no Spotify' });
      });
    return () => {
      alive = false;
    };
  }, [key]);

  const current = state.key === key ? state : { key };
  return {
    data: current.data,
    error: current.error,
    loading: !!key && current.data === undefined && !current.error,
  };
}

interface Page<T> {
  items: T[];
}

const LIKED: MockPlaylist = {
  id: 'liked',
  name: 'Músicas Curtidas',
  detail: 'Playlist',
  kind: 'Playlist',
  cover: '#1F3FD9',
  liked: true,
  tracks: [],
};

export interface Feature {
  eyebrow: string;
  headline: string;
  title: string;
  subtitle: string;
  image?: MockTrack['image'];
  trackId: string;
  track?: MockTrack;
}

const DEMO_FEATURE: Feature = {
  eyebrow: 'Novo lançamento de',
  headline: 'MC Kevin',
  title: 'Donos da Capital',
  subtitle: 'MC Kevin, MC Ryan SP, MC GP, MC Lele JP, MC IG',
  image: COVERS.donos,
  trackId: 't2',
};

/** Início: playlists do topo, destaque e programas. */
export function useHomeData() {
  const live = useSpotifyLive();
  const lists = useSpotifyGet<Page<SpPlaylist>, MockPlaylist[]>(
    live ? '/me/playlists?limit=20' : null,
    (r) => r.items.filter(Boolean).map(toPlaylist),
  );
  const recent = useSpotifyGet<Page<{ track: SpTrack }>, MockTrack[]>(
    live ? '/me/player/recently-played?limit=10' : null,
    (r) => r.items.map((i) => toTrack(i.track)),
  );
  const shows = useSpotifyGet<Page<{ show: SpShow }>, MockShow[]>(
    live ? '/me/shows?limit=8' : null,
    (r) => r.items.map((i) => toShow(i.show)),
  );
  if (!live)
    return { live, playlists: PLAYLISTS, feature: DEMO_FEATURE, shows: SHOWS, loading: false };

  const last = recent.data?.[0];
  return {
    live,
    playlists: [LIKED, ...(lists.data ?? [])],
    feature: last
      ? ({
          eyebrow: 'Tocada recentemente',
          headline: last.artists.split(',')[0] ?? last.artists,
          title: last.title,
          subtitle: last.artists,
          image: last.image,
          trackId: last.id,
          track: last,
        } satisfies Feature)
      : null,
    shows: shows.data ?? [],
    loading: lists.loading,
    error: lists.error,
  };
}

/** Sua Biblioteca: playlists, álbuns salvos, programas e artistas seguidos. */
export function useLibraryData() {
  const live = useSpotifyLive();
  const lists = useSpotifyGet<Page<SpPlaylist>, MockPlaylist[]>(
    live ? '/me/playlists?limit=50' : null,
    (r) => r.items.filter(Boolean).map(toPlaylist),
  );
  const albums = useSpotifyGet<Page<{ album: SpAlbum }>, MockPlaylist[]>(
    live ? '/me/albums?limit=50' : null,
    (r) => r.items.map((i) => toAlbum(i.album)),
  );
  const shows = useSpotifyGet<Page<{ show: SpShow }>, MockShow[]>(
    live ? '/me/shows?limit=50' : null,
    (r) => r.items.map((i) => toShow(i.show)),
  );
  const artists = useSpotifyGet<{ artists: Page<SpArtist> }, MockArtist[]>(
    live ? '/me/following?type=artist&limit=50' : null,
    (r) => r.artists.items.map(toArtist),
  );
  if (!live) return { live, playlists: PLAYLISTS, shows: SHOWS, artists: ARTISTS, loading: false };
  return {
    live,
    playlists: [LIKED, ...(lists.data ?? []), ...(albums.data ?? [])],
    shows: shows.data ?? [],
    artists: artists.data ?? [],
    loading: lists.loading,
    error: lists.error,
  };
}

/** Página de uma playlist, álbum ou das Músicas Curtidas. */
export function usePlaylistData(id: string) {
  const live = useSpotifyLive();
  const isAlbum = id.startsWith('spotify:album:');
  const isPlaylist = id.startsWith('spotify:playlist:');
  const sid = id.split(':')[2] ?? '';

  const meta = useSpotifyGet<SpPlaylist, MockPlaylist>(
    live && isPlaylist
      ? `/playlists/${sid}?fields=id,name,uri,images,owner(display_name,id),items(total)`
      : null,
    toPlaylist,
  );
  // O álbum vem com as faixas (que não trazem capa própria: usam a do álbum).
  const album = useSpotifyGet<
    SpAlbum & { tracks: Page<SpTrack> },
    { meta: MockPlaylist; tracks: MockTrack[] }
  >(live && isAlbum ? `/albums/${sid}` : null, (r) => ({
    meta: toAlbum(r),
    tracks: r.tracks.items.map((t) => toTrack(t, r)),
  }));
  const tracks = useSpotifyGet<Page<SpTrack | { track?: SpTrack; item?: SpTrack }>, MockTrack[]>(
    !live
      ? null
      : id === 'liked'
        ? 'all:/me/tracks?limit=50'
        : isPlaylist
          ? `all:/playlists/${sid}/items?limit=50`
          : null,
    (r) =>
      r.items
        .map((i) => ('uri' in i ? i : (i.item ?? i.track)))
        .filter((t): t is SpTrack => !!t?.uri)
        .map((t) => toTrack(t)),
  );

  if (!live) {
    const p = playlistById(id);
    const list = p.tracks.map(trackById);
    return { live, playlist: p, tracks: list, total: list.length, loading: false, note: null };
  }

  const found = isAlbum ? album.data?.meta : meta.data;
  const playlist =
    id === 'liked' ? LIKED : (found ?? { ...LIKED, id, uri: id, liked: false, name: '' });
  const list = (isAlbum ? album.data?.tracks : tracks.data) ?? [];
  // Em modo de desenvolvimento o Spotify só lista as faixas de playlists da própria conta.
  const note =
    isPlaylist && tracks.error
      ? 'O Spotify não libera a lista de músicas de playlists de outras pessoas para este app. Toque no play para ouvir a playlist inteira.'
      : (tracks.error ?? album.error ?? null);
  return {
    live,
    playlist,
    tracks: list,
    total: playlist.total ?? list.length,
    loading: tracks.loading || meta.loading || album.loading,
    note,
  };
}

/** Busca de músicas (o Spotify limita a 10 resultados por pedido em modo de desenvolvimento). */
export function useTrackSearch(query: string) {
  const live = useSpotifyLive();
  const [debounced, setDebounced] = useState(query);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const remote = useSpotifyGet<{ tracks: Page<SpTrack> }, MockTrack[]>(
    live && debounced ? `/search?type=track&limit=10&q=${encodeURIComponent(debounced)}` : null,
    (r) => r.tracks.items.map((t) => toTrack(t)),
  );
  if (!debounced) return { results: [] as MockTrack[], loading: false };
  if (!live) {
    const q = debounced.toLowerCase();
    return {
      results: TRACKS.filter(
        (t) => t.title.toLowerCase().includes(q) || t.artists.toLowerCase().includes(q),
      ),
      loading: false,
    };
  }
  return { results: remote.data ?? [], loading: remote.loading, error: remote.error };
}
