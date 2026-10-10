import { AFFINITY_INFO } from '../cards/characters';
import { STAGES, type Card, type CharacterCard } from '../cards/model';
import type { FrameStyle } from '../holo/settings';
import { drawClassicFrame } from './classicFrame';
import { darken, drawAffinityCoin, drawGlyph, lighten, readableOn } from './glyphs';
import {
  FACE_HEIGHT,
  FACE_WIDTH,
  JAPANESE,
  LATIN,
  PAD,
  RADIUS,
  SAFE,
  SILVER,
  TEXT_WIDTH,
  TYPE,
  centeredBaseline,
  createCanvas,
  drawArt,
  drawGlass,
  drawPrimePill,
  drawSignature,
  outlinedText,
  protect,
  type Painter,
  type Rect,
} from './paint';
import { LIGHT_INK, ROW_GAP, STATS_SLOT, darkInk, drawArea, fitArea, metaRow, rulesRows, statsRow, type Ink, type Row } from './rules';

export { FACE_HEIGHT, FACE_WIDTH } from './paint';

const MASK_SCALE = 0.5;
const AREA_BOTTOM = FACE_HEIGHT - SAFE;
/**
 * Fixed height of the text area, like a printed template. Two templates: A for Characters (442px, the tallest
 * content in the current set) and B for Supporters.
 */
const AREA_HEIGHT_A = 442;
/** Template B (Supporter): the same area without the stats slot, so there is no empty stat gap. */
const AREA_HEIGHT_B = AREA_HEIGHT_A - STATS_SLOT;
const AREA_PAD_Y = 20;
const HEADER_ROW = 56;
const PAPER = '#f8f5ee';

export interface ComposedFace {
  /** The printed card face. */
  readonly face: HTMLCanvasElement;
  /** Foil mask. Red: holo allowed. Green: gold signature. Blue: text areas, which never take foil. */
  readonly mask: HTMLCanvasElement;
}

function stageLabel(card: Card): { readonly en: string; readonly ja: string } {
  if (card.kind === 'supporter') {
    return { en: 'Supporter', ja: 'サポート' };
  }
  const stage = STAGES.find((entry) => entry.id === card.stage);
  return { en: stage?.label ?? '', ja: stage?.ja ?? '' };
}

// --- Paper, Fade and Glass share one bottom text area; Classic has its own layout in classicFrame.ts.

function headerRow(ctx: CanvasRenderingContext2D, card: Card, nameColor: string, jaColor: string): Row {
  return {
    height: HEADER_ROW,
    ruleBefore: false,
    draw(x, y) {
      const middle = y + HEADER_ROW / 2;
      ctx.fillStyle = nameColor;
      ctx.font = `800 ${TYPE.name}px ${LATIN}`;
      ctx.fillText(card.name.en, x, centeredBaseline(middle, TYPE.name));
      ctx.textAlign = 'right';
      ctx.fillStyle = jaColor;
      ctx.font = `700 ${TYPE.name}px ${JAPANESE}`;
      ctx.fillText(card.name.ja, x + TEXT_WIDTH, centeredBaseline(middle, TYPE.name));
      ctx.textAlign = 'left';
    },
  };
}

function titleRow(ctx: CanvasRenderingContext2D, card: Card, titleColor: string, ink: Ink): Row {
  const height = 34;
  const stage = stageLabel(card);
  return {
    height,
    ruleBefore: false,
    draw(x, y) {
      const middle = y + height / 2;
      ctx.fillStyle = titleColor;
      ctx.font = `italic 600 ${TYPE.title}px ${LATIN}`;
      ctx.fillText(`“${card.title}”`, x, centeredBaseline(middle, TYPE.title));
      ctx.textAlign = 'right';
      ctx.fillStyle = ink.muted;
      ctx.font = `800 ${TYPE.label}px ${JAPANESE}`;
      ctx.fillText(`${stage.en.toUpperCase()} · ${stage.ja}`, x + TEXT_WIDTH, centeredBaseline(middle, TYPE.label));
      ctx.textAlign = 'left';
    },
  };
}

