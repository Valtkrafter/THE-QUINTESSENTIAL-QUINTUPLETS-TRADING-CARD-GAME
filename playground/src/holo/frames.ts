import { FACE_HEIGHT, FACE_WIDTH } from '../cardface/paint';
import type { FrameStyle } from './settings';

/**
 * Width in face pixels of the printed border each frame style draws around the art (0 = no border).
 * The Classic frame draws its pearl border from this value, and the shader's "Frame edge" foil region
 * reads the same value, so the two can never drift apart.
 */
export const FRAME_BORDER_PX: Readonly<Record<FrameStyle, number>> = {
  classic: 24,
  paper: 0,
  fade: 0,
  glass: 0,
};

export function hasFrame(style: FrameStyle): boolean {
  return FRAME_BORDER_PX[style] > 0;
}

/** Border width as a fraction of the card face (x, y), the unit the shader works in. */
export function frameInsetUv(style: FrameStyle): readonly [number, number] {
  const border = FRAME_BORDER_PX[style];
  return [border / FACE_WIDTH, border / FACE_HEIGHT];
}
