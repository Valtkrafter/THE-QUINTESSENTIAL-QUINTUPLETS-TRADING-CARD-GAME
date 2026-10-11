// The battle as plain data. A battle is a state (`BattleState`) and a list of things players do (`BattleAction`); the
// engine in engine.ts turns one state and one action into a new state plus the events that happened. Everything is
// JSON-like and nothing in here knows about screens, so a battle can be saved, replayed, simulated and tested.

import type { Effect } from '../cards/model';
import type { RngState } from '../domain/random';

export type PlayerIndex = 0 | 1;

/** Where a figure stands. */
export type FigureRef = { readonly zone: 'active' } | { readonly zone: 'bench'; readonly index: number };

/** A Character in play: the pile of cards it is made of, and what has happened to it. */
export interface Figure {
  readonly uid: number;
  /** Card ids from the bottom (the Basic) to the top (the card that counts). */
  readonly stack: readonly string[];
  /** Hearts on it. A Heart always has the kind of its Character, so a count is enough. */
  readonly hearts: number;
  readonly damage: number;
  /** Number of the turn it came into play (0 = during setup). A card cannot evolve in the turn it arrived. */
  readonly arrivedTurn: number;
  /** Number of the turn it last evolved (0 = never). */
  readonly evolvedTurn: number;
  /** Number of the turn its once-per-turn ability was last used (0 = never). */
  readonly abilityTurn: number;
  /** It cannot attack during the turn with this number (0 = it is not stunned). */
  readonly stunTurn: number;
}

export interface PlayerState {
  /** Index 0 is the top card. */
  readonly deck: readonly string[];
  readonly hand: readonly string[];
  readonly discard: readonly string[];
  readonly active: Figure | null;
  readonly bench: readonly Figure[];
  readonly memories: number;
  /** How many turns this player has started (1 during the first turn). */
  readonly turnsTaken: number;
  /** Free Hearts given so far this turn; see `freeHearts` in rules.ts for how many a turn allows. */
  readonly heartsGiven: number;
  readonly supporterPlayed: boolean;
  readonly retreated: boolean;
  /** During the turn with this number the Active Character takes no damage from attacks (0 = no shield). */
  readonly shieldTurn: number;
  readonly setupDone: boolean;
}

export type BattlePhase = 'setup' | 'main' | 'over';
export type EndReason = 'memories' | 'no-fighters' | 'deck-out' | 'turn-limit' | 'concede';

/** Why the engine asks a player to choose a Character. */
export type FigureReason = 'heal' | 'give-heart' | 'swap-in' | 'send-to-front' | 'promote';
export type CardReason = 'take-from-top' | 'find-basic' | 'find-supporter';

export type ChoicePrompt =
  | { readonly kind: 'figure'; readonly reason: FigureReason; readonly owner: PlayerIndex; readonly options: readonly FigureRef[]; readonly optional: boolean }
  | { readonly kind: 'card'; readonly reason: CardReason; readonly options: readonly { readonly index: number; readonly cardId: string }[]; readonly optional: boolean }
  | { readonly kind: 'yes-no'; readonly reason: 'move-to-bottom'; readonly cardId: string };

/** Who is using an effect, and why it is running. */
export interface EffectContext {
  readonly player: PlayerIndex;
  readonly origin: 'move' | 'ability' | 'supporter';
  /** The Character that uses the move or the ability (null for a Supporter). */
  readonly figureUid: number | null;
}

/** What the engine does with the answer, and what runs after it. */
export type PendingStep =
  | { readonly kind: 'effect'; readonly effect: Effect; readonly remaining: readonly Effect[]; readonly context: EffectContext; readonly done: number }
  | { readonly kind: 'promote' };

export interface PendingChoice {
  /** The player who has to answer. */
  readonly player: PlayerIndex;
  readonly prompt: ChoicePrompt;
  readonly step: PendingStep;
}

