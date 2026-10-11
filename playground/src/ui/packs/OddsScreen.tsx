// The published odds. Everything on this page is computed from the same pack data the opening uses, so what is written
// here cannot drift away from what really happens. It answers three questions in this order: how do the packs compare,
// what is in one pack, and how long does bad luck last (and for the Halloween cards: how many packs do I need).

import { useMemo, type CSSProperties } from 'react';
import { Link, useLocation } from 'wouter';
import { cardById } from '../../cards/catalog';
import { RARITIES, RARITY_IDS, type Rarity } from '../../cards/model';
import { PACKS, packById } from '../../packs/catalog';
import { bannerOdds, finishOdds, guaranteesOf, orBetter, packsForShare, rarityOdds, shareAfter, type BannerOdds } from '../../packs/odds';
import { isAvailable, normalPool } from '../../packs/rollPack';
import type { PackDefinition, RarityTable, SlotRole } from '../../packs/schema';
import { CardFace } from '../components/CardFace';
import { Segmented } from '../components/controls';
import { ArrowLeftIcon } from '../components/icons';
import { PageHeader } from '../components/PageHeader';
import { formatYen } from '../format';
import { useToday } from '../hooks/useToday';
import { LOCALE } from '../locale';
import { text } from '../text';
import { PackArt } from './PackArt';
import { isEveryPack, oneInNumber, percentText, roundedYen } from './oddsFormat';
import styles from './OddsScreen.module.css';

const DATE = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long' });

function dayLabel(key: string): string {
  const [year, month, day] = key.split('-').map(Number);
  return DATE.format(new Date(year ?? 2026, (month ?? 1) - 1, day ?? 1));
}

/** "1 in 13", or "every pack" when it is as good as certain. */
function oneInText(chance: number): string {
  if (isEveryPack(chance)) {
    return text.odds.chance.always;
  }
  return chance >= 0.8 ? text.odds.chance.almostAlways : text.odds.chance.oneIn(oneInNumber(chance));
}

const COMPARED: readonly { readonly key: 'rr' | 'ar' | 'sar' | 'ur'; readonly rarity: Rarity }[] = [
  { key: 'rr', rarity: 'RR' },
  { key: 'ar', rarity: 'AR' },
  { key: 'sar', rarity: 'SAR' },
  { key: 'ur', rarity: 'UR' },
];

