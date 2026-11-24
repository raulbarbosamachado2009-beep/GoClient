import { describe, expect, it } from 'vitest';
import {
  acceptReading,
  EMPTY_PLAYBACK,
  LIKED_CONTEXT,
  nextRepeat,
  pickDevice,
  planRemotePlay,
  positionNow,
  remoteImage,
  remoteTrack,
  samePlayback,
  webPlayBody,
} from './transport';

const PL = 'spotify:playlist:abc';
const AL = 'spotify:album:xyz';
const tracks = Array.from({ length: 150 }, (_, i) => `spotify:track:t${i}`);

describe('planRemotePlay (SDK do aparelho)', () => {
  it('toca a faixa escolhida da playlist pela posição dela', () => {
    expect(planRemotePlay({ contextUri: PL, offsetUri: tracks[7], order: tracks })).toEqual({
      kind: 'index',
      uri: PL,
      index: 7,
    });
  });

  it('álbum também vai pela posição', () => {
    expect(planRemotePlay({ contextUri: AL, offsetUri: tracks[2], order: tracks })).toEqual({
      kind: 'index',
      uri: AL,
      index: 2,
    });
  });

  it('Músicas Curtidas viram a coleção do usuário, na posição certa', () => {
    expect(
      planRemotePlay({ contextUri: LIKED_CONTEXT, offsetUri: tracks[42], order: tracks }, 'raul'),
    ).toEqual({ kind: 'index', uri: 'spotify:user:raul:collection', index: 42 });
  });

  it('nunca toca outra faixa da lista: sem posição, toca a própria faixa', () => {
    // Antes: tocava uris[0] (até 10 faixas antes da escolhida).
    expect(planRemotePlay({ uris: tracks, offsetUri: tracks[30] })).toEqual({
      kind: 'play',
      uri: tracks[30],
    });
    expect(planRemotePlay({ contextUri: PL, offsetUri: 'spotify:track:fora' })).toEqual({
      kind: 'play',
      uri: 'spotify:track:fora',
    });
  });

  it('contexto inteiro, sem faixa escolhida', () => {
    expect(planRemotePlay({ contextUri: 'spotify:show:s1' })).toEqual({
      kind: 'play',
      uri: 'spotify:show:s1',
    });
    expect(planRemotePlay({})).toEqual({ kind: 'resume' });
  });
});

describe('webPlayBody (Web API)', () => {
  it('playlist com faixa escolhida usa offset por URI', () => {
    expect(webPlayBody({ contextUri: PL, offsetUri: tracks[3], order: tracks })).toEqual({
      context_uri: PL,
      offset: { uri: tracks[3] },
    });
  });

  it('Curtidas mandam uma janela de até 100 faixas que contém a escolhida', () => {
    const body = webPlayBody({ contextUri: LIKED_CONTEXT, offsetUri: tracks[120], order: tracks });
    const uris = body.uris as string[];
    expect(body.context_uri).toBeUndefined();
    expect(uris.length).toBe(100);
    expect(uris).toContain(tracks[120]);
    expect(body.offset).toEqual({ uri: tracks[120] });
  });

  it('busca: lista avulsa com offset', () => {
    const body = webPlayBody({ uris: tracks.slice(0, 5), offsetUri: tracks[4] });
    expect(body).toEqual({ uris: tracks.slice(0, 5), offset: { uri: tracks[4] } });
  });

  it('programa não recebe offset (o Spotify recusaria)', () => {
    expect(webPlayBody({ contextUri: 'spotify:show:s1' })).toEqual({
      context_uri: 'spotify:show:s1',
    });
  });
});

describe('pickDevice', () => {
  it('prefere o aparelho ativo e ignora os restritos', () => {
    const d = pickDevice([
      { id: 'a', name: 'TV', is_restricted: true, is_active: true },
      { id: 'b', name: 'PC', is_restricted: false },
      { id: 'c', name: 'Carro', is_restricted: false, is_active: true },
    ]);
    expect(d?.id).toBe('c');
    expect(pickDevice([])).toBeNull();
  });
});

describe('sincronia', () => {
  it('ignora leituras da faixa antiga logo depois do "tocar"', () => {
    const exp = { uri: 'spotify:track:nova', until: 1000 };
    expect(acceptReading(exp, 'spotify:track:velha', 500)).toBe(false);
    expect(acceptReading(exp, 'spotify:track:nova', 500)).toBe(true);
    expect(acceptReading(exp, 'spotify:track:velha', 1500)).toBe(true);
    expect(acceptReading(null, 'x', 0)).toBe(true);
  });

  it('estima a posição enquanto toca e para no fim da faixa', () => {
    const p = { ...EMPTY_PLAYBACK, isPlaying: true, positionMs: 1000, durationMs: 5000, at: 100 };
    expect(positionNow(p, 1100)).toBe(2000);
    expect(positionNow(p, 99_000)).toBe(5000);
    expect(positionNow({ ...p, isPlaying: false }, 99_000)).toBe(1000);
  });

  it('não redesenha o app quando só a posição andou como esperado', () => {
    const a = { ...EMPTY_PLAYBACK, isPlaying: true, positionMs: 1000, durationMs: 9000, at: 10 };
    expect(samePlayback(a, { ...a, positionMs: 5000, at: 4010 })).toBe(true);
    expect(samePlayback(a, { ...a, positionMs: 8000, at: 4010 })).toBe(false);
    expect(samePlayback(a, { ...a, shuffle: true })).toBe(false);
  });
});

describe('remoteTrack', () => {
  it('converte a faixa do SDK com a capa em https', () => {
    expect(remoteImage('spotify:image:ab67616d0000b273')).toBe(
      'https://i.scdn.co/image/ab67616d0000b273',
    );
    const t = remoteTrack({
      uri: 'spotify:track:1',
      name: 'Faixa',
      artist: 'A',
      artists: [
        { name: 'A', uri: 'spotify:artist:a' },
        { name: 'B', uri: 'spotify:artist:b' },
      ],
      album: 'Álbum',
      duration: 185_000,
      imageUri: 'spotify:image:abc',
    });
    expect(t).toMatchObject({
      id: 'spotify:track:1',
      artists: 'A, B',
      duration: '3:05',
      image: { uri: 'https://i.scdn.co/image/abc' },
    });
  });

  it('repetir segue a ordem do Spotify', () => {
    expect(nextRepeat('off')).toBe('context');
    expect(nextRepeat('context')).toBe('track');
    expect(nextRepeat('track')).toBe('off');
  });
});
