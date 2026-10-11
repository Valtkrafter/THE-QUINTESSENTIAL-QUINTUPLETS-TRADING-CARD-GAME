import { describe, expect, it } from 'vitest';
import { cardById } from '../cards/catalog';
import {
  GRADE_BANDS,
  GRADING_FEE_YEN,
  GradingError,
  LADDER_SCORES,
  gradeBand,
  gradeLabel,
  gradeLadder,
  gradeMultiplier,
  gradingFee,
  overallGrade,
  populationReport,
  rawCopies,
  sellSlab,
  slabValue,
  slabsOf,
  submitForGrading,
  valueAtScore,
  wearOf,
} from './grading';
import { rollCondition } from './ownership';
import { createRng } from './random';
import { STARTING_YEN, addOwnedCard, newSaveGame, withShowcase, type SaveGame } from './save';
import { sellPrice } from './prices';

const NOW = 1_760_000_000_000;

function flat(value: number) {
  return { centering: value, corners: value, edges: value, surface: value };
}

describe('the score of a copy', () => {
  it('is the average of the four sub-grades, rounded down to half a point, and 10 from 9.75', () => {
    expect(overallGrade(flat(10))).toBe(10);
    expect(overallGrade(flat(9.8))).toBe(10);
    expect(overallGrade(flat(9.7))).toBe(9.5);
    expect(overallGrade(flat(9.4))).toBe(9);
    expect(overallGrade({ centering: 9, corners: 9, edges: 9, surface: 10 })).toBe(9);
    expect(overallGrade({ centering: 10, corners: 10, edges: 9, surface: 9 })).toBe(9.5);
    expect(overallGrade(flat(8.7))).toBe(8.5);
    expect(overallGrade(flat(1))).toBe(1);
  });

  it('matches what the economy promised: half the cards 9 or better, one in eight 9.5 or better, one in sixty a 10', () => {
    const rng = createRng('population');
    const total = 40000;
    let nine = 0;
    let nineAndAHalf = 0;
    let ten = 0;
    for (let index = 0; index < total; index += 1) {
      const grade = overallGrade(rollCondition(rng));
      nine += grade >= 9 ? 1 : 0;
      nineAndAHalf += grade >= 9.5 ? 1 : 0;
      ten += grade >= 10 ? 1 : 0;
    }
    expect(nine / total).toBeGreaterThan(0.47);
    expect(nine / total).toBeLessThan(0.54);
    expect(nineAndAHalf / total).toBeGreaterThan(0.1);
    expect(nineAndAHalf / total).toBeLessThan(0.14);
    expect(ten / total).toBeGreaterThan(1 / 100);
    expect(ten / total).toBeLessThan(1 / 40);
  });

  it('adds more to the value the higher it is, and a low score is worth less than a raw copy', () => {
    const steps = [10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 1].map(gradeMultiplier);
    for (let index = 1; index < steps.length; index += 1) {
      expect(steps[index] ?? 0).toBeLessThanOrEqual(steps[index - 1] ?? 0);
    }
    expect(gradeMultiplier(10)).toBe(6);
    expect(gradeMultiplier(6.5)).toBeLessThan(1);
    expect(gradeLabel(10)).toBe('Pristine');
    expect(gradeLabel(9.5)).toBe('Gem Mint');
    expect(gradeLabel(3)).toBe('Played');
  });

  it('turns a sub-grade into wear for the shader: nothing for a 10, everything for a 1', () => {
    expect(wearOf(10)).toBe(0);
    expect(wearOf(1)).toBe(1);
    expect(wearOf(5.5)).toBeCloseTo(0.5);
    expect(wearOf(0)).toBe(1);
  });

  it('puts every score into one band, the best band first, and the bands are the words of the slab label', () => {
    expect(GRADE_BANDS.map((band) => band.min)).toEqual([...GRADE_BANDS.map((band) => band.min)].sort((a, b) => b - a));
    expect(gradeBand(10).id).toBe('pristine');
    expect(gradeBand(9.5).id).toBe('gem');
    expect(gradeBand(8.5).id).toBe('near');
    expect(gradeBand(7.5).id).toBe('excellent');
    expect(gradeBand(1).id).toBe('played');
    expect(gradeBand(0).label).toBe('Played');
  });
});

describe('the price ladder', () => {
  it('has a row for every score that changes the price, best first, and falls from row to row', () => {
    const ladder = gradeLadder('UR', 'gold');
    expect(ladder.map((row) => row.score)).toEqual([...LADDER_SCORES]);
    for (let index = 1; index < ladder.length; index += 1) {
      expect(ladder[index]?.yen ?? 0).toBeLessThanOrEqual(ladder[index - 1]?.yen ?? 0);
    }
    expect(ladder[0]?.yen).toBe(valueAtScore('UR', 'gold', 10));
    expect(ladder[0]?.yen).toBe(Math.round(sellPrice('UR', 'gold') * 6));
  });

  it('shows the last row below the raw price, because a battered card is worth less in a case than loose', () => {
    const ladder = gradeLadder('SAR', 'prism');
    expect(ladder[ladder.length - 1]?.yen).toBeLessThan(sellPrice('SAR', 'prism'));
  });
});

