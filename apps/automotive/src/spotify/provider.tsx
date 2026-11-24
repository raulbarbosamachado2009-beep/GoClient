import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { type RemotePlayerState, SpotifyRemote } from '../../modules/spotify-remote';
import { SPOTIFY_CLIENT_ID, SPOTIFY_ENABLED } from '../integrations/env';
import { REDIRECT_URI, refreshTokens } from './auth';
import { type SpTrack, toTrack } from './mapping';
import {
  loadAccounts,
  removeAccount as removeStored,
  type SpotifyAccount,
  saveAccount,
  saveActive,
} from './storage';
import {
  acceptReading,
  EMPTY_PLAYBACK,
  type Playback,
  type PlayRequest,
  pickDevice,
  planRemotePlay,
  type RepeatMode,
  remoteTrack,
  repeatFromRemote,
  repeatToRemote,
  samePlayback,
  type WebDevice,
  webPlayBody,
} from './transport';

/** Erro de uma chamada à Web API, com o status HTTP e o motivo informado pelo Spotify. */
export class SpotifyError extends Error {
  constructor(
    readonly status: number,
    readonly reason: string | undefined,
    message: string,
  ) {
    super(message);
  }
}

export type { Playback, PlayRequest, RepeatMode } from './transport';

interface SpotifyState {
  /** Há Client ID nesta compilação (app Android). */
  enabled: boolean;
  /** As contas salvas já foram lidas do aparelho. */
  ready: boolean;
  accounts: SpotifyAccount[];
  active: SpotifyAccount | null;
  setActive: (id: string) => void;
  removeAccount: (id: string) => Promise<void>;
  /** Abre/fecha a janela de login (desenhada por SpotifyLoginHost). */
  loginOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;
  addAccount: (account: SpotifyAccount) => Promise<void>;
  /** Chamada autenticada à Web API com a conta ativa (renova o token quando preciso). */
  call: <T>(path: string, init?: RequestInit) => Promise<T | null>;
  playback: Playback;
  play: (req: PlayRequest) => Promise<void>;
  toggle: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  seek: (ms: number) => Promise<void>;
  setShuffle: (on: boolean) => Promise<void>;
  setRepeat: (mode: RepeatMode) => Promise<void>;
  /** Põe uma faixa na fila (SDK do aparelho ou Web API). */
  addToQueue: (uri: string) => Promise<void>;
  /** Aviso para a pessoa (ex.: nenhum aparelho com o Spotify aberto). */
  notice: string | null;
  clearNotice: () => void;
}

const Ctx = createContext<SpotifyState | null>(null);
const API = 'https://api.spotify.com/v1';
const EMPTY = EMPTY_PLAYBACK;

