export const APP_VERSION = '2.4.1'; // Increment with each task

export interface PatchNote {
  version: string;
  title: string;
  date: string;
  highlights: string[];
  fixes: string[];
}

// ALWAYS overwrite this object with ONLY the latest release
export const CURRENT_PATCH_NOTE: PatchNote = {
  version: '2.4.1',
  date: '2026-09-14',
  title: 'Showdown Question Board & Arena Flow 📝',
  highlights: [
    'Exam Question Board: The central chalkboard now features authentic subject questions, formulas, and examiner taunts.',
    'Dedicated Turn Play Engine: Clear step-by-step turn execution with "Begin Round" and "Solve With Sister" action buttons.',
    'Purged Redundant Bottom Nav: Removed duplicate floating bottom pill dock across all tabs for a cleaner, unobstructed viewport.',
  ],
  fixes: [
    'Eliminated dead space in the Exam Showdown arena.',
    'Prevented bottom navigation bar from overlapping card desks and collection grids.',
  ],
};
