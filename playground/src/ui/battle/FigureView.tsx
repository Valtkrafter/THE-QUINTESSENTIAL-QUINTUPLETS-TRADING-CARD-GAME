import type { CSSProperties } from 'react';
import { currentHp, maxHp, topCard } from '../../battle/rules';
import type { Figure } from '../../battle/types';
import { AFFINITY_INFO } from '../../cards/characters';
import type { FinishId } from '../../cards/finish';
import { CardFace } from '../components/CardFace';
import { HourglassIcon, ShieldIcon } from '../components/icons';
import { cx } from '../format';
import { text } from '../text';
import type { Floater, FloaterTone } from './floaters';
import type { Point, Size } from './layout';
import styles from './Table.module.css';
import { useHold } from './useHold';

export type Highlight = 'none' | 'ready' | 'target' | 'selected';

const TONE: Readonly<Record<FloaterTone, string | undefined>> = {
  damage: styles.toneDamage,
  heal: styles.toneHeal,
  heart: styles.toneHeart,
  info: styles.toneInfo,
  ko: styles.toneKo,
};

export interface FigureViewProps {
  readonly figure: Figure;
  readonly zone: 'active' | 'bench';
  /** Where it stands on the stage, how big the picture is and how high the strip with the health under it is. */
  readonly point: Point;
  readonly size: Size;
  readonly strip: number;
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

const MAX_HEART_DOTS = 6;

/** One Character in play: its card, the Hearts on it, its health under it and what happens to it. */
export function FigureView({ figure, zone, point, size, strip, finish, highlight, stunned, shielded, floaters, lunge, towards, disabled, onClick, onPoint, onHold }: FigureViewProps) {
  const hold = useHold(onHold);
  const card = topCard(figure);
  const hp = currentHp(figure);
  const max = maxHp(figure);
  const ratio = max === 0 ? 0 : hp / max;
  const level = ratio <= 0.25 ? 'low' : ratio <= 0.5 ? 'mid' : 'high';
  const style = {
    left: point.x,
    top: point.y,
    width: size.w,
    height: size.h + strip,
    '--tint': AFFINITY_INFO[card.affinity].color,
    '--hp': `${Math.round(ratio * 100)}%`,
  } as CSSProperties;
  return (
    <div className={cx(styles.figure, zone === 'bench' && styles.bench)} style={style}>
      <button
        type="button"
        className={cx(
          styles.card,
          highlight === 'target' && styles.hlTarget,
          highlight === 'selected' && styles.hlSelected,
          disabled && styles.inert,
          lunge && (towards === 'up' ? styles.lungeUp : styles.lungeDown),
        )}
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
        aria-label={`${card.name.en}, ${card.title}. ${hp} of ${max} HP, ${text.battle.board.hearts(figure.hearts)}${zone === 'active' ? `, ${text.battle.board.active}` : `, ${text.battle.board.bench}`}`}
      >
        {/* A new card on top of the pile (an evolution) starts the picture again, with a flash. */}
        <span key={card.id} className={styles.face}>
          <CardFace card={card} finish={finish} interactive={false} />
        </span>
        <span className={styles.hearts} aria-hidden="true">
          {Array.from({ length: Math.min(figure.hearts, MAX_HEART_DOTS) }, (_, index) => (
            <i key={index} />
          ))}
          {figure.hearts > MAX_HEART_DOTS && <b>×{figure.hearts}</b>}
        </span>
        {(stunned || shielded) && (
          <span className={styles.badges}>
            {stunned && (
              <span className={styles.badge} title={text.battle.board.stunned}>
                <HourglassIcon size={12} />
              </span>
            )}
            {shielded && (
              <span className={styles.badge} title={text.battle.board.shielded}>
                <ShieldIcon size={12} />
              </span>
            )}
          </span>
        )}
      </button>
      <span className={styles.hp} data-level={level} style={{ height: 14 }}>
        <i />
        <b>
          {hp}
          <small>/{max}</small>
        </b>
      </span>
      <span className={styles.floaters} aria-hidden="true">
        {floaters.map(({ id, floater }, index) => (
          <span key={id} className={cx(styles.floater, TONE[floater.tone])} style={{ '--i': index } as CSSProperties}>
            {floater.text}
          </span>
        ))}
      </span>
    </div>
  );
}

/** An empty place on the table: a dashed outline with its name. */
export function EmptySlot({ point, size, strip, label, active }: { readonly point: Point; readonly size: Size; readonly strip: number; readonly label: string; readonly active?: boolean }) {
  return (
    <div className={cx(styles.slot, active === true && styles.slotActive)} style={{ left: point.x, top: point.y, width: size.w, height: size.h + strip }} aria-hidden="true">
      <span>{label}</span>
    </div>
  );
}
