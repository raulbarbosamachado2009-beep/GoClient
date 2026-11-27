/**
 * Comanda/recibo para impressora térmica Bluetooth (ESC/POS, o padrão das impressoras de
 * 58 e 80 mm que o Kyte usa no celular). Transforma o recibo em bytes; quem envia os bytes
 * para a impressora pareada é o módulo nativo `bt-printer` (Android).
 *
 * Acentos: a página de código 860 (português) tem ã, õ, ç, á, é... Impressoras que não a
 * conhecem imprimem lixo no lugar dos acentos; para elas há a opção "sem acentos".
 */

export interface ReceiptLine {
  qty: number;
  name: string;
  /** Centavos. */
  unitCents: number | null;
  totalCents: number | null;
}

export interface ReceiptData {
  number: string;
  /** Data em milissegundos. */
  date: number | null;
  store: { name: string; header: string; footer: string } | null;
  customer: { name: string; phone: string; district: string } | null;
  /** Observação (só se a pessoa marcou "Exibir esta observação no recibo"). */
  note: string;
  lines: ReceiptLine[];
  discountCents: number;
  totalCents: number | null;
  payment: string;
  /** Dinheiro: valor recebido e troco. */
  receivedCents?: number;
  changeCents?: number;
}

export interface PrintOptions {
  /** Caracteres por linha: 32 (58 mm) ou 48 (80 mm). */
  columns: number;
  accents: boolean;
}

const ESC = 0x1b;
const GS = 0x1d;

const CP860: Record<string, number> = {
  Ç: 0x80,
  ü: 0x81,
  é: 0x82,
  â: 0x83,
  ã: 0x84,
  à: 0x85,
  Á: 0x86,
  ç: 0x87,
  ê: 0x88,
  Ê: 0x89,
  è: 0x8a,
  Í: 0x8b,
  Ô: 0x8c,
  ì: 0x8d,
  Ã: 0x8e,
  Â: 0x8f,
  É: 0x90,
  À: 0x91,
  È: 0x92,
  ô: 0x93,
  õ: 0x94,
  ò: 0x95,
  Ú: 0x96,
  ù: 0x97,
  Ì: 0x98,
  Õ: 0x99,
  Ü: 0x9a,
  Ù: 0x9d,
  Ó: 0x9f,
  á: 0xa0,
  í: 0xa1,
  ó: 0xa2,
  ú: 0xa3,
  ñ: 0xa4,
  Ñ: 0xa5,
  ª: 0xa6,
  º: 0xa7,
  Ò: 0xa9,
};

const plain = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Texto → bytes na página 860 (ou sem acentos). Caracteres desconhecidos viram "?". */
export function encodeText(text: string, accents: boolean): number[] {
  const out: number[] = [];
  for (const ch of text.normalize('NFC')) {
    const code = ch.charCodeAt(0);
    if (code === 10 || (code >= 32 && code < 127)) out.push(code);
    else if (accents && CP860[ch] !== undefined) out.push(CP860[ch] as number);
    else {
      const p = plain(ch);
      const c = p.charCodeAt(0);
      out.push(p.length === 1 && c >= 32 && c < 127 ? c : 63);
    }
  }
  return out;
}

/** Quebra o texto em linhas de até `width` caracteres, sem cortar palavras curtas. */
export function wrap(text: string, width: number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      if (!line) line = word;
      else if (line.length + 1 + word.length <= width) line += ` ${word}`;
      else {
        out.push(line);
        line = word;
      }
      while (line.length > width) {
        out.push(line.slice(0, width));
        line = line.slice(width);
      }
    }
    out.push(line);
  }
  return out;
}

/** Esquerda e direita na mesma linha ("Total ........ R$ 358,00"). */
export function pair(left: string, right: string, width: number): string {
  const room = width - right.length - 1;
  const l = left.length > room ? left.slice(0, Math.max(room, 0)) : left;
  return `${l}${' '.repeat(Math.max(1, width - l.length - right.length))}${right}`;
}

const money = (c: number | null) =>
  c == null
    ? '-'
    : `R$ ${(c / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const qtyText = (q: number) =>
  Number.isInteger(q) ? String(q) : q.toLocaleString('pt-BR', { maximumFractionDigits: 3 });

export function dateText(ms: number | null): string {
  if (ms == null) return '';
  const d = new Date(ms);
  const month = d.toLocaleDateString('pt-BR', { month: 'long' });
  const hm = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${d.getDate()} de ${month.charAt(0).toUpperCase()}${month.slice(1)} de ${d.getFullYear()} às ${hm}`;
}

