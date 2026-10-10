import type { CSSProperties } from 'react';
import type { Rarity } from '../../cards/model';
import { TIER_LOOK, tierOf, type Tier } from '../../scene/pull/palette';

/** CSS variables that tint a part of the pull screen in the colour of a tier. */
export function tierStyle(tier: Tier): CSSProperties {
  return { '--tier': TIER_LOOK[tier].color, '--tier-light': TIER_LOOK[tier].light } as CSSProperties;
}

export function tierStyleOf(rarity: Rarity): CSSProperties {
  return tierStyle(tierOf(rarity));
}

export function isRainbow(rarity: Rarity): boolean {
  return tierOf(rarity) === 'rainbow';
}
