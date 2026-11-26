import { describe, expect, it } from 'vitest';
import { fixedCommand } from './offline';
import type { HavenaDeps } from './tools';

function deps() {
  const went: string[] = [];
  let day = 0;
  const d = {
    proto: {},
    stops: { showDay: () => day++ },
    router: { replace: (href: string) => went.push(href) },
  } as unknown as HavenaDeps;
  return { d, went, day: () => day };
}

describe('comandos fixos do Lucas', () => {
  it('abre as telas que existem', () => {
    const { d, went } = deps();
    expect(fixedCommand('abre o mapa', d)).toBe('Abrindo.');
    expect(fixedCommand('Lucas, abre o Kyte', d)).toBe('Abrindo.');
    expect(fixedCommand('vai para ajustes', d)).toBe('Abrindo.');
    expect(went).toEqual(['/mapa', '/kyte', '/configuracoes']);
  });

  it('mostra a rota do dia', () => {
    const t = deps();
    expect(fixedCommand('mostra a rota do dia', t.d)).toBe('Mostrando a rota do dia.');
    expect(t.day()).toBe(1);
  });

  it('não tem mais comandos de música nem do Spotify', () => {
    const { d, went } = deps();
    for (const text of ['passa a música', 'próxima música', 'pausa', 'continua', 'abre o spotify'])
      expect(fixedCommand(text, d)).toBeNull();
    expect(went).toEqual([]);
  });
});
