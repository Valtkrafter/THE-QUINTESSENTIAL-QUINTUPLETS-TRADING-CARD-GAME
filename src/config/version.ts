export const APP_VERSION = '2.0.4'; // Increment with each task

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
  title: 'Visual Polish & Dark Theme Scrollbars',
  date: new Date().toISOString().split('T')[0],
  highlights: [
    'Replaced all default browser scrollbars with custom obsidian-dark styling.',
    'Showcase view now fits smoothly on your screen without any extra scrolling.',
  ],
  fixes: [
    'Removed the awkward vertical scroll arrows on the Card-Dex filter bar.',
    'Fixed scrollbars overlapping content in drawers and menus.',
  ],
};

