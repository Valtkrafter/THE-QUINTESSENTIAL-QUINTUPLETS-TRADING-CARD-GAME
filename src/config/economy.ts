/**
 * TQQ Vault - Economic Engine, Mathematical Resolvers, Drop Tables & Grading Vault
 * Contains exact drop distributions, finish chances, grading roll mechanics,
 * consumables application, pity algorithms, and binder idle yield calculations.
 */

import {
  BinderPage,
  BinderSynergyReport,
  CardDefinition,
  CardInstance,
  ConsumableTool,
  ConsumableToolId,
  DropTable,
  Finish,
  GradeResult,
  GradeSubgrades,
  GradeTier,
  PackConfig,
  PackId,
  PityCounters,
  Rarity,
  SisterId,
  SupportId,
  KioskOffering,
} from '../types/card';
import { CARDS_BY_RARITY, CARD_MAP, CARDS_CATALOG } from './cardsData';

// ==========================================
// 1. BASE VALUES & MULTIPLIERS
// ==========================================

export const RARITY_BASE_VALUES: Record<Rarity, number> = {
  C: 15,
  UC: 50,
  R: 200,
  SR: 900,
  UR: 4000,
  SEC: 20000,
  MR: 100000,
};

export const FINISH_MULTIPLIERS: Record<Finish, number> = {
  raw: 1.0,
  holo: 1.8,
  sparkle: 3.5,
  rainbow: 7.0,
  gold_etched: 15.0,
  signed: 40.0,
};

export const FINISH_CHANCES: Record<Finish, number> = {
  raw: 78.0,
  holo: 14.0,
  sparkle: 5.5,
  rainbow: 1.8,
  gold_etched: 0.6,
  signed: 0.1,
};

export const GRADE_TIER_CONFIG: Record<
  GradeTier,
  {
    tierLabel: string;
    multiplier: number;
    baseChance: number; // percentage (0 to 100)
    gradeRange: [number, number];
  }
> = {
  POOR_1_3: {
    tierLabel: 'Schulhof-Müll',
    multiplier: 0.15,
    baseChance: 12.0,
    gradeRange: [1, 3],
  },
  USED_4_6: {
    tierLabel: 'Gebraucht',
    multiplier: 0.5,
    baseChance: 30.0,
    gradeRange: [4, 6],
  },
  CRISP_7_8: {
    tierLabel: 'Crisp',
    multiplier: 1.25,
    baseChance: 38.0,
    gradeRange: [7, 8],
  },
  MINT_9: {
    tierLabel: 'God-Tier',
    multiplier: 3.0,
    baseChance: 15.0,
    gradeRange: [9, 9],
  },
  GEM_MINT_10: {
    tierLabel: 'PEAK FICTION',
    multiplier: 12.0,
    baseChance: 4.7,
    gradeRange: [10, 10],
  },
  BLACK_LABEL: {
    tierLabel: 'THE CHOSEN ONE',
    multiplier: 50.0,
    baseChance: 0.3,
    gradeRange: [10, 10],
  },
};

// ==========================================
// 2. CONSUMABLES CATALOG
// ==========================================

export const CONSUMABLE_TOOLS: Record<ConsumableToolId, ConsumableTool> = {
  microfiber_cloth: {
    id: 'microfiber_cloth',
    name: 'Microfiber Cloth',
    description: 'Eliminates Grades 1–3 for 1 grading session. Gently wipes dust off the card surface.',
    stardustCost: 50,
  },
  centering_laser: {
    id: 'centering_laser',
    name: 'Centering Laser',
    description: 'Adds +5% flat chance to roll Grade 10 ("PEAK FICTION"). High-precision alignment tool.',
    stardustCost: 150,
  },
  vault_insurance: {
    id: 'vault_insurance',
    name: 'Vault Insurance',
    description: 'Automatically rerolls any grade below 7 once if the card grades poorly.',
    stardustCost: 300,
  },
};

// ==========================================
// 3. PACKS CONFIGURATION (8 TIERS)
// ==========================================

