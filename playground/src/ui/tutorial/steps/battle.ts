// The introduction of the Battle tab. The lobby part is a fixed list. The table part follows how the battle goes: a lesson shows up
// when the battle is at that point (the first Character, the Bench, "Ready", the free Heart, the attack), and the whole thing
// ends with the player's first attack. The player may be first or second, so nothing here counts on a certain order.

import { legalActions } from '../../../battle/legal';
import { freeHearts } from '../../../battle/rules';
import type { BattleAction, BattleState, PlayerState } from '../../../battle/types';
import { text } from '../../text';
import type { TabScript, TutorialContext } from '../types';
import { CLICK, NEXT, spot, when } from './helpers';

const words = text.tutorial.battle;

const HEART_PICKED = `${spot('free-heart')}[aria-pressed="true"]`;

/** The battle on the table, while it is being played. */
function game(context: TutorialContext): BattleState | null {
  return context.battle.status === 'playing' ? context.battle.battle : null;
}

function mine(context: TutorialContext): PlayerState | null {
  return game(context)?.players[0] ?? null;
}

function actions(context: TutorialContext): readonly BattleAction[] {
  const battle = game(context);
  return battle === null ? [] : legalActions(battle, 0);
}

function has(context: TutorialContext, type: BattleAction['type']): boolean {
  return actions(context).some((action) => action.type === type);
}

function inSetup(context: TutorialContext): boolean {
  return game(context)?.phase === 'setup';
}

/** It is the player's turn and nothing is being asked. */
function myTurn(context: TutorialContext): boolean {
  const battle = game(context);
  return battle !== null && battle.phase === 'main' && battle.current === 0 && battle.pending === null && !context.battle.waiting;
}

function heartsGiven(context: TutorialContext): boolean {
  const battle = game(context);
  return battle !== null && battle.players[0].heartsGiven >= freeHearts(battle, 0);
}

/** The free Heart can still be given in this turn. */
function heartDue(context: TutorialContext): boolean {
  return myTurn(context) && !heartsGiven(context) && has(context, 'give-heart');
}

function canAttack(context: TutorialContext): boolean {
  return myTurn(context) && has(context, 'attack');
}

/** Nothing is left to do but to end the turn. */
function mustEnd(context: TutorialContext): boolean {
  return myTurn(context) && !heartDue(context) && !canAttack(context) && has(context, 'end-turn');
}

/** The player has to pick one of their Characters (to bring to the front after a knock-out). */
function mustChoose(context: TutorialContext): boolean {
  const battle = game(context);
  return battle !== null && battle.pending !== null && battle.pending.player === 0 && battle.pending.prompt.kind === 'figure';
}

/** Battle: the lobby (watch the animation, pick a rival and a deck), then the first battle until the first attack. */
export const battleScript: TabScript = {
  home: '/battle',
  // The lessons depend on how the battle goes, so there is no count.
  counter: false,
  steps: [
    { id: 'battle.intro', ...words.intro, target: null, goal: NEXT, applies: (context) => context.battle.status === 'idle' },
    { id: 'battle.watch', ...words.watch, target: spot('battle-watch'), goal: CLICK, applies: (context) => context.battle.status === 'idle' },
    {
      id: 'battle.watching',
      ...words.watching,
      // The animation must stay usable, so the page is not shut: the close button of the window is lit up, for when the player is done.
      target: spot('dialog-close'),
      dim: false,
      side: 'below',
      goal: when((context) => context.seen(spot('explainer')) && !context.has(spot('explainer'))),
    },
    { id: 'battle.rival', ...words.rival, target: spot('battle-rival'), goal: CLICK, applies: (context) => context.battle.status === 'idle' },
    { id: 'battle.deck', ...words.deck, target: spot('battle-deck'), goal: CLICK, applies: (context) => context.battle.status === 'idle' },
    // Done while a battle is on; if the player leaves the table, it is the step to take again.
    { id: 'battle.start', ...words.start, target: spot('battle-start'), goal: when((context) => context.battle.status !== 'idle', false) },

    { id: 'battle.table', ...words.table, target: spot('battle-table'), goal: NEXT, applies: (context) => game(context) !== null },
    {
      id: 'battle.active',
      ...words.active,
      target: spot('hand'),
      goal: when((context) => mine(context)?.active != null),
      applies: (context) => inSetup(context) && has(context, 'setup-place'),
    },
    {
      id: 'battle.bench',
      ...words.bench,
      target: spot('hand'),
      goal: when((context) => (mine(context)?.bench.length ?? 0) > 0),
      applies: (context) => inSetup(context) && mine(context)?.active != null && has(context, 'setup-place'),
    },
    {
      id: 'battle.ready',
      ...words.ready,
      target: spot('battle-ready'),
      goal: when((context) => mine(context)?.setupDone === true),
      applies: (context) => inSetup(context) && has(context, 'setup-done'),
    },
    { id: 'battle.turn', ...words.turn, target: spot('battle-steps'), goal: NEXT, applies: myTurn },
    // The free Heart, and the Character that gets it. Asked again in every turn until the first attack.
    {
      id: 'battle.heart',
      ...words.heart,
      target: spot('free-heart'),
      goal: when((context) => heartsGiven(context) || context.has(HEART_PICKED), false),
      applies: heartDue,
    },
    {
      id: 'battle.heart-give',
      ...words.heartGive,
      target: spot('pick'),
      goal: when((context) => heartsGiven(context), false),
      applies: (context) => heartDue(context) && context.has(HEART_PICKED),
    },
    {
      id: 'battle.attack',
      ...words.attack,
      target: spot('battle-moves'),
      // The attack is over before the screen can tell (the turn is the rival's by then), so the host noted it.
      goal: when((context) => context.happened.has('attacked')),
      applies: (context) => canAttack(context) && !heartDue(context),
    },
    {
      id: 'battle.end-turn',
      ...words.endTurn,
      target: spot('battle-end'),
      goal: when((context) => !myTurn(context), false),
      applies: mustEnd,
    },
    {
      id: 'battle.choose',
      ...words.choose,
      target: spot('pick'),
      goal: when((context) => !mustChoose(context), false),
      applies: mustChoose,
    },
    // After the first attack the introduction is over: the battle goes on as any other.
    { id: 'battle.done', ...words.done, target: null, goal: NEXT, last: true, button: text.tutorial.ui.finish, applies: (context) => context.done.has('battle.attack') },
  ],
};
