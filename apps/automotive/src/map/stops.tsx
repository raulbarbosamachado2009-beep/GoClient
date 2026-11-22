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
  /** Troca a rota do dia pela lista escolhida (montar rota). */
  setDay: (list: ExternalStop[]) => void;
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

  const upsert = useCallback((s: ExternalStop) => {
    const c = toClient(s);
    setExtra((cur) => [...cur.filter((x) => x.id !== c.id), c]);
    setRemoved((cur) => cur.filter((x) => x !== c.id));
    return c.id;
  }, []);

  const value = useMemo<StopsState>(() => {
    // Visitas de exemplo só no Preview; no app, a rota é só de clientes reais (Kyte/Havena).
    const base = Platform.OS === 'web' ? TODAY_ROUTE : [];
    const dayIds = [...base, ...extra.map((x) => x.id)].filter((id) => !removed.includes(id));
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
      setDay: (list) => {
        setExtra(list.map(toClient));
        setRemoved(Platform.OS === 'web' ? [...TODAY_ROUTE] : []);
      },
    };
  }, [extra, removed, router, upsert]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStops(): StopsState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStops fora do StopsProvider');
  return v;
}
