// The reveal after a card was sent to Grading. The card lies under a lamp and is looked over four times (centering, corners, edges,
// surface); after each look a dial fills up with the mark, then the marks are added up, the score is stamped and the card is sealed
// in its slab, which turns in 3D. The grading itself is long done when this opens (the save was written first), so the player can
// skip it at any moment; it only shows what happened.

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { useLocation } from 'wouter';
import { cardById } from '../../cards/catalog';
import { gradeBand, slabValue, type Graded } from '../../domain/grading';
import { sellPrice } from '../../domain/prices';
import { DEFAULT_SETTINGS, type HoloSettings } from '../../holo/settings';
import { usePreferences } from '../../state/app';
import { MAX_PIXEL_RATIO } from '../../state/preferences';
import { CardFace } from '../components/CardFace';
import { Button } from '../components/controls';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { trapTab } from '../components/focusTrap';
import { cx, formatGrade, formatSubGrade, formatYen } from '../format';
import { usePullAudio } from '../pull/usePullAudio';
import { text } from '../text';
import { bandStyle } from './bandStyle';
import { MARKS } from './marks';
import { slabLabelInfo } from './slabInfo';
import { SlabFlat } from './SlabFlat';
import styles from './Ceremony.module.css';

// The 3D slab brings three.js with it (the biggest part of the game), so it loads only when a card is graded.
const CardViewer = lazy(() => import('../../scene/CardViewer').then((module) => ({ default: module.CardViewer })));

type Step =
  | { readonly kind: 'lamp' }
  | { readonly kind: 'inspect'; readonly mark: number }
  | { readonly kind: 'reveal'; readonly mark: number }
  | { readonly kind: 'sum' }
  | { readonly kind: 'final' };

/** Lamp, then for every mark a look and the reveal of its dial, then the adding up, then the score. */
const STEPS: readonly Step[] = [
  { kind: 'lamp' },
  ...MARKS.flatMap((_, mark): Step[] => [
    { kind: 'inspect', mark },
    { kind: 'reveal', mark },
  ]),
  { kind: 'sum' },
  { kind: 'final' },
];
const FINAL = STEPS.length - 1;

const DURATION: Readonly<Record<Exclude<Step['kind'], 'final'>, number>> = { lamp: 1200, inspect: 880, reveal: 640, sum: 1500 };

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
  { x: 88, y: 52, delay: 0.9, size: 9 },
  { x: 93, y: 84, delay: 0.4, size: 11 },
  { x: 6, y: 52, delay: 1.0, size: 12 },
  { x: 38, y: 60, delay: 1.6, size: 8 },
];

