import { yenGiftFor } from '../../../domain/gifts';
import { packById } from '../../../packs/catalog';
import { text } from '../../text';
import type { TabScript, TutorialContext } from '../types';
import { CLICK, NEXT, onPage, spot, when } from './helpers';

const words = text.tutorial.packs;

/** What the first pack costs: the Booster. */
function boosterPrice(): number {
  return packById('booster')?.price ?? 300;
}

/** A pack is being opened: its show is on the screen or on its way. A reload ends it, and the steps about it are left out. */
function inShow(context: TutorialContext): boolean {
  return context.has(spot('pull')) || context.has(spot('pull-loading'));
}

/** Packs: the money, the daily bonus, the odds, and a first pack from the tear to the result. */
export const packsScript: TabScript = {
  home: '/packs',
  counter: true,
  steps: [
    { id: 'packs.welcome', ...words.welcome, target: null, goal: NEXT },
    { id: 'packs.wallet', ...words.wallet, target: spot('packs-wallet'), goal: NEXT },
    {
      id: 'packs.daily',
      ...words.daily,
      target: spot('daily-claim'),
      goal: CLICK,
      // Nothing to take when the bonus was taken already today.
      applies: (context) => context.has(`${spot('daily-claim')}:not(:disabled)`),
    },
    { id: 'packs.kinds', ...words.kinds, target: spot('pack-list'), goal: NEXT, side: 'above' },
    { id: 'packs.odds', ...words.odds, target: spot('odds-booster'), goal: when((context) => onPage(context, '/packs/odds')) },
    {
      id: 'packs.odds-read',
      ...words.oddsRead,
      target: spot('odds-chances'),
      goal: NEXT,
      at: { match: /^\/packs\/odds(\/|$)/, go: '/packs/odds/booster' },
    },
    {
      id: 'packs.odds-back',
      ...words.oddsBack,
      target: spot('odds-back'),
      goal: when((context) => context.location === '/packs'),
      at: { match: /^\/packs\/odds(\/|$)/, go: '/packs/odds/booster' },
    },
    {
      id: 'packs.open',
      ...words.open,
      target: spot('open-booster'),
      // The pack is paid for and in the Binder the moment the button is pressed; the show comes after.
      goal: when((context) => context.save.collection.length > context.start.cards),
      gifts: (context) => yenGiftFor(context.save, boosterPrice()),
    },
    {
      id: 'packs.tear',
      ...words.tear,
      target: spot('pack-tear'),
      // The tear is gone (the show started), or there never was one (the animation is off) and the result is here.
      goal: when((context) => (context.seen(spot('pack-tear')) && !context.has(spot('pack-tear'))) || context.has(spot('pull-summary'))),
      applies: inShow,
      later: true,
    },
    {
      id: 'packs.show',
      ...words.show,
      target: null,
      dim: false,
      side: 'above',
      hint: text.tutorial.ui.tapOn,
      goal: when((context) => context.has(spot('pull-summary'))),
      applies: inShow,
      later: true,
    },
    { id: 'packs.summary', ...words.summary, target: spot('pull-cards'), goal: NEXT, applies: inShow, later: true },
    {
      id: 'packs.close',
      ...words.close,
      target: spot('pull-close'),
      goal: when((context) => context.seen(spot('pull-close')) && !context.has(spot('pull'))),
      applies: inShow,
      later: true,
    },
    { id: 'packs.pity', ...words.pity, target: spot('pity-booster'), goal: NEXT, at: { match: /^\/packs$/, go: '/packs' } },
    { id: 'packs.done', ...words.done, target: null, goal: NEXT, last: true, button: text.tutorial.ui.finish },
  ],
};
