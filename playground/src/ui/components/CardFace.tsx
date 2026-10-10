import type { CSSProperties, PointerEvent } from 'react';
import { AFFINITY_INFO } from '../../cards/characters';
import type { FinishId } from '../../cards/finish';
import type { FrameStyle } from '../../cards/frameStyle';
import type { Card } from '../../cards/model';
import { cx } from '../format';
import { useNearScreen, useThumbnail } from '../hooks/useThumbnail';
import styles from './CardFace.module.css';

export interface CardFaceProps {
  readonly card: Card;
  /** Which light show hovers over the picture. */
  readonly finish: FinishId;
  /** A card the player does not have yet: shown dim and flat, with no light show. */
  readonly locked?: boolean;
  /** Lifts and shimmers under the pointer. Off for pictures that are not clickable. */
  readonly interactive?: boolean;
  /** Paints this frame design instead of the player's choice (for the previews in Settings). */
  readonly frameStyle?: FrameStyle;
}

function followPointer(event: PointerEvent<HTMLDivElement>): void {
  const box = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty('--mx', `${((event.clientX - box.left) / box.width) * 100}%`);
  event.currentTarget.style.setProperty('--my', `${((event.clientY - box.top) / box.height) * 100}%`);
}

/** A flat picture of a card, painted lazily once it is near the screen. */
export function CardFace({ card, finish, locked = false, interactive = true, frameStyle }: CardFaceProps) {
  const [ref, near] = useNearScreen<HTMLDivElement>();
  const url = useThumbnail(card, near, frameStyle);
  const tint = AFFINITY_INFO[card.kind === 'character' ? card.affinity : 'study'].color;
  const lightShow = finish === 'standard' ? styles.glare : styles[finish];

  return (
    <div
      ref={ref}
      className={cx(styles.face, interactive && !locked && styles.interactive, locked && styles.locked)}
      style={{ '--tint': tint } as CSSProperties}
      onPointerMove={interactive && !locked ? followPointer : undefined}
    >
      {url === null ? (
        <div className={styles.skeleton}>{String(card.number).padStart(3, '0')}</div>
      ) : (
        <img className={styles.picture} src={url} alt={`${card.name.en} · ${card.title}`} draggable={false} />
      )}
      {interactive && !locked && <span className={cx(styles.sheen, lightShow)} aria-hidden="true" />}
    </div>
  );
}
