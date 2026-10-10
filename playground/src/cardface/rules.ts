import { SET_SIZE } from '../cards/catalog';
import { AFFINITY_INFO, CHARACTERS } from '../cards/characters';
import { RARITIES, type Ability, type Affinity, type Card, type CharacterCard, type Move } from '../cards/model';
import { drawAffinityCoin, drawRarityMarks, lighten, withAlpha } from './glyphs';
import { JAPANESE, LATIN, TYPE, centeredBaseline, drawTag, wrapText } from './paint';

// Rules-text rows shared by every frame style, so abilities, moves and stats read the same everywhere.
// A row is measured when built and drawn later. Text areas have a FIXED size (like a printed template):
// rules text shrinks in steps to fit, and the area never moves.

export interface Ink {
  readonly text: string;
  readonly muted: string;
  readonly rule: string;
  readonly abilityName: string;
}

export const LIGHT_INK: Ink = {
  text: '#1b1824',
  muted: '#544e66',
  rule: 'rgba(27, 24, 36, 0.14)',
  abilityName: '#b8283f',
};

export function darkInk(accent: string): Ink {
  return {
    text: '#ffffff',
    muted: 'rgba(255, 255, 255, 0.78)',
    rule: withAlpha(lighten(accent, 0.2), 0.45),
    abilityName: '#ff9aa8',
  };
}

export interface Row {
  readonly height: number;
  /** Draw a hairline rule in the gap above this row. */
  readonly ruleBefore: boolean;
  draw(x: number, y: number): void;
}

/** Vertical space between rows; rules sit in its middle. */
export const ROW_GAP = 14;
/** Height of the weakness / resistance / retreat row. */
export const STATS_ROW_HEIGHT = 40;
/** Space a Character template reserves for the stats row. Supporter template B does not have it. */
export const STATS_SLOT = STATS_ROW_HEIGHT + ROW_GAP;
// Tag fills chosen so white text passes 4.5:1 (was 4.47 and 3.02).
const ABILITY_RED = '#c8283f';
const SUPPORTER_ORANGE = '#b45309';
const COIN_RADIUS = 19;
const COIN_STEP = 44;

/**
 * Font scales tried, largest first, when rules text does not fit its fixed area. The smallest step
 * still leaves body text at about 20px.
 */
export const SCALE_STEPS = [1, 0.94, 0.88, 0.82, 0.76] as const;

function px(value: number, scale: number): number {
  return Math.round(value * scale);
}

function ruled(row: Row): Row {
  return { ...row, ruleBefore: true };
}

export function paragraphRow(ctx: CanvasRenderingContext2D, text: string, width: number, color: string, size: number = TYPE.body, weight = 500, scale = 1): Row {
  const fontSize = px(size, scale);
  const lineHeight = Math.round(fontSize * 1.31);
  ctx.font = `${weight} ${fontSize}px ${LATIN}`;
  const lines = wrapText(ctx, text, width);
  return {
    height: lines.length * lineHeight,
    ruleBefore: false,
    draw(x, y) {
      ctx.fillStyle = color;
      ctx.font = `${weight} ${fontSize}px ${LATIN}`;
      lines.forEach((line, index) => ctx.fillText(line, x, centeredBaseline(y + index * lineHeight + lineHeight / 2, fontSize)));
    },
  };
}

function abilityRow(ctx: CanvasRenderingContext2D, ability: Ability, width: number, ink: Ink, scale: number): Row {
  const head = px(40, scale);
  const nameSize = px(TYPE.abilityName, scale);
  const body = paragraphRow(ctx, ability.text, width, ink.text, TYPE.body, 500, scale);
  return {
    height: head + 4 + body.height,
    ruleBefore: false,
    draw(x, y) {
      const tagWidth = drawTag(ctx, 'ABILITY', x, y + head / 2, ABILITY_RED, px(TYPE.label, scale));
      ctx.fillStyle = ink.abilityName;
      ctx.font = `800 ${nameSize}px ${LATIN}`;
      ctx.fillText(ability.name, x + tagWidth + 12, centeredBaseline(y + head / 2, nameSize));
      body.draw(x, y + head + 4);
    },
  };
}

