import { useEffect, type RefObject } from 'react';
import { loadImage } from '../../cardface/images';
import type { Thumbnail } from '../../cardface/thumbnails';
import type { FinishId } from '../../cards/finish';
import type { FrameStyle } from '../../cards/frameStyle';
import type { Card } from '../../cards/model';
import { findFinish, resolveMaskIndex } from '../../holo/finishes';
import { frameInsetUv, hasFrame } from '../../holo/frames';
import { premiumStrength } from '../../holo/premium';
import { pointerInBox } from '../../holo/tileMath';
import type { HoloTile, TileLook } from '../../holo/tileRenderer';
import { usePreferences } from '../../state/app';

export interface HoloTileInput {
  /** The element the card lives in: it gets `data-live="on"` while the canvas shows the shader picture. */
  readonly rootRef: RefObject<HTMLElement | null>;
  readonly canvasRef: RefObject<HTMLCanvasElement | null>;
  readonly card: Card;
  readonly finish: FinishId;
  readonly frameStyle: FrameStyle;
  readonly thumbnail: Thumbnail | null;
  /** Off for cards that must stay flat: locked cards, plain prints, pictures inside the pack show. */
  readonly enabled: boolean;
  /** The card tilts toward the pointer and catches its light. */
  readonly pointer: boolean;
}

interface Mounted {
  readonly root: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly faceUrl: string;
  readonly maskUrl: string;
  readonly look: TileLook;
  readonly phase: number;
  readonly level: 'high' | 'normal';
  readonly animateIdle: boolean;
  readonly pointer: boolean;
}

/** Starts the shared foil renderer for this card. Resolves to the function that stops it, or null when the card stays flat. */
async function mountTile(input: Mounted): Promise<(() => void) | null> {
  const [face, mask, renderer] = await Promise.all([loadImage(input.faceUrl), loadImage(input.maskUrl), import('../../holo/tileRenderer')]);
  if (face === null || mask === null) {
    return null;
  }
  const { root } = input;
  const tile: HoloTile | null = renderer.createHoloTile({
    canvas: input.canvas,
    face,
    mask,
    look: input.look,
    phase: input.phase,
    level: input.level,
    animateIdle: input.animateIdle,
    onShown: (shown) => {
      if (shown) {
        root.setAttribute('data-live', 'on');
      } else {
        root.removeAttribute('data-live');
      }
    },
    onLost: () => root.removeAttribute('data-live'),
  });
  if (tile === null) {
    return null;
  }

  const visibility = new IntersectionObserver(
    (entries) => {
      const last = entries.at(-1);
      if (last !== undefined) {
        tile.setVisible(last.isIntersecting);
      }
    },
    { rootMargin: '120px 0px' },
  );
  visibility.observe(root);
  const size = new ResizeObserver((entries) => {
    const last = entries.at(-1);
    if (last !== undefined) {
      tile.resize(last.contentRect.width * window.devicePixelRatio);
    }
  });
  size.observe(root);

  const move = (event: PointerEvent): void => {
    const point = pointerInBox(event.clientX, event.clientY, root.getBoundingClientRect());
    tile.pointer(point.x, point.y);
  };
  const leave = (): void => tile.leave();
  if (input.pointer) {
    root.addEventListener('pointermove', move);
    root.addEventListener('pointerleave', leave);
    root.addEventListener('pointercancel', leave);
  }

  return () => {
    visibility.disconnect();
    size.disconnect();
    root.removeEventListener('pointermove', move);
    root.removeEventListener('pointerleave', leave);
    root.removeEventListener('pointercancel', leave);
    tile.dispose();
    root.removeAttribute('data-live');
  };
}

/**
 * Lets a card of a grid run the real foil shader (the one of the 3D card) instead of the flat picture with a CSS shimmer.
 * The renderer is loaded on demand and shared by all cards; where it cannot run (no WebGL, low graphics, a chip reset)
 * nothing changes and the card keeps its flat look.
 */
export function useHoloTile({ rootRef, canvasRef, card, finish, frameStyle, thumbnail, enabled, pointer }: HoloTileInput): void {
  const { graphics, idleMotion } = usePreferences();
  const faceUrl = thumbnail?.face ?? null;
  const maskUrl = thumbnail?.mask ?? null;
  const { rarity, number } = card;

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!enabled || graphics === 'low' || faceUrl === null || maskUrl === null || root === null || canvas === null) {
      return undefined;
    }
    const definition = findFinish(finish);
    const look: TileLook = {
      finishIndex: definition.shaderIndex,
      maskIndex: resolveMaskIndex('auto', definition, true, hasFrame(frameStyle)),
      premium: premiumStrength(rarity),
      frameInset: frameInsetUv(frameStyle),
    };
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cancelled = false;
    let stop: (() => void) | null = null;
    mountTile({
      root,
      canvas,
      faceUrl,
      maskUrl,
      look,
      phase: number * 1.37,
      level: graphics,
      animateIdle: idleMotion && !reducedMotion,
      pointer,
    }).then(
      (stopper) => {
        if (cancelled) {
          stopper?.();
        } else {
          stop = stopper;
        }
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [rootRef, canvasRef, enabled, graphics, idleMotion, faceUrl, maskUrl, finish, frameStyle, rarity, number, pointer]);
}
