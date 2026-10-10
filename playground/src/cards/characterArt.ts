import type { ArtKey } from './model';

// Art lives in src/assets/characters/<character>/<n>.jpg (git-ignored, copied from the local reference folder).
const files = import.meta.glob<string>('../assets/characters/*/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const ART_PATTERN = /characters\/([^/]+)\/(\d+)\.[a-z]+$/i;

const urlsByKey = new Map<string, string>();
for (const [path, url] of Object.entries(files)) {
  const match = ART_PATTERN.exec(path);
  if (match !== null) {
    urlsByKey.set(`${match[1] ?? ''}/${Number(match[2])}`, url);
  }
}

export function artUrlFor(key: ArtKey): string | null {
  return urlsByKey.get(key) ?? null;
}
