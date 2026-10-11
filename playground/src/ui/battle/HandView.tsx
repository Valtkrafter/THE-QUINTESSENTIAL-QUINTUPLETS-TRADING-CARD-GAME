import { cardById } from '../../cards/catalog';
import type { FinishId } from '../../cards/finish';
import type { Card } from '../../cards/model';
import { CardFace } from '../components/CardFace';
import { cx } from '../format';
import styles from './Board.module.css';
import { useHold } from './useHold';

export interface HandViewProps {
  readonly hand: readonly string[];
  readonly finishOf: (cardId: string) => FinishId;
  readonly selected: number | null;
  /** Which cards in the hand can be played right now. */
  readonly playable: readonly boolean[];
  readonly onPick: (handIndex: number) => void;
  readonly onPoint: (cardId: string | null) => void;
  /** Press and hold with a finger: look at the card closely. */
  readonly onHold?: (cardId: string) => void;
}

interface HandCardProps {
  readonly card: Card;
  readonly finish: FinishId;
  readonly selected: boolean;
  readonly playable: boolean;
  readonly onPick: () => void;
  readonly onPoint: (cardId: string | null) => void;
  readonly onHold: (() => void) | undefined;
}

function HandCard({ card, finish, selected, playable, onPick, onPoint, onHold }: HandCardProps) {
  const hold = useHold(onHold);
  return (
    <button
      type="button"
      className={cx(styles.handCard, playable && styles.canPlay, selected && styles.picked)}
      aria-pressed={selected}
      aria-label={`${card.name.en}, ${card.title}`}
      onClick={() => {
        if (!hold.wasHeld()) {
          onPick();
        }
      }}
      onPointerDown={hold.onPointerDown}
      onPointerMove={hold.onPointerMove}
      onPointerUp={hold.onPointerUp}
      onPointerCancel={hold.onPointerCancel}
      onPointerLeave={hold.onPointerLeave}
      onContextMenu={hold.onContextMenu}
      onMouseEnter={() => onPoint(card.id)}
      onMouseLeave={() => onPoint(null)}
      onFocus={() => onPoint(card.id)}
      onBlur={() => onPoint(null)}
    >
      <CardFace card={card} finish={finish} interactive={false} />
    </button>
  );
}

/** The cards in the player's hand, side by side (overlapping when there are many, a row to scroll on a phone). */
export function HandView({ hand, finishOf, selected, playable, onPick, onPoint, onHold }: HandViewProps) {
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
            <HandCard
              card={card}
              finish={finishOf(cardId)}
              selected={selected === index}
              playable={playable[index] === true}
              onPick={() => onPick(index)}
              onPoint={onPoint}
              onHold={onHold === undefined ? undefined : () => onHold(cardId)}
            />
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
