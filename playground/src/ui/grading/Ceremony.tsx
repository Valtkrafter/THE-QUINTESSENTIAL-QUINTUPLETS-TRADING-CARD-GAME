// The reveal after a card was sent to Grading: the card is checked, its four marks appear one by one, then the score is
// stamped and the card sits in its case. The grading itself is long done when this opens (the save was written first), so
// the player can skip it at any moment; it only shows what happened.

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from 'react';
import { useLocation } from 'wouter';
import { cardById } from '../../cards/catalog';
import { gradeBand, slabValue, type Graded } from '../../domain/grading';
import { CardFace } from '../components/CardFace';
import { Button } from '../components/controls';
import { trapTab } from '../components/focusTrap';
import { cx, formatGrade, formatSubGrade } from '../format';
import { text } from '../text';
import { usePullAudio } from '../pull/usePullAudio';
import { bandStyle } from './bandStyle';
import { MARKS } from './marks';
import { SlabFlat } from './SlabFlat';
import styles from './Ceremony.module.css';

/** The step at which everything is shown: the four marks (steps 1 to 4) and then the score. */
const FINAL = MARKS.length + 1;

/** Where the sparkles of a very good card sit, in percent of the screen, and when they start. */
const SPARKLES: readonly { readonly x: number; readonly y: number; readonly delay: number; readonly size: number }[] = [
  { x: 12, y: 22, delay: 0.0, size: 10 },
  { x: 22, y: 70, delay: 0.5, size: 14 },
  { x: 31, y: 38, delay: 1.1, size: 8 },
  { x: 44, y: 12, delay: 0.3, size: 12 },
  { x: 52, y: 82, delay: 0.9, size: 9 },
  { x: 63, y: 30, delay: 1.4, size: 13 },
  { x: 71, y: 74, delay: 0.2, size: 10 },
  { x: 80, y: 18, delay: 0.7, size: 14 },
  { x: 88, y: 52, delay: 1.2, size: 9 },
  { x: 93, y: 84, delay: 0.4, size: 11 },
  { x: 6, y: 52, delay: 1.0, size: 12 },
  { x: 38, y: 60, delay: 1.6, size: 8 },
];

function toneOf(mark: number): 'great' | 'fair' | 'poor' {
  if (mark >= 9) {
    return 'great';
  }
  return mark >= 7 ? 'fair' : 'poor';
}

export interface CeremonyProps {
  readonly graded: Graded;
  readonly onClose: () => void;
}

