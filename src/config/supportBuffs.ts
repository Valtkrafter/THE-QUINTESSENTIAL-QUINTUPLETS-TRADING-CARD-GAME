/**
 * TQQ Vault - Support Altar Buff Matrix & Dynamic Economy Resolver
 * Maps support character cards (Fuutarou, Raiha, Maruo, Takeda) to
 * account-wide and showcase-specific economy multipliers with Grade 9/10 scaling.
 */

import { CardInstance, ResolvedSupportBuff, SupportBuffConfig } from '../types/card';

export const SUPPORT_BUFF_CONFIGS: Record<string, SupportBuffConfig> = {
  // 1. Fuutarou Uesugi - Common (TQQ-SUP-01 / TQQ-036)
  fuutarou_c_01: {
    cardDefId: 'fuutarou_c_01',
    supportCode: 'TQQ-SUP-01',
    characterId: 'fuutarou',
    name: 'Fuutarou Uesugi',
    title: 'Desperate Tutor',
    rarity: 'C',
    description: 'Multiplies showcase yield by 1.25x through diligent after-school study drills.',
    badgeLabel: 'ACTIVE BUFF: 1.25x SHOWCASE YIELD',
    effects: {
      yieldMultiplier: 1.25,
      harmonyBonusBoost: 0,
      questThresholdReduction: 0,
      gradingFeeDiscount: 0,
      finishUpgradeChanceBonus: 0,
      grade10BlackLabelBonus: 0,
      dustBonus: 0,
      kioskDiscount: 0,
      sisterMarketValueMultiplier: 0,
      cooldownReductionSeconds: 0,
      teamIqBonus: 0,
    },
  },

  // 2. Fuutarou Uesugi - Rare (TQQ-SUP-02 / TQQ-037)
  fuutarou_r_01: {
    cardDefId: 'fuutarou_r_01',
    supportCode: 'TQQ-SUP-02',
    characterId: 'fuutarou',
    name: 'Fuutarou Uesugi',
    title: 'Determined Class Rep',
    rarity: 'R',
    description: 'Multiplies showcase yield by 1.50x and reduces Daily Quest target thresholds by 20%.',
    badgeLabel: 'ACTIVE BUFF: 1.5x YIELD & 20% QUEST EASING',
    effects: {
      yieldMultiplier: 1.5,
      harmonyBonusBoost: 0,
      questThresholdReduction: 0.2,
      gradingFeeDiscount: 0,
      finishUpgradeChanceBonus: 0,
      grade10BlackLabelBonus: 0,
      dustBonus: 0,
      kioskDiscount: 0,
      sisterMarketValueMultiplier: 0,
      cooldownReductionSeconds: 0,
      teamIqBonus: 0,
    },
  },

  // 3. Fuutarou Uesugi - Ultra Rare (TQQ-SUP-03 / TQQ-038)
  fuutarou_ur_01: {
    cardDefId: 'fuutarou_ur_01',
    supportCode: 'TQQ-SUP-03',
    characterId: 'fuutarou',
    name: 'Fuutarou Uesugi',
    title: 'The Fated Groom',
    rarity: 'UR',
    description: 'Multiplies showcase yield by 2.00x and amplifies Quintuplet Harmony synergy from +50% to +100%.',
    badgeLabel: 'ACTIVE BUFF: 2.0x YIELD & HARMONY BOOST',
    effects: {
      yieldMultiplier: 2.0,
      harmonyBonusBoost: 0.5, // Amplifies +50% (+0.5) to +100% (+1.0)
      questThresholdReduction: 0,
      gradingFeeDiscount: 0,
      finishUpgradeChanceBonus: 0,
      grade10BlackLabelBonus: 0,
      dustBonus: 0,
      kioskDiscount: 0,
      sisterMarketValueMultiplier: 0,
      cooldownReductionSeconds: 0,
      teamIqBonus: 0,
    },
  },

  // 4. Raiha Uesugi - Uncommon (TQQ-SUP-04 / TQQ-039)
  raiha_uc_01: {
    cardDefId: 'raiha_uc_01',
    supportCode: 'TQQ-SUP-04',
    characterId: 'raiha',
    name: 'Raiha Uesugi',
    title: 'Housework Smile',
    rarity: 'UC',
    description: 'Flat 15% discount on all Grading Lab fees and +10% chance to roll an upgraded finish when opening booster packs.',
    badgeLabel: 'ACTIVE BUFF: 15% GRADING DISCOUNT & +10% FOIL LUCK',
    effects: {
      yieldMultiplier: 1.0,
      harmonyBonusBoost: 0,
      questThresholdReduction: 0,
      gradingFeeDiscount: 0.15,
      finishUpgradeChanceBonus: 0.1,
      grade10BlackLabelBonus: 0,
      dustBonus: 0,
      kioskDiscount: 0,
      sisterMarketValueMultiplier: 0,
      cooldownReductionSeconds: 0,
      teamIqBonus: 0,
    },
  },

  // 5. Raiha Uesugi - Super Rare (TQQ-SUP-05 / TQQ-040)
  raiha_sr_01: {
    cardDefId: 'raiha_sr_01',
    supportCode: 'TQQ-SUP-05',
    characterId: 'raiha',
    name: 'Raiha Uesugi',
    title: 'Festival Sunshine',
    rarity: 'SR',
    description: 'Flat 30% discount on all Grading Lab fees and +3% flat bonus chance to roll Grade 10 or Black Label during grading.',
    badgeLabel: 'ACTIVE BUFF: 30% GRADING DISCOUNT & +3% GEM MINT LUCK',
    effects: {
      yieldMultiplier: 1.0,
      harmonyBonusBoost: 0,
      questThresholdReduction: 0,
      gradingFeeDiscount: 0.3,
      finishUpgradeChanceBonus: 0,
      grade10BlackLabelBonus: 0.03,
      dustBonus: 0,
      kioskDiscount: 0,
      sisterMarketValueMultiplier: 0,
      cooldownReductionSeconds: 0,
      teamIqBonus: 0,
    },
  },

  // 6. Maruo Nakano - Secret Rare (TQQ-SUP-06 / TQQ-041)
  maruo_sec_01: {
    cardDefId: 'maruo_sec_01',
    supportCode: 'TQQ-SUP-06',
    characterId: 'maruo',
    name: 'Maruo Nakano',
    title: 'Stern Patriarch',
    rarity: 'SEC',
    description: '+75% Stardust from dusting, 25% discount in the Daily Singles Kiosk, and +20% market valuation for all 5 slotted sisters.',
    badgeLabel: 'ACTIVE BUFF: +75% DUST, 25% KIOSK SALE & +20% SISTERS VALUE',
    effects: {
      yieldMultiplier: 1.0,
      harmonyBonusBoost: 0,
      questThresholdReduction: 0,
      gradingFeeDiscount: 0,
      finishUpgradeChanceBonus: 0,
      grade10BlackLabelBonus: 0,
      dustBonus: 0.75,
      kioskDiscount: 0.25,
      sisterMarketValueMultiplier: 0.2,
      cooldownReductionSeconds: 0,
      teamIqBonus: 0,
    },
  },

  // 7. Yusuke Takeda - Rare (TQQ-SUP-07 / TQQ-042)
  takeda_r_01: {
    cardDefId: 'takeda_r_01',
    supportCode: 'TQQ-SUP-07',
    characterId: 'takeda',
    name: 'Yusuke Takeda',
    title: 'The Aspiring Rival',
    rarity: 'R',
    description: 'Cuts Test-Sheet Pack cooldown from 4 hours to 2 hours and grants +15% Team IQ in Exam Showdown.',
    badgeLabel: 'ACTIVE BUFF: 2H TEST PACK CD & +15% TEAM IQ',
    effects: {
      yieldMultiplier: 1.0,
      harmonyBonusBoost: 0,
      questThresholdReduction: 0,
      gradingFeeDiscount: 0,
      finishUpgradeChanceBonus: 0,
      grade10BlackLabelBonus: 0,
      dustBonus: 0,
      kioskDiscount: 0,
      sisterMarketValueMultiplier: 0,
      cooldownReductionSeconds: 7200, // 2 hours cut (from 14400s to 7200s)
      teamIqBonus: 0.15,
    },
  },
};

