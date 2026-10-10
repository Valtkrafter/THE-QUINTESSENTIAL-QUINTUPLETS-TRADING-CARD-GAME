import type { ArtCrop, Card } from '../cards/model';
import type { FrameStyle } from '../holo/settings';
import { JAPANESE_FAMILY, LATIN_FAMILY } from './fonts';
import { SIGNATURES } from './signatureData';
import { lighten, withAlpha } from './glyphs';

// Shared drawing helpers for every card frame style. Coordinates are face pixels.

/** The face keeps the card's 5:7 ratio so it maps 1:1 onto the card mesh. */
export const FACE_WIDTH = 1000;
export const FACE_HEIGHT = 1400;

/**
 * Layout tokens shared by every frame style. The card mesh rounds its corners with a 48px radius,
 * so nothing is placed closer than SAFE to the face edge.
 */
export const SAFE = 40;
/** Gap between stacked panels. */
export const GAP = 12;
/** Corner radius of panels and boxes. */
export const RADIUS = 16;
/** Horizontal padding inside panels. */
export const PAD = 24;
/** Width available for text inside a full-width panel. */
export const TEXT_WIDTH = FACE_WIDTH - SAFE * 2 - PAD * 2;

/** Type scale in face pixels. Rules text is sized like a printed card (about 2.5mm on a 63mm card). */
export const TYPE = {
  credit: 18,
  label: 20,
  meta: 20,
  title: 26,
  body: 26,
  stat: 26,
  /** Supporter effect text: Template B is built around it, so it is set larger than rules text. */
  effect: 32,
  abilityName: 32,
  moveName: 32,
  /** English name in the Classic name panel. */
  heading: 32,
  damage: 46,
  /** Name in the Paper, Fade and Glass headers. */
  name: 40,
  /** Japanese name in the Classic name panel. */
  nameJa: 50,
  hp: 56,
  level: 86,
} as const;

/** Baseline that vertically centres text of `size` on `centerY`. */
export function centeredBaseline(centerY: number, size: number): number {
  return centerY + size * 0.36;
}

/**
 * Polished silver, used where the Fade frame used to use gold. True gold is reserved for hot-stamped
 * signatures and Ichika's Heart colour.
 */
export const SILVER = { light: '#f4f5fa', mid: '#a4a9bd', dark: '#6e7388', label: '#dfe2ee' } as const;

export const LATIN = `"${LATIN_FAMILY}", sans-serif`;
export const JAPANESE = `"${JAPANESE_FAMILY}", "${LATIN_FAMILY}", sans-serif`;
/** Largest area a signature plate may occupy on the face (face px). */
const PLATE_MAX_WIDTH = 440;
const PLATE_MAX_HEIGHT = 210;

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface Painter {
  readonly ctx: CanvasRenderingContext2D;
  /** Foil mask. Red: holo allowed. Green: gold signature. Blue: text areas, which never take foil. */
  readonly mask: CanvasRenderingContext2D;
  readonly art: HTMLImageElement | null;
  readonly crop: ArtCrop;
  readonly accent: string;
  readonly style: FrameStyle;
}

export function createCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (context === null) {
    throw new Error('2D canvas context is unavailable.');
  }
  return [canvas, context];
}

/** Full-bleed art framed by the card's crop. When zoomed out, a blurred copy fills the rest. */
export function drawArt(painter: Painter, ctx: CanvasRenderingContext2D): void {
  const { art, crop, accent } = painter;
  if (art === null || art.naturalWidth === 0) {
    const gradient = ctx.createLinearGradient(0, 0, FACE_WIDTH, FACE_HEIGHT);
    gradient.addColorStop(0, lighten(accent, 0.55));
    gradient.addColorStop(1, '#2a2438');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, FACE_WIDTH, FACE_HEIGHT);
    return;
  }
  const cover = Math.max(FACE_WIDTH / art.naturalWidth, FACE_HEIGHT / art.naturalHeight);
  const scale = cover * crop.zoom;
  const width = art.naturalWidth * scale;
  const height = art.naturalHeight * scale;
  if (width < FACE_WIDTH - 0.5 || height < FACE_HEIGHT - 0.5) {
    const fill = cover * 1.15;
    ctx.save();
    ctx.filter = 'blur(36px) saturate(1.2) brightness(0.92)';
    ctx.drawImage(art, (FACE_WIDTH - art.naturalWidth * fill) / 2, (FACE_HEIGHT - art.naturalHeight * fill) / 2, art.naturalWidth * fill, art.naturalHeight * fill);
    ctx.restore();
  }
  ctx.drawImage(art, (FACE_WIDTH - width) * crop.x, (FACE_HEIGHT - height) * crop.y, width, height);
}

