import { cardById } from '../../cards/catalog';
import type { FinishId } from '../../cards/finish';
import { CardFace } from '../components/CardFace';
import { cx } from '../format';
import styles from './Board.module.css';

export interface HandViewProps {
  readonly hand: readonly string[];
  readonly finishOf: (cardId: string) => FinishId;
  readonly selected: number | null;
  /** Which cards in the hand can be played right now. */
  readonly playable: readonly boolean[];
  readonly onPick: (handIndex: number) => void;
  readonly onPoint: (cardId: string | null) => void;
}

/** The cards in the player's hand, side by side (overlapping when there are many). */
export function HandView({ hand, finishOf, selected, playable, onPick, onPoint }: HandViewProps) {
  const crowd = hand.length > 11 ? styles.crowded : hand.length > 7 ? styles.dense : undefined;
  return (
    <ul className={cx(styles.hand, crowd)} aria-label="Your hand">
      {hand.map((cardId, index) => {
        const card = cardById(cardId);
        if (card === undefined) {
          return null;
        }
        return (
          // The same card can be in the hand twice, so the place in the hand is part of the key.
          <li key={`${index}:${cardId}`} className={styles.handSlot}>
            <button
              type="button"
              className={cx(styles.handCard, playable[index] === true && styles.canPlay, selected === index && styles.picked)}
              aria-pressed={selected === index}
              aria-label={`${card.name.en}, ${card.title}`}
              onClick={() => onPick(index)}
              onMouseEnter={() => onPoint(cardId)}
              onMouseLeave={() => onPoint(null)}
              onFocus={() => onPoint(cardId)}
              onBlur={() => onPoint(null)}
            >
              <CardFace card={card} finish={finishOf(cardId)} interactive={false} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** The back of a card, for what the opponent holds and what lies in a deck. */
export function CardBack({ className }: { readonly className?: string }) {
  return <span className={cx(styles.back, className)} aria-hidden="true" />;
}
