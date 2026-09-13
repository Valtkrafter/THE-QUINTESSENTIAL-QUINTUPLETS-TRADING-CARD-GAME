/**
 * TQQ Vault - Battle State Store (Zustand)
 * Manages deck construction, active exam showdown combat, turn execution,
 * and academic resolve calculations.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { CardInstance } from '../types/card';
import {
  BattleDebuff,
  BattleDeck,
  BattleState,
  Examiner,
  SisterBattleCard,
  SupportBattleCard,
} from '../types/battle';
import {
  calculateTeamResolveMax,
  createSisterBattleCard,
  createSupportBattleCard,
  EXAMINERS,
  ROUND_SUBJECTS,
} from '../config/battleCalculations';
import { executeRoundTurn } from '../utils/battleEngine';
import { useGameStore } from './useGameStore';

export interface BattleStore {
  // Deck Construction
  battleDeck: BattleDeck;
  assignSisterToDeck: (slotIndex: number, card: CardInstance | null) => void;
  assignSupportToDeck: (card: CardInstance | null) => void;

  // Active Combat State
  battleState: BattleState;
  sisterCards: (SisterBattleCard | null)[];
  supportCard: SupportBattleCard | null;

  // Combat Actions
  initBattle: (examinerId: string) => void;
  executeTurn: (sisterIndex: number) => void;
  resetBattle: () => void;
  setCutinPlaying: (isPlaying: boolean) => void;
  setSelectedSisterSlot: (slotIndex: number | null) => void;
  setShieldActive: (active: boolean) => void;
  setActiveDebuff: (debuff: BattleDebuff | null) => void;
}

const INITIAL_DECK: BattleDeck = {
  sisters: [null, null, null, null, null],
  support: null,
};

const INITIAL_BATTLE_STATE: BattleState = {
  isActive: false,
  currentRound: 1,
  subject: 'math',
  testProgress: 0,
  teamResolveMax: 0,
  teamResolveCurrent: 0,
  examiner: null,
  activeDebuff: null,
  shieldActive: false,
  selectedSisterSlot: null,
  isCutinPlaying: false,
  battleLog: [],
  teamCharmBonus: 0,
  lastExaminerDamage: 0,
  isVictory: false,
  isDefeated: false,
  screenShakeTrigger: 0,
};

export const useBattleStore = create<BattleStore>()(
  persist(
    (set, get) => ({
      battleDeck: INITIAL_DECK,
      battleState: INITIAL_BATTLE_STATE,
      sisterCards: [null, null, null, null, null],
      supportCard: null,

      assignSisterToDeck: (slotIndex: number, card: CardInstance | null) => {
        if (slotIndex < 0 || slotIndex >= 5) return;

        set((state) => {
          const newSisters = [...state.battleDeck.sisters];

          // If placing a card that is already in another slot, clear that slot first
          if (card) {
            for (let i = 0; i < newSisters.length; i++) {
              if (newSisters[i]?.id === card.id) {
                newSisters[i] = null;
              }
            }
          }

          newSisters[slotIndex] = card;
          return {
            battleDeck: {
              ...state.battleDeck,
              sisters: newSisters,
            },
          };
        });
      },

      assignSupportToDeck: (card: CardInstance | null) => {
        set((state) => ({
          battleDeck: {
            ...state.battleDeck,
            support: card,
          },
        }));
      },

      initBattle: (examinerId: string) => {
        const { battleDeck } = get();
        const examiner: Examiner =
          EXAMINERS.find((e) => e.id === examinerId) || EXAMINERS[0];

        // Resolve Support Battle Card
        const supportCard: SupportBattleCard | null = battleDeck.support
          ? createSupportBattleCard(battleDeck.support)
          : null;

        const tutorIqBuff = supportCard ? supportCard.iqBuffPercent : 0;

        // Resolve Sister Battle Cards
        const sisterCards: (SisterBattleCard | null)[] = battleDeck.sisters.map((card) =>
          card ? createSisterBattleCard(card, tutorIqBuff) : null
        );

        // Derive Team Resolve
        const calculatedMaxResolve = calculateTeamResolveMax(sisterCards);
        // Fallback to baseline 600 if no cards slotted
        const teamResolveMax = calculatedMaxResolve > 0 ? calculatedMaxResolve : 600;

        const initialRound = 1;
        const initialSubject = ROUND_SUBJECTS[initialRound] || 'math';

        set({
          sisterCards,
          supportCard,
          battleState: {
            isActive: true,
            currentRound: initialRound,
            subject: initialSubject,
            testProgress: 0,
            teamResolveMax,
            teamResolveCurrent: teamResolveMax,
            examiner,
            activeDebuff: null,
            shieldActive: false,
            selectedSisterSlot: null,
            isCutinPlaying: false,
            teamCharmBonus: 0,
            lastExaminerDamage: 0,
            isVictory: false,
            isDefeated: false,
            screenShakeTrigger: 0,
            battleLog: [
              `Exam session started against ${examiner.name} (${examiner.title})!`,
              `Round 1 Subject: ${initialSubject.toUpperCase()}. Target: 100 Test Points.`,
            ],
          },
        });
      },

      executeTurn: (sisterIndex: number) => {
        const { battleState, sisterCards, supportCard } = get();
        if (!battleState.isActive || !battleState.examiner) return;
        if (sisterIndex < 0 || sisterIndex >= sisterCards.length) return;

        const sister = sisterCards[sisterIndex];
        if (!sister) return;

        const { nextState, nextSisters } = executeRoundTurn(
          battleState,
          sisterCards,
          supportCard,
          sisterIndex
        );

        // Reward disbursement on Victory
        if (nextState.isVictory && nextState.examiner?.reward) {
          const reward = nextState.examiner.reward;
          const multiplier = supportCard?.rewardMultiplier ?? 1.0;
          const yenEarned = Math.round(reward.yen * multiplier);
          const stardustEarned = Math.round(reward.stardust * multiplier);

          try {
            const gameStore = useGameStore.getState();
            if (gameStore && typeof gameStore.yen === 'number') {
              useGameStore.setState((s) => ({
                yen: s.yen + yenEarned,
                stardust: s.stardust + stardustEarned,
                stats: {
                  ...s.stats,
                  totalYenEarned: s.stats.totalYenEarned + yenEarned,
                  totalStardustEarned: s.stats.totalStardustEarned + stardustEarned,
                },
              }));
              nextState.battleLog.push(
                `🎁 Academic Victory Rewards Claimed: +${yenEarned.toLocaleString()} ¥ & +${stardustEarned} ★ Stardust${multiplier > 1.0 ? ` (${multiplier}x Tutor Bonus)` : ''}!`
              );
            }
          } catch {
            // Safe in tests / decoupled environments
          }
        }

        set({
          battleState: nextState,
          sisterCards: nextSisters,
        });
      },

      resetBattle: () => {
        set({
          battleState: INITIAL_BATTLE_STATE,
          sisterCards: [null, null, null, null, null],
          supportCard: null,
        });
      },

      setCutinPlaying: (isPlaying: boolean) => {
        set((state) => ({
          battleState: {
            ...state.battleState,
            isCutinPlaying: isPlaying,
          },
        }));
      },

      setSelectedSisterSlot: (slotIndex: number | null) => {
        set((state) => ({
          battleState: {
            ...state.battleState,
            selectedSisterSlot: slotIndex,
          },
        }));
      },

      setShieldActive: (active: boolean) => {
        set((state) => ({
          battleState: {
            ...state.battleState,
            shieldActive: active,
          },
        }));
      },

      setActiveDebuff: (debuff: BattleDebuff | null) => {
        set((state) => ({
          battleState: {
            ...state.battleState,
            activeDebuff: debuff,
          },
        }));
      },
    }),
    {
      name: 'tqq_battle_deck_storage',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage;
        }
        const memoryStore = new Map<string, string>();
        return {
          getItem: (name: string) => memoryStore.get(name) ?? null,
          setItem: (name: string, value: string) => memoryStore.set(name, value),
          removeItem: (name: string) => memoryStore.delete(name),
        };
      }),
      partialize: (state) => ({
        battleDeck: state.battleDeck,
      }),
    }
  )
);
