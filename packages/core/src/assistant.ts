/**
 * Lucas (assistente de voz) — regras puras de fala, compartilhadas e testadas aqui:
 * palavras de ativação, juntar o que o reconhecimento de voz ouviu, responder hora/data
 * sem internet e escolher uma voz masculina do aparelho.
 *
 * Nada aqui toca microfone, rede ou banco: os apps chamam estas funções.
 */

export const ASSISTANT_NAME = 'Lucas';

/** Minúsculas, sem acentos, sem pontuação e com espaços simples. */
export function normalizeSpeech(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Formas de chamar o Lucas. O reconhecimento de voz escreve a mesma fala de vários jeitos
 * ("oh IA" vira "ó ia", "oi ia" ou até "oia"), por isso cada frase aceita variações.
 */
const NAME = '(?:lucas|lukas|lucaz|luca)';
const CALL = '(?:ola|oi|ei|ey|hey|e ai|oh|fala)';
/** "ô IA" sai como "o ia" ou "ou ia"; com o nome, "o Lucas" seria comum demais numa conversa. */
const CALL_IA = '(?:ola|oi|ei|ey|hey|e ai|o|oh|ou)';
const IA = '(?:ia|i a|inteligencia artificial)';
const WAKE_PATTERNS: { re: RegExp; greeting: string }[] = [
  // "bom dia" (sozinho ou com o nome): responde no mesmo tom.
  { re: new RegExp(`^bom dia(?: ${NAME})?\\b`), greeting: 'Bom dia!' },
  // "olá Lucas", "oi Lucas", "ei Lucas", "ô Lucas"…
  { re: new RegExp(`^${CALL} ${NAME}\\b`), greeting: 'Oi!' },
  // "oh IA", "ó IA", "oi IA", "olá inteligência artificial"…
  { re: new RegExp(`^${CALL_IA} ${IA}\\b`), greeting: 'Oi!' },
  // "oia" (como o reconhecimento costuma escrever "oi IA" rápido).
  { re: /^oia\b/, greeting: 'Oi!' },
];

/** Palavras soltas que o reconhecimento costuma pôr antes da frase ("é", "ah"). */
const FILLER = /^(?:e|ah|ahn|eh|hum|hm|tipo)\s+/;

export interface WakeMatch {
  /** O que a pessoa disse depois da ativação ("olá Lucas, que horas são" → "que horas são"). */
  rest: string;
  /** Resposta curta quando ela só chamou, sem pedir nada ainda. */
  greeting: string;
}

/** A fala começa com uma das formas de chamar o Lucas? */
export function matchWakePhrase(text: string): WakeMatch | null {
  const t = normalizeSpeech(text).replace(FILLER, '');
  for (const { re, greeting } of WAKE_PATTERNS) {
    const m = re.exec(t);
    if (m) return { rest: t.slice(m[0].length).trim(), greeting };
  }
  return null;
}

/** Tira a chamada do começo da frase, mantendo o resto como a pessoa disse. */
export function stripWakePhrase(text: string): string {
  const m = matchWakePhrase(text);
  if (!m) return text.trim();
  // "bom dia" sozinho é a própria fala; "bom dia, que horas são" vira o pedido.
  return m.rest;
}

/**
 * Junta o que o reconhecimento de voz ouviu numa mesma fala. No modo contínuo do Android
 * cada trecho chega como "final" separado ("bom" e depois "dia"), e o parcial é só o trecho
 * em andamento. A frase é tudo o que já fechou + o parcial atual.
 */
export function joinTranscript(committed: string[], partial: string): string {
  const done = committed
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' ');
  const now = partial.trim();
  // Alguns aparelhos mandam no parcial a frase inteira (com os trechos já fechados): aí o
  // parcial já é a frase toda e não se repete nada.
  if (done && now && normalizeSpeech(now).startsWith(normalizeSpeech(done))) return now;
  return [done, now].filter(Boolean).join(' ').replace(/\s+/g, ' ');
}

/**
 * Guarda um trecho final. Se o trecho já traz a frase inteira até aqui (alguns aparelhos
 * fazem isso), ele substitui os anteriores em vez de repetir.
 */
export function commitSegment(committed: string[], segment: string): string[] {
  const seg = segment.trim();
  if (!seg) return committed;
  const done = joinTranscript(committed, '');
  if (done && normalizeSpeech(seg).startsWith(normalizeSpeech(done))) return [seg];
  return [...committed, seg];
}

/**
 * Palavras de `next` que já estavam em `prev`, na mesma posição. Serve para a legenda: as
 * palavras já mostradas ficam paradas e só as novas entram.
 */
export function sharedWordPrefix(prev: string, next: string): number {
  const a = prev.split(' ').filter(Boolean);
  const b = next.split(' ').filter(Boolean);
  let i = 0;
  const strip = (w: string) => normalizeSpeech(w);
  while (i < a.length && i < b.length && strip(a[i] as string) === strip(b[i] as string)) i++;
  return i;
}

const WEEKDAYS = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
];
const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

