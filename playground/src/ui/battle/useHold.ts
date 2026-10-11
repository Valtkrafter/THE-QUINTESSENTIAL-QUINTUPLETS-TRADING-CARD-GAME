import { useCallback, useEffect, useRef, type MouseEvent, type PointerEvent } from 'react';

/** How long a finger has to stay on a card before it counts as "press and hold". */
const HOLD_MS = 450;
/** A finger that moves further than this (in pixels) is scrolling, not holding. */
const MOVE_LIMIT = 10;

export interface HoldHandlers {
  readonly onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  readonly onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  readonly onPointerUp: () => void;
  readonly onPointerCancel: () => void;
  readonly onPointerLeave: () => void;
  readonly onContextMenu: (event: MouseEvent<HTMLElement>) => void;
  /** Call first in the click handler: true when this click is only the end of a press and hold, which must not do anything else. */
  readonly wasHeld: () => boolean;
}

/**
 * Press and hold with a finger or a pen (a mouse has hover instead). Phones cannot hover, so this is how a card on the table is
 * looked at closely. Without a `onHold` nothing is attached.
 */
export function useHold(onHold: (() => void) | undefined): HoldHandlers {
  const timer = useRef<number | null>(null);
  const origin = useRef<{ readonly x: number; readonly y: number } | null>(null);
  const held = useRef(false);
  const touching = useRef(false);

  const cancel = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    origin.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  return {
    onPointerDown: (event) => {
      touching.current = event.pointerType !== 'mouse';
      if (onHold === undefined || event.pointerType === 'mouse') {
        return;
      }
      held.current = false;
      origin.current = { x: event.clientX, y: event.clientY };
      timer.current = window.setTimeout(() => {
        timer.current = null;
        held.current = true;
        onHold();
      }, HOLD_MS);
    },
    onPointerMove: (event) => {
      const start = origin.current;
      if (start !== null && Math.hypot(event.clientX - start.x, event.clientY - start.y) > MOVE_LIMIT) {
        cancel();
      }
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    // A long press on a phone also opens the browser's own menu; that is not wanted on a card (a mouse keeps its right click).
    onContextMenu: (event) => {
      if (onHold !== undefined && touching.current) {
        event.preventDefault();
      }
    },
    wasHeld: () => {
      const was = held.current;
      held.current = false;
      return was;
    },
  };
}
