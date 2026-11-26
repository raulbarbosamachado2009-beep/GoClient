/**
 * Aviso de chegada pelo WhatsApp ("Lucas, avisa o próximo cliente que estamos indo"). Regras
 * puras, testadas aqui: entender o pedido, chamar o cliente do jeito que se fala ("o Adão do
 * Selma"), arredondar o tempo de chegada e escrever uma mensagem com cara de gente, que muda
 * a cada envio. Nada aqui envia mensagem: o app só abre a conversa com o texto pronto e a
 * pessoa toca em enviar.
 */
import { normalizeSpeech } from './assistant';

/** O que a pessoa pediu: avisar o próximo da rota, ou um cliente pelo nome. */
export type NotifyRequest =
  | { target: 'next'; minutes?: number }
  | { target: 'named'; name: string; district?: string; minutes?: number };

const NUMBERS: Record<string, number> = {
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  quatorze: 14,
  catorze: 14,
  quinze: 15,
  dezesseis: 16,
  dezessete: 17,
  dezoito: 18,
  dezenove: 19,
  vinte: 20,
  trinta: 30,
  quarenta: 40,
  meia: 30,
};

/** "10 minutos", "dez minutos", "vinte e cinco minutos", "meia hora", "1 hora". */
export function minutesIn(text: string): number | undefined {
  const t = normalizeSpeech(text);
  if (/\bmeia hora\b/.test(t)) return 30;
  if (/\b(uma|1) hora e meia\b/.test(t)) return 90;
  const hour = /\b(uma|1) hora\b/.exec(t);
  const m = /\b(\d{1,3}|[a-z]+(?: e [a-z]+)?) (?:min|mins|minuto|minutos)\b/.exec(t);
  if (m?.[1]) {
    const raw = m[1];
    if (/^\d+$/.test(raw)) return Number(raw);
    const parts = raw.split(' e ').map((p) => NUMBERS[p]);
    if (parts.every((p) => p !== undefined)) return parts.reduce<number>((a, b) => a + (b ?? 0), 0);
    // "uns cinco minutos": a última palavra é o número.
    const last = NUMBERS[raw.split(' ').pop() ?? ''];
    if (last !== undefined) return last;
  }
  if (hour) return 60;
  return undefined;
}

const VERB =
  '(?:avisa|avise|avisar|manda (?:um )?(?:aviso|mensagem|zap|whats(?:app)?) (?:pro|pra|para|ao|a)|fala (?:pro|pra|para|com)|diz (?:pro|pra|para)|informa)';
const NEXT = '(?:o |a )?(?:proximo|proxima) (?:cliente|parada|visita)';

/**
 * Entende "avisa o próximo cliente que estamos indo" e "avisa o Adão do Jardim Selma que
 * chego em 10 minutos". Devolve `null` quando não é um pedido de aviso.
 */
export function parseNotifyRequest(text: string): NotifyRequest | null {
  const t = normalizeSpeech(text).replace(/^(?:lucas|ei lucas|oi lucas) /, '');
  const verb = new RegExp(`^(?:(?:por favor|pode|consegue) )?${VERB} (.+)$`).exec(t);
  if (!verb?.[1]) return null;
  const rest = verb[1];
  const minutes = minutesIn(rest);
  if (new RegExp(`^${NEXT}\\b`).test(rest)) return { target: 'next', minutes };
  // "o Adão do Jardim Selma que…" → nome e (opcional) bairro, antes do "que"/"pra"/"falando".
  const who =
    /^(?:o |a |ao |pro |pra )?(.+?)(?: (?:que|q|pra dizer|para dizer|falando|dizendo|avisando)\b.*)?$/.exec(
      rest,
    )?.[1];
  if (!who) return null;
  // Precisa soar como um aviso de chegada (senão é outro pedido de mensagem).
  if (
    !/\b(indo|chegando|chego|chegamos|a caminho|caminho|saindo|saimos|vou|vamos|estamos|to|tou|estou)\b/.test(
      rest,
    )
  )
    return null;
  const [name, district] = who.split(/ (?:do|da|de|no|na|lá do|la do) /, 2);
  if (!name?.trim()) return null;
  return {
    target: 'named',
    name: name.trim(),
    district: district?.trim() || undefined,
    minutes,
  };
}

/** Primeiro nome, como se fala: "Adão Ferreira" → "Adão"; "Barbearia do Zé" fica inteiro. */
export function spokenName(full: string): string {
  const name = full.trim().replace(/\s+/g, ' ');
  if (/^(barbearia|salao|salão|studio|estudio|estúdio|espaco|espaço|loja|boutique)\b/i.test(name))
    return name;
  return name.split(' ')[0] ?? name;
}

/**
 * Bairro como se fala: "Jardim Selma" → "do Selma"; "Vila Nova" → "da Vila Nova";
 * "Centro · Campinas, SP" → "do Centro". Vazio quando não há bairro.
 */
