// Turns battle events into plain sentences: the log of the battle screen, and a way to read a battle in the tests.

import { cardById } from '../cards/catalog';
import { MEMORIES_TO_WIN, other } from './rules';
import type { BattleEvent, FigureRef, PlayerIndex } from './types';

/** How the sentences name the two sides, e.g. "You" and "Raiha". */
export interface Names {
  readonly subject: (player: PlayerIndex) => string;
  /** "your" / "Raiha's" */
  readonly possessive: (player: PlayerIndex) => string;
}

export const YOU_AND_THEM: Names = {
  subject: (player) => (player === 0 ? 'You' : 'The opponent'),
  possessive: (player) => (player === 0 ? 'your' : "the opponent's"),
};

function cardName(cardId: string): string {
  const card = cardById(cardId);
  return card === undefined ? 'a card' : `${card.name.en} (${card.title})`;
}

function shortName(cardId: string): string {
  return cardById(cardId)?.name.en ?? 'a card';
}

function place(target: FigureRef): string {
  return target.zone === 'active' ? 'the Active Character' : `Bench slot ${target.index + 1}`;
}

function plural(count: number, word: string): string {
  if (word === 'Memory') {
    return count === 1 ? '1 Memory' : `${count} Memories`;
  }
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** One sentence for an event, or null when the screen has nothing to say about it. */
export function describeEvent(event: BattleEvent, names: Names = YOU_AND_THEM): string | null {
  switch (event.type) {
    case 'coin':
      return `Coin flip: ${event.heads ? 'heads' : 'tails'}.`;
    case 'mulligan':
      return `${names.subject(event.player)} had no Basic Character and drew a new hand.`;
    case 'turn':
      return `Turn ${event.turn}: ${names.subject(event.player)}.`;
    case 'draw':
      return `${names.subject(event.player)} drew ${plural(event.count, 'card')}.`;
    case 'play': {
      const who = names.subject(event.player);
      if (event.how === 'evolve') {
        return `${who} evolved ${place(event.target)} into ${cardName(event.cardId)}.`;
      }
      return `${who} put ${cardName(event.cardId)} ${event.how === 'setup' && event.target.zone === 'active' ? 'in front' : 'on the Bench'}.`;
    }
    case 'heart':
      return `${names.subject(event.player)} gave ${plural(event.count, 'Heart')} to ${place(event.target)}.`;
    case 'supporter':
      return `${names.subject(event.player)} played ${cardName(event.cardId)}.`;
    case 'ability':
      return `${names.subject(event.player)} used ${event.name}.`;
    case 'attack': {
      const notes = [event.doubled ? 'Weakness!' : '', event.resisted ? 'Resisted.' : '', event.reduced ? 'Reduced by an ability.' : '', event.blocked ? 'Blocked!' : '']
        .filter((note) => note !== '')
        .join(' ');
      return `${shortName(event.cardId)} used ${event.move}: ${event.damage} damage. ${notes}`.trim();
    }
    case 'heal':
      return `${names.subject(event.player)} healed ${event.amount} HP on ${place(event.target)}.`;
    case 'hearts-removed':
      return `${plural(event.count, 'Heart')} removed from ${names.possessive(event.player)} Active Character.`;
    case 'retreat':
      return `${names.subject(event.player)} retreated for ${plural(event.cost, 'Heart')}.`;
    case 'swap':
      return `${shortName(event.toActive)} came to the front.`;
    case 'stun':
      return `${capitalize(names.possessive(event.player))} Active Character can't attack next turn.`;
    case 'shield':
      return `${capitalize(names.possessive(event.player))} Active Character takes no damage next turn.`;
    case 'shuffle':
      return `${names.subject(event.player)} shuffled the deck.`;
    case 'survive':
      return `${shortName(event.cardId)} held on with a lucky coin!`;
    case 'knock-out':
      return `${shortName(event.cardId)} was knocked out. ${names.subject(other(event.player))} got ${plural(event.memories, 'Memory')}.`;
    case 'promote':
      return `${shortName(event.cardId)} stepped up to the front.`;
    case 'over':
      return event.winner === 'draw'
        ? 'The battle ended in a draw.'
        : `${names.subject(event.winner)} won${event.reason === 'memories' ? ` with ${MEMORIES_TO_WIN} Memories` : ` (${event.reason})`}.`;
  }
}
