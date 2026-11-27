import { describe, expect, it } from 'vitest';
import { AGENT_HELPERS, JOBS } from './agent-page';

/** Os trabalhos são texto de JavaScript que roda na página do Kyte: precisam ser válidos. */
const parses = (body: string) => () => new Function('A', `return (async function(){ ${body} })`);

describe('trabalhos na página do Kyte', () => {
  it('ajudantes e trabalhos são JavaScript válido', () => {
    expect(() => new Function(AGENT_HELPERS)).not.toThrow();
    expect(
      parses(JOBS.fillSale({ items: [{ name: 'Fixador', qty: 2 }], customer: 'Zé' })),
    ).not.toThrow();
    expect(parses(JOBS.cancelSale('14159'))).not.toThrow();
  });

  it('registrar venda: escapa nomes e formas de pagamento', () => {
    const body = JOBS.registerSale({
      items: [{ name: 'Shampoo (5 LTS) "zahhara"', qty: 7, unitCents: 5000 }],
      customer: "D'Ávila",
      payment: 'Cartão de Débito',
      mode: 'sale',
      receivedCents: null,
      discountCents: 0,
      note: 'Parcelo\nem 2x',
    });
    expect(parses(body)).not.toThrow();
    expect(body).toContain('/itens?\\s*=|carrinho/i');
    expect(
      parses(
        JOBS.registerSale({
          items: [],
          customer: null,
          payment: 'Dinheiro',
          mode: 'order',
          receivedCents: 35800,
          discountCents: 100,
          note: '',
        }),
      ),
    ).not.toThrow();
  });
});
