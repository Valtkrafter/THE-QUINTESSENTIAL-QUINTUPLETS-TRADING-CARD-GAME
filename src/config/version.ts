export const APP_VERSION = '3.0.0';

export interface PatchNote {
  version: string;
  title: string;
  date: string;
  highlights: string[];
  fixes: string[];
}

// ALWAYS overwrite this object with ONLY the latest release
export const CURRENT_PATCH_NOTE: PatchNote = {
  version: '3.0.0',
  date: '2026-09-19',
  title: 'AAA 3D Booster Ceremony & Weiss Schwarz Shaders 🎴',
  highlights: [
    '3D Booster Pack Inspection: Free 360° inertia pack rotation with authentic metallic foil crimp texturing.',
    'Vector Foil Tear Mechanism: Physical pointer-driven perforation tear with realistic breach acoustics.',
    'Weiss Schwarz SP Shaders: 5-layer composite card rendering with micro-etched relief, rainbow foil, and gold VA signatures.',
    'Predictive Edge-Glow Suspense: Volumetric rim lighting hinting at hidden rarities before peeling cards.'
  ],
  fixes: [
    'Rebuilt sound engine with zero audio files using procedural Web Audio synthesis.',
    'Enforced memory leak safeguards and unified 100dvh mobile containment.'
  ]
};