/** The packs side by side: the table that answers "which pack is for what". */
function Compare({ packs }: { readonly packs: readonly PackDefinition[] }) {
  const copy = text.odds.compare;
  const bannerPack = packs.find((pack) => pack.banner !== undefined);
  const banner = useMemo(() => (bannerPack?.banner === undefined ? null : bannerOdds(bannerPack.banner)), [bannerPack]);
  return (
    <section className={styles.card} aria-labelledby="odds-compare">
      <h2 id="odds-compare">{copy.title}</h2>
      <div className={styles.scroll}>
        <table className={styles.compare}>
          <thead>
            <tr>
              <td />
              {packs.map((pack) => (
                <th key={pack.id} scope="col">
                  <Link href={`/packs/odds/${pack.id}`}>{pack.name}</Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">{copy.row.price}</th>
              {packs.map((pack) => (
                <td key={pack.id}>
                  <strong>{formatYen(pack.price)}</strong>
                </td>
              ))}
            </tr>
            {COMPARED.map(({ key, rarity }) => (
              <tr key={key}>
                <th scope="row">{copy.row[key]}</th>
                {packs.map((pack) => {
                  const chance = orBetter(pack, rarity);
                  return (
                    <td key={pack.id}>
                      <strong>{isEveryPack(chance) ? copy.every : copy.oneIn(oneInNumber(chance))}</strong>
                      <span>{percentText(chance)}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <th scope="row">{copy.row.sarSure}</th>
              {packs.map((pack) => (
                <td key={pack.id}>{copy.byPack(pack.pity.sar.after)}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">{copy.row.urSure}</th>
              {packs.map((pack) => (
                <td key={pack.id}>{copy.byPack(pack.pity.ur.after)}</td>
              ))}
            </tr>
            {bannerPack !== undefined && banner !== null && (
              <tr>
                <th scope="row">{copy.row.halloween}</th>
                {packs.map((pack) =>
                  pack.banner === undefined ? (
                    <td key={pack.id}>–</td>
                  ) : (
                    <td key={pack.id}>
                      <strong>{copy.oneIn(oneInNumber(pack.banner.hit.base))}</strong>
                      <span>{copy.halloweenAverage(Math.round(banner.averagePacks), pack.banner.hit.hard)}</span>
                    </td>
                  ),
                )}
              </tr>
            )}
            <tr>
              <th scope="row">{copy.row.finish}</th>
              {packs.map((pack) => (
                <td key={pack.id}>{copy.finish(pack.finishLean)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className={styles.note}>{copy.note}</p>
    </section>
  );
}

/** Every kind of card the pack can hold, with the chance that a pack holds one. */
function Contents({ pack }: { readonly pack: PackDefinition }) {
  const copy = text.odds.chance;
  const odds = useMemo(() => rarityOdds(pack), [pack]);
  const rows = RARITIES.filter((rarity) => odds[rarity.id].chance > 0);
  const best = Math.max(...rows.map((rarity) => odds[rarity.id].chance));
  return (
    <section className={styles.card} aria-labelledby="odds-contents">
      <h2 id="odds-contents">{copy.title}</h2>
      <p className={styles.lead}>{copy.lead(pack.name)}</p>
      <div className={styles.scroll}>
        <table className={styles.contents}>
          <thead>
            <tr>
              <th scope="col">{copy.columns.kind}</th>
              <th scope="col">{copy.columns.chance}</th>
              <th scope="col" className={styles.hideSmall}>
                {copy.columns.average}
              </th>
              <th scope="col" className={styles.hideSmall}>
                {copy.columns.designs}
              </th>
            </tr>
          </thead>
          <tbody>
            {[...rows].reverse().map((rarity) => {
              const entry = odds[rarity.id];
              return (
                <tr key={rarity.id}>
                  <th scope="row">
                    <b>{rarity.id}</b> {rarity.label}
                  </th>
                  <td>
                    <div className={styles.chanceCell}>
                      <span className={styles.bar} aria-hidden="true">
                        <i style={{ width: `${Math.max(2, (entry.chance / best) * 100)}%` }} data-rarity={rarity.id} />
                      </span>
                      <strong>{percentText(entry.chance)}</strong>
                      <span className={styles.oneIn}>{oneInText(entry.chance)}</span>
                    </div>
                  </td>
                  <td className={`${styles.number} ${styles.hideSmall}`}>{entry.average < 0.1 ? entry.average.toFixed(2) : entry.average.toFixed(1)}</td>
                  <td className={`${styles.small} ${styles.hideSmall}`}>{copy.designs(normalPool(rarity.id).length)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className={styles.note}>{copy.explain}</p>
    </section>
  );
}

/** What the guarantees do, in packs and in yen. */
function Guarantees({ pack }: { readonly pack: PackDefinition }) {
  const copy = text.odds.guarantee;
  const guarantees = useMemo(() => guaranteesOf(pack), [pack]);
  const kinds = [
    { key: 'sar', label: copy.sar, odds: guarantees.sar },
    { key: 'ur', label: copy.ur, odds: guarantees.ur },
  ] as const;
  return (
    <section className={styles.card} aria-labelledby="odds-guarantee">
      <h2 id="odds-guarantee">{copy.title}</h2>
      <p className={styles.lead}>{copy.lead}</p>
      <div className={styles.tiles}>
        {kinds.map(({ key, label, odds }) => (
          <div key={key} className={styles.tile}>
            <h3>{label}</h3>
            <p className={styles.big}>{copy.sure(odds.sureAt)}</p>
            <p>{copy.explain(odds.sureAt)}</p>
            <p>{copy.average(Math.round(odds.average), roundedYen(odds.average * pack.price))}</p>
            <p>{copy.nineInTen(odds.nineInTen)}</p>
          </div>
        ))}
      </div>
      <ul className={styles.bullets}>
        <li>{copy.share(pack.pity.sar.urShare)}</li>
        <li>{copy.duplicate}</li>
        <li>{copy.own}</li>
      </ul>
    </section>
  );
}

const TIERS = ['plain', 'foil', 'premium'] as const;

function Finishes({ pack }: { readonly pack: PackDefinition }) {
  const copy = text.odds.finish;
  return (
    <details className={styles.card}>
      <summary>
        <h2>{copy.title}</h2>
      </summary>
      <p className={styles.lead}>{copy.lead}</p>
      <p className={styles.lead}>{copy.lean(pack.finishLean)}</p>
      <div className={styles.scroll}>
        <table className={styles.plainTable}>
          <thead>
            <tr>
              <th scope="col" />
              {TIERS.map((tier) => (
                <th key={tier} scope="col">
                  {copy.columns[tier]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RARITIES.map((rarity) => {
              const chances = finishOdds(pack, rarity.id);
              return (
                <tr key={rarity.id}>
                  <th scope="row">
                    <b>{rarity.id}</b> {rarity.label}
                  </th>
                  {TIERS.map((tier) => (
                    <td key={tier} className={styles.number}>
                      {percentText(chances[tier])}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** Tables of the same slot role are shown once. */
function slotTables(pack: PackDefinition): readonly { readonly role: SlotRole; readonly table: RarityTable; readonly count: number }[] {
  return (['basic', 'plus', 'hit'] as const).flatMap((role) => {
    const slots = pack.slots.filter((slot) => slot.role === role);
    const first = slots[0];
    return first === undefined ? [] : [{ role, table: first.table, count: slots.length }];
  });
}

function Slots({ pack }: { readonly pack: PackDefinition }) {
  const copy = text.odds.slots;
  return (
    <details className={styles.card}>
      <summary>
        <h2>{copy.title}</h2>
      </summary>
      <p className={styles.lead}>{copy.lead}</p>
      <div className={styles.slotGrid}>
        {slotTables(pack).map(({ role, table }) => {
          const total = RARITY_IDS.reduce((sum, rarity) => sum + (table[rarity] ?? 0), 0);
          return (
            <section key={role} className={styles.slot}>
              <h3>{copy.slot[role]}</h3>
              <p className={styles.note}>
                {copy.slotNote[role]}
                {role === 'plus' && pack.banner !== undefined ? ` ${copy.bannerPlus}` : ''}
              </p>
              <table className={styles.plainTable}>
                <tbody>
                  {RARITIES.filter((rarity) => table[rarity.id] !== undefined).map((rarity) => (
                    <tr key={rarity.id}>
                      <th scope="row">
                        <b>{rarity.id}</b> {rarity.label}
                      </th>
                      <td className={styles.number}>{percentText((table[rarity.id] ?? 0) / total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })}
      </div>
    </details>
  );
}

const ROWS_STEP = 10;

/** The Halloween cards: how likely, how long it takes, which cards are featured. */
function Banner({ pack, odds }: { readonly pack: PackDefinition; readonly odds: BannerOdds }) {
  const banner = pack.banner;
  const copy = text.odds.banner;
  if (banner === undefined) {
    return null;
  }
  const guarantee = banner.hit.hard;
  const counts = Array.from({ length: Math.ceil(guarantee / ROWS_STEP) }, (_, index) => Math.min(guarantee, (index + 1) * ROWS_STEP));
  const half = packsForShare(odds, 'any', 0.5);
  const nine = packsForShare(odds, 'any', 0.9);
  return (
    <section className={styles.card} aria-labelledby="odds-banner">
      <h2 id="odds-banner">{copy.title}</h2>
      <p className={styles.lead}>{copy.lead(10, dayLabel(banner.to))}</p>
      <div className={styles.tiles}>
        <div className={styles.tile}>
          <h3>{copy.chance.title}</h3>
          <p className={styles.big}>{percentText(banner.hit.base)}</p>
          <p>{copy.chance.base(percentText(banner.hit.base), oneInNumber(banner.hit.base))}</p>
          <p>{copy.chance.soft(banner.hit.softFrom, percentText(banner.hit.softStep))}</p>
          <p>{copy.chance.hard(banner.hit.hard)}</p>
          <p>{copy.chance.average(Math.round(odds.averagePacks), roundedYen(odds.averagePacks * pack.price))}</p>
          <p>{copy.chance.spread(half, nine)}</p>
        </div>
        <div className={styles.tile}>
          <h3>{copy.featured.title}</h3>
          <p className={styles.big}>{Math.round(banner.mainShare * 100)}%</p>
          <p>{copy.featured.lead}</p>
          <p>{copy.featured.average(Math.round(odds.averageFeatured), roundedYen(odds.averageFeatured * pack.price))}</p>
        </div>
      </div>

      <h3 className={styles.sub}>{copy.table.title}</h3>
      <p className={styles.lead}>{copy.table.lead}</p>
      <div className={styles.scroll}>
        <table className={styles.plainTable}>
          <thead>
            <tr>
              <th scope="col">{copy.table.columns.packs}</th>
              <th scope="col">{copy.table.columns.any}</th>
              <th scope="col">{copy.table.columns.featured}</th>
            </tr>
          </thead>
          <tbody>
            {counts.map((count) => (
              <tr key={count}>
                <th scope="row">
                  {count} <span className={styles.small}>({copy.table.cost(count * pack.price)})</span>
                </th>
                <td className={styles.number}>{percentText(shareAfter(odds, count, 'any'))}</td>
                <td className={styles.number}>{percentText(shareAfter(odds, count, 'featured'))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className={styles.sub}>{copy.phases}</h3>
      <p className={styles.note}>{copy.window(dayLabel(banner.from), dayLabel(banner.to))}</p>
      <ul className={styles.phases}>
        {banner.phases.map((phase, index) => (
          <li key={phase.from}>
            <p>{copy.phase(index + 1, dayLabel(phase.from), dayLabel(phase.to))}</p>
            <div className={styles.faces}>
              {phase.mains.map((id) => {
                const card = cardById(id);
                return card === undefined ? null : (
                  <span key={id} className={styles.face}>
                    <CardFace card={card} finish="standard" />
                    <small>{card.name.en.split(' ')[0]}</small>
                  </span>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
      <p className={styles.note}>{copy.keep}</p>
    </section>
  );
}

function PackDetails({ pack }: { readonly pack: PackDefinition }) {
  const odds = useMemo(() => (pack.banner === undefined ? null : bannerOdds(pack.banner)), [pack]);
  return (
    <div className={styles.details}>
      <header className={styles.packHead}>
        <div className={styles.art} style={{ '--pack-w': '86px' } as CSSProperties}>
          <PackArt kind={pack.art} still />
        </div>
        <div>
          <h2>{pack.name}</h2>
          <p className={styles.lead}>{pack.tagline}</p>
          <p className={styles.price}>
            <strong>{text.odds.price(pack.price)}</strong> · {text.odds.cards}
          </p>
        </div>
      </header>
      {odds !== null && <Banner pack={pack} odds={odds} />}
      <Contents pack={pack} />
      <Guarantees pack={pack} />
      <Finishes pack={pack} />
      <Slots pack={pack} />
    </div>
  );
}

export default function OddsScreen({ packId }: { readonly packId?: string | undefined }) {
  const today = useToday();
  const [, navigate] = useLocation();
  const shown = useMemo(() => PACKS.filter((pack) => isAvailable(pack, today)), [today]);
  // The first pack of the list is the one running now with a banner; fall back to the first pack on sale.
  const selected = packById(packId ?? '') ?? shown[0] ?? PACKS[0];
  return (
    <>
      <Link href="/packs" className={styles.back}>
        <ArrowLeftIcon size={16} />
        {text.odds.back}
      </Link>
      <PageHeader title={text.odds.title} subtitle={text.odds.subtitle} />
      <div className={styles.page}>
        <Compare packs={shown} />
        <section className={styles.chooser} aria-label={text.odds.choose}>
          <h2>{text.odds.choose}</h2>
          <Segmented
            value={selected?.id ?? ''}
            onChange={(id) => navigate(`/packs/odds/${id}`, { replace: true })}
            label={text.odds.choose}
            options={shown.map((pack) => ({ value: pack.id, label: pack.name }))}
          />
        </section>
        {selected !== undefined && <PackDetails key={selected.id} pack={selected} />}
      </div>
    </>
  );
}
