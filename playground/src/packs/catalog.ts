import { z } from 'zod';
import { CATALOG, cardById } from '../cards/catalog';
import type { Card } from '../cards/model';
import { daysBetween } from '../domain/calendar';
import data from '../data/packs.json';
import { packSchema, type PackDefinition } from './schema';

/** A card that only a time-limited banner hands out. */
export function isLimited(card: Card): boolean {
  return card.kind === 'character' && card.limited !== undefined;
}

export function eventIdOf(card: Card): string | null {
  return card.kind === 'character' && card.limited !== undefined ? card.limited.eventId : null;
}

/** The cards of an event, in print order. */
export function eventCards(eventId: string): readonly Card[] {
  return CATALOG.filter((card) => eventIdOf(card) === eventId);
}

/** Checks the pack data and returns the packs. One error lists every problem, so a typo is found at start-up. */
export function parsePacks(raw: readonly unknown[]): readonly PackDefinition[] {
  const result = z.array(packSchema).safeParse(raw);
  if (!result.success) {
    const lines = result.error.issues.map((issue) => `  ${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Pack data is invalid:\n${lines.join('\n')}`);
  }
  const problems: string[] = [];
  const ids = new Set<string>();
  const normalRarities = new Set(CATALOG.filter((card) => !isLimited(card)).map((card) => card.rarity));
  for (const pack of result.data) {
    if (ids.has(pack.id)) {
      problems.push(`pack id ${pack.id} is used twice`);
    }
    ids.add(pack.id);
    pack.slots.forEach((slot, index) => {
      for (const rarity of Object.keys(slot.table)) {
        if (!normalRarities.has(rarity as Card['rarity'])) {
          problems.push(`${pack.id} slot ${index + 1} lists ${rarity}, but no normal card has that rarity`);
        }
      }
    });
    if (pack.pity.ur.after < pack.pity.sar.after) {
      problems.push(`${pack.id}: the Ultra Rare guarantee must not come before the Special Art Rare guarantee`);
    }
    const banner = pack.banner;
    if (banner !== undefined) {
      const pool = eventCards(banner.eventId);
      if (pool.length < 4) {
        problems.push(`${pack.id}: event ${banner.eventId} has only ${pool.length} cards`);
      }
      if (banner.from > banner.to) {
        problems.push(`${pack.id}: the banner ends before it starts`);
      }
      if (banner.hit.softFrom > banner.hit.hard) {
        problems.push(`${pack.id}: the soft guarantee must start before the hard one`);
      }
      banner.phases.forEach((phase, index) => {
        if (phase.from > phase.to) {
          problems.push(`${pack.id} phase ${index + 1} ends before it starts`);
        }
        const previous = banner.phases[index - 1];
        if (index === 0 ? phase.from !== banner.from : previous !== undefined && daysBetween(previous.to, phase.from) !== 1) {
          problems.push(`${pack.id} phase ${index + 1} does not start right after the one before it`);
        }
        if (index === banner.phases.length - 1 && phase.to !== banner.to) {
          problems.push(`${pack.id}: the last phase must end with the banner`);
        }
        if (phase.mains[0] === phase.mains[1]) {
          problems.push(`${pack.id} phase ${index + 1} lists the same main card twice`);
        }
        for (const id of phase.mains) {
          const card = cardById(id);
          if (card === undefined || eventIdOf(card) !== banner.eventId) {
            problems.push(`${pack.id} phase ${index + 1}: ${id} is not a card of event ${banner.eventId}`);
          }
        }
      });
    }
  }
  if (problems.length > 0) {
    throw new Error(`Pack data is inconsistent:\n${problems.map((line) => `  ${line}`).join('\n')}`);
  }
  return result.data;
}

export const PACKS: readonly PackDefinition[] = parsePacks(data);

export function packById(id: string): PackDefinition | undefined {
  return PACKS.find((pack) => pack.id === id);
}
