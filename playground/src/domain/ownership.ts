// A card you own is not the card design: it is one printed copy with its own finish, serial number and a hidden
// condition. The condition decides the grade later (Stage 5); nothing shows it until a copy is graded.

import { z } from 'zod';
import { FINISH_IDS, type FinishId } from '../cards/finish';
import type { Rng } from './random';

const subGrade = z.number().min(1).max(10);

/** Four hidden sub-grades from 1.0 (ruined) to 10.0 (perfect). */
export const conditionSchema = z.strictObject({
  centering: subGrade,
  corners: subGrade,
  edges: subGrade,
  surface: subGrade,
});
export type Condition = z.infer<typeof conditionSchema>;

export const gradeSchema = z.strictObject({
  overall: z.number().min(1).max(10),
  sub: conditionSchema,
  gradedAt: z.number().int().min(0),
});
export type Grade = z.infer<typeof gradeSchema>;

export const OBTAIN_SOURCES = ['starter', 'pack', 'shop', 'reward'] as const;
export type ObtainSource = (typeof OBTAIN_SOURCES)[number];

export const ownedCardSchema = z.strictObject({
  /** Unique among all copies of this save. */
  uid: z.string().regex(/^c\d{6,}$/),
  cardId: z.string().regex(/^TQQ01-\d{3}$/),
  finish: z.enum(FINISH_IDS),
  condition: conditionSchema,
  /** Which print of this card design it is: 1 for the first copy you ever got, 2 for the second, ... */
  serial: z.number().int().min(1),
  obtained: z.strictObject({ source: z.enum(OBTAIN_SOURCES), at: z.number().int().min(0) }),
  grade: gradeSchema.nullable(),
});
export type OwnedCard = z.infer<typeof ownedCardSchema>;

const MEAN_LOSS = 1.1;

function oneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Rolls how well one copy came out of the factory: most copies lose a little on each point (about 1 on average),
 * a few lose a lot, and some come out perfect. The same seed always gives the same copy.
 */
export function rollCondition(rng: Rng): Condition {
  const roll = (): number => {
    const loss = -Math.log(1 - rng.next()) * MEAN_LOSS;
    return oneDecimal(Math.min(10, Math.max(1, 10 - loss)));
  };
  return { centering: roll(), corners: roll(), edges: roll(), surface: roll() };
}

export function uidFor(counter: number): string {
  return `c${String(counter).padStart(6, '0')}`;
}

export function isFinish(value: string): value is FinishId {
  return (FINISH_IDS as readonly string[]).includes(value);
}
