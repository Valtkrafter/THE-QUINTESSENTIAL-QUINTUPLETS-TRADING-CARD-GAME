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
  ShowcaseSlot,
  ShowcaseSynergyReport,
} from '../types/card';
import { CARDS_BY_RARITY, CARD_MAP, CARDS_CATALOG } from './cardsData';
import { resolveActiveSupportBuff } from './supportBuffs';

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
 * Accepts boolean hasRaihaSupport (legacy: 15% discount) or explicit numeric discount fraction (e.g. 0.15, 0.30, 0.36).
 */
export function calculateGradingFee(
  card: CardInstance,
  supportOrDiscount: boolean | number = false
): number {
  const rawValue = calculateRawCardValue(card.rarity, card.finish);
  const baseFee = rawValue * 0.5;
  const discount =
    typeof supportOrDiscount === 'number'
      ? supportOrDiscount
      : supportOrDiscount
      ? 0.15
      : 0;
  const finalFee = baseFee * (1.0 - discount);
  return Math.max(1, Math.round(finalFee));
}

/**
 * Calculates Stardust yield from dusting a raw card (exactly 20% of raw value).
 * Accepts boolean hasMaruoSupport (legacy: +20% bonus) or explicit numeric bonus fraction (e.g. 0.75, 0.90).
 */
