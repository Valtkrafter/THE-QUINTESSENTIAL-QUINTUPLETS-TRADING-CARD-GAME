// Small flat pictures of card faces for the binder, the Dex and the showcase. A screen with 80 cards cannot run 80 WebGL
// views, so each face is painted once with the same code as the 3D card, shrunk, and kept as an image.
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

const cache = new Map<string, Promise<string | null>>();
let queue: Promise<unknown> = Promise.resolve();

function nextTask(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

async function paint(card: Card, style: FrameStyle): Promise<string | null> {
  const url = artUrlFor(card.art);
  const [image] = await Promise.all([url === null ? Promise.resolve(null) : loadImage(url), ensureCardFonts(card)]);
  const { face } = composeCardFace(card, image, style);
  const canvas = document.createElement('canvas');
  canvas.width = THUMBNAIL_WIDTH;
  canvas.height = THUMBNAIL_HEIGHT;
  const context = canvas.getContext('2d');
  if (context === null) {
    return null;
  }
  context.imageSmoothingQuality = 'high';
  context.drawImage(face, 0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.92));
  return blob === null ? null : URL.createObjectURL(blob);
}

/** The picture of a card face in the given frame style. The same promise is returned for repeated requests. */
export function requestThumbnail(card: Card, style: FrameStyle): Promise<string | null> {
  const key = `${style}:${card.id}`;
  let pending = cache.get(key);
  if (pending === undefined) {
    pending = queue.then(nextTask).then(() => paint(card, style));
    queue = pending.catch(() => undefined);
    cache.set(key, pending);
  }
  return pending;
}
