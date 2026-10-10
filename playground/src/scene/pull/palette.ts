// Colours and strengths of the pull show, decided by rarity. Pure data and small functions, so the rules of the show
// ("a gold star means a Special Art Rare") can be tested without a screen.

import { AFFINITY_INFO } from '../../cards/characters';
import type { Rarity } from '../../cards/model';
import { RARITY_IDS } from '../../cards/model';

/** The colour family of a rarity. A shooting star wears the colour of the best card in the pack. */
export type Tier = 'blue' | 'violet' | 'rose' | 'gold' | 'rainbow';

export const TIER_ORDER: readonly Tier[] = ['blue', 'violet', 'rose', 'gold', 'rainbow'];

const TIER_OF: Readonly<Record<Rarity, Tier>> = {
  C: 'blue',
  U: 'blue',
  R: 'blue',
  RR: 'violet',
  AR: 'rose',
  SAR: 'gold',
  UR: 'rainbow',
};

export function tierOf(rarity: Rarity): Tier {
  return TIER_OF[rarity];
}

/** 0 for blue up to 4 for rainbow. */
export function tierRank(tier: Tier): number {
  return TIER_ORDER.indexOf(tier);
}

/** Sort key of a rarity inside the reveal: weaker cards first, the best one last. */
export function rarityRank(rarity: Rarity): number {
  return RARITY_IDS.indexOf(rarity);
}

export interface TierLook {
  /** Main glow colour as a CSS hex string (the shaders convert it). */
  readonly color: string;
  /** Lighter colour for cores and highlights. */
  readonly light: string;
  readonly label: string;
}

export const TIER_LOOK: Readonly<Record<Tier, TierLook>> = {
  blue: { color: '#7fa9ff', light: '#cfe0ff', label: 'blue' },
  violet: { color: '#b085ff', light: '#e3d0ff', label: 'violet' },
  rose: { color: '#ff86c2', light: '#ffd3ea', label: 'rose' },
  gold: { color: '#ffc85a', light: '#fff0b8', label: 'gold' },
  rainbow: { color: '#ffffff', light: '#ffffff', label: 'rainbow' },
};

/** The five Heart colours, in the order of the sisters (Ichika, Nino, Miku, Yotsuba, Itsuki). */
export const HEART_COLORS: readonly string[] = [
  AFFINITY_INFO.heart.color,
  AFFINITY_INFO.butterfly.color,
  AFFINITY_INFO.melody.color,
  AFFINITY_INFO.clover.color,
  AFFINITY_INFO.star.color,
];

/**
 * The colours the shooting star shows during its flight, in order. A rare pack "upgrades" on the way (blue, then violet,
 * then gold), so the player cannot tell the result from the first second.
 */
export function starColors(best: Rarity): readonly Tier[] {
  switch (tierOf(best)) {
    case 'blue':
      return ['blue'];
    case 'violet':
      return ['blue', 'violet'];
    case 'rose':
      return ['blue', 'violet', 'rose'];
    case 'gold':
      return ['blue', 'violet', 'gold'];
    case 'rainbow':
      return ['violet', 'gold', 'rainbow'];
  }
}

/** The five light threads weave in for the two best rarities only. Zero means none. */
export function threadStrength(best: Rarity): number {
  switch (best) {
    case 'SAR':
      return 0.7;
    case 'UR':
      return 1;
    default:
      return 0;
  }
}

/**
 * How many stars the ceremony lights for the best card of a pack: the screen goes black, a thin line is drawn and the stars
 * on it light up one by one. Zero means no ceremony (only Art Rare and better get one).
 */
export function ceremonyStars(best: Rarity): number {
  switch (best) {
    case 'AR':
      return 3;
    case 'SAR':
      return 4;
    case 'UR':
      return 5;
    default:
      return 0;
  }
}

/** How big the burst at the end of the flight is, from 0.3 for a plain pack to 1 for an Ultra Rare. */
export function impactStrength(best: Rarity): number {
  return [0.3, 0.38, 0.5, 0.65, 0.8, 0.92, 1][RARITY_IDS.indexOf(best)] ?? 0.3;
}

/** How many particles burst at the impact of a pack with this best rarity. */
export function burstCount(best: Rarity): number {
  return Math.round(120 + impactStrength(best) * 520);
}

export interface RevealLook {
  readonly tier: Tier;
  /** Seconds of the flip, including the build-up. */
  readonly flipSeconds: number;
  /** 0..1: how much light and motion surround the card. */
  readonly intensity: number;
  /** The background goes dark and the camera pushes in for the top rarities. */
  readonly spotlight: boolean;
}

const FLIP_SECONDS: Readonly<Record<Rarity, number>> = { C: 0.6, U: 0.65, R: 0.8, RR: 1.05, AR: 1.3, SAR: 1.9, UR: 2.5 };

export function revealLook(rarity: Rarity): RevealLook {
  return {
    tier: tierOf(rarity),
    flipSeconds: FLIP_SECONDS[rarity],
    intensity: [0.15, 0.2, 0.35, 0.55, 0.7, 0.9, 1][RARITY_IDS.indexOf(rarity)] ?? 0.15,
    spotlight: rarity === 'SAR' || rarity === 'UR',
  };
}