/** Marks a region as text: no foil of any kind is drawn there. */
export function protect(painter: Painter, rect: Rect, radius: number | number[]): void {
  const { mask } = painter;
  mask.save();
  mask.globalCompositeOperation = 'lighter';
  mask.fillStyle = 'rgb(0, 0, 255)';
  mask.beginPath();
  mask.roundRect(rect.x, rect.y, rect.w, rect.h, radius);
  mask.fill();
  mask.restore();
}

/** Frosted glass: blurred copy of the art behind a tinted pane with an accent rim. */
export function drawGlass(painter: Painter, rect: Rect, radius: number): void {
  const { ctx, accent } = painter;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.w, rect.h, radius);
  ctx.clip();
  ctx.filter = 'blur(18px) saturate(1.25)';
  drawArt(painter, ctx);
  ctx.filter = 'none';
  ctx.fillStyle = 'rgba(14, 12, 26, 0.58)';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const sheen = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
  sheen.addColorStop(0.3, 'rgba(255, 255, 255, 0.03)');
  sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();

  ctx.save();
  ctx.shadowColor = withAlpha(accent, 0.9);
  ctx.shadowBlur = 20;
  ctx.strokeStyle = withAlpha(accent, 0.85);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.w, rect.h, radius);
  ctx.stroke();
  ctx.restore();
}

const CJK = /[\u3000-\u9fff\uff00-\uffef]/;
/** Punctuation that must not start a line (kinsoku): it hangs at the end of the previous line instead. */
const NO_LINE_START = '、。，．・！？）」』】〕〉》ー…';

/**
 * Splits text into wrap units: Latin words keep their trailing space, and every CJK character is its own
 * unit, because Japanese has no spaces to break on.
 */
function wrapUnits(text: string): string[] {
  const units: string[] = [];
  for (const chunk of text.match(/\S+\s*|\s+/g) ?? []) {
    if (!CJK.test(chunk)) {
      units.push(chunk);
    } else {
      units.push(...(chunk.match(/[A-Za-z0-9'’.,%×−+-]+|[\s\S]/gu) ?? []));
    }
  }
  return units;
}

export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const unit of wrapUnits(text)) {
    const candidate = line + unit;
    const hangs = unit.length === 1 && NO_LINE_START.includes(unit);
    if (line !== '' && !hangs && ctx.measureText(candidate.trimEnd()).width > maxWidth) {
      lines.push(line.trimEnd());
      line = unit.trimStart();
    } else {
      line = candidate;
    }
  }
  if (line !== '') {
    lines.push(line.trimEnd());
  }
  return lines;
}

/** Solid label pill centred on `centerY`; returns its width. The pill scales with the font `size`. */
export function drawTag(ctx: CanvasRenderingContext2D, label: string, x: number, centerY: number, color: string, size: number = TYPE.label): number {
  ctx.font = `800 ${size}px ${LATIN}`;
  const width = ctx.measureText(label).width + size * 1.2;
  const height = size * 1.55;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, centerY - height / 2, width, height, size * 0.3);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(label, x + size * 0.6, centeredBaseline(centerY, size));
  return width;
}

/** Text with a dark outline, readable on any art without a box behind it. */
export function outlinedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, font: string, fill: string, outline: number): void {
  ctx.save();
  ctx.font = font;
  ctx.lineJoin = 'round';
  ctx.lineWidth = outline;
  ctx.strokeStyle = 'rgba(14, 11, 24, 0.82)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/**
 * PRIME marker: a dark obsidian ribbon with a swallowtail end and a thin silver rim. It is deliberately
 * not gold, so true gold stays reserved for hot-stamped signatures and Ichika's Heart colour.
 */
export function drawPrimePill(ctx: CanvasRenderingContext2D, x: number, y: number): Rect {
  const width = 132;
  const height = 42;
  const notch = 13;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x + width - notch, y + height / 2);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x, y + height);
  ctx.closePath();
  ctx.fillStyle = '#14121c';
  ctx.fill();
  const rim = ctx.createLinearGradient(x, y, x + width, y);
  rim.addColorStop(0, '#f2f0f8');
  rim.addColorStop(0.5, '#8c88a0');
  rim.addColorStop(1, '#f2f0f8');
  ctx.lineJoin = 'miter';
  ctx.lineWidth = 2;
  ctx.strokeStyle = rim;
  ctx.stroke();
  ctx.fillStyle = '#eceaf4';
  ctx.textAlign = 'center';
  ctx.font = `900 ${TYPE.label}px ${LATIN}`;
  ctx.letterSpacing = '3px';
  ctx.fillText('PRIME', x + (width - notch) / 2 + 2, centeredBaseline(y + height / 2, TYPE.label));
  ctx.restore();
  return { x, y, w: width, h: height };
}

