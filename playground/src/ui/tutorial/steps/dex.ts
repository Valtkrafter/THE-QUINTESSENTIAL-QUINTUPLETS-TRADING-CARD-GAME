import { text } from '../../text';
import type { TabScript } from '../types';
import { CLICK, NEXT, spot } from './helpers';

const words = text.tutorial.dex;

/** Card-Dex: what it shows, the rewards (claimed when one waits), and the list of the sisters. */
export const dexScript: TabScript = {
  home: '/dex',
  counter: true,
  steps: [
    { id: 'dex.intro', ...words.intro, target: null, goal: NEXT },
    { id: 'dex.progress', ...words.progress, target: spot('dex-progress'), goal: NEXT },
    // A waiting reward is taken here (a player without one skips the step).
    { id: 'dex.claim', ...words.claim, target: spot('dex-claim'), goal: CLICK, applies: (context) => context.has(spot('dex-claim')) },
    { id: 'dex.rewards', ...words.rewards, target: spot('dex-rewards'), goal: NEXT },
    { id: 'dex.sisters', ...words.sisters, target: spot('dex-sister'), goal: NEXT, side: 'below' },
    { id: 'dex.done', ...words.done, target: null, goal: NEXT, last: true, button: text.tutorial.ui.finish },
  ],
};
