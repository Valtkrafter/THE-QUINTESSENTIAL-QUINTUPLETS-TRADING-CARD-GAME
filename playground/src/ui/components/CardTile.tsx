import type { ReactNode } from 'react';
import { Link } from 'wouter';
import { cardById } from '../../cards/catalog';
import type { OwnedCard } from '../../domain/ownership';
import { gradeBand } from '../../domain/grading';
import { findFinish } from '../../holo/finishes';
import { cx } from '../format';
import { FINISH_SWATCH } from '../finishStyle';
import { bandStyle } from '../grading/bandStyle';
import { GradeBadge } from '../grading/GradeBadge';
import { CardFace } from './CardFace';
import styles from './CardTile.module.css';

export interface CardTileProps {
  readonly copy: OwnedCard;
  /** Opens the copy's own page. */
  readonly href?: string;
  /** Used instead of `href` when the tile picks a card (for example inside a dialog). */
  readonly onSelect?: () => void;
  readonly selected?: boolean;
  /** One more line under the finish, for example what the copy is worth. */
  readonly extra?: ReactNode;
}

/** One owned copy: its picture, and below it the name, the rarity and the finish. A graded copy carries its score in a corner. */
export function CardTile({ copy, href, onSelect, selected = false, extra }: CardTileProps) {
  const card = cardById(copy.cardId);
  if (card === undefined) {
    return null;
  }
  const finish = findFinish(copy.finish);
  const face = <CardFace card={card} finish={copy.finish} />;
  const label = `${card.name.en}, ${card.title}, ${finish.label}${copy.grade === null ? '' : `, score ${copy.grade.overall}`}`;

  return (
    <li className={cx(styles.tile, selected && styles.selected, copy.grade !== null && styles.graded)} style={copy.grade === null ? undefined : bandStyle(gradeBand(copy.grade.overall).id)}>
      {href !== undefined ? (
        <Link href={href} className={styles.hit} aria-label={label}>
          {face}
        </Link>
      ) : (
        <button type="button" className={styles.hit} aria-label={label} onClick={onSelect}>
          {face}
        </button>
      )}
      {copy.grade !== null && (
        <span className={styles.grade}>
          <GradeBadge grade={copy.grade} />
        </span>
      )}
      <div className={styles.caption}>
        <span className={styles.name}>{card.name.en}</span>
        <span className={styles.meta}>
          <i className={styles.swatch} style={{ background: FINISH_SWATCH[copy.finish] }} />
          {finish.label}
          <span className={styles.rarity}>{card.rarity}</span>
        </span>
        {extra !== undefined && <span className={styles.extra}>{extra}</span>}
      </div>
    </li>
  );
}
