// The published odds. Everything on this page is computed from the same pack data the opening uses, so what is written
// here cannot drift away from what really happens.

import { Link } from 'wouter';
import { RARITIES, RARITY_IDS } from '../../cards/model';
import { PACKS } from '../../packs/catalog';
import { TIER_WEIGHTS } from '../../packs/finishWeights';
import { normalPool } from '../../packs/rollPack';
import type { PackDefinition, RarityTable, SlotRole } from '../../packs/schema';
import { ArrowLeftIcon } from '../components/icons';
import { PageHeader } from '../components/PageHeader';
import { LOCALE } from '../locale';
import { text } from '../text';
import styles from './OddsScreen.module.css';

const PERCENT = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });
const DATE = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long' });

function percent(value: number): string {
  return `${PERCENT.format(value)} %`;
}

function dayLabel(key: string): string {
  const [year, month, day] = key.split('-').map(Number);
  return DATE.format(new Date(year ?? 2026, (month ?? 1) - 1, day ?? 1));
}

/** Tables of the same slot role are shown once. */
function slotTables(pack: PackDefinition): readonly { readonly role: SlotRole; readonly table: RarityTable }[] {
  const seen = new Set<SlotRole>();
  return pack.slots.flatMap((slot) => {
    if (seen.has(slot.role)) {
      return [];
    }
    seen.add(slot.role);
    return [{ role: slot.role, table: slot.table }];
  });
}

function SlotTable({ role, table }: { readonly role: SlotRole; readonly table: RarityTable }) {
  const total = RARITY_IDS.reduce((sum, rarity) => sum + (table[rarity] ?? 0), 0);
  return (
    <section className={styles.slot}>
      <h3>{text.odds.slot[role]}</h3>
      <p className={styles.note}>{text.odds.slotNote[role]}</p>
      <table>
        <tbody>
          {RARITIES.filter((rarity) => table[rarity.id] !== undefined).map((rarity) => {
            const chance = ((table[rarity.id] ?? 0) / total) * 100;
            const designs = normalPool(rarity.id).length;
            return (
              <tr key={rarity.id}>
                <th scope="row">
                  <b>{rarity.id}</b> {rarity.label}
                </th>
                <td className={styles.number}>{percent(chance)}</td>
                <td className={styles.small}>
                  {text.odds.designs(designs)} · {text.odds.perDesign(percent(chance / Math.max(designs, 1)))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function FinishTable() {
  return (
    <section className={styles.finish}>
      <h3>{text.odds.finish}</h3>
      <p className={styles.note}>{text.odds.finishNote}</p>
      <table>
        <thead>
          <tr>
            <th scope="col" />
            <th scope="col">{text.odds.finishColumns.plain}</th>
            <th scope="col">{text.odds.finishColumns.foil}</th>
            <th scope="col">{text.odds.finishColumns.premium}</th>
          </tr>
        </thead>
        <tbody>
          {RARITIES.map((rarity) => {
            const weights = TIER_WEIGHTS[rarity.id];
            const total = weights.plain + weights.foil + weights.premium;
            return (
              <tr key={rarity.id}>
                <th scope="row">
                  <b>{rarity.id}</b>
                </th>
                {(['plain', 'foil', 'premium'] as const).map((tier) => (
                  <td key={tier} className={styles.number}>
                    {percent((weights[tier] / total) * 100)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function PackOdds({ pack }: { readonly pack: PackDefinition }) {
  const banner = pack.banner;
  return (
    <section className={styles.pack}>
      <header>
        <h2>{banner === undefined ? text.packs.booster.name : text.odds.bannerTitle}</h2>
        <p className={styles.note}>{text.odds.price(pack.price)}</p>
      </header>
      <div className={styles.slots}>
        {slotTables(pack).map(({ role, table }) => (
          <SlotTable key={role} role={role} table={table} />
        ))}
      </div>
      <section className={styles.rules}>
        <h3>{text.odds.pity}</h3>
        <ul>
          <li>{text.odds.pitySar(pack.pity.sar.after, pack.pity.sar.urShare)}</li>
          <li>{text.odds.pityUr(pack.pity.ur.after)}</li>
          <li>{text.odds.pityDuplicate}</li>
        </ul>
      </section>
      {banner !== undefined && (
        <section className={styles.rules}>
          <h3>{text.odds.bannerTitle}</h3>
          <ul>
            <li>{text.odds.bannerWindow(dayLabel(banner.from), dayLabel(banner.to))}</li>
            <li>{text.odds.bannerHit(percent(banner.hit.base * 100))}</li>
            <li>{text.odds.bannerSoft(banner.hit.softFrom, percent(banner.hit.softStep * 100))}</li>
            <li>{text.odds.bannerHard(banner.hit.hard)}</li>
            <li>{text.odds.bannerFifty(Math.round(banner.mainShare * 100))}</li>
          </ul>
          <h4>{text.odds.bannerPhases}</h4>
          <ul>
            {banner.phases.map((phase, index) => (
              <li key={phase.from}>
                {text.odds.bannerPhase(index + 1, dayLabel(phase.from), dayLabel(phase.to))}
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}

export default function OddsScreen() {
  return (
    <>
      <Link href="/packs" className={styles.back}>
        <ArrowLeftIcon size={16} />
        {text.odds.back}
      </Link>
      <PageHeader title={text.odds.title} subtitle={text.odds.subtitle} />
      <div className={styles.page}>
        {PACKS.map((pack) => (
          <PackOdds key={pack.id} pack={pack} />
        ))}
        <FinishTable />
      </div>
    </>
  );
}
