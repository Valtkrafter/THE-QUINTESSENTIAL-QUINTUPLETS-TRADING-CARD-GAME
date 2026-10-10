import { describe, expect, it } from 'vitest';
import { SET_SIZE } from '../cards/catalog';
import { newSaveGame } from '../domain/save';
import { grantRandomCards, grantWholeSet } from './devGrants';

const NOW = 1_760_000_000_000;

describe('development grants', () => {
  it('adds the requested number of cards, the same ones for the same seed', () => {
    const a = grantRandomCards(newSaveGame('dev', NOW), 12, NOW);
    const b = grantRandomCards(newSaveGame('dev', NOW), 12, NOW);
    expect(a.collection).toHaveLength(12);
    expect(a).toEqual(b);
  });

  it('adds every card of the set exactly once', () => {
    const save = grantWholeSet(newSaveGame('dev', NOW), NOW);
    expect(save.collection).toHaveLength(SET_SIZE);
    expect(new Set(save.collection.map((copy) => copy.cardId)).size).toBe(SET_SIZE);
  });
});
