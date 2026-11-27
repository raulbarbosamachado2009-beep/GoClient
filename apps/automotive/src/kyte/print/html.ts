import { dateText, type ReceiptData } from './escpos';

const esc = (t: string) =>
  t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);

const money = (c: number | null) =>
  c == null
    ? '—'
    : `R$ ${(c / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const qtyText = (q: number) =>
  Number.isInteger(q) ? String(q) : q.toLocaleString('pt-BR', { maximumFractionDigits: 3 });

/** Recibo em HTML, no desenho do recibo do Kyte (PDF e impressão do navegador). */
export function receiptHtml(r: ReceiptData): string {
  const qty = r.lines.reduce((a, l) => a + l.qty, 0);
  const items = r.lines
    .map(
      (l) =>
        `<tr><td class="q">${qtyText(l.qty)}x</td><td><b>${esc(l.name)}</b>${l.qty !== 1 && l.unitCents != null ? `<br><small>${money(l.unitCents)}</small>` : ''}</td><td class="r">${money(l.totalCents)}</td></tr>`,
    )
    .join('');
  return `<html><head><meta charset="utf-8"><style>
body{font-family:-apple-system,'SF Pro Text',Roboto,Arial,sans-serif;color:#363F4D;padding:24px;max-width:620px;margin:auto}
h1{font-size:24px;text-align:right;margin:0 0 12px}.store{font-weight:700;margin-top:8px}.muted{color:#7A8494;font-size:13px}
.note{border:2px solid #363F4D;border-radius:10px;padding:10px 12px;margin:16px 0;font-weight:600}
table{width:100%;border-collapse:collapse;border-top:3px solid #363F4D;margin-top:8px}
td{padding:10px 4px;border-bottom:1px solid #E3E7EC;vertical-align:top}.r{text-align:right;white-space:nowrap}.q{width:36px;color:#7A8494}
small{color:#AAB1BC}.tot{text-align:right;font-size:20px;font-weight:700;margin-top:14px}
.foot{text-align:center;margin-top:24px;border-top:3px solid #363F4D;padding-top:16px;font-weight:600}
</style></head><body>
<h1>RECIBO #${esc(r.number)}</h1>
${r.store ? `<div class="store">${esc(r.store.name.toUpperCase())}</div><div class="muted">${esc(r.store.header)}</div>` : ''}
${r.customer?.name ? `<p><b>${esc(r.customer.name)}</b><br><span class="muted">${esc([r.customer.phone, r.customer.district].filter(Boolean).join(' • '))}</span></p>` : ''}
${r.note.trim() ? `<div class="note">${esc(r.note.trim())}</div>` : ''}
<p><b>${r.lines.length} ${r.lines.length === 1 ? 'item' : 'itens'} (Qtd.: ${qtyText(qty)})</b></p>
<table>${items}</table>
${r.discountCents > 0 ? `<div class="r muted" style="margin-top:10px">Desconto: − ${money(r.discountCents)}</div>` : ''}
<div class="tot">Total: ${money(r.totalCents)}</div>
${r.payment ? `<div class="r muted">${esc(r.payment)}: ${money(r.receivedCents ?? r.totalCents)}</div>` : ''}
${r.changeCents ? `<div class="r muted">Troco: ${money(r.changeCents)}</div>` : ''}
<div class="foot">${esc(r.store?.footer ?? '')}<div class="muted" style="font-weight:400">${esc(dateText(r.date))}</div></div>
</body></html>`;
}
