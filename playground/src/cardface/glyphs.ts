import type { Affinity, RarityShape } from '../cards/model';

/** Draws an affinity symbol centred on (x, y). `size` is roughly the glyph's width. */
export function drawGlyph(ctx: CanvasRenderingContext2D, affinity: Affinity, x: number, y: number, size: number, color: string): void {
  const s = size;
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.beginPath();
  switch (affinity) {
    case 'heart':
      ctx.moveTo(x, y + 0.36 * s);
      ctx.bezierCurveTo(x - 0.62 * s, y - 0.02 * s, x - 0.36 * s, y - 0.58 * s, x, y - 0.2 * s);
      ctx.bezierCurveTo(x + 0.36 * s, y - 0.58 * s, x + 0.62 * s, y - 0.02 * s, x, y + 0.36 * s);
      ctx.fill();
      break;
    case 'butterfly':
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(x + side * 0.24 * s, y - 0.14 * s, 0.24 * s, 0.18 * s, side * -0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + side * 0.18 * s, y + 0.2 * s, 0.16 * s, 0.12 * s, side * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.roundRect(x - 0.035 * s, y - 0.3 * s, 0.07 * s, 0.6 * s, 0.035 * s);
      ctx.fill();
      break;
    case 'melody':
      ctx.lineWidth = 0.09 * s;
      ctx.arc(x, y + 0.05 * s, 0.32 * s, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.roundRect(x + side * 0.34 * s - 0.09 * s, y - 0.02 * s, 0.18 * s, 0.34 * s, 0.07 * s);
        ctx.fill();
      }
      break;
    case 'clover':
      for (let leaf = 0; leaf < 4; leaf += 1) {
        const angle = (leaf * Math.PI) / 2 - Math.PI / 4;
        ctx.beginPath();
        ctx.arc(x + Math.cos(angle) * 0.2 * s, y - 0.08 * s + Math.sin(angle) * 0.2 * s, 0.21 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.lineWidth = 0.09 * s;
      ctx.moveTo(x, y + 0.06 * s);
      ctx.quadraticCurveTo(x + 0.05 * s, y + 0.3 * s, x + 0.2 * s, y + 0.46 * s);
      ctx.stroke();
      break;
    case 'star':
      for (let point = 0; point < 10; point += 1) {
        const radius = point % 2 === 0 ? 0.44 * s : 0.19 * s;
        const angle = -Math.PI / 2 + (point * Math.PI) / 5;
        const px = x + Math.cos(angle) * radius;
        const py = y + 0.03 * s + Math.sin(angle) * radius;
        if (point === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
      ctx.fill();
      break;
    case 'study':
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x, y - 0.18 * s);
        ctx.quadraticCurveTo(x + side * 0.2 * s, y - 0.3 * s, x + side * 0.42 * s, y - 0.24 * s);
        ctx.lineTo(x + side * 0.42 * s, y + 0.26 * s);
        ctx.quadraticCurveTo(x + side * 0.2 * s, y + 0.2 * s, x, y + 0.32 * s);
        ctx.closePath();
        ctx.fill();
      }
      break;
  }
  ctx.restore();
}

/**
 * Rarity marks as vector shapes, so every machine draws the same stamp (text symbols come from three
 * different fonts). Returns the width used. Marks are `size` px tall and `size * 1.3` apart.
 */
export function drawRarityMarks(ctx: CanvasRenderingContext2D, shape: RarityShape, count: number, x: number, centerY: number, size: number, color: string): number {
  const step = size * 1.3;
  ctx.save();
  ctx.fillStyle = color;
  for (let index = 0; index < count; index += 1) {
    const cx = x + size / 2 + index * step;
    ctx.beginPath();
    switch (shape) {
      case 'circle':
        ctx.arc(cx, centerY, size * 0.36, 0, Math.PI * 2);
        break;
      case 'diamond':
        ctx.moveTo(cx, centerY - size / 2);
        ctx.lineTo(cx + size * 0.4, centerY);
        ctx.lineTo(cx, centerY + size / 2);
        ctx.lineTo(cx - size * 0.4, centerY);
        ctx.closePath();
        break;
      case 'star':
        for (let point = 0; point < 10; point += 1) {
          const radius = point % 2 === 0 ? size * 0.52 : size * 0.22;
          const angle = -Math.PI / 2 + (point * Math.PI) / 5;
          const px = cx + Math.cos(angle) * radius;
          const py = centerY + 0.04 * size + Math.sin(angle) * radius;
          if (point === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.closePath();
        break;
      case 'sparkle':
        // Four-point star with concave sides.
        ctx.moveTo(cx, centerY - size * 0.56);
        ctx.quadraticCurveTo(cx, centerY, cx + size * 0.56, centerY);
        ctx.quadraticCurveTo(cx, centerY, cx, centerY + size * 0.56);
        ctx.quadraticCurveTo(cx, centerY, cx - size * 0.56, centerY);
        ctx.quadraticCurveTo(cx, centerY, cx, centerY - size * 0.56);
        ctx.closePath();
        break;
    }
    ctx.fill();
  }
  ctx.restore();
  return size + (count - 1) * step;
}

/** Print ink used for outlines and for glyphs on light fills. */
export const PRINT_INK = '#1b1824';

function relativeLuminance(hex: string): number {
  const channel = (value: number): number => {
    const unit = value / 255;
    return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = parseHex(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two `#rrggbb` colours (1 to 21). */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((p, q) => q - p) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

/** White or print ink, whichever reads better on `fill`. All six Heart colours pick ink (at least 5.6:1). */
export function readableOn(fill: string): string {
  return contrastRatio('#ffffff', fill) >= contrastRatio(PRINT_INK, fill) ? '#ffffff' : PRINT_INK;
}

/** Flat colour disc with a crisp ink outline and a high-contrast glyph, like an energy symbol on a printed card. */
export function drawAffinityCoin(ctx: CanvasRenderingContext2D, affinity: Affinity, x: number, y: number, radius: number, color: string): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = Math.max(2, radius * 0.12);
  ctx.strokeStyle = PRINT_INK;
  ctx.stroke();
  ctx.restore();
  drawGlyph(ctx, affinity, x, y, radius * 1.5, readableOn(color));
}

function parseHex(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function darken(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex).map((channel) => Math.round(channel * (1 - amount))) as [number, number, number];
  return `rgb(${r}, ${g}, ${b})`;
}

export function lighten(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex).map((channel) => Math.round(channel + (255 - channel) * amount)) as [number, number, number];
  return `rgb(${r}, ${g}, ${b})`;
}
