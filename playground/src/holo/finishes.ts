export type MaskModeId = 'full' | 'artBox' | 'reverse' | 'frame' | 'highlights' | 'custom';

export interface FinishDefinition {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  /** Matches the `uFinish` branch in cardFront.frag.glsl. */
  readonly shaderIndex: number;
  readonly defaultMask: MaskModeId;
}

export const FINISHES = [
  {
    id: 'standard',
    label: 'Standard',
    description: 'Gloss-laminated print with no foil. The baseline the other finishes are judged against.',
    shaderIndex: 0,
    defaultMask: 'full',
  },
  {
    id: 'rainbow',
    label: 'Rainbow Holo',
    description: 'Diffraction-grating rainbow. Hue follows the viewing angle, so the bands sweep as the card tilts.',
    shaderIndex: 1,
    defaultMask: 'full',
  },
  {
    id: 'sparkle',
    label: 'Sparkle',
    description: 'Glitter flakes with individual normals. Only the flakes facing the light catch it, so they twinkle in and out.',
    shaderIndex: 2,
    defaultMask: 'full',
  },
  {
    id: 'cosmos',
    label: 'Cosmos',
    description: 'Nebula and three star layers at different depths. Parallax makes them read as space behind the print.',
    shaderIndex: 3,
    defaultMask: 'highlights',
  },
  {
    id: 'gold',
    label: 'Gold Foil',
    description: 'Smooth hot-stamped gold with a gentle ripple that rolls the reflections as you tilt. The art survives as an embossed tone.',
    shaderIndex: 4,
    defaultMask: 'full',
  },
  {
    id: 'prism',
    label: 'Prism Crystal',
    description: 'A cut-gem surface of tilted triangular facets. Facets flash in turn as you tilt, with colour-split highlights and bright bevel lines.',
    shaderIndex: 5,
    defaultMask: 'full',
  },
  {
    id: 'radiant',
    label: 'Radiant',
    description: 'Starburst rays and etched rings around a focal point. Both rotate and ripple with the tilt.',
    shaderIndex: 6,
    defaultMask: 'full',
  },
] as const satisfies readonly FinishDefinition[];

export type Finish = (typeof FINISHES)[number];
export type FinishId = Finish['id'];

export interface MaskModeDefinition {
  readonly id: MaskModeId;
  readonly label: string;
  /** Matches the `uMaskMode` branch in cardFront.frag.glsl. */
  readonly shaderIndex: number;
}

export const MASK_MODES = [
  { id: 'full', label: 'Whole card', shaderIndex: 0 },
  { id: 'artBox', label: 'Art box', shaderIndex: 1 },
  { id: 'reverse', label: 'Outside art box (reverse holo)', shaderIndex: 2 },
  { id: 'frame', label: 'Frame edge', shaderIndex: 3 },
  { id: 'highlights', label: 'Bright areas only', shaderIndex: 4 },
  { id: 'custom', label: 'Custom mask image', shaderIndex: 5 },
] as const satisfies readonly MaskModeDefinition[];

export type MaskSetting = MaskModeId | 'auto';

/**
 * Regions that depend on where the art box sits in the card layout. Hidden from the picker until that
 * layout is decided: on full-bleed art the placeholder box slices straight through the illustration.
 */
export const LAYOUT_MASK_MODES: ReadonlySet<MaskModeId> = new Set<MaskModeId>(['artBox', 'reverse']);

/** Art box in card uv (origin bottom-left). Placeholder until the card layout is decided. */
export const ART_BOX = { minU: 0.075, minV: 0.47, maxU: 0.925, maxV: 0.905 } as const;

export function findFinish(id: FinishId): Finish {
  return FINISHES.find((finish) => finish.id === id) ?? FINISHES[0];
}

/**
 * `auto` uses the art's own mask when it has one (composed cards always do), else the finish default.
 * "Frame edge" needs a frame: on borderless frame styles it falls back to the automatic choice.
 */
export function resolveMaskIndex(setting: MaskSetting, finish: Finish, hasMask: boolean, hasFrame: boolean): number {
  const autoMode: MaskModeId = hasMask ? 'custom' : finish.defaultMask;
  const modeId = setting === 'auto' || (setting === 'frame' && !hasFrame) ? autoMode : setting;
  return MASK_MODES.find((mode) => mode.id === modeId)?.shaderIndex ?? 0;
}

export function isMaskSetting(value: string): value is MaskSetting {
  return value === 'auto' || MASK_MODES.some((mode) => mode.id === value);
}

export function isFinishId(value: string): value is FinishId {
  return FINISHES.some((finish) => finish.id === value);
}
