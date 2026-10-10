// The full-screen pack opening: the 3D show underneath, and on top of it the buttons, the name of the card that was just
// revealed, the tray with the cards seen so far and, at the end, the summary. It also turns the show's events into sound.

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent } from 'react';
import { RARITIES } from '../../cards/model';
import type { PackOpening } from '../../packs/openPack';
import { bestRarity, ceremonyBeats, ceremonyFor, phaseDuration } from '../../scene/pull/director';
import { threadStrength, tierOf } from '../../scene/pull/palette';
import { PullScene } from '../../scene/pull/PullScene';
import { PullRunner } from '../../scene/pull/runner';
import { ordersOf, showPacksOf, type ScenePack } from '../../scene/pull/types';
import { usePreferences } from '../../state/app';
import { MAX_PIXEL_RATIO } from '../../state/preferences';
import { CardFace } from '../components/CardFace';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { SkipIcon } from '../components/icons';
import { cx } from '../format';
import { text } from '../text';
import { NamePlate } from './NamePlate';
import styles from './PullOverlay.module.css';
import { PullSummary } from './PullSummary';
import { tierStyleOf } from './tierStyle';
import { usePrepared } from './usePrepared';
import { usePullAudio } from './usePullAudio';

export interface PullOverlayProps {
  readonly openings: readonly PackOpening[];
  /** A trial run from the development settings: nothing was bought, so there is no "one more pack". */
  readonly preview?: boolean;
  readonly onClose: () => void;
  readonly onAgain: (packId: string, count: number) => void;
}

const TAP_DISTANCE = 8;
const SLOTS = 5;

/** Reports that the 3D scene crashed, so the screen can jump to the summary. */
function SceneFailed({ onFail }: { readonly onFail: () => void }) {
  useEffect(() => {
    onFail();
  }, [onFail]);
  return null;
}

