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
  CardInstance,
  ConsumableToolId,
  GradingResultInfo,
  OpenPackResult,
  PackId,
  PityCounters,
} from '../types/card';
import { CARD_MAP } from '../config/cardsData';
import {
  analyzeBinderPage,
  calculateAccruedIdleEarnings,
  calculateDustYield,
  calculateGradingFee,
  CONSUMABLE_TOOLS,
  PACKS_CONFIG,
  rollGrading,
  rollPackDrops,
} from '../config/economy';

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

  // Tools & Consumables
  tools: Record<ConsumableToolId, number>;
  equippedTools: ConsumableToolId[];

  // Gacha Pity & Cooldowns
  pityCounters: PityCounters;
  packCooldowns: Partial<Record<PackId, number>>;

  // Idle Timestamps
  lastActiveTimestamp: number;

  // Lifetime Stats
  stats: GameStats;

  // Actions
  openPack: (packId: PackId) => OpenPackResult;
  gradeCard: (cardInstanceId: string, toolOverrides?: ConsumableToolId[]) => GradingResultInfo;
  submitForGrading: (cardInstanceId: string, toolOverrides?: ConsumableToolId[]) => GradingResultInfo;
  dustCard: (cardInstanceId: string) => number;
  vaporizeCard: (cardInstanceId: string) => number;
  dustCards: (cardInstanceIds: string[]) => number;
  buyTool: (toolId: ConsumableToolId, quantity?: number) => void;
  equipTool: (toolId: ConsumableToolId) => void;
  unequipTool: (toolId: ConsumableToolId) => void;
  slotBinderCard: (slotIndex: number, cardInstanceId: string | null) => void;
  claimIdleRevenue: () => number;
  getBinderSynergyReport: () => BinderSynergyReport;
  getTestSheetCooldownRemaining: () => number;
  resetSave: () => void;
}

const DEFAULT_BINDER_SLOTS: BinderSlot[] = [
  { slotIndex: 0, allowedRole: 'sister', cardInstanceId: null },
  { slotIndex: 1, allowedRole: 'sister', cardInstanceId: null },
  { slotIndex: 2, allowedRole: 'sister', cardInstanceId: null },
  { slotIndex: 3, allowedRole: 'sister', cardInstanceId: null },
  { slotIndex: 4, allowedRole: 'sister', cardInstanceId: null },
  { slotIndex: 5, allowedRole: 'support', cardInstanceId: null },
];

const INITIAL_STATE = {
  yen: 1000,
  stardust: 0,
  inventory: [] as CardInstance[],
  binder: {
    id: 'binder_page_1',
    name: 'Quintessential Page 1',
    slots: DEFAULT_BINDER_SLOTS,
  } as BinderPage,
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
        const { packCooldowns, binder, inventory } = get();
        const lastOpened = packCooldowns.test_sheet;
        if (!lastOpened) return 0;

        const baseCooldown = PACKS_CONFIG.test_sheet.cooldownSeconds ?? 14400;

        // Check Takeda support (-50% cooldown)
        const cardMap = new Map<string, CardInstance>();
        for (const card of inventory) {
          cardMap.set(card.id, card);
        }
        const report = analyzeBinderPage(binder, cardMap);
        const effectiveCooldown =
          report.supportCharacterId === 'takeda'
            ? Math.round(baseCooldown * 0.5)
            : baseCooldown;

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

        // 3. Roll drops
        const rollResult = rollPackDrops(packId, state.pityCounters);

        // 4. Update state
        const newCooldowns = { ...state.packCooldowns };
        if (packConfig.cooldownSeconds && packConfig.cooldownSeconds > 0) {
          newCooldowns[packId] = Date.now();
        }

        let newBlackLabels = 0;
        for (const card of rollResult.cards) {
          if (card.grade?.isBlackLabel) newBlackLabels += 1;
        }

        set({
          yen: state.yen - packConfig.costYen,
          inventory: [...state.inventory, ...rollResult.cards],
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

        // Check Raiha support discount (-15%)
        const cardMap = new Map<string, CardInstance>();
        for (const c of state.inventory) {
          cardMap.set(c.id, c);
        }
        const report = analyzeBinderPage(state.binder, cardMap);
        const hasRaiha = report.supportCharacterId === 'raiha';

        const fee = calculateGradingFee(card, hasRaiha);
        if (state.yen < fee) {
          throw new Error(`Insufficient Yen for grading fee. Required: ${fee} ¥, Available: ${state.yen} ¥`);
        }

        // Deduct used tools
        for (const toolId of toolsToUse) {
          toolCounts[toolId] = Math.max(0, (toolCounts[toolId] ?? 0) - 1);
        }

        // Execute grading roll
        const { gradeResult, insuranceRerolled } = rollGrading(card, toolsToUse);

        // Update card instance
        const updatedCard: CardInstance = {
          ...card,
          grade: gradeResult,
        };

        const updatedInventory = [...state.inventory];
        updatedInventory[cardIndex] = updatedCard;

        set({
          yen: state.yen - fee,
          inventory: updatedInventory,
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

        // Check Maruo support bonus (+20%)
        const cardMap = new Map<string, CardInstance>();
        for (const c of state.inventory) {
          cardMap.set(c.id, c);
        }
        const report = analyzeBinderPage(state.binder, cardMap);
        const hasMaruo = report.supportCharacterId === 'maruo';

        const dustEarned = calculateDustYield(card, hasMaruo);

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

        // Check Maruo support bonus (+20%)
        const cardMap = new Map<string, CardInstance>();
        for (const c of state.inventory) {
          cardMap.set(c.id, c);
        }
        const report = analyzeBinderPage(state.binder, cardMap);
        const hasMaruo = report.supportCharacterId === 'maruo';

        let totalDustEarned = 0;
        const unslottedBinderIds = new Set<string>();

        const updatedInventory = state.inventory.filter((card) => {
          if (!idSet.has(card.id)) return true;
          // Graded cards cannot be dusted
          if (card.grade) return true;

          totalDustEarned += calculateDustYield(card, hasMaruo);
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
        const state = get();
        const report = state.getBinderSynergyReport();

        const now = Date.now();
        const elapsedMinutes = (now - state.lastActiveTimestamp) / 60000;
        const earnedYen = calculateAccruedIdleEarnings(report, elapsedMinutes, 24);

        set({
          yen: state.yen + earnedYen,
          lastActiveTimestamp: now,
          stats: {
            ...state.stats,
            totalYenEarned: state.stats.totalYenEarned + earnedYen,
          },
        });

        return earnedYen;
      },

      resetSave: (): void => {
        set({
          ...INITIAL_STATE,
          lastActiveTimestamp: Date.now(),
        });
      },
    }),
    {
      name: 'tqq-vault-save',
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
