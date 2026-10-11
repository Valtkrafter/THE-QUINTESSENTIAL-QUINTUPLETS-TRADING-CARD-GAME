import type { CSSProperties, ReactNode } from 'react';
import { MEMORIES_TO_WIN } from '../../battle/rules';
import type { PlayerState } from '../../battle/types';
import { HeartIcon, SparkleIcon } from '../components/icons';
import { cx } from '../format';
import { text } from '../text';
import styles from './Board.module.css';

export interface PlayerBarProps {
  readonly name: string;
  readonly subtitle: string;
  readonly portrait: string | undefined;
  readonly side: PlayerState;
  /** Whose turn it is (the bar glows). */
  readonly active: boolean;
  /** The opponent's hand is hidden: only its size is shown. */
  readonly handSize: number;
  /** Free Hearts that can still be given this turn; null for the opponent's bar. */
  readonly freeHearts: number | null;
  readonly actions?: ReactNode;
  readonly tint: string;
}

/** The strip above and below the table: who, how many Memories, and how big the deck and the hand are. */
export function PlayerBar({ name, subtitle, portrait, side, active, handSize, freeHearts, actions, tint }: PlayerBarProps) {
  return (
    <header className={cx(styles.bar, active && styles.barActive)} style={{ '--tint': tint } as CSSProperties}>
      <img className={styles.avatar} src={portrait} alt="" draggable={false} />
      <div className={styles.who}>
        <strong>{name}</strong>
        <span>{subtitle}</span>
      </div>
      <div className={styles.memories} role="img" aria-label={`${text.battle.board.memories}: ${side.memories} / ${MEMORIES_TO_WIN}`}>
        {Array.from({ length: MEMORIES_TO_WIN }, (_, index) => (
          <span key={index} className={cx(styles.memory, index < side.memories && styles.earned)}>
            <SparkleIcon size={20} />
          </span>
        ))}
        <span className={styles.memoryCount}>
          {side.memories}/{MEMORIES_TO_WIN}
        </span>
      </div>
      <dl className={styles.counts}>
        <div>
          <dt>{text.battle.board.deck}</dt>
          <dd>{side.deck.length}</dd>
        </div>
        <div>
          <dt>{text.battle.board.hand}</dt>
          <dd>{handSize}</dd>
        </div>
        <div>
          <dt>{text.battle.board.discard}</dt>
          <dd>{side.discard.length}</dd>
        </div>
      </dl>
      {freeHearts !== null && (
        <span className={cx(styles.freeHearts, freeHearts === 0 && styles.spent)}>
          <HeartIcon size={14} />
          {text.battle.board.freeHearts(freeHearts)}
        </span>
      )}
      {actions !== undefined && <div className={styles.barActions}>{actions}</div>}
    </header>
  );
}
