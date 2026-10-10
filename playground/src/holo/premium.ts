import type { Rarity } from '../cards/model';

/**
 * Strength of the embossed foil layer. It exists only on SAR and UR cards: every other rarity returns 0,
 * which switches the layer off in the shader. UR is pressed a little deeper than SAR.
 */
export function premiumStrength(rarity: Rarity): number {
  switch (rarity) {
    case 'SAR':
      return 1;
    case 'UR':
      return 1.35;
    default:
      return 0;
  }
}
