// The save game: everything that belongs to the player, as plain data. Pure code with no browser calls; the place
// that stores it (IndexedDB, a file) is in state/.
//
// Rules for changing it: bump SAVE_VERSION, add one step to MIGRATIONS that turns the old shape into the new one,
// and keep a test that loads a saved game of the old version.

import { z } from 'zod';
import type { FinishId } from '../cards/finish';
import { ownedCardSchema, rollCondition, uidFor, type ObtainSource, type OwnedCard } from './ownership';
import { createRng, restoreRng, type Rng } from './random';

export const SAVE_VERSION = 1;
export const SAVE_FORMAT = 'tqq-save';
export const STARTING_YEN = 1000;

const rngStateSchema = z.tuple([z.number().int(), z.number().int(), z.number().int(), z.number().int()]);

export const saveGameSchema = z.strictObject({
  version: z.literal(SAVE_VERSION),
  createdAt: z.number().int().min(0),
  updatedAt: z.number().int().min(0),
  player: z.strictObject({ yen: z.number().int().min(0) }),
  collection: z.array(ownedCardSchema),
  counters: z.strictObject({
    /** Next number for a copy's uid. */
    nextUid: z.number().int().min(1),
    /** How many copies of each card design this player has ever received (the next copy gets count + 1 as serial). */
    prints: z.record(z.string(), z.number().int().min(1)),
    packsOpened: z.number().int().min(0),
    /** Packs opened since the last big hit, per pack kind (for the visible pity counter). */
    pity: z.record(z.string(), z.number().int().min(0)),
  }),
  /** Where the seeded random generator stopped, so pulls continue the same way after a reload. */
  rng: rngStateSchema,
});

export type SaveGame = z.infer<typeof saveGameSchema>;

/** A fresh game: a seed makes everything that follows repeatable. */
export function newSaveGame(seed: string | number, now: number): SaveGame {
  return {
    version: SAVE_VERSION,
    createdAt: now,
    updatedAt: now,
    player: { yen: STARTING_YEN },
    collection: [],
    counters: { nextUid: 1, prints: {}, packsOpened: 0, pity: {} },
    rng: createRng(seed).state(),
  };
}

export interface Addition {
  readonly save: SaveGame;
  readonly owned: OwnedCard;
}

/** Adds one printed copy to the collection. Returns a new save; the old one is not changed. */
export function addOwnedCard(save: SaveGame, cardId: string, finish: FinishId, source: ObtainSource, now: number): Addition {
  const rng = restoreRng(save.rng);
  const condition = rollCondition(rng);
  const serial = (save.counters.prints[cardId] ?? 0) + 1;
  const owned: OwnedCard = {
    uid: uidFor(save.counters.nextUid),
    cardId,
    finish,
    condition,
    serial,
    obtained: { source, at: now },
    grade: null,
  };
  const next: SaveGame = {
    ...save,
    updatedAt: now,
    collection: [...save.collection, owned],
    counters: { ...save.counters, nextUid: save.counters.nextUid + 1, prints: { ...save.counters.prints, [cardId]: serial } },
    rng: rng.state(),
  };
  return { save: next, owned };
}

/** Lets code use the save's seeded generator (for pack rolls) and returns the save with the advanced generator state. */
export function withRng<T>(save: SaveGame, roll: (rng: Rng) => T): { readonly save: SaveGame; readonly value: T } {
  const rng = restoreRng(save.rng);
  const value = roll(rng);
  return { save: { ...save, rng: rng.state() }, value };
}

// --- Saving and loading ----------------------------------------------------------------------------------------

/** Turns a saved game of an older version into the next one. Index n upgrades version n to n + 1. */
const MIGRATIONS: readonly ((data: Record<string, unknown>) => Record<string, unknown>)[] = [
  // (empty: version 1 is the first version)
];

/** Fast 32-bit checksum (FNV-1a). Catches a damaged or hand-edited file by accident; it is not a security feature. */
export function checksum(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function serializeSave(save: SaveGame): string {
  const data = JSON.stringify(save);
  return JSON.stringify({ format: SAVE_FORMAT, checksum: checksum(data), data });
}

export class SaveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SaveError';
  }
}

const envelopeSchema = z.object({ format: z.literal(SAVE_FORMAT), checksum: z.string(), data: z.string() });

/**
 * Reads a saved game from text (a stored value or an imported file). Every problem becomes a SaveError with a
 * message that is fine to show to the player. `knownCardIds` is the set of cards the game knows.
 */
export function parseSave(text: string, knownCardIds: ReadonlySet<string>): SaveGame {
  let envelopeRaw: unknown;
  try {
    envelopeRaw = JSON.parse(text);
  } catch {
    throw new SaveError('This is not a save file.');
  }
  const envelope = envelopeSchema.safeParse(envelopeRaw);
  if (!envelope.success) {
    throw new SaveError('This is not a TQQ save file.');
  }
  if (checksum(envelope.data.data) !== envelope.data.checksum) {
    throw new SaveError('The save file is damaged (the checksum does not match).');
  }
  let data: unknown;
  try {
    data = JSON.parse(envelope.data.data);
  } catch {
    throw new SaveError('The save file is damaged.');
  }
  const record = z.record(z.string(), z.unknown()).safeParse(data);
  if (!record.success) {
    throw new SaveError('The save file is damaged.');
  }
  const version = record.data['version'];
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new SaveError('The save file has no version.');
  }
  if (version > SAVE_VERSION) {
    throw new SaveError('This save was made by a newer version of the game. Update the game to open it.');
  }
  let current = record.data;
  for (let v = version; v < SAVE_VERSION; v += 1) {
    const step = MIGRATIONS[v - 1];
    if (step === undefined) {
      throw new SaveError(`No way to upgrade a version ${v} save.`);
    }
    current = { ...step(current), version: v + 1 };
  }
  const parsed = saveGameSchema.safeParse(current);
  if (!parsed.success) {
    throw new SaveError('The save file is damaged or incomplete.');
  }
  const save = parsed.data;
  const unknown = save.collection.filter((card) => !knownCardIds.has(card.cardId)).map((card) => card.cardId);
  if (unknown.length > 0) {
    throw new SaveError(`The save contains cards this game does not know: ${[...new Set(unknown)].join(', ')}.`);
  }
  const uids = new Set(save.collection.map((card) => card.uid));
  if (uids.size !== save.collection.length) {
    throw new SaveError('The save contains the same copy twice.');
  }
  return save;
}

