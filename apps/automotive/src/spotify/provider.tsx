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
import { AppState, Linking } from 'react-native';
import { SPOTIFY_ENABLED } from '../integrations/env';
import type { MockTrack } from '../mocks/data';
import { refreshTokens } from './auth';
import { type SpTrack, toTrack } from './mapping';
import {
  loadAccounts,
  removeAccount as removeStored,
  type SpotifyAccount,
  saveAccount,
  saveActive,
} from './storage';

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

export interface PlayRequest {
  /** Playlist, álbum ou programa inteiro. */
  contextUri?: string;
  /** Lista avulsa de faixas (ex.: Músicas Curtidas). */
  uris?: string[];
  /** Faixa por onde começar. */
  offsetUri?: string;
  /** Faixa já conhecida, para o player mostrar na hora (antes da confirmação do Spotify). */
  hint?: MockTrack;
}

interface Playback {
  track: MockTrack | null;
  isPlaying: boolean;
  upNext: MockTrack | null;
  device: string | null;
}

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
  /** Aviso para a pessoa (ex.: nenhum aparelho com o Spotify aberto). */
  notice: string | null;
  clearNotice: () => void;
}

const Ctx = createContext<SpotifyState | null>(null);
const API = 'https://api.spotify.com/v1';
const EMPTY: Playback = { track: null, isPlaying: false, upNext: null, device: null };

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

  const refreshPlayback = useCallback(async () => {
    if (!activeRef.current) return;
    try {
      const state = await call<{
        is_playing: boolean;
        item: SpTrack | null;
        device?: { name: string };
      }>('/me/player?additional_types=episode');
      if (!state?.item) {
        setPlayback((p) => ({ ...p, isPlaying: false, device: state?.device?.name ?? null }));
        return;
      }
      const queue = await call<{ queue: SpTrack[] }>('/me/player/queue').catch(() => null);
      const nextItem = queue?.queue?.[0];
      setPlayback({
        track: toTrack(state.item),
        isPlaying: state.is_playing,
        upNext: nextItem ? toTrack(nextItem) : null,
        device: state.device?.name ?? null,
      });
    } catch {
      // Falha de rede momentânea: tenta de novo no próximo ciclo.
    }
  }, [call]);

  // Acompanha o que está tocando a cada 4 s enquanto o app está em primeiro plano.
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
    } else {
      setNotice('Sem conexão com o Spotify. Confira a internet da multimídia.');
    }
  }, []);

  /**
   * Comando de reprodução. O som sai do app do Spotify (Spotify Connect): se nenhum
   * aparelho estiver ativo, usa o primeiro disponível; se não houver nenhum, abre o app do
   * Spotify na multimídia para ele aparecer como aparelho.
   */
  const command = useCallback(
    async (path: string, method: 'PUT' | 'POST', body?: object) => {
      const run = (devicePath: string) =>
        call(devicePath, { method, body: body ? JSON.stringify(body) : undefined });
      try {
        await run(path);
      } catch (e) {
        if (!(e instanceof SpotifyError) || e.status !== 404) throw e;
        const list = await call<{ devices: { id: string; is_restricted: boolean }[] }>(
          '/me/player/devices',
        );
        const device = list?.devices.find((d) => !d.is_restricted);
        if (!device) {
          setNotice(
            'Nenhum aparelho com o Spotify aberto. Abrindo o Spotify: dê play uma vez nele e volte ao GoClient.',
          );
          Linking.openURL('spotify:').catch(() => {});
          return;
        }
        await run(`${path}${path.includes('?') ? '&' : '?'}device_id=${device.id}`);
      }
      setTimeout(refreshPlayback, 600);
    },
    [call, refreshPlayback],
  );

  const play = useCallback(
    async (req: PlayRequest) => {
      if (req.hint) setPlayback((p) => ({ ...p, track: req.hint ?? p.track, isPlaying: true }));
      const body: Record<string, unknown> = {};
      if (req.contextUri) body.context_uri = req.contextUri;
      if (req.uris) body.uris = req.uris.slice(0, 100);
      if (
        req.offsetUri &&
        (req.contextUri?.includes(':playlist:') || req.contextUri?.includes(':album:') || req.uris)
      ) {
        body.offset = { uri: req.offsetUri };
      }
      try {
        await command('/me/player/play', 'PUT', body);
      } catch (e) {
        explain(e);
      }
    },
    [command, explain],
  );

  const simple = useCallback(
    (path: string, method: 'PUT' | 'POST', optimistic?: (p: Playback) => Playback) => async () => {
      if (optimistic) setPlayback(optimistic);
      try {
        await command(path, method);
      } catch (e) {
        explain(e);
        refreshPlayback();
      }
    },
    [command, explain, refreshPlayback],
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
      toggle: playback.isPlaying
        ? simple('/me/player/pause', 'PUT', (p) => ({ ...p, isPlaying: false }))
        : simple('/me/player/play', 'PUT', (p) => ({ ...p, isPlaying: true })),
      next: simple('/me/player/next', 'POST'),
      previous: simple('/me/player/previous', 'POST'),
      notice,
      clearNotice: () => setNotice(null),
    };
  }, [accounts, activeId, ready, loginOpen, call, playback, play, simple, notice]);

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
