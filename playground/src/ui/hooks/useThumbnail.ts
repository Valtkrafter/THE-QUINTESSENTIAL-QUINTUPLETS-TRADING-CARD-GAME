import { useEffect, useRef, useState, type RefObject } from 'react';
import { requestThumbnail, type Thumbnail } from '../../cardface/thumbnails';
import type { FrameStyle } from '../../cards/frameStyle';
import type { Card } from '../../cards/model';
import { usePreferences } from '../../state/app';

/** Becomes true once the element has come near the screen, and stays true. Lets a long grid paint only what is seen. */
export function useNearScreen<T extends Element>(margin = 600): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  // Without IntersectionObserver (very old browsers) everything counts as near.
  const [near, setNear] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const element = ref.current;
    if (element === null || near) {
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
        }
      },
      { rootMargin: `${margin}px 0px` },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [near, margin]);
  return [ref, near];
}

/** The flat picture of a card face in the chosen frame style (and its foil mask), or null while it is still being painted. */
export function useThumbnail(card: Card, wanted: boolean, styleOverride?: FrameStyle): Thumbnail | null {
  const preferences = usePreferences();
  const frameStyle = styleOverride ?? preferences.frameStyle;
  const key = `${frameStyle}:${card.id}`;
  const [loaded, setLoaded] = useState<{ readonly key: string; readonly thumbnail: Thumbnail | null } | null>(null);

  useEffect(() => {
    if (!wanted) {
      return undefined;
    }
    let cancelled = false;
    requestThumbnail(card, frameStyle).then(
      (thumbnail) => {
        if (!cancelled) {
          setLoaded({ key, thumbnail });
        }
      },
      () => {
        if (!cancelled) {
          setLoaded({ key, thumbnail: null });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [card, frameStyle, key, wanted]);

  return loaded !== null && loaded.key === key ? loaded.thumbnail : null;
}
