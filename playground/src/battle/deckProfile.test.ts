import { describe, expect, it } from 'vitest';
import { OPPONENTS, STARTER_DECKS } from './roster';
import { profileOf } from './deckProfile';

describe('the profile of a deck', () => {
  it('counts Characters, Supporters and Prime cards and names the main type and what it is weak to', () => {
    const nino = STARTER_DECKS.find((deck) => deck.id === 'starter-nino');
    expect(nino).toBeDefined();
    const profile = profileOf(nino?.cards ?? []);
    expect(profile.characters + profile.supporters).toBe(30);
    expect(profile).toMatchObject({ affinity: 'butterfly', weakTo: 'melody', lead: 'nino' });
    expect(profile.primes).toBe(1);
  });

  it('describes every ready-made deck with a type', () => {
    for (const deck of [...STARTER_DECKS.map((starter) => starter.cards), ...OPPONENTS.map((opponent) => opponent.deck.cards)]) {
      const profile = profileOf(deck);
      expect(profile.affinity).not.toBeNull();
      expect(profile.weakTo).not.toBeNull();
    }
  });

  it('copes with an empty deck and with cards that do not exist', () => {
    expect(profileOf([])).toEqual({ characters: 0, supporters: 0, primes: 0, affinity: null, weakTo: null, lead: null });
    expect(profileOf(['TQQ01-999']).characters).toBe(0);
  });
});
