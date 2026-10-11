import { describe, expect, it } from 'vitest';
import { floatersFor, placeKey } from './floaters';

describe('the floating texts of a step', () => {
  it('puts the damage on the Character that was hit, with its notes', () => {
    const floaters = floatersFor([{ type: 'attack', player: 0, cardId: 'TQQ01-013', move: 'Sharp Tongue', damage: 40, doubled: true, resisted: false, reduced: false, blocked: false }]);
    expect(floaters).toEqual([
      { player: 1, ref: { zone: 'active' }, text: '−40', tone: 'damage' },
      { player: 1, ref: { zone: 'active' }, text: 'Weakness!', tone: 'info' },
    ]);
  });

  it('says "Blocked" instead of a number when a shield took everything, and shows nothing for a move without damage', () => {
    const blocked = floatersFor([{ type: 'attack', player: 1, cardId: 'TQQ01-013', move: 'x', damage: 0, doubled: true, resisted: false, reduced: false, blocked: true }]);
    expect(blocked).toEqual([{ player: 0, ref: { zone: 'active' }, text: 'Blocked!', tone: 'info' }]);
    expect(floatersFor([{ type: 'attack', player: 0, cardId: 'TQQ01-042', move: 'Cheer Squad', damage: 0, doubled: false, resisted: false, reduced: false, blocked: false }])).toEqual([]);
  });

  it('shows healing and Hearts where they land', () => {
    expect(floatersFor([{ type: 'heal', player: 0, target: { zone: 'bench', index: 1 }, amount: 20 }, { type: 'heart', player: 1, target: { zone: 'active' }, count: 2 }])).toEqual([
      { player: 0, ref: { zone: 'bench', index: 1 }, text: '+20', tone: 'heal' },
      { player: 1, ref: { zone: 'active' }, text: '+2 ♥', tone: 'heart' },
    ]);
  });

  it('ignores events that need no floating text, and names each place on the table', () => {
    expect(floatersFor([{ type: 'draw', player: 0, count: 1, cardIds: ['TQQ01-001'] }, { type: 'shuffle', player: 1 }])).toEqual([]);
    expect(placeKey(0, { zone: 'active' })).toBe('0:active');
    expect(placeKey(1, { zone: 'bench', index: 2 })).toBe('1:bench2');
  });
});
