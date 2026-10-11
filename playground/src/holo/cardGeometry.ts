import { ExtrudeGeometry, Shape, ShapeGeometry } from 'three';

// World units keep the 63 x 88 mm proportions of a standard trading card.
export const CARD_WIDTH = 2.5;
export const CARD_HEIGHT = 3.5;
export const CARD_THICKNESS = 0.024;
export const CARD_CORNER_RADIUS = 0.12;
export const CARD_ASPECT = CARD_WIDTH / CARD_HEIGHT;

const CURVE_SEGMENTS = 10;

export interface CardGeometries {
  readonly front: ShapeGeometry;
  readonly back: ShapeGeometry;
  readonly edge: ExtrudeGeometry;
}

/** A rectangle with rounded corners, centred on the origin (or on `centerY` above it). */
export function createRoundedRectShape(width: number, height: number, radius: number, centerY = 0): Shape {
  const left = -width / 2;
  const bottom = centerY - height / 2;
  const right = left + width;
  const top = bottom + height;
  const shape = new Shape();
  shape.moveTo(left + radius, bottom);
  shape.lineTo(right - radius, bottom);
  shape.absarc(right - radius, bottom + radius, radius, -Math.PI / 2, 0, false);
  shape.lineTo(right, top - radius);
  shape.absarc(right - radius, top - radius, radius, 0, Math.PI / 2, false);
  shape.lineTo(left + radius, top);
  shape.absarc(left + radius, top - radius, radius, Math.PI / 2, Math.PI, false);
  shape.lineTo(left, bottom + radius);
  shape.absarc(left + radius, bottom + radius, radius, Math.PI, Math.PI * 1.5, false);
  return shape;
}

/** ShapeGeometry UVs are raw shape coordinates; remap them to 0..1 across the card. */
function createFaceGeometry(shape: Shape, faceBackwards: boolean): ShapeGeometry {
  const geometry = new ShapeGeometry(shape, CURVE_SEGMENTS);
  const positions = geometry.getAttribute('position');
  const uvs = geometry.getAttribute('uv');
  for (let index = 0; index < positions.count; index += 1) {
    uvs.setXY(index, positions.getX(index) / CARD_WIDTH + 0.5, positions.getY(index) / CARD_HEIGHT + 0.5);
  }
  uvs.needsUpdate = true;
  if (faceBackwards) {
    geometry.rotateY(Math.PI);
  }
  return geometry;
}

let cachedGeometries: CardGeometries | null = null;

/** Shared by every card; created on first use. */
export function getCardGeometries(): CardGeometries {
  if (cachedGeometries === null) {
    const shape = createRoundedRectShape(CARD_WIDTH, CARD_HEIGHT, CARD_CORNER_RADIUS);
    const edge = new ExtrudeGeometry(shape, {
      depth: CARD_THICKNESS,
      bevelEnabled: false,
      curveSegments: CURVE_SEGMENTS,
    });
    edge.translate(0, 0, -CARD_THICKNESS / 2);
    cachedGeometries = {
      front: createFaceGeometry(shape, false),
      back: createFaceGeometry(shape, true),
      edge,
    };
  }
  return cachedGeometries;
}
