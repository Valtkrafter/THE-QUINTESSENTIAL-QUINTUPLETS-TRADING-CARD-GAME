import { giftCardId } from '../../../domain/gifts';
import { text } from '../../text';
import type { TabScript } from '../types';
import { CLICK, NEXT, spot, when } from './helpers';

const words = text.tutorial.binder;

const SEARCH_INPUT = `${spot('binder-search')} input`;
const SORT_SELECT = `${spot('binder-sort')} select`;
const PRESSED_FILTER = `${spot('binder-panel')} [aria-pressed="true"]`;

/** Binder: find a card (search, filter, sort), look at it in 3D and flip it. */
export const binderScript: TabScript = {
  home: '/',
  counter: true,
  steps: [
    {
      id: 'binder.intro',
      ...words.intro,
      target: spot('binder-grid'),
      goal: NEXT,
      // The lesson needs a card to look at.
      gifts: (context) => (context.save.collection.length === 0 ? [{ kind: 'card', cardId: giftCardId() }] : []),
    },
    { id: 'binder.search', ...words.search, target: spot('binder-search'), goal: when((context) => (context.value(SEARCH_INPUT) ?? '') !== '') },
    { id: 'binder.search-clear', ...words.searchClear, target: spot('binder-search'), goal: when((context) => context.value(SEARCH_INPUT) === '') },
    { id: 'binder.filter', ...words.filter, target: spot('binder-filter'), goal: when((context) => context.has(spot('binder-panel'))) },
    { id: 'binder.filter-pick', ...words.filterPick, target: spot('filter-rarity'), goal: when((context) => context.has(PRESSED_FILTER)) },
    {
      id: 'binder.filter-reset',
      ...words.filterReset,
      target: spot('filter-reset'),
      // Pressing "Reset filters" does it, and so does pressing the button again.
      goal: when((context) => context.has(spot('binder-panel')) && !context.has(PRESSED_FILTER)),
    },
    { id: 'binder.sort', ...words.sort, target: spot('binder-sort'), goal: when((context) => context.changed(SORT_SELECT)) },
    { id: 'binder.open', ...words.open, target: spot('binder-first-card'), goal: when((context) => context.location.startsWith('/card/')) },
    { id: 'binder.turn', ...words.turn, target: spot('card-viewer'), goal: NEXT },
    { id: 'binder.flip', ...words.flip, target: spot('card-flip'), goal: CLICK },
    { id: 'binder.facts', ...words.facts, target: spot('card-info'), goal: NEXT },
    { id: 'binder.back', ...words.back, target: spot('card-back'), goal: when((context) => context.location === '/') },
    { id: 'binder.done', ...words.done, target: null, goal: NEXT, last: true, button: text.tutorial.ui.finish },
  ],
};
