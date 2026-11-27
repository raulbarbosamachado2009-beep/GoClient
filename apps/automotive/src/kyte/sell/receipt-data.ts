import type { KyteSale } from '../model';
import type { ReceiptData } from '../print/escpos';
import type { KyteStoreInfo } from '../store';

const cents = (v: number | null) => (v == null ? null : Math.round(v * 100));

/** Recibo a partir de uma venda do Histórico (ou da venda recém-concluída). */
export function saleToReceipt(
  v: KyteSale,
  store: KyteStoreInfo | null,
  extra: Partial<
    Pick<ReceiptData, 'note' | 'discountCents' | 'receivedCents' | 'changeCents'>
  > = {},
): ReceiptData {
  return {
    number: v.number || '—',
    date: v.date,
    store: store ? { name: store.name, header: store.header, footer: store.footer } : null,
    customer: v.customer?.name ? v.customer : null,
    note: extra.note ?? '',
    lines: v.items.map((i) => ({
      qty: i.qty,
      name: i.name,
      unitCents: cents(i.unitPrice),
      totalCents: cents(i.total),
    })),
    discountCents: extra.discountCents ?? 0,
    totalCents: cents(v.total),
    payment: v.payment,
    receivedCents: extra.receivedCents,
    changeCents: extra.changeCents,
  };
}
