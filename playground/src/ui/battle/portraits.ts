import { artUrlFor } from '../../cards/characterArt';
import type { CharacterId } from '../../cards/model';

/** Characters whose first picture does not make a face: Raiha's is a tall poster with her name printed on it. */
const OTHER_SLOT: Readonly<Partial<Record<CharacterId, string>>> = { raiha: 't03' };

/** A picture of a character that is cropped to a round portrait: the first picture, or the one named above. */
export function portraitOf(character: CharacterId): string | undefined {
  return artUrlFor({ character, slot: OTHER_SLOT[character] ?? 't01' }) ?? undefined;
}
