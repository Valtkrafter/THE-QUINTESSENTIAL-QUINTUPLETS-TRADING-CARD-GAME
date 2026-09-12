/**
 * TQQ Vault - Persistent Game State Store (Zustand)
 * Manages player currencies, inventory, binder slots, grading queue,
 * consumables, pity counters, cooldowns, and idle earnings.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  BinderPage,
  BinderSlot,
  BinderSynergyReport,
  BulkSellFilter,
  BulkSellResult,
  CardInstance,
  ConsumableToolId,
  GradingResultInfo,
  KioskOffering,
  OpenPackResult,
  PackId,
  PityCounters,
  Rarity,
  ShowcaseSlot,
  ShowcaseSynergyReport,
  CardDexEntry,
} from '../types/card';
import { CARD_MAP, CARDS_CATALOG } from '../config/cardsData';
import {
  analyzeBinderPage,
  calculateAccruedIdleEarnings,
  calculateBulkSellValue,
  calculateCardSellValue,
  calculateDustYield,
  calculateGradingFee,
  calculateKioskPrice,
  CONSUMABLE_TOOLS,
  generateKioskStock,
  KIOSK_REROLL_STARDUST_COST,
  KIOSK_ROTATION_INTERVAL_MS,
  PACKS_CONFIG,
  rollGrading,
  rollPackDrops,
  analyzeShowcaseSlots,
  calculateShowcaseIdleEarnings,
  isFinishHigher,
  isGradeHigher,
} from '../config/economy';
import { resolveActiveSupportBuff } from '../config/supportBuffs';
import { APP_VERSION } from '../config/version';

export const CURRENT_PATCH_VERSION = `v${APP_VERSION}`;

export interface GameStats {
  totalPacksOpened: number;
  totalCardsGraded: number;
  totalStardustEarned: number;
  totalYenEarned: number;
  godPacksPulled: number;
  blackLabelsPulled: number;
}

export interface GameState {
  // Currencies
  yen: number;
  stardust: number;

  // Inventory & Collection
  inventory: CardInstance[];
  binder: BinderPage;

  // STAGE 2 & STAGE 5: 5-Slot Acrylic Showcase (Vitrine), Support Altar & Master Card-Dex
  showcaseSlots: ShowcaseSlot[];
  supportSlot: CardInstance | null;
  cardDex: Record<string, CardDexEntry>;
  showcaseLastClaimedTimestamp: number;

  // Tools & Consumables
  tools: Record<ConsumableToolId, number>;
  equippedTools: ConsumableToolId[];

  // Gacha Pity & Cooldowns
  pityCounters: PityCounters;
  packCooldowns: Partial<Record<PackId, number>>;

  // Idle Timestamps
  lastActiveTimestamp: number;

  // Daily Singles Kiosk
  kioskStock: KioskOffering[];
  kioskLastRefreshed: number;

  // Stats
  stats: GameStats;

  // Patch Notes Version Tracking
  lastSeenPatchVersion: string;

  // Actions
  openPack: (packId: PackId) => OpenPackResult;
  gradeCard: (cardInstanceId: string, toolOverrides?: ConsumableToolId[]) => GradingResultInfo;
  submitForGrading: (cardInstanceId: string, toolOverrides?: ConsumableToolId[]) => GradingResultInfo;
  dustCard: (cardInstanceId: string) => number;
  vaporizeCard: (cardInstanceId: string) => number;
  dustCards: (cardInstanceIds: string[]) => number;
  sellCard: (cardInstanceId: string) => number;
  sellBulkCards: (filter: BulkSellFilter) => BulkSellResult;
  buyTool: (toolId: ConsumableToolId, quantity?: number) => void;
  equipTool: (toolId: ConsumableToolId) => void;
  unequipTool: (toolId: ConsumableToolId) => void;
  slotBinderCard: (slotIndex: number, cardInstanceId: string | null) => void;
  claimIdleRevenue: () => number;
  getBinderSynergyReport: () => BinderSynergyReport;
  getTestSheetCooldownRemaining: () => number;
  refreshKiosk: (isManual?: boolean) => void;
  buyKioskCard: (offeringId: string) => CardInstance;
  checkAndRotateKiosk: () => void;
  resetSave: () => void;
  markPatchNotesSeen: (version?: string) => void;

  // STAGE 2 & STAGE 5 Actions
  slotShowcaseCard: (slotIndex: number, cardInstanceId: string | null) => void;
  slotSupportCard: (cardInstanceId: string | null) => void;
  claimShowcaseRevenue: () => number;
  getShowcaseSynergyReport: () => ShowcaseSynergyReport;
  recordCardDiscovery: (card: CardInstance) => void;
  syncCardDex: () => void;
}

const DEFAULT_BINDER_SLOTS: BinderSlot[] = [
  { slotIndex: 0, allowedRole: 'sister', cardInstanceId: null },
  { slotIndex: 1, allowedRole: 'sister', cardInstanceId: null },
  { slotIndex: 2, allowedRole: 'sister', cardInstanceId: null },
  { slotIndex: 3, allowedRole: 'sister', cardInstanceId: null },
  { slotIndex: 4, allowedRole: 'sister', cardInstanceId: null },
  { slotIndex: 5, allowedRole: 'support', cardInstanceId: null },
];

export const DEFAULT_SHOWCASE_SLOTS: ShowcaseSlot[] = [
  { slotIndex: 0, cardInstanceId: null },
  { slotIndex: 1, cardInstanceId: null },
  { slotIndex: 2, cardInstanceId: null },
  { slotIndex: 3, cardInstanceId: null },
  { slotIndex: 4, cardInstanceId: null },
];

export function createInitialCardDex(): Record<string, CardDexEntry> {
  const dex: Record<string, CardDexEntry> = {};
  for (const card of CARDS_CATALOG) {
    dex[card.id] = {
      cardDefId: card.id,
      cardNumber: card.cardNumber,
      characterId: card.characterId,
      characterRole: card.characterRole,
      rarity: card.rarity,
      discovered: false,
      timesObtained: 0,
    };
  }
  return dex;
}

export function syncDexWithInventory(
  currentDex: Record<string, CardDexEntry> | undefined,
  inventory: CardInstance[]
): Record<string, CardDexEntry> {
  const updated: Record<string, CardDexEntry> = {};
  for (const card of CARDS_CATALOG) {
    if (currentDex && currentDex[card.id]) {
      updated[card.id] = {
        ...currentDex[card.id],
        cardNumber: card.cardNumber,
        characterId: card.characterId,
        characterRole: card.characterRole,
        rarity: card.rarity,
      };
    } else {
      updated[card.id] = {
        cardDefId: card.id,
        cardNumber: card.cardNumber,
        characterId: card.characterId,
        characterRole: card.characterRole,
        rarity: card.rarity,
        discovered: false,
        timesObtained: 0,
      };
    }
  }

  for (const card of inventory) {
    const existing = updated[card.cardDefId];
    if (!existing) continue;

    const highestFinish = isFinishHigher(card.finish, existing.highestFinish)
      ? card.finish
      : existing.highestFinish ?? card.finish;

    const bestGrade = card.grade
      ? isGradeHigher(card.grade, existing.bestGrade)
        ? card.grade
        : existing.bestGrade
      : existing.bestGrade;

    updated[card.cardDefId] = {
      ...existing,
      discovered: true,
      discoveredAt: existing.discoveredAt ?? card.obtainedAt ?? Date.now(),
      highestFinish,
      bestGrade,
      timesObtained: Math.max(existing.timesObtained, 1),
    };
  }

  return updated;
}

const INITIAL_STATE = {
  yen: 1000,
  stardust: 0,
  inventory: [] as CardInstance[],
  binder: {
    id: 'binder_page_1',
    name: 'Quintessential Page 1',
    slots: DEFAULT_BINDER_SLOTS,
  } as BinderPage,
  showcaseSlots: DEFAULT_SHOWCASE_SLOTS,
  supportSlot: null as CardInstance | null,
  cardDex: createInitialCardDex(),
  showcaseLastClaimedTimestamp: Date.now(),
  tools: {
    microfiber_cloth: 0,
    centering_laser: 0,
    vault_insurance: 0,
  } as Record<ConsumableToolId, number>,
  equippedTools: [] as ConsumableToolId[],
  pityCounters: {
    packsWithoutSR: 0,
    packsWithoutUR: 0,
  } as PityCounters,
  packCooldowns: {} as Partial<Record<PackId, number>>,
  lastActiveTimestamp: Date.now(),
  kioskStock: [] as KioskOffering[],
  kioskLastRefreshed: 0,
  lastSeenPatchVersion: '',
  stats: {
    totalPacksOpened: 0,
    totalCardsGraded: 0,
    totalStardustEarned: 0,
    totalYenEarned: 0,
    godPacksPulled: 0,
    blackLabelsPulled: 0,
  } as GameStats,
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      getBinderSynergyReport: (): BinderSynergyReport => {
        const { binder, inventory } = get();
        const cardMap = new Map<string, CardInstance>();
        for (const card of inventory) {
          cardMap.set(card.id, card);
        }
        return analyzeBinderPage(binder, cardMap);
      },

      getTestSheetCooldownRemaining: (): number => {
        const { packCooldowns, binder, inventory, supportSlot } = get();
        const lastOpened = packCooldowns.test_sheet;
        if (!lastOpened) return 0;

        const baseCooldown = PACKS_CONFIG.test_sheet.cooldownSeconds ?? 14400;

        // Check Support Altar Takeda buff first
        const activeBuff = resolveActiveSupportBuff(supportSlot);
        let effectiveCooldown = baseCooldown;

        if (activeBuff?.effects.cooldownReductionSeconds) {
          effectiveCooldown = Math.max(0, baseCooldown - activeBuff.effects.cooldownReductionSeconds);
        } else {
          // Fallback legacy binder check
          const cardMap = new Map<string, CardInstance>();
          for (const card of inventory) {
            cardMap.set(card.id, card);
          }
          const report = analyzeBinderPage(binder, cardMap);
          if (report.supportCharacterId === 'takeda') {
            effectiveCooldown = Math.round(baseCooldown * 0.5);
          }
        }

        const elapsedSeconds = (Date.now() - lastOpened) / 1000;
        return Math.max(0, Math.ceil(effectiveCooldown - elapsedSeconds));
      },

      openPack: (packId: PackId): OpenPackResult => {
        const state = get();
        const packConfig = PACKS_CONFIG[packId];
        if (!packConfig) {
          throw new Error(`Invalid pack ID: ${packId}`);
        }

        // 1. Cooldown validation (e.g. Test-Sheet)
        if (packConfig.cooldownSeconds && packConfig.cooldownSeconds > 0) {
          const remaining = state.getTestSheetCooldownRemaining();
          if (remaining > 0) {
            throw new Error(`Pack is on cooldown. Remaining: ${remaining}s`);
          }
        }

        // 2. Cost validation
        if (state.yen < packConfig.costYen) {
          throw new Error(
            `Insufficient Yen. Required: ${packConfig.costYen} ¥, Available: ${state.yen} ¥`
          );
        }

        // 3. Roll drops (with Raiha UC finish upgrade chance bonus if active)
        const activeBuff = resolveActiveSupportBuff(state.supportSlot);
        const finishUpgradeBonus = activeBuff?.effects.finishUpgradeChanceBonus ?? 0;
        const rollResult = rollPackDrops(packId, state.pityCounters, finishUpgradeBonus);

        // 4. Update state
        const newCooldowns = { ...state.packCooldowns };
        if (packConfig.cooldownSeconds && packConfig.cooldownSeconds > 0) {
          newCooldowns[packId] = Date.now();
        }

        let newBlackLabels = 0;
        for (const card of rollResult.cards) {
          if (card.grade?.isBlackLabel) newBlackLabels += 1;
        }

        // STAGE 2: Update Card-Dex with all pulled cards
        const updatedDex = { ...(state.cardDex ?? createInitialCardDex()) };
        for (const card of rollResult.cards) {
          const cardDef = CARD_MAP[card.cardDefId];
          if (!cardDef) continue;
          const cur = updatedDex[card.cardDefId] ?? {
            cardDefId: cardDef.id,
            cardNumber: cardDef.cardNumber,
            characterId: cardDef.characterId,
            characterRole: cardDef.characterRole,
            rarity: cardDef.rarity,
            discovered: false,
            timesObtained: 0,
          };
          const highestFinish = isFinishHigher(card.finish, cur.highestFinish)
            ? card.finish
            : cur.highestFinish ?? card.finish;
          const bestGrade = card.grade
            ? isGradeHigher(card.grade, cur.bestGrade)
              ? card.grade
              : cur.bestGrade
            : cur.bestGrade;

          updatedDex[card.cardDefId] = {
            ...cur,
            discovered: true,
            discoveredAt: cur.discoveredAt ?? card.obtainedAt ?? Date.now(),
            highestFinish,
            bestGrade,
            timesObtained: (cur.timesObtained ?? 0) + 1,
          };
        }

        set({
          yen: state.yen - packConfig.costYen,
          inventory: [...state.inventory, ...rollResult.cards],
          cardDex: updatedDex,
          pityCounters: rollResult.newPityCounters,
          packCooldowns: newCooldowns,
          stats: {
            ...state.stats,
            totalPacksOpened: state.stats.totalPacksOpened + 1,
            godPacksPulled: state.stats.godPacksPulled + (rollResult.isGodPack ? 1 : 0),
            blackLabelsPulled: state.stats.blackLabelsPulled + newBlackLabels,
          },
        });

        return {
          packId,
          isGodPack: rollResult.isGodPack,
          cards: rollResult.cards,
          costPaid: packConfig.costYen,
          pityTriggered: rollResult.pityTriggered,
          newPityCounters: rollResult.newPityCounters,
        };
      },

      gradeCard: (
        cardInstanceId: string,
        toolOverrides?: ConsumableToolId[]
      ): GradingResultInfo => {
        const state = get();
        const cardIndex = state.inventory.findIndex((c) => c.id === cardInstanceId);
        if (cardIndex === -1) {
          throw new Error(`Card instance not found: ${cardInstanceId}`);
        }

        const card = state.inventory[cardIndex];
        if (card.grade) {
          throw new Error(`Card is already graded (Grade ${card.grade.numericGrade})`);
        }

        const toolsToUse = toolOverrides ?? state.equippedTools;

        // Verify player owns all specified tools
        const toolCounts = { ...state.tools };
        for (const toolId of toolsToUse) {
          if ((toolCounts[toolId] ?? 0) <= 0) {
            throw new Error(`Consumable tool not owned: ${toolId}`);
          }
        }

        // Check Support Altar Raiha discount & Grade 10 / Black Label bonus
        const activeBuff = resolveActiveSupportBuff(state.supportSlot);
        let feeDiscount = activeBuff?.effects.gradingFeeDiscount ?? 0;
        const grade10Bonus = activeBuff?.effects.grade10BlackLabelBonus ?? 0;

        if (feeDiscount === 0) {
          // Fallback legacy binder check
          const cardMap = new Map<string, CardInstance>();
          for (const c of state.inventory) {
            cardMap.set(c.id, c);
          }
          const report = analyzeBinderPage(state.binder, cardMap);
          if (report.supportCharacterId === 'raiha') {
            feeDiscount = 0.15;
          }
        }

        const fee = calculateGradingFee(card, feeDiscount);
        if (state.yen < fee) {
          throw new Error(`Insufficient Yen for grading fee. Required: ${fee} ¥, Available: ${state.yen} ¥`);
        }

        // Deduct used tools
        for (const toolId of toolsToUse) {
          toolCounts[toolId] = Math.max(0, (toolCounts[toolId] ?? 0) - 1);
        }

        // Execute grading roll (with Raiha SR bonus if active)
        const { gradeResult, insuranceRerolled } = rollGrading(card, toolsToUse, grade10Bonus);

        // Update card instance
        const updatedCard: CardInstance = {
          ...card,
          grade: gradeResult,
        };

        const updatedInventory = [...state.inventory];
        updatedInventory[cardIndex] = updatedCard;

        // STAGE 2: Update Card-Dex bestGrade
        const updatedDex = { ...(state.cardDex ?? createInitialCardDex()) };
        const existingDexEntry = updatedDex[card.cardDefId];
        if (existingDexEntry) {
          if (isGradeHigher(gradeResult, existingDexEntry.bestGrade)) {
            updatedDex[card.cardDefId] = {
              ...existingDexEntry,
              bestGrade: gradeResult,
            };
          }
        }

        set({
          yen: state.yen - fee,
          inventory: updatedInventory,
          cardDex: updatedDex,
          tools: toolCounts,
          equippedTools: [], // Clear equipped tools once consumed
          stats: {
            ...state.stats,
            totalCardsGraded: state.stats.totalCardsGraded + 1,
            blackLabelsPulled:
              state.stats.blackLabelsPulled + (gradeResult.isBlackLabel ? 1 : 0),
          },
        });

        return {
          card: updatedCard,
          grade: gradeResult,
          gradingFeePaid: fee,
          usedTools: toolsToUse,
          insuranceRerolled,
        };
      },

      submitForGrading: (
        cardInstanceId: string,
        toolOverrides?: ConsumableToolId[]
      ): GradingResultInfo => {
        return get().gradeCard(cardInstanceId, toolOverrides);
      },

      dustCard: (cardInstanceId: string): number => {
        const state = get();
        const cardIndex = state.inventory.findIndex((c) => c.id === cardInstanceId);
        if (cardIndex === -1) {
          throw new Error(`Card not found: ${cardInstanceId}`);
        }

        const card = state.inventory[cardIndex];
        if (card.grade) {
          throw new Error('Graded cards cannot be dusted. Only raw cards can be converted to Stardust.');
        }

        // Showcase & Support Altar protection
        const isSlottedInShowcase = (state.showcaseSlots ?? []).some((s) => s.cardInstanceId === cardInstanceId);
        if (isSlottedInShowcase) {
          throw new Error('This card is currently mounted in your 5-slot Acrylic Showcase! Unmount it before dusting.');
        }
        if (state.supportSlot?.id === cardInstanceId) {
          throw new Error('This card is currently mounted on your Support Altar! Unmount it before dusting.');
        }

        // Check Support Altar Maruo bonus (+75%, or +90% with slab)
        const activeBuff = resolveActiveSupportBuff(state.supportSlot);
        let dustBonus = activeBuff?.effects.dustBonus ?? 0;
        if (dustBonus === 0) {
          // Fallback legacy binder check
          const cardMap = new Map<string, CardInstance>();
          for (const c of state.inventory) {
            cardMap.set(c.id, c);
          }
          const report = analyzeBinderPage(state.binder, cardMap);
          if (report.supportCharacterId === 'maruo') {
            dustBonus = 0.2;
          }
        }

        const dustEarned = calculateDustYield(card, dustBonus);

        // Unslot from binder if currently slotted
        let updatedBinder = state.binder;
        if (card.slottedBinder) {
          const newSlots = state.binder.slots.map((s) =>
            s.cardInstanceId === cardInstanceId ? { ...s, cardInstanceId: null } : s
          );
          updatedBinder = { ...state.binder, slots: newSlots };
        }

        const updatedInventory = state.inventory.filter((c) => c.id !== cardInstanceId);

        set({
          stardust: state.stardust + dustEarned,
          inventory: updatedInventory,
          binder: updatedBinder,
          stats: {
            ...state.stats,
            totalStardustEarned: state.stats.totalStardustEarned + dustEarned,
          },
        });

        return dustEarned;
      },

      vaporizeCard: (cardInstanceId: string): number => {
        return get().dustCard(cardInstanceId);
      },

      dustCards: (cardInstanceIds: string[]): number => {
        if (cardInstanceIds.length === 0) return 0;
        const state = get();
        const idSet = new Set(cardInstanceIds);

        // Check Support Altar Maruo bonus
        const activeBuff = resolveActiveSupportBuff(state.supportSlot);
        let dustBonus = activeBuff?.effects.dustBonus ?? 0;
        if (dustBonus === 0) {
          const cardMap = new Map<string, CardInstance>();
          for (const c of state.inventory) {
            cardMap.set(c.id, c);
          }
          const report = analyzeBinderPage(state.binder, cardMap);
          if (report.supportCharacterId === 'maruo') {
            dustBonus = 0.2;
          }
        }

        const slottedShowcaseIds = new Set<string>();
        for (const s of (state.showcaseSlots ?? [])) {
          if (s.cardInstanceId) slottedShowcaseIds.add(s.cardInstanceId);
        }

        let totalDustEarned = 0;
        const unslottedBinderIds = new Set<string>();

        const updatedInventory = state.inventory.filter((card) => {
          if (!idSet.has(card.id)) return true;
          // Graded cards, showcase slotted cards, and Support Altar cards cannot be dusted
          const isProtected = card.grade || slottedShowcaseIds.has(card.id) || state.supportSlot?.id === card.id;
          if (isProtected) return true;

          totalDustEarned += calculateDustYield(card, dustBonus);
          if (card.slottedBinder) {
            unslottedBinderIds.add(card.id);
          }
          return false;
        });

        let updatedBinder = state.binder;
        if (unslottedBinderIds.size > 0) {
          const newSlots = state.binder.slots.map((s) =>
            s.cardInstanceId && unslottedBinderIds.has(s.cardInstanceId)
              ? { ...s, cardInstanceId: null }
              : s
          );
          updatedBinder = { ...state.binder, slots: newSlots };
        }

        set({
          stardust: state.stardust + totalDustEarned,
          inventory: updatedInventory,
          binder: updatedBinder,
          stats: {
            ...state.stats,
            totalStardustEarned: state.stats.totalStardustEarned + totalDustEarned,
          },
        });

        return totalDustEarned;
      },

      sellCard: (cardInstanceId: string): number => {
        const state = get();
        const card = state.inventory.find((c) => c.id === cardInstanceId);
        if (!card) {
          throw new Error(`Card not found in inventory: ${cardInstanceId}`);
        }

        // Validates that the card is not locked in a showcase slot or support altar
        if (card.isLocked) {
          throw new Error('This card is locked and cannot be liquidated.');
        }
        if (card.slottedBinder) {
          throw new Error('This card is currently slotted in your binder showcase. Unslot it before liquidating.');
        }
        const isSlottedInBinder = state.binder.slots.some((s) => s.cardInstanceId === cardInstanceId);
        if (isSlottedInBinder) {
          throw new Error('This card is currently slotted in your binder showcase. Unslot it before liquidating.');
        }
        const isSlottedInShowcase = (state.showcaseSlots ?? []).some((s) => s.cardInstanceId === cardInstanceId);
        if (isSlottedInShowcase) {
          throw new Error('This card is currently mounted in your 5-slot Acrylic Showcase! Unmount it before liquidating.');
        }
        if (state.supportSlot?.id === cardInstanceId) {
          throw new Error('This card is currently mounted on your Support Altar! Unmount it before liquidating.');
        }

        // Computes exact sell value: baseValue * finishMultiplier * gradeMultiplier
        const sellValue = calculateCardSellValue(card);

        // Removes the card from inventory and credits Yen
        const updatedInventory = state.inventory.filter((c) => c.id !== cardInstanceId);

        set({
          yen: state.yen + sellValue,
          inventory: updatedInventory,
          stats: {
            ...state.stats,
            totalYenEarned: state.stats.totalYenEarned + sellValue,
          },
        });

        return sellValue;
      },

      sellBulkCards: (filter: BulkSellFilter): BulkSellResult => {
        const state = get();
        const targetRarities = new Set<Rarity>(filter.rarities);

        // Collect slotted binder card IDs to prevent liquidating showcase cards
        const slottedBinderIds = new Set<string>();
        for (const slot of state.binder.slots) {
          if (slot.cardInstanceId) {
            slottedBinderIds.add(slot.cardInstanceId);
          }
        }

        const slottedShowcaseIds = new Set<string>();
        for (const slot of (state.showcaseSlots ?? [])) {
          if (slot.cardInstanceId) {
            slottedShowcaseIds.add(slot.cardInstanceId);
          }
        }

        const eligibleCards: CardInstance[] = [];
        const retainedCards: CardInstance[] = [];

        for (const card of state.inventory) {
          const isLocked =
            card.isLocked ||
            card.slottedBinder !== undefined ||
            slottedBinderIds.has(card.id) ||
            slottedShowcaseIds.has(card.id) ||
            state.supportSlot?.id === card.id;
          const matchesRarity = targetRarities.has(card.rarity);
          const matchesCertification = filter.uncertifiedOnly ? !card.grade : true;

          if (!isLocked && matchesRarity && matchesCertification) {
            eligibleCards.push(card);
          } else {
            retainedCards.push(card);
          }
        }

        if (eligibleCards.length === 0) {
          return { count: 0, totalYen: 0, soldCards: [] };
        }

        const totalYen = calculateBulkSellValue(eligibleCards);

        set({
          yen: state.yen + totalYen,
          inventory: retainedCards,
          stats: {
            ...state.stats,
            totalYenEarned: state.stats.totalYenEarned + totalYen,
          },
        });

        return {
          count: eligibleCards.length,
          totalYen,
          soldCards: eligibleCards,
        };
      },

      buyTool: (toolId: ConsumableToolId, quantity: number = 1): void => {
        const state = get();
        const toolConfig = CONSUMABLE_TOOLS[toolId];
        if (!toolConfig) {
          throw new Error(`Unknown tool ID: ${toolId}`);
        }
        if (quantity <= 0) {
          throw new Error('Quantity must be greater than zero');
        }

        const totalCost = toolConfig.stardustCost * quantity;
        if (state.stardust < totalCost) {
          throw new Error(
            `Insufficient Stardust. Required: ${totalCost}, Available: ${state.stardust}`
          );
        }

        set({
          stardust: state.stardust - totalCost,
          tools: {
            ...state.tools,
            [toolId]: (state.tools[toolId] ?? 0) + quantity,
          },
        });
      },

      equipTool: (toolId: ConsumableToolId): void => {
        const state = get();
        const owned = state.tools[toolId] ?? 0;
        if (owned <= 0) {
          throw new Error(`Tool not owned: ${toolId}`);
        }
        // Workstation supports 1 tool socket upgrade at a time
        set({
          equippedTools: [toolId],
        });
      },

      unequipTool: (toolId: ConsumableToolId): void => {
        const state = get();
        set({
          equippedTools: state.equippedTools.filter((id) => id !== toolId),
        });
      },

      slotBinderCard: (slotIndex: number, cardInstanceId: string | null): void => {
        const state = get();
        if (slotIndex < 0 || slotIndex > 5) {
          throw new Error(`Invalid slot index: ${slotIndex}. Must be 0 to 5.`);
        }

        const targetRole = slotIndex < 5 ? 'sister' : 'support';

        // Case 1: Unslotting
        if (cardInstanceId === null) {
          const currentSlottedId = state.binder.slots[slotIndex].cardInstanceId;
          const updatedSlots = state.binder.slots.map((s) =>
            s.slotIndex === slotIndex ? { ...s, cardInstanceId: null } : s
          );

          const updatedInventory = state.inventory.map((c) =>
            c.id === currentSlottedId ? { ...c, slottedBinder: undefined } : c
          );

          set({
            binder: { ...state.binder, slots: updatedSlots },
            inventory: updatedInventory,
          });
          return;
        }

        // Case 2: Slotting card
        const card = state.inventory.find((c) => c.id === cardInstanceId);
        if (!card) {
          throw new Error(`Card not found in inventory: ${cardInstanceId}`);
        }

        const cardDef = CARD_MAP[card.cardDefId];
        if (!cardDef) {
          throw new Error(`Card definition not found: ${card.cardDefId}`);
        }

        if (cardDef.characterRole !== targetRole) {
          throw new Error(
            `Role mismatch for slot ${slotIndex}: Card '${cardDef.name}' is role '${cardDef.characterRole}', but slot requires '${targetRole}'.`
          );
        }

        // If card was already in another slot, unslot it there
        const previousSlot = state.binder.slots.find(
          (s) => s.cardInstanceId === cardInstanceId
        );

        const currentOccupantId = state.binder.slots[slotIndex].cardInstanceId;

        const updatedSlots = state.binder.slots.map((s) => {
          if (s.slotIndex === slotIndex) {
            return { ...s, cardInstanceId };
          }
          if (previousSlot && s.slotIndex === previousSlot.slotIndex) {
            return { ...s, cardInstanceId: null };
          }
          return s;
        });

        const updatedInventory = state.inventory.map((c) => {
          if (c.id === cardInstanceId) {
            return {
              ...c,
              slottedBinder: { pageId: state.binder.id, slotIndex },
            };
          }
          if (currentOccupantId && c.id === currentOccupantId) {
            return {
              ...c,
              slottedBinder: undefined,
            };
          }
          return c;
        });

        set({
          binder: { ...state.binder, slots: updatedSlots },
          inventory: updatedInventory,
        });
      },

      claimIdleRevenue: (): number => {
        // Legacy binder passive yield purged; 5-Slot Showcase is the sole source of truth:
        return get().claimShowcaseRevenue();
      },

      refreshKiosk: (isManual: boolean = false): void => {
        const state = get();
        if (isManual) {
          if (state.stardust < KIOSK_REROLL_STARDUST_COST) {
            throw new Error(
              `Insufficient Stardust for manual reroll. Required: ${KIOSK_REROLL_STARDUST_COST} ★, Available: ${state.stardust} ★`
            );
          }
          set({
            stardust: state.stardust - KIOSK_REROLL_STARDUST_COST,
            kioskStock: generateKioskStock(),
            kioskLastRefreshed: Date.now(),
          });
          return;
        }

        set({
          kioskStock: generateKioskStock(),
          kioskLastRefreshed: Date.now(),
        });
      },

      buyKioskCard: (offeringId: string): CardInstance => {
        const state = get();
        if (state.kioskStock.length === 0) {
          state.checkAndRotateKiosk();
        }

        const currentStock = get().kioskStock;
        const offeringIndex = currentStock.findIndex((o) => o.id === offeringId);
        if (offeringIndex === -1) {
          throw new Error(`Offering ${offeringId} not found in Singles Kiosk`);
        }

        const offering = currentStock[offeringIndex];
        if (offering.isPurchased) {
          throw new Error("This card has already been purchased from today's kiosk stock.");
        }

        // Calculate effective price taking into account Maruo's Kiosk discount
        const activeBuff = resolveActiveSupportBuff(state.supportSlot);
        const kioskDiscount = activeBuff?.effects.kioskDiscount ?? 0;
        const effectivePrice =
          kioskDiscount > 0
            ? Math.max(1, Math.round(offering.priceYen * (1.0 - Math.min(0.9, kioskDiscount))))
            : offering.priceYen;

        if (state.yen < effectivePrice) {
          throw new Error(
            `Insufficient Yen. Required: ${effectivePrice.toLocaleString()} ¥, Available: ${state.yen.toLocaleString()} ¥`
          );
        }

        const cardDef = CARD_MAP[offering.cardDefId];
        if (!cardDef) {
          throw new Error(`Card definition ${offering.cardDefId} not found`);
        }

        const newCard: CardInstance = {
          id:
            typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `kiosk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          cardDefId: cardDef.id,
          characterId: cardDef.characterId,
          rarity: offering.rarity,
          finish: offering.finish,
          obtainedAt: Date.now(),
          imageUrl: cardDef.imageUrl,
          name: cardDef.name,
          title: cardDef.title,
          cardNumber: cardDef.cardNumber,
          forceFit: cardDef.forceFit,
        };

        const updatedStock = [...currentStock];
        updatedStock[offeringIndex] = {
          ...offering,
          isPurchased: true,
        };

        // STAGE 2: Update Card-Dex with kiosk purchased card
        const updatedDex = { ...(state.cardDex ?? createInitialCardDex()) };
        const curDexEntry = updatedDex[newCard.cardDefId] ?? {
          cardDefId: cardDef.id,
          cardNumber: cardDef.cardNumber,
          characterId: cardDef.characterId,
          characterRole: cardDef.characterRole,
          rarity: cardDef.rarity,
          discovered: false,
          timesObtained: 0,
        };
        const highestFinish = isFinishHigher(newCard.finish, curDexEntry.highestFinish)
          ? newCard.finish
          : curDexEntry.highestFinish ?? newCard.finish;
        updatedDex[newCard.cardDefId] = {
          ...curDexEntry,
          discovered: true,
          discoveredAt: curDexEntry.discoveredAt ?? newCard.obtainedAt,
          highestFinish,
          timesObtained: (curDexEntry.timesObtained ?? 0) + 1,
        };

        set({
          yen: state.yen - effectivePrice,
          inventory: [...state.inventory, newCard],
          kioskStock: updatedStock,
          cardDex: updatedDex,
        });

        return newCard;
      },

      checkAndRotateKiosk: (): void => {
        const { kioskStock, kioskLastRefreshed } = get();
        const now = Date.now();
        if (kioskStock.length === 0 || now - kioskLastRefreshed >= KIOSK_ROTATION_INTERVAL_MS) {
          set({
            kioskStock: generateKioskStock(),
            kioskLastRefreshed: now,
          });
        }
      },

      // ==========================================
      // STAGE 2 ACTIONS: 5-SLOT VITRINE & DEX
      // ==========================================

      slotShowcaseCard: (slotIndex: number, cardInstanceId: string | null): void => {
        const state = get();
        if (slotIndex < 0 || slotIndex > 4) {
          throw new Error(`Invalid showcase slot index: ${slotIndex}. Must be 0 to 4.`);
        }

        const currentSlots = state.showcaseSlots ?? DEFAULT_SHOWCASE_SLOTS;

        // Case 1: Unslotting
        if (cardInstanceId === null) {
          const updatedSlots = currentSlots.map((s) =>
            s.slotIndex === slotIndex ? { ...s, cardInstanceId: null } : s
          );
          set({ showcaseSlots: updatedSlots });
          return;
        }

        // Case 2: Slotting card from inventory
        const card = state.inventory.find((c) => c.id === cardInstanceId);
        if (!card) {
          throw new Error(`Card not found in inventory: ${cardInstanceId}`);
        }

        // If card was already mounted in another showcase pedestal, unslot it there
        const updatedSlots = currentSlots.map((s) => {
          if (s.slotIndex === slotIndex) {
            return { ...s, cardInstanceId };
          }
          if (s.cardInstanceId === cardInstanceId) {
            return { ...s, cardInstanceId: null };
          }
          return s;
        });

        // If this card was mounted on the Support Altar, unslot it from the altar
        const updatedSupportSlot = state.supportSlot?.id === cardInstanceId ? null : state.supportSlot;

        set({
          showcaseSlots: updatedSlots,
          supportSlot: updatedSupportSlot,
        });
      },

      slotSupportCard: (cardInstanceId: string | null): void => {
        const state = get();

        // Case 1: Unslotting
        if (cardInstanceId === null) {
          set({ supportSlot: null });
          return;
        }

        // Case 2: Slotting card from inventory
        const card = state.inventory.find((c) => c.id === cardInstanceId);
        if (!card) {
          throw new Error(`Card not found in inventory: ${cardInstanceId}`);
        }

        const cardDef = CARD_MAP[card.cardDefId];
        if (!cardDef || cardDef.characterRole !== 'support') {
          throw new Error(`Only Support character cards can be mounted on the Support Altar.`);
        }

        // If card was already mounted in a showcase pedestal, unmount it there
        const currentShowcaseSlots = state.showcaseSlots ?? DEFAULT_SHOWCASE_SLOTS;
        const updatedShowcaseSlots = currentShowcaseSlots.map((s) =>
          s.cardInstanceId === cardInstanceId ? { ...s, cardInstanceId: null } : s
        );

        set({
          supportSlot: card,
          showcaseSlots: updatedShowcaseSlots,
        });
      },

      claimShowcaseRevenue: (): number => {
        const state = get();
        const report = state.getShowcaseSynergyReport();

        const now = Date.now();
        const lastClaimed = state.showcaseLastClaimedTimestamp ?? now;
        const elapsedMinutes = (now - lastClaimed) / 60000;
        const earnedYen = calculateShowcaseIdleEarnings(report, elapsedMinutes, 12);

        set({
          yen: state.yen + earnedYen,
          showcaseLastClaimedTimestamp: now,
          stats: {
            ...state.stats,
            totalYenEarned: state.stats.totalYenEarned + earnedYen,
          },
        });

        return earnedYen;
      },

      getShowcaseSynergyReport: (): ShowcaseSynergyReport => {
        const { showcaseSlots, inventory, supportSlot } = get();
        const cardMap = new Map<string, CardInstance>();
        for (const card of inventory) {
          cardMap.set(card.id, card);
        }
        return analyzeShowcaseSlots(showcaseSlots ?? DEFAULT_SHOWCASE_SLOTS, cardMap, supportSlot);
      },

      recordCardDiscovery: (card: CardInstance): void => {
        const state = get();
        const cardDef = CARD_MAP[card.cardDefId];
        if (!cardDef) return;

        const currentDex = { ...(state.cardDex ?? createInitialCardDex()) };
        const existing = currentDex[card.cardDefId] ?? {
          cardDefId: cardDef.id,
          cardNumber: cardDef.cardNumber,
          characterId: cardDef.characterId,
          characterRole: cardDef.characterRole,
          rarity: cardDef.rarity,
          discovered: false,
          timesObtained: 0,
        };

        const highestFinish = isFinishHigher(card.finish, existing.highestFinish)
          ? card.finish
          : existing.highestFinish ?? card.finish;

        const bestGrade = card.grade
          ? isGradeHigher(card.grade, existing.bestGrade)
            ? card.grade
            : existing.bestGrade
          : existing.bestGrade;

        currentDex[card.cardDefId] = {
          ...existing,
          discovered: true,
          discoveredAt: existing.discoveredAt ?? card.obtainedAt ?? Date.now(),
          highestFinish,
          bestGrade,
          timesObtained: (existing.timesObtained ?? 0) + 1,
        };

        set({ cardDex: currentDex });
      },

      syncCardDex: (): void => {
        const state = get();
        const synchronized = syncDexWithInventory(state.cardDex, state.inventory);
        set({ cardDex: synchronized });
      },

      markPatchNotesSeen: (version?: string): void => {
        set({ lastSeenPatchVersion: version ?? CURRENT_PATCH_VERSION });
      },

      resetSave: (): void => {
        set({
          ...INITIAL_STATE,
          lastActiveTimestamp: Date.now(),
          showcaseLastClaimedTimestamp: Date.now(),
          kioskStock: generateKioskStock(),
          kioskLastRefreshed: Date.now(),
          cardDex: createInitialCardDex(),
          showcaseSlots: DEFAULT_SHOWCASE_SLOTS,
          supportSlot: null,
        });
      },
    }),
    {
      name: 'tqq-vault-save',
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (state.lastSeenPatchVersion === undefined) {
            state.lastSeenPatchVersion = '';
          }
          if (!state.showcaseSlots || state.showcaseSlots.length !== 5) {
            state.showcaseSlots = DEFAULT_SHOWCASE_SLOTS;
          }
          if (state.supportSlot) {
            const currentInInv = (state.inventory || []).find((c) => c.id === state.supportSlot?.id);
            state.supportSlot = currentInInv ?? null;
          } else {
            state.supportSlot = null;
          }
          if (!state.cardDex) {
            state.cardDex = syncDexWithInventory(createInitialCardDex(), state.inventory || []);
          } else {
            state.cardDex = syncDexWithInventory(state.cardDex, state.inventory || []);
          }
          if (!state.showcaseLastClaimedTimestamp) {
            state.showcaseLastClaimedTimestamp = Date.now();
          }
        }
      },
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage;
        }
        // Safe in-memory storage fallback for Node.js / testing
        const memoryStore = new Map<string, string>();
        return {
          getItem: (name: string) => memoryStore.get(name) ?? null,
          setItem: (name: string, value: string) => memoryStore.set(name, value),
          removeItem: (name: string) => memoryStore.delete(name),
        };
      }),
    }
  )
);