// Map code aliases to config keys
export const SUPPORT_CODE_MAP: Record<string, string> = {
  'TQQ-SUP-01': 'fuutarou_c_01',
  'TQQ-SUP-02': 'fuutarou_r_01',
  'TQQ-SUP-03': 'fuutarou_ur_01',
  'TQQ-SUP-04': 'raiha_uc_01',
  'TQQ-SUP-05': 'raiha_sr_01',
  'TQQ-SUP-06': 'maruo_sec_01',
  'TQQ-SUP-07': 'takeda_r_01',
  'TQQ-036': 'fuutarou_c_01',
  'TQQ-037': 'fuutarou_r_01',
  'TQQ-038': 'fuutarou_ur_01',
  'TQQ-039': 'raiha_uc_01',
  'TQQ-040': 'raiha_sr_01',
  'TQQ-041': 'maruo_sec_01',
  'TQQ-042': 'takeda_r_01',
};

export function getSupportBuffConfig(keyOrCode: string): SupportBuffConfig | undefined {
  if (SUPPORT_BUFF_CONFIGS[keyOrCode]) {
    return SUPPORT_BUFF_CONFIGS[keyOrCode];
  }
  const mapped = SUPPORT_CODE_MAP[keyOrCode];
  if (mapped && SUPPORT_BUFF_CONFIGS[mapped]) {
    return SUPPORT_BUFF_CONFIGS[mapped];
  }
  return undefined;
}

