// The first thing of every pack opening: the closed pack lies on the table and the player tears it open by swiping across its
// top. Light pours out of the gap, the strip curls away, and when the whole top is torn the screen goes white and the storm
// of the show begins. A tap on the pack (or a key) tears it by itself, so nobody needs a swipe. The movement is in
// `tearController.ts`, the shape of the tear is plain maths in `tearShape.ts`; this component only draws the parts.

import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import type { PackDefinition } from '../../packs/schema';
import { PackArt } from '../packs/PackArt';
import { text } from '../text';
import styles from './PackTear.module.css';
import { PackTearController } from './tearController';

export interface PackTearProps {
  readonly pack: PackDefinition;
  /** Increases when the player asks for the pack to be opened without a swipe (a key, a tap beside the pack). */
  readonly openRequest: number;
  /** The tear begins: the sound of foil. */
  readonly onRip: () => void;
  /** The screen is white: the show goes on behind it. */
  readonly onOpen: () => void;
  /** The white has died down: this component is not needed any more. */
  readonly onGone: () => void;
}

const SPARKS = Array.from({ length: 16 }, (_, index) => ({
  left: 8 + ((index * 53) % 84),
  delay: -((index * 0.73) % 6),
  duration: 5 + ((index * 37) % 40) / 10,
  size: 3 + ((index * 5) % 5),
}));

export function PackTear({ pack, openRequest, onRip, onOpen, onGone }: PackTearProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const restRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const flapRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const beamRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const controller = useRef<PackTearController | null>(null);
  const lastRequest = useRef(openRequest);
  // The latest callbacks, so the animations that outlive a render call the current ones.
  const callbacks = useRef({ onRip, onOpen, onGone });
  useEffect(() => {
    callbacks.current = { onRip, onOpen, onGone };
  }, [onRip, onOpen, onGone]);

  useEffect(() => {
    const box = boxRef.current;
    const rest = restRef.current;
    const strip = stripRef.current;
    const flap = flapRef.current;
    const glow = glowRef.current;
    const beam = beamRef.current;
    const flash = flashRef.current;
    if (box === null || rest === null || strip === null || flap === null || glow === null || beam === null || flash === null) {
      return undefined;
    }
    const made = new PackTearController(
      { box, rest, strip, flap, glow, beam, flash },
      { onRip: () => callbacks.current.onRip(), onOpen: () => callbacks.current.onOpen(), onGone: () => callbacks.current.onGone() },
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
    controller.current = made;
    return () => {
      made.dispose();
      controller.current = null;
    };
  }, []);

  // A key, or a tap beside the pack, asks for the pack to be opened.
  useEffect(() => {
    if (openRequest !== lastRequest.current) {
      lastRequest.current = openRequest;
      controller.current?.open();
    }
  }, [openRequest]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    event.stopPropagation();
    if (controller.current?.pointerDown(event.pointerId, event.clientX, event.clientY) === true) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  return (
    <div className={styles.stage} data-pack-tear data-art={pack.art}>
      <div className={styles.aura} aria-hidden="true" />
      <div className={styles.sparks} aria-hidden="true">
        {SPARKS.map((spark, index) => (
          <i key={index} style={{ left: `${spark.left}%`, animationDelay: `${spark.delay}s`, animationDuration: `${spark.duration}s`, width: spark.size, height: spark.size }} />
        ))}
      </div>
      <div className={styles.table}>
        <div className={styles.shadow} aria-hidden="true" />
        <div
          ref={boxRef}
          className={styles.box}
          data-tutorial="pack-tear"
          role="button"
          tabIndex={-1}
          aria-label={text.pull.tear.label(pack.name)}
          onPointerDown={onPointerDown}
          onPointerMove={(event) => controller.current?.pointerMove(event.pointerId, event.clientX, event.clientY)}
          onPointerUp={(event) => {
            event.stopPropagation();
            controller.current?.pointerUp(event.pointerId);
          }}
          onPointerCancel={() => controller.current?.pointerCancel()}
        >
          <div ref={beamRef} className={styles.beam} aria-hidden="true" />
          <div ref={glowRef} className={styles.glow} aria-hidden="true" />
          <div ref={restRef} className={styles.layer} aria-hidden="true">
            <PackArt kind={pack.art} still />
          </div>
          <div ref={stripRef} className={styles.layer} aria-hidden="true">
            <PackArt kind={pack.art} still />
          </div>
          <div ref={flapRef} className={styles.layer} aria-hidden="true">
            <PackArt kind={pack.art} still />
          </div>
          <span className={styles.guide} aria-hidden="true" />
          <span className={styles.shine} aria-hidden="true" />
        </div>
        <p className={styles.hint}>
          <strong>{text.pull.tear.hint}</strong>
          <span>{text.pull.tear.hintOr}</span>
        </p>
      </div>
      <div ref={flashRef} className={styles.flash} aria-hidden="true" />
    </div>
  );
}
