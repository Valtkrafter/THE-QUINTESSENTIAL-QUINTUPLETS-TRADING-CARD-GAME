export const APP_VERSION = '2.1.2'; // Increment with each task

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
  title: 'Restoration Lab Viewport & Footer Polish',
  date: new Date().toISOString().split('T')[0],
  highlights: [
    'The Restoration Workbench now uses a pinned 3-tier layout to guarantee all controls stay visible on any screen size.',
    'Restoration stages now scale card holders and tool stages proportionally to fit vertical workspace constraints.',
  ],
  fixes: [
    'Fixed action buttons (Proceed to Microscope, Semi-Rigid Holder, Re-Grading) clipping off the bottom edge of the modal.',
    'Eliminated inner scrolling overflow issues across all 5 restoration workbenches.',
  ],
};