export const PACKS_CONFIG: Record<PackId, PackConfig> = {
  test_sheet: {
    id: 'test_sheet',
    name: 'Test-Sheet Pack',
    description: 'Free starter mock exam papers. Refreshes every 4 hours.',
    costYen: 0,
    slots: 3,
    cooldownSeconds: 4 * 3600, // 14400 seconds
    canTriggerGodPack: false,
    dropTable: {
      C: 92.0,
      UC: 8.0,
      R: 0,
      SR: 0,
      UR: 0,
      SEC: 0,
      MR: 0,
    },
  },
  kiosk: {
    id: 'kiosk',
    name: 'Kiosk-Pack',
    description: 'Cheap everyday pack sold at the school corner convenience store.',
    costYen: 100,
    slots: 5,
    canTriggerGodPack: false,
    dropTable: {
      C: 80.0,
      UC: 18.0,
      R: 2.0,
      SR: 0,
      UR: 0,
      SEC: 0,
      MR: 0,
    },
  },
  lernsession: {
    id: 'lernsession',
    name: 'Lernsession-Pack',
    description: 'After-school study booster pack with a slight chance of Super Rare cards.',
    costYen: 500,
    slots: 5,
    canTriggerGodPack: false,
    dropTable: {
      C: 60.0,
      UC: 30.0,
      R: 9.0,
      SR: 1.0,
      UR: 0,
      SEC: 0,
      MR: 0,
    },
  },
  sommerfeuerwerk: {
    id: 'sommerfeuerwerk',
    name: 'Sommerfeuerwerk-Pack',
    description: 'Summer fireworks festival special with chances for Ultra Rares and God Packs.',
    costYen: 2500,
    slots: 5,
    canTriggerGodPack: true,
    dropTable: {
      C: 35.0,
      UC: 40.0,
      R: 20.0,
      SR: 4.5,
      UR: 0.5,
      SEC: 0,
      MR: 0,
    },
  },
  schulfest: {
    id: 'schulfest',
    name: 'Schulfest-Pack',
    description: 'School culture festival celebration pack containing Secret Rares.',
    costYen: 12000,
    slots: 5,
    canTriggerGodPack: true,
    dropTable: {
      C: 10.0,
      UC: 45.0,
      R: 32.0,
      SR: 11.0,
      UR: 1.9,
      SEC: 0.1,
      MR: 0,
    },
  },
  klassenfahrt_kyoto: {
    id: 'klassenfahrt_kyoto',
    name: 'Klassenfahrt-Kyoto',
    description: 'Kyoto school trip premium pack featuring Master Rare bride cards.',
    costYen: 60000,
    slots: 5,
    canTriggerGodPack: true,
    dropTable: {
      C: 0,
      UC: 30.0,
      R: 45.0,
      SR: 18.0,
      UR: 6.0,
      SEC: 0.98,
      MR: 0.02,
    },
  },
  braut_schicksal: {
    id: 'braut_schicksal',
    name: 'Braut-Schicksal',
    description: 'The pinnacle bridal destiny pack. No Common or Uncommon cards.',
    costYen: 300000,
    slots: 5,
    canTriggerGodPack: false,
    dropTable: {
      C: 0,
      UC: 0,
      R: 40.0,
      SR: 38.0,
      UR: 17.0,
      SEC: 4.6,
      MR: 0.4,
    },
  },
  god_pack: {
    id: 'god_pack',
    name: 'God Pack',
    description: 'The legendary hidden pack. Contains only Ultra Rare, Secret Rare, and Master Rare cards.',
    costYen: 0,
    slots: 5,
    isGodPack: true,
    canTriggerGodPack: false,
    dropTable: {
      C: 0,
      UC: 0,
      R: 0,
      SR: 0,
      UR: 50.0,
      SEC: 40.0,
      MR: 10.0,
    },
  },
};

// ==========================================
// 4. MATHEMATICAL VALUE RESOLVERS
// ==========================================

/**
 * Calculates raw card value in Yen based on Rarity and Surface Finish.
 */
export function calculateRawCardValue(rarity: Rarity, finish: Finish): number {
  const base = RARITY_BASE_VALUES[rarity] ?? 15;
  const mult = FINISH_MULTIPLIERS[finish] ?? 1.0;
  return Math.round(base * mult);
}

