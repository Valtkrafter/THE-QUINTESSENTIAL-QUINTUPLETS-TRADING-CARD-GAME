// What a battle sounds like: the events of one step of the engine, turned into sound cues. Pure, so it can be tested; the
// sounds themselves are made in `audio/battleAudio.ts`.

import type { BattleCue } from '../../audio/battleAudio';
import type { BattleEvent, PlayerIndex } from '../../battle/types';

export interface TimedCue {
  readonly cue: BattleCue;
  /** Seconds after the step. */
  readonly delay: number;
}

/** The pause between two events of one step, so the sounds do not pile up. */
const GAP = 0.13;
/** An attack needs a moment to land before what follows it (a knock-out, the next turn) is heard. */
const AFTER_ATTACK = 0.5;

/**
 * The cues for the events of one step, in order. `me` is the player at this screen: the enemy's own draws and the start of the
 * enemy's turn stay silent (the log and the pause already tell), everything that happens on the table is heard.
 */
export function cuesFor(events: readonly BattleEvent[], me: PlayerIndex = 0): TimedCue[] {
  const cues: TimedCue[] = [];
  let clock = 0;
  const add = (cue: BattleCue, gap: number = GAP): void => {
    cues.push({ cue, delay: clock });
    clock += gap;
  };
  for (const event of events) {
    switch (event.type) {
      case 'coin':
        add({ kind: 'coin' });
        break;
      case 'draw':
        if (event.player === me) {
          add({ kind: 'draw', count: event.count });
        }
        break;
      case 'play':
        add({ kind: event.how === 'evolve' ? 'evolve' : 'place' });
        break;
      case 'heart':
        add({ kind: 'heart' });
        break;
      case 'supporter':
        add({ kind: 'supporter' });
        break;
      case 'ability':
        add({ kind: 'ability' });
        break;
      case 'attack':
        add({ kind: 'attack', damage: event.damage, doubled: event.doubled, resisted: event.resisted, blocked: event.blocked }, AFTER_ATTACK);
        break;
      case 'heal':
        add({ kind: 'heal' });
        break;
      case 'retreat':
      case 'swap':
      case 'promote':
        add({ kind: 'swap' });
        break;
      case 'stun':
        add({ kind: 'stun' });
        break;
      case 'shield':
        add({ kind: 'shield' });
        break;
      case 'knock-out':
        add({ kind: 'knock-out', memories: event.memories }, AFTER_ATTACK);
        break;
      case 'turn':
        if (event.player === me) {
          add({ kind: 'your-turn' });
        }
        break;
      case 'over':
        add({ kind: 'over', result: event.winner === 'draw' ? 'draw' : event.winner === me ? 'win' : 'loss' });
        break;
      default:
        break;
    }
  }
  return cues;
}
