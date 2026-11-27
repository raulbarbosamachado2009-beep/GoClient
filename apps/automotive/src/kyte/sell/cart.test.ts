import { describe, expect, it } from 'vitest';
import {
  addProduct,
  brlCents,
  canPayWith,
  cartButtonLabel,
  changeCents,
  countItems,
  discountCents,
  emptyCart,
  popDigit,
  pushDigit,
  setLineDiscount,
  setQty,
  setUnitPrice,
  totalCents,
} from './cart';

const shampoo = { name: 'Shampoo 5 LTS', price: 60 };
const pomada = { name: 'Pomada 150 gm', price: 8 };

describe('carrinho do Kyte', () => {
  it('soma toques no mesmo produto e usa o multiplicador', () => {
    let c = addProduct(emptyCart(), shampoo);
    c = addProduct(c, shampoo, 2);
    c = addProduct(c, pomada);
    expect(countItems(c)).toBe(4);
    expect(totalCents(c)).toBe(18800);
    expect(cartButtonLabel(c)).toBe('4 itens = R$ 188,00');
  });

  it('edita o valor unitário só para esta venda (fluxo do vídeo: 7 × R$ 50 + R$ 8)', () => {
    let c = addProduct(emptyCart(), pomada);
    c = addProduct(c, shampoo, 3);
    c = setQty(c, shampoo.name, 7);
    c = setUnitPrice(c, shampoo.name, 5000);
    expect(totalCents(c)).toBe(35800);
    expect(c.lines[1]?.listCents).toBe(6000);
  });

  it('quantidade zero tira o item', () => {
    const c = setQty(addProduct(emptyCart(), pomada), pomada.name, 0);
    expect(c.lines).toHaveLength(0);
    expect(cartButtonLabel(c)).toBe('Nenhum item');
  });

  it('desconto da venda em valor ou porcentagem, nunca maior que o total', () => {
    const base = addProduct(emptyCart(), shampoo, 2);
    expect(discountCents({ ...base, discount: { kind: 'percent', amount: 10 } })).toBe(1200);
    expect(discountCents({ ...base, discount: { kind: 'value', amount: 99999 } })).toBe(12000);
    expect(totalCents({ ...base, discount: { kind: 'value', amount: 2000 } })).toBe(10000);
  });

  it('desconto do item não passa do valor da linha', () => {
    const c = setLineDiscount(addProduct(emptyCart(), pomada), pomada.name, 5000);
    expect(totalCents(c)).toBe(0);
  });

  it('teclado de valor entra pela direita, como maquininha', () => {
    let v = 0;
    for (const d of [3, 5, 8, 0, 0]) v = pushDigit(v, d);
    expect(brlCents(v)).toBe('R$ 358,00');
    expect(popDigit(v)).toBe(3580);
  });

  it('troco e formas de pagamento que dependem do cliente', () => {
    const c = addProduct(emptyCart(), shampoo);
    expect(changeCents(10000, 6000)).toBe(4000);
    expect(changeCents(5000, 6000)).toBe(0);
    expect(canPayWith(c, 'Fiado')).toBe(false);
    expect(canPayWith(c, 'Dinheiro')).toBe(true);
    const withClient = {
      ...c,
      customer: { name: 'Ana', phone: '', district: '', balanceCents: 1000 },
    };
    expect(canPayWith(withClient, 'Fiado')).toBe(true);
    expect(canPayWith(withClient, 'Saldo Cliente')).toBe(false);
  });
});