/**
 * Calculates graded card market value in Yen.
 */
export function calculateGradedCardValue(rawCardValue: number, tier: GradeTier): number {
  const mult = GRADE_TIER_CONFIG[tier]?.multiplier ?? 1.0;
  return Math.round(rawCardValue * mult);
}

/**
 * Calculates overall current market value for a CardInstance.
 */
export function calculateCardMarketValue(card: CardInstance): number {
  const rawValue = calculateRawCardValue(card.rarity, card.finish);
  if (card.grade) {
    return Math.round(rawValue * card.grade.multiplier);
  }
  return rawValue;
}

/**
 * Calculates grading fee (exactly 50% of raw card value).
 * If Raiha is active in Support Slot 6, applies a -15% global discount (fee * 0.85).
 */
export function calculateGradingFee(card: CardInstance, hasRaihaSupport: boolean = false): number {
  const rawValue = calculateRawCardValue(card.rarity, card.finish);
  const baseFee = rawValue * 0.5;
  const finalFee = hasRaihaSupport ? baseFee * 0.85 : baseFee;
  return Math.max(1, Math.round(finalFee));
}

/**
 * Calculates Stardust yield from dusting a raw card (exactly 20% of raw value).
 * If Maruo is active in Support Slot 6, applies a +20% bonus dust yield.
 */
export function calculateDustYield(card: CardInstance, hasMaruoSupport: boolean = false): number {
  const rawValue = calculateRawCardValue(card.rarity, card.finish);
  const baseDust = Math.floor(rawValue * 0.2);
  const finalDust = hasMaruoSupport ? Math.floor(baseDust * 1.2) : baseDust;
  return Math.max(1, finalDust);
}

// ==========================================
// 4B. DIRECT SELL SYSTEM & KIOSK PRICING
// ==========================================

export const KIOSK_ROTATION_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours (86,400,000 ms)
export const KIOSK_REROLL_STARDUST_COST = 100;
export const KIOSK_PRICE_MULTIPLIER = 2.5;

/**
 * Calculates exact liquidation sell value in Yen:
 * Sell Value = baseValue(rarity) * multiplier(finish) * multiplier(grade)
 * Ungraded raw card has a grade multiplier of 1.0x.
 */
export function calculateCardSellValue(card: CardInstance): number {
  const base = RARITY_BASE_VALUES[card.rarity] ?? 15;
  const finishMult = FINISH_MULTIPLIERS[card.finish] ?? 1.0;
  const gradeMult = card.grade
    ? (GRADE_TIER_CONFIG[card.grade.tier]?.multiplier ?? card.grade.multiplier ?? 1.0)
    : 1.0;
  return Math.round(base * finishMult * gradeMult);
}

/**
 * Calculates total liquidation value for an array of card instances.
 */
export function calculateBulkSellValue(cards: CardInstance[]): number {
  return cards.reduce((sum, card) => sum + calculateCardSellValue(card), 0);
}

/**
 * Calculates Singles Kiosk purchase price in Yen (fixed at 2.5x base market value).
 */
export function calculateKioskPrice(rarity: Rarity): number {
  const base = RARITY_BASE_VALUES[rarity] ?? 15;
  return Math.round(base * KIOSK_PRICE_MULTIPLIER);
}

// ==========================================
// 5. ROLL ALGORITHMS & RNG HELPERS
// ==========================================

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function randomFloat(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] / (0xffffffff + 1);
  }
  return Math.random();
}

function randomIntBetween(min: number, max: number): number {
  return Math.floor(randomFloat() * (max - min + 1)) + min;
}

/**
 * Generates 4 rotating raw card offerings for the Singles Kiosk.
 * Each card is raw (1.0x finish) and priced at 2.5x base market value.
 */