export default function PullOverlay({ openings, preview = false, onClose, onAgain }: PullOverlayProps) {
  const preferences = usePreferences();
  const [mode] = useState(() =>
    preferences.pullAnimation === 'full' && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'short' : preferences.pullAnimation,
  );
  const [showFailed, setShowFailed] = useState(false);
  const packs = useMemo<readonly ScenePack[]>(
    () => openings.map((opening) => ({ pulls: opening.pulls.map((pull) => ({ card: pull.card, finish: pull.owned.finish })) })),
    [openings],
  );
  const orders = useMemo(() => ordersOf(packs), [packs]);
  const runner = useMemo(() => new PullRunner(showPacksOf(packs), mode), [packs, mode]);
  const prepared = usePrepared(packs);
  const audio = usePullAudio();
  const snapshot = useSyncExternalStore(runner.subscribe, runner.getSnapshot);
  const rootRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<{ readonly x: number; readonly y: number } | null>(null);

  useEffect(() => {
    if (import.meta.env.DEV) {
      Object.assign(window, { __pullRunner: runner });
    }
  }, [runner]);

  // The page behind must not scroll while the show is open.
  useEffect(() => {
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = previous;
    };
  }, []);

  const opening = openings[snapshot.pack];
  const order = orders[snapshot.pack] ?? [];
  const current = opening?.pulls[order[snapshot.card] ?? -1];
  const inSummary = snapshot.phase === 'summary';
  const inCinematic = snapshot.phase === 'intro' || snapshot.phase === 'flight' || snapshot.phase === 'impact' || snapshot.phase === 'ceremony';

  // Sound of the very first storm: the show starts in its intro without an event, so the cue is given here, as soon as both
  // the cards and the sound are ready (a sound that is late would be out of step with the picture and is left out).
  useEffect(() => {
    const first = runner.packs[0];
    if (audio !== null && prepared && first !== undefined && runner.state.phase === 'intro' && runner.state.pack === 0 && runner.state.time < 0.4) {
      audio.intro(phaseDuration(runner.mode, first, 'intro', 0) - runner.state.time);
    }
  }, [audio, prepared, runner]);

  // Sound: the show's events become cues.
  useEffect(
    () =>
      runner.onEvent((event) => {
        const pack = runner.packs[event.pack];
        if (audio === null || pack === undefined) {
          return;
        }
        const best = bestRarity(pack);
        const index = event.type === 'impact' ? undefined : orders[event.pack]?.[event.card];
        const rarity = index === undefined ? undefined : pack.rarities[index];
        if (event.type === 'impact') {
          audio.impact(tierOf(best));
        } else if (event.type === 'flip-midpoint' && rarity !== undefined) {
          const pull = openings[event.pack]?.pulls[index ?? -1];
          audio.reveal(rarity, tierOf(rarity), pull?.isNew ?? false);
        } else if (event.type === 'phase') {
          if (event.phase === 'intro') {
            audio.intro(phaseDuration(runner.mode, pack, 'intro', 0));
          } else if (event.phase === 'flight') {
            audio.flight({ seconds: phaseDuration(runner.mode, pack, 'flight', 0), tier: tierOf(best), threads: runner.mode === 'full' && threadStrength(best) > 0 });
          } else if (event.phase === 'ceremony') {
            const beats = ceremonyBeats(ceremonyFor(runner.mode, best));
            audio.ceremony({ stars: beats.stars, tier: tierOf(best), firstStar: beats.firstStar, starGap: beats.starGap, seconds: beats.duration });
          } else if (event.phase === 'flip' && rarity !== undefined) {
            audio.flip(tierOf(rarity), phaseDuration(runner.mode, pack, 'flip', event.card));
          } else if (event.phase === 'summary') {
            audio.stop();
            audio.summary();
          }
        }
      }),
    [runner, audio, orders, openings],
  );

  const tap = useCallback(() => {
    if (runner.state.phase === 'summary') {
      return;
    }
    if (runner.state.phase === 'ceremony') {
      // Leaving the ceremony early also cuts its bells and its chord.
      audio?.stop();
    }
    audio?.tap();
    runner.tap();
  }, [runner, audio]);

  useEffect(() => {
    rootRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === ' ' || event.key === 'Enter' || event.key === 'ArrowRight') {
        event.preventDefault();
        tap();
      } else if (event.key === 'Escape') {
        if (runner.state.phase === 'summary') {
          onClose();
        } else {
          audio?.stop();
          runner.skip();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [runner, audio, tap, onClose]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointerStart.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (start === null || (event.target instanceof Element && event.target.closest('button, a'))) {
      return;
    }
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) < TAP_DISTANCE) {
      tap();
    }
  };

  const skip = () => {
    audio?.stop();
    runner.skip();
  };

  const revealed = new Set(order.slice(0, snapshot.phase === 'exit' ? snapshot.card + 1 : snapshot.card));
  const showPlate = snapshot.phase === 'show' && current !== undefined;
  const lastCard = snapshot.card + 1 >= (opening?.pulls.length ?? 0);

  return (
    <div
      ref={rootRef}
      className={styles.root}
      role="dialog"
      aria-modal="true"
      aria-label={opening?.pack.name ?? ''}
      tabIndex={-1}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <div className={styles.canvas}>
        <ErrorBoundary
          fallback={() => (
            <SceneFailed
              onFail={() => {
                setShowFailed(true);
                runner.skip();
              }}
            />
          )}
        >
          <PullScene
            runner={runner}
            packs={packs}
            graphics={preferences.graphics}
            frameStyle={preferences.frameStyle}
            idleMotion={preferences.idleMotion}
            maxPixelRatio={MAX_PIXEL_RATIO[preferences.graphics]}
            running={prepared}
          />
        </ErrorBoundary>
      </div>

      {!prepared && <p className={styles.preparing}>{text.pull.preparing}</p>}

      {!inSummary && (
        <header className={styles.top}>
          <div className={styles.label}>
            <strong>{opening?.pack.name}</strong>
            {openings.length > 1 && <span>{text.pull.pack(snapshot.pack + 1, openings.length)}</span>}
          </div>
          <button type="button" className={styles.skip} onClick={skip}>
            {text.pull.skip}
            <SkipIcon size={16} />
          </button>
        </header>
      )}

      {showPlate && current !== undefined && <NamePlate key={`${snapshot.pack}-${snapshot.card}`} pull={current} />}

      {!inSummary && (
        <>
          <p key={`${snapshot.pack}-${snapshot.phase}-${snapshot.card}`} className={cx(styles.hint, inCinematic && styles.hintLate)}>
            {inCinematic ? text.pull.hintSkip : snapshot.phase === 'show' ? (lastCard && snapshot.pack + 1 >= openings.length ? text.pull.hintSummary : text.pull.hintNext) : ''}
          </p>
          {!inCinematic && opening !== undefined && (
            <ol className={styles.tray} aria-hidden="true">
              {Array.from({ length: Math.min(SLOTS, opening.pulls.length) }, (_, slot) => {
                const pullIndex = order[slot];
                const pull = pullIndex === undefined ? undefined : opening.pulls[pullIndex];
                const seen = pullIndex !== undefined && revealed.has(pullIndex);
                return (
                  <li key={slot} className={cx(styles.slot, seen && styles.seen, slot === snapshot.card && styles.here)} style={pull === undefined ? undefined : tierStyleOf(pull.card.rarity)}>
                    {seen && pull !== undefined && <CardFace card={pull.card} finish={pull.owned.finish} interactive={false} />}
                  </li>
                );
              })}
            </ol>
          )}
        </>
      )}

      {inSummary && <PullSummary openings={openings} preview={preview} showFailed={showFailed} onClose={onClose} onAgain={onAgain} />}
      <span className={styles.srOnly} aria-live="polite">
        {current !== undefined && snapshot.phase === 'show' ? `${current.card.name.en}, ${RARITIES.find((entry) => entry.id === current.card.rarity)?.label ?? ''}` : ''}
      </span>
    </div>
  );
}

