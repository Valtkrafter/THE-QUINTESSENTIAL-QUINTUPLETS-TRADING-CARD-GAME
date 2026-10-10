// What a pack is, as data. Prices, slot tables, guarantees and the banner live in `src/data/packs.json`; the rules in
// `openPack.ts` only read them. The schema makes a typo in that file stop the game at start-up.

import { z } from 'zod';
import { RARITY_IDS } from '../cards/model';
import { isDayKey } from '../domain/calendar';

const dayKey = z.string().refine(isDayKey, 'Expected a real date as YYYY-MM-DD');
const cardId = z.string().regex(/^TQQ01-\d{3}$/);

/** Relative weights per rarity (they need not add up to 100, but the data files keep them at 100 so they read as percent). */
export const rarityTableSchema = z
  .partialRecord(z.enum(RARITY_IDS), z.number().positive())
  .refine((table) => Object.keys(table).length > 0, 'A slot needs at least one rarity');
export type RarityTable = z.infer<typeof rarityTableSchema>;

export const SLOT_ROLES = ['basic', 'plus', 'hit'] as const;
export type SlotRole = (typeof SLOT_ROLES)[number];

const slotSchema = z.strictObject({ role: z.enum(SLOT_ROLES), table: rarityTableSchema });

/** The limited-time banner of a pack: a rising chance of an event card in the "plus" slot, with a 50/50 on main cards. */
const bannerSchema = z.strictObject({
  eventId: z.string(),
  from: dayKey,
  to: dayKey,
  /** Chance per pack of an event card. After `softFrom` packs without one it rises by `softStep` per pack; at `hard` it is certain. */
  hit: z.strictObject({
    base: z.number().gt(0).lt(1),
    softFrom: z.number().int().positive(),
    softStep: z.number().gt(0).lte(1),
    hard: z.number().int().positive(),
  }),
  /** Chance that a hit is one of the main cards, when the last hit was not a lost 50/50. */
  mainShare: z.number().gt(0).lt(1),
  phases: z
    .array(z.strictObject({ from: dayKey, to: dayKey, mains: z.tuple([cardId, cardId]) }))
    .min(1),
});

export const packSchema = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  name: z.string().min(1),
  price: z.number().int().positive(),
  slots: z.array(slotSchema).length(5),
  pity: z.strictObject({
    /** After this many packs without a Special Art Rare or Ultra Rare, the next hit slot is one. */
    sar: z.strictObject({ after: z.number().int().positive(), urShare: z.number().min(0).max(1) }),
    /** After this many packs without an Ultra Rare, the next hit slot is one. */
    ur: z.strictObject({ after: z.number().int().positive() }),
  }),
  banner: bannerSchema.optional(),
});

export type PackDefinition = z.infer<typeof packSchema>;
export type BannerDefinition = NonNullable<PackDefinition['banner']>;
