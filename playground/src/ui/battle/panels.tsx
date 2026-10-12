// The panels of the battle table that the player works with: the steps of the turn, the free Heart and the moves of the Active Character.

import { AFFINITY_INFO } from '../../cards/characters';
import { CheckIcon, HeartIcon } from '../components/icons';
import { cx } from '../format';
import { text } from '../text';
import type { StepStatus } from './coach';
import type { Box } from './layout';
import styles from './Table.module.css';
import { Placed } from './stageParts';
import type { MoveView } from './viewModel';

// --- The steps ---------------------------------------------------------------------------------------------------------------------

export interface StepItem {
  readonly id: string;
  readonly title: string;
  readonly hint: string;
  readonly status: StepStatus;
  /** The step the screen points to now. */
  readonly current: boolean;
}

export interface StepsPanelProps {
  readonly box: Box;
  readonly title: string;
  readonly steps: readonly StepItem[];
  /** It is not the player's turn: the list is shown dim. */
  readonly dim: boolean;
  /** A single row of numbered dots instead of the list (a phone). */
  readonly compact: boolean;
}

/** The steps of a turn, with the one to do now lit up. */
export function StepsPanel({ box, title, steps, dim, compact }: StepsPanelProps) {
  if (compact) {
    return (
      <div className={styles.stepRowWrap} style={{ left: box.x, top: box.y, width: box.w, height: box.h }} role="group" aria-label={title} data-tutorial="battle-steps">
        <ol className={styles.stepRow}>
          {steps.map((step, index) => (
            <li key={step.id} data-status={step.status} data-current={step.current} aria-current={step.current ? 'step' : undefined} aria-label={`${step.title}: ${text.battle.steps.status[step.status]}`}>
              {step.status === 'done' ? <CheckIcon size={14} /> : index + 1}
            </li>
          ))}
        </ol>
      </div>
    );
  }
  return (
    <Placed box={box} className={cx(styles.panel, styles.steps)} label={title} anchor="battle-steps">
      <div className={styles.stepsHead}>
        <h2>{title}</h2>
      </div>
      <ol className={styles.stepList} data-dim={dim}>
        {steps.map((step, index) => (
          <li key={step.id} className={styles.step} data-status={dim ? 'blocked' : step.status} data-current={!dim && step.current} aria-current={step.current && !dim ? 'step' : undefined}>
            <b>{step.status === 'done' && !dim ? <CheckIcon size={14} /> : index + 1}</b>
            <span>
              {step.title}
              {step.current && !dim && <small>{step.hint}</small>}
            </span>
          </li>
        ))}
      </ol>
    </Placed>
  );
}

// --- The free Heart ---------------------------------------------------------------------------------------------------------------

export interface HeartZoneProps {
  readonly box: Box;
  /** Free Hearts left this turn. */
  readonly left: number;
  /** Nothing prevents giving one now: it is the player's turn, there is a Character to give it to. */
  readonly enabled: boolean;
  readonly picked: boolean;
  readonly row: boolean;
  readonly onPick: () => void;
}

export function HeartZone({ box, left, enabled, picked, row, onPick }: HeartZoneProps) {
  const words = text.battle.table;
  const usable = enabled && left > 0;
  const status = picked ? words.freeHeartPicked : left > 0 ? words.freeHeartLeft(left) : enabled ? words.freeHeartUsed : words.freeHeartWait;
  return (
    <Placed box={box} className={cx(styles.panel, styles.heartZone, row && styles.heartRow)} label={words.freeHeart}>
      {!row && <h2>{words.freeHeart}</h2>}
      <button type="button" className={styles.token} aria-pressed={picked} disabled={!usable} onClick={onPick} aria-label={`${words.freeHeart}: ${status}`} data-tutorial="free-heart">
        <HeartIcon size={30} />
      </button>
      <div className={styles.heartText}>
        {row && <strong>{words.freeHeart}</strong>}
        <span>{status}</span>
        {!row && usable && !picked && <span>{text.battle.coach.heartHint}</span>}
      </div>
    </Placed>
  );
}

// --- The moves --------------------------------------------------------------------------------------------------------------------

export interface MovesPanelProps {
  readonly box: Box;
  readonly moves: readonly MoveView[];
  /** The player may act now (their turn, nothing is being asked). */
  readonly canAct: boolean;
  readonly hasActive: boolean;
  readonly note: string | null;
  readonly compact: boolean;
  readonly onMove: (index: number) => void;
  readonly onPoint: () => void;
}

export function MovesPanel({ box, moves, canAct, hasActive, note, compact, onMove, onPoint }: MovesPanelProps) {
  const words = text.battle.table;
  return (
    <Placed box={box} className={cx(styles.panel, compact && styles.compactPanel)} label={words.movesTitle} anchor="battle-moves">
      <div className={styles.moves}>
        <h2>
          {words.movesTitle}
          {!compact && <small>{words.movesNote}</small>}
        </h2>
        {moves.map((move) => (
          <button key={move.index} type="button" className={styles.move} disabled={!move.usable || !canAct} onClick={() => onMove(move.index)} onMouseEnter={onPoint}>
            <span className={styles.moveCost} aria-hidden="true">
              {move.cost.map((kind, index) => (
                <i key={index} style={{ background: AFFINITY_INFO[kind].color }} />
              ))}
            </span>
            <span className={styles.moveName}>{move.name}</span>
            <span className={styles.moveDamage}>
              {move.printed}
              {move.estimate !== null && String(move.estimate) !== move.printed && <small className={cx(move.doubled && styles.weak, move.resisted && styles.resist)}> → {move.estimate}</small>}
            </span>
            {move.text !== '' && <small className={styles.moveText}>{move.text}</small>}
          </button>
        ))}
        {moves.length === 0 && <p className={styles.movesNote}>{hasActive ? text.battle.board.noMoves : words.noActive}</p>}
        {note !== null && <p className={styles.movesNote}>{note}</p>}
      </div>
    </Placed>
  );
}
