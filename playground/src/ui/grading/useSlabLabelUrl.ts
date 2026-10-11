import { useEffect, useState } from 'react';
import { slabLabelUrl, type SlabLabelInfo } from '../../holo/slabLabel';

/** The paper label of a slab as a picture, or null while it is being painted (or when there is no slab). */
export function useSlabLabelUrl(info: SlabLabelInfo | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (info === null) {
      return undefined;
    }
    let cancelled = false;
    void slabLabelUrl(info).then((made) => {
      if (!cancelled) {
        setUrl(made);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [info]);

  return info === null ? null : url;
}
