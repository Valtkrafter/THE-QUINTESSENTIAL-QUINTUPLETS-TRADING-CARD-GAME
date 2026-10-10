import { STAGES, type Card, type Stage } from '../cards/model';
import { FRAME_BORDER_PX } from '../holo/frames';
import { darken, drawGlyph, lighten, readableOn, withAlpha } from './glyphs';
import {
  FACE_HEIGHT,
  FACE_WIDTH,
  GAP,
  JAPANESE,
  LATIN,
  PAD,
  RADIUS,
  SAFE,
  TEXT_WIDTH,
  TYPE,
  centeredBaseline,
  drawPrimePill,
  drawSignature,
  protect,
  type Painter,
  type Rect,
} from './paint';
import { LIGHT_INK, STATS_SLOT, drawArea, fitArea, metaRow, rulesRows, statsRow } from './rules';

// Classic frame, modelled on the Weiß Schwarz look: a pearl border, art filling the card, a white
// level box top left, a white LP (hit points) box top right, a translucent white text box and a rounded name
// panel, all inset by SAFE. Everything is flat print: solid fills and crisp keylines, no shadows.

const BORDER = FRAME_BORDER_PX.classic;
const INNER: Rect = { x: BORDER, y: BORDER, w: FACE_WIDTH - BORDER * 2, h: FACE_HEIGHT - BORDER * 2 };
const INNER_RADIUS = 20;
const PANEL_X = SAFE;
const PANEL_WIDTH = FACE_WIDTH - SAFE * 2;
const PANEL_BOTTOM = FACE_HEIGHT - SAFE;
/**
 * Fixed height of the rules text box, like a printed template: it never moves. 276px is the tallest
 * content in the current set (two moves, one with a two-line effect). Longer text shrinks, see SCALE_STEPS.
 */
const BOX_HEIGHT_A = 276;
/** Template B (Supporter): the same box without the stats slot, so there is no empty stat gap. */
const BOX_HEIGHT_B = BOX_HEIGHT_A - STATS_SLOT;
const BOX_PAD_Y = 18;
const FOOTER_PAD_Y = 14;
const NAME_ROW = 84;

/** The two corner clusters share one size: a white box with a colour chip underneath. */
const CORNER_W = 132;
const CORNER_BOX_H = 112;
const CHIP_H = 44;
const CHIP_GAP = 8;

const STAGE_LEVEL: Readonly<Record<Stage, number>> = { basic: 1, close: 2, bride: 3, event: 1 };
const INK = LIGHT_INK;
const KEYLINE = 'rgba(27, 24, 36, 0.8)';

/** Pearl border around the art. It takes foil, like the frame of a real foil card. */
function drawBorder(painter: Painter): void {
  const { ctx, accent } = painter;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, FACE_WIDTH, FACE_HEIGHT);
  ctx.roundRect(INNER.x, INNER.y, INNER.w, INNER.h, INNER_RADIUS);
  const pearl = ctx.createLinearGradient(0, 0, FACE_WIDTH, FACE_HEIGHT);
  pearl.addColorStop(0, '#fbfaff');
  pearl.addColorStop(0.35, '#e6e3ee');
  pearl.addColorStop(0.65, '#f7f5fb');
  pearl.addColorStop(1, '#d9d5e4');
  ctx.fillStyle = pearl;
  ctx.fill('evenodd');
  ctx.strokeStyle = withAlpha(accent, 0.95);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(INNER.x, INNER.y, INNER.w, INNER.h, INNER_RADIUS);
  ctx.stroke();
  ctx.restore();
}

/** Printed boxes are flat: a white fill with a crisp dark keyline, no blurred shadow. */
function drawWhitePanel(ctx: CanvasRenderingContext2D, rect: Rect, opacity: number): void {
  ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.w, rect.h, RADIUS);
  ctx.fill();
  ctx.strokeStyle = KEYLINE;
  ctx.lineWidth = 2;
  ctx.stroke();
}

