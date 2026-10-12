import { describe, expect, it } from 'vitest';
import { floatersFor, placeKey } from './floaters';

describe('the floating texts of a step', () => {
  it('puts the damage on the Character that was hit, with its notes, and the used-up Hearts on the one that attacked', () => {
    const floaters = floatersFor([{ type: 'attack', player: 0, cardId: 'TQQ01-013', move: 'Sharp Tongue', spent: 1, damage: 40, doubled: true, resisted: false, reduced: false, blocked: false }]);
    expect(floaters).toEqual([
      { player: 1, ref: { zone: 'active' }, text: '−40', tone: 'damage' },
      { player: 1, ref: { zone: 'active' }, text: 'Weakness!', tone: 'info' },
      { player: 0, ref: { zone: 'active' }, text: '−1 ♥', tone: 'heart' },
    ]);
  });

  it('says "Blocked" instead of a number when a shield took everything, and shows only the Hearts for a move without damage', () => {
    const blocked = floatersFor([{ type: 'attack', player: 1, cardId: 'TQQ01-013', move: 'x', spent: 2, damage: 0, doubled: true, resisted: false, reduced: false, blocked: true }]);
    expect(blocked).toEqual([
      { player: 0, ref: { zone: 'active' }, text: 'Blocked!', tone: 'info' },
      { player: 1, ref: { zone: 'active' }, text: '−2 ♥', tone: 'heart' },
    ]);
    expect(floatersFor([{ type: 'attack', player: 0, cardId: 'TQQ01-042', move: 'Cheer Squad', spent: 1, damage: 0, doubled: false, resisted: false, reduced: false, blocked: false }])).toEqual([
      { player: 0, ref: { zone: 'active' }, text: '−1 ♥', tone: 'heart' },
    ]);
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
