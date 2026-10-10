// Test cards for development. The pack shop does not exist yet, so this is how a developer fills the binder; the
// Settings screen offers it only in a development build.

import { CATALOG } from '../cards/catalog';
import { addOwnedCard, withRng, type SaveGame } from '../domain/save';
import { pickFinish } from '../packs/finishWeights';

/** Adds `count` random cards (any rarity, finish rolled by the normal odds). */
export function grantRandomCards(save: SaveGame, count: number, now: number): SaveGame {
  const { save: advanced, value: picks } = withRng(save, (rng) =>
    Array.from({ length: count }, () => {
      const card = rng.pick(CATALOG);
      return { cardId: card.id, finish: pickFinish(card.rarity, () => rng.next()) };
    }),
  );
  return picks.reduce((current, pick) => addOwnedCard(current, pick.cardId, pick.finish, 'reward', now).save, advanced);
}

/** Adds one copy of every card of the set. */
export function grantWholeSet(save: SaveGame, now: number): SaveGame {
  const { save: advanced, value: finishes } = withRng(save, (rng) => CATALOG.map((card) => pickFinish(card.rarity, () => rng.next())));
  return CATALOG.reduce((current, card, index) => addOwnedCard(current, card.id, finishes[index] ?? 'standard', 'reward', now).save, advanced);
}
