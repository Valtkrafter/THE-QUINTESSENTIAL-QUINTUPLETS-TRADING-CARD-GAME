/**
 * TQQ Vault - Exam Showdown Combat Type Definitions
 * v2.4.0 Academic Auto-Battler & Turn-Based Combat Protocol
 */

import type { CardInstance } from './card';

export type SubjectType = 'math' | 'science' | 'history' | 'literature' | 'english';

export interface BattleStats {
  iq: number;        // Base test points generated
  charm: number;     // Critical strike chance (0.0 to 1.0)
  resolve: number;   // Max mental stamina / HP contribution
}

export interface SisterBattleCard {
  cardId: string;
  characterId: 'ichika' | 'nino' | 'miku' | 'yotsuba' | 'itsuki';
  name: string;
  rarity: string;
  finish: string;
  grade?: number;
  stats: BattleStats;
  skillUsed: boolean;
  isCharged?: boolean; // For Itsuki's 2-turn finisher
}

export interface SupportBattleCard {
  cardId: string;
  characterId: 'fuutarou' | 'raiha' | 'maruo' | 'takeda';
  name: string;
  rarity: string;
  passiveDescription: string;
  iqBuffPercent: number;
  rewardMultiplier: number;
}

export interface ExaminerReward {
  yen: number;
  stardust: number;
  item?: string;
}

export interface Examiner {
  id: string;
  name: string;
  title: string;
  portraitPath: string;
  totalResolve: number;
  basePressurePerRound: number; // Mental stress dealt per turn
  stressVariance: [number, number]; // [min, max]
  weaknessSubject: SubjectType;
  specialExamPenalty: string;
  reward?: ExaminerReward;
}

export interface BattleDebuff {
  type: 'bluff';
  roundsRemaining: number;
  reduction: number;
}

export interface BattleState {
  isActive: boolean;
  currentRound: number; // 1 to 5
  subject: SubjectType;
  testProgress: number; // 0 to 100 points (Victory target: 100)
  teamResolveMax: number;
  teamResolveCurrent: number;
  examiner: Examiner | null;
  activeDebuff: BattleDebuff | null;
  shieldActive: boolean; // For Yotsuba's nullification
  selectedSisterSlot: number | null;
  isCutinPlaying: boolean;
  battleLog: string[];
  // Stage 2 Combat State Extensions
  teamCharmBonus: number;         // Cumulative team charm bonus (e.g. Nino +25%)
  lastExaminerDamage: number;     // Recent stress damage for rebound mechanics
  isVictory: boolean;             // 100点 満点 - BESTANDEN
  isDefeated: boolean;            // F - Durchgefallen
  screenShakeTrigger: number;     // Incremented to trigger visual screen shake on crit
}

export interface BattleDeck {
  sisters: (CardInstance | null)[];
  support: CardInstance | null;
}

export interface RoundExecutionResult {
  roundNumber: number;
  subject: SubjectType;
  chosenSisterIndex: number;
  chosenSisterName: string;
  incomingDamage: number;
  shieldBlocked: boolean;
  damageTaken: number;
  healedAmount: number;
  sisterBasePoints: number;
  passiveAssistancePoints: number;
  reboundPoints: number;
  isCritical: boolean;
  totalPointsEarned: number;
  stolenPoints: number;
  testProgressBefore: number;
  testProgressAfter: number;
  teamResolveBefore: number;
  teamResolveAfter: number;
  isVictory: boolean;
  isDefeated: boolean;
  logMessages: string[];
}
