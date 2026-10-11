// A short description of what a deck is made of, for the screens that let a player pick a deck or a rival: the Heart type
// it plays, what that type is weak to, and how many cards of each kind it has.

import { cardById } from '../cards/catalog';
import type { SisterId, Affinity } from '../cards/model';

export interface DeckProfile {
  readonly characters: number;
  readonly supporters: number;
  readonly primes: number;
  /** The Heart type most of the Characters have (null for a deck without Characters). */
  readonly affinity: Affinity | null;
  /** The type that hurts the main Heart type of the deck most (the weakness of its Characters). */
  readonly weakTo: Affinity | null;
  /** The sister who has the most cards in the deck. */
  readonly lead: SisterId | null;
}

function most<T extends string>(counts: ReadonlyMap<T, number>): T | null {
  let best: T | null = null;
  let bestCount = 0;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  return best;
}

function add<T extends string>(counts: Map<T, number>, key: T): void {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

export function profileOf(cardIds: readonly string[]): DeckProfile {
  const affinities = new Map<Affinity, number>();
  const weaknesses = new Map<Affinity, number>();
  const leads = new Map<SisterId, number>();
  let characters = 0;
  let supporters = 0;
  let primes = 0;
  for (const cardId of cardIds) {
    const card = cardById(cardId);
    if (card === undefined) {
      continue;
    }
    if (card.kind === 'supporter') {
      supporters += 1;
      continue;
    }
    characters += 1;
    primes += card.prime ? 1 : 0;
    add(affinities, card.affinity);
    add(leads, card.character);
    if (card.weakness !== null) {
      add(weaknesses, card.weakness);
    }
  }
  return { characters, supporters, primes, affinity: most(affinities), weakTo: most(weaknesses), lead: most(leads) };
}
