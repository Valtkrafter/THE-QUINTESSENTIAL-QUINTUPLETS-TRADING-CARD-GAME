import { useCallback, useSyncExternalStore } from 'react';

/** True while the browser window matches a CSS media query, and it follows the window when it is resized. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}

/** The width under which the screens fold their side columns under the main column (the same limit the style sheets use). */
export const NARROW_QUERY = '(max-width: 1000px)';
