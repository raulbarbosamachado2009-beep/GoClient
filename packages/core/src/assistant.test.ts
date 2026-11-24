import { describe, expect, it } from 'vitest';
import {
  answerClock,
  commitSegment,
  joinTranscript,
  longDate,
  matchWakePhrase,
  nowContext,
  pickAssistantVoice,
  sharedWordPrefix,
  spokenTime,
  stripWakePhrase,
} from './assistant';

// Terça-feira, 24/11/2026, 9:22 (hora local).
const NOW = new Date(2026, 10, 24, 9, 22);

describe('Lucas: palavras de ativação', () => {
  it.each([
    'Olá, Lucas',
    'olá lucas',
    'Oi Lucas!',
    'Ei, Lucas',
    'Bom dia',
    'Bom dia, Lucas',
    'Oh IA',
    'Ó IA',
    'oi IA',
    'Oia',
    'Olá, inteligência artificial',
    'é, olá Lucas',
    'Boa tarde, Lucas',
    'boa noite Lucas',
    'Salve, Lucas',
    'Opa, Lucas',
    'E aí, Lucas',
    'Oi, boa tarde, Lucas',
    'Olá, tudo bem, Lucas?',
    'Lucas, boa noite',
    'Fala aí, Lucas',
  ])('reconhece "%s"', (t) => {
    expect(matchWakePhrase(t)).not.toBeNull();
  });

  it.each([
    'Lucas',
    'o cliente Lucas comprou',
    'boa tarde',
    'que horas são',
    'olá Havena',
    'o Lucas comprou ontem',
  ])('ignora "%s"', (t) => {
    expect(matchWakePhrase(t)).toBeNull();
  });

  it('separa o pedido da chamada', () => {
    expect(matchWakePhrase('Olá, Lucas, que horas são?')?.rest).toBe('que horas sao');
    expect(stripWakePhrase('Bom dia, Lucas, me leva até o Marcos')).toBe('me leva ate o marcos');
    expect(stripWakePhrase('pula a música')).toBe('pula a música');
  });

  it('responde no tom do cumprimento', () => {
    expect(matchWakePhrase('bom dia')).toEqual({ rest: '', greeting: 'Bom dia!' });
    expect(matchWakePhrase('Boa tarde, Lucas')).toEqual({ rest: '', greeting: 'Boa tarde!' });
    expect(matchWakePhrase('oi, boa noite, Lucas')?.greeting).toBe('Boa noite!');
    expect(matchWakePhrase('Salve Lucas, que horas são')).toEqual({
      rest: 'que horas sao',
      greeting: 'Oi!',
    });
  });
});

describe('Lucas: transcrição', () => {
  it('junta os trechos finais com o parcial atual', () => {
    expect(joinTranscript(['bom'], 'dia')).toBe('bom dia');
    expect(joinTranscript(['coloca o Marcos', 'na rota'], '')).toBe('coloca o Marcos na rota');
    expect(joinTranscript([], '  ')).toBe('');
  });

  it('não repete quando o aparelho manda a frase inteira', () => {
    expect(joinTranscript(['bom'], 'bom dia')).toBe('bom dia');
    expect(commitSegment(['bom'], 'bom dia')).toEqual(['bom dia']);
    expect(commitSegment(['bom'], 'dia')).toEqual(['bom', 'dia']);
    expect(commitSegment(['bom'], '  ')).toEqual(['bom']);
  });

  it('conta as palavras que não mudaram', () => {
    expect(sharedWordPrefix('bom', 'bom dia')).toBe(1);
    expect(sharedWordPrefix('bom dia', 'Bom dia,')).toBe(2);
    expect(sharedWordPrefix('bom dia', 'boa noite')).toBe(0);
  });
});

describe('Lucas: hora e data', () => {
  it('fala a hora', () => {
    expect(spokenTime(NOW)).toBe('São 9 horas e 22 minutos.');
    expect(spokenTime(new Date(2026, 0, 1, 13, 1))).toBe('São 13 horas e 1 minuto.');
    expect(spokenTime(new Date(2026, 0, 1, 12, 0))).toBe('É meio-dia.');
    expect(spokenTime(new Date(2026, 0, 1, 0, 5))).toBe('É meia-noite e 5 minutos.');
    expect(spokenTime(new Date(2026, 0, 1, 18, 0))).toBe('São 18 horas em ponto.');
  });

  it('escreve a data por extenso', () => {
    expect(longDate(NOW)).toBe('terça-feira, 24 de novembro de 2026');
    expect(longDate(new Date(2026, 4, 1))).toBe('sexta-feira, 1º de maio de 2026');
    expect(nowContext(NOW)).toContain('09:22');
  });

  it.each([
    ['Que horas são?', 'São 9 horas e 22 minutos.'],
    ['Lucas, que horas são agora', 'São 9 horas e 22 minutos.'],
    ['me diz a hora', 'São 9 horas e 22 minutos.'],
    ['Que dia é hoje?', 'Hoje é terça-feira, 24 de novembro de 2026.'],
    ['qual a data de hoje', 'Hoje é terça-feira, 24 de novembro de 2026.'],
    ['Que dia da semana é hoje?', 'Hoje é terça-feira.'],
    ['em que mês estamos', 'Estamos em novembro de 2026.'],
    ['que ano é', 'Estamos em 2026.'],
  ])('"%s"', (q, a) => {
    expect(answerClock(q, NOW)).toBe(a);
  });

  it('deixa para a IA o que não é a hora de agora', () => {
    expect(answerClock('que horas abre a barbearia do Marcos', NOW)).toBeNull();
    expect(answerClock('que dia eu visitei o Marcos', NOW)).toBeNull();
    expect(answerClock('toca uma música', NOW)).toBeNull();
  });
});

describe('Lucas: voz masculina', () => {
  const v = (identifier: string, name = identifier, language = 'pt-BR') => ({
    identifier,
    name,
    language,
  });

  it('prefere a voz masculina instalada no aparelho (Google)', () => {
    const r = pickAssistantVoice([
      v('pt-br-x-afs-local'),
      v('pt-br-x-ptd-network'),
      v('pt-br-x-ptd-local'),
      v('en-us-x-iom-local', 'en', 'en-US'),
    ]);
    expect(r).toEqual({ voice: v('pt-br-x-ptd-local'), male: true });
  });

  it('reconhece vozes da Samsung e da Apple', () => {
    expect(pickAssistantVoice([v('pt-BR-SMTf00'), v('pt-BR-SMTm00')]).voice?.identifier).toBe(
      'pt-BR-SMTm00',
    );
    expect(
      pickAssistantVoice([
        v('com.apple.voice.compact.pt-BR.Luciana', 'Luciana'),
        v('com.apple.eloquence.pt-BR.Reed', 'Reed'),
      ]).voice?.name,
    ).toBe('Reed');
  });

  it('avisa quando só há voz feminina', () => {
    expect(pickAssistantVoice([v('pt-br-x-afs-local')]).male).toBe(false);
    expect(pickAssistantVoice([]).voice).toBeUndefined();
  });
});
