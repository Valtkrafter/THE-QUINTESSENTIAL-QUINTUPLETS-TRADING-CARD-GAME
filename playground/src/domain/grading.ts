// Grading: a collector sends in one of their cards and gets back a score from 1 to 10 in a sealed case (a "slab").
// Every copy has four sub-grades from the moment it is printed (centering, corners, edges, surface); the wear in the 3D view
// shows them. The graders look much closer than anybody can, and find a little more on every mark (the "strictness"), so even
// a card that looks perfect can come back with a 9. The score is the average of the four marks they give, in half steps. Only a
// high score makes the card worth more (a low one makes it worth less than before), and the fee is paid either way: grading is a
// gamble, and a good one only for the cards that deserve it. Pure code; the screens only show the result.

import { cardById } from '../cards/catalog';
import type { FinishId } from '../cards/finish';
import type { Rarity } from '../cards/model';
import type { Condition, Grade, OwnedCard } from './ownership';
import { sellPrice } from './prices';
import type { Rng } from './random';
import { earnYen, spendYen, withRng, type SaveGame } from './save';

/** What it costs to grade a card, by its rarity. */
export const GRADING_FEE_YEN: Readonly<Record<Rarity, number>> = { C: 300, U: 300, R: 300, RR: 800, AR: 800, SAR: 1500, UR: 1500 };

/**
 * What the graders find beyond the wear that shows. A mark that shows no wear at all still has hidden flaws now and then; the
 * more wear shows, the likelier it is that they find more. So a card that looks perfect has good odds, a card that looks worn
 * has poor ones, and nobody can be sure.
 */
export const HIDDEN_FLAW_BASE = 0.5;
export const HIDDEN_FLAW_PER_POINT = 0.15;
export const HIDDEN_FLAW_MAX = 0.92;
/** How much they find, when they find something (in points, on average). A few marks lose a lot more. */
export const HIDDEN_FLAW_SIZE = 1.0;

/** The chance (0..1) that the graders find something more on a mark that shows `visible` points. */
export function hiddenFlawChance(visible: number): number {
  return Math.min(HIDDEN_FLAW_MAX, HIDDEN_FLAW_BASE + HIDDEN_FLAW_PER_POINT * (10 - visible));
}

/**
 * The marks the graders give a copy: what shows in the 3D view, less what only a trained eye finds. Every mark is rolled on its
 * own, so a card can lose a point on its corners and nothing on its surface. The same seed always gives the same marks.
 */
export function gradeMarks(condition: Condition, rng: Rng): Condition {
  const mark = (visible: number): number => {
    const found = rng.next() < hiddenFlawChance(visible) ? -Math.log(1 - rng.next()) * HIDDEN_FLAW_SIZE : 0;
    return Math.min(10, Math.max(1, Math.round((visible - found) * 10) / 10));
  };
  return { centering: mark(condition.centering), corners: mark(condition.corners), edges: mark(condition.edges), surface: mark(condition.surface) };
}

/** The score for four marks that add up to `total` tenths of a point: their average, rounded down to half a point, and a 10 from 9.75. */
function scoreOfTotal(total: number): number {
  return total >= 390 ? 10 : Math.max(1, Math.floor(total / 20) / 2);
}

/** The score of a copy: the average of its four marks, rounded down to half a point; 9.75 and up is a perfect 10. */
export function overallGrade(condition: Condition): number {
  // Whole tenths, so a mark of 9.1 can never turn into 9.0999 and push a score over a line.
  const tenth = (mark: number): number => Math.round(mark * 10);
  return scoreOfTotal(tenth(condition.centering) + tenth(condition.corners) + tenth(condition.edges) + tenth(condition.surface));
}

/** What a score multiplies the value of the card with. Below a 9 the case is worth less than a clean raw copy: the gamble can lose. */
export const GRADE_MULTIPLIERS: readonly { readonly min: number; readonly factor: number }[] = [
  { min: 10, factor: 10 },
  { min: 9.5, factor: 4.5 },
  { min: 9, factor: 2 },
  { min: 8.5, factor: 1.2 },
  { min: 8, factor: 0.85 },
  { min: 7.5, factor: 0.65 },
  { min: 7, factor: 0.5 },
];

/** The factor of everything below the table above (6.5 and less). */
const LOWEST_FACTOR = 0.35;

