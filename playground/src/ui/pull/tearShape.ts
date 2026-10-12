// The shape of the tear: where the foil of a pack comes apart while the player swipes across its top. Plain maths on
// percentages of the pack, so it can be tested without a screen. The three parts of the pack are drawn with a `clip-path`:
// the pack below the tear line, the strip that is still whole, and the strip that has been torn off and curls up.

/** The tear line sits this far down the pack, in percent of its height (just under the crimped top). */
export const TEAR_LINE = 11.5;

/** How far the torn edge wanders above and below the line, in percent of the height. The pattern repeats along the pack. */
const JITTER: readonly number[] = [0, 0.9, -0.7, 1.2, -0.4, 0.8, -1.1, 0.5, -0.8, 1.0, -0.3, 0.7, -0.9, 1.1];

/** Distance between two points of the torn edge, in percent of the width. */
const STEP = 2.4;

export interface TearShape {
  /** What is left of the pack: everything under the line, with a ragged top edge where the strip is gone. */
  readonly rest: string;
  /** The part of the strip that is still whole, to the right of the tear. */
  readonly strip: string;
  /** The part of the strip that has been torn off, to the left of the tear. */
  readonly flap: string;
  /** Where the torn part turns, as the `transform-origin` of the flap. */
  readonly pivot: string;
}

function point(x: number, y: number): string {
  return `${x.toFixed(2)}% ${y.toFixed(2)}%`;
}

/** The ragged edge from the left side to `reach` percent of the width, as points. */
function edge(reach: number): readonly (readonly [number, number])[] {
  const points: [number, number][] = [];
  for (let x = 0, i = 0; x < reach; x += STEP, i += 1) {
    points.push([x, TEAR_LINE + (JITTER[i % JITTER.length] ?? 0)]);
  }
  points.push([reach, TEAR_LINE]);
  return points;
}

/** The clip paths of the three parts when the tear has gone `progress` (0..1) of the way across the pack. */
export function tearShape(progress: number): TearShape {
  const p = Math.min(1, Math.max(0, progress));
  const reach = p * 100;
  const torn = edge(reach);
  const rest = [...torn, [100, TEAR_LINE], [100, 100], [0, 100]] as const;
  const strip = [[reach, 0], [100, 0], [100, TEAR_LINE], [reach, TEAR_LINE]] as const;
  const flap = [[0, 0], [reach, 0], ...[...torn].reverse()] as const;
  const toPolygon = (points: readonly (readonly [number, number])[]) => `polygon(${points.map(([x, y]) => point(x, y)).join(', ')})`;
  return { rest: toPolygon(rest), strip: toPolygon(strip), flap: toPolygon(flap), pivot: `${reach.toFixed(2)}% ${TEAR_LINE}%` };
}

/** How far the torn strip has turned up, in degrees, for a tear that has gone `progress` of the way. */
export function flapAngle(progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  return p === 0 ? 0 : 14 + 46 * p;
}

/**
 * A pointer move turns into progress: the further it went to the right from where it started, the further the tear.
 * Moving left or up and down does nothing. `span` is the distance (in pixels) that tears the whole pack.
 */
export function dragProgress(startX: number, currentX: number, span: number): number {
  if (span <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, (currentX - startX) / span));
}

/** Where a released tear goes: on to the end when it is past the middle, back to the start when it is not. */
export function releaseTarget(progress: number): 0 | 1 {
  return progress >= 0.38 ? 1 : 0;
}
