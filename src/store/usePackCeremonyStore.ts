/**
 * TQQ Vault - 3D Pack Opening Ceremony State Machine (Zustand)
 * High-performance state store managing pack inspection, tear dynamics,
 * extraction, card peeling sequences, and 3D shader uniforms.
 */

import { create } from 'zustand';
import type { CardInstance, PackId, Rarity } from '../types/card';
import type {
  CardFinishTier,
  CardShaderUniforms,
  PackOpeningPhase,
  PackOpeningSession,
} from '../types/packCeremony';
import {
  calculateCardShaderUniforms,
  calculateTearProgress,
  DEFAULT_CARD_SHADER_UNIFORMS,
  TEAR_BREACH_THRESHOLD,
} from '../utils/shaderMath';
import { mapFinishToCardFinishTier } from '../config/suspenseProfiles';
import { PACKS_CONFIG } from '../config/economy';

const RARITY_WEIGHTS: Record<Rarity, number> = {
  C: 1,
  UC: 2,
  R: 3,
  SR: 4,
  UR: 5,
  SEC: 6,
  MR: 7,
};

const FINISH_WEIGHTS: Record<CardFinishTier, number> = {
  raw: 1,
  holo: 2,
  sparkle: 3,
  rainbow: 4,
  gold_etched: 5,
  signed_sp: 6,
};

export interface PackCeremonyState {
  // Unboxing Lifecycle State
  phase: PackOpeningPhase;
  currentSession: PackOpeningSession | null;
  tearProgress: number;
  isBreached: boolean;
  activeShaderUniforms: CardShaderUniforms;

  // Store Actions
  initCeremony: (
    packId: string,
    cards: CardInstance[],
    packName?: string,
    isGodPack?: boolean
  ) => void;
  startTear: () => void;
  updateTear: (deltaX: number, packWidth: number) => void;
  breachCrimp: () => void;
  extractCardsComplete: () => void;
  peelCurrentCard: () => void;
  skipCeremony: () => void;
  setPhase: (phase: PackOpeningPhase) => void;
  setTilt: (tiltX: number, tiltY: number) => void;
  updateShaderUniforms: (uniforms: Partial<CardShaderUniforms>) => void;
  resetCeremony: () => void;
}

