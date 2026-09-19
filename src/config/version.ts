export const APP_VERSION = '2.6.3'; // Increment with each task

export interface PatchNote {
  version: string;
  title: string;
  date: string;
  highlights: string[];
  fixes: string[];
}

// ALWAYS overwrite this object with ONLY the latest release
export const CURRENT_PATCH_NOTE: PatchNote = {
  version: '2.6.3',
  date: '2026-09-19',
  title: 'v2.6.3 - Face-Down Suspense Stack & Procedural Web Audio Engine 🎴🔊',
  highlights: [
    'Face-Down 3D Suspense Stack: 5 cards sit face-down on a luxury dark velvet card mat (#08090d) with tight 2px vertical stacking offsets and official high-resolution TQQ Vault card back art.',
    'Predictive Edge-Glow Lighting: The top card leaks volumetric ambient light beneath its borders—faint white rim light for Commons, pulsing violet halo for Rares, high-energy amber flare with sparks for Ultras, and spinning chromatic auroras for God/Signed SP cards.',
    'Zero-MP3 Procedural Web Audio: 100% synthesizer-driven procedural sound suite (foil crease, variable tear rip, card slide friction, pitch-rising suspense hum, and pristine 5-bell signed fanfare) with zero external audio files.'
  ],
  fixes: [
    'Smooth 3D Flip & Reveal: Fluid 3D flip animation (rotateY: 180deg, 0.35s) with cinematic slow-motion blur before full foil art bursts into view.',
    'Precision Touch Peel Gestures: High-velocity swipe detection (Δx > 120px or vx > 400px/s) with spring snap-back when below threshold.'
  ]
};
