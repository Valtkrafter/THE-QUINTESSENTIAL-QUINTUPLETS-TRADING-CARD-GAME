import { CHARACTERS } from '../cards/characters';
import { STAGES, type Card } from '../cards/model';

// Fonts are bundled (see main.tsx imports), so a card face looks identical on every machine.
export const LATIN_FAMILY = 'Inter Variable';
export const JAPANESE_FAMILY = 'Noto Sans JP Variable';

/** Characters every face can draw regardless of the card: labels, digits and typographic symbols. */
const COMMON_TEXT = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÄÖÜäöüß0123456789 ×−—–“”’‘„·•.,:;!?/()+-%《》';

/** Every string a card face may draw: the card's own text plus the cast data and stage names it looks up. */
function textOf(card: Card): string {
  const character = CHARACTERS[card.character];
  const stages = STAGES.map((stage) => `${stage.label}${stage.ja}`).join('');
  const traits = character.traits.map((trait) => `${trait.en}${trait.ja}`).join('');
  return `${JSON.stringify(card)}${character.name.en}${character.name.ja}${traits}${stages}サポート${COMMON_TEXT}`;
}

/**
 * Resolves once the faces needed to draw `card` are loaded. Canvas text silently falls back to another
 * font if the requested one is not ready, so card faces must never be composed before this resolves.
 * The variable fonts split into unicode-range files; passing the text loads only the ranges it needs.
 */
export async function ensureCardFonts(card: Card): Promise<void> {
  const text = textOf(card);
  await Promise.all([
    document.fonts.load(`800 26px "${LATIN_FAMILY}"`, text),
    document.fonts.load(`italic 600 26px "${LATIN_FAMILY}"`, text),
    document.fonts.load(`800 26px "${JAPANESE_FAMILY}"`, text),
  ]);
}

/** Loads the Latin face used by the playground's own canvas labels (gallery captions, empty-art pattern). */
export async function ensureLabelFont(): Promise<void> {
  await document.fonts.load(`600 34px "${LATIN_FAMILY}"`, COMMON_TEXT);
}
