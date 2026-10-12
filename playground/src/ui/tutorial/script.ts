// The introductions of all tabs, one list of steps per tab of the menu.

import { battleScript } from './steps/battle';
import { binderScript } from './steps/binder';
import { decksScript } from './steps/decks';
import { dexScript } from './steps/dex';
import { gradingScript } from './steps/grading';
import { packsScript } from './steps/packs';
import { settingsScript } from './steps/settings';
import { shopScript } from './steps/shop';
import { showcaseScript } from './steps/showcase';
import type { TutorialScript } from './types';

export const SCRIPT: TutorialScript = {
  packs: packsScript,
  shop: shopScript,
  binder: binderScript,
  grading: gradingScript,
  battle: battleScript,
  decks: decksScript,
  dex: dexScript,
  showcase: showcaseScript,
  settings: settingsScript,
};
