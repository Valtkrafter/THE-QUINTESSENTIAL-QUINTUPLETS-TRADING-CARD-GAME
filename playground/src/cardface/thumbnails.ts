// Small flat pictures of card faces for the binder, the Dex and the showcase. A screen with 80 cards cannot run 80 WebGL
// views, so each face is painted once with the same code as the 3D card, shrunk, and kept as an image. Next to it comes a
// small mask of the places where foil may shine (not the printed text), so the screens can lay a shimmer over the picture
// that stays out of the writing, like the real foil layer of the 3D card.
// Painting is queued and yields to the browser between cards, so scrolling stays smooth while thumbnails fill in.
// The pictures are WebP: in the browsers tried, encoding JPEG took about a second per card and WebP about 40 ms.

import { artUrlFor } from '../cards/characterArt';
import type { FrameStyle } from '../cards/frameStyle';
import type { Card } from '../cards/model';
import { composeCardFace } from './composeCardFace';
import { ensureCardFonts } from './fonts';
import { loadImage } from './images';

export const THUMBNAIL_WIDTH = 360;
export const THUMBNAIL_HEIGHT = 504;
const FOIL_WIDTH = 180;
const FOIL_HEIGHT = 252;

export interface Thumbnail {
  /** The picture of the card face. */
  readonly face: string;
  /** A picture that is solid where foil may shine and clear on the printed text, or null when it could not be made. */
  readonly foil: string | null;
}

const cache = new Map<string, Promise<Thumbnail | null>>();
let queue: Promise<unknown> = Promise.resolve();

function nextTask(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * The foil mask of a face as a picture with an alpha channel (what CSS masks use). The composed mask is red where foil is
 * allowed and gets blue added on text areas, so "red minus blue" is exactly how much foil may show.
 */
async function foilMaskUrl(mask: HTMLCanvasElement): Promise<string | null> {
  const canvas = document.createElement('canvas');
  canvas.width = FOIL_WIDTH;
  canvas.height = FOIL_HEIGHT;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (context === null) {
    return null;
  }
  context.imageSmoothingQuality = 'high';
  context.drawImage(mask, 0, 0, FOIL_WIDTH, FOIL_HEIGHT);
  const picture = context.getImageData(0, 0, FOIL_WIDTH, FOIL_HEIGHT);
  const { data } = picture;
  for (let index = 0; index < data.length; index += 4) {
    const allowed = Math.max(0, (data[index] ?? 0) - (data[index + 2] ?? 0));
    data[index] = 255;
    data[index + 1] = 255;
    data[index + 2] = 255;
    data[index + 3] = allowed;
  }
  context.putImageData(picture, 0, 0);
  const blob = await toBlob(canvas, 'image/png');
  return blob === null ? null : URL.createObjectURL(blob);
}

async function paint(card: Card, style: FrameStyle): Promise<Thumbnail | null> {
  const url = artUrlFor(card.art);
  const [image] = await Promise.all([url === null ? Promise.resolve(null) : loadImage(url), ensureCardFonts(card)]);
  const { face, mask } = composeCardFace(card, image, style);
  const canvas = document.createElement('canvas');
  canvas.width = THUMBNAIL_WIDTH;
  canvas.height = THUMBNAIL_HEIGHT;
  const context = canvas.getContext('2d');
  if (context === null) {
    return null;
  }
  context.imageSmoothingQuality = 'high';
  context.drawImage(face, 0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
  const blob = await toBlob(canvas, 'image/webp', 0.92);
  if (blob === null) {
    return null;
  }
  // The shimmer is a bonus: a card without it is still a complete picture.
  const foil = await foilMaskUrl(mask).catch(() => null);
  return { face: URL.createObjectURL(blob), foil };
}

/** The picture of a card face in the given frame style. The same promise is returned for repeated requests. */
export function requestThumbnail(card: Card, style: FrameStyle): Promise<Thumbnail | null> {
  const key = `${style}:${card.id}`;
  let pending = cache.get(key);
  if (pending === undefined) {
    pending = queue.then(nextTask).then(() => paint(card, style));
    queue = pending.catch(() => undefined);
    cache.set(key, pending);
  }
  return pending;
}
