import { describe, expect, it } from 'vitest';
import { buildWhatsAppLink, normalizeBrazilianPhone } from './whatsapp';

describe('WhatsApp', () => {
  it('normaliza celular com DDD', () => {
    expect(normalizeBrazilianPhone('(11) 98765-4321')).toBe('5511987654321');
  });

  it('mantém número já com DDI', () => {
    expect(normalizeBrazilianPhone('+55 11 98765-4321')).toBe('5511987654321');
  });

  it('rejeita números inválidos', () => {
    expect(normalizeBrazilianPhone('12345')).toBeNull();
    expect(buildWhatsAppLink('')).toBeNull();
  });

  it('gera link com mensagem codificada', () => {
    expect(buildWhatsAppLink('11987654321', 'Olá, tudo bem?')).toBe(
      'https://wa.me/5511987654321?text=Ol%C3%A1%2C%20tudo%20bem%3F',
    );
  });
});
