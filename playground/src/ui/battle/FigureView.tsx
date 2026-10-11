import type { CSSProperties } from 'react';
import { currentHp, maxHp, topCard } from '../../battle/rules';
import type { Figure } from '../../battle/types';
import { AFFINITY_INFO } from '../../cards/characters';
import type { FinishId } from '../../cards/finish';
import { CardFace } from '../components/CardFace';
import { HourglassIcon, ShieldIcon } from '../components/icons';
import { cx } from '../format';
import { text } from '../text';
import styles from './Board.module.css';
import type { Floater } from './floaters';
import { useHold } from './useHold';

export type Highlight = 'none' | 'ready' | 'target' | 'selected';

export interface FigureViewProps {
  readonly figure: Figure;
  readonly size: 'active' | 'bench';
  readonly finish: FinishId;
  readonly highlight: Highlight;
  /** The Character cannot attack in the current turn. */
  readonly stunned: boolean;
  /** The Character takes no damage in the current turn. */
  readonly shielded: boolean;
  readonly floaters: readonly { readonly id: number; readonly floater: Floater }[];
  /** Plays the lunge of an attack (towards the enemy). */
  readonly lunge: boolean;
  readonly towards: 'up' | 'down';
  /** Nothing can be done with this Character now. It still shows its card to a pointer, a focus or a press and hold. */
  readonly disabled: boolean;
  readonly onClick: () => void;
  readonly onPoint: (cardId: string | null) => void;
  /** Press and hold with a finger: look at the card closely. */
  readonly onHold?: () => void;
}

const STAGE_LABEL = { basic: 'Basic', close: 'Close', bride: 'Bride', event: 'Event' } as const;

/** One Character in play: its card, its health, its Hearts and what happens to it. */
export function FigureView({ figure, size, finish, highlight, stunned, shielded, floaters, lunge, towards, disabled, onClick, onPoint, onHold }: FigureViewProps) {
  const hold = useHold(onHold);
  const card = topCard(figure);
  const hp = currentHp(figure);
  const max = maxHp(figure);
  const ratio = max === 0 ? 0 : hp / max;
  const tint = AFFINITY_INFO[card.affinity].color;
  const style = { '--tint': tint, '--hp': `${Math.round(ratio * 100)}%` } as CSSProperties;
  return (
    <button
      type="button"
      className={cx(styles.figure, styles[size], styles[`hl-${highlight}`], disabled && styles.inert, lunge && styles[towards === 'up' ? 'lungeUp' : 'lungeDown'])}
      style={style}
      aria-disabled={disabled}
      onClick={() => {
        if (!hold.wasHeld() && !disabled) {
          onClick();
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
      aria-label={`${card.name.en}, ${card.title}. ${hp} of ${max} HP, ${text.battle.board.hearts(figure.hearts)}`}
    >
      <span className={styles.face}>
        <CardFace card={card} finish={finish} interactive={false} />
      </span>
      <span className={cx(styles.hpBar, ratio <= 0.25 && styles.low, ratio > 0.25 && ratio <= 0.5 && styles.mid)}>
        <i />
        <b>
          {hp}
          <small>/{max}</small>
        </b>
      </span>
      <span className={styles.chips}>
        {figure.hearts > 0 && (
          <span className={styles.hearts} aria-hidden="true">
            {figure.hearts <= 5 ? Array.from({ length: figure.hearts }, (_, index) => <i key={index} />) : <><i />×{figure.hearts}</>}
          </span>
        )}
        {figure.stack.length > 1 && <span className={styles.stage}>{STAGE_LABEL[card.stage]}</span>}
        {stunned && (
          <span className={styles.status} title={text.battle.board.stunned}>
            <HourglassIcon size={12} />
          </span>
        )}
        {shielded && (
          <span className={styles.status} title={text.battle.board.shielded}>
            <ShieldIcon size={12} />
          </span>
        )}
      </span>
      <span className={styles.floaters} aria-hidden="true">
        {floaters.map(({ id, floater }, index) => (
          <span key={id} className={cx(styles.floater, styles[`tone-${floater.tone}`])} style={{ '--i': index } as CSSProperties}>
            {floater.text}
          </span>
        ))}
      </span>
    </button>
  );
}

/** An empty place on the table. */
export function EmptySlot({ size, label, highlight, onClick }: { readonly size: 'active' | 'bench'; readonly label: string; readonly highlight: boolean; readonly onClick?: () => void }) {
  return (
    <button type="button" className={cx(styles.slot, styles[size], highlight && styles['hl-target'])} disabled={onClick === undefined} onClick={onClick}>
      <span>{label}</span>
    </button>
  );
}
