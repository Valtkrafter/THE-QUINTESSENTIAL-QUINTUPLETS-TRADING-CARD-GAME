export const APP_VERSION = '2.2.1'; // Increment with each task

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
  title: 'Workbench Card Display & Polish Layout Fix',
  date: new Date().toISOString().split('T')[0],
  highlights: [
    'Crisp Workbench Cards: Enforced concrete width and aspect-ratio anchors across all restoration steps so cards always display at full resolution.',
    'Smoother Balm Application: Polishing stage layout now locks both tool jar and card stage in place without flex-wrap jitter.',
  ],
  fixes: [
    'Fixed cards collapsing into a 0px dot during the restoration polishing, clamping, cracking, and sleeving steps.',
  ],
};
