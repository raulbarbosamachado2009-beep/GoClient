import { applyOrder } from '@goclient/core';
import { useRouter } from 'expo-router';
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { CLIENTS, type MockClient, TODAY_ROUTE } from '../mocks/data';

/**
 * Paradas da rota vindas de fora da lista de exemplo: clientes do **Kyte** (botões da ficha
 * "Colocar na rota" / "Ir agora") e pedidos da Havena ("coloca o Marcos na rota"). Elas usam o
 * endereço cadastrado no Kyte e entram na mesma rota do dia (uma rota só, na melhor ordem).
 */
export interface ExternalStop {
  name: string;
  address: string;
  phone?: string;
}

interface StopsState {
  /** Clientes de fora (Kyte/Havena), no formato usado pelo Mapa. */
  extra: MockClient[];
  /** Ids da rota do dia (exemplo + os acrescentados). */
  dayIds: string[];
  find: (id: string | undefined) => MockClient | null;
  /** Põe o cliente na rota do dia. Devolve o id. */
  add: (s: ExternalStop) => string;
  /** Vai agora até o cliente (rota só até ele). */
  goNow: (s: ExternalStop) => string;
  remove: (id: string) => void;
  /** Mostra a rota do dia no Mapa. */
  showDay: () => void;
  /** Troca a rota do dia pela lista escolhida (montar rota), com o nome dado pelo usuário. */
  setDay: (list: ExternalStop[], name?: string) => void;
  /** Grava a ordem escolhida pelo usuário (arrastando na lista "Rota"). */
  reorder: (ids: string[]) => void;
  /** `true` depois que o usuário reordenou: o Mapa segue essa ordem em vez da otimizada. */
  manual: boolean;
  /**
   * Rotas montadas no celular (Regra 3: só o celular monta). A multimídia lista estas rotas e
   * começa uma delas. Hoje ficam no aparelho; a sincronização celular → carro passa pela API
   * (rota ainda não criada nela).
   */
  saved: SavedRoute[];
  /** Começa uma rota montada: ela vira a rota do dia e o Mapa abre nela. */
  startSaved: (id: string) => void;
}

export interface SavedRoute {
  id: string;
  name: string;
  /** Quando foi montada (texto curto: "Hoje, 08:12"). */
  when: string;
  /** Clientes da lista de exemplo (ids) e paradas de fora (Kyte), na ordem montada. */
  ids: string[];
  stops: ExternalStop[];
}

/** Rotas de exemplo, só no Preview (como se tivessem sido montadas no celular). */
const DEMO_SAVED: SavedRoute[] = [
  { id: 'r-hoje', name: 'Rota de hoje', when: 'Hoje, 08:12', ids: TODAY_ROUTE, stops: [] },
  {
    id: 'r-centro',
    name: 'Centro e Cambuí',
    when: 'Ontem, 18:40',
    ids: ['c1', 'c2', 'c3'],
    stops: [],
  },
  {
    id: 'r-sexta',
    name: 'Visitas de sexta',
    when: 'Sex., 07:55',
    ids: ['c4', 'c6', 'c8', 'c9'],
    stops: [],
  },
];

/** Nome padrão quando o usuário não dá um nome à rota. */
export function routeName(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `Rota de ${d.toLocaleDateString('pt-BR', { weekday: 'long' })}, ${hh}:${mm}`;
}

const Ctx = createContext<StopsState | null>(null);

const idOf = (s: ExternalStop) =>
  `k:${s.name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}`;

function toClient(s: ExternalStop): MockClient {
  return {
    id: idOf(s),
    name: s.name,
    tradeName: s.name,
    region: 'Todas',
    address: s.address,
    district: '',
    phone: s.phone ?? '',
    lastVisit: '—',
    lastPurchaseTotal: '—',
    purchases: [],
    order: [],
    status: 'Ativo',
  };
}

export function StopsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [extra, setExtra] = useState<MockClient[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  // Ordem manual (null = ordem automática, a melhor calculada pelo roteamento).
  const [order, setOrder] = useState<string[] | null>(null);
  // Base da rota do dia (no Preview, a rota de exemplo) e as rotas montadas no celular.
  const [base, setBase] = useState<string[]>(() => (Platform.OS === 'web' ? TODAY_ROUTE : []));
  const [saved, setSaved] = useState<SavedRoute[]>(() => (Platform.OS === 'web' ? DEMO_SAVED : []));

  const upsert = useCallback((s: ExternalStop) => {
    const c = toClient(s);
    setExtra((cur) => [...cur.filter((x) => x.id !== c.id), c]);
    setRemoved((cur) => cur.filter((x) => x !== c.id));
    return c.id;
  }, []);

  const value = useMemo<StopsState>(() => {
    // Visitas de exemplo só no Preview; no app, a rota é só de clientes reais (Kyte/Havena).
    const dayIds = applyOrder(
      [...base, ...extra.map((x) => x.id)].filter((id) => !removed.includes(id)),
      order,
    );
    return {
      extra,
      dayIds,
      find: (id) =>
        id ? (CLIENTS.find((c) => c.id === id) ?? extra.find((c) => c.id === id) ?? null) : null,
      add: (s) => upsert(s),
      goNow: (s) => {
        const id = upsert(s);
        router.replace({ pathname: '/mapa', params: { rota: 'cliente', id } });
        return id;
      },
      remove: (id) => setRemoved((cur) => [...cur, id]),
      showDay: () => router.replace({ pathname: '/mapa', params: { rota: 'dia' } }),
      setDay: (list, name) => {
        setExtra(list.map(toClient));
        setBase([]);
        setRemoved([]);
        setOrder(null);
        // Montar a rota também a guarda em "Rotas montadas" (para começar depois no carro).
        const route: SavedRoute = {
          id: `r-${Date.now()}`,
          name: name?.trim() || routeName(),
          when: 'Agora',
          ids: [],
          stops: list,
        };
        setSaved((cur) => [route, ...cur]);
      },
      reorder: (ids) => setOrder(ids),
      manual: order !== null,
      saved,
      startSaved: (id) => {
        const r = saved.find((x) => x.id === id);
        if (!r) return;
        setBase(r.ids);
        setExtra(r.stops.map(toClient));
        setRemoved([]);
        setOrder(null);
        router.replace({ pathname: '/mapa', params: { rota: 'dia' } });
      },
    };
  }, [extra, removed, order, router, upsert, base, saved]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStops(): StopsState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStops fora do StopsProvider');
  return v;
}
