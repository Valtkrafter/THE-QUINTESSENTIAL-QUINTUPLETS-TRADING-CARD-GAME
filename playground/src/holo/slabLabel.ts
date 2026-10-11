// The paper label of a slab, drawn on a 2D canvas: the logo, the card, the four sub-grades and, in a box on the right, the
// score. The 3D slab uses the canvas as a texture and the flat views (the reveal, the fallback without WebGL) show the same
// picture, so a slab looks the same wherever it appears.

import { ensureSlabFonts } from '../cardface/fonts';
import { LATIN } from '../cardface/paint';
import type { GradeBandId } from '../domain/grading';

export interface SlabLabelInfo {
  readonly name: string;
  readonly title: string;
  /** For example "TQQ01 · 007/079 · RR · Rainbow Holo". */
  readonly detail: string;
  readonly date: string;
  /** The score as printed ("9.5", "10"). */
  readonly score: string;
  readonly band: GradeBandId;
  readonly bandLabel: string;
  /** The four sub-grades in print order, for example `{ short: 'CEN', value: '9.7' }`. */
  readonly subs: readonly { readonly short: string; readonly value: string }[];
}

export const LABEL_WIDTH = 1280;
/** The label is 2.62 wide and 0.74 high in the 3D slab; the canvas keeps that shape. */
export const LABEL_HEIGHT = Math.round((LABEL_WIDTH * 0.74) / 2.62);

type Palette = 'gold' | 'silver' | 'paper';

interface Colors {
  readonly backFrom: string;
  readonly backTo: string;
  readonly frameFrom: string;
  readonly frameTo: string;
  readonly text: string;
  readonly soft: string;
  readonly accent: string;
  readonly boxFill: string;
  readonly boxText: string;
  readonly boxAccent: string;
}

const COLORS: Readonly<Record<Palette, Colors>> = {
  gold: {
    backFrom: '#0d0c12',
    backTo: '#1d1827',
    frameFrom: '#f8e7a6',
    frameTo: '#a97b27',
    text: '#f6e7b4',
    soft: 'rgba(246, 231, 180, 0.62)',
    accent: '#e0ad4a',
    boxFill: '#08070b',
    boxText: '#f8dd8e',
    boxAccent: '#e0ad4a',
  },
  silver: {
    backFrom: '#111636',
    backTo: '#1d2556',
    frameFrom: '#dfe4ff',
    frameTo: '#7b87d6',
    text: '#eef0ff',
    soft: 'rgba(222, 228, 255, 0.64)',
    accent: '#a5b4ff',
    boxFill: '#0a0e26',
    boxText: '#ffffff',
    boxAccent: '#a5b4ff',
  },
  paper: {
    backFrom: '#f4f2ea',
    backTo: '#dcd9cc',
    frameFrom: '#8b8a86',
    frameTo: '#5d5c58',
    text: '#1d1c22',
    soft: 'rgba(29, 28, 34, 0.62)',
    accent: '#8a3b3b',
    boxFill: '#25242b',
    boxText: '#f4f2ea',
    boxAccent: '#e6c79c',
  },
};

function paletteOf(band: GradeBandId): Palette {
  if (band === 'pristine') {
    return 'gold';
  }
  return band === 'gem' || band === 'mint' ? 'silver' : 'paper';
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

/** Draws letters with a little extra room between them (the canvas has no portable letter-spacing). Returns the width used. */
function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number, align: 'left' | 'center' = 'left'): number {
  const widths = [...text].map((letter) => ctx.measureText(letter).width);
  const total = widths.reduce((sum, width) => sum + width, 0) + spacing * Math.max(0, widths.length - 1);
  let cursor = align === 'center' ? x - total / 2 : x;
  // Every letter is placed by its left edge, whatever alignment the caller had set.
  const before = ctx.textAlign;
  ctx.textAlign = 'left';
  [...text].forEach((letter, index) => {
    ctx.fillText(letter, cursor, y);
    cursor += (widths[index] ?? 0) + spacing;
  });
  ctx.textAlign = before;
  return total;
}

