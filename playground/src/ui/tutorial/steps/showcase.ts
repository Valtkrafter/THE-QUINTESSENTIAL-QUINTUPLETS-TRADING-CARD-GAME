import { giftCardId } from '../../../domain/gifts';
import { SHOWCASE_SLOTS } from '../../../domain/save';
import { text } from '../../text';
import type { TabScript, TutorialContext } from '../types';
import { NEXT, spot, when } from './helpers';

const words = text.tutorial.showcase;

function hasFreeSlot(context: TutorialContext): boolean {
  return context.save.showcase.length < SHOWCASE_SLOTS;
}

/** Showcase: put one card on display. */
export const showcaseScript: TabScript = {
  home: '/showcase',
  counter: true,
  steps: [
    { id: 'showcase.intro', ...words.intro, target: null, goal: NEXT },
    {
      id: 'showcase.add',
      ...words.add,
      target: spot('showcase-add'),
      // The picker is open, or a card is on display already.
      goal: when((context) => context.has(spot('showcase-pick')) || context.save.showcase.length > context.start.showcase),
      applies: hasFreeSlot,
      // Something to put on display.
      gifts: (context) => (context.save.collection.length === 0 ? [{ kind: 'card', cardId: giftCardId() }] : []),
    },
    {
      id: 'showcase.pick',
      ...words.pick,
      target: spot('showcase-pick'),
      goal: when((context) => context.save.showcase.length > context.start.showcase),
      applies: hasFreeSlot,
    },
    { id: 'showcase.shelf', ...words.shelf, target: spot('showcase-case'), goal: NEXT, side: 'below' },
    { id: 'showcase.done', ...words.done, target: null, goal: NEXT, last: true, button: text.tutorial.ui.finish },
  ],
};
