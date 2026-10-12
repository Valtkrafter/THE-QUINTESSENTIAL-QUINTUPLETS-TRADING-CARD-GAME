// What the player sees of an introduction: the page darkened except for the lit-up spot, a ring round the spot, and a speech bubble.
// This file only draws what it is given; `TutorialHost.tsx` decides which step it is and where the spot is.

import type { CSSProperties } from 'react';
import { cx } from '../format';
import { useElementSize } from '../hooks/useElementSize';
import { Button } from '../components/controls';
import { text } from '../text';
import styles from './Overlay.module.css';
import { bubbleWidth, placeBubble, type Rect } from './placement';
import type { TutorialStep } from './types';

/** How far the lit-up spot reaches beyond the thing it lights up. */
const PAD = 6;

export interface TargetView {
  readonly rect: Rect;
  /** The corner radius of the thing, so the ring follows its shape. */
  readonly radius: number;
}

export interface OverlayProps {
  readonly step: TutorialStep;
  /** "Tutorial · Packs". */
  readonly label: string;
  /** "Step 3 of 9", or null where steps depend on how the game goes. */
  readonly counter: string | null;
  /** Where the thing is, or null when there is none to light up (yet). */
  readonly target: TargetView | null;
  /** Gifts that were given for this step. */
  readonly notes: readonly string[];
  readonly onNext: () => void;
}

function px(value: number): string {
  return `${Math.round(value)}px`;
}

/** The four dark panels round the lit-up spot (and a plug over the spot when it may not be used). */
function Panels({ hole, plugged }: { readonly hole: Rect; readonly plugged: boolean }) {
  const right = hole.x + hole.w;
  const bottom = hole.y + hole.h;
  const top: CSSProperties = { left: 0, top: 0, right: 0, height: px(Math.max(0, hole.y)) };
  const under: CSSProperties = { left: 0, right: 0, bottom: 0, top: px(bottom) };
  const before: CSSProperties = { left: 0, top: px(hole.y), width: px(Math.max(0, hole.x)), height: px(hole.h) };
  const after: CSSProperties = { left: px(right), right: 0, top: px(hole.y), height: px(hole.h) };
  return (
    <>
      <span className={styles.panel} style={top} aria-hidden="true" />
      <span className={styles.panel} style={under} aria-hidden="true" />
      <span className={styles.panel} style={before} aria-hidden="true" />
      <span className={styles.panel} style={after} aria-hidden="true" />
      {plugged && <span className={styles.plug} style={{ left: px(hole.x), top: px(hole.y), width: px(hole.w), height: px(hole.h) }} aria-hidden="true" />}
    </>
  );
}

export function Overlay({ step, label, counter, target, notes, onNext }: OverlayProps) {
  const words = text.tutorial.ui;
  const [layerRef, viewport] = useElementSize<HTMLDivElement>();
  const [bubbleRef, size] = useElementSize<HTMLElement>();

  // The page is darkened and shut unless the step says no. A step that points at something that is not there (yet) never shuts the page:
  // whatever is needed to bring the spot up must stay possible.
  const dim = step.dim !== false;
  const waiting = step.target !== null && target === null;
  const shut = dim && !waiting;
  const hole: Rect | null =
    target === null
      ? null
      : {
          x: Math.max(0, target.rect.x - PAD),
          y: Math.max(0, target.rect.y - PAD),
          w: target.rect.w + 2 * PAD,
          h: target.rect.h + 2 * PAD,
        };

  // A bubble that only tells (a show, a reveal, an animation) lets presses through, so tapping anywhere still goes on.
  const passive = !dim && step.goal.kind !== 'next';
  const width = bubbleWidth(viewport.width);
  const place = placeBubble(hole, { w: width, h: size.height }, { w: viewport.width, h: viewport.height }, step.side, dim && !waiting);
  const usual = step.goal.kind === 'click' ? words.clickIt : step.goal.kind === 'when' ? words.doIt : null;
  const hint = waiting && step.goal.kind !== 'next' ? words.waiting : (step.hint ?? usual);

  return (
    <div ref={layerRef} className={styles.layer} data-tutorial-layer="" data-step={step.id} data-kind={step.goal.kind}>
      {shut && (hole === null ? <span className={styles.shield} aria-hidden="true" /> : <Panels hole={hole} plugged={step.goal.kind === 'next'} />)}
      {hole !== null && target !== null && (
        <span className={styles.ring} style={{ left: px(hole.x), top: px(hole.y), width: px(hole.w), height: px(hole.h), borderRadius: px(target.radius + PAD) }} aria-hidden="true" />
      )}
      <section
        ref={bubbleRef}
        className={cx(styles.bubble, passive && styles.passive)}
        role="region"
        aria-label={words.region}
        aria-live="polite"
        style={{ left: px(place.x), top: px(place.y), width: px(width), visibility: size.height === 0 ? 'hidden' : 'visible' }}
      >
        <p className={styles.head}>
          <span>{label}</span>
          {counter !== null && <span>{counter}</span>}
        </p>
        <h2 className={styles.title}>{step.title}</h2>
        <p className={styles.text}>{step.text}</p>
        {notes.map((note) => (
          <p key={note} className={styles.note}>
            {note}
          </p>
        ))}
        <div className={styles.foot}>
          {hint !== null && <span className={styles.hint}>{hint}</span>}
          {step.goal.kind === 'next' && (
            <Button key={step.id} kind="primary" onClick={onNext} autoFocus>
              {step.button ?? words.next}
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