/** Sets the font to the biggest size, from `start` down to `least`, with which the text fits `maxWidth`. */
function fitFont(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, style: string, start: number, least: number): void {
  let size = start;
  ctx.font = `${style} ${size}px ${LATIN}`;
  while (size > least && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${style} ${size}px ${LATIN}`;
  }
}

/** Paints the label onto a canvas of LABEL_WIDTH x LABEL_HEIGHT. The fonts must be loaded (see paintSlabLabel). */
export function drawSlabLabel(ctx: CanvasRenderingContext2D, info: SlabLabelInfo): void {
  const colors = COLORS[paletteOf(info.band)];
  const width = LABEL_WIDTH;
  const height = LABEL_HEIGHT;

  const back = ctx.createLinearGradient(0, 0, width, height);
  back.addColorStop(0, colors.backFrom);
  back.addColorStop(1, colors.backTo);
  ctx.fillStyle = back;
  ctx.fillRect(0, 0, width, height);

  const frame = ctx.createLinearGradient(0, 0, width, 0);
  frame.addColorStop(0, colors.frameFrom);
  frame.addColorStop(0.5, colors.frameTo);
  frame.addColorStop(1, colors.frameFrom);
  ctx.strokeStyle = frame;
  ctx.lineWidth = 6;
  roundedRect(ctx, 10, 10, width - 20, height - 20, 26);
  ctx.stroke();

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  // Logo column.
  ctx.fillStyle = colors.text;
  ctx.font = `900 92px ${LATIN}`;
  ctx.fillText('TQQ', 52, 140);
  ctx.fillStyle = colors.accent;
  ctx.font = `800 31px ${LATIN}`;
  spaced(ctx, 'GRADING', 56, 186, 7);
  ctx.fillStyle = colors.soft;
  ctx.font = `600 25px ${LATIN}`;
  ctx.fillText(info.date, 56, height - 56);

  ctx.fillStyle = colors.frameTo;
  ctx.globalAlpha = 0.55;
  ctx.fillRect(344, 52, 3, height - 104);
  ctx.globalAlpha = 1;

  // The card.
  const textLeft = 382;
  const textWidth = 540;
  ctx.fillStyle = colors.text;
  fitFont(ctx, info.name, textWidth, '800', 62, 34);
  ctx.fillText(info.name, textLeft, 106);
  ctx.fillStyle = colors.soft;
  fitFont(ctx, `“${info.title}”`, textWidth, 'italic 600', 34, 22);
  ctx.fillText(`“${info.title}”`, textLeft, 156);
  ctx.fillStyle = colors.accent;
  fitFont(ctx, info.detail, textWidth, '700', 28, 18);
  ctx.fillText(info.detail, textLeft, 208);

  // The sub-grades, in a row of four.
  const gap = textWidth / info.subs.length;
  info.subs.forEach((sub, index) => {
    const x = textLeft + index * gap;
    ctx.fillStyle = colors.soft;
    ctx.font = `700 22px ${LATIN}`;
    spaced(ctx, sub.short, x, height - 96, 3);
    ctx.fillStyle = colors.text;
    ctx.font = `800 40px ${LATIN}`;
    ctx.fillText(sub.value, x, height - 52);
  });

  // The score box.
  const boxX = 962;
  const boxY = 34;
  const boxWidth = width - boxX - 34;
  const boxHeight = height - 68;
  ctx.fillStyle = colors.boxFill;
  roundedRect(ctx, boxX, boxY, boxWidth, boxHeight, 22);
  ctx.fill();
  ctx.strokeStyle = frame;
  ctx.lineWidth = 4;
  roundedRect(ctx, boxX, boxY, boxWidth, boxHeight, 22);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = colors.boxText;
  fitFont(ctx, info.score, boxWidth - 40, '900', 176, 90);
  ctx.fillText(info.score, boxX + boxWidth / 2, boxY + 188);
  ctx.fillStyle = colors.boxAccent;
  ctx.font = `800 34px ${LATIN}`;
  spaced(ctx, info.bandLabel.toUpperCase(), boxX + boxWidth / 2, boxY + boxHeight - 36, 4, 'center');
}

/** Loads the fonts and paints the label onto a new canvas. */
export async function paintSlabLabel(info: SlabLabelInfo): Promise<HTMLCanvasElement> {
  await ensureSlabFonts(`${info.name}${info.title}${info.detail}${info.date}${info.bandLabel}${info.score}`);
  const canvas = document.createElement('canvas');
  canvas.width = LABEL_WIDTH;
  canvas.height = LABEL_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (ctx === null) {
    throw new Error('2D canvas context is unavailable.');
  }
  drawSlabLabel(ctx, info);
  return canvas;
}

/** The label as a picture for the flat views of a slab. */
export async function slabLabelUrl(info: SlabLabelInfo): Promise<string> {
  return (await paintSlabLabel(info)).toDataURL('image/png');
}
