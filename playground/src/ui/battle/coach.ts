// What the battle screen tells the player: which step of the turn they are at (the six steps of a turn and which of them can be done
// now), and the one sentence under the table that says what to do next. All of it is worked out from the battle and the list of
// allowed actions, so it can never suggest something the rules refuse, and every sentence has a test.

import { attackingAllowed } from '../../battle/legal';
import { BENCH_SIZE } from '../../battle/rules';
import type { BattleAction, BattleState, PlayerIndex } from '../../battle/types';
import { text } from '../text';
import { heartsLeft, type Mood } from './viewModel';

/** The steps of a turn, in the order they are shown. The draw happens by itself, the attack ends the turn. */
export const STEP_IDS = ['draw', 'heart', 'bench', 'evolve', 'supporter', 'attack'] as const;
export type StepId = (typeof STEP_IDS)[number];

/** `done`: nothing more to do in this step. `ready`: it can be done now. `blocked`: it cannot be done now. */
export type StepStatus = 'done' | 'ready' | 'blocked';

export interface TurnStep {
  readonly id: StepId;
  readonly status: StepStatus;
}

export interface TurnGuide {
  readonly steps: readonly TurnStep[];
  /** The step the screen points to: the first one that is ready, in the order of the turn (the attack comes last). */
  readonly next: StepId | null;
}

function has(legal: readonly BattleAction[], type: BattleAction['type']): boolean {
  return legal.some((action) => action.type === type);
}

/** The steps of the player's own turn. */
export function turnGuide(battle: BattleState, legal: readonly BattleAction[], player: PlayerIndex): TurnGuide {
  const owner = battle.players[player];
  const status = (done: boolean, ready: boolean): StepStatus => (done ? 'done' : ready ? 'ready' : 'blocked');
  const steps: TurnStep[] = [
    { id: 'draw', status: 'done' },
    { id: 'heart', status: status(heartsLeft(battle, player) === 0, has(legal, 'give-heart')) },
    { id: 'bench', status: status(false, has(legal, 'play-basic')) },
    { id: 'evolve', status: status(false, has(legal, 'evolve')) },
    { id: 'supporter', status: status(owner.supporterPlayed, has(legal, 'play-supporter')) },
    { id: 'attack', status: status(false, has(legal, 'attack')) },
  ];
  const next = steps.find((entry) => entry.status === 'ready');
  return { steps, next: next === undefined ? null : next.id };
}

/** The steps of the setup: a Character in front, more on the Bench, then "Ready". */
export const SETUP_STEP_IDS = ['active', 'bench', 'ready'] as const;
export type SetupStepId = (typeof SETUP_STEP_IDS)[number];

export interface SetupGuide {
  readonly steps: readonly { readonly id: SetupStepId; readonly status: StepStatus }[];
  readonly next: SetupStepId | null;
}

export function setupGuide(battle: BattleState, legal: readonly BattleAction[], player: PlayerIndex): SetupGuide {
  const owner = battle.players[player];
  const canPlace = legal.some((action) => action.type === 'setup-place');
  const steps: { id: SetupStepId; status: StepStatus }[] = [
    { id: 'active', status: owner.active !== null ? 'done' : canPlace ? 'ready' : 'blocked' },
    { id: 'bench', status: owner.active === null ? 'blocked' : owner.bench.length >= BENCH_SIZE ? 'done' : canPlace ? 'ready' : 'blocked' },
    { id: 'ready', status: owner.setupDone ? 'done' : has(legal, 'setup-done') ? 'ready' : 'blocked' },
  ];
  // "Ready" is the next step only when there is nothing left to put on the table.
  const place = steps.find((entry) => entry.id !== 'ready' && entry.status === 'ready');
  const next = place ?? steps.find((entry) => entry.id === 'ready' && entry.status === 'ready');
  return { steps, next: next === undefined ? null : next.id };
}

// --- The sentence under the table -----------------------------------------------------------------------------------

export interface Caption {
  readonly title: string;
  readonly text: string;
  /** `ask`: the player has something to do; `wait`: the rival is playing; `info`: nothing to do right now. */
  readonly tone: 'ask' | 'wait' | 'info';
}

