import { MAX_DECKS } from '../../../domain/decks';
import { text } from '../../text';
import type { TabScript, TutorialContext } from '../types';
import { NEXT, spot, when } from './helpers';

const words = text.tutorial.decks;

const NAME_FIELD = spot('deck-name');

/** A new deck can be saved: a player may have eight, and with eight there is no room for the one of the lesson. */
function roomForADeck(context: TutorialContext): boolean {
  return context.save.decks.length < MAX_DECKS;
}

/** Decks: take a loaner deck as a template, give it a name and save it. */
export const decksScript: TabScript = {
  home: '/decks',
  counter: true,
  steps: [
    { id: 'decks.intro', ...words.intro, target: spot('deck-loaners'), goal: NEXT, side: 'above' },
    {
      id: 'decks.template',
      ...words.template,
      target: spot('deck-template'),
      goal: when((context) => context.location.startsWith('/decks/template/')),
      applies: roomForADeck,
    },
    { id: 'decks.editor', ...words.editor, target: spot('deck-editor'), goal: NEXT, side: 'above', applies: roomForADeck },
    { id: 'decks.name', ...words.name, target: NAME_FIELD, goal: when((context) => context.changed(NAME_FIELD)), applies: roomForADeck },
    { id: 'decks.save', ...words.save, target: spot('deck-save'), goal: when((context) => context.save.decks.length > context.start.decks), applies: roomForADeck },
    { id: 'decks.back', ...words.back, target: spot('deck-back'), goal: when((context) => context.location === '/decks'), applies: roomForADeck },
    { id: 'decks.list', ...words.list, target: spot('deck-list'), goal: NEXT, at: { match: /^\/decks$/, go: '/decks' } },
    { id: 'decks.done', ...words.done, target: null, goal: NEXT, last: true, button: text.tutorial.ui.finish },
  ],
};