export function generateKioskStock(): KioskOffering[] {
  const shuffledCatalog = [...CARDS_CATALOG].sort(() => randomFloat() - 0.5);
  const selectedDefs: CardDefinition[] = [];
  const usedCardIds = new Set<string>();

  for (const def of shuffledCatalog) {
    if (!usedCardIds.has(def.id)) {
      usedCardIds.add(def.id);
      selectedDefs.push(def);
      if (selectedDefs.length === 4) break;
    }
  }

  // Safety fallback if catalog is somehow under 4 cards
  while (selectedDefs.length < 4 && CARDS_CATALOG.length > 0) {
    selectedDefs.push(CARDS_CATALOG[selectedDefs.length % CARDS_CATALOG.length]);
  }

  return selectedDefs.map((cardDef, index) => ({
    id: `kiosk_slot_${index}_${generateUUID().slice(0, 8)}`,
    cardDefId: cardDef.id,
    rarity: cardDef.rarity,
    finish: 'raw' as const,
    priceYen: calculateKioskPrice(cardDef.rarity),
    isPurchased: false,
  }));
}

/**
 * Rolls a card surface finish based on standard finish drop chances.
 */
export function rollFinish(): Finish {
  const roll = randomFloat() * 100.0;
  let cumulative = 0.0;

  const finishes: Finish[] = ['signed', 'gold_etched', 'rainbow', 'sparkle', 'holo', 'raw'];
  for (const finish of finishes) {
    cumulative += FINISH_CHANCES[finish];
    if (roll < cumulative) {
      return finish;
    }
  }
  return 'raw';
}

/**
 * Picks a random card definition matching the target rarity.
 */
export function pickRandomCardDef(rarity: Rarity): CardDefinition {
  const candidates = CARDS_BY_RARITY[rarity];
  if (!candidates || candidates.length === 0) {
    // Fallback: pick any card from catalog
    const fallback = CARD_MAP['miku_c_01'] ?? Object.values(CARD_MAP)[0];
    return fallback;
  }
  const index = Math.floor(randomFloat() * candidates.length);
  return candidates[index];
}

/**
 * Rolls a rarity from a drop table.
 */
export function rollRarityFromTable(dropTable: DropTable): Rarity {
  const roll = randomFloat() * 100.0;
  let cumulative = 0.0;

  const rarities: Rarity[] = ['MR', 'SEC', 'UR', 'SR', 'R', 'UC', 'C'];
  for (const r of rarities) {
    const chance = dropTable[r] ?? 0;
    if (chance <= 0) continue;
    cumulative += chance;
    if (roll < cumulative) {
      return r;
    }
  }
  // Safety fallback to C or lowest available
  return dropTable.C > 0 ? 'C' : 'UC';
}

/**
 * Rolls guaranteed SR+ or UR+ rarity for pity slots.
 */
export function rollPityRarity(dropTable: DropTable, targetPity: 'SR' | 'UR'): Rarity {
  const pool: Rarity[] = targetPity === 'UR'
    ? ['UR', 'SEC', 'MR']
    : ['SR', 'UR', 'SEC', 'MR'];

  let totalWeight = 0;
  for (const r of pool) {
    totalWeight += dropTable[r] ?? 0;
  }

  // If the current pack drop table doesn't have higher rarities (e.g. Lernsession has SR but no UR/SEC/MR),
  // fallback to guaranteed pool weights:
  if (totalWeight <= 0) {
    if (targetPity === 'UR') {
      return 'UR';
    }
    return 'SR';
  }

  const roll = randomFloat() * totalWeight;
  let cumulative = 0;
  for (const r of pool) {
    const weight = dropTable[r] ?? 0;
    cumulative += weight;
    if (roll <= cumulative) {
      return r;
    }
  }
  return pool[0];
}

/**
 * Executes a pack opening session, handling God Pack triggers, Pity rules,
 * finish rolls, and instantiating CardInstances.
 */