/** Solid accent chip with an ink outline. Holds the stage name, a type glyph, or both. */
function drawChip(painter: Painter, rect: Rect, label: string | null, glyph: Parameters<typeof drawGlyph>[1] | null): void {
  const { ctx, accent } = painter;
  const ink = readableOn(accent);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 12);
  ctx.fill();
  ctx.strokeStyle = KEYLINE;
  ctx.lineWidth = 2;
  ctx.stroke();

  const middle = rect.y + rect.h / 2;
  const glyphSize = label === null ? 38 : 30;
  ctx.font = `900 ${TYPE.label}px ${LATIN}`;
  ctx.letterSpacing = '1px';
  const labelWidth = label === null ? 0 : ctx.measureText(label).width;
  const gap = glyph !== null && label !== null ? 8 : 0;
  const total = (glyph === null ? 0 : glyphSize) + gap + labelWidth;
  let cursor = rect.x + (rect.w - total) / 2;
  if (glyph !== null) {
    drawGlyph(ctx, glyph, cursor + glyphSize / 2, middle, glyphSize, ink);
    cursor += glyphSize + gap;
  }
  if (label !== null) {
    ctx.fillStyle = ink;
    ctx.fillText(label, cursor, centeredBaseline(middle, TYPE.label));
  }
  ctx.letterSpacing = '0px';
}

function stageName(stage: Stage): string {
  return (STAGES.find((entry) => entry.id === stage)?.label ?? '').toUpperCase();
}

/** Top left: "LV.n" box with the stage name chip underneath. PRIME ribbon to the right. */
function drawLevelCluster(painter: Painter, card: Card): void {
  const { ctx } = painter;
  const box = { x: SAFE, y: SAFE, w: CORNER_W, h: CORNER_BOX_H };
  drawWhitePanel(ctx, box, 0.94);

  if (card.kind === 'character') {
    ctx.fillStyle = INK.muted;
    ctx.font = `800 ${TYPE.label}px ${LATIN}`;
    ctx.fillText('STUFE', box.x + 14, box.y + 30);
    ctx.fillStyle = INK.text;
    ctx.textAlign = 'center';
    ctx.font = `900 ${TYPE.level}px ${LATIN}`;
    ctx.fillText(String(STAGE_LEVEL[card.stage]), box.x + box.w / 2 + 12, centeredBaseline(box.y + box.h / 2 + 6, TYPE.level));
    ctx.textAlign = 'left';
  } else {
    drawGlyph(ctx, 'study', box.x + box.w / 2, box.y + box.h / 2, 70, INK.text);
  }

  const chip = { x: box.x, y: box.y + box.h + CHIP_GAP, w: CORNER_W, h: CHIP_H };
  drawChip(painter, chip, card.kind === 'character' ? stageName(card.stage) : 'GEFÄHRTE', null);
  protect(painter, { x: box.x - 4, y: box.y - 4, w: box.w + 8, h: box.h + CHIP_GAP + CHIP_H + 8 }, RADIUS);

  if (card.kind === 'character' && card.prime) {
    protect(painter, drawPrimePill(ctx, box.x + box.w + 14, box.y + (box.h - 42) / 2), 4);
  }
}

/** Top right: HP box with the Heart type chip underneath, mirroring the level cluster. */
function drawHpCluster(painter: Painter, card: Card): void {
  if (card.kind !== 'character') {
    return;
  }
  const { ctx } = painter;
  const box = { x: FACE_WIDTH - SAFE - CORNER_W, y: SAFE, w: CORNER_W, h: CORNER_BOX_H };
  drawWhitePanel(ctx, box, 0.94);

  ctx.fillStyle = INK.muted;
  ctx.font = `800 ${TYPE.label}px ${LATIN}`;
  ctx.fillText('LP', box.x + 14, box.y + 30);

  // Three-digit HP must fit the box: shrink the numeral rather than overflow.
  const number = String(card.hp);
  let size: number = TYPE.hp;
  ctx.font = `900 ${size}px ${LATIN}`;
  while (ctx.measureText(number).width > box.w - 28 && size > 40) {
    size -= 2;
    ctx.font = `900 ${size}px ${LATIN}`;
  }
  ctx.fillStyle = INK.text;
  ctx.textAlign = 'right';
  ctx.fillText(number, box.x + box.w - 14, centeredBaseline(box.y + box.h / 2 + 14, size));
  ctx.textAlign = 'left';

  const chip = { x: box.x, y: box.y + box.h + CHIP_GAP, w: CORNER_W, h: CHIP_H };
  drawChip(painter, chip, null, card.affinity);
  protect(painter, { x: box.x - 4, y: box.y - 4, w: box.w + 8, h: box.h + CHIP_GAP + CHIP_H + 8 }, RADIUS);
}

