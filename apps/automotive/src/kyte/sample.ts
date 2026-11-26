import type { KyteCustomer, KyteProduct, KyteSale } from './model';

/**
 * Dados de exemplo do Kyte, só para o Preview (navegador), onde o Kyte não abre. Nomes e
 * valores parecidos com os prints enviados; telefones fictícios.
 */
const p = (id: string, name: string, price: number, stock: number | null = null): KyteProduct => ({
  id,
  name,
  price,
  stock,
  image: '',
  code: '',
  category: '',
});

const products: KyteProduct[] = [
  p('p1', 'Afiação', 50),
  p('p2', 'Álcool gel', 0, 12),
  p('p3', 'Alisante Americano', 80, 6),
  p('p4', 'Alisante Premium', 85, 9),
  p('p5', 'Aloka café', 135, 2),
  p('p6', 'Avental', 50, 15),
  p('p7', 'Fixador', 18, 40),
  p('p8', 'Lâmina Inox', 12, 120),
  p('p9', 'Máscara Capilar', 45, 8),
  p('p10', 'Óleo de Barba', 35, 14),
  p('p11', 'Pomada DANONINHO 150 gm', 7, 60),
  p('p12', 'Shaving', 40, 20),
];

const c = (
  id: string,
  name: string,
  phone: string,
  balance: number | null,
  address = '',
  district = '',
): KyteCustomer => ({
  id,
  name,
  phone,
  email: '',
  address,
  complement: '',
  district,
  city: 'São Paulo',
  balance,
});

const customers: KyteCustomer[] = [
  c('c1', 'Barbearia Deny', '', 0, 'Rua das Flores, 120', 'Jd. Selma'),
  c('c2', 'Roger/Marquinhos Vila Clara', '11 90000-0001', 0, 'Av. Vila Clara, 400', 'Vila Clara'),
  c('c3', 'Adão Barb. Jd. Selma', '', -350, 'Rua Selma, 88', 'Jd. Selma'),
  c('c4', 'Adilsom/ Dona Bimba', '', 0, 'Rua Dona Bimba, 750', 'Jd. Orly'),
  c('c5', 'Adison Barbeiro ( Rua Dona Bimba 750)', '', -1200, 'Rua Dona Bimba, 750', 'Jd. Orly'),
  c('c6', 'Adriana Distribuidora SBC', '', -3050, 'Av. Kennedy, 1000', 'São Bernardo'),
  c('c7', 'Adriano', '', 0, '', ''),
  c('c8', 'Edson Barbeiro Jd. Orly', '11 90000-0002', 0, 'Rua Orly, 33', 'Jd. Orly'),
];

const day = 86_400_000;
const at = (daysAgo: number, h: number, m: number) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.getTime() - daysAgo * day;
};
const s = (
  number: number,
  date: number,
  total: number,
  customer: string,
  items: [string, number, number][],
  payment = 'Dinheiro',
): KyteSale => ({
  id: `s${number}`,
  number: String(number),
  date,
  total,
  payment,
  seller: 'Raul',
  canceled: false,
  customer: { name: customer, phone: '', district: '' },
  items: items.map(([name, qty, unit]) => ({ name, qty, unitPrice: unit, total: qty * unit })),
});

const sales: KyteSale[] = [
  s(14159, at(1, 21, 50), 160, 'Edson Barbeiro Jd. Orly', [
    ['Alisante Premium', 1, 90],
    ['Pomada DANONINHO 150 gm', 10, 7],
  ]),
  s(14158, at(1, 21, 39), 184, 'Alex Barb Jd Selma', [
    ['Shaving', 1, 40],
    ['Fixador', 2, 18],
    ['Lâmina Inox', 2, 54],
  ]),
  s(
    14157,
    at(1, 21, 32),
    590,
    'K Ribeiro Vl Missionária',
    [
      ['Manutenção máquina', 1, 120],
      ['Máscara Capilar', 1, 45],
      ['Manutenção tesoura', 1, 90],
      ['Óleo de Barba', 5, 35],
      ['Alisante Americano', 2, 80],
    ],
    'Pix',
  ),
  s(14156, at(1, 21, 1), 40, 'Perecles Barbeiro', [['Shaving', 1, 40]]),
  s(14155, at(1, 20, 19), 113, 'Barbearia Deny', [
    ['Fixador', 1, 18],
    ['Lâmina Inox', 1, 12],
    ['Alisante Premium', 1, 83],
  ]),
  s(14150, at(3, 16, 5), 270, 'Adriana Distribuidora SBC', [['Aloka café', 2, 135]], 'Cartão'),
];

export const SAMPLE = { product: products, customer: customers, sale: sales };

export const SAMPLE_STORE = {
  name: 'Brasil Cosméticos',
  header: 'Produtos profissionais e acessórios para barbearias e salões de cabeleireiros',
  footer: 'Fornecendo desde 2006',
  logo: '',
};
