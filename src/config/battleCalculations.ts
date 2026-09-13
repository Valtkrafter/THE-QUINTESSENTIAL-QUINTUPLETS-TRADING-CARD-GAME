/**
 * TQQ Vault - Battle Calculations & Academic Combat Engine
 * Formulas for IQ (Damage), Charm (Crit Chance), Resolve (HP), and Examiner Data
 */

import { CardInstance, GradeResult, Rarity, Finish } from '../types/card';
import {
  BattleStats,
  Examiner,
  SisterBattleCard,
  SubjectType,
  SupportBattleCard,
} from '../types/battle';

// ==========================================
// 1. BASE IQ (TEST DAMAGE) BY RARITY
// ==========================================
export const BASE_IQ_BY_RARITY: Record<Rarity, number> = {
  C: 12,
  UC: 18,
  R: 28,
  SR: 42,
  UR: 65,
  SEC: 80,
  MR: 95,
};

/**
 * Calculates Final IQ with optional Support Tutor buff.
 * Formula: round(Base IQ * (1.0 + TutorIQBuff))
 */
export function calculateSisterIQ(rarity: Rarity, tutorIqBuffPercent: number = 0): number {
  const baseIq = BASE_IQ_BY_RARITY[rarity] ?? 12;
  return Math.round(baseIq * (1.0 + Math.max(0, tutorIqBuffPercent)));
}

// ==========================================
// 2. CHARM (CRITICAL CHANCE FOR 2X POINTS)
// ==========================================
export const CHARM_BY_FINISH: Record<Finish, number> = {
  raw: 0.05,        // 5%
  holo: 0.15,       // 15%
  sparkle: 0.25,    // 25%
  rainbow: 0.40,    // 40%
  gold_etched: 0.50,// 50%
  signed: 0.65,     // 65%
};

/**
 * Derives Charm (critical strike probability between 0.0 and 1.0) based on card finish.
 */
export function calculateCharmFromFinish(finish: Finish): number {
  return CHARM_BY_FINISH[finish] ?? 0.05;
}

// ==========================================
// 3. RESOLVE (MENTAL STAMINA / HP CONTRIBUTION)
// ==========================================
/**
 * Base Resolve derived from BGS Grade:
 * - Raw (no grade): 120
 * - Grade 1–3: 140
 * - Grade 4–6: 200
 * - Crisp 7–8: 280
 * - Mint 9: 400
 * - Gem Mint 10: 520
 * - Black Label (Quad 10): 680
 */
export function calculateResolveFromGrade(grade?: GradeResult): number {
  if (!grade) {
    return 120;
  }

  if (grade.isBlackLabel || grade.tier === 'BLACK_LABEL') {
    return 680;
  }

  const numeric = grade.numericGrade;
  if (numeric >= 10 || grade.tier === 'GEM_MINT_10') {
    return 520;
  }
  if (numeric >= 9 || grade.tier === 'MINT_9') {
    return 400;
  }
  if (numeric >= 7 || grade.tier === 'CRISP_7_8') {
    return 280;
  }
  if (numeric >= 4 || grade.tier === 'USED_4_6') {
    return 200;
  }
  return 140; // Grade 1–3
}

/**
 * Calculates Team Resolve Max from a list of sister cards.
 * Formula: sum_{i=1..5} Resolve_i
 */
export function calculateTeamResolveMax(sisters: (SisterBattleCard | null)[]): number {
  return sisters.reduce((total, sister) => {
    return total + (sister ? sister.stats.resolve : 0);
  }, 0);
}

// ==========================================
// 4. STAT DERIVATION & SISTER CARD FACTORY
// ==========================================
export function deriveBattleStats(
  card: CardInstance,
  tutorIqBuffPercent: number = 0
): BattleStats {
  return {
    iq: calculateSisterIQ(card.rarity, tutorIqBuffPercent),
    charm: calculateCharmFromFinish(card.finish),
    resolve: calculateResolveFromGrade(card.grade),
  };
}

export function createSisterBattleCard(
  card: CardInstance,
  tutorIqBuffPercent: number = 0
): SisterBattleCard {
  const characterId = card.characterId as SisterBattleCard['characterId'];
  return {
    cardId: card.id,
    characterId,
    name: card.name || characterId.toUpperCase(),
    rarity: card.rarity,
    finish: card.finish,
    grade: card.grade?.numericGrade,
    stats: deriveBattleStats(card, tutorIqBuffPercent),
    skillUsed: false,
    isCharged: false,
  };
}

