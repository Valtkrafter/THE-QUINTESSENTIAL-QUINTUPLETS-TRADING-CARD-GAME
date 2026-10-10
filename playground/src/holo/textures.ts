import { useThree } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import { CanvasTexture, NoColorSpace, SRGBColorSpace, TextureLoader, Vector4, type Texture } from 'three';
import { LATIN } from '../cardface/paint';
import { ART_BOX } from './finishes';
import type { ArtFit } from './settings';

export interface CardTexture {
  readonly texture: Texture;
  /** Image width / height. */
  readonly aspect: number;
}

/**
 * Loads an image for a card shader. The shaders blend in display space, so the texture is left
 * undecoded (NoColorSpace) and its sRGB values reach the shader as-is.
 */
export function useCardTexture(url: string | null): CardTexture | null {
  const renderer = useThree((state) => state.gl);
  // Keyed by URL so a stale result is ignored without resetting state inside the effect.
  const [loaded, setLoaded] = useState<{ readonly url: string; readonly value: CardTexture } | null>(null);

  useEffect(() => {
    if (url === null) {
      return undefined;
    }
    let cancelled = false;
    let texture: Texture | null = null;
    new TextureLoader().load(
      url,
      (result) => {
        if (cancelled) {
          result.dispose();
          return;
        }
        result.colorSpace = NoColorSpace;
        result.anisotropy = renderer.capabilities.getMaxAnisotropy();
        result.needsUpdate = true;
        texture = result;
        const { naturalWidth, naturalHeight } = result.image;
        setLoaded({ url, value: { texture: result, aspect: naturalHeight > 0 ? naturalWidth / naturalHeight : 1 } });
      },
      undefined,
      () => {
        if (!cancelled) {
          console.warn(`Could not load card image: ${url}`);
        }
      },
    );
    return () => {
      cancelled = true;
      texture?.dispose();
    };
  }, [url, renderer]);

  return loaded !== null && loaded.url === url ? loaded.value : null;
}

/**
 * uv scale/offset that maps the card onto the image, like CSS `object-fit`.
 * `focus` picks the crop position along the overflowing axis: 0 = top/left edge, 1 = bottom/right edge.
 */
export function fitTransform(imageAspect: number, cardAspect: number, fit: ArtFit, focus: number, target: Vector4): Vector4 {
  const imageIsWider = imageAspect > cardAspect;
  if (fit === 'contain') {
    if (imageIsWider) {
      const scale = imageAspect / cardAspect;
      return target.set(1, scale, 0, (1 - scale) / 2);
    }
    const scale = cardAspect / imageAspect;
    return target.set(scale, 1, (1 - scale) / 2, 0);
  }
  if (imageIsWider) {
    const scale = cardAspect / imageAspect;
    return target.set(scale, 1, (1 - scale) * focus, 0);
  }
  // uv y runs bottom-up, so showing the top of the image means the largest offset.
  const scale = imageAspect / cardAspect;
  return target.set(1, scale, 0, (1 - scale) * (1 - focus));
}

const EMPTY_WIDTH = 750;
const EMPTY_HEIGHT = 1050;

/** Neutral test pattern shown until art is supplied. Tonal range lets the brightness-based masks show. */
export function createEmptyArtTexture(): CardTexture {
  const canvas = document.createElement('canvas');
  canvas.width = EMPTY_WIDTH;
  canvas.height = EMPTY_HEIGHT;
  const context = canvas.getContext('2d');
  if (context === null) {
    throw new Error('2D canvas context is unavailable.');
  }

  const background = context.createLinearGradient(0, 0, 0, EMPTY_HEIGHT);
  background.addColorStop(0, '#ecebf3');
  background.addColorStop(0.55, '#8f8ba6');
  background.addColorStop(1, '#1f1d2a');
  context.fillStyle = background;
  context.fillRect(0, 0, EMPTY_WIDTH, EMPTY_HEIGHT);

  const boxLeft = ART_BOX.minU * EMPTY_WIDTH;
  const boxTop = (1 - ART_BOX.maxV) * EMPTY_HEIGHT;
  const boxWidth = (ART_BOX.maxU - ART_BOX.minU) * EMPTY_WIDTH;
  const boxHeight = (ART_BOX.maxV - ART_BOX.minV) * EMPTY_HEIGHT;
  const sphere = context.createRadialGradient(
    boxLeft + boxWidth * 0.4,
    boxTop + boxHeight * 0.35,
    10,
    boxLeft + boxWidth * 0.5,
    boxTop + boxHeight * 0.5,
    boxWidth * 0.7,
  );
  sphere.addColorStop(0, '#ffffff');
  sphere.addColorStop(0.5, '#a9a6bb');
  sphere.addColorStop(1, '#3a3748');
  context.fillStyle = sphere;
  context.fillRect(boxLeft, boxTop, boxWidth, boxHeight);

  context.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  context.lineWidth = 2;
  for (let x = boxLeft; x <= boxLeft + boxWidth; x += boxWidth / 8) {
    context.beginPath();
    context.moveTo(x, boxTop);
    context.lineTo(x, boxTop + boxHeight);
    context.stroke();
  }
  for (let y = boxTop; y <= boxTop + boxHeight; y += boxHeight / 6) {
    context.beginPath();
    context.moveTo(boxLeft, y);
    context.lineTo(boxLeft + boxWidth, y);
    context.stroke();
  }
  context.strokeStyle = 'rgba(20, 18, 30, 0.85)';
  context.lineWidth = 6;
  context.strokeRect(boxLeft, boxTop, boxWidth, boxHeight);

  context.fillStyle = '#f3f1fa';
  context.textAlign = 'center';
  context.font = `600 46px ${LATIN}`;
  context.fillText('No card art loaded', EMPTY_WIDTH / 2, 760);
  context.font = `500 30px ${LATIN}`;
  context.fillText('Drop images onto the page', EMPTY_WIDTH / 2, 815);
  context.fillText('or add them to src/assets/cards', EMPTY_WIDTH / 2, 855);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = NoColorSpace;
  return { texture, aspect: EMPTY_WIDTH / EMPTY_HEIGHT };
}

/** Soft elliptical drop shadow, drawn once and shared. */
export function createShadowTexture(): Texture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (context === null) {
    throw new Error('2D canvas context is unavailable.');
  }
  const gradient = context.createRadialGradient(size / 2, size / 2, size * 0.18, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** Finish name drawn under each card in the gallery. */
export function createLabelTexture(text: string): Texture {
  const width = 512;
  const height = 64;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (context === null) {
    throw new Error('2D canvas context is unavailable.');
  }
  context.fillStyle = 'rgba(232, 230, 242, 0.92)';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `600 34px ${LATIN}`;
  context.fillText(text, width / 2, height / 2);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
