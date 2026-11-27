/**
 * Carrinho da venda do Kyte no GoClient (fluxo do vídeo do usuário, 27/11/2026): Vender →
 * Carrinho → Pagamento → (Dinheiro) → Venda Concluída → Recibo. Tudo em centavos inteiros,
 * para não haver erro de arredondamento. Regras puras, com testes em cart.test.ts.
 */

export interface CartLine {
  /** Nome do produto (é por ele que o Kyte acha o produto ao registrar). */
  name: string;
  qty: number;
  /** Preço do cadastro, em centavos. */
  listCents: number;
  /** Preço usado nesta venda (o "Editar valor unitário" muda só para esta venda). */
  unitCents: number;
  /** Desconto do item, em centavos (sobre o total da linha). */
  discountCents: number;
}

export interface CartCustomer {
  name: string;
  phone: string;
  district: string;
  /** Saldo do cliente no Kyte, em centavos (negativo = deve). */
  balanceCents: number | null;
}

export type Delivery = 'retirada' | 'entrega';

export interface Cart {
  lines: CartLine[];
  customer: CartCustomer | null;
  /** Desconto da venda inteira. */
  discount: { kind: 'value' | 'percent'; amount: number } | null;
  note: string;
  noteOnReceipt: boolean;
  delivery: Delivery;
}

export const emptyCart = (): Cart => ({
  lines: [],
  customer: null,
  discount: null,
  note: '',
  noteOnReceipt: true,
  delivery: 'retirada',
});

export const toCents = (v: number | null | undefined) => Math.round((v ?? 0) * 100);
export const fromCents = (c: number) => c / 100;

/** Toque num produto: soma `n` (o multiplicador "1X", "2X"...) à linha dele. */
export function addProduct(cart: Cart, p: { name: string; price: number | null }, n = 1): Cart {
  const i = cart.lines.findIndex((l) => l.name === p.name);
  if (i < 0) {
    const cents = toCents(p.price);
    return {
      ...cart,
      lines: [
        ...cart.lines,
        { name: p.name, qty: n, listCents: cents, unitCents: cents, discountCents: 0 },
      ],
    };
  }
  return setQty(cart, p.name, (cart.lines[i]?.qty ?? 0) + n);
}

/** Quantidade nova (0 ou menos tira o item do carrinho). */
export function setQty(cart: Cart, name: string, qty: number): Cart {
  if (qty <= 0) return removeLine(cart, name);
  return {
    ...cart,
    lines: cart.lines.map((l) =>
      l.name === name
        ? { ...l, qty, discountCents: Math.min(l.discountCents, qty * l.unitCents) }
        : l,
    ),
  };
}

export function setUnitPrice(cart: Cart, name: string, cents: number): Cart {
  return {
    ...cart,
    lines: cart.lines.map((l) =>
      l.name === name
        ? {
            ...l,
            unitCents: Math.max(0, cents),
            discountCents: Math.min(l.discountCents, l.qty * Math.max(0, cents)),
          }
        : l,
    ),
  };
}

export function setLineDiscount(cart: Cart, name: string, cents: number): Cart {
  return {
    ...cart,
    lines: cart.lines.map((l) =>
      l.name === name
        ? { ...l, discountCents: Math.min(Math.max(0, cents), l.qty * l.unitCents) }
        : l,
    ),
  };
}

export function removeLine(cart: Cart, name: string): Cart {
  return { ...cart, lines: cart.lines.filter((l) => l.name !== name) };
}

export const lineCents = (l: CartLine) => l.qty * l.unitCents - l.discountCents;
export const subtotalCents = (cart: Cart) => cart.lines.reduce((a, l) => a + lineCents(l), 0);
export const countItems = (cart: Cart) => cart.lines.reduce((a, l) => a + l.qty, 0);

/** Valor do desconto da venda, em centavos (nunca maior que o subtotal). */
export function discountCents(cart: Cart): number {
  const sub = subtotalCents(cart);
  const d = cart.discount;
  if (!d || d.amount <= 0) return 0;
  const v = d.kind === 'percent' ? Math.round((sub * Math.min(d.amount, 100)) / 100) : d.amount;
  return Math.min(v, sub);
}

export const totalCents = (cart: Cart) => subtotalCents(cart) - discountCents(cart);

/** Troco do pagamento em dinheiro (0 se faltar dinheiro). */
export const changeCents = (receivedCents: number, total: number) =>
  Math.max(0, receivedCents - total);

/**
 * Teclado numérico do Kyte (valores): cada dígito entra pela direita, como numa
 * maquininha ("3" → 0,03; "35" → 0,35; "358" → 3,58...). Limite de R$ 999.999,99.
 */
export function pushDigit(cents: number, digit: number): number {
  const next = cents * 10 + digit;
  return next > 99_999_999 ? cents : next;
}

export const popDigit = (cents: number) => Math.floor(cents / 10);

/** Teclado de quantidade: inteiro, até 99.999. */
export function pushQtyDigit(qty: number, digit: number): number {
  const next = qty * 10 + digit;
  return next > 99_999 ? qty : next;
}

/** "R$ 358,00" a partir de centavos. */
export const brlCents = (c: number) =>
  `R$ ${(c / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Só o número ("358,00"), para os valores grandes com o "R$" pequeno ao lado. */
export const amountCents = (c: number) =>
  (c / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "8 itens = R$ 358,00" (rodapé do Vender e do Carrinho). */
export function cartButtonLabel(cart: Cart): string {
  const n = countItems(cart);
  if (!n) return 'Nenhum item';
  return `${n} ${n === 1 ? 'item' : 'itens'} = ${brlCents(totalCents(cart))}`;
}

export type PaymentMethod =
  | 'Dinheiro'
  | 'Cartão de Débito'
  | 'Cartão de Crédito'
  | 'Saldo Cliente'
  | 'Link de Pagamento'
  | 'Outros'
  | 'Pix'
  | 'Fiado';

/** Formas de pagamento da tela Pagamento, na ordem do Kyte. */
export const PAYMENT_METHODS: Exclude<PaymentMethod, 'Fiado'>[] = [
  'Dinheiro',
  'Cartão de Débito',
  'Cartão de Crédito',
  'Saldo Cliente',
  'Link de Pagamento',
  'Outros',
  'Pix',
];

/**
 * Pode usar a forma de pagamento? "Saldo Cliente" só com cliente e saldo que cubra a venda;
 * "Venda Fiado" só com cliente (o Kyte lança a dívida na conta dele).
 */
export function canPayWith(cart: Cart, m: PaymentMethod): boolean {
  if (m === 'Fiado') return !!cart.customer;
  if (m === 'Saldo Cliente')
    return !!cart.customer && (cart.customer.balanceCents ?? 0) >= totalCents(cart);
  return true;
}
