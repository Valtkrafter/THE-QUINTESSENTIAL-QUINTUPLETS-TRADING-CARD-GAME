// The shape of a card and the checks that every card in the data files must pass. Card text stays plain text for
// the printed face; `effects` is the same rule as data, which the battle engine will run (Stage 6).

import { z } from 'zod';
import {
  AFFINITIES,
  CHARACTER_IDS,
  RARITY_IDS,
  SISTERS,
  SISTER_AFFINITIES,
  STAGE_IDS,
  SUPPORTING_CAST,
} from './model';

// --- Effects -------------------------------------------------------------------------------------------------

export type HealTarget = 'self' | 'chosenOwn' | 'allOwn' | 'allBenched';
export type AttachTarget = 'self' | 'chosenOwn' | 'chosenBenched' | 'splitAnyOwn';

/** The whole effect vocabulary. A card can only do what is listed here; new cards combine these. */
export type Effect =
  // Cards
  | { readonly type: 'draw'; readonly count: number }
  | { readonly type: 'drawUntilHandSize'; readonly size: number }
  | { readonly type: 'peekTopMayBottom'; readonly count: number }
  | { readonly type: 'lookTopTakeOne'; readonly count: number }
  | { readonly type: 'searchBasicToBench'; readonly count: number }
  | { readonly type: 'searchSupporter'; readonly count: number }
  | { readonly type: 'shuffleHandDraw'; readonly count: number }
  | { readonly type: 'bothShuffleHandDraw'; readonly count: number }
  | { readonly type: 'opponentShuffleHandDraw'; readonly count: number }
  // Board
  | { readonly type: 'heal'; readonly amount: number; readonly target: HealTarget }
  | { readonly type: 'attachHeart'; readonly count: number; readonly target: AttachTarget }
  | { readonly type: 'switchOwnActive'; readonly free: boolean }
  | { readonly type: 'forceOpponentSwitch' }
  | { readonly type: 'discardHearts'; readonly count: number; readonly target: 'defender' }
  | { readonly type: 'preventAttackNextTurn' }
  | { readonly type: 'shieldActiveNextTurn' }
  | { readonly type: 'coinFlip'; readonly heads: readonly Effect[]; readonly tails: readonly Effect[] }
  // Extra damage of a move (shown as + or × behind the damage number)
  | { readonly type: 'damagePerHeart'; readonly amount: number }
  | { readonly type: 'damagePerCount'; readonly amount: number; readonly count: 'ownSisters' | 'ownBenched' }
  // Passive rules of a Character in play
  | { readonly type: 'reduceDamageTaken'; readonly amount: number }
  | { readonly type: 'preventBenchDamage' }
  | { readonly type: 'coinSurvive'; readonly hp: number }
  | { readonly type: 'reduceStudyCost'; readonly amount: number; readonly scope: 'bench' };

const count = z.number().int().min(1).max(10);
const amount = z.number().int().min(1).max(300);

export const effectSchema: z.ZodType<Effect> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.strictObject({ type: z.literal('draw'), count }),
    z.strictObject({ type: z.literal('drawUntilHandSize'), size: count }),
    z.strictObject({ type: z.literal('peekTopMayBottom'), count }),
    z.strictObject({ type: z.literal('lookTopTakeOne'), count }),
    z.strictObject({ type: z.literal('searchBasicToBench'), count }),
    z.strictObject({ type: z.literal('searchSupporter'), count }),
    z.strictObject({ type: z.literal('shuffleHandDraw'), count }),
    z.strictObject({ type: z.literal('bothShuffleHandDraw'), count }),
    z.strictObject({ type: z.literal('opponentShuffleHandDraw'), count }),
    z.strictObject({ type: z.literal('heal'), amount, target: z.enum(['self', 'chosenOwn', 'allOwn', 'allBenched']) }),
    z.strictObject({
      type: z.literal('attachHeart'),
      count,
      target: z.enum(['self', 'chosenOwn', 'chosenBenched', 'splitAnyOwn']),
    }),
    z.strictObject({ type: z.literal('switchOwnActive'), free: z.boolean() }),
    z.strictObject({ type: z.literal('forceOpponentSwitch') }),
    z.strictObject({ type: z.literal('discardHearts'), count, target: z.literal('defender') }),
    z.strictObject({ type: z.literal('preventAttackNextTurn') }),
    z.strictObject({ type: z.literal('shieldActiveNextTurn') }),
    z.strictObject({ type: z.literal('coinFlip'), heads: z.array(effectSchema), tails: z.array(effectSchema) }),
    z.strictObject({ type: z.literal('damagePerHeart'), amount }),
    z.strictObject({ type: z.literal('damagePerCount'), amount, count: z.enum(['ownSisters', 'ownBenched']) }),
    z.strictObject({ type: z.literal('reduceDamageTaken'), amount }),
    z.strictObject({ type: z.literal('preventBenchDamage') }),
    z.strictObject({ type: z.literal('coinSurvive'), hp: amount }),
    z.strictObject({ type: z.literal('reduceStudyCost'), amount: count, scope: z.literal('bench') }),
  ]),
);

