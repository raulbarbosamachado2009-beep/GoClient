import type { ImageSourcePropType } from 'react-native';

/**
 * Dados FICTÍCIOS, usados só para o design das telas. Nenhuma tela lê a API nesta fase.
 */

export const REGIONS = [
  'Todas',
  'Centro',
  'Zona Norte',
  'Zona Sul',
  'Zona Leste',
  'Zona Oeste',
] as const;

export interface MockPurchase {
  date: string;
  items: string;
  total: string;
}

export interface MockClient {
  id: string;
  name: string;
  tradeName: string;
  region: (typeof REGIONS)[number];
  address: string;
  district: string;
  phone: string;
  lastVisit: string;
  lastPurchaseTotal: string;
  purchases: MockPurchase[];
  /** Pedido em aberto para a próxima visita. */
  order: string[];
  status: 'Ativo' | 'Inativo';
}

export const CLIENTS: MockClient[] = [
  {
    id: 'c1',
    name: 'Marina Albuquerque',
    tradeName: 'Boutique Albuquerque',
    region: 'Centro',
    address: 'Rua Barão de Jaguara, 1240',
    district: 'Centro · Campinas, SP',
    phone: '(19) 99812-4410',
    lastVisit: 'há 12 dias',
    lastPurchaseTotal: 'R$ 4.820,00',
    order: [
      '12x Camiseta Básica Algodão',
      '6x Calça Jeans Slim',
      '4x Vestido Midi Linho',
      '8x Blusa Canelada',
    ],
    status: 'Ativo',
    purchases: [
      { date: '06 nov', items: '24 peças · Coleção Verão', total: 'R$ 4.820,00' },
      { date: '14 out', items: '18 peças · Jeans e básicos', total: 'R$ 3.150,00' },
      { date: '22 set', items: '30 peças · Reposição', total: 'R$ 5.380,00' },
    ],
  },
  {
    id: 'c2',
    name: 'Ricardo Menezes',
    tradeName: 'Menezes Moda Masculina',
    region: 'Zona Norte',
    address: 'Av. Brasil, 3380',
    district: 'Jardim Chapadão · Campinas, SP',
    phone: '(19) 98140-2277',
    lastVisit: 'há 5 dias',
    lastPurchaseTotal: 'R$ 2.960,00',
    order: ['10x Camisa Social Oxford', '6x Bermuda Sarja', '4x Tênis Casual Lona'],
    status: 'Ativo',
    purchases: [
      { date: '13 nov', items: '16 peças · Camisaria', total: 'R$ 2.960,00' },
      { date: '20 out', items: '12 peças · Bermudas', total: 'R$ 1.740,00' },
    ],
  },
  {
    id: 'c3',
    name: 'Juliana Prado',
    tradeName: 'Ateliê Prado',
    region: 'Zona Sul',
    address: 'Rua Abolição, 812',
    district: 'Ponte Preta · Campinas, SP',
    phone: '(19) 99655-0193',
    lastVisit: 'há 3 semanas',
    lastPurchaseTotal: 'R$ 6.410,00',
    order: ['8x Vestido Midi Linho', '6x Saia Plissada', '10x Blusa Canelada'],
    status: 'Ativo',
    purchases: [
      { date: '28 out', items: '35 peças · Vestidos', total: 'R$ 6.410,00' },
      { date: '30 set', items: '20 peças · Saias', total: 'R$ 3.020,00' },
    ],
  },
  {
    id: 'c4',
    name: 'Fernando Takahashi',
    tradeName: 'TK Street Wear',
    region: 'Zona Leste',
    address: 'Av. Júlio de Mesquita, 455',
    district: 'Cambuí · Campinas, SP',
    phone: '(19) 99201-8834',
    lastVisit: 'ontem',
    lastPurchaseTotal: 'R$ 1.890,00',
    order: ['15x Conjunto Moletom', '10x Camiseta Básica Algodão', '5x Boné Aba Curva'],
    status: 'Ativo',
    purchases: [{ date: '17 nov', items: '10 peças · Moletons', total: 'R$ 1.890,00' }],
  },
  {
    id: 'c5',
    name: 'Patrícia Lemos',
    tradeName: 'Lemos Kids',
    region: 'Zona Oeste',
    address: 'Rua Pedro Domingos Vitali, 160',
    district: 'Parque Itália · Campinas, SP',
    phone: '(19) 98877-3020',
    lastVisit: 'há 1 mês',
    lastPurchaseTotal: 'R$ 2.240,00',
    order: ['20x Body Bebê Algodão', '12x Conjunto Moletom Kids'],
    status: 'Inativo',
    purchases: [{ date: '15 out', items: '28 peças · Infantil', total: 'R$ 2.240,00' }],
  },
  {
    id: 'c6',
    name: 'Eduardo Santana',
    tradeName: 'Santana Calçados & Cia',
    region: 'Centro',
    address: 'Rua 13 de Maio, 520',
    district: 'Centro · Campinas, SP',
    phone: '(19) 99733-6612',
    lastVisit: 'há 8 dias',
    lastPurchaseTotal: 'R$ 3.570,00',
    order: ['12x Tênis Casual Lona', '6x Cinto Couro'],
    status: 'Ativo',
    purchases: [{ date: '10 nov', items: '22 pares · Tênis', total: 'R$ 3.570,00' }],
  },
  {
    id: 'c7',
    name: 'Camila Rocha',
    tradeName: 'Rocha Concept Store',
    region: 'Zona Norte',
    address: 'Rua Hermantino Coelho, 901',
    district: 'Mansões Santo Antônio · Campinas, SP',
    phone: '(19) 99120-7741',
    lastVisit: 'há 2 dias',
    lastPurchaseTotal: 'R$ 7.300,00',
    order: [
      '1x Bolsa Tiracolo Couro',
      '5x Óculos de Sol Acetato',
      '10x Camiseta Básica Algodão',
      '20x Blusa Canelada',
    ],
    status: 'Ativo',
    purchases: [{ date: '16 nov', items: '40 peças · Mix completo', total: 'R$ 7.300,00' }],
  },
  {
    id: 'c8',
    name: 'Antônio Ferraz',
    tradeName: 'Ferraz Uniformes',
    region: 'Zona Sul',
    address: 'Av. John Boyd Dunlop, 2100',
    district: 'Jardim Ipaussurama · Campinas, SP',
    phone: '(19) 98455-1208',
    lastVisit: 'há 6 dias',
    lastPurchaseTotal: 'R$ 9.120,00',
    order: ['60x Camisa Polo Uniforme', '40x Calça Sarja Uniforme'],
    status: 'Ativo',
    purchases: [{ date: '12 nov', items: '120 peças · Uniformes', total: 'R$ 9.120,00' }],
  },
  {
    id: 'c9',
    name: 'Beatriz Nogueira',
    tradeName: 'Bia Acessórios',
    region: 'Zona Leste',
    address: 'Rua Coronel Quirino, 1180',
    district: 'Cambuí · Campinas, SP',
    phone: '(19) 99302-5546',
    lastVisit: 'há 4 dias',
    lastPurchaseTotal: 'R$ 1.260,00',
    order: ['10x Óculos de Sol Acetato', '8x Relógio Minimal', '15x Cinto Couro'],
    status: 'Ativo',
    purchases: [{ date: '14 nov', items: '45 itens · Acessórios', total: 'R$ 1.260,00' }],
  },
];

