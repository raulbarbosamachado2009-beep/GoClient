import { describe, expect, it } from 'vitest';
import { modeAt, msToNextHour } from './theme-schedule';

const at = (h: number, m = 0) => new Date(2026, 10, 28, h, m);

describe('tema automático pelo horário', () => {
  it('fica claro das 6h às 16h59', () => {
    for (const h of [6, 9, 12, 16]) expect(modeAt(at(h))).toBe('light');
    expect(modeAt(at(16, 59))).toBe('light');
  });
  it('fica escuro das 17h às 5h59', () => {
    for (const h of [17, 20, 23, 0, 3, 5]) expect(modeAt(at(h))).toBe('dark');
    expect(modeAt(at(5, 59))).toBe('dark');
  });
  it('agenda a troca para a próxima hora cheia', () => {
    expect(msToNextHour(at(16, 30))).toBe(30 * 60 * 1000);
    expect(msToNextHour(at(23, 59))).toBe(60 * 1000);
  });
});
