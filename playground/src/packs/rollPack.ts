// The dice of one pack: which cards come out, given the pack's data, the guarantee counters and what the player owns.
// Pure code over a seeded Rng. `openPack.ts` turns the result into a new save; the simulator calls this directly.

import { CATALOG, cardById } from '../cards/catalog';
import type { FinishId } from '../cards/finish';
import { RARITY_IDS, type Card, type Rarity } from '../cards/model';
import { isWithin, type DayKey } from '../domain/calendar';
import type { Rng } from '../domain/random';
import { eventCards, isLimited } from './catalog';
import { pickFinish } from './finishWeights';
import type { BannerDefinition, PackDefinition, RarityTable, SlotRole } from './schema';

/** Why a card is in the pack, for the reveal ("guaranteed!") and the statistics. */
export type PullReason = 'normal' | 'pity-sar' | 'pity-ur' | 'banner-main' | 'banner-side';

export interface Pick {
  readonly slot: number;
  readonly role: SlotRole;
  readonly card: Card;
  readonly finish: FinishId;
  readonly reason: PullReason;
}

/** The counters that decide the guarantees. All count packs opened since the last hit. */
export interface PackState {
  /** Packs since the last Special Art Rare or Ultra Rare. */
  readonly sar: number;
  /** Packs since the last Ultra Rare. */
  readonly ur: number;
  /** Packs since the last banner card (banner packs only). */
  readonly banner: number;
  /** True after a lost 50/50: the next banner card is sure to be a main card. */
  readonly mainSure: boolean;
}

export const FRESH_STATE: PackState = { sar: 0, ur: 0, banner: 0, mainSure: false };


const NORMAL_BY_RARITY: ReadonlyMap<Rarity, readonly Card[]> = new Map(
  RARITY_IDS.map((rarity) => [rarity, CATALOG.filter((card) => card.rarity === rarity && !isLimited(card))]),
);

export function normalPool(rarity: Rarity): readonly Card[] {
  return NORMAL_BY_RARITY.get(rarity) ?? [];
}

// --- Banner helpers ---------------------------------------------------------------------------------------------

/** The phase of the banner that runs today, or undefined when the banner is not running. */
export function activePhase(banner: BannerDefinition, today: DayKey): BannerDefinition['phases'][number] | undefined {
  return banner.phases.find((phase) => isWithin(today, phase.from, phase.to));
}

export function isAvailable(pack: PackDefinition, today: DayKey): boolean {
  return pack.banner === undefined || activePhase(pack.banner, today) !== undefined;
}

/**
 * The chance that the next pack carries a banner card, after `packsWithoutHit` packs without one. It stays at the base
 * rate, rises by `softStep` per pack from `softFrom`, and is certain at `hard`.
 */
export function bannerHitChance(hit: BannerDefinition['hit'], packsWithoutHit: number): number {
  const n = packsWithoutHit + 1;
  if (n >= hit.hard) {
    return 1;
  }
  if (n >= hit.softFrom) {
    return Math.min(1, hit.base + (n - hit.softFrom + 1) * hit.softStep);
  }
  return hit.base;
}

// --- The roll -----------------------------------------------------------------------------------------------

function rollRarity(rng: Rng, table: RarityTable): Rarity {
  const entries = RARITY_IDS.flatMap((rarity) => {
    const weight = table[rarity];
    return weight === undefined ? [] : [[rarity, weight] as const];
  });
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = rng.next() * total;
  for (const [rarity, weight] of entries) {
    roll -= weight;
    if (roll < 0) {
      return rarity;
    }
  }
  const last = entries[entries.length - 1];
  if (last === undefined) {
    throw new Error('A slot table is empty.');
  }
  return last[0];
}

/** Picks a card of the list. With `preferMissing`, a card the player does not have is chosen when there is one. */
function pickFrom(rng: Rng, cards: readonly Card[], owned: ReadonlySet<string>, preferMissing: boolean): Card {
  const missing = preferMissing ? cards.filter((card) => !owned.has(card.id)) : [];
  return rng.pick(missing.length > 0 ? missing : cards);
}

export interface RollInput {
  readonly pack: PackDefinition;
  readonly today: DayKey;
  readonly state: PackState;
  /** Ids of the cards the player owns before this pack. */
  readonly owned: ReadonlySet<string>;
}

export interface RollResult {
  readonly picks: readonly Pick[];
  readonly next: PackState;
}

export function rollPack(rng: Rng, { pack, today, state, owned }: RollInput): RollResult {
  const known = new Set(owned);
  const picks: Pick[] = [];
  const finishOf = (rarity: Rarity): FinishId => pickFinish(rarity, () => rng.next(), pack.finishLean);
  const add = (slot: number, role: SlotRole, card: Card, reason: PullReason): void => {
    known.add(card.id);
    picks.push({ slot, role, card, finish: finishOf(card.rarity), reason });
  };

  const banner = pack.banner;
  const phase = banner === undefined ? undefined : activePhase(banner, today);
  if (banner !== undefined && phase === undefined) {
    throw new Error(`The banner of ${pack.id} is not running on ${today}.`);
  }
  let bannerHit = false;
  let mainSure = state.mainSure;

  pack.slots.forEach((slot, index) => {
    if (slot.role === 'plus' && banner !== undefined && phase !== undefined && rng.next() < bannerHitChance(banner.hit, state.banner)) {
      // A banner card takes the "plus" slot.
      const main = state.mainSure || rng.next() < banner.mainShare;
      const mains = phase.mains.flatMap((id) => {
        const card = cardById(id);
        return card === undefined ? [] : [card];
      });
      const side = eventCards(banner.eventId).filter((card) => !phase.mains.includes(card.id));
      add(index, slot.role, pickFrom(rng, main ? mains : side, known, true), main ? 'banner-main' : 'banner-side');
      bannerHit = true;
      mainSure = !main;
      return;
    }
    let rarity = rollRarity(rng, slot.table);
    let reason: PullReason = 'normal';
    if (slot.role === 'hit') {
      const hasTop = picks.some((pick) => pick.card.rarity === 'SAR' || pick.card.rarity === 'UR');
      if (state.ur >= pack.pity.ur.after - 1) {
        if (rarity !== 'UR') {
          reason = 'pity-ur';
        }
        rarity = 'UR';
      } else if (state.sar >= pack.pity.sar.after - 1 && rarity !== 'SAR' && rarity !== 'UR' && !hasTop) {
        rarity = rng.next() < pack.pity.sar.urShare ? 'UR' : 'SAR';
        reason = 'pity-sar';
      }
    }
    add(index, slot.role, pickFrom(rng, normalPool(rarity), known, reason !== 'normal'), reason);
  });

  const hasUr = picks.some((pick) => pick.card.rarity === 'UR');
  const hasSar = picks.some((pick) => pick.card.rarity === 'SAR');
  return {
    picks,
    next: {
      sar: hasUr || hasSar ? 0 : state.sar + 1,
      ur: hasUr ? 0 : state.ur + 1,
      banner: banner === undefined ? state.banner : bannerHit ? 0 : state.banner + 1,
      mainSure: banner === undefined ? state.mainSure : mainSure,
    },
  };
}
