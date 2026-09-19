export const APP_VERSION = '2.6.1'; // Increment with each task

export interface PatchNote {
  version: string;
  title: string;
  date: string;
  highlights: string[];
  fixes: string[];
}

// ALWAYS overwrite this object with ONLY the latest release
export const CURRENT_PATCH_NOTE: PatchNote = {
  version: '2.6.1',
  date: '2026-09-19',
  title: 'v2.6.1 - 3D Booster Pack & Vector Tear Engine 🎴⚡',
  highlights: [
    '3D Dual-Sided Booster Pack: Freely spin and inspect packs in 360° space with authentic Japanese TCG back-seals, barcodes, and drop rate tables.',
    'Vector Perforation Tear: Dynamic laser notch along the top crimp that shreds open progressively with realistic jagged foil edges.',
    'Metallic Foil Reflections: Foil surfaces gleam with real-time angle-responsive light physics as you rotate the pack.'
  ],
  fixes: [
    'Fixed rapid touch swipes occasionally dropping pointer events mid-tear on mobile.',
    'Added tactile haptic vibrations when ripping through the foil crimp seal.'
  ]
};
