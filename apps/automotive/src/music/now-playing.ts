import { useEffect, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { type MockTrack, NOW_PLAYING } from '../mocks/data';
import { usePrototype } from '../prototype/state';
import { pickImage, type SpArtist } from '../spotify/mapping';
import { useSpotify, useSpotifyLive } from '../spotify/provider';
import { formatMs, nextRepeat, positionNow, type RepeatMode } from '../spotify/transport';
import { useSpotifyGet } from './library';

/**
 * Tudo o que o player mostra sobre a faixa atual, sempre da MESMA faixa: no Spotify vem do
 * estado da reprodução (SDK do aparelho ou Web API); na demonstração, da faixa do protótipo.
 * Antes, a parte de baixo do player era fixa (MC Kevin) e não batia com a música tocando.
 */
export interface NowPlaying {
  live: boolean;
  track: MockTrack;
  playing: boolean;
  /** Próximas faixas (até 5). */
  queue: MockTrack[];
  /** "Tocando de …" (playlist/álbum) ou o álbum da faixa. */
  source: string;
  shuffle: boolean;
  repeat: RepeatMode;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  seek: (ms: number) => void;
  /** Posição e duração em ms (a posição é estimada entre as leituras). */
  positionMs: () => number;
  durationMs: number;
}

function parseDuration(d: string): number {
  const [m, s] = d.split(':').map(Number);
  return ((m ?? 0) * 60 + (s ?? 0)) * 1000;
}

export function useNowPlaying(): NowPlaying {
  const proto = usePrototype();
  const sp = useSpotify();
  const live = useSpotifyLive();
  const [demoShuffle, setDemoShuffle] = useState(false);
  const [demoRepeat, setDemoRepeat] = useState<RepeatMode>('off');
  const track = proto.nowPlaying ?? NOW_PLAYING;

  if (live) {
    const p = sp.playback;
    return {
      live,
      track,
      playing: p.isPlaying,
      queue: p.queue,
      source: p.context?.title ? `Tocando de ${p.context.title}` : track.album,
      shuffle: p.shuffle,
      repeat: p.repeat,
      toggleShuffle: () => sp.setShuffle(!p.shuffle),
      cycleRepeat: () => sp.setRepeat(nextRepeat(p.repeat)),
      seek: (ms) => sp.seek(ms),
      positionMs: () => positionNow(p, Date.now()),
      durationMs: p.durationMs || parseDuration(track.duration),
    };
  }
  return {
    live,
    track,
    playing: proto.playing,
    queue: proto.upNext ? [proto.upNext] : [],
    source: track.album,
    shuffle: demoShuffle,
    repeat: demoRepeat,
    toggleShuffle: () => setDemoShuffle((v) => !v),
    cycleRepeat: () => setDemoRepeat(nextRepeat),
    seek: () => {},
    positionMs: () => 0,
    durationMs: parseDuration(track.duration),
  };
}

/** Progresso que anda sozinho entre as leituras do Spotify (atualiza a cada 0,5 s). */
export function useProgress(np: NowPlaying) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!np.playing) return;
    const t = setInterval(() => tick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, [np.playing]);
  const dur = np.durationMs;
  const pos = Math.min(dur, np.positionMs());
  return {
    fraction: dur > 0 ? pos / dur : 0,
    elapsed: formatMs(pos),
    remaining: `-${formatMs(dur - pos)}`,
  };
}

export interface ArtistInfo {
  name: string;
  /** Foto do artista; na falta dela, a capa da faixa. */
  image: ImageSourcePropType;
  role: string;
  /** Gêneros informados pelo Spotify (podem vir vazios). */
  genres: string[];
}

/**
 * Artistas da faixa atual. No Spotify, a foto e os gêneros vêm de GET /artists/{id}
 * (ainda disponível no modo de desenvolvimento; "ouvintes mensais" não existe na API).
 */
export function useTrackArtists(np: NowPlaying): ArtistInfo[] {
  const sp = useSpotify();
  const uris = np.live ? sp.playback.artists.slice(0, 4).map((a) => a.uri) : [];
  const first = useArtist(uris[0]);
  const second = useArtist(uris[1]);
  const third = useArtist(uris[2]);
  const fourth = useArtist(uris[3]);
  const details = [first, second, third, fourth];
  const names = np.live
    ? sp.playback.artists.map((a) => a.name)
    : np.track.artists.split(/,\s*/).filter(Boolean);
  const list = names.length > 0 ? names : [np.track.artists];
  return list.slice(0, 4).map((name, i) => {
    const d = details[i];
    return {
      name,
      image: d?.image ?? np.track.image,
      role: i === 0 ? 'Artista principal' : 'Artista',
      genres: d?.genres ?? [],
    };
  });
}

function useArtist(uri: string | undefined) {
  const id = uri?.startsWith('spotify:artist:') ? uri.split(':')[2] : undefined;
  const res = useSpotifyGet<
    SpArtist & { genres?: string[] },
    { image?: { uri: string }; genres: string[] }
  >(id ? `/artists/${id}` : null, (a) => ({
    image: pickImage(a.images, 300),
    genres: a.genres ?? [],
  }));
  return res.data;
}