/** Linhas de texto do recibo (também servem para "Compartilhar" e "Email"). */
export function receiptLines(
  r: ReceiptData,
  width: number,
): { text: string; bold?: boolean; center?: boolean; big?: boolean }[] {
  const L: { text: string; bold?: boolean; center?: boolean; big?: boolean }[] = [];
  const rule = '-'.repeat(width);
  if (r.store?.name) L.push({ text: r.store.name.toUpperCase(), bold: true, center: true });
  if (r.store?.header)
    for (const t of wrap(r.store.header, width)) L.push({ text: t, center: true });
  L.push({ text: '' });
  L.push({ text: `RECIBO #${r.number}`, bold: true, center: true, big: true });
  L.push({ text: dateText(r.date), center: true });
  if (r.customer?.name) {
    L.push({ text: rule });
    for (const t of wrap(r.customer.name, width)) L.push({ text: t, bold: true });
    const extra = [r.customer.phone, r.customer.district].filter(Boolean).join(' - ');
    if (extra) for (const t of wrap(extra, width)) L.push({ text: t });
  }
  if (r.note.trim()) {
    L.push({ text: rule });
    for (const t of wrap(r.note.trim(), width)) L.push({ text: t });
  }
  const qty = r.lines.reduce((a, l) => a + l.qty, 0);
  L.push({ text: rule });
  L.push({
    text: `${r.lines.length} ${r.lines.length === 1 ? 'item' : 'itens'} (Qtd.: ${qtyText(qty)})`,
    bold: true,
  });
  L.push({ text: rule });
  for (const l of r.lines) {
    const head = `${qtyText(l.qty)}x ${l.name}`;
    const total = money(l.totalCents);
    const parts = wrap(head, width - total.length - 1);
    parts.forEach((p, i) => {
      L.push({ text: i === 0 ? pair(p, total, width) : `   ${p}` });
    });
    if (l.qty !== 1 && l.unitCents != null) L.push({ text: `   ${money(l.unitCents)} cada` });
  }
  L.push({ text: rule });
  if (r.discountCents > 0) L.push({ text: pair('Desconto', `- ${money(r.discountCents)}`, width) });
  L.push({ text: pair('Total:', money(r.totalCents), width), bold: true });
  if (r.payment)
    L.push({ text: pair(`${r.payment}:`, money(r.receivedCents ?? r.totalCents), width) });
  if (r.changeCents) L.push({ text: pair('Troco:', money(r.changeCents), width) });
  if (r.store?.footer) {
    L.push({ text: '' });
    for (const t of wrap(r.store.footer, width)) L.push({ text: t, center: true, bold: true });
  }
  return L;
}

/** Recibo em texto simples (Compartilhar / Email). */
export const receiptPlainText = (r: ReceiptData) =>
  receiptLines(r, 40)
    .map((l) => l.text)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/** Bytes ESC/POS do recibo, prontos para a impressora. */
export function receiptBytes(r: ReceiptData, o: PrintOptions): number[] {
  const out: number[] = [ESC, 0x40]; // inicializa
  if (o.accents) out.push(ESC, 0x74, 3); // página de código 860 (português)
  for (const l of receiptLines(r, o.columns)) {
    out.push(ESC, 0x61, l.center ? 1 : 0); // alinhamento
    out.push(ESC, 0x45, l.bold ? 1 : 0); // negrito
    out.push(GS, 0x21, l.big ? 0x11 : 0); // tamanho dobrado
    // Texto dobrado ocupa o dobro: corta para caber.
    const text = l.big ? l.text.slice(0, Math.floor(o.columns / 2)) : l.text;
    out.push(...encodeText(text, o.accents), 10);
  }
  out.push(ESC, 0x61, 0, ESC, 0x45, 0, GS, 0x21, 0);
  out.push(ESC, 0x64, 4); // avança o papel para destacar
  out.push(GS, 0x56, 0x42, 0); // corta (impressoras sem guilhotina ignoram)
  return out;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Base64 (para passar os bytes ao módulo nativo). */
export function toBase64(bytes: number[]): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0;
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    const n = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    s += B64[(n >> 18) & 63];
    s += B64[(n >> 12) & 63];
    s += b === undefined ? '=' : B64[(n >> 6) & 63];
    s += c === undefined ? '=' : B64[n & 63];
  }
  return s;
}
