// The ready-made decks of the game: the loaner decks every player can always use, and the rivals with their decks. The
// data is in data/decks.json and is checked at start-up like the cards: a typo or an illegal deck stops the game with a
// message that lists every problem, never in the middle of a battle.

import { z } from 'zod';
import { SUPPORTING_CAST } from '../cards/model';
import data from '../data/decks.json';
import { checkDeck, type DeckProblem } from '../domain/decks';
import { AI_LEVELS, type AiLevel } from './ai';

const cardList = z.array(z.string());

const starterSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  blurb: z.string().min(1),
  cards: cardList,
});

const opponentSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  /** The supporting character who plays the rival (their art is the portrait). */
  character: z.enum(SUPPORTING_CAST),
  level: z.enum(AI_LEVELS),
  blurb: z.string().min(1),
  deck: z.strictObject({ name: z.string().min(1), cards: cardList }),
});

const rosterSchema = z.strictObject({ starters: z.array(starterSchema).min(1), opponents: z.array(opponentSchema).min(1) });

/** A loaner deck: free to use in every battle, cannot be changed. */
export type StarterDeck = z.infer<typeof starterSchema>;
export type Opponent = z.infer<typeof opponentSchema>;

export interface Roster {
  readonly starters: readonly StarterDeck[];
  readonly opponents: readonly Opponent[];
}

function describeProblem(problem: DeckProblem): string {
  switch (problem.code) {
    case 'size':
      return `has ${problem.have} cards, not ${problem.want}`;
    case 'unknown-card':
      return `uses the unknown card ${problem.cardId}`;
    case 'copies':
      return `has ${problem.have} copies of ${problem.cardId} (at most ${problem.max})`;
    case 'prime':
      return `has ${problem.have} Prime cards (at most ${problem.max})`;
    case 'basics':
      return `has ${problem.have} Characters to start with (at least ${problem.min})`;
    case 'not-owned':
      return `uses ${problem.need} of ${problem.cardId} but only ${problem.have} are owned`;
  }
}

/** Checks raw deck data. Throws one error that lists every problem. */
export function parseRoster(raw: unknown): Roster {
  const result = rosterSchema.safeParse(raw);
  if (!result.success) {
    const lines = result.error.issues.map((issue) => `  ${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Deck data is invalid:\n${lines.join('\n')}`);
  }
  const problems: string[] = [];
  const seen = new Set<string>();
  const decks = [
    ...result.data.starters.map((starter) => ({ id: starter.id, cards: starter.cards })),
    ...result.data.opponents.map((opponent) => ({ id: opponent.id, cards: opponent.deck.cards })),
  ];
  for (const deck of decks) {
    if (seen.has(deck.id)) {
      problems.push(`the id ${deck.id} is used twice`);
    }
    seen.add(deck.id);
    for (const problem of checkDeck(deck.cards)) {
      problems.push(`${deck.id} ${describeProblem(problem)}`);
    }
  }
  if (problems.length > 0) {
    throw new Error(`Deck data is inconsistent:\n${problems.map((line) => `  ${line}`).join('\n')}`);
  }
  return result.data;
}

export const ROSTER: Roster = parseRoster(data);
export const STARTER_DECKS: readonly StarterDeck[] = ROSTER.starters;
export const OPPONENTS: readonly Opponent[] = ROSTER.opponents;

export function starterById(id: string): StarterDeck | undefined {
  return STARTER_DECKS.find((deck) => deck.id === id);
}

export function opponentById(id: string): Opponent | undefined {
  return OPPONENTS.find((opponent) => opponent.id === id);
}

export function opponentsOfLevel(level: AiLevel): Opponent[] {
  return OPPONENTS.filter((opponent) => opponent.level === level);
}
