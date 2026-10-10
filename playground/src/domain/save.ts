// The save game: everything that belongs to the player, as plain data. Pure code with no browser calls; the place
// that stores it (IndexedDB, a file) is in state/.
//
// Rules for changing it: bump SAVE_VERSION, add one step to MIGRATIONS that turns the old shape into the new one,
// and keep a test that loads a saved game of the old version.

import { z } from 'zod';
import type { FinishId } from '../cards/finish';
import { ownedCardSchema, rollCondition, uidFor, type ObtainSource, type OwnedCard } from './ownership';
import { createRng, restoreRng, type Rng } from './random';

export const SAVE_VERSION = 2;
export const SAVE_FORMAT = 'tqq-save';
export const STARTING_YEN = 1000;
/** How many copies fit in the showcase. */
export const SHOWCASE_SLOTS = 6;

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
  /** Uids of the copies on display, in shelf order (version 2). */
  showcase: z.array(z.string()).max(SHOWCASE_SLOTS),
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
    showcase: [],
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

/** Puts the given copies on display, in order. Returns a new save; throws when a copy is missing or listed twice. */
export function withShowcase(save: SaveGame, uids: readonly string[], now: number): SaveGame {
  if (uids.length > SHOWCASE_SLOTS) {
    throw new Error(`The showcase holds at most ${SHOWCASE_SLOTS} cards.`);
  }
  if (new Set(uids).size !== uids.length) {
    throw new Error('The same copy cannot be on display twice.');
  }
  const owned = new Set(save.collection.map((card) => card.uid));
  const missing = uids.filter((uid) => !owned.has(uid));
  if (missing.length > 0) {
    throw new Error(`These copies are not in the collection: ${missing.join(', ')}.`);
  }
  return { ...save, updatedAt: now, showcase: [...uids] };
}

// --- Saving and loading ----------------------------------------------------------------------------------------

/** Turns a saved game of an older version into the next one. Index n upgrades version n to n + 1. */
const MIGRATIONS: readonly ((data: Record<string, unknown>) => Record<string, unknown>)[] = [
  // 1 -> 2: the showcase was added.
  (data) => ({ ...data, showcase: [] }),
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

/** What went wrong when reading a save, so the screens can say it in the player's language. */
export type SaveErrorCode = 'not-a-save' | 'damaged' | 'newer-version' | 'incomplete' | 'unknown-cards' | 'inconsistent';

export class SaveError extends Error {
  readonly code: SaveErrorCode;

  constructor(code: SaveErrorCode, message: string) {
    super(message);
    this.name = 'SaveError';
    this.code = code;
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
    throw new SaveError('not-a-save', 'This is not a save file.');
  }
  const envelope = envelopeSchema.safeParse(envelopeRaw);
  if (!envelope.success) {
    throw new SaveError('not-a-save', 'This is not a TQQ save file.');
  }
  if (checksum(envelope.data.data) !== envelope.data.checksum) {
    throw new SaveError('damaged', 'The save file is damaged (the checksum does not match).');
  }
  let data: unknown;
  try {
    data = JSON.parse(envelope.data.data);
  } catch {
    throw new SaveError('damaged', 'The save file is damaged.');
  }
  const record = z.record(z.string(), z.unknown()).safeParse(data);
  if (!record.success) {
    throw new SaveError('damaged', 'The save file is damaged.');
  }
  const version = record.data['version'];
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new SaveError('incomplete', 'The save file has no version.');
  }
  if (version > SAVE_VERSION) {
    throw new SaveError('newer-version', 'This save was made by a newer version of the game. Update the game to open it.');
  }
  let current = record.data;
  for (let v = version; v < SAVE_VERSION; v += 1) {
    const step = MIGRATIONS[v - 1];
    if (step === undefined) {
      throw new SaveError('incomplete', `No way to upgrade a version ${v} save.`);
    }
    current = { ...step(current), version: v + 1 };
  }
  const parsed = saveGameSchema.safeParse(current);
  if (!parsed.success) {
    throw new SaveError('incomplete', 'The save file is damaged or incomplete.');
  }
  const save = parsed.data;
  const unknown = save.collection.filter((card) => !knownCardIds.has(card.cardId)).map((card) => card.cardId);
  if (unknown.length > 0) {
    throw new SaveError('unknown-cards', `The save contains cards this game does not know: ${[...new Set(unknown)].join(', ')}.`);
  }
  const uids = new Set(save.collection.map((card) => card.uid));
  if (uids.size !== save.collection.length) {
    throw new SaveError('inconsistent', 'The save contains the same copy twice.');
  }
  if (new Set(save.showcase).size !== save.showcase.length || save.showcase.some((uid) => !uids.has(uid))) {
    throw new SaveError('inconsistent', 'The showcase lists a copy that is missing or listed twice.');
  }
  return save;
}