export function spokenDistrict(district: string | undefined): string {
  const d = (district ?? '').split(/[·,]/)[0]?.trim() ?? '';
  if (!d) return '';
  const jardim = /^(?:jardim|jd\.?|parque|pq\.?|residencial|conjunto|bairro)\s+(.+)$/i.exec(d);
  if (jardim?.[1]) return `do ${jardim[1]}`;
  if (/^(vila|vl\.?|cidade|chacara|chácara)\b/i.test(d)) return `da ${d}`;
  return `do ${d}`;
}

/** "o Adão do Selma" (com artigo, para a pergunta falada). */
export function spokenClient(name: string, district?: string): string {
  const who = spokenName(name);
  const where = spokenDistrict(district);
  const article = /^(barbearia|boutique|loja)\b/i.test(who) ? 'a' : 'o';
  return `${article} ${who}${where ? ` ${where}` : ''}`;
}

/** Tempo de chegada como se diz: no mínimo 2 min; acima de 15, de 5 em 5. */
export function roundArrivalMinutes(seconds: number): number {
  const m = Math.max(2, Math.ceil(seconds / 60));
  return m > 15 ? Math.round(m / 5) * 5 : m;
}

export function minutesText(m: number): string {
  if (m >= 60 && m % 60 === 0) return m === 60 ? '1 hora' : `${m / 60} horas`;
  if (m > 60) return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
  return m === 1 ? '1 minuto' : `${m} minutos`;
}

/** Sorteio repetível: a mesma semente dá o mesmo texto (usado nos testes). */
function pick<T>(list: readonly T[], seed: number, salt: number): T {
  const x = Math.abs(Math.sin(seed * 9301 + salt * 49297) * 233280);
  return list[Math.floor(x) % list.length] as T;
}

function hello(hour: number): string {
  return hour < 12 ? 'bom dia' : hour < 18 ? 'boa tarde' : 'boa noite';
}

/**
 * Mensagem de "estamos chegando", escrita como uma pessoa escreveria: cumprimento do horário,
 * o nome, o tempo e um fecho, cada parte sorteada entre várias. Assim o cliente não recebe
 * sempre o mesmo texto.
 */
export function composeArrivalMessage(opts: {
  name: string;
  /** Sem tempo (rota ainda não calculada): a mensagem só diz que estamos a caminho. */
  minutes?: number;
  now?: Date;
  seed?: number;
}): string {
  const now = opts.now ?? new Date();
  const seed = opts.seed ?? now.getTime();
  const who = spokenName(opts.name);
  const time = opts.minutes ? minutesText(opts.minutes) : null;
  const h = hello(now.getHours());
  const H = h.charAt(0).toUpperCase() + h.slice(1);
  const opening = pick(
    [
      `Oi, ${who}! ${H}!`,
      `${H}, ${who}!`,
      `Olá, ${who}, ${h}!`,
      `Opa, ${who}! Tudo bem?`,
      `E aí, ${who}, tudo certo?`,
      `${who}, ${h}! Tudo bem por aí?`,
    ],
    seed,
    1,
  );
  const body = pick(
    time
      ? [
          `Passando pra avisar que já estamos a caminho, chegamos aí em uns ${time}.`,
          `Estamos indo até você, devemos chegar em mais ou menos ${time}.`,
          `Só pra avisar: saímos daqui e em uns ${time} estamos aí.`,
          `Já estamos na estrada, chegando aí em cerca de ${time}.`,
          `Estamos a caminho! Pela rota, chegamos em uns ${time}.`,
          `Daqui a uns ${time} estamos chegando aí.`,
        ]
      : [
          'Passando pra avisar que já estamos a caminho!',
          'Estamos indo até você, já já chegamos.',
          'Só pra avisar: já saímos e estamos a caminho.',
          'Estamos na estrada, indo até aí.',
        ],
    seed,
    2,
  );
  const closing = pick(
    [
      'Até já!',
      'Até daqui a pouco!',
      'Te vejo já já!',
      'Qualquer coisa me avisa.',
      'Se precisar de algo, é só falar.',
      'Até mais!',
    ],
    seed,
    3,
  );
  return `${opening} ${body} ${closing}`;
}

/** Pergunta falada antes de abrir a conversa: "Posso falar para o Adão do Selma que…". */
export function arrivalQuestion(opts: {
  name: string;
  district?: string;
  minutes?: number;
  seed?: number;
}): string {
  const who = spokenClient(opts.name, opts.district);
  if (!opts.minutes) return `Posso avisar ${who} que estamos a caminho?`;
  const time = minutesText(opts.minutes);
  return pick(
    [
      `Posso falar para ${who} que chegamos em ${time}?`,
      `Posso avisar ${who} que chegamos em ${time}?`,
      `Posso falar para ${who} que estamos chegando em ${time}?`,
    ],
    opts.seed ?? Date.now(),
    4,
  );
}
