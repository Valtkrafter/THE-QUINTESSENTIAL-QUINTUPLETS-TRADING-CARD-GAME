import { artUrlFor } from '../../cards/characterArt';
import type { CharacterId } from '../../cards/model';

/** The first picture of a character, used as a portrait. */
export function portraitOf(character: CharacterId): string | undefined {
  return artUrlFor({ character, slot: 't01' }) ?? undefined;
}
