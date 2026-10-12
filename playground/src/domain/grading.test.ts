import { describe, expect, it } from 'vitest';
import { cardById } from '../cards/catalog';
import {
  GRADE_BANDS,
  GRADING_FEE_YEN,
  GradingError,
  LADDER_SCORES,
  eyeCheck,
  gradeBand,
  gradeChances,
  gradeLabel,
  gradeLadder,
  gradeMarks,
  gradeMultiplier,
  gradeOutlook,
  gradingFee,
  hiddenFlawChance,
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

  it('stays the same for marks with a rounding error: whole tenths decide', () => {
    expect(overallGrade({ centering: 9.1, corners: 9.0, edges: 8.9, surface: 9.0 })).toBe(9);
    expect(overallGrade({ centering: 9.7 + 0.0000001, corners: 9.7, edges: 9.8, surface: 9.8 })).toBe(10);
    expect(overallGrade({ centering: 9.75, corners: 9.75, edges: 9.75, surface: 9.75 })).toBe(10);
  });

  it('is rare to score high: a few cards in a hundred reach 9.5, and only the cleanest look-alikes reach 10', () => {
    const rng = createRng('population');
    const total = 60000;
    let nine = 0;
    let nineAndAHalf = 0;
    let ten = 0;
    let eight = 0;
    for (let index = 0; index < total; index += 1) {
      const grade = overallGrade(gradeMarks(rollCondition(rng), rng));
      nine += grade >= 9 ? 1 : 0;
      nineAndAHalf += grade >= 9.5 ? 1 : 0;
      ten += grade >= 10 ? 1 : 0;
      eight += grade >= 8 ? 1 : 0;
    }
    // About one card in seven is a 9 or better, one in sixty a 9.5, one in a thousand a 10; most cards are 8 to 8.5.
    expect(nine / total).toBeGreaterThan(0.1);
    expect(nine / total).toBeLessThan(0.18);
    expect(nineAndAHalf / total).toBeGreaterThan(0.008);
    expect(nineAndAHalf / total).toBeLessThan(0.028);
    expect(ten / total).toBeLessThan(0.004);
    expect(eight / total).toBeGreaterThan(0.55);
    expect(eight / total).toBeLessThan(0.72);
  });

  it('gives a card that looks perfect much better odds, but never a sure thing', () => {
    const rng = createRng('clean-looking');
    let cards = 0;
    let nine = 0;
    let nineAndAHalf = 0;
    let ten = 0;
    for (let index = 0; index < 200000; index += 1) {
      const condition = rollCondition(rng);
      const grade = overallGrade(gradeMarks(condition, rng));
      if (eyeCheck(condition) === 'perfect') {
        cards += 1;
        nine += grade >= 9 ? 1 : 0;
        nineAndAHalf += grade >= 9.5 ? 1 : 0;
        ten += grade >= 10 ? 1 : 0;
      }
    }
    expect(cards / 200000).toBeGreaterThan(0.03);
    expect(cards / 200000).toBeLessThan(0.08);
    expect(nine / cards).toBeGreaterThan(0.6);
    expect(nine / cards).toBeLessThan(0.8);
    expect(nineAndAHalf / cards).toBeGreaterThan(0.18);
    expect(nineAndAHalf / cards).toBeLessThan(0.34);
    expect(ten / cards).toBeGreaterThan(0.012);
    expect(ten / cards).toBeLessThan(0.05);
  });

  it('adds more to the value the higher it is, and a low score is worth less than a raw copy', () => {
    const steps = [10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 1].map(gradeMultiplier);
    for (let index = 1; index < steps.length; index += 1) {
      expect(steps[index] ?? 0).toBeLessThanOrEqual(steps[index - 1] ?? 0);
    }
    expect(gradeMultiplier(10)).toBe(10);
    expect(gradeMultiplier(9)).toBeGreaterThan(1);
    // Below an 8.5 the case is worth less than the loose card was: grading can lose money.
    expect(gradeMultiplier(8)).toBeLessThan(1);
    expect(gradeMultiplier(6.5)).toBeLessThan(0.5);
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
    expect(ladder[0]?.yen).toBe(Math.round(sellPrice('UR', 'gold') * 10));
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
    const marks = copy?.grade?.sub ?? flat(1);
    expect(copy?.grade?.overall).toBe(overallGrade(marks));
    // The graders never give more than what shows.
    for (const part of ['centering', 'corners', 'edges', 'surface'] as const) {
      expect(marks[part]).toBeLessThanOrEqual(copy?.condition[part] ?? 0);
      expect(marks[part]).toBeGreaterThanOrEqual(1);
    }
    expect(copy?.grade?.gradedAt).toBe(NOW + 1);
    expect(save.collection[0]?.grade).toBeNull();
  });

  it('is decided by the dice of the save: the same save gives the same marks, and the dice move on', () => {
    const { save, uid } = withCopy('TQQ01-010', 'gold');
    const a = submitForGrading(save, uid, NOW).grade;
    const b = submitForGrading(save, uid, NOW).grade;
    expect(a).toEqual(b);
    expect(submitForGrading(save, uid, NOW).save.rng).not.toEqual(save.rng);
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

describe('what to expect before a card is sent in', () => {
  it('has chances that add up to one, for any condition', () => {
    for (const condition of [flat(10), flat(9.3), flat(7), flat(1), { centering: 9.9, corners: 6.2, edges: 8.8, surface: 10 }]) {
      const total = [...gradeChances(condition).values()].reduce((sum, chance) => sum + chance, 0);
      expect(total).toBeCloseTo(1, 9);
    }
  });

  it('finds the same chances as the graders play (Monte Carlo), whatever the card looks like', () => {
    const rng = createRng('outlook-dice');
    const rolls = 120000;
    for (const condition of [flat(10), flat(9.4), { centering: 9.8, corners: 8.1, edges: 9.5, surface: 7.2 }, flat(2.5)]) {
      const counted = new Map<number, number>();
      for (let index = 0; index < rolls; index += 1) {
        const score = overallGrade(gradeMarks(condition, rng));
        counted.set(score, (counted.get(score) ?? 0) + 1);
      }
      const exact = gradeChances(condition);
      for (const score of new Set([...counted.keys(), ...exact.keys()])) {
        expect(Math.abs((counted.get(score) ?? 0) / rolls - (exact.get(score) ?? 0)), `${JSON.stringify(condition)} score ${score}`).toBeLessThan(0.006);
      }
    }
  });

  it('makes hidden flaws likelier the more wear shows', () => {
    expect(hiddenFlawChance(10)).toBeCloseTo(0.5, 10);
    expect(hiddenFlawChance(8)).toBeGreaterThan(hiddenFlawChance(9));
    expect(hiddenFlawChance(1)).toBeLessThanOrEqual(0.92);
    expect(gradeChances(flat(10)).get(10) ?? 0).toBeGreaterThan(0.05);
    expect(gradeChances(flat(8)).get(10) ?? 0).toBe(0);
  });

  it('names how a card looks from the wear that shows', () => {
    expect(eyeCheck(flat(10))).toBe('perfect');
    expect(eyeCheck(flat(9.2))).toBe('clean');
    expect(eyeCheck(flat(8.4))).toBe('worn');
    expect(eyeCheck(flat(6))).toBe('battered');
  });

  it('lists a row for every score on the ladder, with a chance and a price, and the last row stands for 6.5 or less', () => {
    const outlook = gradeOutlook(flat(8.4), 'UR', 'gold');
    expect(outlook.rows.map((row) => row.score)).toEqual([...LADDER_SCORES]);
    const shown = outlook.rows.reduce((sum, row) => sum + row.chance, 0);
    expect(shown).toBeCloseTo(1, 9);
    expect(outlook.rows.map((row) => row.yen)).toEqual(gradeLadder('UR', 'gold').map((row) => row.yen));
    expect(outlook.fee).toBe(GRADING_FEE_YEN.UR);
    expect(outlook.loose).toBe(sellPrice('UR', 'gold'));
    expect(outlook.edge).toBeCloseTo(outlook.expected - outlook.loose - outlook.fee, 9);
  });

  it('calls a Common a bad bet whatever it looks like, and the cleanest top card a good one', () => {
    expect(gradeOutlook(flat(10), 'C', 'standard').verdict).toBe('bad');
    expect(gradeOutlook(flat(10), 'R', 'standard').verdict).toBe('bad');
    expect(gradeOutlook(flat(10), 'UR', 'gold').verdict).toMatch(/great|good/);
    expect(gradeOutlook(flat(7.5), 'UR', 'gold').verdict).toBe('bad');
    expect(gradeOutlook(flat(10), 'UR', 'gold').ten).toBeGreaterThan(gradeOutlook(flat(9), 'UR', 'gold').ten);
    expect(gradeOutlook(flat(10), 'UR', 'gold').nineOrBetter).toBeGreaterThan(0.7);
  });
});
