// The desk where a card is looked over before it is sent in: the card under a lamp, how it looks to the eye, the four things
// the graders check, and above all what they may say: the chance of every score next to what the card would be worth in its case,
// with a plain verdict. Nobody pays blind. Used in the side panel of the Grading screen and in the question of a narrow screen.

import { useMemo, type ReactNode } from 'react';
import { cardById } from '../../cards/catalog';
import { eyeCheck, gradeBand, gradeLabel, gradeOutlook, type OutlookRow } from '../../domain/grading';
import type { OwnedCard } from '../../domain/ownership';
import { findFinish } from '../../holo/finishes';
import { CardFace } from '../components/CardFace';
import { Pill } from '../components/controls';
import { cx, formatYen } from '../format';
import { percentText } from '../packs/oddsFormat';
import { text } from '../text';
import { bandStyle } from './bandStyle';
import { eyeStyle } from './eye';
import { MARKS } from './marks';
import styles from './GradeDesk.module.css';

export interface GradeDeskProps {
  /** The loose copy on the desk. */
  readonly copy: OwnedCard;
  /** The buttons under the desk. */
  readonly children?: ReactNode;
  /** Smaller: for a dialog on a phone. */
  readonly compact?: boolean;
}

/** Green when the case is worth more than the card and the fee together, red when it is worth less than the card loose. */
function rowClass(row: OutlookRow, loose: number, fee: number): string | undefined {
  if (row.yen >= loose + fee) {
    return styles.gain;
  }
  return row.yen < loose ? styles.loss : undefined;
}

export function GradeDesk({ copy, children, compact = false }: GradeDeskProps) {
  const card = cardById(copy.cardId);
  const outlook = useMemo(() => (card === undefined ? null : gradeOutlook(copy.condition, card.rarity, copy.finish)), [card, copy.condition, copy.finish]);
  if (card === undefined || outlook === null) {
    return null;
  }
  const eye = eyeCheck(copy.condition);
  const copyText = text.grading;
  const tallest = Math.max(...outlook.rows.map((row) => row.chance));
  const likely = outlook.rows.find((row) => row.chance === tallest);

  return (
    <div className={cx(styles.desk, compact && styles.compact)}>
      <section className={styles.stage} aria-label={copyText.send.chosen}>
        <span className={styles.lamp} aria-hidden="true" />
        <div className={styles.card}>
          <CardFace card={card} finish={copy.finish} />
        </div>
        <div className={styles.who}>
          <strong>{card.name.en}</strong>
          <span className={styles.title}>{card.title}</span>
          <Pill>
            {findFinish(copy.finish).label} · {card.rarity}
          </Pill>
        </div>
        <p className={styles.eye} style={eyeStyle(eye)} title={copyText.eye[eye].hint}>
          <span className={styles.eyeDot} aria-hidden="true" />
          <span className={styles.eyeLabel}>
            <small>{copyText.eye.title}</small>
            <strong>{copyText.eye[eye].label}</strong>
          </span>
        </p>
      </section>

      <section className={styles.marks} aria-label={copyText.desk.marksTitle}>
        <h3>{copyText.desk.marksTitle}</h3>
        <ul>
          {MARKS.map((mark) => (
            <li key={mark} title={copyText.parts[mark].hint}>
              <span className={styles.markDot} aria-hidden="true">
                ?
              </span>
              {copyText.parts[mark].name}
            </li>
          ))}
        </ul>
        <p>{copyText.desk.marksNote}</p>
      </section>

      <section className={styles.outlook} aria-label={copyText.desk.outlookTitle} data-tutorial="grading-outlook">
        <h3>{copyText.desk.outlookTitle}</h3>
        <div className={styles.head} aria-hidden="true">
          <span>{copyText.desk.columns.score}</span>
          <span />
          <span>{copyText.desk.columns.chance}</span>
          <span>{copyText.desk.columns.worth}</span>
        </div>
        <ul className={styles.rows}>
          {outlook.rows.map((row) => (
            <li key={row.score} style={bandStyle(gradeBand(row.score).id)} data-likely={row === likely ? 'true' : undefined}>
              <span className={styles.score}>
                <i aria-hidden="true" />
                <b>{copyText.desk.scoreName(row.score)}</b>
                <small>{gradeLabel(row.score)}</small>
              </span>
              <span className={styles.bar} aria-hidden="true">
                <em style={{ width: `${Math.max(row.chance > 0 ? 2 : 0, (row.chance / tallest) * 100)}%` }} />
              </span>
              <span className={styles.chance}>{percentText(row.chance)}</span>
              <span className={cx(styles.worth, rowClass(row, outlook.loose, outlook.fee))}>{formatYen(row.yen)}</span>
            </li>
          ))}
        </ul>
        <p className={styles.note}>{copyText.desk.outlookNote}</p>
      </section>

      <section className={styles.sums} aria-label={copyText.desk.fee}>
        <div>
          <small>{copyText.desk.fee}</small>
          <strong>{formatYen(outlook.fee)}</strong>
        </div>
        <div>
          <small>{copyText.desk.loose}</small>
          <strong>{formatYen(outlook.loose)}</strong>
        </div>
        <div>
          <small>{copyText.desk.expected}</small>
          <strong>{formatYen(Math.round(outlook.expected))}</strong>
        </div>
      </section>

      <section className={styles.verdict} data-verdict={outlook.verdict} aria-live="polite">
        <strong>{copyText.desk.verdict[outlook.verdict]}</strong>
        <p>{copyText.desk.verdictLine[outlook.verdict](Math.round(Math.abs(outlook.edge)))}</p>
        <p className={styles.chances}>{copyText.desk.chances(percentText(outlook.nineOrBetter), percentText(outlook.ten))}</p>
      </section>

      {children !== undefined && <div className={styles.actions}>{children}</div>}
    </div>
  );
}