function withCopy(cardId: string, finish: Parameters<typeof addOwnedCard>[2] = 'standard', yen = 5000): { readonly save: SaveGame; readonly uid: string } {
  const added = addOwnedCard(newSaveGame('grading', NOW), cardId, finish, 'pack', NOW);
  return { save: { ...added.save, player: { yen } }, uid: added.owned.uid };
}

describe('sending a card in', () => {
  it('costs the fee of its rarity and writes the score and the sub-grades onto the copy', () => {
    const { save, uid } = withCopy('TQQ01-010', 'gold');
    const graded = submitForGrading(save, uid, NOW + 1);
    expect(graded.fee).toBe(gradingFee('UR'));
    expect(graded.save.player.yen).toBe(5000 - GRADING_FEE_YEN.UR);
    const copy = graded.save.collection[0];
    expect(copy?.grade?.overall).toBe(overallGrade(copy?.condition ?? flat(1)));
    expect(copy?.grade?.sub).toEqual(copy?.condition);
    expect(copy?.grade?.gradedAt).toBe(NOW + 1);
    expect(save.collection[0]?.grade).toBeNull();
  });

  it('refuses a missing copy, a copy that is graded already and a purse that is too empty', () => {
    const { save, uid } = withCopy('TQQ01-001');
    expect(() => submitForGrading(save, 'c999999', NOW)).toThrow(GradingError);
    const graded = submitForGrading(save, uid, NOW).save;
    expect(() => submitForGrading(graded, uid, NOW)).toThrow(/graded already/);
    const poor = { ...save, player: { yen: GRADING_FEE_YEN.C - 1 } };
    expect(() => submitForGrading(poor, uid, NOW)).toThrow(/costs/);
  });

  it('turns the score into a price: the printed price of the card times what the score adds', () => {
    const { save, uid } = withCopy('TQQ01-010', 'prism');
    const graded = submitForGrading(save, uid, NOW).save;
    const copy = graded.collection[0];
    expect(copy).toBeDefined();
    if (copy === undefined) {
      return;
    }
    const base = sellPrice(cardById('TQQ01-010')?.rarity ?? 'UR', 'prism');
    expect(slabValue(copy)).toBe(Math.max(1, Math.round(base * gradeMultiplier(copy.grade?.overall ?? 1))));
    expect(slabValue({ ...copy, grade: null })).toBe(0);
  });

  it('sells a slab for its value, takes it off the shelf and out of the report', () => {
    const { save, uid } = withCopy('TQQ01-010', 'prism');
    const graded = submitForGrading(save, uid, NOW).save;
    const shown = withShowcase(graded, [uid], NOW);
    const sold = sellSlab(shown, uid, NOW + 1);
    expect(sold.save.collection).toEqual([]);
    expect(sold.save.showcase).toEqual([]);
    expect(sold.save.player.yen).toBe(shown.player.yen + sold.yen);
    expect(() => sellSlab(sold.save, uid, NOW)).toThrow(GradingError);
    expect(() => sellSlab(save, uid, NOW)).toThrow(/not a graded card/);
    expect(populationReport(sold.save.collection)).toEqual([]);
  });

  it('counts the slabs by score, best first', () => {
    let save = newSaveGame('population', NOW);
    save = { ...save, player: { yen: 100_000 } };
    const uids: string[] = [];
    for (let index = 0; index < 8; index += 1) {
      const added = addOwnedCard(save, 'TQQ01-001', 'standard', 'pack', NOW);
      save = added.save;
      uids.push(added.owned.uid);
    }
    for (const uid of uids.slice(0, 6)) {
      save = submitForGrading(save, uid, NOW).save;
    }
    const report = populationReport(save.collection);
    expect(report.reduce((sum, row) => sum + row.count, 0)).toBe(6);
    expect(report.map((row) => row.overall)).toEqual([...report.map((row) => row.overall)].sort((a, b) => b - a));
    expect(STARTING_YEN).toBeGreaterThan(0);

    const slabs = slabsOf(save.collection);
    expect(slabs).toHaveLength(6);
    expect(slabs.map((copy) => copy.grade?.overall ?? 0)).toEqual([...slabs.map((copy) => copy.grade?.overall ?? 0)].sort((a, b) => b - a));
    const raw = rawCopies(save.collection);
    expect(raw.map((copy) => copy.uid).sort()).toEqual(uids.slice(6).sort());
  });
});
