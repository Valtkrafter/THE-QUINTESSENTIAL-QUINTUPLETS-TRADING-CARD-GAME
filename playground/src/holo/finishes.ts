import type { FinishId } from '../cards/finish';

export type { FinishId } from '../cards/finish';
export { isFinishId } from '../cards/finish';

export type MaskModeId = 'full' | 'artBox' | 'reverse' | 'frame' | 'highlights' | 'custom';

export interface FinishDefinition {
  readonly id: FinishId;
  readonly label: string;
  readonly description: string;
  /** Matches the `uFinish` branch in cardFront.frag.glsl. */
  readonly shaderIndex: number;
  readonly defaultMask: MaskModeId;
}

export const FINISHES = [
  {
    id: 'standard',
    label: 'Schlicht',
    description: 'Glänzender Druck ohne Folie. Daran werden alle anderen Schimmer gemessen.',
    shaderIndex: 0,
    defaultMask: 'full',
  },
  {
    id: 'rainbow',
    label: 'Regenbogen-Holo',
    description: 'Regenbogen wie von einem Beugungsgitter. Die Farbe folgt dem Blickwinkel, die Bänder wandern, wenn du die Karte kippst.',
    shaderIndex: 1,
    defaultMask: 'full',
  },
  {
    id: 'sparkle',
    label: 'Glitzer',
    description: 'Glitzerflocken, die jede für sich im Licht stehen. Nur die Flocken, die zum Licht zeigen, blitzen auf, deshalb funkelt es an und aus.',
    shaderIndex: 2,
    defaultMask: 'full',
  },
  {
    id: 'cosmos',
    label: 'Kosmos',
    description: 'Nebel und drei Sternenschichten in verschiedener Tiefe. Beim Kippen verschieben sie sich, als wäre hinter dem Druck das Weltall.',
    shaderIndex: 3,
    defaultMask: 'highlights',
  },
  {
    id: 'gold',
    label: 'Goldrausch',
    description: 'Glatt heißgeprägtes Gold mit sanftem Wellenglanz, der beim Kippen rollt. Das Bild bleibt als geprägter Ton erhalten.',
    shaderIndex: 4,
    defaultMask: 'full',
  },
  {
    id: 'prism',
    label: 'Prisma-Kristall',
    description: 'Eine Edelstein-Oberfläche aus schrägen Dreiecksflächen. Beim Kippen blitzt eine Fläche nach der anderen auf, mit farbig gespaltenem Licht und hellen Kanten.',
    shaderIndex: 5,
    defaultMask: 'full',
  },
  {
    id: 'radiant',
    label: 'Strahlenkranz',
    description: 'Lichtstrahlen und eingeätzte Ringe um einen Mittelpunkt. Beides dreht sich und wellt sich mit dem Kippen.',
    shaderIndex: 6,
    defaultMask: 'full',
  },
] as const satisfies readonly FinishDefinition[];

export type Finish = (typeof FINISHES)[number];

export interface MaskModeDefinition {
  readonly id: MaskModeId;
  readonly label: string;
  /** Matches the `uMaskMode` branch in cardFront.frag.glsl. */
  readonly shaderIndex: number;
}

export const MASK_MODES = [
  { id: 'full', label: 'Ganze Karte', shaderIndex: 0 },
  { id: 'artBox', label: 'Bildfeld', shaderIndex: 1 },
  { id: 'reverse', label: 'Außerhalb des Bildfelds (Reverse-Holo)', shaderIndex: 2 },
  { id: 'frame', label: 'Rahmenkante', shaderIndex: 3 },
  { id: 'highlights', label: 'Nur helle Stellen', shaderIndex: 4 },
  { id: 'custom', label: 'Eigene Maske', shaderIndex: 5 },
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
