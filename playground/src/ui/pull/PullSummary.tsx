import { useMemo } from 'react';
import { Link } from 'wouter';
import { RARITIES } from '../../cards/model';
import { buildDex, dexProgress } from '../../domain/collection';
import { findFinish } from '../../holo/finishes';
import type { PackOpening } from '../../packs/openPack';
import { isAvailable } from '../../packs/rollPack';
import { useSave } from '../../state/app';
import { CardFace } from '../components/CardFace';
import { Button } from '../components/controls';
import { FINISH_SWATCH } from '../finishStyle';
import { cx, formatYen } from '../format';
import { useToday } from '../hooks/useToday';
import { text } from '../text';
import styles from './PullSummary.module.css';
import { tierStyleOf } from './tierStyle';

export interface PullSummaryProps {
  readonly openings: readonly PackOpening[];
  /** A trial run: nothing was bought, so no "one more pack" and no Card-Dex line. */
  readonly preview: boolean;
  /** True when the 3D show could not run, so the player is told why the cards appear at once. */
  readonly showFailed: boolean;
  readonly onClose: () => void;
  readonly onAgain: (packId: string, count: number) => void;
}

/** Everything that came out of the opened packs, with what is new and what it did to the Card-Dex. */
export function PullSummary({ openings, preview, showFailed, onClose, onAgain }: PullSummaryProps) {
  const save = useSave();
  const today = useToday();
  const progress = useMemo(() => dexProgress(buildDex(save.collection)), [save.collection]);
  const pulls = openings.flatMap((opening) => opening.pulls);
  const fresh = pulls.filter((pull) => pull.isNew).length;
  const first = openings[0];
  const count = openings.length;
  const price = first === undefined ? 0 : first.pack.price * count;
  const affordable = first !== undefined && save.player.yen >= price && isAvailable(first.pack, today);

  return (
    <section className={cx(styles.summary, count > 1 && styles.many)} aria-label={text.pull.summary} data-tutorial="pull-summary">
      <header className={styles.header}>
        <h2>{text.pull.summary}</h2>
        <p>{text.pull.summaryStats(pulls.length, fresh)}</p>
        {!preview && <p className={styles.dex}>{text.pull.dex(progress.found, progress.total)}</p>}
        {showFailed && <p className={styles.note}>{text.pull.webglProblem}</p>}
      </header>
      <ul className={styles.grid} data-tutorial="pull-cards">
        {pulls.map((pull) => {
          const rarity = RARITIES.find((entry) => entry.id === pull.card.rarity);
          const reason = text.pull.reason[pull.reason];
          return (
            <li key={pull.owned.uid} className={styles.item} style={tierStyleOf(pull.card.rarity)}>
              <div className={styles.face}>
                <CardFace card={pull.card} finish={pull.owned.finish} interactive={false} />
                {pull.isNew && <span className={styles.fresh}>{text.pull.isNew}</span>}
              </div>
              <p className={styles.caption}>
                <span className={styles.rarity}>{rarity?.symbol ?? pull.card.rarity}</span>
                <span className={styles.name}>{pull.card.name.en}</span>
              </p>
              <p className={styles.meta}>
                <i className={styles.swatch} style={{ background: FINISH_SWATCH[pull.owned.finish] }} />
                {findFinish(pull.owned.finish).label}
                {reason !== '' && <b className={styles.reason}>{reason}</b>}
              </p>
            </li>
          );
        })}
      </ul>
      <footer className={styles.actions}>
        <p className={styles.yen}>{formatYen(save.player.yen)}</p>
        {first !== undefined && !preview && (
          <Button kind="primary" onClick={() => onAgain(first.pack.id, count)} disabled={!affordable} title={affordable ? undefined : text.pull.againMissing}>
            {text.pull.again(count, formatYen(price))}
          </Button>
        )}
        <Link href="/" className={styles.link} onClick={onClose}>
          {text.pull.toBinder}
        </Link>
        <Button kind="quiet" onClick={onClose} data-tutorial="pull-close">
          {text.pull.close}
        </Button>
      </footer>
    </section>
  );
}
