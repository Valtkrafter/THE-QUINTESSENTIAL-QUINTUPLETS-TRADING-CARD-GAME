// A report on the pack economy, for the person who tunes `src/data/packs.json`. It plays many packs and prints what a player
// would see: the chance of good cards, the packs and the yen it takes to get them, how long the whole set takes.
// Run it with: SIM=1 npx vitest run src/packs/economy.report --reporter=verbose

import { describe, it } from 'vitest';
import { PACKS } from './catalog';
import { guaranteesOf, oneIn, orBetter } from './odds';
import { simulateBanner, simulateCollecting, simulatePacks } from './simulate';

const TODAY = '2026-10-12';
const RUN = process.env['SIM'] === undefined ? it.skip : it;

function line(columns: readonly (string | number)[]): string {
  return columns.map((column) => String(column).padEnd(14)).join('');
}

describe('the pack economy', () => {
  RUN('prints what each pack gives and what it costs', () => {
    const rows: string[] = [line(['pack', 'price', 'RR+', 'AR+', 'SAR+', 'UR', 'SAR+ avg', 'UR avg', 'yen/SAR+', 'yen/UR'])];
    for (const pack of PACKS) {
      const g = guaranteesOf(pack);
      rows.push(
        line([
          pack.id,
          pack.price,
          `1/${oneIn(orBetter(pack, 'RR')).toFixed(1)}`,
          `1/${oneIn(orBetter(pack, 'AR')).toFixed(1)}`,
          `1/${oneIn(orBetter(pack, 'SAR')).toFixed(0)}`,
          `1/${oneIn(orBetter(pack, 'UR')).toFixed(0)}`,
          g.sar.average.toFixed(1),
          g.ur.average.toFixed(1),
          Math.round(g.sar.average * pack.price),
          Math.round(g.ur.average * pack.price),
        ]),
      );
    }
    console.log(`\n${rows.join('\n')}`);
  });

  RUN('prints how long collecting takes with one kind of pack', { timeout: 300_000 }, () => {
    const rows: string[] = [line(['pack', 'firstSAR', 'firstUR', 'core', 'allAR', 'allSAR', 'allUR', 'all(packs)', 'all(yen)'])];
    for (const pack of PACKS.filter((entry) => entry.banner === undefined)) {
      const report = simulateCollecting(pack.id, 150, `collect-${pack.id}`, TODAY, 4000);
      const cell = (value: { readonly median: number; readonly p90: number }) => `${value.median}/${value.p90}`;
      rows.push(
        line([
          pack.id,
          cell(report.firstSar),
          cell(report.firstUr),
          pack.id === 'booster' ? cell(report.core) : '-',
          cell(report.allAr),
          cell(report.allSar),
          cell(report.allUr),
          cell(report.all),
          `${Math.round((report.all.median * pack.price) / 1000)}k/${Math.round((report.all.p90 * pack.price) / 1000)}k`,
        ]),
      );
    }
    console.log(`\n(median/9 in 10 players, in packs)\n${rows.join('\n')}`);
  });

  RUN('prints the average pack', () => {
    for (const pack of PACKS) {
      const report = simulatePacks(pack.id, 30_000, `avg-${pack.id}`, TODAY);
      console.log(
        `\n${pack.id}: cards per pack ${Object.entries(report.perPack)
          .map(([rarity, value]) => `${rarity} ${value.toFixed(2)}`)
          .join('  ')}\n  special finish ${(report.chance.specialFinish * 100).toFixed(0)}%, premium finish ${(report.chance.premiumFinish * 100).toFixed(0)}%, guarantee fired: SAR ${(report.guarantee.sar * 100).toFixed(1)}% UR ${(report.guarantee.ur * 100).toFixed(1)}%`,
      );
    }
  });

  RUN('prints the banner', () => {
    for (const packsPerRun of [25, 50, 75]) {
      const report = simulateBanner('halloween', 2000, packsPerRun, `banner-${packsPerRun}`, TODAY);
      console.log(
        `\nbanner after ${packsPerRun} packs: banner cards ${report.averageHits.toFixed(2)}, featured ${report.averageMains.toFixed(2)}, at least one ${(report.atLeastOne * 100).toFixed(0)}%, featured ${(report.atLeastOneMain * 100).toFixed(0)}%, packs per card ${report.packsPerHit.toFixed(1)}`,
      );
    }
  });
});