export const usePackCeremonyStore = create<PackCeremonyState>((set, get) => ({
  // Initial State
  phase: 'IDLE',
  currentSession: null,
  tearProgress: 0,
  isBreached: false,
  activeShaderUniforms: DEFAULT_CARD_SHADER_UNIFORMS,

  /**
   * Initializes a new pack opening ceremony session.
   * Validates card batch, determines highest rarity/finish found,
   * evaluates God Pack status, and transitions to 'INSPECTING_PACK'.
   */
  initCeremony: (packId, cards, packName, isGodPackOverride) => {
    if (!cards || cards.length === 0) {
      throw new Error('initCeremony: Card batch cannot be empty');
    }

    // Validate card objects
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      if (!card || !card.rarity) {
        throw new Error(`initCeremony: Invalid card instance at index ${i}`);
      }
    }

    // Determine highest rarity found
    let highestRarity: Rarity = 'C';
    let maxRarityWeight = 0;

    // Determine highest finish found
    let highestFinish: CardFinishTier = 'raw';
    let maxFinishWeight = 0;

    let allUltraOrHigher = true;

    for (const card of cards) {
      const rWeight = RARITY_WEIGHTS[card.rarity] ?? 1;
      if (rWeight > maxRarityWeight) {
        maxRarityWeight = rWeight;
        highestRarity = card.rarity;
      }

      if (rWeight < 5) {
        allUltraOrHigher = false;
      }

      const finishTier = mapFinishToCardFinishTier(card.finish);
      const fWeight = FINISH_WEIGHTS[finishTier] ?? 1;
      if (fWeight > maxFinishWeight) {
        maxFinishWeight = fWeight;
        highestFinish = finishTier;
      }
    }

    // Determine God Pack status
    const isGodPack =
      isGodPackOverride !== undefined
        ? isGodPackOverride
        : packId === 'god_pack' || (cards.length >= 5 && allUltraOrHigher);

    // Resolve pack display name
    const resolvedPackName =
      packName ??
      PACKS_CONFIG[packId as PackId]?.name ??
      packId;

    const newSession: PackOpeningSession = {
      packId,
      packName: resolvedPackName,
      cards,
      revealedIndices: [],
      currentCardIndex: 0,
      isGodPack,
      highestRarityFound: highestRarity,
      highestFinishFound: highestFinish,
    };

    set({
      phase: 'INSPECTING_PACK',
      currentSession: newSession,
      tearProgress: 0,
      isBreached: false,
      activeShaderUniforms: DEFAULT_CARD_SHADER_UNIFORMS,
    });
  },

  /**
   * Explicitly enters the crimp tearing interaction.
   */
  startTear: () => {
    const { phase, isBreached } = get();
    if (phase === 'INSPECTING_PACK' && !isBreached) {
      set({ phase: 'TEARING_CRIMP' });
    }
  },

  /**
   * Updates tear progress along horizontal perforation.
   * If progress reaches or exceeds TEAR_BREACH_THRESHOLD (0.82), triggers breachCrimp().
   */
  updateTear: (deltaX, packWidth) => {
    const { phase, isBreached } = get();
    if (
      isBreached ||
      phase === 'EXTRACTING_CARDS' ||
      phase === 'PEELING_REVEAL' ||
      phase === 'CEREMONY_SUMMARY'
    ) {
      return;
    }

    const progress = calculateTearProgress(deltaX, packWidth);

    if (progress >= TEAR_BREACH_THRESHOLD) {
      get().breachCrimp();
    } else {
      const nextPhase: PackOpeningPhase =
        phase === 'INSPECTING_PACK' && progress > 0 ? 'TEARING_CRIMP' : phase;
      set({
        phase: nextPhase,
        tearProgress: progress,
      });
    }
  },

  /**
   * Atomically triggers perforation breach.
   * Locks tear progress to 1.0 and transitions phase to 'EXTRACTING_CARDS'.
   */
  breachCrimp: () => {
    const { isBreached } = get();
    if (isBreached) return;

    set({
      isBreached: true,
      tearProgress: 1.0,
      phase: 'EXTRACTING_CARDS',
    });
  },

  /**
   * Called when card extraction animation completes.
   * Transitions from 'EXTRACTING_CARDS' to 'PEELING_REVEAL'.
   */
  extractCardsComplete: () => {
    const { phase } = get();
    if (phase === 'EXTRACTING_CARDS') {
      set({ phase: 'PEELING_REVEAL' });
    }
  },

  /**
   * Peels the current active card:
   * Marks current index as revealed, increments index or transitions to 'CEREMONY_SUMMARY'.
   */
  peelCurrentCard: () => {
    const { phase, currentSession } = get();
    if (!currentSession || phase !== 'PEELING_REVEAL') {
      return;
    }

    const { cards, currentCardIndex, revealedIndices } = currentSession;
    const newRevealed = revealedIndices.includes(currentCardIndex)
      ? revealedIndices
      : [...revealedIndices, currentCardIndex];

    const nextIndex = currentCardIndex + 1;
    const isCompleted = nextIndex >= cards.length;

    set({
      currentSession: {
        ...currentSession,
        revealedIndices: newRevealed,
        currentCardIndex: isCompleted ? currentCardIndex : nextIndex,
      },
      phase: isCompleted ? 'CEREMONY_SUMMARY' : 'PEELING_REVEAL',
    });
  },

  /**
   * Skips remaining unboxing sequence and immediately reveals all cards.
   */
  skipCeremony: () => {
    const { currentSession } = get();
    if (!currentSession) return;

    const allIndices = currentSession.cards.map((_, idx) => idx);

    set({
      phase: 'CEREMONY_SUMMARY',
      isBreached: true,
      tearProgress: 1.0,
      currentSession: {
        ...currentSession,
        revealedIndices: allIndices,
        currentCardIndex: Math.max(0, currentSession.cards.length - 1),
      },
    });
  },

  /**
   * Directly sets the ceremony phase (for controlled state transitions).
   */
  setPhase: (phase) => {
    set({ phase });
  },

  /**
   * Updates 3D tilt vectors and recalculates all shader uniforms.
   */
  setTilt: (tiltX, tiltY) => {
    set({
      activeShaderUniforms: calculateCardShaderUniforms(tiltX, tiltY),
    });
  },

  /**
   * Partially updates card shader uniforms.
   */
  updateShaderUniforms: (uniforms) => {
    set((state) => ({
      activeShaderUniforms: {
        ...state.activeShaderUniforms,
        ...uniforms,
      },
    }));
  },

  /**
   * Wipes ceremony state back to clean IDLE state.
   */
  resetCeremony: () => {
    set({
      phase: 'IDLE',
      currentSession: null,
      tearProgress: 0,
      isBreached: false,
      activeShaderUniforms: DEFAULT_CARD_SHADER_UNIFORMS,
    });
  },
}));
