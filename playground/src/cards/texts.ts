// The words printed on the cards, in the language the game is played in. The card data files (data/cards/*.json) hold the
// rules and the original English text; a text file such as data/cards.de.json holds the same strings in one language,
// keyed by card id. They are laid over the cards once, when the game starts, so no screen has to know which language is
// shown. A text file must fit its cards exactly (same moves, same abilities); a mismatch stops the game at start-up
// with a list of every problem, instead of showing a wrong card in the middle of a match.

import { z } from 'zod';
import type { Card, CharacterCard, Move } from './schema';

const moveTextSchema = z.strictObject({ name: z.string().min(1), text: z.string().min(1).optional() });
const abilityTextSchema = z.strictObject({ name: z.string().min(1), text: z.string().min(1) });

export const cardTextSchema = z.strictObject({
  title: z.string().min(1),
  /** Characters with an ability only. */
  ability: abilityTextSchema.optional(),
  /** Characters only: one entry per move, in the order of the card. A move has `text` exactly when the card does. */
  moves: z.array(moveTextSchema).optional(),
  /** Supporters only: the rule as printed. */
  text: z.string().min(1).optional(),
});

export const cardTextsSchema = z.record(z.string(), cardTextSchema);

export type CardText = z.infer<typeof cardTextSchema>;
export type CardTexts = z.infer<typeof cardTextsSchema>;

type MoveText = NonNullable<CardText['moves']>[number];

function moveWithText(card: CharacterCard, move: Move, index: number, entry: MoveText | undefined, problems: string[]): Move {
  if (entry === undefined) {
    problems.push(`${card.id}: move ${index + 1} has no text`);
    return move;
  }
  if ((entry.text === undefined) !== (move.text === undefined)) {
    problems.push(`${card.id}: move ${index + 1} must ${move.text === undefined ? 'not ' : ''}have a rule text`);
  }
  return { ...move, name: entry.name, text: entry.text ?? move.text };
}

function characterWithText(card: CharacterCard, entry: CardText, problems: string[]): CharacterCard {
  if (entry.text !== undefined) {
    problems.push(`${card.id}: a character has no "text"`);
  }
  if ((entry.ability === undefined) !== (card.ability === undefined)) {
    problems.push(`${card.id}: the ability must ${card.ability === undefined ? 'not ' : ''}be translated`);
  }
  const moves = entry.moves ?? [];
  if (moves.length !== card.moves.length) {
    problems.push(`${card.id}: ${card.moves.length} moves on the card, ${moves.length} in the text`);
  }
  return {
    ...card,
    title: entry.title,
    ability: card.ability === undefined || entry.ability === undefined ? card.ability : { ...card.ability, name: entry.ability.name, text: entry.ability.text },
    moves: card.moves.map((move, index) => moveWithText(card, move, index, moves[index], problems)),
  };
}

/** Returns the cards with their title, move names, abilities and rule texts taken from `raw` (a text file). */
export function applyTexts(cards: readonly Card[], raw: unknown): readonly Card[] {
  const parsed = cardTextsSchema.safeParse(raw);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((issue) => `  ${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Card texts are invalid:\n${lines.join('\n')}`);
  }
  const texts = parsed.data;
  const problems: string[] = [];
  const known = new Set(cards.map((card) => card.id));
  for (const id of Object.keys(texts)) {
    if (!known.has(id as Card['id'])) {
      problems.push(`${id}: there is no such card`);
    }
  }

  const result = cards.map((card): Card => {
    const entry = texts[card.id];
    if (entry === undefined) {
      problems.push(`${card.id}: no text`);
      return card;
    }
    if (card.kind === 'character') {
      return characterWithText(card, entry, problems);
    }
    if (entry.text === undefined) {
      problems.push(`${card.id}: a supporter needs its rule "text"`);
    }
    if (entry.ability !== undefined || entry.moves !== undefined) {
      problems.push(`${card.id}: a supporter has no ability and no moves`);
    }
    return { ...card, title: entry.title, text: entry.text ?? card.text };
  });

  if (problems.length > 0) {
    throw new Error(`Card texts do not fit the cards:\n${problems.map((line) => `  ${line}`).join('\n')}`);
  }
  return result;
}
