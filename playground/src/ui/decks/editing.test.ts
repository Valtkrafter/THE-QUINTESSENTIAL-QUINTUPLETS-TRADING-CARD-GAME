import { describe, expect, it } from 'vitest';
import { cardById } from '../../cards/catalog';
import { DECK_SIZE, MAX_PRIME } from '../../domain/decks';
import { addCopy, blockerFor, countsOf, deckRows, designRows, removeCopy, sortDeck } from './editing';

function card(id: string) {
  const found = cardById(id);
  if (found === undefined) {
    throw new Error(`no card ${id}`);
  }
  return found;
}

describe('changing a deck', () => {
  it('lists the designs the player owns, in print order, with the copies in the deck', () => {
    const owned = new Map([
      ['TQQ01-013', 2],
      ['TQQ01-001', 1],
    ]);
    const rows = designRows(owned, ['TQQ01-013']);
    expect(rows.map((row) => [row.card.id, row.owned, row.inDeck])).toEqual([
      ['TQQ01-001', 1, 0],
      ['TQQ01-013', 2, 1],
    ]);
  });

  it('keeps the deck in print order when a card is added, and takes out one copy at a time', () => {
    const deck = addCopy(addCopy(['TQQ01-013'], 'TQQ01-001'), 'TQQ01-013');
    expect(deck).toEqual(['TQQ01-001', 'TQQ01-013', 'TQQ01-013']);
    expect(removeCopy(deck, 'TQQ01-013')).toEqual(['TQQ01-001', 'TQQ01-013']);
    expect(removeCopy(deck, 'TQQ01-099')).toEqual(deck);
    expect(deckRows(deck).map((row) => [row.card.id, row.copies])).toEqual([
      ['TQQ01-001', 1],
      ['TQQ01-013', 2],
    ]);
    expect(sortDeck(['TQQ01-020', 'TQQ01-002'])).toEqual(['TQQ01-002', 'TQQ01-020']);
    expect(countsOf(deck).get('TQQ01-013')).toBe(2);
  });

  it('says why a card cannot be added', () => {
    expect(blockerFor(card('TQQ01-001'), [], 1)).toBeNull();
    expect(blockerFor(card('TQQ01-001'), ['TQQ01-001'], 1)).toBe('not-owned');
    expect(blockerFor(card('TQQ01-001'), ['TQQ01-001', 'TQQ01-001'], 5)).toBe('copies');
    expect(blockerFor(card('TQQ01-012'), ['TQQ01-012'], 3)).toBe('copies');
    expect(blockerFor(card('TQQ01-001'), Array.from({ length: DECK_SIZE }, () => 'TQQ01-002'), 5)).toBe('full');
  });

  it('stops at the number of Prime cards a deck may hold', () => {
    const primes = ['TQQ01-007', 'TQQ01-019', 'TQQ01-031', 'TQQ01-043', 'TQQ01-055', 'TQQ01-009'];
    expect(primes).toHaveLength(MAX_PRIME);
    expect(blockerFor(card('TQQ01-010'), primes, 2)).toBe('prime');
    expect(blockerFor(card('TQQ01-010'), primes.slice(1), 2)).toBeNull();
  });
});
