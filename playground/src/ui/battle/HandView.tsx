import type { CSSProperties } from 'react';
import { cardById } from '../../cards/catalog';
import type { FinishId } from '../../cards/finish';
import type { Card } from '../../cards/model';
import { CardFace } from '../components/CardFace';
import { cx } from '../format';
import { text } from '../text';
import type { Layout } from './layout';
import styles from './Table.module.css';
import { useHold } from './useHold';

export interface HandViewProps {
  readonly layout: Layout;
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
      data-playable={playable ? 'true' : undefined}
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

/** The cards in the player's hand: a grid on the wide table, a row to scroll on a phone. */
export function HandView({ layout, hand, finishOf, selected, playable, onPick, onPoint, onHold }: HandViewProps) {
  const tall = layout.handColumns === 0;
  return (
    <ul
      className={cx(styles.hand, tall ? styles.handTall : styles.handGrid)}
      aria-label={text.battle.board.yourHand}
      style={tall ? undefined : { gridTemplateColumns: `repeat(${layout.handColumns}, ${layout.handCell.w - 2}px)`, gridAutoRows: `${layout.handCell.h}px`, height: layout.hand.h - 30 }}
    >
      {hand.map((cardId, index) => {
        const card = cardById(cardId);
        if (card === undefined) {
          return null;
        }
        const cell = { width: layout.handCell.w - 2, height: layout.handCell.h - 2 } as CSSProperties;
        return (
          // The same card can be in the hand twice, so the place in the hand is part of the key.
          <li key={`${index}:${cardId}`} className={styles.handCell} style={cell}>
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
      {hand.length === 0 && <li className={styles.handEmpty}>{text.battle.table.handEmpty}</li>}
    </ul>
  );
}

/** The back of a card, for what the opponent holds and what lies in a deck. */
export function CardBack({ className }: { readonly className?: string }) {
  return <span className={cx(styles.back, className)} aria-hidden="true" />;
}