function moveRow(ctx: CanvasRenderingContext2D, move: Move, width: number, ink: Ink, scale: number): Row {
  const head = px(50, scale);
  const coinRadius = px(COIN_RADIUS, scale);
  const coinStep = px(COIN_STEP, scale);
  const nameSize = px(TYPE.moveName, scale);
  const damageSize = px(TYPE.damage, scale);
  const body = move.text === undefined ? null : paragraphRow(ctx, move.text, width, ink.muted, TYPE.body, 500, scale);
  return {
    height: head + (body === null ? 0 : 4 + body.height),
    ruleBefore: false,
    draw(x, y) {
      const middle = y + head / 2;
      move.cost.forEach((affinity, index) => {
        drawAffinityCoin(ctx, affinity, x + coinRadius + index * coinStep, middle, coinRadius, AFFINITY_INFO[affinity].color);
      });
      ctx.fillStyle = ink.text;
      ctx.font = `800 ${nameSize}px ${LATIN}`;
      ctx.fillText(move.name, x + Math.max(move.cost.length, 1) * coinStep + 6, centeredBaseline(middle, nameSize));
      if (move.damage !== null) {
        ctx.textAlign = 'right';
        ctx.font = `900 ${damageSize}px ${LATIN}`;
        ctx.fillText(`${move.damage}${move.damageSuffix ?? ''}`, x + width, centeredBaseline(middle, damageSize));
        ctx.textAlign = 'left';
      }
      body?.draw(x, y + head + 4);
    },
  };
}

function supporterRows(ctx: CanvasRenderingContext2D, effect: string, width: number, ink: Ink, scale: number): Row[] {
  const head = px(40, scale);
  const labelSize = px(TYPE.label, scale);
  return [
    {
      height: head,
      ruleBefore: false,
      draw(x, y) {
        const tagWidth = drawTag(ctx, 'SUPPORTER', x, y + head / 2, SUPPORTER_ORANGE, labelSize);
        ctx.fillStyle = ink.muted;
        ctx.font = `italic 500 ${labelSize}px ${LATIN}`;
        ctx.fillText('Only 1 Supporter per turn.', x + tagWidth + 12, centeredBaseline(y + head / 2, labelSize));
      },
    },
    paragraphRow(ctx, effect, width, ink.text, TYPE.effect, 600, scale),
  ];
}

/** Ability and moves for characters, rule line and effect for Supporters. `scale` shrinks fonts and row heights. */
export function rulesRows(ctx: CanvasRenderingContext2D, card: Card, width: number, ink: Ink, scale = 1): Row[] {
  if (card.kind === 'supporter') {
    return supporterRows(ctx, card.text, width, ink, scale);
  }
  const rows: Row[] = [];
  if (card.ability !== undefined) {
    rows.push(abilityRow(ctx, card.ability, width, ink, scale));
  }
  for (const move of card.moves) {
    rows.push(rows.length === 0 ? moveRow(ctx, move, width, ink, scale) : ruled(moveRow(ctx, move, width, ink, scale)));
  }
  return rows;
}

/** Weakness, resistance and retreat cost, spelled out. */
export function statsRow(ctx: CanvasRenderingContext2D, card: CharacterCard, ink: Ink): Row {
  const height = STATS_ROW_HEIGHT;
  return {
    height,
    ruleBefore: true,
    draw(x, y) {
      const middle = y + height / 2;
      let cursor = x;
      const label = (text: string) => {
        ctx.fillStyle = ink.muted;
        ctx.font = `800 ${TYPE.label}px ${LATIN}`;
        ctx.fillText(text, cursor, centeredBaseline(middle, TYPE.label));
        cursor += ctx.measureText(text).width + 10;
      };
      const coin = (affinity: Affinity, radius: number) => {
        drawAffinityCoin(ctx, affinity, cursor + radius, middle, radius, AFFINITY_INFO[affinity].color);
        cursor += radius * 2 + 6;
      };
      const value = (text: string) => {
        ctx.fillStyle = ink.text;
        ctx.font = `800 ${TYPE.stat}px ${LATIN}`;
        ctx.fillText(text, cursor, centeredBaseline(middle, TYPE.stat));
        cursor += ctx.measureText(text).width + 30;
      };

      label('WEAKNESS');
      if (card.weakness === null) {
        value('—');
      } else {
        coin(card.weakness, 17);
        value('×2');
      }
      label('RESISTANCE');
      if (card.resistance === null) {
        value('—');
      } else {
        coin(card.resistance, 17);
        value('−30');
      }
      label('RETREAT');
      for (let index = 0; index < card.retreat; index += 1) {
        coin('study', 16);
      }
    },
  };
}