// --- Moves and abilities -------------------------------------------------------------------------------------

const moveSchema = z.strictObject({
  name: z.string().min(1),
  /** Hearts that must be attached to use the move. `study` can be paid with any Heart. */
  cost: z.array(z.enum(AFFINITIES)).min(1).max(4),
  damage: z.number().int().min(10).max(400).nullable(),
  /** `+` = more damage under a condition, `×` = damage per count. */
  damageSuffix: z.enum(['+', '×']).optional(),
  text: z.string().optional(),
  effects: z.array(effectSchema).default([]),
});

const abilitySchema = z.strictObject({
  name: z.string().min(1),
  text: z.string().min(1),
  /** passive: always on; onceDuringTurn: the player chooses; onPlay: when played from the hand. */
  timing: z.enum(['passive', 'onceDuringTurn', 'onPlay']),
  effects: z.array(effectSchema).min(1),
});

// --- Cards ---------------------------------------------------------------------------------------------------

const localizedName = z.strictObject({ en: z.string().min(1), ja: z.string().min(1) });

/** Where the art sits on the card: `zoom` 1 fills the card, below 1 shows more of the image on a blurred fill. */
const artCrop = z.strictObject({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  zoom: z.number().min(0.3).max(1),
});

/** Points at a picture in the art manifest, e.g. nino / t03 (tier 3) or nino / h1 (first Halloween card). */
const artRef = z.strictObject({
  character: z.enum(CHARACTER_IDS),
  slot: z.string().regex(/^(t\d\d|h\d)$/, 'slot must look like t03 or h1'),
});

export const DEFAULT_CROP = { x: 0.5, y: 0, zoom: 1 } as const;

const baseFields = {
  id: z.string().regex(/^TQQ01-\d{3}$/, 'id must look like TQQ01-007').brand<'CardId'>(),
  set: z.literal('TQQ01'),
  number: z.number().int().min(1).max(999),
  rarity: z.enum(RARITY_IDS),
  name: localizedName,
  /** Card-specific subtitle, e.g. "Summer Fireworks". */
  title: z.string().min(1),
  art: artRef,
  illustrator: z.string().min(1).default('Unbekannt'),
  /** Carries a gold-foil signature (stylised, invented). */
  signed: z.boolean(),
  crop: artCrop.default(DEFAULT_CROP),
};

/** Limited cards: only in the named event banner, and a deck may hold at most `maxPerDeck` copies. */
const limitedSchema = z.strictObject({ eventId: z.string().min(1), maxPerDeck: z.number().int().min(1).max(4) });

const characterCardSchema = z
  .strictObject({
    ...baseFields,
    kind: z.literal('character'),
    character: z.enum(SISTERS),
    stage: z.enum(STAGE_IDS),
    /** Prime cards are stronger but give up two Memories when knocked out (the "ex" rule). */
    prime: z.boolean(),
    hp: z.number().int().min(30).max(400),
    affinity: z.enum(SISTER_AFFINITIES),
    ability: abilitySchema.optional(),
    moves: z.array(moveSchema).max(3),
    weakness: z.enum(SISTER_AFFINITIES).nullable(),
    resistance: z.enum(SISTER_AFFINITIES).nullable(),
    retreat: z.number().int().min(0).max(4),
    limited: limitedSchema.optional(),
  })
  .check((ctx) => {
    const card = ctx.value;
    if (card.moves.length === 0 && card.ability === undefined) {
      ctx.issues.push({ code: 'custom', message: 'a character needs a move or an ability', input: card });
    }
    if ((card.stage === 'event') !== (card.limited !== undefined)) {
      ctx.issues.push({ code: 'custom', message: 'exactly the event cards are limited', input: card });
    }
    if (card.stage === 'event' && !card.prime) {
      ctx.issues.push({ code: 'custom', message: 'event cards are Prime cards', input: card });
    }
    if (card.art.character !== card.character) {
      ctx.issues.push({ code: 'custom', message: 'the art must show the card character', input: card });
    }
  });

const supporterCardSchema = z
  .strictObject({
    ...baseFields,
    kind: z.literal('supporter'),
    character: z.enum(SUPPORTING_CAST),
    /** The rule as printed on the card. */
    text: z.string().min(1),
    effects: z.array(effectSchema).min(1),
  })
  .check((ctx) => {
    if (ctx.value.art.character !== ctx.value.character) {
      ctx.issues.push({ code: 'custom', message: 'the art must show the card character', input: ctx.value });
    }
  });

export const cardSchema = z.discriminatedUnion('kind', [characterCardSchema, supporterCardSchema]);

export type Card = z.infer<typeof cardSchema>;
export type CharacterCard = z.infer<typeof characterCardSchema>;
export type SupporterCard = z.infer<typeof supporterCardSchema>;
export type Move = z.infer<typeof moveSchema>;
export type Ability = z.infer<typeof abilitySchema>;
export type CardId = Card['id'];
export type ArtRef = z.infer<typeof artRef>;
export type ArtCrop = z.infer<typeof artCrop>;
export type LocalizedName = z.infer<typeof localizedName>;
