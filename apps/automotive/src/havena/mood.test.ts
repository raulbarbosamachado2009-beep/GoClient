import { describe, expect, it } from 'vitest';
import { isJoke, laughLine, sorry } from './mood';

describe('humor do Lucas', () => {
  it('reconhece piadas e risadas', () => {
    expect(isJoke('kkkkk')).toBe(true);
    expect(isJoke('hahaha muito bom')).toBe(true);
    expect(isJoke('quer ouvir uma piada?')).toBe(true);
    expect(isJoke('O que é o que é: cai em pé e corre deitado?')).toBe(true);
    expect(isJoke('Sabe o que o pente disse para a escova?')).toBe(true);
    expect(isJoke('por que a galinha atravessou a rua')).toBe(true);
  });

  it('não confunde pedidos comuns com piada', () => {
    expect(isJoke('me leva até a barbearia do Zé')).toBe(false);
    expect(isJoke('avisa o próximo cliente que estamos indo')).toBe(false);
    expect(isJoke('que horas são')).toBe(false);
  });

  it('ri de volta', () => {
    expect(laughLine(0)).toMatch(/k|ha/i);
  });

  it('pede desculpas sem repetir a palavra', () => {
    expect(sorry('Não consegui preparar o aviso agora.')).toBe(
      'Desculpa, não consegui preparar o aviso agora.',
    );
    expect(sorry('Desculpe, deu erro.')).toBe('Desculpa, deu erro.');
    expect(sorry('')).toBe('Desculpa, não consegui fazer isso agora.');
  });
});
