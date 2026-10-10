import { useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import { CanvasTexture, NoColorSpace, type WebGLRenderer } from 'three';
import { artUrlFor } from '../cards/characterArt';
import type { Card, CardId } from '../cards/model';
import type { FrameStyle } from '../holo/settings';
import type { CardTexture } from '../holo/textures';
import { composeCardFace, FACE_HEIGHT, FACE_WIDTH } from './composeCardFace';
import { ensureCardFonts } from './fonts';
import { loadImage } from './images';

export interface ComposedCardTextures {
  readonly face: CardTexture;
  readonly mask: CardTexture;
  /** The card these textures show, so a screen can tell when the textures belong to another card. */
  readonly cardId: CardId;
}

function toTexture(canvas: HTMLCanvasElement, renderer: WebGLRenderer): CardTexture {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = NoColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return { texture, aspect: FACE_WIDTH / FACE_HEIGHT };
}

function dispose(textures: ComposedCardTextures): void {
  textures.face.texture.dispose();
  textures.mask.texture.dispose();
}

/**
 * Renders a catalog card's face and foil mask to textures. The previous card stays on screen until the
 * new one is ready, so switching cards or frame styles never flashes an empty face.
 */
export function useComposedCard(card: Card | null, style: FrameStyle): ComposedCardTextures | null {
  const renderer = useThree((state) => state.gl);
  const [current, setCurrent] = useState<{ readonly id: CardId; readonly textures: ComposedCardTextures } | null>(null);
  const shownRef = useRef<ComposedCardTextures | null>(null);

  useEffect(() => {
    if (card === null) {
      return undefined;
    }
    let cancelled = false;
    const url = artUrlFor(card.art);
    const image = url === null ? Promise.resolve(null) : loadImage(url);
    void Promise.all([image, ensureCardFonts(card)]).then(([loadedImage]) => {
      if (cancelled) {
        return;
      }
      const { face, mask } = composeCardFace(card, loadedImage, style);
      const textures: ComposedCardTextures = { face: toTexture(face, renderer), mask: toTexture(mask, renderer), cardId: card.id };
      const previous = shownRef.current;
      shownRef.current = textures;
      setCurrent({ id: card.id, textures });
      if (previous !== null) {
        // Let the materials switch to the new textures before freeing the old ones.
        window.setTimeout(() => dispose(previous), 500);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [card, style, renderer]);

  useEffect(
    () => () => {
      if (shownRef.current !== null) {
        dispose(shownRef.current);
        shownRef.current = null;
      }
    },
    [],
  );

  return card !== null && current !== null ? current.textures : null;
}
