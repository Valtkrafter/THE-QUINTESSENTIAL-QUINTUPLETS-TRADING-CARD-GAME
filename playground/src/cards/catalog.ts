import { z } from 'zod';
import fuutarou from '../data/cards/fuutarou.json';
import ichika from '../data/cards/ichika.json';
import isanari from '../data/cards/isanari.json';
import itsuki from '../data/cards/itsuki.json';
import maruo from '../data/cards/maruo.json';
import miku from '../data/cards/miku.json';
import nino from '../data/cards/nino.json';
import raiha from '../data/cards/raiha.json';
import yotsuba from '../data/cards/yotsuba.json';
import yusuke from '../data/cards/yusuke.json';
import textsDe from '../data/cards.de.json';
import { cardSchema, type Card } from './schema';
import { applyTexts } from './texts';

export const SET_CODE = 'TQQ01';

/**
 * Checks raw card data (the JSON files) and returns the cards in print order. Throws one error that lists every
 * problem, so a typo in a data file is found at start-up and never in the middle of a match.
 */
export function parseCatalog(raw: readonly unknown[]): readonly Card[] {
  const result = z.array(cardSchema).safeParse(raw);
  if (!result.success) {
    const lines = result.error.issues.map((issue) => `  ${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Card data is invalid:\n${lines.join('\n')}`);
  }
  const cards = [...result.data].sort((a, b) => a.number - b.number);

  const problems: string[] = [];
  const seenArt = new Set<string>();
  cards.forEach((card, index) => {
    const expectedId = `${SET_CODE}-${String(index + 1).padStart(3, '0')}`;
    if (card.number !== index + 1 || card.id !== expectedId) {
      problems.push(`card ${card.id} (number ${card.number}) should be number ${index + 1} with id ${expectedId}`);
    }
    const art = `${card.art.character}/${card.art.slot}`;
    if (seenArt.has(art)) {
      problems.push(`art ${art} is used by more than one card`);
    }
    seenArt.add(art);
  });
  if (problems.length > 0) {
    throw new Error(`Card data is inconsistent:\n${problems.map((line) => `  ${line}`).join('\n')}`);
  }
  return cards;
}

/** The cards with their original English text (the rules and the base of every translation). */
export const CATALOG_ORIGINAL: readonly Card[] = parseCatalog([
  ...ichika,
  ...nino,
  ...miku,
  ...yotsuba,
  ...itsuki,
  ...fuutarou,
  ...raiha,
  ...isanari,
  ...maruo,
  ...yusuke,
]);

/** The cards as the game shows them: the German text laid over the originals (see texts.ts). */
export const CATALOG: readonly Card[] = applyTexts(CATALOG_ORIGINAL, textsDe);
export const SET_SIZE = CATALOG.length;

const BY_ID = new Map<string, Card>(CATALOG.map((card) => [card.id, card]));

export function cardById(id: string): Card | undefined {
  return BY_ID.get(id);
}
