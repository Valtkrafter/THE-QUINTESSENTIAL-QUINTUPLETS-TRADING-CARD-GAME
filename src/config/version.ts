export const APP_VERSION = '2.6.2'; // Increment with each task

export interface PatchNote {
  version: string;
  title: string;
  date: string;
  highlights: string[];
  fixes: string[];
}

// ALWAYS overwrite this object with ONLY the latest release
export const CURRENT_PATCH_NOTE: PatchNote = {
  version: '2.6.2',
  date: '2026-09-19',
  title: 'v2.6.2 - Weiss Schwarz & Pokémon Foil Shader Engine 🎴✨',
  highlights: [
    '5-Layer Composite Renderer: Authentic Weiss Schwarz SP/SSP and Pokémon Secret Rare cards with dark 350gsm paper tooth substrate, micro-relief etching, and prismatic conic gradients.',
    'Hot-Stamped Gold Foil Signatures: Official Voice Actress signatures (Kana Hanazawa, Ayana Taketatsu, Miku Itō, Ayane Sakura, Inori Minase) stamped in metallic gold leaf with authentic red Japanese Hanko seals.',
    'Angle-Responsive Tactile Relief: Directional specular lighting catches embossed fingerprint ridges and guilloché curves in real time using mouse and mobile gyroscope.'
  ],
  fixes: [
    'Fixed card foil specular hotspots staying stuck when releasing pointer off-card.',
    'Optimized shader uniforms directly via GPU CSS variables for butter-smooth 60fps performance without re-render stutter.'
  ]
};