export function rollPackDrops(
  packId: PackId,
  pityCounters: PityCounters
): {
  cards: CardInstance[];
  isGodPack: boolean;
  pityTriggered: 'SR' | 'UR' | null;
  newPityCounters: PityCounters;
} {
  const packConfig = PACKS_CONFIG[packId];
  if (!packConfig) {
    throw new Error(`Unknown pack ID: ${packId}`);
  }

  // 1. Check God Pack trigger (0.05% on Packs 4–6)
  let isGodPack = false;
  let activeDropTable = { ...packConfig.dropTable };
  if (packConfig.canTriggerGodPack && randomFloat() * 100.0 < 0.05) {
    isGodPack = true;
    activeDropTable = { ...PACKS_CONFIG.god_pack.dropTable };
  }

  // 2. Track pity conditions
  // Pity applies to paid packs (costYen > 0)
  const isPaidPack = packConfig.costYen > 0;
  let currentPitySR = pityCounters.packsWithoutSR;
  let currentPityUR = pityCounters.packsWithoutUR;

  if (isPaidPack) {
    currentPitySR += 1;
    currentPityUR += 1;
  }

  let pityTriggered: 'SR' | 'UR' | null = null;
  if (isPaidPack) {
    if (currentPityUR >= 100) {
      pityTriggered = 'UR';
    } else if (currentPitySR >= 30) {
      pityTriggered = 'SR';
    }
  }

  // 3. Roll cards for each slot
  const cards: CardInstance[] = [];
  let highestRarityPulled: Rarity = 'C';

  const rarityHierarchy: Record<Rarity, number> = {
    C: 1,
    UC: 2,
    R: 3,
    SR: 4,
    UR: 5,
    SEC: 6,
    MR: 7,
  };

  for (let slotIndex = 0; slotIndex < packConfig.slots; slotIndex++) {
    const isPitySlot = isPaidPack && pityTriggered !== null && slotIndex === packConfig.slots - 1;
    const rolledRarity = isPitySlot && pityTriggered !== null
      ? rollPityRarity(activeDropTable, pityTriggered)
      : rollRarityFromTable(activeDropTable);

    if (rarityHierarchy[rolledRarity] > rarityHierarchy[highestRarityPulled]) {
      highestRarityPulled = rolledRarity;
    }

    const cardDef = pickRandomCardDef(rolledRarity);
    const finish = rollFinish();

    const instance: CardInstance = {
      id: generateUUID(),
      cardDefId: cardDef.id,
      characterId: cardDef.characterId,
      rarity: rolledRarity,
      finish,
      obtainedAt: Date.now(),
      imageUrl: cardDef.imageUrl,
      name: cardDef.name,
      title: cardDef.title,
    };

    cards.push(instance);
  }

  // 4. Update pity counters based on highest pulled card
  if (isPaidPack) {
    if (
      highestRarityPulled === 'UR' ||
      highestRarityPulled === 'SEC' ||
      highestRarityPulled === 'MR'
    ) {
      currentPityUR = 0;
      currentPitySR = 0;
    } else if (highestRarityPulled === 'SR') {
      currentPitySR = 0;
    }
  }

  return {
    cards,
    isGodPack,
    pityTriggered,
    newPityCounters: {
      packsWithoutSR: currentPitySR,
      packsWithoutUR: currentPityUR,
    },
  };
}

// ==========================================
// 6. GRADING VAULT ROLL ENGINE
// ==========================================

function generateSubgrades(tier: GradeTier, numericGrade: number): GradeSubgrades {
  if (tier === 'BLACK_LABEL') {
    return {
      centering: 10.0,
      surface: 10.0,
      corners: 10.0,
      edges: 10.0,
    };
  }

  if (numericGrade === 10) {
    // Gem Mint 10: At least three 10.0 and one 9.5
    const subs = [10.0, 10.0, 10.0, 9.5];
    subs.sort(() => randomFloat() - 0.5);
    return {
      centering: subs[0],
      surface: subs[1],
      corners: subs[2],
      edges: subs[3],
    };
  }

  if (numericGrade === 9) {
    // Mint 9: Subgrades average around 9.0 (e.g. 9.0, 9.5, 9.0, 8.5)
    return {
      centering: Number((8.5 + randomFloat()).toFixed(1)),
      surface: Number((8.5 + randomFloat()).toFixed(1)),
      corners: Number((8.5 + randomFloat()).toFixed(1)),
      edges: Number((8.5 + randomFloat()).toFixed(1)),
    };
  }

  // Generic subgrades around numericGrade +/- 0.5
  const base = numericGrade;
  return {
    centering: Math.max(1.0, Math.min(10.0, Number((base - 0.5 + randomFloat()).toFixed(1)))),
    surface: Math.max(1.0, Math.min(10.0, Number((base - 0.5 + randomFloat()).toFixed(1)))),
    corners: Math.max(1.0, Math.min(10.0, Number((base - 0.5 + randomFloat()).toFixed(1)))),
    edges: Math.max(1.0, Math.min(10.0, Number((base - 0.5 + randomFloat()).toFixed(1)))),
  };
}