/**
 * Resolves active support card buffs with Grade Scaling:
 * If the slotted Support Card is a graded Slab with Grade 9 or 10,
 * all numeric values of the buff are increased by an additional +20% (multiplier 1.20).
 */
export function resolveActiveSupportBuff(card: CardInstance | null): ResolvedSupportBuff | null {
  if (!card) return null;

  const config = getSupportBuffConfig(card.cardDefId) || (card.cardNumber ? getSupportBuffConfig(card.cardNumber) : undefined);
  if (!config) return null;

  const isGradeScaled = Boolean(card.grade && card.grade.numericGrade >= 9);
  const scale = isGradeScaled ? 1.2 : 1.0;

  const raw = config.effects;

  // Grade scaled numeric calculations
  const yieldMultiplier = raw.yieldMultiplier
    ? isGradeScaled
      ? Number((raw.yieldMultiplier * scale).toFixed(2))
      : raw.yieldMultiplier
    : 1.0;

  const harmonyBonusBoost = raw.harmonyBonusBoost
    ? isGradeScaled
      ? Number((raw.harmonyBonusBoost * scale).toFixed(2))
      : raw.harmonyBonusBoost
    : 0;

  const questThresholdReduction = raw.questThresholdReduction
    ? isGradeScaled
      ? Number((raw.questThresholdReduction * scale).toFixed(3))
      : raw.questThresholdReduction
    : 0;

  const gradingFeeDiscount = raw.gradingFeeDiscount
    ? isGradeScaled
      ? Number((raw.gradingFeeDiscount * scale).toFixed(3))
      : raw.gradingFeeDiscount
    : 0;

  const finishUpgradeChanceBonus = raw.finishUpgradeChanceBonus
    ? isGradeScaled
      ? Number((raw.finishUpgradeChanceBonus * scale).toFixed(3))
      : raw.finishUpgradeChanceBonus
    : 0;

  const grade10BlackLabelBonus = raw.grade10BlackLabelBonus
    ? isGradeScaled
      ? Number((raw.grade10BlackLabelBonus * scale).toFixed(4))
      : raw.grade10BlackLabelBonus
    : 0;

  const dustBonus = raw.dustBonus
    ? isGradeScaled
      ? Number((raw.dustBonus * scale).toFixed(3))
      : raw.dustBonus
    : 0;

  const kioskDiscount = raw.kioskDiscount
    ? isGradeScaled
      ? Number((raw.kioskDiscount * scale).toFixed(3))
      : raw.kioskDiscount
    : 0;

  const sisterMarketValueMultiplier = raw.sisterMarketValueMultiplier
    ? isGradeScaled
      ? Number((raw.sisterMarketValueMultiplier * scale).toFixed(3))
      : raw.sisterMarketValueMultiplier
    : 0;

  const cooldownReductionSeconds = raw.cooldownReductionSeconds
    ? isGradeScaled
      ? Math.round(raw.cooldownReductionSeconds * scale)
      : raw.cooldownReductionSeconds
    : 0;

  const teamIqBonus = raw.teamIqBonus
    ? isGradeScaled
      ? Number((raw.teamIqBonus * scale).toFixed(3))
      : raw.teamIqBonus
    : 0;

  // Dynamic badge generation
  let badgeLabel = config.badgeLabel;
  if (isGradeScaled) {
    switch (config.supportCode) {
      case 'TQQ-SUP-01':
        badgeLabel = `ACTIVE BUFF (SLAB +20%): ${yieldMultiplier.toFixed(2)}x SHOWCASE YIELD`;
        break;
      case 'TQQ-SUP-02':
        badgeLabel = `ACTIVE BUFF (SLAB +20%): ${yieldMultiplier.toFixed(2)}x YIELD & ${(questThresholdReduction * 100).toFixed(0)}% QUEST EASING`;
        break;
      case 'TQQ-SUP-03':
        badgeLabel = `ACTIVE BUFF (SLAB +20%): ${yieldMultiplier.toFixed(2)}x YIELD & 120% HARMONY BOOST`;
        break;
      case 'TQQ-SUP-04':
        badgeLabel = `ACTIVE BUFF (SLAB +20%): ${(gradingFeeDiscount * 100).toFixed(0)}% GRADING DISCOUNT & +${(finishUpgradeChanceBonus * 100).toFixed(0)}% FOIL LUCK`;
        break;
      case 'TQQ-SUP-05':
        badgeLabel = `ACTIVE BUFF (SLAB +20%): ${(gradingFeeDiscount * 100).toFixed(0)}% GRADING DISCOUNT & +${(grade10BlackLabelBonus * 100).toFixed(1)}% GEM MINT LUCK`;
        break;
      case 'TQQ-SUP-06':
        badgeLabel = `ACTIVE BUFF (SLAB +20%): +${(dustBonus * 100).toFixed(0)}% DUST, ${(kioskDiscount * 100).toFixed(0)}% KIOSK SALE & +${(sisterMarketValueMultiplier * 100).toFixed(0)}% SISTERS VALUE`;
        break;
      case 'TQQ-SUP-07':
        badgeLabel = `ACTIVE BUFF (SLAB +20%): ${(cooldownReductionSeconds / 3600).toFixed(1)}H CD CUT & +${(teamIqBonus * 100).toFixed(0)}% TEAM IQ`;
        break;
    }
  }

  return {
    cardDefId: config.cardDefId,
    supportCode: config.supportCode,
    characterId: config.characterId,
    name: config.name,
    title: config.title,
    rarity: config.rarity,
    isGradeScaled,
    gradeScaleMultiplier: scale,
    badgeLabel,
    description: config.description,
    effects: {
      yieldMultiplier,
      harmonyBonusBoost,
      questThresholdReduction,
      gradingFeeDiscount,
      finishUpgradeChanceBonus,
      grade10BlackLabelBonus,
      dustBonus,
      kioskDiscount,
      sisterMarketValueMultiplier,
      cooldownReductionSeconds,
      teamIqBonus,
    },
  };
}
