// Plays the pack rules many times to see what they really do: the average pack, how often the guarantees fire, and how
// many packs a player needs to collect things. Used by the tests and by the simulator in the development settings, so
// the published odds and the real behaviour can be compared with numbers instead of feelings.

import { CATALOG } from '../cards/catalog';
import { FINISH_TIER } from './finishWeights';
import { RARITY_IDS, type Rarity } from '../cards/model';
import type { DayKey } from '../domain/calendar';
import { createRng } from '../domain/random';
import { eventCards, isLimited, packById } from './catalog';
import { FRESH_STATE, rollPack, type PackState } from './rollPack';
import type { PackDefinition } from './schema';

function requirePack(packId: string): PackDefinition {
  const pack = packById(packId);
  if (pack === undefined) {
    throw new Error(`There is no pack called ${packId}.`);
  }
  return pack;
}

export interface PackStatistics {
  readonly packs: number;
  /** Average number of cards of each rarity in one pack. */
  readonly perPack: Readonly<Record<Rarity, number>>;
  /** Share of packs (0..1) that contain at least one such card. */
  readonly chance: {
    readonly rrOrBetter: number;
    readonly sarOrUr: number;
    readonly ur: number;
    /** A card with a finish other than "standard". */
    readonly specialFinish: number;
    /** A card with a premium finish (Cosmos, Gold Foil, Prism Crystal, Radiant). */
    readonly premiumFinish: number;
  };
  /** How often each guarantee fired (share of packs). */
  readonly guarantee: { readonly sar: number; readonly ur: number };
}

/** Opens `count` packs one after another with the guarantees running, the way a player who owns nothing would. */
export function simulatePacks(packId: string, count: number, seed: string, today: DayKey): PackStatistics {
  const pack = requirePack(packId);
  const rng = createRng(seed);
  const totals = Object.fromEntries(RARITY_IDS.map((rarity) => [rarity, 0])) as Record<Rarity, number>;
  let rrOrBetter = 0;
  let sarOrUr = 0;
  let ur = 0;
  let special = 0;
  let premium = 0;
  let sarFired = 0;
  let urFired = 0;
  let state: PackState = FRESH_STATE;
  const owned = new Set<string>();
  for (let i = 0; i < count; i += 1) {
    const { picks, next } = rollPack(rng, { pack, today, state, owned });
    state = next;
    let hasRr = false;
    let hasTop = false;
    let hasUr = false;
    let hasSpecial = false;
    let hasPremium = false;
    for (const pick of picks) {
      totals[pick.card.rarity] += 1;
      hasRr ||= pick.card.rarity === 'RR' || pick.card.rarity === 'AR' || pick.card.rarity === 'SAR' || pick.card.rarity === 'UR';
      hasTop ||= pick.card.rarity === 'SAR' || pick.card.rarity === 'UR';
      hasUr ||= pick.card.rarity === 'UR';
      hasSpecial ||= pick.finish !== 'standard';
      hasPremium ||= FINISH_TIER[pick.finish] === 'premium';
      sarFired += pick.reason === 'pity-sar' ? 1 : 0;
      urFired += pick.reason === 'pity-ur' ? 1 : 0;
      owned.add(pick.card.id);
    }
    rrOrBetter += hasRr ? 1 : 0;
    sarOrUr += hasTop ? 1 : 0;
    ur += hasUr ? 1 : 0;
    special += hasSpecial ? 1 : 0;
    premium += hasPremium ? 1 : 0;
  }
  return {
    packs: count,
    perPack: Object.fromEntries(RARITY_IDS.map((rarity) => [rarity, totals[rarity] / count])) as Record<Rarity, number>,
    chance: { rrOrBetter: rrOrBetter / count, sarOrUr: sarOrUr / count, ur: ur / count, specialFinish: special / count, premiumFinish: premium / count },
    guarantee: { sar: sarFired / count, ur: urFired / count },
  };
}

export interface CollectingMilestone {
  /** Packs needed, at the median and for 9 of 10 players. */
  readonly median: number;
  readonly p90: number;
}

export interface CollectingReport {
  readonly runs: number;
  readonly firstSar: CollectingMilestone;
  readonly firstUr: CollectingMilestone;
  /** All Common, Uncommon, Rare and Double Rare designs. */
  readonly core: CollectingMilestone;
  readonly allAr: CollectingMilestone;
  readonly allSar: CollectingMilestone;
  readonly allUr: CollectingMilestone;
  /** Every normal design of the set. */
  readonly all: CollectingMilestone;
}

function milestone(values: readonly number[]): CollectingMilestone {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (share: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * share))] ?? 0;
  return { median: at(0.5), p90: at(0.9) };
}

/** The rarities a pack can hold in any slot (a pack without Commons cannot be used to collect the Commons). */
function rarityKinds(pack: PackDefinition): ReadonlySet<Rarity> {
  return new Set(pack.slots.flatMap((slot) => RARITY_IDS.filter((rarity) => slot.table[rarity] !== undefined)));
}