/** What a score does to the value of the card. */
export function gradeMultiplier(overall: number): number {
  return GRADE_MULTIPLIERS.find((row) => overall >= row.min)?.factor ?? LOWEST_FACTOR;
}

export type GradeBandId = 'pristine' | 'gem' | 'mint' | 'near' | 'excellent' | 'good' | 'played';

export interface GradeBand {
  readonly id: GradeBandId;
  /** The lowest score that belongs to the band. */
  readonly min: number;
  /** The word printed on the label of the slab. */
  readonly label: string;
}

const PLAYED: GradeBand = { id: 'played', min: 0, label: 'Played' };

/** From the best band to the worst. */
export const GRADE_BANDS: readonly GradeBand[] = [
  { id: 'pristine', min: 10, label: 'Pristine' },
  { id: 'gem', min: 9.5, label: 'Gem Mint' },
  { id: 'mint', min: 9, label: 'Mint' },
  { id: 'near', min: 8, label: 'Near Mint' },
  { id: 'excellent', min: 7, label: 'Excellent' },
  { id: 'good', min: 5, label: 'Good' },
  PLAYED,
];

/** The band of a score: it names the slab label and picks its colours. */
export function gradeBand(overall: number): GradeBand {
  return GRADE_BANDS.find((band) => overall >= band.min) ?? PLAYED;
}

/** The word printed on the label of the slab. */
export function gradeLabel(overall: number): string {
  return gradeBand(overall).label;
}

/** The scores that change what a card is worth, best first (6.5 stands for "6.5 or less"): the price ladder before a card is sent in. */
export const LADDER_SCORES: readonly number[] = [10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5];

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
  // The graders' marks come from the save's own dice, so the result is settled (and saved) before anything is shown.
  const { save: rolled, value: marks } = withRng(save, (rng) => gradeMarks(copy.condition, rng));
  const grade: Grade = { overall: overallGrade(marks), sub: marks, gradedAt: now };
  const graded: OwnedCard = { ...copy, grade };
  const paid = spendYen(rolled, fee, now);
  return { save: { ...paid, collection: paid.collection.map((candidate) => (candidate.uid === uid ? graded : candidate)) }, copy: graded, grade, fee };
}

/** What a slab of this rarity and finish fetches at a score: the price of the card times what the score adds. */
export function valueAtScore(rarity: Rarity, finish: FinishId, overall: number): number {
  return Math.max(1, Math.round(sellPrice(rarity, finish) * gradeMultiplier(overall)));
}

export interface LadderRow {
  readonly score: number;
  readonly yen: number;
}

/** What a card would fetch at every score that matters, best first. Shown before it is sent in, so nobody pays blind. */
export function gradeLadder(rarity: Rarity, finish: FinishId): LadderRow[] {
  return LADDER_SCORES.map((score) => ({ score, yen: valueAtScore(rarity, finish, score) }));
}

// --- What to expect, worked out exactly ----------------------------------------------------------------------------------------

/** The chances (0..1) of every value a mark can end up with, in tenths of a point (index 10 is a 1.0, index 100 a 10.0). */
function markChances(visible: number): Float64Array {
  const chances = new Float64Array(101);
  const top = Math.min(100, Math.max(10, Math.round(visible * 10)));
  const found = hiddenFlawChance(visible);
  const mean = 10 * HIDDEN_FLAW_SIZE;
  chances[top] = (chances[top] ?? 0) + (1 - found);
  // The flaw they find (in tenths) is exponential and rounds to whole tenths: k tenths when it is between k - 0.5 and k + 0.5.
  const reach = (k: number): number => 1 - Math.exp(-Math.max(0, k) / mean);
  for (let k = 0; top - k > 10; k += 1) {
    chances[top - k] = (chances[top - k] ?? 0) + found * (reach(k + 0.5) - reach(k - 0.5));
  }
  // Everything that would go below the lowest mark stays on it.
  chances[10] = (chances[10] ?? 0) + found * (1 - reach(top - 10 - 0.5));
  return chances;
}

/** The chances of the sum of two lists of chances (a convolution). */
function addUp(a: Float64Array, b: Float64Array): Float64Array {
  const sum = new Float64Array(a.length + b.length - 1);
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i] ?? 0;
    if (left === 0) {
      continue;
    }
    for (let j = 0; j < b.length; j += 1) {
      sum[i + j] = (sum[i + j] ?? 0) + left * (b[j] ?? 0);
    }
  }
  return sum;
}

