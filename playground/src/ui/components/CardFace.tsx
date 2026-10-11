import { useRef, type CSSProperties, type PointerEvent } from 'react';
import { AFFINITY_INFO } from '../../cards/characters';
import type { FinishId } from '../../cards/finish';
import type { FrameStyle } from '../../cards/frameStyle';
import type { Card } from '../../cards/model';
import { usePreferences } from '../../state/app';
import { cx } from '../format';
import { useHoloTile } from '../hooks/useHoloTile';
import { useNearScreen, useThumbnail } from '../hooks/useThumbnail';
import styles from './CardFace.module.css';

export interface CardFaceProps {
  readonly card: Card;
  /** Which shimmer lies over the picture, and which light show hovers over it. */
  readonly finish: FinishId;
  /** A card the player does not have yet: shown dim and flat, with no light show. */
  readonly locked?: boolean;
  /** Lifts and shimmers under the pointer. Off for pictures that are not clickable. */
  readonly interactive?: boolean;
  /** Paints this frame design instead of the player's choice (for the previews in Settings). */
  readonly frameStyle?: FrameStyle;
  /**
   * Cards with a finish run the real foil shader of the 3D card while they are on screen (when the graphics allow it);
   * the flat picture with the CSS shimmer is what is left otherwise. Off where a picture must stay flat, like inside the pack show.
   */
  readonly live?: boolean;
}

/** The standing shimmer of every finish that has foil. The standard print is plain and only catches the light on hover. */
const FOIL: Readonly<Record<Exclude<FinishId, 'standard'>, string>> = {
  rainbow: styles.foilRainbow,
  sparkle: styles.foilSparkle,
  cosmos: styles.foilCosmos,
  gold: styles.foilGold,
  prism: styles.foilPrism,
  radiant: styles.foilRadiant,
};

function followPointer(event: PointerEvent<HTMLDivElement>): void {
  const box = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty('--mx', `${((event.clientX - box.left) / box.width) * 100}%`);
  event.currentTarget.style.setProperty('--my', `${((event.clientY - box.top) / box.height) * 100}%`);
}

/**
 * A picture of a card, painted lazily once it is near the screen. It starts flat (the picture plus a CSS shimmer) and, for a
 * card with a finish, the real foil shader takes over while the card is on screen (see useHoloTile).
 */
export function CardFace({ card, finish, locked = false, interactive = true, frameStyle, live = true }: CardFaceProps) {
  const [ref, near] = useNearScreen<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const preferences = usePreferences();
  const style = frameStyle ?? preferences.frameStyle;
  const thumbnail = useThumbnail(card, near, style);
  const tint = AFFINITY_INFO[card.kind === 'character' ? card.affinity : 'study'].color;
  const lightShow = finish === 'standard' ? styles.glare : styles[finish];
  const shimmer = finish === 'standard' || locked ? null : FOIL[finish];
  const foilMask = thumbnail?.foil ?? null;
  const shaded = live && !locked && finish !== 'standard' && preferences.graphics !== 'low';
  useHoloTile({ rootRef: ref, canvasRef, card, finish, frameStyle: style, thumbnail, enabled: shaded, pointer: interactive });

  return (
    <div
      ref={ref}
      className={cx(styles.face, interactive && !locked && styles.interactive, locked && styles.locked)}
      style={{ '--tint': tint } as CSSProperties}
      onPointerMove={interactive && !locked ? followPointer : undefined}
    >
      {thumbnail === null ? (
        <div className={styles.skeleton}>{String(card.number).padStart(3, '0')}</div>
      ) : (
        <img className={styles.picture} src={thumbnail.face} alt={`${card.name.en} · ${card.title}`} draggable={false} />
      )}
      {shaded && <canvas ref={canvasRef} className={styles.live} aria-hidden="true" />}
      {shimmer !== null && foilMask !== null && (
        <span className={cx(styles.foil, shimmer)} style={{ '--foil-mask': `url(${foilMask})` } as CSSProperties} aria-hidden="true" />
      )}
      {interactive && !locked && <span className={cx(styles.sheen, lightShow)} aria-hidden="true" />}
    </div>
  );
}
