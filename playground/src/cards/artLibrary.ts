export interface CardArt {
  readonly id: string;
  readonly name: string;
  readonly artUrl: string;
  readonly maskUrl: string | null;
}

export interface ArtLibrary {
  readonly arts: readonly CardArt[];
  readonly backUrl: string | null;
}

export interface LibraryUpdate {
  readonly library: ArtLibrary;
  /** The art to select after the update, or null to keep the current selection. */
  readonly selectId: string | null;
}

type ImageRole = 'art' | 'mask' | 'back';

interface ParsedImageName {
  readonly key: string;
  readonly role: ImageRole;
}

const MASK_SUFFIX = /\.mask$/i;
const ROLE_ORDER: Readonly<Record<ImageRole, number>> = { art: 0, mask: 1, back: 2 };

const folderImages = import.meta.glob<string>('../assets/cards/*.{png,jpg,jpeg,webp,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
});

let droppedCount = 0;

/** `miku.png` is art, `miku.mask.png` is its foil mask, `back.png` is the card back. */
export function parseImageName(fileName: string): ParsedImageName {
  const baseName = fileName.replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '');
  if (MASK_SUFFIX.test(baseName)) {
    return { key: baseName.replace(MASK_SUFFIX, ''), role: 'mask' };
  }
  if (baseName.toLowerCase() === 'back') {
    return { key: baseName, role: 'back' };
  }
  return { key: baseName, role: 'art' };
}

/** Images in src/assets/cards, discovered at build time (and on dev-server reload). */
export function loadFolderLibrary(): ArtLibrary {
  const artUrls = new Map<string, string>();
  const maskUrls = new Map<string, string>();
  let backUrl: string | null = null;
  for (const [path, url] of Object.entries(folderImages)) {
    const { key, role } = parseImageName(path);
    if (role === 'back') {
      backUrl = url;
    } else if (role === 'mask') {
      maskUrls.set(key, url);
    } else {
      artUrls.set(key, url);
    }
  }
  const arts = [...artUrls.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([key, url]): CardArt => ({ id: `folder:${key}`, name: key, artUrl: url, maskUrl: maskUrls.get(key) ?? null }));
  return { arts, backUrl };
}

/**
 * Adds dropped or picked files. Art is added before masks so a mask dropped together with its art
 * finds it; a mask with no matching art name attaches to the selected art.
 */
export function addFilesToLibrary(library: ArtLibrary, files: readonly File[], selectedId: string | null): LibraryUpdate {
  const ordered = files
    .map((file) => ({ file, parsed: parseImageName(file.name) }))
    .sort((a, b) => ROLE_ORDER[a.parsed.role] - ROLE_ORDER[b.parsed.role]);

  const arts: CardArt[] = [...library.arts];
  let backUrl = library.backUrl;
  let selectId: string | null = null;

  for (const { file, parsed } of ordered) {
    const url = URL.createObjectURL(file);
    if (parsed.role === 'back') {
      backUrl = url;
    } else if (parsed.role === 'mask') {
      const byName = arts.findLastIndex((art) => art.name === parsed.key);
      const fallbackId = selectId ?? selectedId;
      const target = byName !== -1 ? byName : arts.findIndex((art) => art.id === fallbackId);
      const existing = arts[target];
      if (existing === undefined) {
        URL.revokeObjectURL(url);
      } else {
        arts[target] = { ...existing, maskUrl: url };
      }
    } else {
      droppedCount += 1;
      const art: CardArt = { id: `dropped:${droppedCount}:${parsed.key}`, name: parsed.key, artUrl: url, maskUrl: null };
      arts.push(art);
      selectId = art.id;
    }
  }

  return { library: { arts, backUrl }, selectId };
}
