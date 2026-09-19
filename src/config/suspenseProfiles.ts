/**
 * TQQ Vault - Volumetric Suspense Edge-Glow Profiles & Resolvers
 * Maps card rarity and surface finish tiers deterministically to volumetric
 * edge-glow optics and particle density specifications.
 */

import type { CardInstance, Finish, Rarity } from '../types/card';
import type {
  CardFinishTier,
  EdgeGlowProfile,
  SuspenseTier,
} from '../types/packCeremony';

/**
 * Deterministic edge-glow profiles for all suspense tiers.
 */
export const SUSPENSE_PROFILES: Record<SuspenseTier, EdgeGlowProfile> = {
  standard: {
    colorHex: '#ffffff15',
    secondaryHex: '#94a3b8',
    blurRadiusPx: 12,
    spreadPx: 2,
    pulseDurationSec: 2.4,
    particleCount: 0,
    suspenseTier: 'standard',
  },
  rare: {
    colorHex: '#8b5cf6',
    secondaryHex: '#3b82f6',
    blurRadiusPx: 24,
    spreadPx: 6,
    pulseDurationSec: 1.6,
    particleCount: 8,
    suspenseTier: 'rare',
  },
  ultra: {
    colorHex: '#f59e0b',
    secondaryHex: '#ec4899',
    blurRadiusPx: 38,
    spreadPx: 12,
    pulseDurationSec: 0.9,
    particleCount: 24,
    suspenseTier: 'ultra',
  },
  god: {
    colorHex: '#ffd700',
    secondaryHex: '#06b6d4',
    blurRadiusPx: 52,
    spreadPx: 20,
    pulseDurationSec: 0.5,
    particleCount: 48,
    suspenseTier: 'god',
  },
};

/**
 * Normalizes any card Finish string to the ceremony CardFinishTier schema.
 */
export function mapFinishToCardFinishTier(finish: Finish | CardFinishTier | string): CardFinishTier {
  if (finish === 'signed' || finish === 'signed_sp') {
    return 'signed_sp';
  }
  if (finish === 'gold_etched') {
    return 'gold_etched';
  }
  if (finish === 'rainbow') {
    return 'rainbow';
  }
  if (finish === 'sparkle') {
    return 'sparkle';
  }
  if (finish === 'holo') {
    return 'holo';
  }
  return 'raw';
}

/**
 * Evaluates the appropriate SuspenseTier based on rarity and surface finish.
 * Priority hierarchy: God > Ultra > Rare > Standard.
 * - God: Master Rare ('MR') or Signed SP finish ('signed' / 'signed_sp')
 * - Ultra: Ultra Rare ('UR') / Secret Rare ('SEC') or Rainbow / Gold-Etched finish
 * - Rare: Rare ('R') / Super Rare ('SR') or Holo / Sparkle finish
 * - Standard: Common ('C') / Uncommon ('UC') with Raw finish
 */
export function resolveSuspenseTier(
  rarity: Rarity | string,
  finish: Finish | CardFinishTier | string
): SuspenseTier {
  const normalizedFinish = mapFinishToCardFinishTier(finish);
  const normalizedRarity = (rarity ?? '').toUpperCase();

  // Tier 1: God / Master / Signed SP
  if (normalizedRarity === 'MR' || normalizedFinish === 'signed_sp') {
    return 'god';
  }

  // Tier 2: Ultra / Secret / Rainbow / Gold-Etched
  if (
    normalizedRarity === 'UR' ||
    normalizedRarity === 'SEC' ||
    normalizedFinish === 'rainbow' ||
    normalizedFinish === 'gold_etched'
  ) {
    return 'ultra';
  }

  // Tier 3: Rare / Super Rare / Holo / Sparkle
  if (
    normalizedRarity === 'R' ||
    normalizedRarity === 'SR' ||
    normalizedFinish === 'holo' ||
    normalizedFinish === 'sparkle'
  ) {
    return 'rare';
  }

  // Tier 4: Standard
  return 'standard';
}

/**
 * Resolves the deterministic EdgeGlowProfile for a given rarity and finish.
 */
export function resolveSuspenseProfile(
  rarity: Rarity | string,
  finish: Finish | CardFinishTier | string
): EdgeGlowProfile {
  const tier = resolveSuspenseTier(rarity, finish);
  return SUSPENSE_PROFILES[tier];
}

/**
 * Resolves the EdgeGlowProfile directly from a CardInstance.
 */
export function resolveCardSuspenseProfile(card: CardInstance): EdgeGlowProfile {
  return resolveSuspenseProfile(card.rarity, card.finish);
}
