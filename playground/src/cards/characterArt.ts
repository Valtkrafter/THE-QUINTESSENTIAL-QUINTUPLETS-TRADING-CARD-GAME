import type { ArtRef } from './schema';

// Art lives in src/assets/art/<character>/<slot>.jpg (committed, written by tools/import-art.py).
const files = import.meta.glob<string>('../assets/art/*/*.jpg', {
  eager: true,
  query: '?url',
  import: 'default',
});

const ART_PATTERN = /art\/([^/]+)\/([^/]+)\.jpg$/i;

const urlsByKey = new Map<string, string>();
for (const [path, url] of Object.entries(files)) {
  const match = ART_PATTERN.exec(path);
  if (match !== null) {
    urlsByKey.set(`${match[1] ?? ''}/${match[2] ?? ''}`, url);
  }
}

/** The picture of a card, or null when the art folder has not been imported on this machine. */
export function artUrlFor(art: ArtRef): string | null {
  return urlsByKey.get(`${art.character}/${art.slot}`) ?? null;
}
