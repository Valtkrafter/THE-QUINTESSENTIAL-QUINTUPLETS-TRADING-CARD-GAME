import { describe, expect, it } from 'vitest';
import { MAX_DECKS } from './decks';
import { deckById, deckProblems, deleteDeck, nextDeckId, saveDeck } from './deckList';
import { addOwnedCard, newSaveGame } from './save';

const NOW = 1_760_000_000_000;
const start = newSaveGame('decks', NOW);

describe('the list of decks', () => {
  it('gives each new deck an id nobody has', () => {
    expect(nextDeckId([])).toBe('deck-1');
    expect(nextDeckId([{ id: 'deck-1', name: 'A', cards: [] }])).toBe('deck-2');
    expect(nextDeckId([{ id: 'deck-2', name: 'A', cards: [] }])).toBe('deck-1');
  });

  it('adds a deck, replaces it by id and removes it, without touching the old save', () => {
    const added = saveDeck(start, { id: 'deck-1', name: '  Ichika  ', cards: ['TQQ01-001'] }, NOW + 1);
    expect(added.decks).toEqual([{ id: 'deck-1', name: 'Ichika', cards: ['TQQ01-001'] }]);
    expect(added.updatedAt).toBe(NOW + 1);
    expect(start.decks).toEqual([]);
    const changed = saveDeck(added, { id: 'deck-1', name: 'Ichika II', cards: ['TQQ01-001', 'TQQ01-002'] }, NOW + 2);
    expect(changed.decks).toHaveLength(1);
    expect(deckById(changed, 'deck-1')?.cards).toHaveLength(2);
    expect(deleteDeck(changed, 'deck-1', NOW + 3).decks).toEqual([]);
  });

  it('refuses a deck without a name, with too many cards, or one more than the list can hold', () => {
    expect(() => saveDeck(start, { id: 'deck-1', name: '   ', cards: [] }, NOW)).toThrow(/cannot be saved/);
    expect(() => saveDeck(start, { id: 'deck-1', name: 'Big', cards: Array.from({ length: 31 }, () => 'TQQ01-001') }, NOW)).toThrow(/cannot be saved/);
    let full = start;
    for (let number = 1; number <= MAX_DECKS; number += 1) {
      full = saveDeck(full, { id: `deck-${number}`, name: `Deck ${number}`, cards: [] }, NOW);
    }
    expect(() => saveDeck(full, { id: 'deck-9', name: 'Too many', cards: [] }, NOW)).toThrow(/at most 8/);
    expect(saveDeck(full, { id: 'deck-3', name: 'Renamed', cards: [] }, NOW).decks).toHaveLength(MAX_DECKS);
  });

  it('says what keeps a deck out of battle: the rules of a deck and cards the player does not own', () => {
    let save = start;
    for (const cardId of ['TQQ01-001', 'TQQ01-001', 'TQQ01-002']) {
      save = addOwnedCard(save, cardId, 'standard', 'pack', NOW).save;
    }
    const deck = { id: 'deck-1', name: 'Short', cards: ['TQQ01-001', 'TQQ01-001', 'TQQ01-002', 'TQQ01-003'] };
    const problems = deckProblems(save, deck);
    expect(problems).toContainEqual({ code: 'size', have: 4, want: 30 });
    expect(problems).toContainEqual({ code: 'not-owned', cardId: 'TQQ01-003', have: 0, need: 1 });
    expect(problems.some((problem) => problem.code === 'not-owned' && problem.cardId === 'TQQ01-001')).toBe(false);
  });
});
