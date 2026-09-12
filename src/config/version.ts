export const APP_VERSION = '2.1.0'; // Increment with each task

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
  title: 'Restoration Workbench & Crack-to-Regrade',
  date: new Date().toISOString().split('T')[0],
  highlights: [
    'Enter the physical Restoration Lab to crack slabs, clean flaws under a 50x microscope, and clamp-press cards flat.',
    'Buff holographic foil with restoration wax and sleeve cards in semi-rigid savers with an animated inspection checklist.',
    'Re-grade restored cards at the Vault with a locked Grade 7+ floor, subgrade buffs, and an amber RE-CERTIFIED badge.',
  ],
  fixes: [
    'Fixed graded slabs locking cards permanently—now you can crack and restore low grades for a second chance at Gem Mint.',
    'Optimized tactile workshop audio effects with ultra-low latency procedural Web Audio synthesis.',
  ],
};