// ==========================================
// 5. SUPPORT TUTOR BATTLE DATA & FACTORY
// ==========================================
export interface SupportProfile {
  name: string;
  baseIqBuffPercent: number;
  baseRewardMultiplier: number;
  passiveDescription: string;
}

export const SUPPORT_PROFILES: Record<string, SupportProfile> = {
  // Fuutarou
  fuutarou_c_01: {
    name: 'Fuutarou Uesugi (C)',
    baseIqBuffPercent: 0.05,
    baseRewardMultiplier: 1.25,
    passiveDescription: 'Diligent Drills: +5% Team IQ & 1.25x reward multiplier.',
  },
  fuutarou_r_01: {
    name: 'Fuutarou Uesugi (R)',
    baseIqBuffPercent: 0.10,
    baseRewardMultiplier: 1.50,
    passiveDescription: 'Determined Tutoring: +10% Team IQ & 1.50x reward multiplier.',
  },
  fuutarou_ur_01: {
    name: 'Fuutarou Uesugi (UR)',
    baseIqBuffPercent: 0.20,
    baseRewardMultiplier: 2.00,
    passiveDescription: 'The Fated Groom: +20% Team IQ & 2.00x reward multiplier.',
  },
  // Raiha
  raiha_uc_01: {
    name: 'Raiha Uesugi (UC)',
    baseIqBuffPercent: 0.05,
    baseRewardMultiplier: 1.15,
    passiveDescription: 'Housework Smile: +5% Team IQ & 1.15x reward multiplier.',
  },
  raiha_sr_01: {
    name: 'Raiha Uesugi (SR)',
    baseIqBuffPercent: 0.10,
    baseRewardMultiplier: 1.30,
    passiveDescription: 'Festival Sunshine: +10% Team IQ & 1.30x reward multiplier.',
  },
  // Maruo
  maruo_sec_01: {
    name: 'Maruo Nakano (SEC)',
    baseIqBuffPercent: 0.15,
    baseRewardMultiplier: 1.75,
    passiveDescription: 'Stern Patriarch: +15% Team IQ & 1.75x reward multiplier.',
  },
  // Takeda
  takeda_r_01: {
    name: 'Yusuke Takeda (R)',
    baseIqBuffPercent: 0.15,
    baseRewardMultiplier: 1.20,
    passiveDescription: 'The Aspiring Rival: +15% Team IQ & 1.20x reward multiplier.',
  },
};

export function createSupportBattleCard(card: CardInstance): SupportBattleCard {
  const profile =
    SUPPORT_PROFILES[card.cardDefId] || {
      name: card.name || 'Support Mentor',
      baseIqBuffPercent: 0.05,
      baseRewardMultiplier: 1.1,
      passiveDescription: 'Academic Support: Grants steady examination assistance.',
    };

  // Grade 9 & 10 scaling: +20% boost to numeric parameters
  const isGradeBoosted = Boolean(card.grade && card.grade.numericGrade >= 9);
  const gradeMultiplier = isGradeBoosted ? 1.2 : 1.0;

  const characterId = (
    card.characterId === 'fuutarou' ||
    card.characterId === 'raiha' ||
    card.characterId === 'maruo' ||
    card.characterId === 'takeda'
      ? card.characterId
      : 'fuutarou'
  ) as SupportBattleCard['characterId'];

  const iqBuffPercent = Math.round(profile.baseIqBuffPercent * gradeMultiplier * 100) / 100;
  const rewardMultiplier = Math.round(profile.baseRewardMultiplier * gradeMultiplier * 100) / 100;

  return {
    cardId: card.id,
    characterId,
    name: profile.name,
    rarity: card.rarity,
    passiveDescription: profile.passiveDescription + (isGradeBoosted ? ' (Grade 9+ Slab: +20% Boost)' : ''),
    iqBuffPercent,
    rewardMultiplier,
  };
}

// ==========================================
// 6. EXAMINERS REGISTRY (Re-exported from examiners.ts)
// ==========================================
export { EXAMINERS, getExaminerById } from './examiners';

export const ROUND_SUBJECTS: Record<number, SubjectType> = {
  1: 'math',
  2: 'science',
  3: 'history',
  4: 'literature',
  5: 'english',
};
