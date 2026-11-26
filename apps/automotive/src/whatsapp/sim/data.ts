/**
 * Dados FICTÍCIOS do WhatsApp simulado (Preview), só para desenhar as telas. Nomes, números e
 * conversas são inventados; nada aqui vem de uma conta de verdade.
 */
export interface SimContact {
  id: string;
  name: string;
  phone: string;
  /** Recado do perfil. */
  about?: string;
  /** Grupo: os participantes (nomes curtos). */
  members?: string[];
  favorite?: boolean;
}

export interface SimMessage {
  id: string;
  out: boolean;
  text: string;
  time: string;
  /** Dia (aparece como separador quando muda). */
  day: string;
  /** Quem mandou, nos grupos. */
  from?: string;
  /** Anexo de exemplo (foto de produto ou documento). */
  kind?: 'photo' | 'doc';
}

export interface SimChat {
  id: string;
  contact: string;
  unread: number;
  messages: SimMessage[];
}

export interface SimCall {
  id: string;
  contact: string;
  kind: 'missed' | 'out' | 'in';
  video?: boolean;
  when: string;
  /** Detalhe: cada ligação daquele dia. */
  day: string;
  entries: { label: string; duration: string }[];
}

export const ME = { name: 'Equipe GoClient', phone: '+55 19 99000-0000' };

export const CONTACTS: SimContact[] = [
  {
    id: 'adao',
    name: 'Adão Ferreira',
    phone: '+55 19 99812-3301',
    about: 'Barbearia do Adão · Jardim Selma',
    favorite: true,
  },
  {
    id: 'marina',
    name: 'Marina Albuquerque',
    phone: '+55 19 99812-4410',
    about: 'Boutique Albuquerque',
  },
  {
    id: 'equipe',
    name: 'Equipe de vendas',
    phone: '',
    members: ['Carla', 'Diego', 'Rafa', 'Você'],
  },
  {
    id: 'fotos',
    name: 'Fotos dos produtos',
    phone: '',
    members: ['Carla', 'Juliana', 'Diego', 'Você'],
  },
  {
    id: 'ze',
    name: 'Barbearia do Zé',
    phone: '+55 19 99734-1188',
    about: 'Corte e barba · Centro',
  },
  {
    id: 'juliana',
    name: 'Juliana Rocha',
    phone: '+55 19 98821-5530',
    about: 'Rocha Concept Store',
  },
  { id: 'carlos', name: 'Carlos Mendes', phone: '+55 19 99145-7702', favorite: true },
  { id: 'rafa', name: 'Rafael Souza', phone: '+55 19 99610-2234' },
  { id: 'paulo', name: 'Paulo Henrique', phone: '+55 19 98477-9015', about: 'Studio PH Barber' },
  { id: 'bianca', name: 'Bianca Lopes', phone: '+55 19 99302-6648' },
];

