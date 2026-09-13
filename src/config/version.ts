export const APP_VERSION = '2.4.0'; // Increment with each task

export interface PatchNote {
  version: string;
  title: string;
  date: string;
  highlights: string[];
  fixes: string[];
}

// ALWAYS overwrite this object with ONLY the latest release
export const CURRENT_PATCH_NOTE: PatchNote = {
  version: '2.4.0',
  date: '2026-09-13',
  title: 'Academic Showdown & Battle Engine ⚔️',
  highlights: [
    'Exam Showdown: Take on Maruo Nakano and strict examiners in an auto-battler showdown.',
    'Manga Skill Cut-Ins: Unleash signature character abilities with dramatic anime cinematic slashes.',
    'Deck Builder & Hanko Rewards: Assemble your 5 sisters + tutor to earn Yen, Stardust, and Pack Vouchers.',
  ],
  fixes: [
    'Balanced card stats: IQ, Charm, and Resolve now scale directly from Rarity, Finish, and BGS Slabs.',
    'Resolved workbench layout bugs and solidified 100vh containment across all viewports.',
  ],
};
