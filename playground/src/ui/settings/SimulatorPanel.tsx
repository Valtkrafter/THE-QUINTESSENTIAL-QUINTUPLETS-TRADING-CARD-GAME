// A development tool: opens thousands of packs at once with the real rules and shows what comes out, so the published
// odds and the pace of collecting can be checked with numbers. Only the development build shows it.

import { useState } from 'react';
import { RARITIES } from '../../cards/model';
import { PACKS } from '../../packs/catalog';
import {
  simulateBanner,
  simulateCollecting,
  simulatePacks,
  type BannerReport,
  type CollectingReport,
  type PackStatistics,
} from '../../packs/simulate';
import { Button } from '../components/controls';
import { text } from '../text';
import styles from './SimulatorPanel.module.css';

interface Report {
  readonly packs: PackStatistics;
  readonly collecting: CollectingReport;
  readonly banner: BannerReport | null;
}

const PERCENT = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });
const DECIMAL = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });
const BANNER_PACKS = 75;

function percent(share: number): string {
  return `${PERCENT.format(share * 100)} %`;
}

function run(): Report {
  const bannerDay = PACKS.find((pack) => pack.banner !== undefined)?.banner?.from ?? '2026-10-12';
  return {
    packs: simulatePacks('booster', 50_000, 'dev-simulation', bannerDay),
    collecting: simulateCollecting('booster', 300, 'dev-simulation', bannerDay),
    banner: PACKS.some((pack) => pack.id === 'halloween') ? simulateBanner('halloween', 1500, BANNER_PACKS, 'dev-simulation', bannerDay) : null,
  };
}

export function SimulatorPanel() {
  const [report, setReport] = useState<Report | null>(null);
  const [running, setRunning] = useState(false);

  const start = () => {
    setRunning(true);
    // Let the screen show "running" before the calculation blocks it for a moment.
    window.setTimeout(() => {
      setReport(run());
      setRunning(false);
    }, 40);
  };

  return (
    <div className={styles.panel}>
      <h3>{text.settings.simulator}</h3>
      <p className={styles.hint}>{text.settings.simulatorHint}</p>
      <div>
        <Button onClick={start} disabled={running}>
          {running ? text.settings.simulatorRunning : text.settings.simulatorRun}
        </Button>
      </div>
      {report !== null && (
        <div className={styles.tables}>
          <section>
            <h4>{text.settings.simPerPack}</h4>
            <table>
              <tbody>
                {RARITIES.map((rarity) => (
                  <tr key={rarity.id}>
                    <th scope="row">{rarity.id}</th>
                    <td>{DECIMAL.format(report.packs.perPack[rarity.id])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section>
            <h4>{text.settings.simChances}</h4>
            <table>
              <tbody>
                {(Object.keys(report.packs.chance) as (keyof PackStatistics['chance'])[]).map((key) => (
                  <tr key={key}>
                    <th scope="row">{text.settings.simChanceNames[key]}</th>
                    <td>{percent(report.packs.chance[key])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className={styles.hint}>{text.settings.simGuarantee(percent(report.packs.guarantee.sar), percent(report.packs.guarantee.ur))}</p>
          </section>
          <section>
            <h4>{text.settings.simCollecting}</h4>
            <table>
              <tbody>
                {(Object.keys(text.settings.simGoals) as (keyof typeof text.settings.simGoals)[]).map((key) => (
                  <tr key={key}>
                    <th scope="row">{text.settings.simGoals[key]}</th>
                    <td>
                      {report.collecting[key].median} / {report.collecting[key].p90}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          {report.banner !== null && (
            <section>
              <h4>{text.settings.simBanner(BANNER_PACKS)}</h4>
              <table>
                <tbody>
                  <tr>
                    <th scope="row">{text.settings.simBannerLines.packsPerHit}</th>
                    <td>{DECIMAL.format(report.banner.packsPerHit)}</td>
                  </tr>
                  <tr>
                    <th scope="row">{text.settings.simBannerLines.averageHits}</th>
                    <td>{DECIMAL.format(report.banner.averageHits)}</td>
                  </tr>
                  <tr>
                    <th scope="row">{text.settings.simBannerLines.averageMains}</th>
                    <td>{DECIMAL.format(report.banner.averageMains)}</td>
                  </tr>
                  <tr>
                    <th scope="row">{text.settings.simBannerLines.atLeastOne}</th>
                    <td>{percent(report.banner.atLeastOne)}</td>
                  </tr>
                  <tr>
                    <th scope="row">{text.settings.simBannerLines.atLeastOneMain}</th>
                    <td>{percent(report.banner.atLeastOneMain)}</td>
                  </tr>
                  <tr>
                    <th scope="row">{text.settings.simBannerLines.atLeastTwo}</th>
                    <td>{percent(report.banner.atLeastTwo)}</td>
                  </tr>
                </tbody>
              </table>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