export function SpotifyProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!SPOTIFY_ENABLED);
  const [accounts, setAccounts] = useState<SpotifyAccount[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [playback, setPlayback] = useState<Playback>(EMPTY);
  const [notice, setNotice] = useState<string | null>(null);

  // Referências para as chamadas assíncronas sempre usarem a conta mais recente.
  const accountsRef = useRef(accounts);
  accountsRef.current = accounts;
  const activeRef = useRef(activeId);
  activeRef.current = activeId;
  const refreshing = useRef<Promise<SpotifyAccount> | null>(null);

  useEffect(() => {
    if (!SPOTIFY_ENABLED) return;
    loadAccounts()
      .then(({ accounts: list, active }) => {
        setAccounts(list);
        setActiveId(active && list.some((a) => a.id === active) ? active : (list[0]?.id ?? null));
      })
      .finally(() => setReady(true));
  }, []);

  const updateAccount = useCallback(async (a: SpotifyAccount) => {
    setAccounts((list) => list.map((x) => (x.id === a.id ? a : x)));
    await saveAccount(a);
  }, []);

  /** Conta ativa com token válido (renova uma vez só, mesmo com chamadas simultâneas). */
  const freshAccount = useCallback(
    async (force = false): Promise<SpotifyAccount | null> => {
      const acc = accountsRef.current.find((a) => a.id === activeRef.current);
      if (!acc) return null;
      if (!force && acc.expiresAt - 60_000 > Date.now()) return acc;
      if (!refreshing.current) {
        refreshing.current = refreshTokens(acc.refreshToken)
          .then(async (t) => {
            const next = { ...acc, ...t };
            accountsRef.current = accountsRef.current.map((x) => (x.id === next.id ? next : x));
            await updateAccount(next);
            return next;
          })
          .finally(() => {
            refreshing.current = null;
          });
      }
      return refreshing.current;
    },
    [updateAccount],
  );

  const call = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T | null> => {
      let acc = await freshAccount();
      if (!acc) throw new SpotifyError(401, 'NO_ACCOUNT', 'Nenhuma conta do Spotify conectada');
      const send = (token: string) =>
        fetch(path.startsWith('http') ? path : `${API}${path}`, {
          ...init,
          headers: {
            Authorization: `Bearer ${token}`,
            ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
            ...init?.headers,
          },
        });
      let res = await send(acc.accessToken);
      if (res.status === 401) {
        acc = await freshAccount(true);
        if (!acc) throw new SpotifyError(401, 'NO_ACCOUNT', 'Sessão do Spotify expirada');
        res = await send(acc.accessToken);
      }
      if (res.status === 204 || res.status === 202) return null;
      const text = await res.text();
      const json = text ? (JSON.parse(text) as unknown) : null;
      if (!res.ok) {
        const err = (json as { error?: { message?: string; reason?: string } } | null)?.error;
        throw new SpotifyError(res.status, err?.reason, err?.message ?? `Spotify: ${res.status}`);
      }
      return json as T;
    },
    [freshAccount],
  );

  // --- Reprodução -----------------------------------------------------------------------
  //
  // Caminho principal (multimídia Android com o app do Spotify): SDK oficial App Remote. Os
  // comandos vão direto para o Spotify deste aparelho (o som sai daqui, nunca de outro
  // aparelho da conta) e o estado chega por evento, na hora. A Web API completa os dados
  // (capa grande, artistas, fila). Sem o app do Spotify, tudo vai pela Web API (Connect).

  const playbackRef = useRef(playback);
  playbackRef.current = playback;
  /** Faixa esperada depois de um "tocar" (leituras antigas são ignoradas até lá). */
  const expected = useRef<{ uri: string; until: number } | null>(null);
  /** Nomes dos contextos que o próprio GoClient mandou tocar. */
  const titles = useRef(new Map<string, string>());
  const enriched = useRef<string | null>(null);

  const setIfChanged = useCallback((next: Playback) => {
    setPlayback((p) => (samePlayback(p, next) ? p : next));
  }, []);

  /**
   * Fila do Spotify. A Web API demora um pouco para refletir a troca de faixa ou o
   * aleatório: por isso é lida um instante depois.
   */
  const refreshQueue = useCallback(
    (uri: string, delay = 1200) => {
      setTimeout(() => {
        call<{ currently_playing?: SpTrack | null; queue: SpTrack[] }>('/me/player/queue')
          .then((q) =>
            setPlayback((p) =>
              p.track?.id === uri
                ? { ...p, queue: (q?.queue ?? []).slice(0, 5).map((t) => toTrack(t)) }
                : p,
            ),
          )
          .catch(() => {});
      }, delay);
    },
    [call],
  );

  /** Dados completos da faixa (Web API) e a fila, só quando a faixa muda. */
  const enrich = useCallback(
    async (uri: string) => {
      if (enriched.current === uri) return;
      enriched.current = uri;
      refreshQueue(uri);
      const [kind, id] = uri.split(':').slice(1);
      if (kind !== 'track' && kind !== 'episode') return;
      const item = await call<SpTrack>(`/${kind}s/${id}`).catch(() => null);
      if (!item) return;
      setPlayback((p) =>
        p.track?.id !== uri
          ? p
          : {
              ...p,
              track: toTrack(item),
              artists: item.artists?.map((a) => ({ name: a.name, uri: a.uri })) ?? p.artists,
            },
      );
    },
    [call, refreshQueue],
  );

  /** Estado vindo do SDK do aparelho. */
  const onRemoteState = useCallback(
    (s: RemotePlayerState) => {
      const uri = s.track?.uri ?? null;
      if (!acceptReading(expected.current, uri, Date.now())) return;
      if (uri && expected.current?.uri === uri) expected.current = null;
      const p = playbackRef.current;
      const same = !!uri && p.track?.id === uri;
      const track = s.track ? (same && p.track ? p.track : remoteTrack(s.track)) : null;
      setIfChanged({
        ...p,
        track,
        isPlaying: !s.isPaused && !!s.track,
        positionMs: s.position,
        durationMs: s.track?.duration ?? 0,
        at: Date.now(),
        shuffle: s.shuffle,
        repeat: repeatFromRemote(s.repeat),
        artists: same && p.artists.length ? p.artists : (s.track?.artists ?? []),
        queue: same ? p.queue : [],
        source: 'remote',
        device: 'Este aparelho',
      });
      if (uri && enriched.current !== uri) enrich(uri);
    },
    [enrich, setIfChanged],
  );

  // Escuta o SDK do aparelho e tenta conectar em silêncio (sem abrir tela do Spotify).
  useEffect(() => {
    const r = SpotifyRemote;
    if (!SPOTIFY_ENABLED || !activeId || !r) return;
    const subs = [
      r.addListener('onPlayerState', onRemoteState),
      r.addListener('onPlayerContext', (c) => {
        if (!c.uri) return;
        const title = c.title || titles.current.get(c.uri) || '';
        setPlayback((p) =>
          p.context?.uri === c.uri && p.context.title === title
            ? p
            : { ...p, context: { uri: c.uri, title } },
        );
      }),
      r.addListener('onDisconnected', () => setPlayback((p) => ({ ...p, source: null }))),
    ];
    const silent = () => {
      if (r.isInstalled() && !r.isConnected()) {
        r.connect(SPOTIFY_CLIENT_ID, REDIRECT_URI, false)
          .then(() => r.getPlayerState().then(onRemoteState))
          .catch(() => {});
      }
    };
    silent();
    const app = AppState.addEventListener('change', (st) => st === 'active' && silent());
    return () => {
      for (const s of subs) s.remove();
      app.remove();
    };
  }, [activeId, onRemoteState]);

  /** Estado pela Web API (quando o SDK do aparelho não está conectado). */
  const refreshPlayback = useCallback(async () => {
    if (!activeRef.current) return;
    if (SpotifyRemote?.isConnected()) return;
    try {
      const state = await call<{
        is_playing: boolean;
        progress_ms?: number | null;
        shuffle_state?: boolean;
        repeat_state?: RepeatMode;
        item: SpTrack | null;
        device?: { name: string };
        context?: { uri: string } | null;
      }>('/me/player?additional_types=episode');
      const p = playbackRef.current;
      const device = state?.device?.name ?? null;
      if (!state?.item) {
        setIfChanged({ ...p, isPlaying: false, device, source: 'web' });
        return;
      }
      const item = state.item;
      if (!acceptReading(expected.current, item.uri, Date.now())) return;
      if (expected.current?.uri === item.uri) expected.current = null;
      const same = p.track?.id === item.uri;
      const ctxUri = state.context?.uri ?? null;
      setIfChanged({
        ...p,
        track: same && p.track ? p.track : toTrack(item),
        isPlaying: state.is_playing,
        positionMs: state.progress_ms ?? 0,
        durationMs: item.duration_ms,
        at: Date.now(),
        shuffle: !!state.shuffle_state,
        repeat: state.repeat_state ?? 'off',
        device,
        context: ctxUri
          ? {
              uri: ctxUri,
              title:
                titles.current.get(ctxUri) ?? (p.context?.uri === ctxUri ? p.context.title : ''),
            }
          : null,
        artists: item.artists?.map((a) => ({ name: a.name, uri: a.uri })) ?? [],
        queue: same ? p.queue : [],
        source: 'web',
      });
      if (enriched.current !== item.uri) enrich(item.uri);
    } catch {
      // Falha de rede momentânea: tenta de novo no próximo ciclo.
    }
  }, [call, enrich, setIfChanged]);

  // Web API a cada 4 s enquanto o app está em primeiro plano (pula quando o SDK conecta).
  useEffect(() => {
    if (!SPOTIFY_ENABLED || !activeId) {
      setPlayback(EMPTY);
      return;
    }
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      refreshPlayback();
      timer ??= setInterval(refreshPlayback, 4000);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    start();
    const sub = AppState.addEventListener('change', (s) => (s === 'active' ? start() : stop()));
    return () => {
      stop();
      sub.remove();
    };
  }, [activeId, refreshPlayback]);

  const explain = useCallback((e: unknown) => {
    if (e instanceof SpotifyError) {
      if (e.status === 403 && e.reason === 'PREMIUM_REQUIRED') {
        setNotice(
          'Esta conta não é Premium. O Spotify só deixa outros apps controlarem a reprodução em contas Premium.',
        );
      } else if (e.status === 403) {
        setNotice('O Spotify não permitiu esta ação para esta conta (modo de desenvolvimento).');
      } else if (e.status === 429) {
        setNotice('O Spotify pediu para esperar um pouco antes de novos comandos.');
      } else {
        setNotice(e.message);
      }
    } else if (
      e instanceof Error &&
      /SPOTIFY_|Spotify/.test(`${(e as { code?: string }).code ?? ''}${e.message}`)
    ) {
      setNotice(remoteProblem(e));
    } else {
      setNotice('Sem conexão com o Spotify. Confira a internet da multimídia.');
    }
  }, []);

  /**
   * SDK do aparelho pronto para comandos? Liga o app do Spotify por trás se preciso (na
   * primeira vez o Spotify pode pedir para autorizar o GoClient). `false` = usar a Web API.
   */
  const remoteReady = useCallback(async (): Promise<boolean> => {
    const r = SpotifyRemote;
    if (!r?.isInstalled()) return false;
    if (r.isConnected()) return true;
    try {
      await r.connect(SPOTIFY_CLIENT_ID, REDIRECT_URI, true);
      return r.isConnected();
    } catch (err) {
      setNotice(remoteProblem(err as Error));
      return false;
    }
  }, []);

  /** Comando pela Web API, no aparelho ativo (ou no primeiro disponível). */
  const webCommand = useCallback(
    async (path: string, method: 'PUT' | 'POST', body?: object) => {
      const run = (p: string) => call(p, { method, body: body ? JSON.stringify(body) : undefined });
      try {
        await run(path);
      } catch (e) {
        if (!(e instanceof SpotifyError) || e.status !== 404) throw e;
        const list = await call<{ devices: WebDevice[] }>('/me/player/devices');
        const device = pickDevice(list?.devices ?? []);
        if (!device) {
          setNotice(
            'Nenhum aparelho com o Spotify aberto. Abra o app do Spotify neste aparelho e entre na sua conta.',
          );
          return;
        }
        await run(`${path}${path.includes('?') ? '&' : '?'}device_id=${device.id}`);
      }
      setTimeout(refreshPlayback, 700);
    },
    [call, refreshPlayback],
  );

  const play = useCallback(
    async (req: PlayRequest) => {
      if (req.contextUri && req.contextTitle) titles.current.set(req.contextUri, req.contextTitle);
      const target = req.offsetUri ?? req.hint?.id;
      enriched.current = null;
      expected.current = target ? { uri: target, until: Date.now() + 6000 } : null;
      setPlayback((p) => ({
        ...p,
        track: req.hint ?? p.track,
        isPlaying: true,
        positionMs: 0,
        at: Date.now(),
        shuffle: req.shuffle ?? p.shuffle,
        artists: req.hint && req.hint.id !== p.track?.id ? [] : p.artists,
        queue: req.hint && req.hint.id !== p.track?.id ? [] : p.queue,
        context:
          req.contextUri && req.contextTitle
            ? { uri: req.contextUri, title: req.contextTitle }
            : p.context,
      }));
      try {
        if (await remoteReady()) {
          const r = SpotifyRemote as NonNullable<typeof SpotifyRemote>;
          if (req.shuffle !== undefined) await r.setShuffle(req.shuffle).catch(() => {});
          const plan = planRemotePlay(req, activeRef.current ?? undefined);
          if (plan.kind === 'index') await r.skipToIndex(plan.uri, plan.index);
          else if (plan.kind === 'play') await r.play(plan.uri);
          else await r.resume();
          return;
        }
        if (req.shuffle !== undefined) {
          await webCommand(`/me/player/shuffle?state=${req.shuffle}`, 'PUT').catch(() => {});
        }
        await webCommand('/me/player/play', 'PUT', webPlayBody(req));
      } catch (e) {
        expected.current = null;
        explain(e);
        refreshPlayback();
      }
    },
    [remoteReady, webCommand, explain, refreshPlayback],
  );

  /** Comando simples: SDK do aparelho se conectado; senão, Web API. */
  const simple = useCallback(
    async (
      remote: (r: NonNullable<typeof SpotifyRemote>) => Promise<unknown>,
      path: string,
      method: 'PUT' | 'POST',
      optimistic?: (p: Playback) => Playback,
    ) => {
      if (optimistic) setPlayback(optimistic);
      try {
        if (await remoteReady()) await remote(SpotifyRemote as NonNullable<typeof SpotifyRemote>);
        else await webCommand(path, method);
      } catch (e) {
        explain(e);
        refreshPlayback();
      }
    },
    [remoteReady, webCommand, explain, refreshPlayback],
  );

  const toggle = useCallback(() => {
    const p = playbackRef.current;
    const now = Date.now();
    // Congela/retoma a posição estimada para a barra de progresso não pular.
    const pos = p.isPlaying ? Math.min(p.durationMs, p.positionMs + (now - p.at)) : p.positionMs;
    return p.isPlaying
      ? simple(
          (r) => r.pause(),
          '/me/player/pause',
          'PUT',
          (x) => ({
            ...x,
            isPlaying: false,
            positionMs: pos,
            at: now,
          }),
        )
      : simple(
          (r) => r.resume(),
          '/me/player/play',
          'PUT',
          (x) => ({
            ...x,
            isPlaying: true,
            positionMs: pos,
            at: now,
          }),
        );
  }, [simple]);
  const next = useCallback(() => simple((r) => r.skipNext(), '/me/player/next', 'POST'), [simple]);
  const previous = useCallback(
    () => simple((r) => r.skipPrevious(), '/me/player/previous', 'POST'),
    [simple],
  );
  const seek = useCallback(
    (ms: number) => {
      const at = Math.max(0, Math.round(ms));
      return simple(
        (r) => r.seekTo(at),
        `/me/player/seek?position_ms=${at}`,
        'PUT',
        (x) => ({
          ...x,
          positionMs: at,
          at: Date.now(),
        }),
      );
    },
    [simple],
  );
  const setShuffle = useCallback(
    (on: boolean) =>
      simple(
        (r) => r.setShuffle(on),
        `/me/player/shuffle?state=${on}`,
        'PUT',
        (x) => ({
          ...x,
          shuffle: on,
        }),
      ),
    [simple],
  );
  const addToQueue = useCallback(
    async (uri: string) => {
      await simple((r) => r.queue(uri), `/me/player/queue?uri=${encodeURIComponent(uri)}`, 'POST');
      const cur = playbackRef.current.track?.id;
      if (cur) refreshQueue(cur, 800);
    },
    [simple, refreshQueue],
  );
  const setRepeat = useCallback(
    (mode: RepeatMode) =>
      simple(
        (r) => r.setRepeat(repeatToRemote(mode)),
        `/me/player/repeat?state=${mode}`,
        'PUT',
        (x) => ({ ...x, repeat: mode }),
      ),
    [simple],
  );

  const value = useMemo<SpotifyState>(() => {
    const active = accounts.find((a) => a.id === activeId) ?? null;
    return {
      enabled: SPOTIFY_ENABLED,
      ready,
      accounts,
      active,
      setActive: (id) => {
        setActiveId(id);
        saveActive(id);
        setPlayback(EMPTY);
      },
      removeAccount: async (id) => {
        await removeStored(id);
        const rest = accountsRef.current.filter((a) => a.id !== id);
        setAccounts(rest);
        if (activeRef.current === id) {
          const next = rest[0]?.id ?? null;
          setActiveId(next);
          await saveActive(next);
        }
      },
      loginOpen,
      openLogin: () => setLoginOpen(true),
      closeLogin: () => setLoginOpen(false),
      addAccount: async (account) => {
        await saveAccount(account);
        await saveActive(account.id);
        const list = [...accountsRef.current.filter((a) => a.id !== account.id), account];
        accountsRef.current = list;
        setAccounts(list);
        setActiveId(account.id);
        setLoginOpen(false);
      },
      call,
      playback,
      play,
      toggle,
      next,
      previous,
      seek,
      setShuffle,
      setRepeat,
      addToQueue,
      notice,
      clearNotice: () => setNotice(null),
    };
  }, [
    accounts,
    activeId,
    ready,
    loginOpen,
    call,
    playback,
    play,
    toggle,
    next,
    previous,
    seek,
    setShuffle,
    setRepeat,
    addToQueue,
    notice,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSpotify(): SpotifyState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSpotify fora do SpotifyProvider');
  return ctx;
}

/** A Música está usando dados reais do Spotify (há Client ID e uma conta conectada). */
export function useSpotifyLive(): boolean {
  const s = useSpotify();
  return s.enabled && s.active !== null;
}

/** Mensagem para os erros do SDK do Spotify. */
function remoteProblem(e: Error): string {
  const code = (e as Error & { code?: string }).code ?? e.message;
  if (/NotLoggedIn/i.test(code))
    return 'Entre na sua conta no app do Spotify uma vez e tente de novo.';
  if (/UserNotAuthorized|Authentication/i.test(code))
    return 'O Spotify não autorizou o GoClient. Confira o cadastro do Android no Spotify for Developers.';
  if (/OfflineMode/i.test(code)) return 'O Spotify está offline.';
  return `Não consegui ligar o Spotify por trás (${code}). Abra o app do Spotify uma vez e tente de novo.`;
}
