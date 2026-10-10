import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

// Layer rule of the project: lower layers never import higher ones, and the rules layers never touch React or three.js.
// `domain` and `packs` hold game rules; `cards` holds the card model and catalog.

const SRC = join(import.meta.dirname, '.');

const UI_LIBRARIES = ['react', 'react-dom', 'three', '@react-three/fiber', 'zustand', 'wouter'];
const PRESENTATION_FOLDERS = ['ui', 'scene', 'holo', 'cardface', 'state'];

const RULES: readonly { readonly folder: string; readonly forbidden: readonly string[] }[] = [
  { folder: 'domain', forbidden: [...UI_LIBRARIES, ...PRESENTATION_FOLDERS, 'cards', 'packs'] },
  { folder: 'cards', forbidden: [...UI_LIBRARIES, ...PRESENTATION_FOLDERS, 'packs'] },
  { folder: 'packs', forbidden: [...UI_LIBRARIES, ...PRESENTATION_FOLDERS] },
];

function sourceFiles(folder: string): string[] {
  const root = join(SRC, folder);
  const found: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) {
        found.push(full);
      }
    }
  };
  walk(root);
  return found;
}

function importsOf(file: string): string[] {
  const text = readFileSync(file, 'utf8');
  return [...text.matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g)].map((match) => match[1] ?? '');
}

/** The top-level src folder or package an import points to, as seen from `file`. */
function target(file: string, specifier: string): string {
  if (!specifier.startsWith('.')) {
    return specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : (specifier.split('/')[0] ?? specifier);
  }
  const resolved = relative(SRC, join(file, '..', specifier));
  return resolved.split(sep)[0] ?? resolved;
}

describe('layer rules', () => {
  for (const rule of RULES) {
    it(`${rule.folder} imports nothing from a higher layer or a UI library`, () => {
      const violations: string[] = [];
      for (const file of sourceFiles(rule.folder)) {
        for (const specifier of importsOf(file)) {
          const to = target(file, specifier);
          if (to !== rule.folder && rule.forbidden.includes(to)) {
            violations.push(`${relative(SRC, file)} imports ${specifier}`);
          }
        }
      }
      expect(violations).toEqual([]);
    });
  }

  it('does not use Math.random in the rules layers (use the seeded Rng)', () => {
    const offenders = RULES.flatMap((rule) => sourceFiles(rule.folder))
      .filter((file) => /Math\.random\s*\(/.test(readFileSync(file, 'utf8')))
      .map((file) => relative(SRC, file));
    expect(offenders).toEqual([]);
  });
});
