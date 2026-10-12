// A report on the grading economy, for the person who tunes `grading.ts`: how the scores of all cards are spread, how the
// scores of cards that look clean are spread, what grading is worth on average. Run it with:
//   SIM=1 npx vitest run src/domain/grading.report --reporter=verbose

import { describe, it } from 'vitest';
import { RARITY_IDS } from '../cards/model';
import { FINISH_MULTIPLIER, SELL_YEN } from './prices';
import { GRADING_FEE_YEN, LADDER_SCORES, gradeMarks, gradeMultiplier, overallGrade } from './grading';
import { rollCondition, type Condition } from './ownership';
import { createRng } from './random';

const RUN = process.env['SIM'] === undefined ? it.skip : it;
const TOTAL = 200_000;

function average(condition: Condition): number {
  return (condition.centering + condition.corners + condition.edges + condition.surface) / 4;
}

interface Tally {
  readonly scores: Map<number, number>;
  count: number;
  multiplier: number;
}

function tally(): Tally {
  return { scores: new Map(), count: 0, multiplier: 0 };
}

function add(into: Tally, score: number): void {
  into.scores.set(score, (into.scores.get(score) ?? 0) + 1);
  into.count += 1;
  into.multiplier += gradeMultiplier(score);
}

function atLeast(from: Tally, score: number): number {
  let total = 0;
  for (const [value, count] of from.scores) {
    total += value >= score ? count : 0;
  }
  return total / from.count;
}

function describe_(label: string, from: Tally): string {
  const share = (score: number) => `${(atLeast(from, score) * 100).toFixed(1)}%`;
  return `${label.padEnd(28)} n=${String(from.count).padEnd(7)} 10: ${share(10).padEnd(7)} >=9.5: ${share(9.5).padEnd(7)} >=9: ${share(9).padEnd(7)} >=8.5: ${share(8.5).padEnd(7)} >=8: ${share(8).padEnd(7)} >=7: ${share(7).padEnd(7)} avg factor ${(from.multiplier / from.count).toFixed(2)}`;
}

describe('the grading economy', () => {
  RUN('prints how the scores are spread', () => {
    const rng = createRng('grading-report');
    const everyone = tally();
    const clean = tally();
    const good = tally();
    const worn = tally();
    for (let i = 0; i < TOTAL; i += 1) {
      const condition = rollCondition(rng);
      const score = overallGrade(gradeMarks(condition, rng));
      add(everyone, score);
      const looks = average(condition);
      if (looks >= 9.6) {
        add(clean, score);
      } else if (looks >= 8.8) {
        add(good, score);
      } else if (looks < 7.5) {
        add(worn, score);
      }
    }
    console.log(
      `\n${[describe_('every card', everyone), describe_('looks clean (>= 9.6)', clean), describe_('looks good (8.8 - 9.6)', good), describe_('looks worn (< 7.5)', worn)].join('\n')}\n` +
        `share of cards that look clean: ${((clean.count / TOTAL) * 100).toFixed(1)}%`,
    );
  });

  RUN('prints what grading is worth on average, per kind of card', () => {
    const rng = createRng('grading-worth');
    const clean = tally();
    const typical = tally();
    for (let i = 0; i < TOTAL; i += 1) {
      const condition = rollCondition(rng);
      const score = overallGrade(gradeMarks(condition, rng));
      add(typical, score);
      if (average(condition) >= 9.6) {
        add(clean, score);
      }
    }
    const rows: string[] = ['rarity  finish   fee    raw   | typical card: slab (profit)   | clean card: slab (profit)'];
    for (const rarity of RARITY_IDS) {
      for (const [finish, factor] of [['plain', FINISH_MULTIPLIER.plain], ['premium', FINISH_MULTIPLIER.premium]] as const) {
        const raw = Math.max(1, Math.round(SELL_YEN[rarity] * factor));
        const fee = GRADING_FEE_YEN[rarity];
        const valueOf = (from: Tally) => (raw * from.multiplier) / from.count;
        const a = valueOf(typical);
        const b = valueOf(clean);
        rows.push(`${rarity.padEnd(7)} ${finish.padEnd(8)} ${String(fee).padEnd(6)} ${String(raw).padEnd(5)} | ${a.toFixed(0).padStart(6)} (${(a - raw - fee).toFixed(0).padStart(6)})        | ${b.toFixed(0).padStart(6)} (${(b - raw - fee).toFixed(0).padStart(6)})`);
      }
    }
    console.log(`\nprofit = slab value - the raw value you give up - the fee\n${rows.join('\n')}`);
    console.log(`\nladder: ${LADDER_SCORES.map((score) => `${score}:x${gradeMultiplier(score)}`).join('  ')}`);
  });
});
