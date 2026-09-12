export const APP_VERSION = '2.0.1'; // Increment with each task

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
  title: 'Showcase Polish & Thumbnail Fixes',
  date: new Date().toISOString().split('T')[0],
  highlights: [
    'Support cards in the showcase now have proper breathing room without top/bottom cropping.',
    'Slab cards in the pedestal selection drawer now look clean and full-sized.',
  ],
  fixes: [
    'Fixed an issue where graded cards appeared tiny with double black borders in menus.',
    'Removed duplicate grade badges overlapping on cards.',
  ],
};
