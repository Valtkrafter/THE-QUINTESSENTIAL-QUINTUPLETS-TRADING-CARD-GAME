/**
 * TQQ Vault - Deterministic Asset Resolver & Path Migration
 * Maps character IDs to exact on-disk directory casing to prevent 404 errors
 * on case-sensitive Linux/Vercel environments and migrates legacy /cards/ paths.
 */

import { CharacterId } from '../types/card';

export const TQQ_FOLDER_MAP: Record<string, string> = {
  ichika: 'Ichika',
  nino: 'Nino',
  miku: 'Miku',
  yotsuba: 'Yotsuba',
  itsuki: 'Itsuki',
  futarou: 'Futarou',
  fuutarou: 'Futarou',
  raiha: 'Raiha',
  maruo: 'Maruo',
  isanari: 'isanari', // strictly lowercase 'i'
  yusuke: 'Yusuke',
  takeda: 'Yusuke',
};

/**
 * Resolves a scoped public path for a card illustration asset
 * given its character ID and file name.
 * Example: resolveTqqCardPath('futarou', 'futa 1.jpg') -> '/cards/TQQ/Futarou/futa 1.jpg'
 */
export function resolveTqqCardPath(characterId: CharacterId | string, fileName: string): string {
  const normalizedKey = characterId.toLowerCase();
  const folder = TQQ_FOLDER_MAP[normalizedKey];
  if (!folder) {
    throw new Error(`Unknown characterId: ${characterId}`);
  }
  const cleanFileName = fileName.replace(/^\/+/, '');
  return `/cards/TQQ/${folder}/${cleanFileName}`;
}

/**
 * Normalizes any legacy or un-scoped card image path to the official /cards/TQQ/ structure.
 * Handles:
 * - Legacy paths: '/cards/Ichika/Ichika Tier ONE.jpg' -> '/cards/TQQ/Ichika/Ichika Tier ONE.jpg'
 * - Casing correction: '/cards/TQQ/ISANARI/isa 1.jpg' -> '/cards/TQQ/isanari/isa 1.jpg'
 * - Already normalized paths: preserved as-is.
 * - Non-TQQ paths (e.g. /cards/MDUD/ or external http): preserved as-is.
 */
export function normalizeTqqCardPath(pathOrUrl?: string | null, characterId?: string): string {
  if (!pathOrUrl) return '';

  let pathStr = String(pathOrUrl).trim();

  // If external URL or data URI, return as-is
  if (pathStr.startsWith('http://') || pathStr.startsWith('https://') || pathStr.startsWith('data:')) {
    return pathStr;
  }

  // Ensure leading slash
  if (!pathStr.startsWith('/')) {
    pathStr = '/' + pathStr;
  }

  // If already pointing to /cards/MDUD/ or other non-TQQ franchise, leave it
  if (pathStr.startsWith('/cards/MDUD/')) {
    return pathStr;
  }

  // If already pointing to /cards/TQQ/
  if (pathStr.startsWith('/cards/TQQ/')) {
    // Check casing of character folder
    const parts = pathStr.split('/');
    // parts: ['', 'cards', 'TQQ', folder, ...fileParts]
    if (parts.length >= 5) {
      const folderKey = parts[3].toLowerCase();
      const canonicalFolder = TQQ_FOLDER_MAP[folderKey];
      if (canonicalFolder && parts[3] !== canonicalFolder) {
        parts[3] = canonicalFolder;
        return parts.join('/');
      }
    }
    return pathStr;
  }

  // If legacy path starting with /cards/<CharacterFolder>/<fileName>
  if (pathStr.startsWith('/cards/')) {
    const afterCards = pathStr.slice('/cards/'.length);
    const slashIdx = afterCards.indexOf('/');
    if (slashIdx !== -1) {
      const folderRaw = afterCards.slice(0, slashIdx);
      const filePart = afterCards.slice(slashIdx + 1);
      const folderKey = folderRaw.toLowerCase();
      const canonicalFolder = TQQ_FOLDER_MAP[folderKey] || folderRaw;
      return `/cards/TQQ/${canonicalFolder}/${filePart}`;
    }
  }

  // If relative or just a filename with characterId provided
  if (characterId) {
    const normalizedKey = characterId.toLowerCase();
    const folder = TQQ_FOLDER_MAP[normalizedKey];
    if (folder) {
      const cleanFileName = pathStr.replace(/^\/+/, '');
      return `/cards/TQQ/${folder}/${cleanFileName}`;
    }
  }

  return pathStr;
}
