// Views on the collection: filtering, sorting and the Card-Dex. Pure functions over the save game's copies, so the
// screens only draw what these return and every rule here has a test.

import { cardById, CATALOG } from '../cards/catalog';
import { FINISH_IDS, type FinishId } from '../cards/finish';
import { RARITIES, type Card, type CharacterId, type Rarity } from '../cards/model';
import type { OwnedCard } from './ownership';

export const SORT_KEYS = ['number', 'rarity', 'finish', 'newest'] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export interface CollectionFilter {
  /** Free text: matches the name (English or Japanese), the title and the card id. Empty matches everything. */
  readonly query: string;
  /** Empty list = no restriction, for each of the three lists below. */
  readonly characters: readonly CharacterId[];
  readonly rarities: readonly Rarity[];
  readonly finishes: readonly FinishId[];
}

export const NO_FILTER: CollectionFilter = { query: '', characters: [], rarities: [], finishes: [] };

export function activeFilterCount(filter: CollectionFilter): number {
  return (filter.query.trim() === '' ? 0 : 1) + [filter.characters, filter.rarities, filter.finishes].filter((list) => list.length > 0).length;
}

const RARITY_RANK: Readonly<Record<string, number>> = Object.fromEntries(RARITIES.map((rarity) => [rarity.id, rarity.tier]));

/** Higher is rarer. */
export function rarityRank(rarity: Rarity): number {
  return RARITY_RANK[rarity] ?? 0;
}

/** Position in the finish list: the later a finish is listed, the fancier it is. */
export function finishRank(finish: FinishId): number {
  return FINISH_IDS.indexOf(finish);
}

function matchesQuery(card: Card, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === '') {
    return true;
  }
  const haystack = `${card.name.en} ${card.name.ja} ${card.title} ${card.id} ${card.rarity}`.toLowerCase();
  return needle.split(/\s+/).every((word) => haystack.includes(word));
}

export function filterCollection(collection: readonly OwnedCard[], filter: CollectionFilter): OwnedCard[] {
  return collection.filter((copy) => {
    const card = cardById(copy.cardId);
    if (card === undefined) {
      return false;
    }
    return (
      matchesQuery(card, filter.query) &&
      (filter.characters.length === 0 || filter.characters.includes(card.character)) &&
      (filter.rarities.length === 0 || filter.rarities.includes(card.rarity)) &&
      (filter.finishes.length === 0 || filter.finishes.includes(copy.finish))
    );
  });
}

function numberOf(copy: OwnedCard): number {
  return cardById(copy.cardId)?.number ?? 0;
}

function rarityOf(copy: OwnedCard): number {
  const card = cardById(copy.cardId);
  return card === undefined ? 0 : rarityRank(card.rarity);
}

/** Print order first, then the order the copies were received in. Every sort falls back to this. */
function byPrintOrder(a: OwnedCard, b: OwnedCard): number {
  return numberOf(a) - numberOf(b) || a.serial - b.serial;
}

const COMPARE: Readonly<Record<SortKey, (a: OwnedCard, b: OwnedCard) => number>> = {
  number: byPrintOrder,
  rarity: (a, b) => rarityOf(b) - rarityOf(a) || byPrintOrder(a, b),
  finish: (a, b) => finishRank(b.finish) - finishRank(a.finish) || byPrintOrder(a, b),
  newest: (a, b) => b.obtained.at - a.obtained.at || b.uid.localeCompare(a.uid),
};

/** Returns a sorted copy of the list. */
export function sortCollection(copies: readonly OwnedCard[], key: SortKey): OwnedCard[] {
  return [...copies].sort(COMPARE[key]);
}

// --- Card-Dex ---------------------------------------------------------------------------------------------------

export interface DexEntry {
  readonly card: Card;
  /** How many copies of this design the player owns. */
  readonly owned: number;
  /** The copy to show for this design, or null when the player has none. */
  readonly best: OwnedCard | null;
}

/** The copy that stands for a design in the Dex: the fanciest finish, then the first print. */
export function bestCopy(copies: readonly OwnedCard[]): OwnedCard | null {
  let best: OwnedCard | null = null;
  for (const copy of copies) {
    if (best === null || finishRank(copy.finish) > finishRank(best.finish) || (copy.finish === best.finish && copy.serial < best.serial)) {
      best = copy;
    }
  }
  return best;
}

/** One entry for every card of the set, in print order, whether the player owns it or not. */
export function buildDex(collection: readonly OwnedCard[]): DexEntry[] {
  const byCard = new Map<string, OwnedCard[]>();
  for (const copy of collection) {
    const list = byCard.get(copy.cardId);
    if (list === undefined) {
      byCard.set(copy.cardId, [copy]);
    } else {
      list.push(copy);
    }
  }
  return CATALOG.map((card) => {
    const copies = byCard.get(card.id) ?? [];
    return { card, owned: copies.length, best: bestCopy(copies) };
  });
}

export interface Progress {
  readonly found: number;
  readonly total: number;
}

export function dexProgress(entries: readonly DexEntry[]): Progress {
  return { found: entries.filter((entry) => entry.owned > 0).length, total: entries.length };
}

/** Progress per character, in the order the characters first appear in the Dex. */
export function dexProgressByCharacter(entries: readonly DexEntry[]): ReadonlyMap<CharacterId, Progress> {
  const result = new Map<CharacterId, { found: number; total: number }>();
  for (const entry of entries) {
    const progress = result.get(entry.card.character) ?? { found: 0, total: 0 };
    progress.total += 1;
    if (entry.owned > 0) {
      progress.found += 1;
    }
    result.set(entry.card.character, progress);
  }
  return result;
}
