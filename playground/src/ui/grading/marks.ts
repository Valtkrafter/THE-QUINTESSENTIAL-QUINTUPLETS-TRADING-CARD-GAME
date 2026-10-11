/** The four hidden marks of a copy, in the order they are shown and printed: centering, corners, edges, surface. */
export const MARKS = ['centering', 'corners', 'edges', 'surface'] as const;

export type Mark = (typeof MARKS)[number];
