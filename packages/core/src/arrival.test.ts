import { describe, expect, it } from 'vitest';
import {
  arrivalQuestion,
  composeArrivalMessage,
  minutesIn,
  parseNotifyRequest,
  roundArrivalMinutes,
  spokenClient,
  spokenDistrict,
  spokenName,
} from './arrival';
import { buildWhatsAppWebSend } from './whatsapp';

describe('pedido de aviso de chegada', () => {
  it('entende "avisa o próximo cliente que estamos indo"', () => {
    expect(parseNotifyRequest('Lucas avisa o próximo cliente que estamos indo')).toEqual({
      target: 'next',
      minutes: undefined,
    });
    expect(parseNotifyRequest('manda mensagem pro próximo cliente que tô chegando')).toEqual({
      target: 'next',
      minutes: undefined,
    });
    expect(parseNotifyRequest('avisa a próxima parada que chegamos em 5 minutos')).toEqual({
      target: 'next',
      minutes: 5,
    });
  });

  it('entende o pedido com nome, bairro e tempo', () => {
    expect(parseNotifyRequest('avisa o Adão do Jardim Selma que chego em 10 minutos')).toEqual({
      target: 'named',
      name: 'adao',
      district: 'jardim selma',
      minutes: 10,
    });
    expect(parseNotifyRequest('avisa a Marina que estamos a caminho')).toEqual({
      target: 'named',
      name: 'marina',
      district: undefined,
      minutes: undefined,
    });
  });

  it('não confunde com outros pedidos', () => {
    expect(parseNotifyRequest('abre o mapa')).toBeNull();
    expect(parseNotifyRequest('avisa o Adão que o pedido atrasou')).toBeNull();
    expect(parseNotifyRequest('que horas são')).toBeNull();
  });

  it('lê minutos falados por extenso', () => {
    expect(minutesIn('chego em dez minutos')).toBe(10);
    expect(minutesIn('uns vinte e cinco minutos')).toBe(25);
    expect(minutesIn('em meia hora')).toBe(30);
    expect(minutesIn('estamos indo')).toBeUndefined();
  });
});

describe('como o Lucas fala do cliente', () => {
  it('usa o primeiro nome e o bairro curto', () => {
    expect(spokenName('Adão Ferreira')).toBe('Adão');
    expect(spokenName('Barbearia do Zé')).toBe('Barbearia do Zé');
    expect(spokenDistrict('Jardim Selma')).toBe('do Selma');
    expect(spokenDistrict('Vila Nova · Campinas, SP')).toBe('da Vila Nova');
    expect(spokenDistrict('Centro · Campinas, SP')).toBe('do Centro');
    expect(spokenDistrict('')).toBe('');
    expect(spokenClient('Adão Ferreira', 'Jardim Selma')).toBe('o Adão do Selma');
  });

  it('arredonda o tempo de chegada', () => {
    expect(roundArrivalMinutes(330)).toBe(6);
    expect(roundArrivalMinutes(30)).toBe(2);
    expect(roundArrivalMinutes(22 * 60)).toBe(20);
  });

  it('pergunta antes de mandar', () => {
    const q = arrivalQuestion({ name: 'Adão', district: 'Jardim Selma', minutes: 6, seed: 1 });
    expect(q).toMatch(/o Adão do Selma que (chegamos|estamos chegando) em 6 minutos\?$/);
  });
});

describe('mensagem de chegada', () => {
  const morning = new Date(2026, 10, 26, 9, 30);

  it('tem nome, tempo e cumprimento do horário', () => {
    const m = composeArrivalMessage({ name: 'Adão Ferreira', minutes: 6, now: morning, seed: 3 });
    expect(m).toContain('Adão');
    expect(m).not.toContain('Ferreira');
    expect(m).toContain('6 minutos');
  });

  it('varia o texto de um envio para outro', () => {
    const all = new Set(
      Array.from({ length: 30 }, (_, i) =>
        composeArrivalMessage({ name: 'Adão', minutes: 6, now: morning, seed: i + 1 }),
      ),
    );
    expect(all.size).toBeGreaterThan(10);
  });

  it('abre a conversa no WhatsApp Web com o texto pronto', () => {
    expect(buildWhatsAppWebSend('(19) 99812-4410', 'Oi, tudo bem?')).toBe(
      'https://web.whatsapp.com/send?phone=5519998124410&text=Oi%2C%20tudo%20bem%3F',
    );
    expect(buildWhatsAppWebSend('123')).toBeNull();
  });
});

describe('sem tempo de chegada', () => {
  it('avisa só que estamos a caminho', () => {
    const m = composeArrivalMessage({ name: 'Adão', now: new Date(2026, 10, 26, 15), seed: 2 });
    expect(m).toContain('Adão');
    expect(m).not.toMatch(/minuto/);
    expect(arrivalQuestion({ name: 'Adão', district: 'Jardim Selma' })).toBe(
      'Posso avisar o Adão do Selma que estamos a caminho?',
    );
  });
});