/** "São 9 horas e 22 minutos." (hora local do aparelho, dita por extenso). */
export function spokenTime(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const min = m === 0 ? '' : ` e ${m} ${m === 1 ? 'minuto' : 'minutos'}`;
  if (h === 0) return `É meia-noite${min}.`;
  if (h === 12) return `É meio-dia${min}.`;
  if (h === 1) return `É 1 hora${min}.`;
  return `São ${h} horas${m === 0 ? ' em ponto' : min}.`;
}

/** "terça-feira, 24 de novembro de 2026". */
export function longDate(d: Date): string {
  const day = d.getDate() === 1 ? '1º' : String(d.getDate());
  return `${WEEKDAYS[d.getDay()]}, ${day} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}

/** Linha de contexto para o modelo de IA saber a data e a hora de agora. */
export function nowContext(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `Agora é ${longDate(d)}, ${hh}:${mm} (hora local do aparelho).`;
}

/**
 * Perguntas de hora e data respondidas na hora, sem internet. Devolve a fala ou null se a
 * pergunta não for sobre isso.
 */
export function answerClock(text: string, now: Date): string | null {
  const t = normalizeSpeech(text);
  // "Que horas abre a barbearia?" e "que dia eu visitei o Marcos?" são para o modelo de IA.
  if (
    /\b(abre|fecha|chega|chego|chegar|sai|saio|visitei|visita|comeca|termina|acaba|foi|era)\b/.test(
      t,
    )
  )
    return null;
  if (
    /\b(que|quais|qual) (horas?|hr)\b|\bque hora(s)? (sao|e|tem)\b|\bhoras? agora\b|\bme (diz|fala) a hora\b|^horas?$/.test(
      t,
    )
  )
    return spokenTime(now);
  if (/\b(que|qual) dia da semana\b|\bdia da semana (e|eh) hoje\b/.test(t))
    return `Hoje é ${WEEKDAYS[now.getDay()]}.`;
  if (
    /\b(que|qual) (dia|data) (e|eh|sao|é)? ?hoje\b|\b(que|qual) (e|eh) a data\b|\bdata de hoje\b|\bdia de hoje\b|\bhoje e que dia\b|\bque dia (e|eh) hoje\b|\b(que|qual) (o )?dia (e|eh) hoje\b/.test(
      t,
    )
  )
    return `Hoje é ${longDate(now)}.`;
  if (/\b(em )?(que|qual) mes (e|eh|estamos)\b|\bmes (e|eh) hoje\b/.test(t))
    return `Estamos em ${MONTHS[now.getMonth()]} de ${now.getFullYear()}.`;
  if (/\b(em )?(que|qual) ano (e|eh|estamos)\b/.test(t)) return `Estamos em ${now.getFullYear()}.`;
  return null;
}

/** Voz do aparelho, no formato comum do expo-speech (iOS e Android). */
export interface DeviceVoice {
  identifier: string;
  name: string;
  language: string;
  quality?: string;
}

/**
 * Pistas de voz masculina/feminina nos nomes das vozes. O aparelho não informa o gênero, então
 * a escolha usa os nomes conhecidos: Google ("pt-br-x-ptd" é masculina, "afs"/"pte"
 * femininas), Samsung ("SMTm" masculina, "SMTf" feminina) e Apple (Felipe, Reed, Eddy, Rocko e
 * Grandpa masculinas; Luciana e Fernanda femininas).
 */
const MALE =
  /\bmale\b|masc|homem|smtm|-ptd-|_ptd_|ptd|felipe|reed|eddy|rocko|grandpa|daniel|ricardo|antonio|thiago|humberto|donato|fabio|julio|nicolau|valerio/i;
const FEMALE =
  /female|femin|mulher|smtf|-afs-|afs|-pte-|pte|luciana|fernanda|francisca|joana|catarina|shelley|sandy|flo\b|grandma|leila|yara|brenda|giovanna|leticia|manuela|thalita|vitoria/i;

export function voiceGender(v: DeviceVoice): 'male' | 'female' | 'unknown' {
  const s = `${v.identifier} ${v.name}`;
  if (MALE.test(s) && !/female/i.test(s)) return 'male';
  if (FEMALE.test(s)) return 'female';
  return 'unknown';
}

/**
 * Escolhe a voz do Lucas: pt-BR, masculina, instalada no aparelho (as "de rede" demoram para
 * começar) e de melhor qualidade. `male` diz se achou uma voz masculina; se não achou, o app
 * engrossa um pouco a voz padrão.
 */
export function pickAssistantVoice(voices: DeviceVoice[]): { voice?: DeviceVoice; male: boolean } {
  const pt = voices.filter((v) => /^pt[-_]br/i.test(v.language));
  const score = (v: DeviceVoice) => {
    const g = voiceGender(v);
    return (
      (g === 'male' ? 100 : g === 'unknown' ? 10 : 0) +
      (/network/i.test(v.identifier) ? 0 : 4) +
      (/local/i.test(v.identifier) ? 2 : 0) +
      (/enhanced|premium/i.test(v.quality ?? '') || /premium|enhanced/i.test(v.identifier) ? 1 : 0)
    );
  };
  const best = [...pt].sort((a, b) => score(b) - score(a))[0];
  return { voice: best, male: best ? voiceGender(best) === 'male' : false };
}
