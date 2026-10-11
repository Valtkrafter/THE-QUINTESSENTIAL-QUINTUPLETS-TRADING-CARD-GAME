// The slab: the sealed clear case a graded card lives in. Three parts sit around the card inside the same pivot, so they turn,
// tilt and flip with it: a dark insert with a window for the card, the paper label above the window, and a shell of clear
// plastic over everything. The plastic is a small shader (see slab.frag.glsl), not real glass, so it is one cheap pass
// and looks the same on every graphics card.

import { DoubleSide, ExtrudeGeometry, FrontSide, MeshBasicMaterial, PlaneGeometry, ShaderMaterial, ShapeGeometry, Vector3, type Texture } from 'three';
import type { GradeBandId } from '../domain/grading';
import { CARD_CORNER_RADIUS, CARD_HEIGHT, CARD_WIDTH, createRoundedRectShape } from './cardGeometry';
import { slabFragmentShader, slabVertexShader } from './shaders';

const SIDE_MARGIN = 0.27;
const BOTTOM_MARGIN = 0.27;
const TOP_MARGIN = 0.24;
const LABEL_GAP = 0.1;
export const SLAB_LABEL_HEIGHT = 0.74;

export const SLAB_WIDTH = CARD_WIDTH + 2 * SIDE_MARGIN;
export const SLAB_HEIGHT = BOTTOM_MARGIN + CARD_HEIGHT + LABEL_GAP + SLAB_LABEL_HEIGHT + TOP_MARGIN;
export const SLAB_DEPTH = 0.26;
/** How far the middle of the slab lies above the middle of the card. */
export const SLAB_CENTER_Y = SLAB_HEIGHT / 2 - (CARD_HEIGHT / 2 + BOTTOM_MARGIN);
export const SLAB_LABEL_WIDTH = SLAB_WIDTH - 0.4;
/** Where the middle of the label sits (the card's middle is 0). */
export const SLAB_LABEL_Y = CARD_HEIGHT / 2 + LABEL_GAP + SLAB_LABEL_HEIGHT / 2;

const SHELL_RADIUS = 0.2;
const BEVEL = 0.05;
const INSERT_INSET = 0.085;
/** The window of the insert is a little smaller than the card, so the card cannot slip out. */
const WINDOW_GAP = 0.03;
const INSERT_COLOR = '#1b1f31';

/** The glow along the edges of the plastic, by band: gold for a perfect card, ice blue for a gem, plain for the rest. */
const RIM: Readonly<Record<GradeBandId, readonly [number, number, number]>> = {
  pristine: [1, 0.85, 0.54],
  gem: [0.74, 0.82, 1],
  mint: [0.81, 0.88, 1],
  near: [0.87, 0.91, 0.96],
  excellent: [0.9, 0.93, 0.96],
  good: [0.9, 0.9, 0.9],
  played: [0.86, 0.86, 0.86],
};

export interface SlabGeometries {
  readonly shell: ExtrudeGeometry;
  readonly insert: ShapeGeometry;
  readonly label: PlaneGeometry;
}

function createShellGeometry(): ExtrudeGeometry {
  const shape = createRoundedRectShape(SLAB_WIDTH - 2 * BEVEL, SLAB_HEIGHT - 2 * BEVEL, SHELL_RADIUS - BEVEL, SLAB_CENTER_Y);
  const depth = SLAB_DEPTH - 2 * BEVEL;
  const geometry = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL,
    bevelSegments: 4,
    curveSegments: 14,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function createInsertGeometry(): ShapeGeometry {
  const outer = createRoundedRectShape(SLAB_WIDTH - 2 * INSERT_INSET, SLAB_HEIGHT - 2 * INSERT_INSET, SHELL_RADIUS - INSERT_INSET + 0.05, SLAB_CENTER_Y);
  outer.holes.push(createRoundedRectShape(CARD_WIDTH - 2 * WINDOW_GAP, CARD_HEIGHT - 2 * WINDOW_GAP, CARD_CORNER_RADIUS));
  return new ShapeGeometry(outer, 12);
}

let cached: SlabGeometries | null = null;

/** Shared by every slab; created on first use. */
export function getSlabGeometries(): SlabGeometries {
  if (cached === null) {
    cached = { shell: createShellGeometry(), insert: createInsertGeometry(), label: new PlaneGeometry(SLAB_LABEL_WIDTH, SLAB_LABEL_HEIGHT) };
  }
  return cached;
}

export interface SlabMaterials {
  readonly plastic: ShaderMaterial;
  readonly insert: MeshBasicMaterial;
  readonly label: MeshBasicMaterial;
  dispose(): void;
}

/** The materials of one slab. `light` is the scene's light position; the plastic reads it every frame, so it must be the same vector. */
export function createSlabMaterials(label: Texture, band: GradeBandId, light: Vector3): SlabMaterials {
  const plastic = new ShaderMaterial({
    vertexShader: slabVertexShader,
    fragmentShader: slabFragmentShader,
    uniforms: { uLight: { value: light }, uRim: { value: new Vector3(...RIM[band]) } },
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });
  const insert = new MeshBasicMaterial({ color: INSERT_COLOR, side: DoubleSide });
  const labelMaterial = new MeshBasicMaterial({ map: label, side: FrontSide });
  return {
    plastic,
    insert,
    label: labelMaterial,
    dispose() {
      plastic.dispose();
      insert.dispose();
      labelMaterial.dispose();
    },
  };
}

/** The space around the card that a slab takes up: what the viewer frames, and how far the pointer and the shadow reach. */
export const SLAB_EXTENT = {
  width: SLAB_WIDTH,
  height: SLAB_HEIGHT,
  centerY: SLAB_CENTER_Y,
} as const;
