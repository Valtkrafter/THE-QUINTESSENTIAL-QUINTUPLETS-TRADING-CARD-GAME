// The odds of a pack as numbers a player can read: the chance that a pack holds a card of a rarity, how many packs the
// guarantees take, how likely a banner card is after so many packs. Everything is computed from the pack data the
// opening itself uses, so what the Odds page says cannot drift away from what happens. Pure code.

import { RARITY_IDS, type Rarity } from '../cards/model';
import { tierChances, type FinishTier } from './finishWeights';
import { bannerHitChance } from './rollPack';
import type { BannerDefinition, PackDefinition, RarityTable } from './schema';

/** The rarities from the weakest to the best, so "or better" is the rest of the list. */
const ORDER: readonly Rarity[] = RARITY_IDS;

type Chances = Readonly<Partial<Record<Rarity, number>>>;

/** One slot's table as chances that add up to 1. */
function normalized(table: RarityTable): Chances {
  const total = ORDER.reduce((sum, rarity) => sum + (table[rarity] ?? 0), 0);
  return Object.fromEntries(ORDER.flatMap((rarity) => (table[rarity] === undefined ? [] : [[rarity, (table[rarity] ?? 0) / total] as const])));
}

/**
 * The five slots of a pack as chances. In a banner pack the "plus" slot is only a normal card when the banner did not
 * hit, so it counts with the banner's base chance taken off.
 */
function slotChances(pack: PackDefinition): readonly { readonly chances: Chances; readonly weight: number }[] {
  const bannerShare = pack.banner?.hit.base ?? 0;
  return pack.slots.map((slot) => ({ chances: normalized(slot.table), weight: slot.role === 'plus' ? 1 - bannerShare : 1 }));
}

export interface RarityOdds {
  /** Chance (0..1) that one pack holds at least one card of exactly this rarity. */
  readonly chance: number;
  /** How many cards of this rarity a pack holds on average. */
  readonly average: number;
}

/** Per rarity: how likely a pack holds one, and how many it holds on average. The guarantees are not counted. */
export function rarityOdds(pack: PackDefinition): Readonly<Record<Rarity, RarityOdds>> {
  const slots = slotChances(pack);
  return Object.fromEntries(
    ORDER.map((rarity) => {
      let none = 1;
      let average = 0;
      for (const { chances, weight } of slots) {
        const p = (chances[rarity] ?? 0) * weight;
        none *= 1 - p;
        average += p;
      }
      return [rarity, { chance: 1 - none, average }] as const;
    }),
  ) as Record<Rarity, RarityOdds>;
}

/** The chance that a pack holds at least one card of this rarity or a better one. The guarantees are not counted. */
export function orBetter(pack: PackDefinition, rarity: Rarity): number {
  const from = ORDER.indexOf(rarity);
  let none = 1;
  for (const { chances, weight } of slotChances(pack)) {
    const p = ORDER.slice(from).reduce((sum, better) => sum + (chances[better] ?? 0), 0) * weight;
    none *= 1 - p;
  }
  return 1 - none;
}

/** "1 in N" for a chance: 0.04 gives 25. */
export function oneIn(chance: number): number {
  return chance <= 0 ? Number.POSITIVE_INFINITY : 1 / chance;
}

export interface GuaranteeOdds {
  /** The pack that is sure to hold one (the counter reaches this number). */
  readonly sureAt: number;
  /** Packs it takes on average, with the guarantee. */
  readonly average: number;
  /** Packs after which 9 in 10 players have one. */
  readonly nineInTen: number;
}

/** What a guarantee does to a chance per pack: the average packs until the first hit and when 9 in 10 players have one. */
export function withGuarantee(chancePerPack: number, sureAt: number): GuaranteeOdds {
  const q = 1 - chancePerPack;
  const average = chancePerPack <= 0 ? sureAt : (1 - q ** sureAt) / chancePerPack;
  let nineInTen = sureAt;
  for (let packs = 1; packs <= sureAt; packs += 1) {
    if (1 - q ** packs >= 0.9) {
      nineInTen = packs;
      break;
    }
  }
  return { sureAt, average, nineInTen };
}