export interface CaptionInput {
  readonly mood: Mood;
  /** The first name of the rival. */
  readonly rival: string;
  /** The question the engine asks the player, or null. */
  readonly promptTitle: string | null;
  readonly promptKind: 'figure' | 'card' | 'yes-no' | null;
  readonly guide: TurnGuide;
  readonly setup: SetupGuide;
  readonly heartsLeft: number;
  /** The free Heart is picked up and waits for a Character. */
  readonly heartPicked: boolean;
  /** What the chosen card of the hand does: evolve something, or it is a Supporter. */
  readonly handPick: 'evolve' | 'supporter' | null;
  /** A Character in play is chosen. */
  readonly figurePicked: boolean;
  /** The player goes first and may not attack in the first turn. */
  readonly noAttackYet: boolean;
  /** The Active Character cannot attack (stunned). */
  readonly stunned: boolean;
  /** The line the last action of the rival wrote into the log, or null. */
  readonly lastLine: string | null;
  readonly rivalReady: boolean;
  readonly benchFree: number;
}

export function captionFor(input: CaptionInput): Caption {
  const words = text.battle.coach;
  if (input.mood === 'over') {
    return { title: words.over, text: '', tone: 'info' };
  }
  if (input.promptTitle !== null) {
    return { title: input.promptTitle, text: input.promptKind === 'figure' ? words.pickGlowing : words.pickCard, tone: 'ask' };
  }
  if (input.mood === 'setup') {
    const note = input.rivalReady ? ` ${words.rivalReady(input.rival)}` : '';
    const next = input.setup.next;
    if (next === 'active') {
      return { title: words.setupTitle, text: words.setupActive + note, tone: 'ask' };
    }
    if (next === 'bench') {
      return { title: words.setupTitle, text: words.setupBench(input.benchFree) + note, tone: 'ask' };
    }
    return { title: words.setupTitle, text: words.setupReady + note, tone: 'ask' };
  }
  if (input.mood === 'their-turn') {
    return { title: words.theirTurn(input.rival), text: input.lastLine ?? words.thinking(input.rival), tone: 'wait' };
  }
  // The player's own turn.
  if (input.heartPicked) {
    return { title: words.yourTurn, text: words.heartPicked, tone: 'ask' };
  }
  if (input.handPick === 'evolve') {
    return { title: words.yourTurn, text: words.evolvePicked, tone: 'ask' };
  }
  if (input.handPick === 'supporter') {
    return { title: words.yourTurn, text: words.supporterPicked, tone: 'ask' };
  }
  if (input.figurePicked) {
    return { title: words.yourTurn, text: words.figurePicked, tone: 'ask' };
  }
  switch (input.guide.next) {
    case 'heart':
      return { title: words.yourTurn, text: words.heart, tone: 'ask' };
    case 'bench':
      return { title: words.yourTurn, text: words.bench, tone: 'ask' };
    case 'evolve':
      return { title: words.yourTurn, text: words.evolve, tone: 'ask' };
    case 'supporter':
      return { title: words.yourTurn, text: words.supporter, tone: 'ask' };
    case 'attack':
      return { title: words.yourTurn, text: words.attack, tone: 'ask' };
    default:
      break;
  }
  if (input.noAttackYet) {
    return { title: words.yourTurn, text: words.noAttackFirst, tone: 'ask' };
  }
  if (input.stunned) {
    return { title: words.yourTurn, text: words.stunned, tone: 'ask' };
  }
  const attackBlocked = input.guide.steps.find((entry) => entry.id === 'attack')?.status === 'blocked';
  return { title: words.yourTurn, text: attackBlocked && input.heartsLeft === 0 ? words.needHearts : words.nothingLeft, tone: 'ask' };
}

/** Whether the player's Active Character may attack at all this turn (it is the rules' answer, not a guess). */
export function mayAttack(battle: BattleState, player: PlayerIndex): boolean {
  return attackingAllowed(battle, player);
}
