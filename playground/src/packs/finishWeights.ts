import type { Rarity } from '../cards/model';
import { FINISH_TIER, type FinishId, type FinishTier } from '../cards/finish';

export { FINISH_TIER, type FinishTier };

// Pack-opening rules for the finish of a printed copy. Rarity belongs to the card design and finish to
// the individual copy, so the two are independent: any rarity can roll any finish. What this table adds is
// a lean: the higher the rarity, the more likely the finish is a premium one.

/**
 * Relative weight of each finish tier per rarity (they need not sum to 100). SAR and UR cards lean hard
 * toward premium finishes, and also carry the embossed foil layer, see holo/premium.ts.
 * PLACEHOLDER NUMBERS: tune them together with the pack economy and publish the final odds.
 */
export const TIER_WEIGHTS: Readonly<Record<Rarity, Readonly<Record<FinishTier, number>>>> = {
  C: { plain: 94, foil: 6, premium: 0 },
  U: { plain: 88, foil: 12, premium: 0 },
  R: { plain: 78, foil: 20, premium: 2 },
  RR: { plain: 60, foil: 34, premium: 6 },
  AR: { plain: 40, foil: 45, premium: 15 },
  SAR: { plain: 15, foil: 35, premium: 50 },
  UR: { plain: 5, foil: 25, premium: 70 },
};

const TIERS: readonly FinishTier[] = ['plain', 'foil', 'premium'];

function finishesIn(tier: FinishTier): readonly FinishId[] {
  return (Object.keys(FINISH_TIER) as FinishId[]).filter((id) => FINISH_TIER[id] === tier);
}

/**
 * Rolls the finish of one printed copy. `random` must return a float in [0, 1) and is injected so pulls can
 * be seeded, replayed and tested. A tier is picked by weight, then a finish inside it uniformly.
 */
export function pickFinish(rarity: Rarity, random: () => number): FinishId {
  const weights = TIER_WEIGHTS[rarity];
  const total = TIERS.reduce((sum, tier) => sum + weights[tier], 0);
  let roll = random() * total;
  let chosen: FinishTier = 'plain';
  for (const tier of TIERS) {
    chosen = tier;
    roll -= weights[tier];
    if (roll < 0) {
      break;
    }
  }
  const pool = finishesIn(chosen);
  const finish = pool[Math.floor(random() * pool.length)];
  if (finish === undefined) {
    throw new Error(`No finishes defined for tier ${chosen}.`);
  }
  return finish;
}