function singleGradeRoll(activeTools: ConsumableToolId[]): {
  tier: GradeTier;
  numericGrade: number;
} {
  const hasCloth = activeTools.includes('microfiber_cloth');
  const hasLaser = activeTools.includes('centering_laser');

  // Baseline chances:
  // POOR_1_3: 12.0
  // USED_4_6: 30.0
  // CRISP_7_8: 38.0
  // MINT_9: 15.0
  // GEM_MINT_10: 4.7
  // BLACK_LABEL: 0.3
  let weights: Record<GradeTier, number> = {
    POOR_1_3: 12.0,
    USED_4_6: 30.0,
    CRISP_7_8: 38.0,
    MINT_9: 15.0,
    GEM_MINT_10: 4.7,
    BLACK_LABEL: 0.3,
  };

  // 1. Apply Microfiber Cloth (eliminates 1–3, redistributes 12% across remaining tiers)
  if (hasCloth) {
    weights.POOR_1_3 = 0;
    const remainingSum = weights.USED_4_6 + weights.CRISP_7_8 + weights.MINT_9 + weights.GEM_MINT_10 + weights.BLACK_LABEL; // 88.0
    const scaleFactor = 100.0 / remainingSum;
    weights.USED_4_6 *= scaleFactor;
    weights.CRISP_7_8 *= scaleFactor;
    weights.MINT_9 *= scaleFactor;
    weights.GEM_MINT_10 *= scaleFactor;
    weights.BLACK_LABEL *= scaleFactor;
  }

  // 2. Apply Centering Laser (+5% flat to Grade 10, deducted proportionally from tiers below Grade 10)
  if (hasLaser) {
    const flatBoost = 5.0;
    weights.GEM_MINT_10 += flatBoost;

    const lowerTierKeys: GradeTier[] = ['POOR_1_3', 'USED_4_6', 'CRISP_7_8', 'MINT_9'];
    const lowerTierSum = lowerTierKeys.reduce((sum, key) => sum + weights[key], 0);

    if (lowerTierSum > flatBoost) {
      const reductionRatio = (lowerTierSum - flatBoost) / lowerTierSum;
      for (const key of lowerTierKeys) {
        weights[key] *= reductionRatio;
      }
    }
  }

  // Roll tier
  const tiers: GradeTier[] = [
    'BLACK_LABEL',
    'GEM_MINT_10',
    'MINT_9',
    'CRISP_7_8',
    'USED_4_6',
    'POOR_1_3',
  ];

  const roll = randomFloat() * 100.0;
  let cumulative = 0.0;
  let selectedTier: GradeTier = 'USED_4_6';

  for (const tier of tiers) {
    cumulative += weights[tier];
    if (roll < cumulative) {
      selectedTier = tier;
      break;
    }
  }

  // Determine numeric grade
  const tierConfig = GRADE_TIER_CONFIG[selectedTier];
  const [minG, maxG] = tierConfig.gradeRange;
  const numericGrade = randomIntBetween(minG, maxG);

  return { tier: selectedTier, numericGrade };
}

/**
 * Evaluates grading outcome with optional consumable tools and insurance reroll.
 */
