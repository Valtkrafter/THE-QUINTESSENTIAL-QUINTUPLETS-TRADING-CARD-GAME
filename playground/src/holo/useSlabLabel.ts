import { useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import { CanvasTexture, SRGBColorSpace, type Texture } from 'three';
import { paintSlabLabel, type SlabLabelInfo } from './slabLabel';

/**
 * The paper label of a slab as a texture, or null while its fonts load (or when there is no slab). The old label stays on
 * screen until the new one is ready, and a texture is freed only after the materials have switched away from it.
 */
export function useSlabLabel(info: SlabLabelInfo | null): Texture | null {
  const renderer = useThree((state) => state.gl);
  const [made, setMade] = useState<Texture | null>(null);
  const shownRef = useRef<Texture | null>(null);

  useEffect(() => {
    if (info === null) {
      return undefined;
    }
    let cancelled = false;
    void paintSlabLabel(info).then((canvas) => {
      if (cancelled) {
        return;
      }
      const texture = new CanvasTexture(canvas);
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const previous = shownRef.current;
      shownRef.current = texture;
      setMade(texture);
      if (previous !== null) {
        window.setTimeout(() => previous.dispose(), 500);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [info, renderer]);

  useEffect(
    () => () => {
      shownRef.current?.dispose();
      shownRef.current = null;
    },
    [],
  );

  return info === null ? null : made;
}
