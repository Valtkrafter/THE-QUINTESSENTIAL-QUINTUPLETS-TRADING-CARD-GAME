/**
 * TQQ Vault - Battle State Store (Zustand)
 * Manages deck construction, active exam showdown combat, turn execution,
 * and academic resolve calculations.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { CardInstance } from '../types/card';
import {
  ArtsCard,
  ArtsCardPlayResult,
  BattleDebuff,
  BattleDeck,
  BattleState,
  CombatState,
  Examiner,
  SisterBattleCard,
  SupportBattleCard,
  TurnPhase,
} from '../types/battle';
import {
  calculateTeamResolveMax,
  createSisterBattleCard,
  createSupportBattleCard,
  EXAMINERS,
  ROUND_SUBJECTS,
} from '../config/battleCalculations';
import {
  calculateExaminerPressure,
  calculateFocusRegen,
  chargeFocusEnergy,
  drawArtsCardFromDeck,
  drawStartingHand,
  executeArtsCardPlay,
  executeRoundTurn,
} from '../utils/battleEngine';
import { useGameStore } from './useGameStore';

export interface BattleStore {
  // Deck Construction
  battleDeck: BattleDeck;
  assignSisterToDeck: (slotIndex: number, card: CardInstance | null) => void;
  assignSupportToDeck: (card: CardInstance | null) => void;

  // Active Combat State
  battleState: BattleState;
  combatState: CombatState;
  sisterCards: (SisterBattleCard | null)[];
  supportCard: SupportBattleCard | null;

  // Combat Actions
  initBattle: (examinerId: string) => void;
  startRound: () => void;
  selectActiveSister: (index: number) => void;
  executeAnswer: () => void;
  executeTurn: (sisterIndex: number) => void;
  resetBattle: () => void;
  setCutinPlaying: (isPlaying: boolean) => void;
  setSelectedSisterSlot: (slotIndex: number | null) => void;
  setShieldActive: (active: boolean) => void;
  setActiveDebuff: (debuff: BattleDebuff | null) => void;

  // Stage 2 & 3: Arts-Card Combat Actions
  playArtsCard: (cardIdOrIndex: string | number) => ArtsCardPlayResult | null;
  chargeFocus: (amount?: number) => void;
  tickFocus: (deltaMs?: number) => void;
  drawArtsCard: () => ArtsCard | null;
  setCombatState: (combatState: Partial<CombatState>) => void;
  executeExaminerAttack: () => { incomingDamage: number; shieldBlocked: boolean; finalDamage: number } | null;
}

const INITIAL_DECK: BattleDeck = {
  sisters: [null, null, null, null, null],
  support: null,
};

export const INITIAL_COMBAT_STATE: CombatState = {
  focusEnergy: 50,
  maxFocus: 100,
  hand: [],
  comboCount: 0,
  currentTestPoints: 0,
  teamResolve: 0,
  examinerStressQueue: 0,
  activeShield: false,
  lastCardPlayedTimestamp: 0,
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
  turnPhase: 'awaiting_start',
  isCutinPlaying: false,
  battleLog: [],
  teamCharmBonus: 0,
  lastExaminerDamage: 0,
  isVictory: false,
  isDefeated: false,
  screenShakeTrigger: 0,
  combatState: INITIAL_COMBAT_STATE,
};

export const useBattleStore = create<BattleStore>()(
  persist(
    (set, get) => ({
      battleDeck: INITIAL_DECK,
      battleState: INITIAL_BATTLE_STATE,
      combatState: INITIAL_COMBAT_STATE,
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

        const customThumbnails: Record<string, string> = {};
        battleDeck.sisters.forEach((card) => {
          if (card && card.imageUrl) {
            customThumbnails[card.characterId] = card.imageUrl;
          }
        });
        const initialHand = drawStartingHand(sisterCards, 4, customThumbnails);

        const initialCombatState: CombatState = {
          focusEnergy: 50,
          maxFocus: 100,
          hand: initialHand,
          comboCount: 0,
          currentTestPoints: 0,
          teamResolve: teamResolveMax,
          examinerStressQueue: 0,
          activeShield: false,
          lastCardPlayedTimestamp: 0,
        };

        set({
          sisterCards,
          supportCard,
          combatState: initialCombatState,
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
            turnPhase: 'awaiting_start',
            isCutinPlaying: false,
            teamCharmBonus: 0,
            lastExaminerDamage: 0,
            isVictory: false,
            isDefeated: false,
            screenShakeTrigger: 0,
            combatState: initialCombatState,
            battleLog: [
              `Exam session started against ${examiner.name} (${examiner.title})!`,
              `Round 1 Subject: ${initialSubject.toUpperCase()}. Target: 100 Test Points.`,
              `Arts-Card Combat Engine active: Focus Energy 50/100, Hand drawn (4 cards).`,
            ],
          },
        });
      },

      startRound: () => {
        set((state) => ({
          battleState: {
            ...state.battleState,
            turnPhase: 'question_revealed',
          },
        }));
      },

      selectActiveSister: (index: number) => {
        const { sisterCards } = get();
        if (index < 0 || index >= sisterCards.length) return;
        const sister = sisterCards[index];
        if (!sister || sister.skillUsed) return;

        set((state) => ({
          battleState: {
            ...state.battleState,
            selectedSisterSlot: index,
            turnPhase: 'sister_selected',
          },
        }));
      },

      executeAnswer: () => {
        const { battleState, sisterCards, executeTurn } = get();
        if (battleState.selectedSisterSlot === null) return;
        const sisterIndex = battleState.selectedSisterSlot;
        const sister = sisterCards[sisterIndex];
        if (!sister || sister.skillUsed) return;

        set((state) => ({
          battleState: {
            ...state.battleState,
            turnPhase: 'executing_turn',
          },
        }));

        executeTurn(sisterIndex);
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

        set((state) => ({
          battleState: nextState,
          sisterCards: nextSisters,
          combatState: {
            ...state.combatState,
            currentTestPoints: nextState.testProgress,
            teamResolve: nextState.teamResolveCurrent,
            activeShield: nextState.shieldActive,
          },
        }));
      },

      resetBattle: () => {
        set({
          battleState: INITIAL_BATTLE_STATE,
          combatState: INITIAL_COMBAT_STATE,
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

      playArtsCard: (cardIdOrIndex: string | number) => {
        const { combatState, battleState, supportCard } = get();
        if (!battleState.isActive || battleState.isVictory || battleState.isDefeated) {
          return null;
        }

        const card = typeof cardIdOrIndex === 'number'
          ? combatState.hand[cardIdOrIndex]
          : combatState.hand.find((c) => c.id === cardIdOrIndex);

        if (!card) return null;
        if (combatState.focusEnergy < card.cost) return null;

        const maxResolve = battleState.teamResolveMax > 0 ? battleState.teamResolveMax : 1000;
        const { nextCombatState, result } = executeArtsCardPlay(
          combatState,
          card.id,
          battleState.examiner,
          supportCard,
          battleState.subject,
          Date.now(),
          maxResolve
        );

        // Synchronize battleState with combatState
        const updatedBattleState: BattleState = {
          ...battleState,
          testProgress: nextCombatState.currentTestPoints,
          teamResolveCurrent: nextCombatState.teamResolve,
          shieldActive: nextCombatState.activeShield,
          isVictory: result.isVictory,
          isActive: !result.isVictory && !battleState.isDefeated,
          turnPhase: result.isVictory ? 'round_complete' : battleState.turnPhase,
          combatState: nextCombatState,
          battleLog: [...battleState.battleLog, result.logMessage],
        };

        // If victory, handle rewards
        if (result.isVictory && battleState.examiner?.reward) {
          const reward = battleState.examiner.reward;
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
              updatedBattleState.battleLog.push(
                `🎁 Academic Victory Rewards Claimed: +${yenEarned.toLocaleString()} ¥ & +${stardustEarned} ★ Stardust${multiplier > 1.0 ? ` (${multiplier}x Tutor Bonus)` : ''}!`
              );
            }
          } catch {
            // Safe in test environments
          }
        }

        set({
          combatState: nextCombatState,
          battleState: updatedBattleState,
        });

        // Automatically draw replacement card after 0.5s cooldown
        if (typeof setTimeout !== 'undefined') {
          setTimeout(() => {
            const currentState = get();
            if (currentState.combatState.hand.length < 4 && currentState.battleState.isActive) {
              currentState.drawArtsCard();
            }
          }, 500);
        }

        return result;
      },

      chargeFocus: (amount: number = 25) => {
        set((state) => {
          const newFocus = chargeFocusEnergy(
            state.combatState.focusEnergy,
            state.combatState.maxFocus,
            amount
          );
          const updatedCombatState: CombatState = {
            ...state.combatState,
            focusEnergy: newFocus,
          };
          return {
            combatState: updatedCombatState,
            battleState: {
              ...state.battleState,
              combatState: updatedCombatState,
            },
          };
        });
      },

      tickFocus: (deltaMs: number = 1000) => {
        set((state) => {
          if (!state.battleState.isActive || state.battleState.isVictory || state.battleState.isDefeated) {
            return state;
          }
          const deltaSeconds = deltaMs / 1000;
          const newFocus = calculateFocusRegen(
            state.combatState.focusEnergy,
            state.combatState.maxFocus,
            deltaSeconds
          );
          const updatedCombatState: CombatState = {
            ...state.combatState,
            focusEnergy: newFocus,
          };
          return {
            combatState: updatedCombatState,
            battleState: {
              ...state.battleState,
              combatState: updatedCombatState,
            },
          };
        });
      },

      drawArtsCard: () => {
        const { combatState, sisterCards, battleDeck } = get();
        if (combatState.hand.length >= 4) return null;

        const customThumbnails: Record<string, string> = {};
        battleDeck.sisters.forEach((card) => {
          if (card && card.imageUrl) {
            customThumbnails[card.characterId] = card.imageUrl;
          }
        });

        const newCard = drawArtsCardFromDeck(sisterCards, customThumbnails);
        const updatedCombatState: CombatState = {
          ...combatState,
          hand: [...combatState.hand, newCard],
        };
        set((state) => ({
          combatState: updatedCombatState,
          battleState: {
            ...state.battleState,
            combatState: updatedCombatState,
          },
        }));
        return newCard;
      },

      setCombatState: (partial: Partial<CombatState>) => {
        set((state) => {
          const updatedCombatState: CombatState = {
            ...state.combatState,
            ...partial,
          };
          return {
            combatState: updatedCombatState,
            battleState: {
              ...state.battleState,
              combatState: updatedCombatState,
            },
          };
        });
      },

      executeExaminerAttack: () => {
        const { battleState, combatState } = get();
        if (!battleState.isActive || battleState.isVictory || battleState.isDefeated) {
          return null;
        }
        const examiner = battleState.examiner;
        if (!examiner) return null;

        const isShielded = battleState.shieldActive || combatState.activeShield;
        const pressure = calculateExaminerPressure(
          examiner,
          battleState.activeDebuff,
          isShielded
        );

        const newResolve = Math.max(0, battleState.teamResolveCurrent - pressure.finalDamage);
        const isDefeated = newResolve <= 0;
        const newShield = pressure.shieldBlocked ? false : isShielded;

        // Decrement remaining rounds for active debuff if present
        let nextDebuff: BattleDebuff | null = battleState.activeDebuff;
        if (nextDebuff) {
          const remaining = nextDebuff.roundsRemaining - 1;
          nextDebuff = remaining > 0 ? { ...nextDebuff, roundsRemaining: remaining } : null;
        }

        const nextCombatState: CombatState = {
          ...combatState,
          teamResolve: newResolve,
          activeShield: newShield,
        };

        const nextBattleState: BattleState = {
          ...battleState,
          teamResolveCurrent: newResolve,
          shieldActive: newShield,
          activeDebuff: nextDebuff,
          isDefeated,
          isActive: !isDefeated,
          screenShakeTrigger: pressure.finalDamage > 0 ? Date.now() : battleState.screenShakeTrigger,
          combatState: nextCombatState,
          lastExaminerDamage: pressure.finalDamage,
          battleLog: [
            ...battleState.battleLog,
            pressure.logMessage,
            ...(isDefeated ? [`💀 Team Resolve collapsed to 0 HP! Grade: F - DURCHGEFALLEN.`] : []),
          ],
        };

        set({
          battleState: nextBattleState,
          combatState: nextCombatState,
        });

        return {
          incomingDamage: pressure.incomingDamage,
          shieldBlocked: pressure.shieldBlocked,
          finalDamage: pressure.finalDamage,
        };
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
