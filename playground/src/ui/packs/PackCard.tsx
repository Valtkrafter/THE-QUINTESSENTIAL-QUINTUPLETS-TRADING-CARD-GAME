import { useMemo, type CSSProperties } from 'react';
import { Link } from 'wouter';
import { cardById } from '../../cards/catalog';
import { daysBetween, type DayKey } from '../../domain/calendar';
import type { SaveGame } from '../../domain/save';
import { bannerOdds, orBetter } from '../../packs/odds';
import { pityStatus } from '../../packs/openPack';
import { activePhase } from '../../packs/rollPack';
import type { PackDefinition } from '../../packs/schema';
import { CardFace } from '../components/CardFace';
import { Button } from '../components/controls';
import { cx, formatYen } from '../format';
import { text } from '../text';
import { isEveryPack, oneInNumber, percentText } from './oddsFormat';
import { PackArt } from './PackArt';
import styles from './PackCard.module.css';
import { PityMeter } from './PityMeter';

export interface PackCardProps {
  readonly pack: PackDefinition;
  readonly save: SaveGame;
  readonly today: DayKey;
  readonly onOpen: (count: number) => void;
}

const MANY = 5;

function BannerInfo({ pack, save, today }: Pick<PackCardProps, 'pack' | 'save' | 'today'>) {
  const banner = pack.banner;
  const odds = useMemo(() => (banner === undefined ? null : bannerOdds(banner)), [banner]);
  if (banner === undefined || odds === null) {
    return null;
  }
  const phase = activePhase(banner, today);
  const number = phase === undefined ? 0 : banner.phases.indexOf(phase) + 1;
  const sure = pityStatus(save, pack).banner?.mainSure ?? false;
  return (
    <>
      <p className={styles.badges}>
        <span className={styles.badge}>{text.packs.banner.badge}</span>
        {phase !== undefined && <span>{text.packs.banner.phase(number, banner.phases.length)}</span>}
        <span>{text.packs.banner.endsIn(daysBetween(today, banner.to))}</span>
      </p>
      {phase !== undefined && (
        <div className={styles.mains}>
          <p className={styles.mainsTitle}>{text.packs.banner.mains}</p>
          <ul>
            {phase.mains.map((id) => {
              const card = cardById(id);
              const owned = save.collection.some((copy) => copy.cardId === id);
              return card === undefined ? null : (
                <li key={id}>
                  <CardFace card={card} finish="standard" />
                  <span className={styles.mainName}>{card.name.en.split(' ')[0]}</span>
                  <span className={owned ? styles.owned : styles.missing}>{owned ? text.packs.banner.owned : text.packs.banner.main}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <p className={styles.rule}>{text.packs.banner.chance(percentText(banner.hit.base), Math.round(odds.averagePacks))}</p>
      <p className={styles.rule}>{sure ? text.packs.banner.sure : text.packs.banner.fifty}</p>
    </>
  );
}

/** Three numbers that tell the packs apart: how often a good card shows up in one pack. */
function Facts({ pack }: { readonly pack: PackDefinition }) {
  const rows = [
    { label: text.packs.facts.ar, chance: orBetter(pack, 'AR') },
    { label: text.packs.facts.sar, chance: orBetter(pack, 'SAR') },
    { label: text.packs.facts.ur, chance: orBetter(pack, 'UR') },
  ] as const;
  return (
    <dl className={styles.facts} aria-label={text.packs.facts.title}>
      {rows.map((row) => (
        <div key={row.label}>
          <dt>{row.label}</dt>
          <dd>{isEveryPack(row.chance) ? text.packs.facts.every : text.packs.facts.oneIn(oneInNumber(row.chance))}</dd>
        </div>
      ))}
    </dl>
  );
}

export function PackCard({ pack, save, today, onOpen }: PackCardProps) {
  const banner = pack.banner !== undefined;
  const status = pityStatus(save, pack);
  const yen = save.player.yen;
  const one = yen >= pack.price;
  const many = yen >= pack.price * MANY;
  const missing = one ? 0 : pack.price - yen;
  return (
    <article className={cx(styles.card, banner && styles.banner, pack.art === 'select' && styles.select, pack.art === 'premium' && styles.premium)} aria-label={pack.name}>
      <div className={styles.art} style={{ '--pack-w': '128px' } as CSSProperties}>
        <PackArt kind={pack.art} />
        <p className={styles.price}>{formatYen(pack.price)}</p>
      </div>
      <div className={styles.body}>
        <h2>{pack.name}</h2>
        <p className={styles.blurb}>{pack.tagline}</p>
        <BannerInfo pack={pack} save={save} today={today} />
        <Facts pack={pack} />
        <p className={styles.shiny}>{text.packs.facts.shiny(pack.finishLean)}</p>
        <div className={styles.meters}>
          {status.banner !== undefined && <PityMeter label={text.packs.pity.banner} count={status.banner.count} guaranteeAt={status.banner.hardAt} softFrom={status.banner.softFrom} />}
          <PityMeter label={text.packs.pity.sar} count={status.sar.count} guaranteeAt={status.sar.guaranteeAt} />
          <PityMeter label={text.packs.pity.ur} count={status.ur.count} guaranteeAt={status.ur.guaranteeAt} />
        </div>
        <div className={styles.actions}>
          <Button kind="primary" onClick={() => onOpen(1)} disabled={!one}>
            {text.packs.open(1)} · {formatYen(pack.price)}
          </Button>
          <Button onClick={() => onOpen(MANY)} disabled={!many}>
            {text.packs.open(MANY)} · {formatYen(pack.price * MANY)}
          </Button>
        </div>
        {!one && <p className={styles.missingYen}>{text.packs.missing(missing)}</p>}
        <Link href={`/packs/odds/${pack.id}`} className={styles.odds}>
          {text.packs.odds}
        </Link>
      </div>
    </article>
  );
}