/** A number that runs up from zero to `target` when `active` turns on; `instant` shows the end at once. */
function useCountUp(target: number, active: boolean, instant: boolean, milliseconds = 560): number {
  const [value, setValue] = useState(instant ? target : 0);
  useEffect(() => {
    if (!active || instant) {
      return undefined;
    }
    let frame = 0;
    const started = performance.now();
    const tick = (now: number): void => {
      const t = Math.min(1, (now - started) / milliseconds);
      setValue(target * (1 - (1 - t) ** 3));
      if (t < 1) {
        frame = window.requestAnimationFrame(tick);
      }
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [target, active, instant, milliseconds]);
  if (instant) {
    return target;
  }
  return active ? value : 0;
}

const CIRCUMFERENCE = 2 * Math.PI * 42;

/** What the graders are looking at in a step, for the picture over the card. */
function lookOf(step: Step): 'scan' | 'none' | (typeof MARKS)[number] {
  if (step.kind === 'lamp') {
    return 'scan';
  }
  return step.kind === 'inspect' || step.kind === 'reveal' ? (MARKS[step.mark] ?? 'none') : 'none';
}

/** One dial: a ring that fills up to the mark, and the mark in its middle. */
function Dial({ name, mark, revealed, instant, looking }: { readonly name: string; readonly mark: number; readonly revealed: boolean; readonly instant: boolean; readonly looking: boolean }) {
  const shown = useCountUp(mark, revealed, instant);
  return (
    <li className={cx(styles.dial, revealed && styles.revealed, looking && styles.looking)} style={bandStyle(gradeBand(mark).id)}>
      <svg viewBox="0 0 100 100" className={styles.ring} aria-hidden="true">
        <circle className={styles.track} cx="50" cy="50" r="42" />
        <circle
          className={styles.fill}
          cx="50"
          cy="50"
          r="42"
          style={{ strokeDasharray: CIRCUMFERENCE, strokeDashoffset: revealed ? CIRCUMFERENCE * (1 - mark / 10) : CIRCUMFERENCE }}
        />
      </svg>
      <output className={styles.number}>{revealed ? formatSubGrade(shown) : '–'}</output>
      <span className={styles.name}>{name}</span>
    </li>
  );
}

/** The graded card in its slab, turning in 3D. The flat picture stands in until the 3D one is ready, and for devices without it. */
function SlabStage({ copy }: { readonly copy: Graded['copy'] }) {
  const preferences = usePreferences();
  const card = cardById(copy.cardId);
  const info = useMemo(() => slabLabelInfo(copy), [copy]);
  const settings = useMemo<HoloSettings>(() => ({ ...DEFAULT_SETTINGS, frameStyle: preferences.frameStyle, idleMotion: true }), [preferences.frameStyle]);
  const [ready, setReady] = useState(false);
  const markReady = useCallback(() => setReady(true), []);
  const flat = (
    <div className={styles.flatSlab}>
      <SlabFlat copy={copy} />
    </div>
  );
  if (card === undefined || info === null || preferences.graphics === 'low') {
    return flat;
  }
  return (
    <div className={styles.slabStage}>
      <div className={cx(styles.flatLayer, ready && styles.gone)}>{flat}</div>
      <div className={cx(styles.viewer, ready && styles.shown)}>
        <ErrorBoundary fallback={() => null}>
          <Suspense fallback={null}>
            <CardViewer
              card={card}
              finishId={copy.finish}
              settings={settings}
              maxPixelRatio={MAX_PIXEL_RATIO[preferences.graphics]}
              flipRequest={0}
              condition={copy.condition}
              wearKey={copy.uid}
              slab={info}
              onReady={markReady}
            />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
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
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [index, setIndex] = useState(reduced ? FINAL : 0);
  const rootRef = useRef<HTMLDivElement>(null);
  const lastSound = useRef(-1);
  const done = index >= FINAL;
  const step = STEPS[index] ?? STEPS[FINAL];
  const band = gradeBand(grade.overall);
  const bright = band.id === 'pristine' || band.id === 'gem';
  const low = band.id === 'good' || band.id === 'played';

  // How many dials are filled, and which look is going on.
  const revealedCount = STEPS.slice(0, index + 1).filter((entry) => entry.kind === 'reveal').length;
  const looking = step?.kind === 'inspect' ? step.mark : null;
  const average = (grade.sub.centering + grade.sub.corners + grade.sub.edges + grade.sub.surface) / 4;

  // The page behind must not scroll while the reveal is open.
  useEffect(() => {
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    rootRef.current?.focus();
    return () => {
      document.documentElement.style.overflow = previous;
    };
  }, []);

  // One step after the other.
  useEffect(() => {
    const current = STEPS[index];
    if (current === undefined || current.kind === 'final') {
      return undefined;
    }
    const timer = window.setTimeout(() => setIndex(index + 1), DURATION[current.kind]);
    return () => window.clearTimeout(timer);
  }, [index]);

  // Sound: a sweep under the lamp, a bell for each mark, the stamp for the score. A skipped step stays silent.
  useEffect(() => {
    const current = STEPS[index];
    if (audio === null || current === undefined || lastSound.current === index) {
      return;
    }
    lastSound.current = index;
    if (current.kind === 'lamp') {
      audio.gradeScan();
    } else if (current.kind === 'reveal') {
      const part = MARKS[current.mark];
      if (part !== undefined) {
        audio.gradeMark(current.mark, grade.sub[part]);
      }
    } else if (current.kind === 'final') {
      audio.gradeStamp(grade.overall);
    }
  }, [audio, index, grade]);

  const skip = useCallback(() => setIndex(FINAL), []);

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

  if (card === undefined || step === undefined) {
    return null;
  }

  const looseYen = sellPrice(card.rarity, copy.finish);
  const message =
    step.kind === 'lamp'
      ? text.grading.ceremony.under
      : step.kind === 'inspect' || step.kind === 'reveal'
        ? text.grading.ceremony.checking[MARKS[step.mark] ?? 'centering']
        : text.grading.ceremony.sealing;

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
      data-low={low ? 'true' : undefined}
      onKeyDown={onKeyDown}
      onClick={onClick}
    >
      <span className={styles.lampCone} aria-hidden="true" />
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
        <div className={styles.exhibit}>
          {done ? (
            <div className={styles.slabbed}>
              <SlabStage copy={copy} />
              <p className={styles.turn}>{text.grading.ceremony.turn}</p>
            </div>
          ) : (
            <div className={styles.table}>
              <div className={styles.inspecting} data-look={lookOf(step)}>
                <CardFace card={card} finish={copy.finish} interactive={false} live={false} />
                <span className={styles.scope} aria-hidden="true">
                  <i className={styles.guideLeft} />
                  <i className={styles.guideRight} />
                  <i className={styles.guideTop} />
                  <i className={styles.guideBottom} />
                  <i className={styles.cornerA} />
                  <i className={styles.cornerB} />
                  <i className={styles.cornerC} />
                  <i className={styles.cornerD} />
                  <i className={styles.edgeRun} />
                  <i className={styles.laser} />
                </span>
              </div>
              <span className={styles.pool} aria-hidden="true" />
            </div>
          )}
        </div>

        <div className={styles.board}>
          <p className={styles.kicker}>{done ? card.name.en : message}</p>
          <ul className={styles.dials}>
            {MARKS.map((part, mark) => (
              <Dial key={part} name={text.grading.parts[part].name} mark={grade.sub[part]} revealed={revealedCount > mark || done} instant={reduced || done} looking={looking === mark} />
            ))}
          </ul>

          {!done && step.kind === 'sum' && (
            <p className={styles.sum}>
              {text.grading.ceremony.average} <strong>{average.toFixed(2)}</strong>
            </p>
          )}

          {done && (
            <div className={styles.result}>
              <div className={styles.score}>
                <strong>{formatGrade(grade.overall)}</strong>
                <span>{band.label}</span>
              </div>
              <p className={styles.average}>
                {text.grading.ceremony.average} {average.toFixed(2)}
              </p>
              <p className={styles.verdict}>{text.grading.ceremony.verdict[band.id]}</p>
              <dl className={styles.money}>
                <div>
                  <dt>{text.grading.ceremony.worthLabel}</dt>
                  <dd className={styles.worth}>{formatYen(slabValue(copy))}</dd>
                </div>
                <div>
                  <dt>{text.grading.ceremony.feeLabel}</dt>
                  <dd>{formatYen(fee)}</dd>
                </div>
                <div>
                  <dt>{text.grading.ceremony.looseLabel}</dt>
                  <dd>{formatYen(looseYen)}</dd>
                </div>
              </dl>
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