export const CHATS: SimChat[] = [
  {
    id: 'adao',
    contact: 'adao',
    unread: 0,
    messages: [
      {
        id: 'a1',
        out: false,
        day: 'terça-feira',
        time: '16:02',
        text: 'Boa tarde! Chegou a pomada modeladora?',
      },
      {
        id: 'a2',
        out: true,
        day: 'terça-feira',
        time: '16:10',
        text: 'Chegou sim! Levo na próxima visita 👍',
      },
      {
        id: 'a3',
        out: false,
        day: 'terça-feira',
        time: '16:11',
        text: 'Fechado. Separa 6 unidades pra mim',
      },
      {
        id: 'a4',
        out: true,
        day: 'Ontem',
        time: '09:12',
        text: 'Bom dia, Adão! Estamos indo até você, devemos chegar em mais ou menos 6 minutos. Até já!',
      },
      { id: 'a5', out: false, day: 'Ontem', time: '09:13', text: 'Beleza, tô aqui' },
    ],
  },
  {
    id: 'fotos',
    contact: 'fotos',
    unread: 5,
    messages: [
      {
        id: 'f1',
        out: false,
        from: 'Carla',
        day: 'Ontem',
        time: '17:40',
        text: 'Fotos novas do kit barba',
        kind: 'photo',
      },
      { id: 'f2', out: false, from: 'Juliana', day: 'Ontem', time: '17:52', text: 'Ficou ótimo!' },
    ],
  },
  {
    id: 'equipe',
    contact: 'equipe',
    unread: 0,
    messages: [
      {
        id: 'e1',
        out: false,
        from: 'Diego',
        day: 'Ontem',
        time: '08:05',
        text: 'Rota de hoje: Centro e Cambuí',
      },
      { id: 'e2', out: true, day: 'Ontem', time: '08:07', text: 'Fechado, saio às 9' },
      {
        id: 'e3',
        out: false,
        from: 'Rafa',
        day: 'Ontem',
        time: '12:30',
        text: 'Manda a tabela de preços nova',
      },
      { id: 'e4', out: true, day: 'Ontem', time: '12:41', text: 'Tabela de preços', kind: 'doc' },
    ],
  },
  {
    id: 'marina',
    contact: 'marina',
    unread: 2,
    messages: [
      {
        id: 'm1',
        out: true,
        day: 'Ontem',
        time: '10:20',
        text: 'Oi, Marina! O pedido da semana já está separado.',
      },
      { id: 'm2', out: false, day: 'Ontem', time: '18:03', text: 'Perfeito! Pode trazer amanhã?' },
      { id: 'm3', out: false, day: 'Ontem', time: '18:04', text: 'De manhã é melhor' },
    ],
  },
  {
    id: 'ze',
    contact: 'ze',
    unread: 0,
    messages: [
      {
        id: 'z1',
        out: false,
        day: 'segunda-feira',
        time: '11:15',
        text: 'Tem óleo pra barba de 30 ml?',
      },
      { id: 'z2', out: true, day: 'segunda-feira', time: '11:20', text: 'Tem sim, R$ 25,00 cada' },
    ],
  },
  {
    id: 'juliana',
    contact: 'juliana',
    unread: 0,
    messages: [
      {
        id: 'j1',
        out: true,
        day: 'domingo',
        time: '15:40',
        text: 'Obrigado pela compra, Juliana!',
      },
      { id: 'j2', out: false, day: 'domingo', time: '15:42', text: 'Imagina! Até a próxima 😊' },
    ],
  },
  {
    id: 'carlos',
    contact: 'carlos',
    unread: 0,
    messages: [
      { id: 'c1', out: false, day: 'sábado', time: '09:30', text: 'Passa aqui semana que vem?' },
      { id: 'c2', out: true, day: 'sábado', time: '09:41', text: 'Passo sim, na quarta' },
    ],
  },
];

export const CALLS: SimCall[] = [
  {
    id: 'k1',
    contact: 'marina',
    kind: 'missed',
    when: 'Ontem',
    day: 'Ontem',
    entries: [{ label: 'Ligação de voz perdida às 18:10', duration: '' }],
  },
  {
    id: 'k2',
    contact: 'adao',
    kind: 'out',
    when: 'Ontem',
    day: 'Ontem',
    entries: [{ label: 'Ligação de voz efetuada às 09:05', duration: '1 minuto' }],
  },
  {
    id: 'k3',
    contact: 'carlos',
    kind: 'in',
    when: 'terça-feira',
    day: 'terça-feira',
    entries: [
      { label: 'Ligação de voz recebida às 14:34', duration: '6 segundos' },
      { label: 'Ligação de voz recebida às 11:40', duration: '2 minutos' },
    ],
  },
  {
    id: 'k4',
    contact: 'ze',
    kind: 'missed',
    video: true,
    when: 'segunda-feira',
    day: 'segunda-feira',
    entries: [{ label: 'Ligação de vídeo perdida às 10:02', duration: '' }],
  },
  {
    id: 'k5',
    contact: 'juliana',
    kind: 'out',
    when: 'domingo',
    day: 'domingo',
    entries: [{ label: 'Ligação de voz efetuada às 15:30', duration: '4 minutos' }],
  },
];

/** Iniciais para o avatar ("Adão Ferreira" → "AF"). */
export function initials(name: string): string {
  const words = name
    .replace(/[^\p{L}\s]/gu, '')
    .trim()
    .split(/\s+/);
  return (
    (words[0]?.[0] ?? '') + (words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '')
  ).toUpperCase();
}

/** Últimas mensagens (uma por conversa, da mais recente), para o cartão do WhatsApp no Mapa. */
export function recentMessages(
  n: number,
): { id: string; name: string; text: string; time: string }[] {
  return CHATS.slice(0, n).flatMap((c) => {
    const who = CONTACTS.find((k) => k.id === c.contact);
    const last = c.messages[c.messages.length - 1];
    if (!who || !last) return [];
    const text = `${last.from ? `${last.from}: ` : last.out ? 'Você: ' : ''}${last.text}`;
    return [{ id: c.id, name: who.name, text, time: last.time }];
  });
}
