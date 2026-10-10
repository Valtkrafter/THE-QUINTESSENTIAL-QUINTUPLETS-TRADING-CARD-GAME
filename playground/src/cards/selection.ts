import type { CardId } from './model';

/** What the playground shows: a catalog card, or one of the user's raw images. */
export type Selection = { readonly kind: 'card'; readonly id: CardId } | { readonly kind: 'art'; readonly id: string };
