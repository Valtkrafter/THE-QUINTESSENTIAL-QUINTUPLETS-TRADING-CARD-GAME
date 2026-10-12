import { describe, expect, it } from 'vitest';
import { cardById } from '../cards/catalog';
import { applyGift, giftCardId, yenGiftFor } from './gifts';
import { newSaveGame } from './save';

const NOW = 1_800_000_000_000;

describe('gifts of the introduction', () => {
  it('gives money', () => {
    const save = newSaveGame('gift', NOW);
    const richer = applyGift(save, { kind: 'yen', amount: 300 }, NOW + 1);
    expect(richer.player.yen).toBe(save.player.yen + 300);
    expect(save.player.yen).toBe(newSaveGame('gift', NOW).player.yen);
  });

  it('gives a plain copy of a Common, and nothing else changes', () => {
    const save = newSaveGame('gift', NOW);
    const id = giftCardId();
    expect(cardById(id)?.rarity).toBe('C');
    const next = applyGift(save, { kind: 'card', cardId: id }, NOW + 1);
    expect(next.collection).toHaveLength(save.collection.length + 1);
    const copy = next.collection[next.collection.length - 1];
    expect(copy?.cardId).toBe(id);
    expect(copy?.finish).toBe('standard');
    expect(copy?.grade).toBeNull();
    expect(copy?.obtained.source).toBe('reward');
    expect(next.player.yen).toBe(save.player.yen);
  });

  it('asks for exactly the money that is missing', () => {
    const save = newSaveGame('gift', NOW);
    expect(yenGiftFor(save, save.player.yen)).toEqual([]);
    expect(yenGiftFor(save, save.player.yen - 1)).toEqual([]);
    expect(yenGiftFor(save, save.player.yen + 40)).toEqual([{ kind: 'yen', amount: 40 }]);
  });
});