/**
 * Lets simulated players open packs of one kind until they own every normal design the pack can give (all of them for the
 * Booster, only the Rare and better for the dearer packs), and reports when they reached each goal.
 */
export function simulateCollecting(packId: string, runs: number, seed: string, today: DayKey, packLimit = 5000): CollectingReport {
  const pack = requirePack(packId);
  const kinds = rarityKinds(pack);
  const normal = CATALOG.filter((card) => !isLimited(card) && kinds.has(card.rarity));
  const idsOf = (predicate: (rarity: Rarity) => boolean) => normal.filter((card) => predicate(card.rarity)).map((card) => card.id);
  const goals = {
    core: idsOf((rarity) => rarity === 'C' || rarity === 'U' || rarity === 'R' || rarity === 'RR'),
    allAr: idsOf((rarity) => rarity === 'AR'),
    allSar: idsOf((rarity) => rarity === 'SAR'),
    allUr: idsOf((rarity) => rarity === 'UR'),
    all: normal.map((card) => card.id),
  };
  const rng = createRng(seed);
  const results: Record<keyof typeof goals | 'firstSar' | 'firstUr', number[]> = {
    firstSar: [],
    firstUr: [],
    core: [],
    allAr: [],
    allSar: [],
    allUr: [],
    all: [],
  };
  for (let run = 0; run < runs; run += 1) {
    const owned = new Set<string>();
    let state: PackState = FRESH_STATE;
    const reached: Partial<Record<keyof typeof results, number>> = {};
    for (let opened = 1; opened <= packLimit && reached.all === undefined; opened += 1) {
      const { picks, next } = rollPack(rng, { pack, today, state, owned });
      state = next;
      for (const pick of picks) {
        owned.add(pick.card.id);
        if (pick.card.rarity === 'SAR') {
          reached.firstSar ??= opened;
        }
        if (pick.card.rarity === 'UR') {
          reached.firstUr ??= opened;
        }
      }
      for (const [name, ids] of Object.entries(goals) as [keyof typeof goals, string[]][]) {
        if (reached[name] === undefined && ids.every((id) => owned.has(id))) {
          reached[name] = opened;
        }
      }
    }
    for (const name of Object.keys(results) as (keyof typeof results)[]) {
      results[name].push(reached[name] ?? packLimit);
    }
  }
  return {
    runs,
    firstSar: milestone(results.firstSar),
    firstUr: milestone(results.firstUr),
    core: milestone(results.core),
    allAr: milestone(results.allAr),
    allSar: milestone(results.allSar),
    allUr: milestone(results.allUr),
    all: milestone(results.all),
  };
}

export interface BannerReport {
  readonly runs: number;
  readonly packsPerRun: number;
  /** Average number of banner cards a player has after `packsPerRun` packs. */
  readonly averageHits: number;
  readonly averageMains: number;
  /** Share of players (0..1) with at least one / one main / two banner cards. */
  readonly atLeastOne: number;
  readonly atLeastOneMain: number;
  readonly atLeastTwo: number;
  /** Average packs between two banner cards, from a long run. */
  readonly packsPerHit: number;
}

/** What a player gets from the banner after a given number of packs. */
export function simulateBanner(packId: string, runs: number, packsPerRun: number, seed: string, today: DayKey): BannerReport {
  const pack = requirePack(packId);
  const banner = pack.banner;
  if (banner === undefined) {
    throw new Error(`${pack.name} has no banner.`);
  }
  const eventIds = new Set(eventCards(banner.eventId).map((card) => card.id));
  const rng = createRng(seed);
  const play = (packs: number): { hits: number; mains: number } => {
    let state: PackState = FRESH_STATE;
    // Which cards the player owns only changes which banner card comes out, never how often one does.
    const owned = new Set<string>();
    let hits = 0;
    let mains = 0;
    for (let i = 0; i < packs; i += 1) {
      const { picks, next } = rollPack(rng, { pack, today, state, owned });
      state = next;
      for (const pick of picks) {
        if (eventIds.has(pick.card.id)) {
          hits += 1;
          mains += pick.reason === 'banner-main' ? 1 : 0;
        }
      }
    }
    return { hits, mains };
  };
  let hitSum = 0;
  let mainSum = 0;
  let one = 0;
  let oneMain = 0;
  let two = 0;
  for (let run = 0; run < runs; run += 1) {
    const { hits, mains } = play(packsPerRun);
    hitSum += hits;
    mainSum += mains;
    one += hits >= 1 ? 1 : 0;
    oneMain += mains >= 1 ? 1 : 0;
    two += hits >= 2 ? 1 : 0;
  }
  const longPacks = 20_000;
  const long = play(longPacks);
  return {
    runs,
    packsPerRun,
    averageHits: hitSum / runs,
    averageMains: mainSum / runs,
    atLeastOne: one / runs,
    atLeastOneMain: oneMain / runs,
    atLeastTwo: two / runs,
    packsPerHit: long.hits === 0 ? Number.POSITIVE_INFINITY : longPacks / long.hits,
  };
}
