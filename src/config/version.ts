export const APP_VERSION = '2.3.0'; // Increment with each task

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
  title: 'Franchise Asset Scoping & Self-Healing Pipeline',
  date: new Date().toISOString().split('T')[0],
  highlights: [
    'Franchise Asset Scoping: Reorganized card illustrations into dedicated /cards/TQQ/ character directories for future multi-series support.',
    'Self-Healing Asset Pipeline: Cards automatically resolve artwork paths and heal legacy save data on-the-fly with zero broken links.',
  ],
  fixes: [
    'Fixed card artwork returning 404 errors on Vercel Linux production by matching exact on-disk directory casing.',
    'Fixed existing collections and vitrine showcase cards failing to load artwork after directory migrations.',
  ],
};