const plateCache = new Map<string, Path2D[]>();

function platePaths(character: Card['character']): Path2D[] {
  let paths = plateCache.get(character);
  if (paths === undefined) {
    paths = SIGNATURES[character].strokes.map((d) => new Path2D(d));
    plateCache.set(character, paths);
  }
  return paths;
}

/** Pen angle (degrees) and flatness of the broad nib: strokes along the nib's axis come out thin, across it thick. */
const NIB_ANGLE = 32;
const NIB_FLATNESS = 0.42;
const NIB_WIDTH = 8.5;

/**
 * Strokes the plate with a slanted broad nib, like an engraved stamping plate. The nib is a circle drawn
 * in a squashed coordinate system: the path is mapped through the inverse of that squash first, so the
 * result is an elliptical pen swept along the original path.
 */
function strokePlate(target: CanvasRenderingContext2D, paths: readonly Path2D[], x: number, y: number, scale: number, style: string | CanvasGradient, extra: number): void {
  const nib = new DOMMatrix().rotateSelf(NIB_ANGLE).scaleSelf(1, NIB_FLATNESS).rotateSelf(-NIB_ANGLE);
  const inverse = nib.inverse();
  target.save();
  target.translate(x, y);
  target.scale(scale, scale);
  target.transform(nib.a, nib.b, nib.c, nib.d, nib.e, nib.f);
  target.lineCap = 'round';
  target.lineJoin = 'round';
  target.lineWidth = NIB_WIDTH + extra;
  target.strokeStyle = style;
  for (const path of paths) {
    const mapped = new Path2D();
    mapped.addPath(path, inverse);
    target.stroke(mapped);
  }
  target.restore();
}

/**
 * Invented autograph from vector plate data (see tools/generate-signatures.py): gold on the face, green in
 * the foil mask. Lower right of the art, just above the text area, so it never crosses a face.
 */
export function drawSignature(painter: Painter, card: Card, textTop: number): void {
  const { ctx, mask } = painter;
  const plate = SIGNATURES[card.character];
  const paths = platePaths(card.character);
  const scale = Math.min(PLATE_MAX_WIDTH / plate.width, PLATE_MAX_HEIGHT / plate.height);
  const x = Math.min(FACE_WIDTH * 0.62 + (plate.width * scale) / 2, FACE_WIDTH - SAFE) - plate.width * scale;
  const y = textTop - 26 - plate.height * scale;

  const gold = ctx.createLinearGradient(x, y, x + plate.width * scale, y + plate.height * scale);
  gold.addColorStop(0, '#fff3c4');
  gold.addColorStop(0.45, '#e2b24a');
  gold.addColorStop(1, '#a8701a');
  // Crisp dark keyline first (no blurred shadow), so the foil stays legible on light art.
  strokePlate(ctx, paths, x, y, scale, 'rgba(58, 34, 6, 0.8)', 7);
  strokePlate(ctx, paths, x, y, scale, gold, 0);

  mask.save();
  mask.globalCompositeOperation = 'lighter';
  strokePlate(mask, paths, x, y, scale, 'rgb(0, 255, 0)', 0);
  mask.restore();
}
