export const APP_VERSION = '2.1.1'; // Increment with each task

export interface PatchNote {
  version: string;
  title: string;
  date: string;
  highlights: string[];
  fixes: string[];
}

// ALWAYS overwrite this object with ONLY the latest release
export const CURRENT_PATCH_NOTE: PatchNote = {
  version: APP_VERSION,
  title: 'Card-Dex Full-Art Display Polish',
  date: new Date().toISOString().split('T')[0],
  highlights: [
    'Graded cards in the Card-Dex catalog now feature full-art illustrations matching the showcase vitrine.',
    'All cards in the catalog grid now have unified height and proportions.',
  ],
  fixes: [
    'Removed oversized grading headers that squished character portraits in the Card-Dex.',
    'Unified grade badges into a single sleek indicator in the top-right corner.',
  ],
};

