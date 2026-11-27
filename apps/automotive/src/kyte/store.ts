import { File, Paths } from 'expo-file-system';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { perfStart } from '../perf';
import { kyteAgent, kyteAgentAvailable, kyteLogged } from './agent';
import { brl, type KyteCustomer, type KyteProduct, type KyteSale, summarize } from './model';
import { SAMPLE, SAMPLE_STORE } from './sample';

/**
 * Dados do Kyte para as telas: lidos pela janela invisível, guardados na memória e num
 * arquivo do aparelho (abrem na hora da próxima vez) e atualizados quando ficam velhos.
 * No Preview (navegador) as telas mostram dados de exemplo.
 */
export type Kind = 'product' | 'customer' | 'sale';
type Row = { product: KyteProduct; customer: KyteCustomer; sale: KyteSale };

// Vendas mudam o tempo todo; cadastros quase nunca (e são listas grandes de ler).
const STALE_MS: Record<Kind, number> = {
  sale: 3 * 60_000,
  product: 30 * 60_000,
  customer: 30 * 60_000,
};
const cache: { [K in Kind]?: { list: Row[K][]; at: number } } = {};
const loading: { [K in Kind]?: Promise<void> } = {};
const listeners = new Set<() => void>();
const emit = () => {
  for (const l of listeners) l();
};

export const PREVIEW = Platform.OS === 'web';
const file = () => new File(Paths.document, 'kyte-dados.json');

let restored = false;
async function restore() {
  if (restored || PREVIEW) return;
  restored = true;
  try {
    const f = file();
    if (!f.exists) return;
    const saved = JSON.parse(await f.text()) as typeof cache;
    for (const k of ['product', 'customer', 'sale'] as Kind[]) {
      const s = saved[k];
      if (s && !cache[k]) (cache as Record<Kind, unknown>)[k] = s;
    }
    emit();
  } catch {
    // Arquivo velho ou corrompido: lê tudo de novo do Kyte.
  }
}

function persist() {
  if (PREVIEW) return;
  try {
    file().write(JSON.stringify(cache));
  } catch {}
}

async function load(kind: Kind) {
  if (loading[kind]) return loading[kind];
  const p = (async () => {
    const end = perfStart(
      `Kyte: ler ${{ product: 'produtos', customer: 'clientes', sale: 'vendas' }[kind]}`,
    );
    const r = await kyteAgent.readData(kind);
    end();
    if (!r.list.length) {
      const what = { product: 'os produtos', customer: 'os clientes', sale: 'as vendas' }[kind];
      throw new Error(
        `Não reconheci ${what} do Kyte. Abra Ajustes → Diagnóstico do Kyte, toque em "Ler agora" e mande o texto.`,
      );
    }
    (cache as Record<Kind, unknown>)[kind] = { list: r.list as Row[Kind][], at: Date.now() };
    persist();
    emit();
  })();
  loading[kind] = p;
  try {
    await p;
  } finally {
    loading[kind] = undefined;
  }
}

/** Carrega o que já foi lido antes (arquivo do aparelho). */
export const restoreKyteCache = () => restore();

/** Clientes já lidos do Kyte (ou null se ainda não leu). */
export const cachedCustomers = (): KyteCustomer[] | null => cache.customer?.list ?? null;

/** Cliente do Kyte pelo nome (da lista já lida), com o endereço para a rota. */
export function findCustomer(name: string): KyteCustomer | null {
  const n = name.trim().toLowerCase();
  return cache.customer?.list.find((c) => c.name.trim().toLowerCase() === n) ?? null;
}

export const customerAddress = (c: KyteCustomer) =>
  [c.address, c.complement, c.district, c.city].filter(Boolean).join(', ');

/** Esquece o que foi lido (ao sair da conta). */
export function clearKyteData() {
  for (const k of ['product', 'customer', 'sale'] as Kind[]) delete cache[k];
  persist();
  emit();
}

/** Vendas feitas pelo GoClient no Preview (lá não há Kyte de verdade). */
const previewSales: KyteSale[] = [];

/** Venda recém-registrada: entra no topo do Histórico na hora, sem esperar ler o Kyte. */
export function addLocalSale(sale: KyteSale) {
  if (PREVIEW) previewSales.unshift(sale);
  else if (cache.sale) {
    cache.sale.list = [sale, ...cache.sale.list.filter((s) => s.id !== sale.id)];
    persist();
  }
  emit();
}

