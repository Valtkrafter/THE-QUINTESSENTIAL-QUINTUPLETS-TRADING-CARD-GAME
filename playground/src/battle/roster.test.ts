import { describe, expect, it } from 'vitest';
import { AI_LEVELS } from './ai';
import { OPPONENTS, STARTER_DECKS, parseRoster } from './roster';
import { playMatch } from './simulate';

describe('the ready-made decks', () => {
  it('are all legal, with ids that are used once', () => {
    // parseRoster throws on the first look; this makes the same promise explicit.
    expect(STARTER_DECKS.length).toBeGreaterThanOrEqual(5);
    expect(OPPONENTS.length).toBeGreaterThanOrEqual(5);
    const ids = [...STARTER_DECKS.map((deck) => deck.id), ...OPPONENTS.map((opponent) => opponent.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('give every level at least one rival', () => {
    for (const level of AI_LEVELS) {
      expect(OPPONENTS.some((opponent) => opponent.level === level)).toBe(true);
    }
  });

  it('refuse a deck that breaks the rules, and say which one', () => {
    const raw = {
      starters: [{ id: 'bad', name: 'Bad', blurb: 'x', cards: ['TQQ01-001'] }],
      opponents: [{ id: 'rival', name: 'Rival', character: 'raiha', level: 'easy', blurb: 'x', deck: { name: 'x', cards: ['TQQ01-999'] } }],
    };
    expect(() => parseRoster(raw)).toThrow(/bad has 1 cards, not 30/);
    expect(() => parseRoster(raw)).toThrow(/rival uses the unknown card TQQ01-999/);
  });

  it('can be played against each other without a problem', () => {
    for (const [index, opponent] of OPPONENTS.entries()) {
      const starter = STARTER_DECKS[index % STARTER_DECKS.length];
      if (starter === undefined) {
        continue;
      }
      const result = playMatch({ decks: [starter.cards, opponent.deck.cards], levels: ['normal', opponent.level], seed: `roster-${opponent.id}` });
      expect(result.state.phase).toBe('over');
    }
  });
});
