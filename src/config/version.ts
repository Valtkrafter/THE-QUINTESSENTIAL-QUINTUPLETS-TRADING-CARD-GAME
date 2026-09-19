export const APP_VERSION = '2.6.0'; // Increment with each task

export interface PatchNote {
  version: string;
  title: string;
  date: string;
  highlights: string[];
  fixes: string[];
}

// ALWAYS overwrite this object with ONLY the latest release
export const CURRENT_PATCH_NOTE: PatchNote = {
  version: '2.6.0',
  date: '2026-09-19',
  title: '3D Pack Opening Ceremony: Core Architecture 🎴✨',
  highlights: [
    'AAA 3D Ceremony Engine: Built the state machine lifecycle for 360° pack inspection, tactile crimp tearing, and swipe-to-reveal.',
    'Dynamic Holographic Shaders: Added real-time tilt refraction angle, specular hotspot, and glare calculations.',
    'Suspense Edge Glow: Deterministic chromatic edge glows and particle bursts tailored to every rarity and foil tier.'
  ],
  fixes: [
    'Optimized math operations for ultra-responsive 60fps tilt tracking without frame drops.',
    'Guaranteed smooth card stack unmounting during unboxing sequence.'
  ]
};