function drawFooter(painter: Painter, card: Card, panel: Rect): void {
  const { ctx, accent } = painter;
  drawWhitePanel(ctx, panel, 0.93);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(panel.x, panel.y, panel.w, panel.h, RADIUS);
  ctx.clip();
  const stripe = ctx.createLinearGradient(panel.x, 0, panel.x + panel.w, 0);
  stripe.addColorStop(0, accent);
  stripe.addColorStop(1, lighten(accent, 0.6));
  ctx.fillStyle = stripe;
  ctx.fillRect(panel.x, panel.y, panel.w, 5);
  ctx.restore();

  const left = panel.x + PAD;
  const right = panel.x + panel.w - PAD;
  const rowTop = panel.y + FOOTER_PAD_Y;
  const middle = rowTop + NAME_ROW / 2;

  // Title in a darkened accent: 0.45 keeps every Heart colour above 4.5:1 on the panel.
  ctx.fillStyle = darken(accent, 0.45);
  ctx.font = `italic 600 ${TYPE.title}px ${LATIN}`;
  ctx.fillText(`„${card.title}“`, left, centeredBaseline(rowTop + 24, TYPE.title));
  ctx.fillStyle = INK.text;
  ctx.font = `800 ${TYPE.heading}px ${LATIN}`;
  ctx.fillText(card.name.en, left, centeredBaseline(rowTop + 60, TYPE.heading));

  ctx.textAlign = 'right';
  ctx.font = `800 ${TYPE.nameJa}px ${JAPANESE}`;
  ctx.fillText(card.name.ja, right, centeredBaseline(middle, TYPE.nameJa));
  ctx.textAlign = 'left';

  const metaTop = rowTop + NAME_ROW + 10;
  ctx.fillStyle = INK.rule;
  ctx.fillRect(left, metaTop - 6, right - left, 2);
  metaRow(ctx, card, TEXT_WIDTH, INK).draw(left, metaTop);
  protect(painter, panel, RADIUS);
}

export function drawClassicFrame(painter: Painter, card: Card): void {
  const { ctx } = painter;
  const footerHeight = FOOTER_PAD_Y * 2 + NAME_ROW + 10 + 30;
  const footer = { x: PANEL_X, y: PANEL_BOTTOM - footerHeight, w: PANEL_WIDTH, h: footerHeight };
  const boxHeight = card.kind === 'character' ? BOX_HEIGHT_A : BOX_HEIGHT_B;
  const box = { x: PANEL_X, y: footer.y - GAP - boxHeight, w: PANEL_WIDTH, h: boxHeight };

  // Rules text on top, weakness / resistance / retreat pinned to the bottom edge of the box.
  const area = fitArea(
    [],
    (scale) => rulesRows(ctx, card, TEXT_WIDTH, INK, scale),
    card.kind === 'character' ? [statsRow(ctx, card, INK)] : [],
    boxHeight - BOX_PAD_Y * 2,
    card.kind === 'supporter',
  );
  if (!area.fits) {
    console.warn(`Card ${card.id}: rules text overflows the fixed text box even at ${area.scale}x. Shorten it.`);
  }

  if (card.signed) {
    drawSignature(painter, card, box.y);
  }
  drawBorder(painter);
  drawLevelCluster(painter, card);
  drawHpCluster(painter, card);
  drawWhitePanel(ctx, box, 0.84);
  drawArea(ctx, area, box.x + PAD, box.y + BOX_PAD_Y, TEXT_WIDTH, INK);
  protect(painter, box, RADIUS);
  drawFooter(painter, card, footer);
}