/**
 * The chance of every score for a copy that shows this condition, worked out exactly (no dice). It is the very rule `gradeMarks`
 * plays, so what is shown before a card is sent in is what the graders then do.
 */
export function gradeChances(condition: Condition): ReadonlyMap<number, number> {
  const total = [condition.corners, condition.edges, condition.surface].reduce((sum, mark) => addUp(sum, markChances(mark)), markChances(condition.centering));
  const scores = new Map<number, number>();
  total.forEach((chance, tenths) => {
    if (chance > 0) {
      const score = scoreOfTotal(tenths);
      scores.set(score, (scores.get(score) ?? 0) + chance);
    }
  });
  return scores;
}

/** How a copy looks to the eye, from the wear that shows in the 3D view: the four levels the Grading screen names. */
export type EyeCheck = 'perfect' | 'clean' | 'worn' | 'battered';

export function eyeCheck(condition: Condition): EyeCheck {
  const average = (condition.centering + condition.corners + condition.edges + condition.surface) / 4;
  if (average >= 9.6) {
    return 'perfect';
  }
  if (average >= 9) {
    return 'clean';
  }
  return average >= 8 ? 'worn' : 'battered';
}

export interface OutlookRow {
  /** The score. 6.5 stands for "6.5 or less". */
  readonly score: number;
  /** The chance (0..1) that the card gets it. */
  readonly chance: number;
  /** What the card is worth in its case at this score. */
  readonly yen: number;
}

export type Verdict = 'great' | 'good' | 'poor' | 'bad';

export interface Outlook {
  readonly rows: readonly OutlookRow[];
  /** The fee, what the card is worth loose, and what it is worth in its case on average. */
  readonly fee: number;
  readonly loose: number;
  readonly expected: number;
  /** What grading brings on average over keeping the card loose, the fee counted: expected - loose - fee. */
  readonly edge: number;
  readonly verdict: Verdict;
  /** The chance of a 9 or better, and of a perfect 10. */
  readonly nineOrBetter: number;
  readonly ten: number;
}

/** What grading this copy is likely to do: the chance and the price of every score, what it is worth on average, and a verdict. */
export function gradeOutlook(condition: Condition, rarity: Rarity, finish: FinishId): Outlook {
  const chances = gradeChances(condition);
  const rows = LADDER_SCORES.map((score, index): OutlookRow => {
    const last = index === LADDER_SCORES.length - 1;
    let chance = 0;
    for (const [value, share] of chances) {
      if (last ? value <= score : value === score) {
        chance += share;
      }
    }
    return { score, chance, yen: valueAtScore(rarity, finish, score) };
  });
  const fee = gradingFee(rarity);
  const loose = sellPrice(rarity, finish);
  let expected = 0;
  for (const [value, share] of chances) {
    expected += share * valueAtScore(rarity, finish, value);
  }
  const edge = expected - loose - fee;
  const ratio = edge / (loose + fee);
  const verdict: Verdict = ratio >= 0.25 ? 'great' : ratio >= 0 ? 'good' : ratio >= -0.5 ? 'poor' : 'bad';
  let nineOrBetter = 0;
  for (const [value, share] of chances) {
    nineOrBetter += value >= 9 ? share : 0;
  }
  return { rows, fee, loose, expected, edge, verdict, nineOrBetter, ten: chances.get(10) ?? 0 };
}

/** What a graded copy would fetch: the price of its rarity and finish times what its score adds. */
export function slabValue(copy: OwnedCard): number {
  const card = cardById(copy.cardId);
  if (card === undefined || copy.grade === null) {
    return 0;
  }
  return valueAtScore(card.rarity, copy.finish, copy.grade.overall);
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

/** The graded copies, best score first (a tie goes to the more valuable print, then to the older grading). */
export function slabsOf(collection: readonly OwnedCard[]): OwnedCard[] {
  return collection
    .filter((copy) => copy.grade !== null)
    .sort((a, b) => (b.grade?.overall ?? 0) - (a.grade?.overall ?? 0) || slabValue(b) - slabValue(a) || (a.grade?.gradedAt ?? 0) - (b.grade?.gradedAt ?? 0));
}

/** The copies that have not been graded yet. */
export function rawCopies(collection: readonly OwnedCard[]): OwnedCard[] {
  return collection.filter((copy) => copy.grade === null);
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
