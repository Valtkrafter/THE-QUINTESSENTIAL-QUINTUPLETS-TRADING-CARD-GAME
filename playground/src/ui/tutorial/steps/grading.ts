import { cardById } from '../../../cards/catalog';
import { type Gift, giftCardId, yenGiftFor } from '../../../domain/gifts';
import { GRADING_FEE_YEN, cheapestToGrade, gradingFee, rawCopies } from '../../../domain/grading';
import { text } from '../../text';
import type { TabScript, TutorialContext } from '../types';
import { NEXT, spot, when } from './helpers';

const words = text.tutorial.grading;

/** What the lesson needs: a loose card, and the fee of the cheapest one. Given when a step needs it, never twice. */
function lessonGifts(context: TutorialContext): readonly Gift[] {
  const loose = rawCopies(context.save.collection);
  const copy = cheapestToGrade(loose);
  if (copy === undefined) {
    return [{ kind: 'card', cardId: giftCardId() }, ...yenGiftFor(context.save, GRADING_FEE_YEN.C)];
  }
  const card = cardById(copy.cardId);
  return yenGiftFor(context.save, card === undefined ? GRADING_FEE_YEN.C : gradingFee(card.rarity));
}

/** Grading: pick the cheapest card, read the chances, send it in and look at the result. */
export const gradingScript: TabScript = {
  home: '/grading',
  counter: true,
  steps: [
    { id: 'grading.intro', ...words.intro, target: null, goal: NEXT, gifts: lessonGifts },
    { id: 'grading.steps', ...words.steps, target: spot('grading-steps'), goal: NEXT },
    {
      id: 'grading.pick',
      ...words.pick,
      target: spot('grading-card'),
      // The desk of the card is on the screen (next to the list, or in a window on a narrow screen).
      goal: when((context) => context.has(spot('grading-outlook'))),
      gifts: lessonGifts,
    },
    { id: 'grading.desk', ...words.desk, target: spot('grading-outlook'), goal: NEXT },
    {
      id: 'grading.send',
      ...words.send,
      target: spot('grading-send'),
      // On a wide screen the button asks the last question; on a narrow one the question is open already.
      goal: when((context) => context.has(spot('grade-confirm'))),
      gifts: lessonGifts,
    },
    {
      id: 'grading.confirm',
      ...words.confirm,
      target: spot('grade-confirm-yes'),
      goal: when((context) => context.has(spot('ceremony'))),
      gifts: lessonGifts,
    },
    {
      id: 'grading.ceremony',
      ...words.ceremony,
      target: null,
      dim: false,
      side: 'above',
      hint: text.tutorial.ui.watchOn,
      goal: when((context) => context.has(spot('ceremony-done'))),
      // A reload ends the reveal (the card is graded already): the steps about it are left out.
      applies: (context) => context.has(spot('ceremony')),
      later: true,
    },
    { id: 'grading.result', ...words.result, target: spot('ceremony-result'), goal: NEXT, applies: (context) => context.has(spot('ceremony')), later: true },
    {
      id: 'grading.close',
      ...words.close,
      target: spot('ceremony-done'),
      goal: when((context) => context.seen(spot('ceremony-done')) && !context.has(spot('ceremony'))),
      applies: (context) => context.has(spot('ceremony')),
      later: true,
    },
    { id: 'grading.slabs-tab', ...words.slabsTab, target: spot('grading-tab-slabs'), goal: when((context) => context.has(spot('slabs-panel'))) },
    { id: 'grading.slabs-info', ...words.slabsInfo, target: spot('slabs-panel'), goal: NEXT },
    { id: 'grading.done', ...words.done, target: null, goal: NEXT, last: true, button: text.tutorial.ui.finish },
  ],
};
