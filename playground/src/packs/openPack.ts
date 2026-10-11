// Opening a pack for the player: pays, rolls, files the cards and updates every counter in one step. The result is
// decided here, before any animation, so skipping or closing the window can never change or lose it.

import type { DayKey } from '../domain/calendar';
import type { OwnedCard } from '../domain/ownership';
import { HISTORY_LIMIT, addOwnedCard, spendYen, withRng, type SaveGame } from '../domain/save';
import { cardById } from '../cards/catalog';
import type { Card } from '../cards/model';
import { packById } from './catalog';
import { isAvailable, rollPack, type PackState, type PullReason } from './rollPack';
import type { PackDefinition } from './schema';

export type PackErrorCode = 'unknown-pack' | 'not-available' | 'not-enough-yen' | 'no-free-pack';

export class PackError extends Error {
  readonly code: PackErrorCode;

  constructor(code: PackErrorCode, message: string) {
    super(message);
    this.name = 'PackError';
    this.code = code;
  }
}

/** One card that came out of a pack. */
export interface Pull {
  readonly slot: number;
  readonly card: Card;
  readonly owned: OwnedCard;
  /** True when the player had no copy of this design before. */
  readonly isNew: boolean;
  readonly reason: PullReason;
}

export interface PackOpening {
  readonly save: SaveGame;
  readonly pack: PackDefinition;
  readonly pulls: readonly Pull[];
}

function bannerKey(eventId: string): string {
  return `banner:${eventId}`;
}

function mainSureKey(eventId: string): string {
  return `banner:${eventId}:main-sure`;
}

/** Every pack counts its own packs without a big hit. Saves of the first versions had one shared counter, named "sar" and "ur". */
function sarKey(pack: PackDefinition): string {
  return `sar:${pack.id}`;
}

function urKey(pack: PackDefinition): string {
  return `ur:${pack.id}`;
}

/** The two packs of the first versions carry on from the old shared counter. The packs that came later start at zero. */
const FIRST_PACKS: ReadonlySet<string> = new Set(['booster', 'halloween']);

/** The guarantee counters of a pack, read from the save. */
export function packStateOf(save: SaveGame, pack: PackDefinition): PackState {
  const eventId = pack.banner?.eventId;
  const pity = save.counters.pity;
  const old = FIRST_PACKS.has(pack.id);
  return {
    sar: pity[sarKey(pack)] ?? (old ? (pity['sar'] ?? 0) : 0),
    ur: pity[urKey(pack)] ?? (old ? (pity['ur'] ?? 0) : 0),
    banner: eventId === undefined ? 0 : (pity[bannerKey(eventId)] ?? 0),
    mainSure: eventId === undefined ? false : (save.counters.flags[mainSureKey(eventId)] ?? false),
  };
}

function withPackState(save: SaveGame, pack: PackDefinition, state: PackState): SaveGame {
  const eventId = pack.banner?.eventId;
  const pity: Record<string, number> = { ...save.counters.pity, [sarKey(pack)]: state.sar, [urKey(pack)]: state.ur };
  const flags = { ...save.counters.flags };
  if (eventId !== undefined) {
    pity[bannerKey(eventId)] = state.banner;
    flags[mainSureKey(eventId)] = state.mainSure;
  }
  return { ...save, counters: { ...save.counters, pity, flags } };
}

/** What stands between the player and the next guarantee, for the pity bars on the Packs screen. */
export interface PityStatus {
  readonly sar: { readonly count: number; readonly guaranteeAt: number };
  readonly ur: { readonly count: number; readonly guaranteeAt: number };
  readonly banner?: { readonly count: number; readonly softFrom: number; readonly hardAt: number; readonly mainSure: boolean };
}

export function pityStatus(save: SaveGame, pack: PackDefinition): PityStatus {
  const state = packStateOf(save, pack);
  const base = { sar: { count: state.sar, guaranteeAt: pack.pity.sar.after }, ur: { count: state.ur, guaranteeAt: pack.pity.ur.after } };
  return pack.banner === undefined
    ? base
    : { ...base, banner: { count: state.banner, softFrom: pack.banner.hit.softFrom, hardAt: pack.banner.hit.hard, mainSure: state.mainSure } };
}

export function canOpen(save: SaveGame, packId: string, today: DayKey): boolean {
  const pack = packById(packId);
  return pack !== undefined && isAvailable(pack, today) && save.player.yen >= pack.price;
}

/** The pack the Card-Dex gives away. */
export const FREE_PACK_ID = 'booster';

export interface OpenOptions {
  /** Opens one of the free packs the Card-Dex paid out instead of paying. Only the Booster can be opened this way. */
  readonly free?: boolean;
}

/** Buys and opens one pack. Throws a PackError when the pack is unknown, not running or too expensive. */
export function openPack(save: SaveGame, packId: string, today: DayKey, now: number, options: OpenOptions = {}): PackOpening {
  const pack = packById(packId);
  if (pack === undefined) {
    throw new PackError('unknown-pack', `There is no pack called ${packId}.`);
  }
  if (!isAvailable(pack, today)) {
    throw new PackError('not-available', `${pack.name} is not running on ${today}.`);
  }
  const free = options.free === true;
  if (free) {
    if (pack.id !== FREE_PACK_ID || save.dexRewards.freePacks < 1) {
      throw new PackError('no-free-pack', `There is no free pack to open for ${pack.name}.`);
    }
  } else if (save.player.yen < pack.price) {
    throw new PackError('not-enough-yen', `${pack.name} costs ${pack.price} yen, the purse holds ${save.player.yen}.`);
  }

  const ownedIds = new Set(save.collection.map((copy) => copy.cardId));
  const { save: rolledSave, value: rolled } = withRng(save, (rng) =>
    rollPack(rng, { pack, today, state: packStateOf(save, pack), owned: ownedIds }),
  );

  let current = free ? { ...rolledSave, dexRewards: { ...rolledSave.dexRewards, freePacks: rolledSave.dexRewards.freePacks - 1 } } : spendYen(rolledSave, pack.price, now);
  const pulls: Pull[] = [];
  for (const pick of rolled.picks) {
    const added = addOwnedCard(current, pick.card.id, pick.finish, 'pack', now);
    current = added.save;
    pulls.push({ slot: pick.slot, card: pick.card, owned: added.owned, isNew: !ownedIds.has(pick.card.id), reason: pick.reason });
    ownedIds.add(pick.card.id);
  }

  const entry = { at: now, pack: pack.id, cards: pulls.map((pull) => ({ cardId: pull.card.id, finish: pull.owned.finish })) };
  current = withPackState(current, pack, rolled.next);
  current = {
    ...current,
    counters: { ...current.counters, packsOpened: current.counters.packsOpened + 1 },
    packHistory: [...current.packHistory, entry].slice(-HISTORY_LIMIT),
  };
  return { save: current, pack, pulls };
}

/** The pulls of an older opening, rebuilt from the history (for the history list; the copies' uids are not kept). */
export function historyCards(entry: SaveGame['packHistory'][number]): readonly { readonly card: Card; readonly finish: string }[] {
  return entry.cards.flatMap((item) => {
    const card = cardById(item.cardId);
    return card === undefined ? [] : [{ card, finish: item.finish }];
  });
}

