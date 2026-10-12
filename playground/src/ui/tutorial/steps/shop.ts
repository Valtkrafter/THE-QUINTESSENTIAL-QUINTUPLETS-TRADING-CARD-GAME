import { dayKeyOf } from '../../../domain/calendar';
import { yenGiftFor } from '../../../domain/gifts';
import { cheapestOffer } from '../../../domain/kiosk';
import { text } from '../../text';
import type { SaveGame } from '../../../domain/save';
import type { TabScript } from '../types';
import { NEXT, spot, when } from './helpers';

const words = text.tutorial.shop;

function cheapestToday(save: SaveGame) {
  return cheapestOffer(save, dayKeyOf(new Date()));
}

/** Shop: what the Kiosk sells, one purchase, and what selling is. */
export const shopScript: TabScript = {
  home: '/shop',
  counter: true,
  steps: [
    { id: 'shop.intro', ...words.intro, target: null, goal: NEXT },
    { id: 'shop.kiosk', ...words.kiosk, target: spot('kiosk'), goal: NEXT, side: 'above' },
    {
      id: 'shop.buy',
      ...words.buy,
      target: spot('kiosk-buy'),
      goal: when((context) => context.save.collection.length > context.start.cards),
      // Left out when the whole shelf is bought out for today.
      applies: (context) => cheapestToday(context.save) !== undefined,
      gifts: (context) => {
        const offer = cheapestToday(context.save);
        return offer === undefined ? [] : yenGiftFor(context.save, offer.price);
      },
    },
    { id: 'shop.sell-tab', ...words.sellTab, target: spot('shop-tab-sell'), goal: when((context) => context.has(spot('sell-note'))) },
    { id: 'shop.sell-info', ...words.sellInfo, target: spot('sell-note'), goal: NEXT },
    { id: 'shop.done', ...words.done, target: null, goal: NEXT, last: true, button: text.tutorial.ui.finish },
  ],
};
