export const APP_VERSION = '2.5.0'; // Increment with each task

export interface PatchNote {
  version: string;
  title: string;
  date: string;
  highlights: string[];
  fixes: string[];
}

// ALWAYS overwrite this object with ONLY the latest release
export const CURRENT_PATCH_NOTE: PatchNote = {
  version: '2.5.0',
  date: '2026-09-17',
  title: 'Arts-Card Combat Overhaul & Z-Index Fix ⚔️',
  highlights: [
    'Arts-Card Combat Engine: Play Strike, Blast, Support, and Ultimate cards using real-time Focus Energy (DBL-style).',
    'Dynamic Combos & Energy Charge: Chain answers together to multiply test points and charge Focus under time pressure.',
    'Permanent Hover-Bug Fix: Replaced buggy hover tooltips with a stable click-to-play card dock and resolved all stacking conflicts.'
  ],
  fixes: [
    'Permanently eliminated z-index clipping behind the exam question board.',
    'Purged hover tunnel dismissals by introducing direct click and play targets.'
  ]
};
