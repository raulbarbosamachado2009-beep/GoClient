/**
 * Dados do Kyte no formato das telas do GoClient (vêm de data-page.ts, na janela invisível).
 * Campos que o Kyte não mandou ficam vazios/nulos e as telas os escondem.
 */
export interface KyteProduct {
  id: string;
  name: string;
  price: number | null;
  stock: number | null;
  image: string;
  code: string;
  category: string;
}

export interface KyteCustomer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  complement: string;
  district: string;
  city: string;
  balance: number | null;
}

export interface KyteSaleItem {
  name: string;
  qty: number;
  unitPrice: number | null;
  total: number | null;
}

export interface KyteSale {
  id: string;
  number: string;
  /** Data em milissegundos. */
  date: number | null;
  total: number | null;
  payment: string;
  seller: string;
  canceled: boolean;
  customer: { name: string; phone: string; district: string } | null;
  items: KyteSaleItem[];
}

export const brl = (v: number | null | undefined) =>
  v == null
    ? '—'
    : `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** "Hoje", "Ontem" ou "21 de novembro". */
export function dayLabel(ms: number, now = Date.now()): string {
  const d = new Date(ms);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(new Date(now)) - start(d)) / 86_400_000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
}

export const hhmm = (ms: number) =>
  new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export interface SalesSummary {
  today: { count: number; total: number };
  yesterday: { count: number; total: number };
  month: { count: number; total: number };
  last30: { count: number; total: number };
}

/** Números do Início e do rodapé do Histórico (vendas canceladas não contam). */
export function summarize(sales: KyteSale[], now = Date.now()): SalesSummary {
  const d = new Date(now);
  const today = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const yesterday = today - 86_400_000;
  const month = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const last30 = today - 29 * 86_400_000;
  const z = () => ({ count: 0, total: 0 });
  const out: SalesSummary = { today: z(), yesterday: z(), month: z(), last30: z() };
  for (const s of sales) {
    if (s.canceled || s.date == null) continue;
    const add = (b: { count: number; total: number }) => {
      b.count++;
      b.total += s.total ?? 0;
    };
    if (s.date >= today) add(out.today);
    else if (s.date >= yesterday) add(out.yesterday);
    if (s.date >= month) add(out.month);
    if (s.date >= last30) add(out.last30);
  }
  return out;
}

/** Resumo dos itens numa linha: "3 itens: 1x Shaving  2x Fixador". */
export function itemsLine(items: KyteSaleItem[]): string {
  const parts = items.map((i) => `${fmtQty(i.qty)}x ${i.name}`);
  return items.length > 1 ? `${items.length} itens: ${parts.join('  ')}` : (parts[0] ?? '');
}

export const fmtQty = (q: number) =>
  Number.isInteger(q) ? String(q) : q.toLocaleString('pt-BR', { maximumFractionDigits: 3 });

export const onlyDigits = (t: string) => t.replace(/\D/g, '');

/** Texto para busca: sem acentos e em minúsculas. */
export const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