export const TODAY_ROUTE = ['c7', 'c1', 'c6', 'c4', 'c9'];

export const PRODUCT_CATEGORIES = [
  'Todos',
  'Masculino',
  'Feminino',
  'Infantil',
  'Acessórios',
] as const;

export interface MockProduct {
  id: string;
  name: string;
  sku: string;
  category: (typeof PRODUCT_CATEGORIES)[number];
  price: string;
  stock: number;
  icon:
    | 'shirt-outline'
    | 'bag-handle-outline'
    | 'footsteps-outline'
    | 'glasses-outline'
    | 'watch-outline';
  tint: string;
}

export const PRODUCTS: MockProduct[] = [
  {
    id: 'p1',
    name: 'Camiseta Básica Algodão',
    sku: 'MS-1021',
    category: 'Masculino',
    price: 'R$ 49,90',
    stock: 128,
    icon: 'shirt-outline',
    tint: '#2E4A6B',
  },
  {
    id: 'p2',
    name: 'Vestido Midi Linho',
    sku: 'FM-2210',
    category: 'Feminino',
    price: 'R$ 189,90',
    stock: 34,
    icon: 'shirt-outline',
    tint: '#6B3A4A',
  },
  {
    id: 'p3',
    name: 'Calça Jeans Slim',
    sku: 'MS-1108',
    category: 'Masculino',
    price: 'R$ 159,90',
    stock: 76,
    icon: 'shirt-outline',
    tint: '#2F4F7A',
  },
  {
    id: 'p4',
    name: 'Blusa Canelada',
    sku: 'FM-2034',
    category: 'Feminino',
    price: 'R$ 79,90',
    stock: 92,
    icon: 'shirt-outline',
    tint: '#7A5A3A',
  },
  {
    id: 'p5',
    name: 'Conjunto Moletom Kids',
    sku: 'IN-3005',
    category: 'Infantil',
    price: 'R$ 119,90',
    stock: 41,
    icon: 'shirt-outline',
    tint: '#3F6B4A',
  },
  {
    id: 'p6',
    name: 'Bolsa Tiracolo Couro',
    sku: 'AC-4012',
    category: 'Acessórios',
    price: 'R$ 229,90',
    stock: 18,
    icon: 'bag-handle-outline',
    tint: '#5A4632',
  },
  {
    id: 'p7',
    name: 'Tênis Casual Lona',
    sku: 'MS-1310',
    category: 'Masculino',
    price: 'R$ 199,90',
    stock: 55,
    icon: 'footsteps-outline',
    tint: '#3B3F46',
  },
  {
    id: 'p8',
    name: 'Saia Plissada',
    sku: 'FM-2155',
    category: 'Feminino',
    price: 'R$ 139,90',
    stock: 27,
    icon: 'shirt-outline',
    tint: '#56406E',
  },
  {
    id: 'p9',
    name: 'Óculos de Sol Acetato',
    sku: 'AC-4101',
    category: 'Acessórios',
    price: 'R$ 149,90',
    stock: 63,
    icon: 'glasses-outline',
    tint: '#2F5E63',
  },
  {
    id: 'p10',
    name: 'Camisa Social Oxford',
    sku: 'MS-1202',
    category: 'Masculino',
    price: 'R$ 169,90',
    stock: 49,
    icon: 'shirt-outline',
    tint: '#44536B',
  },
  {
    id: 'p11',
    name: 'Relógio Minimal',
    sku: 'AC-4220',
    category: 'Acessórios',
    price: 'R$ 289,90',
    stock: 12,
    icon: 'watch-outline',
    tint: '#4A4A4F',
  },
  {
    id: 'p12',
    name: 'Body Bebê Algodão',
    sku: 'IN-3102',
    category: 'Infantil',
    price: 'R$ 39,90',
    stock: 140,
    icon: 'shirt-outline',
    tint: '#6B5E3A',
  },
];