export function Ceremony({ graded, onClose }: CeremonyProps) {
  const { copy, grade, fee } = graded;
  const card = cardById(copy.cardId);
  const [location, navigate] = useLocation();
  const audio = usePullAudio();
  const [shown, setShown] = useState(() => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? FINAL : 0));
  const rootRef = useRef<HTMLDivElement>(null);
  const lastSound = useRef(0);
  const done = shown >= FINAL;
  const band = gradeBand(grade.overall);
  const bright = band.id === 'pristine' || band.id === 'gem';

  // The page behind must not scroll while the reveal is open.
  useEffect(() => {
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    rootRef.current?.focus();
    return () => {
      document.documentElement.style.overflow = previous;
    };
  }, []);

  // One step after the other: a pause while the card is checked, a beat for each mark, a longer one before the score.
  useEffect(() => {
    if (shown >= FINAL) {
      return undefined;
    }
    const wait = shown === 0 ? 1300 : shown === MARKS.length ? 1500 : 950;
    const timer = window.setTimeout(() => setShown(shown + 1), wait);
    return () => window.clearTimeout(timer);
  }, [shown]);

  // Sound: a bell for each mark, the stamp for the score. A skipped step stays silent.
  useEffect(() => {
    if (audio === null || shown === 0 || lastSound.current === shown) {
      return;
    }
    lastSound.current = shown;
    const part = MARKS[shown - 1];
    if (part !== undefined) {
      audio.gradeMark(shown - 1, grade.sub[part]);
    } else if (shown === FINAL) {
      audio.gradeStamp(grade.overall);
    }
  }, [audio, shown, grade]);

  const skip = useCallback(() => setShown(FINAL), []);

  const seeSlab = () => {
    const target = `/card/${copy.uid}`;
    navigate(target, { replace: location === target });
    onClose();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (rootRef.current !== null) {
      trapTab(event, rootRef.current);
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      if (done) {
        onClose();
      } else {
        skip();
      }
    } else if ((event.key === ' ' || event.key === 'Enter') && !(event.target instanceof Element && event.target.closest('button'))) {
      event.preventDefault();
      if (!done) {
        skip();
      }
    }
  };

  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!done && !(event.target instanceof Element && event.target.closest('button'))) {
      skip();
    }
  };

  if (card === undefined) {
    return null;
  }

  return (
    <div
      ref={rootRef}
      className={styles.root}
      role="dialog"
      aria-modal="true"
      aria-label={text.grading.ceremony.label}
      tabIndex={-1}
      style={bandStyle(band.id)}
      data-band={band.id}
      onKeyDown={onKeyDown}
      onClick={onClick}
    >
      {done && bright && (
        <span className={styles.backdrop} aria-hidden="true">
          {band.id === 'pristine' && <i className={styles.rays} />}
          {SPARKLES.map((sparkle) => (
            <i
              key={`${sparkle.x}-${sparkle.y}`}
              className={styles.sparkle}
              style={{ left: `${sparkle.x}%`, top: `${sparkle.y}%`, width: sparkle.size, height: sparkle.size, animationDelay: `${sparkle.delay}s` }}
            />
          ))}
        </span>
      )}

      <div className={styles.stage}>
        <div className={styles.side}>
          {done ? (
            <div className={styles.slabbed}>
              <SlabFlat copy={copy} />
            </div>
          ) : (
            <div className={styles.inspecting}>
              <CardFace card={card} finish={copy.finish} interactive={false} live={false} />
              <span className={styles.scan} aria-hidden="true" />
            </div>
          )}
        </div>

        <div className={styles.panel}>
          <p className={styles.kicker}>{done ? card.name.en : text.grading.ceremony.checking}</p>
          <ul className={styles.marks}>
            {MARKS.map((part, index) => {
              const revealed = shown > index;
              const mark = grade.sub[part];
              return (
                <li key={part} className={cx(styles.mark, revealed && styles.revealed)} style={{ '--fill': mark / 10 } as CSSProperties} data-tone={toneOf(mark)}>
                  <div className={styles.markHead}>
                    <strong>{text.grading.parts[part].name}</strong>
                    <span>{text.grading.parts[part].hint}</span>
                  </div>
                  <output className={styles.value}>{revealed ? formatSubGrade(mark) : '–'}</output>
                  <div className={styles.bar}>
                    <i />
                  </div>
                </li>
              );
            })}
          </ul>

          {done && (
            <div className={styles.result}>
              <div className={styles.score}>
                <strong>{formatGrade(grade.overall)}</strong>
                <span>{band.label}</span>
              </div>
              <p className={styles.verdict}>{text.grading.ceremony.verdict[band.id]}</p>
              <p className={styles.worth}>{text.grading.ceremony.worth(slabValue(copy))}</p>
              <p className={styles.fee}>{text.grading.ceremony.fee(fee)}</p>
            </div>
          )}

          <div className={styles.actions}>
            {done ? (
              <>
                <Button onClick={onClose}>{text.grading.ceremony.done}</Button>
                <Button kind="primary" onClick={seeSlab}>
                  {text.grading.ceremony.seeSlab}
                </Button>
              </>
            ) : (
              <Button kind="quiet" onClick={skip}>
                {text.grading.ceremony.skip}
              </Button>
            )}
          </div>
        </div>
      </div>
      <span className={styles.srOnly} aria-live="polite">
        {done ? `${card.name.en}: ${text.grading.ceremony.score} ${formatGrade(grade.overall)}, ${band.label}` : ''}
      </span>
    </div>
  );
}