export interface PackGuarantees {
  readonly sar: GuaranteeOdds;
  readonly ur: GuaranteeOdds;
}

/** The two guarantees of a pack with their average and 9-in-10 packs. */
export function guaranteesOf(pack: PackDefinition): PackGuarantees {
  return {
    sar: withGuarantee(orBetter(pack, 'SAR'), pack.pity.sar.after),
    ur: withGuarantee(orBetter(pack, 'UR'), pack.pity.ur.after),
  };
}

/** The chance of each finish for a card of this rarity coming out of this pack. */
export function finishOdds(pack: PackDefinition, rarity: Rarity): Readonly<Record<FinishTier, number>> {
  return tierChances(rarity, pack.finishLean);
}

// --- The banner ----------------------------------------------------------------------------------------------------

export interface BannerOdds {
  /** Chance per pack of a banner card at the start (before the guarantee starts to help). */
  readonly base: number;
  /** Packs until the first banner card, on average. */
  readonly averagePacks: number;
  /** Packs until the first featured card, on average (a banner card is only sometimes a featured one). */
  readonly averageFeatured: number;
  /** `any[n]` is the share of players (0..1) who hold at least one banner card after n packs; `featured[n]` the same for a featured card. */
  readonly any: readonly number[];
  readonly featured: readonly number[];
}

const LIMIT = 600;

/** Walks the banner rules pack by pack for a player who has nothing yet. Exact, no dice. */
export function bannerOdds(banner: BannerDefinition): BannerOdds {
  const hit = (packsWithout: number): number => bannerHitChance(banner.hit, packsWithout);
  const size = banner.hit.hard + 1;
  // Players with no featured card yet, by whether their next banner card is sure to be one (0 no, 1 yes) and by packs since their last banner card.
  let open: [number[], number[]] = [new Array<number>(size).fill(0), new Array<number>(size).fill(0)];
  open[0][0] = 1;
  let noneYet = 1;
  let averagePacks = 0;
  let averageFeatured = 0;
  const any: number[] = [];
  const featured: number[] = [];
  for (let packs = 0; packs <= LIMIT; packs += 1) {
    const stillOpen = open[0].reduce((sum, value) => sum + value, 0) + open[1].reduce((sum, value) => sum + value, 0);
    any.push(1 - noneYet);
    featured.push(1 - stillOpen);
    averagePacks += noneYet;
    averageFeatured += stillOpen;
    if (stillOpen < 1e-10) {
      break;
    }
    noneYet *= 1 - hit(packs);
    const next: [number[], number[]] = [new Array<number>(size).fill(0), new Array<number>(size).fill(0)];
    for (const sure of [0, 1] as const) {
      for (let k = 0; k < size; k += 1) {
        const mass = open[sure][k] ?? 0;
        if (mass === 0) {
          continue;
        }
        const p = hit(k);
        const slot = Math.min(k + 1, size - 1);
        // No banner card in this pack: one more pack without.
        next[sure][slot] = (next[sure][slot] ?? 0) + mass * (1 - p);
        // A banner card that is not a featured one: the next one is sure to be. A featured one ends the wait of that player.
        if (sure === 0) {
          next[1][0] = (next[1][0] ?? 0) + mass * p * (1 - banner.mainShare);
        }
      }
    }
    open = next;
  }
  return { base: banner.hit.base, averagePacks, averageFeatured, any, featured };
}

/** The share of players (0..1) who hold a banner card (or a featured one) after this many packs. */
export function shareAfter(odds: BannerOdds, packs: number, kind: 'any' | 'featured'): number {
  const list = odds[kind];
  return list[Math.min(packs, list.length - 1)] ?? 1;
}

/** The first number of packs after which at least `share` of the players have a banner card, or a featured one. */
export function packsForShare(odds: BannerOdds, kind: 'any' | 'featured', share: number): number {
  const index = odds[kind].findIndex((value) => value >= share);
  return index < 0 ? odds[kind].length - 1 : index;
}