function areaHeightFor(card: Card): number {
  return card.kind === 'character' ? AREA_HEIGHT_A : AREA_HEIGHT_B;
}

/** Name and title pinned to the top, stats and credits pinned to the bottom, rules text in between. */
function buildTextArea(painter: Painter, card: Card, ink: Ink) {
  const { ctx, style, accent } = painter;
  const onBar = style === 'paper';
  const top: Row[] = [
    headerRow(ctx, card, onBar ? '#ffffff' : ink.text, onBar ? 'rgba(255, 255, 255, 0.9)' : ink.muted),
    titleRow(ctx, card, onBar ? darken(accent, 0.45) : lighten(accent, 0.3), ink),
  ];
  const bottom: Row[] = [];
  if (card.kind === 'character') {
    bottom.push(statsRow(ctx, card, ink));
  }
  bottom.push({ ...metaRow(ctx, card, TEXT_WIDTH, ink), ruleBefore: true });
  const area = fitArea(top, (scale) => rulesRows(ctx, card, TEXT_WIDTH, ink, scale), bottom, areaHeightFor(card) - AREA_PAD_Y * 2, card.kind === 'supporter');
  if (!area.fits) {
    console.warn(`Card ${card.id}: rules text overflows the fixed text area even at ${area.scale}x. Shorten it.`);
  }
  return area;
}

