import { useEffect, useRef } from 'react';
import { cardById } from '../../cards/catalog';
import type { FinishId } from '../../cards/finish';
import type { LogLine } from '../../state/battleSession';
import { CardFace } from '../components/CardFace';
import { cx } from '../format';
import { text } from '../text';
import styles from './Board.module.css';

export interface SidePanelProps {
  /** The card the pointer is on (or null). */
  readonly inspected: string | null;
  readonly finishOf: (cardId: string) => FinishId;
  readonly log: readonly LogLine[];
}

/** The card under the pointer, enlarged so it can be read, and the log of what happened. */
export function SidePanel({ inspected, finishOf, log }: SidePanelProps) {
  const card = inspected === null ? undefined : cardById(inspected);
  const list = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const element = list.current;
    if (element !== null) {
      element.scrollTop = element.scrollHeight;
    }
  }, [log.length]);

  return (
    <aside className={styles.side}>
      <section className={styles.inspector} aria-live="polite">
        {card === undefined ? <p className={styles.hint}>{text.battle.board.inspect}</p> : <CardFace card={card} finish={finishOf(card.id)} interactive={false} />}
      </section>
      <section className={styles.logBox}>
        <h2>{text.battle.board.log}</h2>
        <ol ref={list} className={styles.log} role="log" aria-label={text.battle.board.log}>
          {log.map((line) => (
            <li key={line.id} className={cx(styles.line, styles[`side-${line.side}`], line.heading && styles.heading)}>
              {line.text}
            </li>
          ))}
        </ol>
      </section>
    </aside>
  );
}
