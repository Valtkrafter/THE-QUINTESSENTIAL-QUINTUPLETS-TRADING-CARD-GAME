// The small numbers and words that float up from a Character when something happens to it (damage, healing, a Heart ...).
// Worked out from the events of one step, so the board only has to place them.

import type { BattleEvent, FigureRef, PlayerIndex } from '../../battle/types';
import { text } from '../text';

export type FloaterTone = 'damage' | 'heal' | 'heart' | 'info' | 'ko';

export interface Floater {
  readonly player: PlayerIndex;
  readonly ref: FigureRef;
  readonly text: string;
  readonly tone: FloaterTone;
}

const ACTIVE: FigureRef = { zone: 'active' };

function other(player: PlayerIndex): PlayerIndex {
  return player === 0 ? 1 : 0;
}

/** The floating texts for the events of one step, in the order they should appear. */
export function floatersFor(events: readonly BattleEvent[]): Floater[] {
  const floaters: Floater[] = [];
  for (const event of events) {
    switch (event.type) {
      case 'attack': {
        const target = other(event.player);
        if (event.blocked) {
          floaters.push({ player: target, ref: ACTIVE, text: 'Blocked!', tone: 'info' });
        } else if (event.damage > 0) {
          floaters.push({ player: target, ref: ACTIVE, text: `−${event.damage}`, tone: 'damage' });
        }
        if (event.doubled && !event.blocked) {
          floaters.push({ player: target, ref: ACTIVE, text: text.battle.board.weakness, tone: 'info' });
        }
        if (event.resisted && !event.blocked) {
          floaters.push({ player: target, ref: ACTIVE, text: text.battle.board.resisted, tone: 'info' });
        }
        break;
      }
      case 'heal':
        floaters.push({ player: event.player, ref: event.target, text: `+${event.amount}`, tone: 'heal' });
        break;
      case 'heart':
        floaters.push({ player: event.player, ref: event.target, text: `+${event.count} ♥`, tone: 'heart' });
        break;
      case 'hearts-removed':
        floaters.push({ player: event.player, ref: ACTIVE, text: `−${event.count} ♥`, tone: 'damage' });
        break;
      case 'stun':
        floaters.push({ player: event.player, ref: ACTIVE, text: 'Stunned', tone: 'info' });
        break;
      case 'shield':
        floaters.push({ player: event.player, ref: ACTIVE, text: 'Shield', tone: 'info' });
        break;
      case 'survive':
        floaters.push({ player: event.player, ref: ACTIVE, text: 'Held on!', tone: 'heal' });
        break;
      case 'knock-out':
        floaters.push({ player: event.player, ref: ACTIVE, text: 'Knocked out!', tone: 'ko' });
        break;
      default:
        break;
    }
  }
  return floaters;
}

/** A stable key for one place on the table. */
export function placeKey(player: PlayerIndex, ref: FigureRef): string {
  return `${player}:${ref.zone === 'active' ? 'active' : `bench${ref.index}`}`;
}