function drawTextAreaBackground(painter: Painter, area: Rect): void {
  const { ctx, style, accent } = painter;
  if (style === 'paper') {
    ctx.fillStyle = PAPER;
    ctx.beginPath();
    ctx.roundRect(area.x, area.y, area.w, area.h, RADIUS);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(area.x, area.y, area.w, area.h, RADIUS);
    ctx.clip();
    const bar = ctx.createLinearGradient(area.x, 0, area.x + area.w, 0);
    bar.addColorStop(0, darken(accent, 0.1));
    bar.addColorStop(1, darken(accent, 0.45));
    ctx.fillStyle = bar;
    ctx.fillRect(area.x, area.y, area.w, AREA_PAD_Y + HEADER_ROW + ROW_GAP / 2);
    ctx.restore();
    ctx.strokeStyle = darken(accent, 0.2);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(area.x, area.y, area.w, area.h, RADIUS);
    ctx.stroke();
    protect(painter, area, RADIUS);
  } else if (style === 'fade') {
    const top = area.y - 220;
    const fade = ctx.createLinearGradient(0, top, 0, FACE_HEIGHT);
    fade.addColorStop(0, 'rgba(10, 8, 18, 0)');
    fade.addColorStop(220 / (FACE_HEIGHT - top), 'rgba(10, 8, 18, 0.86)');
    fade.addColorStop(1, 'rgba(8, 6, 14, 0.96)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, top, FACE_WIDTH, FACE_HEIGHT - top);
    const rule = ctx.createLinearGradient(area.x + PAD, 0, area.x + area.w * 0.7, 0);
    rule.addColorStop(0, 'rgba(223, 226, 238, 0.95)');
    rule.addColorStop(1, 'rgba(223, 226, 238, 0)');
    ctx.fillStyle = rule;
    ctx.fillRect(area.x + PAD, area.y + 4, area.w * 0.6, 2);
    protect(painter, { x: 0, y: area.y - 30, w: FACE_WIDTH, h: FACE_HEIGHT - area.y + 30 }, 0);
  } else {
    drawGlass(painter, area, RADIUS + 8);
    protect(painter, area, RADIUS + 8);
  }
}

// --- Top row: stage badge (left), PRIME pill, HP (right).

function hexagonPath(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  ctx.beginPath();
  for (let corner = 0; corner < 6; corner += 1) {
    const angle = -Math.PI / 2 + (corner * Math.PI) / 3;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (corner === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
}

interface Badge {
  /** Right edge of the badge, where the PRIME pill starts. */
  readonly right: number;
  /** Vertical centre of the badge's main shape; HP is aligned to it. */
  readonly centerY: number;
}

function drawBadge(painter: Painter, card: Card): Badge {
  const { ctx, style, accent } = painter;
  const affinity = card.kind === 'character' ? card.affinity : 'study';
  const label = card.kind === 'supporter' ? 'SUPPORT' : stageLabel(card).en.toUpperCase();

  if (style === 'paper') {
    const radius = 64;
    const cx = SAFE + radius;
    const cy = SAFE + radius;
    ctx.save();
    hexagonPath(ctx, cx, cy, radius);
    ctx.fillStyle = accent;
    ctx.fill();
    // Dark outer keyline under a white ring: separates the badge from any art without a blurred shadow.
    ctx.lineJoin = 'round';
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(27, 24, 36, 0.85)';
    ctx.stroke();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.restore();
    drawGlyph(ctx, affinity, cx, cy - 4, 70, readableOn(accent));
    ctx.font = `900 ${TYPE.label}px ${LATIN}`;
    const ribbon = { w: Math.max(ctx.measureText(label).width + 30, 116), h: 34 };
    const ribbonY = cy + radius - 16;
    // Centred under the hexagon, but never past the safe margin.
    const ribbonX = Math.max(cx - ribbon.w / 2, SAFE);
    ctx.fillStyle = '#1d1a26';
    ctx.beginPath();
    ctx.roundRect(ribbonX, ribbonY, ribbon.w, ribbon.h, 8);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(label, ribbonX + ribbon.w / 2, centeredBaseline(ribbonY + ribbon.h / 2, TYPE.label));
    ctx.textAlign = 'left';
    protect(painter, { x: SAFE - 6, y: SAFE - 6, w: radius * 2 + 12, h: ribbonY + ribbon.h - SAFE + 12 }, RADIUS);
    return { right: SAFE + radius * 2, centerY: cy };
  }

  if (style === 'fade') {
    const radius = 56;
    const cx = SAFE + radius;
    const cy = SAFE + radius;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10, 8, 18, 0.5)';
    ctx.fill();
    const ring = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
    ring.addColorStop(0, SILVER.light);
    ring.addColorStop(0.5, SILVER.mid);
    ring.addColorStop(1, SILVER.dark);
    ctx.strokeStyle = ring;
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.restore();
    drawGlyph(ctx, affinity, cx, cy, 64, lighten(accent, 0.2));
    ctx.textAlign = 'center';
    const labelY = cy + radius + 26;
    ctx.font = `900 ${TYPE.label}px ${LATIN}`;
    const labelX = Math.max(cx, SAFE + ctx.measureText(label).width / 2);
    outlinedText(ctx, label, labelX, centeredBaseline(labelY, TYPE.label), `900 ${TYPE.label}px ${LATIN}`, '#ffffff', 5);
    ctx.textAlign = 'left';
    protect(painter, { x: SAFE - 6, y: SAFE - 6, w: radius * 2 + 12, h: labelY + 18 - SAFE + 6 }, RADIUS);
    return { right: SAFE + radius * 2, centerY: cy };
  }

  const rect = { x: SAFE, y: SAFE, w: 136, h: 136 };
  drawGlass(painter, rect, RADIUS + 12);
  drawGlyph(ctx, affinity, rect.x + rect.w / 2, rect.y + 56, 76, lighten(accent, 0.15));
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = `800 ${TYPE.label}px ${LATIN}`;
  ctx.fillText(label, rect.x + rect.w / 2, centeredBaseline(rect.y + 112, TYPE.label));
  ctx.textAlign = 'left';
  protect(painter, rect, RADIUS + 12);
  return { right: rect.x + rect.w, centerY: rect.y + rect.h / 2 };
}

function drawHp(painter: Painter, card: CharacterCard, centerY: number): void {
  const { ctx, style } = painter;
  const color = AFFINITY_INFO[card.affinity].color;
  const right = FACE_WIDTH - SAFE;

  if (style === 'glass') {
    // Sized from its content, laid out right to left: coin, number, label.
    const coinRadius = 26;
    ctx.font = `900 58px ${LATIN}`;
    const numberWidth = ctx.measureText(String(card.hp)).width;
    ctx.font = `800 ${TYPE.stat}px ${LATIN}`;
    const labelWidth = ctx.measureText('HP').width;
    const width = 24 + labelWidth + 10 + numberWidth + 14 + coinRadius * 2 + 18;
    const rect = { x: right - width, y: centerY - 44, w: width, h: 88 };
    drawGlass(painter, rect, 44);
    const coinX = rect.x + rect.w - 18 - coinRadius;
    drawAffinityCoin(ctx, card.affinity, coinX, centerY, coinRadius, color);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 58px ${LATIN}`;
    ctx.fillText(String(card.hp), coinX - coinRadius - 14, centeredBaseline(centerY, 58));
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = `800 ${TYPE.stat}px ${LATIN}`;
    ctx.fillText('HP', rect.x + 24, centeredBaseline(centerY, TYPE.stat) + 4);
    protect(painter, rect, 44);
    return;
  }

  // Paper and Fade: no box, outlined numerals beside the type coin.
  const coinRadius = 30;
  const coinX = right - coinRadius;
  drawAffinityCoin(ctx, card.affinity, coinX, centerY, coinRadius, color);
  const size = style === 'paper' ? 72 : 66;
  const numberFont = `900 ${size}px ${LATIN}`;
  ctx.font = numberFont;
  const number = String(card.hp);
  const numberRight = coinX - coinRadius - 12;
  const numberWidth = ctx.measureText(number).width;
  ctx.textAlign = 'right';
  outlinedText(ctx, number, numberRight, centeredBaseline(centerY, size), numberFont, '#ffffff', style === 'paper' ? 9 : 6);
  outlinedText(ctx, 'HP', numberRight - numberWidth - 10, centeredBaseline(centerY, 28) + 6, `900 28px ${LATIN}`, style === 'paper' ? '#ffffff' : SILVER.label, 6);
  ctx.textAlign = 'left';
  const left = numberRight - numberWidth - 60;
  protect(painter, { x: left, y: centerY - 50, w: right - left + 6, h: 100 }, RADIUS);
}

export function composeCardFace(card: Card, art: HTMLImageElement | null, style: FrameStyle): ComposedFace {
  const [face, ctx] = createCanvas(FACE_WIDTH, FACE_HEIGHT);
  const [maskCanvas, mask] = createCanvas(FACE_WIDTH * MASK_SCALE, FACE_HEIGHT * MASK_SCALE);
  mask.scale(MASK_SCALE, MASK_SCALE);
  mask.fillStyle = 'rgb(255, 0, 0)';
  mask.fillRect(0, 0, FACE_WIDTH, FACE_HEIGHT);

  const accent = AFFINITY_INFO[card.kind === 'character' ? card.affinity : 'study'].color;
  const painter: Painter = { ctx, mask, art, crop: card.crop, accent, style };

  drawArt(painter, ctx);
  if (style === 'classic') {
    drawClassicFrame(painter, card);
    return { face, mask: maskCanvas };
  }

  const topShade = ctx.createLinearGradient(0, 0, 0, 260);
  topShade.addColorStop(0, 'rgba(0, 0, 0, 0.32)');
  topShade.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = topShade;
  ctx.fillRect(0, 0, FACE_WIDTH, 260);

  const ink = style === 'paper' ? LIGHT_INK : darkInk(accent);
  const content = buildTextArea(painter, card, ink);
  const areaHeight = areaHeightFor(card);
  const area = { x: SAFE, y: AREA_BOTTOM - areaHeight, w: FACE_WIDTH - SAFE * 2, h: areaHeight };

  if (card.signed) {
    drawSignature(painter, card, area.y);
  }
  const badge = drawBadge(painter, card);
  if (card.kind === 'character') {
    if (card.prime) {
      protect(painter, drawPrimePill(ctx, badge.right + 14, badge.centerY - 21), 4);
    }
    drawHp(painter, card, badge.centerY);
  }
  drawTextAreaBackground(painter, area);
  drawArea(ctx, content, area.x + PAD, area.y + AREA_PAD_Y, TEXT_WIDTH, ink);
  return { face, mask: maskCanvas };
}