/** Próximo número de venda (o maior que conhecemos + 1), enquanto o Kyte não diz o dele. */
export function nextSaleNumber(): string {
  const all = PREVIEW ? [...previewSales, ...SAMPLE.sale] : (cache.sale?.list ?? []);
  const max = all.reduce((m, s) => Math.max(m, Number(s.number) || 0), 0);
  return max ? String(max + 1) : '';
}

/** Remove/atualiza uma venda localmente (ex.: depois de cancelar). */
export function patchSale(id: string, patch: Partial<KyteSale>) {
  const c = cache.sale;
  if (!c) return;
  c.list = c.list.map((s) => (s.id === id ? { ...s, ...patch } : s));
  persist();
  emit();
}

export function useKyteList<K extends Kind>(kind: K, active = true) {
  const [, tick] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const l = () => tick((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  const refresh = useCallback(
    async (force = false) => {
      if (PREVIEW) return;
      await restore();
      const c = cache[kind];
      if (!force && c && Date.now() - c.at < STALE_MS[kind]) return;
      if (!kyteAgentAvailable() || !kyteLogged()) {
        setError('Entre no Kyte para ver os seus dados.');
        return;
      }
      setBusy(true);
      setError(null);
      try {
        await load(kind);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Não consegui ler o Kyte agora.');
      } finally {
        setBusy(false);
      }
    },
    [kind],
  );

  useEffect(() => {
    if (active) void refresh();
  }, [refresh, active]);

  const list = (
    PREVIEW
      ? kind === 'sale'
        ? [...previewSales, ...SAMPLE.sale]
        : SAMPLE[kind]
      : (cache[kind]?.list ?? null)
  ) as Row[K][] | null;
  return {
    list,
    /** Primeira leitura ainda em andamento (sem nada para mostrar). */
    loading: !list && (busy || (!error && !PREVIEW)),
    busy,
    error,
    refresh: () => refresh(true),
    sample: PREVIEW,
  };
}

export interface Figure {
  count: number | null;
  total: string;
}

let kyteNumbers: {
  at: number;
  data: Record<'today' | 'yesterday' | 'month' | 'last30', Figure | null>;
} | null = null;

/**
 * Números do Início. Preferência: os totais que o próprio Kyte mostra no Histórico (incluem
 * vendas que a lista lida pode não ter); sem eles, a soma das vendas lidas.
 */
export function useKyteSummary(sales: KyteSale[] | null) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (PREVIEW || !kyteAgentAvailable() || !kyteLogged()) return;
    if (kyteNumbers && Date.now() - kyteNumbers.at < 2 * 60_000) return;
    let alive = true;
    kyteAgent
      .salesSummary()
      .then((d) => {
        const f = (v: { count: number; total: string } | null) =>
          v ? { count: v.count, total: v.total } : null;
        kyteNumbers = {
          at: Date.now(),
          data: {
            today: f(d.today),
            yesterday: f(d.yesterday),
            month: f(d.month),
            last30: f(d.last30 ?? null),
          },
        };
        if (alive) tick((n) => n + 1);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const mine = summarize(sales ?? []);
  const own = (k: 'today' | 'yesterday' | 'month' | 'last30'): Figure =>
    kyteNumbers?.data[k] ?? { count: mine[k].count, total: brl(mine[k].total) };
  return {
    today: own('today'),
    yesterday: own('yesterday'),
    month: own('month'),
    last30: own('last30'),
  };
}

export type KyteStoreInfo = { name: string; header: string; footer: string; logo: string };
let storeInfo: { at: number; data: KyteStoreInfo | null } | null = null;

/** Nome e textos da loja para o recibo (do próprio Kyte). */
export function useKyteStore(): KyteStoreInfo | null {
  const [, tick] = useState(0);
  useEffect(() => {
    if (PREVIEW || storeInfo || !kyteAgentAvailable() || !kyteLogged()) return;
    let alive = true;
    kyteAgent
      .readStore()
      .then((d) => {
        storeInfo = { at: Date.now(), data: d };
        if (alive) tick((n) => n + 1);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return PREVIEW ? SAMPLE_STORE : (storeInfo?.data ?? null);
}
