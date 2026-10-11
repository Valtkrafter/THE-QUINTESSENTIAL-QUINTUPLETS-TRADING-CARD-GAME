// Grading: a collector sends in one of their cards and gets back a score from 1 to 10 in a sealed case (a "slab").
// Every copy has four hidden sub-grades from the moment it is printed (centering, corners, edges, surface); the score is
// their average, in half steps. A high score multiplies what the card is worth, the fee is paid either way, so grading is
// for the cards that deserve it. Pure code; the screens only show the result.

import { cardById } from '../cards/catalog';
import type { Rarity } from '../cards/model';
import type { Condition, Grade, OwnedCard } from './ownership';
import { sellPrice } from './prices';
import { earnYen, spendYen, type SaveGame } from './save';

/** What it costs to grade a card, by its rarity. */
export const GRADING_FEE_YEN: Readonly<Record<Rarity, number>> = { C: 200, U: 200, R: 200, RR: 500, AR: 500, SAR: 1000, UR: 1000 };

/** The score of a copy: the average of its four sub-grades, rounded down to half a point; 9.75 and up is a perfect 10. */
export function overallGrade(condition: Condition): number {
  const average = (condition.centering + condition.corners + condition.edges + condition.surface) / 4;
  if (average >= 9.75) {
    return 10;
  }
  return Math.max(1, Math.floor(average * 2) / 2);
}

/** What a score does to the value of the card. A card at 6.5 or less is worth less than a raw copy in good shape. */
export function gradeMultiplier(overall: number): number {
  if (overall >= 10) {
    return 6;
  }
  if (overall >= 9.5) {
    return 4;
  }
  if (overall >= 9) {
    return 2.5;
  }
  if (overall >= 8.5) {
    return 1.8;
  }
  if (overall >= 8) {
    return 1.4;
  }
  if (overall >= 7.5) {
    return 1.2;
  }
  if (overall >= 7) {
    return 1.1;
  }
  return 0.8;
}

/** The word printed on the label of the slab. */
export function gradeLabel(overall: number): string {
  if (overall >= 10) {
    return 'Pristine';
  }
  if (overall >= 9.5) {
    return 'Gem Mint';
  }
  if (overall >= 9) {
    return 'Mint';
  }
  if (overall >= 8) {
    return 'Near Mint';
  }
  if (overall >= 7) {
    return 'Excellent';
  }
  if (overall >= 5) {
    return 'Good';
  }
  return 'Played';
}

export function gradingFee(rarity: Rarity): number {
  return GRADING_FEE_YEN[rarity];
}

export type GradingErrorCode = 'unknown-copy' | 'already-graded' | 'not-enough-yen';

export class GradingError extends Error {
  readonly code: GradingErrorCode;

  constructor(code: GradingErrorCode, message: string) {
    super(message);
    this.name = 'GradingError';
    this.code = code;
  }
}

export interface Graded {
  readonly save: SaveGame;
  readonly copy: OwnedCard;
  readonly grade: Grade;
  readonly fee: number;
}

/** Grades one copy: pays the fee and writes the score onto the copy. Throws a GradingError when it cannot be done. */
export function submitForGrading(save: SaveGame, uid: string, now: number): Graded {
  const copy = save.collection.find((candidate) => candidate.uid === uid);
  const card = copy === undefined ? undefined : cardById(copy.cardId);
  if (copy === undefined || card === undefined) {
    throw new GradingError('unknown-copy', 'This card is not in the collection.');
  }
  if (copy.grade !== null) {
    throw new GradingError('already-graded', 'This card has been graded already.');
  }
  const fee = gradingFee(card.rarity);
  if (save.player.yen < fee) {
    throw new GradingError('not-enough-yen', `Grading costs ${fee} yen, the purse holds ${save.player.yen}.`);
  }
  const grade: Grade = { overall: overallGrade(copy.condition), sub: copy.condition, gradedAt: now };
  const graded: OwnedCard = { ...copy, grade };
  const paid = spendYen(save, fee, now);
  return { save: { ...paid, collection: paid.collection.map((candidate) => (candidate.uid === uid ? graded : candidate)) }, copy: graded, grade, fee };
}

/** What a graded copy would fetch: the price of its rarity and finish times what its score adds. */
export function slabValue(copy: OwnedCard): number {
  const card = cardById(copy.cardId);
  if (card === undefined || copy.grade === null) {
    return 0;
  }
  return Math.max(1, Math.round(sellPrice(card.rarity, copy.finish) * gradeMultiplier(copy.grade.overall)));
}

/** Sells one graded copy (the slab leaves the collection). Throws when the copy is missing or not graded. */
export function sellSlab(save: SaveGame, uid: string, now: number): { readonly save: SaveGame; readonly yen: number } {
  const copy = save.collection.find((candidate) => candidate.uid === uid);
  if (copy === undefined || copy.grade === null) {
    throw new GradingError('unknown-copy', 'This is not a graded card of the collection.');
  }
  const yen = slabValue(copy);
  const kept = { ...save, collection: save.collection.filter((candidate) => candidate.uid !== uid), showcase: save.showcase.filter((shown) => shown !== uid) };
  return { save: earnYen(kept, yen, now), yen };
}

export interface PopulationRow {
  readonly overall: number;
  readonly count: number;
}

/** How many of the player's slabs have each score, best first. */
export function populationReport(collection: readonly OwnedCard[]): PopulationRow[] {
  const counts = new Map<number, number>();
  for (const copy of collection) {
    if (copy.grade !== null) {
      counts.set(copy.grade.overall, (counts.get(copy.grade.overall) ?? 0) + 1);
    }
  }
  return [...counts].map(([overall, count]) => ({ overall, count })).sort((a, b) => b.overall - a.overall);
}

/** How much of each hidden point a sub-grade lost, 0 for perfect and 1 for the worst: what the shader shows as wear. */
export function wearOf(subGrade: number): number {
  return Math.min(1, Math.max(0, (10 - subGrade) / 9));
}
