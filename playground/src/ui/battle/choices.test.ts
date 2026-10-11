import { describe, expect, it } from 'vitest';
import { STARTER_DECKS } from '../../battle/roster';
import { addOwnedCard, newSaveGame } from '../../domain/save';
import { saveDeck } from '../../domain/deckList';
import { deckChoices, describeProblem } from './choices';

const NOW = 1_760_000_000_000;

describe('the decks a player can take into a battle', () => {
  it('lists the loaner decks, always ready, after the decks of the player', () => {
    const save = saveDeck(newSaveGame('choices', NOW), { id: 'deck-1', name: 'Mine', cards: ['TQQ01-001'] }, NOW);
    const choices = deckChoices(save);
    expect(choices.map((choice) => choice.key)).toEqual(['own:deck-1', ...STARTER_DECKS.map((deck) => `starter:${deck.id}`)]);
    expect(choices.filter((choice) => choice.loaner).every((choice) => choice.problems.length === 0)).toBe(true);
    expect(choices[0]?.problems.length).toBeGreaterThan(0);
  });

  it('says in plain words what is wrong with a deck of the player', () => {
    let save = addOwnedCard(newSaveGame('words', NOW), 'TQQ01-001', 'standard', 'pack', NOW).save;
    save = saveDeck(save, { id: 'deck-1', name: 'Mine', cards: ['TQQ01-001', 'TQQ01-001', 'TQQ01-002'] }, NOW);
    const sentences = (deckChoices(save)[0]?.problems ?? []).map(describeProblem);
    expect(sentences).toContain('A deck needs exactly 30 cards. This one has 3.');
    expect(sentences.some((sentence) => sentence.includes('you own 1, the deck uses 2'))).toBe(true);
    expect(sentences.some((sentence) => sentence.includes('you do not own this card'))).toBe(true);
  });
});
