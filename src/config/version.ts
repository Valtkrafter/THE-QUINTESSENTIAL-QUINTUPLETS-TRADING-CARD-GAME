export const APP_VERSION = '2.0.3'; // Increment with each task

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
  title: 'Card-Dex Single-Bar Controls & Viewport Elevation',
  date: new Date().toISOString().split('T')[0],
  highlights: [
    'Consolidated the Card-Dex header into a unified high-density toolbar featuring a micro progress ring, sister filter pills, and search.',
    'Added a quick "Slabs Only" toggle and live count badge directly in the toolbar for instant collection filtering.',
    'Elevated the 42-card grid by ~75px of vertical space, displaying 2+ full rows above the fold without scrolling.',
  ],
  fixes: [
    'Removed the bulky upper status bar to reclaim vertical screen real estate.',
    'Card search now actively searches card quotes alongside serial numbers, sister names, and titles in real time.',
  ],
};
