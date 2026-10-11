// What one player is allowed to know. The engine holds the whole truth (both hands, both decks); a computer opponent or a
// screen that shows a player's side gets this view instead, with the hidden cards turned into "?" so nothing can be read
// that the player could not see across a real table.

import type { BattleState, ChoicePrompt, PendingChoice, PlayerIndex, PlayerState } from './types';

/** Stands for a card that this player cannot see. */
export const HIDDEN_CARD = '?';

function hide(cards: readonly string[]): string[] {
  return cards.map(() => HIDDEN_CARD);
}

function hidePrompt(prompt: ChoicePrompt): ChoicePrompt {
  switch (prompt.kind) {
    case 'card':
      return { ...prompt, options: prompt.options.map((option) => ({ index: option.index, cardId: HIDDEN_CARD })) };
    case 'yes-no':
      return { ...prompt, cardId: HIDDEN_CARD };
    case 'figure':
      return prompt;
  }
}

function hidePending(pending: PendingChoice | null, viewer: PlayerIndex): PendingChoice | null {
  return pending === null || pending.player === viewer ? pending : { ...pending, prompt: hidePrompt(pending.prompt) };
}

/** The battle as `viewer` sees it: their own hand, everybody's board and discard pile, no deck order, no hand of the other side. */
export function observe(state: BattleState, viewer: PlayerIndex): BattleState {
  const view = (player: PlayerState, index: PlayerIndex): PlayerState => ({
    ...player,
    deck: hide(player.deck),
    hand: index === viewer ? player.hand : hide(player.hand),
  });
  return {
    ...state,
    players: [view(state.players[0], 0), view(state.players[1], 1)],
    pending: hidePending(state.pending, viewer),
    rng: [0, 0, 0, 0],
  };
}
