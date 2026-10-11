import { describe, expect, it } from 'vitest';
import { CATALOG } from '../cards/catalog';
import { DECK_SIZE, MAX_COPIES, MAX_PRIME, checkDeck, copyLimit, isBasicPlayable, isLegalDeck, ownedCounts } from './decks';

/** The first `count` designs that can be played straight from the hand, two copies each. */
function basics(count: number): string[] {
  return CATALOG.filter(isBasicPlayable)
    .filter((card) => card.kind === 'character' && !card.prime)
    .slice(0, Math.ceil(count / 2))
    .flatMap((card) => [card.id, card.id])
    .slice(0, count);
}

describe('deck rules', () => {
  it('accept 30 cards with at most 2 copies of a design', () => {
    const deck = basics(DECK_SIZE);
    expect(deck).toHaveLength(DECK_SIZE);
    expect(checkDeck(deck)).toEqual([]);
    expect(isLegalDeck(deck)).toBe(true);
  });

  it('refuse a deck of the wrong size', () => {
    expect(checkDeck(basics(29))).toContainEqual({ code: 'size', have: 29, want: DECK_SIZE });
    expect(checkDeck([...basics(30), 'TQQ01-001'])).toContainEqual({ code: 'size', have: 31, want: DECK_SIZE });
  });

  it('refuse a third copy of a design, and a second copy of a limited Halloween card', () => {
    const deck = basics(27);
    const first = deck[0] ?? '';
    const triple = [...deck.slice(0, 27), first, first, first].slice(0, DECK_SIZE);
    expect(checkDeck(triple).some((problem) => problem.code === 'copies' && problem.max === MAX_COPIES)).toBe(true);
    const halloween = CATALOG.find((card) => card.kind === 'character' && card.limited !== undefined);
    expect(halloween && copyLimit(halloween)).toBe(1);
    const twice = [...basics(28), halloween?.id ?? '', halloween?.id ?? ''];
    expect(checkDeck(twice).some((problem) => problem.code === 'copies' && problem.max === 1)).toBe(true);
  });

  it('refuse cards the game does not know and decks without a card to start with', () => {
    expect(checkDeck([...basics(29), 'TQQ01-999'])).toContainEqual({ code: 'unknown-card', cardId: 'TQQ01-999' });
    const supporters = CATALOG.filter((card) => card.kind === 'supporter')
      .slice(0, 15)
      .flatMap((card) => [card.id, card.id]);
    expect(checkDeck(supporters)).toContainEqual({ code: 'basics', have: 0, min: 1 });
  });

  it('limit the number of Prime cards', () => {
    const primes = CATALOG.filter((card) => card.kind === 'character' && card.prime && card.stage !== 'event').slice(0, MAX_PRIME + 2);
    const deck = [...primes.flatMap((card) => [card.id]), ...basics(DECK_SIZE - primes.length)];
    const problems = checkDeck(deck);
    expect(problems.some((problem) => problem.code === 'prime' && problem.have === MAX_PRIME + 2)).toBe(true);
  });

  it('only allow what the player owns when a collection is given', () => {
    const deck = basics(DECK_SIZE);
    const collection = deck.slice(0, 20).map((cardId) => ({ cardId }));
    const owned = ownedCounts(collection);
    const problems = checkDeck(deck, owned);
    expect(problems.some((problem) => problem.code === 'not-owned')).toBe(true);
    expect(checkDeck(deck, ownedCounts(deck.map((cardId) => ({ cardId }))))).toEqual([]);
  });

  it('knows which cards can be played straight from the hand', () => {
    const kinds = new Set(CATALOG.filter(isBasicPlayable).map((card) => (card.kind === 'character' ? card.stage : 'supporter')));
    expect(kinds).toEqual(new Set(['basic', 'event']));
  });
});