export interface BattleState {
  readonly phase: BattlePhase;
  /** 0 during setup, then 1, 2, 3 ... (every turn of either player counts). */
  readonly turn: number;
  /** Whose turn it is (during setup: the player who goes first). */
  readonly current: PlayerIndex;
  readonly first: PlayerIndex;
  readonly players: readonly [PlayerState, PlayerState];
  readonly pending: PendingChoice | null;
  /** The player whose attack is being finished (effects of the move may ask for choices first). */
  readonly attacking: PlayerIndex | null;
  readonly winner: PlayerIndex | 'draw' | null;
  readonly endReason: EndReason | null;
  readonly rng: RngState;
  readonly nextUid: number;
  /** How often each player had to draw a new first hand because it held no Basic. */
  readonly mulligans: readonly [number, number];
}

export type BattleAction =
  | { readonly type: 'setup-place'; readonly player: PlayerIndex; readonly handIndex: number; readonly to: 'active' | 'bench' }
  | { readonly type: 'setup-done'; readonly player: PlayerIndex }
  | { readonly type: 'play-basic'; readonly handIndex: number }
  | { readonly type: 'evolve'; readonly handIndex: number; readonly target: FigureRef }
  | { readonly type: 'give-heart'; readonly target: FigureRef }
  | { readonly type: 'play-supporter'; readonly handIndex: number }
  | { readonly type: 'use-ability'; readonly figure: FigureRef }
  | { readonly type: 'retreat'; readonly benchIndex: number }
  | { readonly type: 'attack'; readonly moveIndex: number }
  | { readonly type: 'end-turn' }
  /** The answer to the pending choice: the option number, or -1 to skip an optional choice (yes-no: 0 yes, 1 no). */
  | { readonly type: 'choose'; readonly option: number }
  | { readonly type: 'concede'; readonly player: PlayerIndex };

export type BattleEvent =
  | { readonly type: 'coin'; readonly heads: boolean }
  | { readonly type: 'mulligan'; readonly player: PlayerIndex }
  | { readonly type: 'turn'; readonly turn: number; readonly player: PlayerIndex }
  | { readonly type: 'draw'; readonly player: PlayerIndex; readonly count: number; readonly cardIds: readonly string[] }
  | { readonly type: 'play'; readonly player: PlayerIndex; readonly cardId: string; readonly target: FigureRef; readonly how: 'setup' | 'bench' | 'evolve' }
  | { readonly type: 'heart'; readonly player: PlayerIndex; readonly target: FigureRef; readonly count: number }
  | { readonly type: 'supporter'; readonly player: PlayerIndex; readonly cardId: string }
  | { readonly type: 'ability'; readonly player: PlayerIndex; readonly cardId: string; readonly name: string }
  | {
      readonly type: 'attack';
      readonly player: PlayerIndex;
      readonly cardId: string;
      readonly move: string;
      /** The damage that was really dealt after weakness, resistance and shields. */
      readonly damage: number;
      readonly doubled: boolean;
      readonly resisted: boolean;
      readonly reduced: boolean;
      readonly blocked: boolean;
    }
  | { readonly type: 'heal'; readonly player: PlayerIndex; readonly target: FigureRef; readonly amount: number }
  | { readonly type: 'hearts-removed'; readonly player: PlayerIndex; readonly count: number }
  | { readonly type: 'retreat'; readonly player: PlayerIndex; readonly cost: number }
  | { readonly type: 'swap'; readonly player: PlayerIndex; readonly toActive: string }
  | { readonly type: 'stun'; readonly player: PlayerIndex }
  | { readonly type: 'shield'; readonly player: PlayerIndex }
  | { readonly type: 'shuffle'; readonly player: PlayerIndex }
  | { readonly type: 'survive'; readonly player: PlayerIndex; readonly cardId: string }
  | { readonly type: 'knock-out'; readonly player: PlayerIndex; readonly cardId: string; readonly memories: number }
  | { readonly type: 'promote'; readonly player: PlayerIndex; readonly cardId: string }
  | { readonly type: 'over'; readonly winner: PlayerIndex | 'draw'; readonly reason: EndReason };

/** What `step` gives back: the new state and what happened, or the reason the action was refused (the state stays). */
export type StepResult =
  | { readonly ok: true; readonly state: BattleState; readonly events: readonly BattleEvent[] }
  | { readonly ok: false; readonly state: BattleState; readonly events: readonly []; readonly error: string };