export function calculateDustYield(
  card: CardInstance,
  supportOrBonus: boolean | number = false
): number {
  const rawValue = calculateRawCardValue(card.rarity, card.finish);
  const baseDust = Math.floor(rawValue * 0.2);
  const bonus =
    typeof supportOrBonus === 'number'
      ? supportOrBonus
    : supportOrBonus
    ? 0.20
    : 0;
  const finalDust = Math.floor(baseDust * (1.0 + bonus));
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
 * Calculates Singles Kiosk purchase price in Yen (fixed at 2.5x base market value, with optional support discount).
 */
export function calculateKioskPrice(rarity: Rarity, discountFraction: number = 0): number {
  const base = RARITY_BASE_VALUES[rarity] ?? 15;
  const price = base * KIOSK_PRICE_MULTIPLIER * (1.0 - Math.min(0.9, Math.max(0, discountFraction)));
  return Math.max(1, Math.round(price));
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
 * Optional extraUpgradeChance shifts weight from raw into upgraded foil finishes (Raiha UC support buff).
 */
export function rollFinish(extraUpgradeChance: number = 0): Finish {
  const roll = randomFloat() * 100.0;
  let cumulative = 0.0;

  if (extraUpgradeChance > 0) {
    const shift = Math.min(30, extraUpgradeChance * 100);
    const rawChance = Math.max(10, FINISH_CHANCES.raw - shift);
    const scaleFactor = (100.0 - rawChance) / (100.0 - FINISH_CHANCES.raw);

    const adjustedChances: Record<Finish, number> = {
      signed: FINISH_CHANCES.signed * scaleFactor,
      gold_etched: FINISH_CHANCES.gold_etched * scaleFactor,
      rainbow: FINISH_CHANCES.rainbow * scaleFactor,
      sparkle: FINISH_CHANCES.sparkle * scaleFactor,
      holo: FINISH_CHANCES.holo * scaleFactor,
      raw: rawChance,
    };

    const finishes: Finish[] = ['signed', 'gold_etched', 'rainbow', 'sparkle', 'holo', 'raw'];
    for (const finish of finishes) {
      cumulative += adjustedChances[finish];
      if (roll < cumulative) {
        return finish;
      }
    }
    return 'raw';
  }

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
  pityCounters: PityCounters,
  finishUpgradeBonus: number = 0
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
    const finish = rollFinish(finishUpgradeBonus);

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

function generateSubgrades(
  tier: GradeTier,
  numericGrade: number,
  isGradePrepCertified = false
): GradeSubgrades {
  if (tier === 'BLACK_LABEL') {
    return {
      centering: 10.0,
      surface: 10.0,
      corners: 10.0,
      edges: 10.0,
    };
  }

  let subgrades: GradeSubgrades;

  if (numericGrade === 10) {
    // Gem Mint 10: At least three 10.0 and one 9.5
    const subs = [10.0, 10.0, 10.0, 9.5];
    subs.sort(() => randomFloat() - 0.5);
    subgrades = {
      centering: subs[0],
      surface: subs[1],
      corners: subs[2],
      edges: subs[3],
    };
  } else if (numericGrade === 9) {
    // Mint 9: Subgrades average around 9.0 (e.g. 9.0, 9.5, 9.0, 8.5)
    subgrades = {
      centering: Number((8.5 + randomFloat()).toFixed(1)),
      surface: Number((8.5 + randomFloat()).toFixed(1)),
      corners: Number((8.5 + randomFloat()).toFixed(1)),
      edges: Number((8.5 + randomFloat()).toFixed(1)),
    };
  } else {
    // Generic subgrades around numericGrade +/- 0.5
    const base = numericGrade;
    subgrades = {
      centering: Math.max(1.0, Math.min(10.0, Number((base - 0.5 + randomFloat()).toFixed(1)))),
      surface: Math.max(1.0, Math.min(10.0, Number((base - 0.5 + randomFloat()).toFixed(1)))),
      corners: Math.max(1.0, Math.min(10.0, Number((base - 0.5 + randomFloat()).toFixed(1)))),
      edges: Math.max(1.0, Math.min(10.0, Number((base - 0.5 + randomFloat()).toFixed(1)))),
    };
  }

  if (isGradePrepCertified) {
    // Step 3: Removes warp and edge curling; guarantees minimum Subgrade 8.5 on Corners & Edges
    subgrades.corners = Math.max(8.5, subgrades.corners);
    subgrades.edges = Math.max(8.5, subgrades.edges);

    // Step 4: Buffs Surface Subgrade roll by +1.5; grants a +15% flat bonus to roll a Gem Mint 10 on Surface
    subgrades.surface = Math.min(10.0, Number((subgrades.surface + 1.5).toFixed(1)));
    if (randomFloat() < 0.15) {
      subgrades.surface = 10.0;
    }
  }

  return subgrades;
}

function singleGradeRoll(
  activeTools: ConsumableToolId[],
  extraGrade10Bonus: number = 0,
  isGradePrepCertified = false
): {
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

  // Grade Prep Certified: Locked floor at Grade 7 (eliminates Poor 1–3 and Used 4–6)
  if (isGradePrepCertified) {
    weights.POOR_1_3 = 0;
    weights.USED_4_6 = 0;
    const remainingSum = weights.CRISP_7_8 + weights.MINT_9 + weights.GEM_MINT_10 + weights.BLACK_LABEL;
    const scaleFactor = 100.0 / remainingSum;
    weights.CRISP_7_8 *= scaleFactor;
    weights.MINT_9 *= scaleFactor;
    weights.GEM_MINT_10 *= scaleFactor;
    weights.BLACK_LABEL *= scaleFactor;
  } else if (hasCloth) {
    // 1. Apply Microfiber Cloth (eliminates 1–3, redistributes 12% across remaining tiers)
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

    const lowerTierKeys: GradeTier[] = isGradePrepCertified
      ? ['CRISP_7_8', 'MINT_9']
      : ['POOR_1_3', 'USED_4_6', 'CRISP_7_8', 'MINT_9'];
    const lowerTierSum = lowerTierKeys.reduce((sum, key) => sum + weights[key], 0);

    if (lowerTierSum > flatBoost) {
      const reductionRatio = (lowerTierSum - flatBoost) / lowerTierSum;
      for (const key of lowerTierKeys) {
        weights[key] *= reductionRatio;
      }
    }
  }

  // 3. Apply Support Buff Grade 10 / Black Label bonus (e.g. Raiha SR +3% / +3.6% flat bonus)
  if (extraGrade10Bonus > 0) {
    const flatBonusPct = extraGrade10Bonus * 100; // e.g. 3.0 or 3.6
    weights.GEM_MINT_10 += flatBonusPct * 0.85; // Distributed across Gem Mint 10 & Black Label
    weights.BLACK_LABEL += flatBonusPct * 0.15;

    const lowerTierKeys: GradeTier[] = isGradePrepCertified
      ? ['CRISP_7_8', 'MINT_9']
      : ['POOR_1_3', 'USED_4_6', 'CRISP_7_8', 'MINT_9'];
    const lowerTierSum = lowerTierKeys.reduce((sum, key) => sum + weights[key], 0);
    if (lowerTierSum > flatBonusPct) {
      const reductionRatio = (lowerTierSum - flatBonusPct) / lowerTierSum;
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
  let selectedTier: GradeTier = isGradePrepCertified ? 'CRISP_7_8' : 'USED_4_6';

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
  let numericGrade = randomIntBetween(minG, maxG);

  if (isGradePrepCertified && numericGrade < 7) {
    numericGrade = 7;
    selectedTier = 'CRISP_7_8';
  }

  return { tier: selectedTier, numericGrade };
}

/**
 * Evaluates grading outcome with optional consumable tools, support bonuses, and insurance reroll.
 */
export function rollGrading(
  card: CardInstance,
  tools: ConsumableToolId[] = [],
  extraGrade10Bonus: number = 0
): {
  gradeResult: GradeResult;
  insuranceRerolled: boolean;
} {
  const isCertified = Boolean(card.isGradePrepCertified);
  let { tier, numericGrade } = singleGradeRoll(tools, extraGrade10Bonus, isCertified);
  let insuranceRerolled = false;

  // Apply Vault Insurance if grade is below 7
  if (tools.includes('vault_insurance') && numericGrade < 7) {
    insuranceRerolled = true;
    const reroll = singleGradeRoll(tools, extraGrade10Bonus, isCertified);
    tier = reroll.tier;
    numericGrade = reroll.numericGrade;
  }

  if (isCertified && numericGrade < 7) {
    numericGrade = 7;
    tier = 'CRISP_7_8';
  }

  let isBlackLabel = tier === 'BLACK_LABEL';
  const subgrades = generateSubgrades(tier, numericGrade, isCertified);

  // If quad 10.0 attained, upgrade to Black Label
  if (
    subgrades.centering === 10.0 &&
    subgrades.surface === 10.0 &&
    subgrades.corners === 10.0 &&
    subgrades.edges === 10.0
  ) {
    tier = 'BLACK_LABEL';
    isBlackLabel = true;
    numericGrade = 10;
  }

  const tierConfig = GRADE_TIER_CONFIG[tier];

  const gradeResult: GradeResult = {
    tier,
    tierLabel: tierConfig.tierLabel,
    numericGrade,
    isBlackLabel,
    multiplier: tierConfig.multiplier,
    subgrades,
    gradedAt: Date.now(),
    isRestored: isCertified || Boolean(card.crackCount && card.crackCount > 0),
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

  // PURGED: Binder passive yield is 0. The 5-Slot Showcase (Vitrine) is the ONLY source of passive idle yield.
  const baseYieldPerMinute = 0;
  const effectiveYieldPerMinute = 0;

  return {
    allFiveSisters,
    monoWaifu,
    monoWaifuSisterId,
    supportCharacterId: supportCharId,
    synergyMultiplier,
    totalMarketValue,
    baseYieldPerMinute: 0,
    effectiveYieldPerMinute: 0,
  };
}

/**
 * Calculates accrued idle earnings given elapsed minutes and page configuration.
 * Note: Legacy binder passive yield is purged; returns 0. Showcase handles 100% of idle revenue.
 */
export function calculateAccruedIdleEarnings(
  _report: BinderSynergyReport,
  _elapsedMinutes: number,
  _maxOfflineHours: number = 24
): number {
  return 0;
}

// ==========================================
// 8. STAGE 2: 5-SLOT SHOWCASE & CARD-DEX HELPERS
// ==========================================

export const FINISH_RANKS: Record<Finish, number> = {
  raw: 1,
  holo: 2,
  sparkle: 3,
  rainbow: 4,
  gold_etched: 5,
  signed: 6,
};

export function isFinishHigher(candidate: Finish, current?: Finish): boolean {
  if (!current) return true;
  return FINISH_RANKS[candidate] > FINISH_RANKS[current];
}

export function isGradeHigher(candidate: GradeResult, current?: GradeResult): boolean {
  if (!current) return true;
  if (candidate.isBlackLabel && !current.isBlackLabel) return true;
  if (!candidate.isBlackLabel && current.isBlackLabel) return false;
  if (candidate.numericGrade !== current.numericGrade) {
    return candidate.numericGrade > current.numericGrade;
  }
  return candidate.multiplier > current.multiplier;
}

/**
 * Evaluates the 5-slot Acrylic Showcase (Vitrine) synergies and idle yield.
 *
 * Idle Yield Formula:
 * Yield/Min = Sum_{i=1}^5 (60 Yen + Market Value_i * 0.0002) * Synergy Multiplier
 *
 * Synergy Multipliers:
 * - Quintuplet Harmony (all 5 sisters slotted): +50% yield (+0.5)
 * - Mono-Waifu Obsession (5 copies of the same sister): +30% yield (+0.3)
 * - Vault Excellence (all 5 cards are Slabs with Grade >= 9): +100% yield (+1.0)
 *
 * Base Floor:
 * Every slotted card generates a guaranteed minimum of 1 Yen/sec (60 Yen/min)
 * regardless of rarity to prevent softlocks.
 */
export function analyzeShowcaseSlots(
  slots: ShowcaseSlot[],
  cardMap: Map<string, CardInstance>,
  supportSlot?: CardInstance | null
): ShowcaseSynergyReport {
  const activeSupportBuff = resolveActiveSupportBuff(supportSlot ?? null);
  const sisterMarketMultiplier = 1.0 + (activeSupportBuff?.effects.sisterMarketValueMultiplier ?? 0);

  let totalMarketValue = 0;
  let slottedCount = 0;
  const slottedCards: CardInstance[] = [];

  for (const slot of slots) {
    if (!slot.cardInstanceId) continue;
    const card = cardMap.get(slot.cardInstanceId);
    if (!card) continue;
    slottedCards.push(card);
    slottedCount++;
    const baseVal = calculateCardMarketValue(card);
    totalMarketValue += Math.round(baseVal * sisterMarketMultiplier);
  }

  // 1. Quintuplet Harmony: Ichika, Nino, Miku, Yotsuba, Itsuki all slotted
  const sisterSet = new Set<SisterId>();
  for (const card of slottedCards) {
    if (NAKANO_SISTERS.includes(card.characterId as SisterId)) {
      sisterSet.add(card.characterId as SisterId);
    }
  }
  const quintupletHarmony = sisterSet.size === 5 && slottedCount === 5;

  // 2. Mono-Waifu: 5 copies of the same sister
  let monoWaifu = false;
  let monoWaifuSisterId: SisterId | null = null;
  if (slottedCount === 5 && sisterSet.size === 1) {
    monoWaifu = true;
    monoWaifuSisterId = Array.from(sisterSet)[0];
  }

  // 3. Vault Excellence: All 5 cards are Slabs with Grade >= 9
  const vaultExcellence =
    slottedCount === 5 &&
    slottedCards.every((card) => card.grade && card.grade.numericGrade >= 9);

  // Synergy multiplier calculation:
  // Fuutarou UR amplifies Quintuplet Harmony from +50% (+0.5) to +100% (+1.0), or +120% (+1.2) if Grade 9/10
  const harmonyBonus = quintupletHarmony
    ? 0.5 + (activeSupportBuff?.effects.harmonyBonusBoost ?? 0)
    : 0;
  const monoBonus = monoWaifu ? 0.3 : 0;
  const excellenceBonus = vaultExcellence ? 1.0 : 0;

  const baseSynergiesMultiplier = 1.0 + harmonyBonus + monoBonus + excellenceBonus;
  const supportMultiplier = activeSupportBuff?.effects.yieldMultiplier ?? 1.0;
  const synergyMultiplier = baseSynergiesMultiplier * supportMultiplier;

  const baseFloorPerMinute = slottedCount * 60; // 60 Yen/min per slotted card (1 Yen/sec)
  const marketBonusPerMinute = totalMarketValue * 0.0002;
  const effectiveYieldPerMinute = (baseFloorPerMinute + marketBonusPerMinute) * synergyMultiplier;
  const effectiveYieldPerSecond = effectiveYieldPerMinute / 60;

  return {
    quintupletHarmony,
    monoWaifu,
    monoWaifuSisterId,
    vaultExcellence,
    baseSynergiesMultiplier,
    supportMultiplier,
    synergyMultiplier,
    totalMarketValue,
    baseFloorPerMinute,
    marketBonusPerMinute,
    effectiveYieldPerMinute,
    effectiveYieldPerSecond,
    slottedCount,
    activeSupportBuff,
  };
}

/**
 * Calculates accrued Vitrine idle earnings with 12-hour offline accrual cap.
 */
export function calculateShowcaseIdleEarnings(
  report: ShowcaseSynergyReport,
  elapsedMinutes: number,
  maxOfflineHours: number = 12
): number {
  const maxMinutes = maxOfflineHours * 60; // 720 minutes maximum
  const effectiveMinutes = Math.min(Math.max(0, elapsedMinutes), maxMinutes);
  return Math.floor(effectiveMinutes * report.effectiveYieldPerMinute);
}
