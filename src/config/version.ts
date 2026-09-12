export const APP_VERSION = '2.0.2'; // Increment with each task

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
  title: 'Support Altar Redesign & Card Showcase',
  date: new Date().toISOString().split('T')[0],
  highlights: [
    'Support cards now feature large, beautiful full-art previews with character artwork taking center stage.',
    'Streamlined filter bar with quick one-click mentor pills and format toggles.',
  ],
  fixes: [
    'Removed the redundant search bar to maximize card browsing space.',
    'Condensed the active mentor status and drawer header to give cards more breathing room.',
  ],
};
