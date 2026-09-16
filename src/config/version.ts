export const APP_VERSION = '2.5.1'; // Increment with each task

export interface PatchNote {
  version: string;
  title: string;
  date: string;
  highlights: string[];
  fixes: string[];
}

// ALWAYS overwrite this object with ONLY the latest release
export const CURRENT_PATCH_NOTE: PatchNote = {
  version: '2.5.1',
  date: '2026-09-17',
  title: 'Celestial God Pack 5M Yen Endgame Sink 👑',
  highlights: [
    'Celestial God Pack: Now priced at 5,000,000 ¥ as the ultimate endgame sink with 100% guaranteed Ultra, Secret, and Master Rares.',
    'Glowing Gold Price Pill: Added an exclusive glowing gold and amber price badge in the booster pack selector.',
    'High-Impact Button Styling: Golden pulse gradient when affordable, disabled state with requirement tooltip when under 5,000,000 ¥.'
  ],
  fixes: [
    'Fixed Celestial God Pack displaying as 0 ¥ (FREE).',
    'Added strict balance verification in the game store to prevent negative balance errors.'
  ]
};
