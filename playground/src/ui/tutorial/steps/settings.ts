import { text } from '../../text';
import type { TabScript } from '../types';
import { NEXT, spot, when } from './helpers';

const words = text.tutorial.settings;

/** Settings: the card frame (try one), graphics, the pack animation, the volume and the saved game. */
export const settingsScript: TabScript = {
  home: '/settings',
  counter: true,
  steps: [
    { id: 'settings.intro', ...words.intro, target: null, goal: NEXT },
    { id: 'settings.frame', ...words.frame, target: spot('settings-frame'), goal: when((context) => context.preferences.frameStyle !== context.start.frameStyle), side: 'below' },
    { id: 'settings.graphics', ...words.graphics, target: spot('settings-graphics'), goal: NEXT },
    { id: 'settings.animation', ...words.animation, target: spot('settings-animation'), goal: NEXT },
    { id: 'settings.volume', ...words.volume, target: spot('settings-volume'), goal: when((context) => context.changed(`${spot('settings-volume')} input`)) },
    { id: 'settings.backup', ...words.backup, target: spot('settings-save'), goal: NEXT, side: 'above' },
    { id: 'settings.done', ...words.done, target: null, goal: NEXT, last: true, button: text.tutorial.ui.finish },
  ],
};
