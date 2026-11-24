import { describe, expect, it } from 'vitest';
import { applyOrder, dropIndex, moveItem } from './route-order';

describe('Ordem da rota', () => {
  it('move um item para baixo e para cima', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('não altera a lista original e ajusta índices fora do limite', () => {
    const list = ['a', 'b', 'c'];
    expect(moveItem(list, 0, 99)).toEqual(['b', 'c', 'a']);
    expect(moveItem(list, 5, 0)).toEqual(['a', 'b', 'c']);
    expect(list).toEqual(['a', 'b', 'c']);
  });

  it('calcula a posição de soltura pela metade da linha', () => {
    expect(dropIndex(1, 40, 100, 4)).toBe(1);
    expect(dropIndex(1, 60, 100, 4)).toBe(2);
    expect(dropIndex(1, -160, 100, 4)).toBe(0);
    expect(dropIndex(2, 900, 100, 4)).toBe(3);
  });

  it('aplica a ordem manual e põe os novos no fim', () => {
    expect(applyOrder(['a', 'b', 'c'], null)).toEqual(['a', 'b', 'c']);
    expect(applyOrder(['a', 'b', 'c', 'd'], ['c', 'a', 'b'])).toEqual(['c', 'a', 'b', 'd']);
    expect(applyOrder(['a', 'c'], ['c', 'b', 'a'])).toEqual(['c', 'a']);
  });
});
