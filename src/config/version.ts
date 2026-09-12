export const APP_VERSION = '2.2.0'; // Increment with each task

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
  title: 'Workbench 3D Droplets, 24h Clamping & Paid Re-Grading',
  date: new Date().toISOString().split('T')[0],
  highlights: [
    '3D Viscous Balm Droplets: Restoring cards now features realistic convex 3D gel droplets, rotating radar reticles, and holographic matte smear buffing.',
    '24-Hour Persistent Clamp Press: Bar clamps now run on real-time wall-clock persistence with live countdowns and dynamic time-discounted Stardust skips.',
    'Paid Re-Grading Certification: Protects the economy with a 50% raw card valuation fee, liquidity deficit alerts, and guaranteed Grade 7.0+ Crisp restored slabs.',
  ],
  fixes: [
    'Protected the game economy from zero-cost re-grading exploits by enforcing strict liquidity verification.',
    'Clamped cards are now strictly locked in the workbench so they cannot be accidentally sold, dusted, or slotted.',
  ],
};