export function rollGrading(
  _card: CardInstance,
  tools: ConsumableToolId[] = []
): {
  gradeResult: GradeResult;
  insuranceRerolled: boolean;
} {
  let { tier, numericGrade } = singleGradeRoll(tools);
  let insuranceRerolled = false;

  // Apply Vault Insurance if grade is below 7
  if (tools.includes('vault_insurance') && numericGrade < 7) {
    insuranceRerolled = true;
    const reroll = singleGradeRoll(tools);
    tier = reroll.tier;
    numericGrade = reroll.numericGrade;
  }

  const tierConfig = GRADE_TIER_CONFIG[tier];
  const isBlackLabel = tier === 'BLACK_LABEL';
  const subgrades = generateSubgrades(tier, numericGrade);

  const gradeResult: GradeResult = {
    tier,
    tierLabel: tierConfig.tierLabel,
    numericGrade,
    isBlackLabel,
    multiplier: tierConfig.multiplier,
    subgrades,
    gradedAt: Date.now(),
  };

  return {
    gradeResult,
    insuranceRerolled,
  };
}

// ==========================================
// 7. BINDER & IDLE REVENUE SYSTEM
// ==========================================

export const NAKANO_SISTERS: SisterId[] = ['ichika', 'nino', 'miku', 'yotsuba', 'itsuki'];

/**
 * Analyzes binder page synergies and yields.
 */
export function analyzeBinderPage(
  page: BinderPage,
  cardMap: Map<string, CardInstance>
): BinderSynergyReport {
  let totalMarketValue = 0;
  const sisterIdsPresent = new Set<SisterId>();
  const sisterCountMap: Partial<Record<SisterId, number>> = {};
  let totalSlottedSisters = 0;
  let supportCharId: SupportId | null = null;

  for (const slot of page.slots) {
    if (!slot.cardInstanceId) continue;
    const card = cardMap.get(slot.cardInstanceId);
    if (!card) continue;

    const val = calculateCardMarketValue(card);
    totalMarketValue += val;

    if (slot.slotIndex < 5) {
      if (NAKANO_SISTERS.includes(card.characterId as SisterId)) {
        const sId = card.characterId as SisterId;
        sisterIdsPresent.add(sId);
        sisterCountMap[sId] = (sisterCountMap[sId] || 0) + 1;
        totalSlottedSisters += 1;
      }
    } else if (slot.slotIndex === 5) {
      // Support slot
      supportCharId = card.characterId as SupportId;
    }
  }

  // Check Synergies:
  // 1. All 5 sisters on one page: +50% (+0.50)
  const allFiveSisters = sisterIdsPresent.size === 5;

  // 2. Mono-Waifu: all 5 sister slots filled with the same sister: +25% (+0.25)
  let monoWaifu = false;
  let monoWaifuSisterId: SisterId | null = null;
  if (totalSlottedSisters === 5 && sisterIdsPresent.size === 1) {
    monoWaifu = true;
    monoWaifuSisterId = Array.from(sisterIdsPresent)[0];
  }

  // Base synergy multiplier = 1.0
  let synergyMultiplier = 1.0;
  if (allFiveSisters) {
    synergyMultiplier += 0.5;
  } else if (monoWaifu) {
    synergyMultiplier += 0.25;
  }

  // 3. Fuutarou in Support Slot 6: 2x total page yield
  if (supportCharId === 'fuutarou') {
    synergyMultiplier *= 2.0;
  }

  // 4. Isanari in Support Slot 6: +10% idle earnings bonus
  if (supportCharId === 'isanari') {
    synergyMultiplier *= 1.1;
  }

  // Base yield = 0.02% of total calculated market value per minute (0.0002)
  const baseYieldPerMinute = totalMarketValue * 0.0002;
  const effectiveYieldPerMinute = baseYieldPerMinute * synergyMultiplier;

  return {
    allFiveSisters,
    monoWaifu,
    monoWaifuSisterId,
    supportCharacterId: supportCharId,
    synergyMultiplier,
    totalMarketValue,
    baseYieldPerMinute,
    effectiveYieldPerMinute,
  };
}

/**
 * Calculates accrued idle earnings given elapsed minutes and page configuration.
 */
export function calculateAccruedIdleEarnings(
  report: BinderSynergyReport,
  elapsedMinutes: number,
  maxOfflineHours: number = 24
): number {
  const maxMinutes = maxOfflineHours * 60;
  const effectiveMinutes = Math.min(Math.max(0, elapsedMinutes), maxMinutes);
  return Math.floor(effectiveMinutes * report.effectiveYieldPerMinute);
}
