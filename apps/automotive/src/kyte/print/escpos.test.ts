import { describe, expect, it } from 'vitest';
import {
  encodeText,
  pair,
  type ReceiptData,
  receiptBytes,
  receiptLines,
  toBase64,
  wrap,
} from './escpos';

const receipt: ReceiptData = {
  number: '14168',
  date: new Date(2026, 10, 26, 21, 12).getTime(),
  store: { name: 'Loja Exemplo', header: 'Produtos para salões', footer: 'Obrigado!' },
  customer: { name: 'Cliente Teste', phone: '', district: 'Centro' },
  note: 'Parcelo',
  lines: [
    { qty: 1, name: 'Pomada 150 gm', unitCents: 800, totalCents: 800 },
    { qty: 7, name: 'Shampoo 5 LTS', unitCents: 5000, totalCents: 35000 },
  ],
  discountCents: 0,
  totalCents: 35800,
  payment: 'Dinheiro',
};

describe('recibo ESC/POS', () => {
  it('acentos na página 860 ou sem acentos', () => {
    expect(encodeText('ção', true)).toEqual([0x87, 0x84, 0x6f]);
    expect(encodeText('ção', false)).toEqual([0x63, 0x61, 0x6f]);
    expect(encodeText('€', true)).toEqual([63]);
  });

  it('quebra linhas e alinha valores à direita', () => {
    expect(wrap('Shampoo anti resíduo 5 LTS', 12)).toEqual(['Shampoo anti', 'resíduo 5', 'LTS']);
    expect(pair('Total:', 'R$ 358,00', 32)).toHaveLength(32);
    expect(pair('Total:', 'R$ 358,00', 32).endsWith('R$ 358,00')).toBe(true);
  });

  it('tem itens, total, observação e loja, no tamanho do papel', () => {
    const lines = receiptLines(receipt, 32);
    const text = lines.map((l) => l.text).join('\n');
    expect(text).toContain('RECIBO #14168');
    expect(text).toContain('2 itens (Qtd.: 8)');
    expect(text).toContain('Parcelo');
    expect(text).toContain('7x Shampoo 5 LTS');
    for (const l of lines) expect(l.text.length).toBeLessThanOrEqual(32);
  });

  it('começa inicializando a impressora e termina avançando o papel', () => {
    const b = receiptBytes(receipt, { columns: 32, accents: true });
    expect(b.slice(0, 5)).toEqual([0x1b, 0x40, 0x1b, 0x74, 3]);
    expect(b.slice(-4)).toEqual([0x1d, 0x56, 0x42, 0]);
  });

  it('base64', () => {
    expect(toBase64([77, 97, 110])).toBe('TWFu');
    expect(toBase64([77, 97])).toBe('TWE=');
    expect(toBase64([77])).toBe('TQ==');
  });
});