/** Set code, rarity and illustrator on the left; traits on the right. */
export function metaRow(ctx: CanvasRenderingContext2D, card: Card, width: number, ink: Ink): Row {
  const height = 30;
  return {
    height,
    ruleBefore: false,
    draw(x, y) {
      const middle = y + height / 2;
      const rarity = RARITIES.find((entry) => entry.id === card.rarity);
      const code = `${card.set}-${String(card.number).padStart(3, '0')}/${SET_SIZE}  ${card.rarity}`;
      ctx.fillStyle = ink.text;
      ctx.font = `800 ${TYPE.meta}px ${LATIN}`;
      ctx.fillText(code, x, centeredBaseline(middle, TYPE.meta));
      let cursor = x + ctx.measureText(code).width + 10;
      if (rarity !== undefined) {
        cursor += drawRarityMarks(ctx, rarity.mark.shape, rarity.mark.count, cursor, middle, 20, ink.text) + 18;
      }
      ctx.fillStyle = ink.muted;
      ctx.font = `600 ${TYPE.credit}px ${LATIN}`;
      ctx.fillText(`Illus. ${card.illustrator}`, cursor, centeredBaseline(middle, TYPE.credit));

      ctx.textAlign = 'right';
      ctx.fillStyle = ink.text;
      ctx.font = `700 ${TYPE.meta}px ${JAPANESE}`;
      ctx.fillText(CHARACTERS[card.character].traits.map((trait) => `《${trait.ja}》`).join(''), x + width, centeredBaseline(middle, TYPE.meta));
      ctx.textAlign = 'left';
    },
  };
}

export function stackHeight(rows: readonly Row[]): number {
  return rows.reduce((sum, row) => sum + row.height, 0) + Math.max(rows.length - 1, 0) * ROW_GAP;
}

export function drawStack(ctx: CanvasRenderingContext2D, rows: readonly Row[], x: number, y: number, width: number, ink: Ink): void {
  let cursor = y;
  rows.forEach((row, index) => {
    if (index > 0) {
      if (row.ruleBefore) {
        ctx.fillStyle = ink.rule;
        ctx.fillRect(x, cursor + ROW_GAP / 2 - 1, width, 2);
      }
      cursor += ROW_GAP;
    }
    row.draw(x, cursor);
    cursor += row.height;
  });
}

/**
 * A text area of fixed inner height in three regions: `top` rows pinned to the top, `bottom` rows pinned
 * to the bottom, and rules text in between. Only the rules text adapts (by font scale), never the area.
 */
export interface FixedArea {
  readonly top: readonly Row[];
  readonly rules: readonly Row[];
  readonly bottom: readonly Row[];
  readonly innerHeight: number;
  /** Font scale chosen for the rules text; 1 is full size. */
  readonly scale: number;
  /** False when even the smallest scale overflows. That is a content bug: shorten the card text. */
  readonly fits: boolean;
  /** Centre the rules text in the space between `top` and `bottom` instead of top-aligning it. */
  readonly centerRules: boolean;
}

export function fitArea(
  top: readonly Row[],
  buildRules: (scale: number) => Row[],
  bottom: readonly Row[],
  innerHeight: number,
  centerRules = false,
): FixedArea {
  const reserved = (top.length > 0 ? stackHeight(top) + ROW_GAP : 0) + (bottom.length > 0 ? stackHeight(bottom) + ROW_GAP : 0);
  const available = innerHeight - reserved;
  let rules: Row[] = [];
  let scale: number = SCALE_STEPS[0];
  for (const step of SCALE_STEPS) {
    scale = step;
    rules = buildRules(step);
    if (stackHeight(rules) <= available) {
      return { top, rules, bottom, innerHeight, scale, fits: true, centerRules };
    }
  }
  return { top, rules, bottom, innerHeight, scale, fits: false, centerRules };
}

export function drawArea(ctx: CanvasRenderingContext2D, area: FixedArea, x: number, y: number, width: number, ink: Ink): void {
  const rule = (at: number) => {
    ctx.fillStyle = ink.rule;
    ctx.fillRect(x, at - 1, width, 2);
  };
  let cursor = y;
  if (area.top.length > 0) {
    drawStack(ctx, area.top, x, cursor, width, ink);
    cursor += stackHeight(area.top) + ROW_GAP;
    rule(cursor - ROW_GAP / 2);
  }
  const bottomTop = y + area.innerHeight - (area.bottom.length > 0 ? stackHeight(area.bottom) : 0);
  if (area.centerRules) {
    const space = bottomTop - (area.bottom.length > 0 ? ROW_GAP : 0) - cursor;
    cursor += Math.max(0, (space - stackHeight(area.rules)) / 2);
  }
  drawStack(ctx, area.rules, x, cursor, width, ink);
  if (area.bottom.length > 0) {
    rule(bottomTop - ROW_GAP / 2);
    drawStack(ctx, area.bottom, x, bottomTop, width, ink);
  }
}
