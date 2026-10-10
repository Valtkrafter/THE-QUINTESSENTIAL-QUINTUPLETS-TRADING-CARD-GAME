import { Link } from 'wouter';
import { cardById } from '../../cards/catalog';
import type { OwnedCard } from '../../domain/ownership';
import { findFinish } from '../../holo/finishes';
import { cx } from '../format';
import { FINISH_SWATCH } from '../finishStyle';
import { CardFace } from './CardFace';
import styles from './CardTile.module.css';

export interface CardTileProps {
  readonly copy: OwnedCard;
  /** Opens the copy's own page. */
  readonly href?: string;
  /** Used instead of `href` when the tile picks a card (for example inside a dialog). */
  readonly onSelect?: () => void;
  readonly selected?: boolean;
}

/** One owned copy: its picture, and below it the name, the rarity and the finish. */
export function CardTile({ copy, href, onSelect, selected = false }: CardTileProps) {
  const card = cardById(copy.cardId);
  if (card === undefined) {
    return null;
  }
  const finish = findFinish(copy.finish);
  const face = <CardFace card={card} finish={copy.finish} />;
  const label = `${card.name.en}, ${card.title}, ${finish.label}`;

  return (
    <li className={cx(styles.tile, selected && styles.selected)}>
      {href !== undefined ? (
        <Link href={href} className={styles.hit} aria-label={label}>
          {face}
        </Link>
      ) : (
        <button type="button" className={styles.hit} aria-label={label} onClick={onSelect}>
          {face}
        </button>
      )}
      <div className={styles.caption}>
        <span className={styles.name}>{card.name.en}</span>
        <span className={styles.meta}>
          <i className={styles.swatch} style={{ background: FINISH_SWATCH[copy.finish] }} />
          {finish.label}
          <span className={styles.rarity}>{card.rarity}</span>
        </span>
      </div>
    </li>
  );
}
