// A flat ribbon of light that follows a list of points and always turns its face to the camera. The shooting star's trail
// and each of the five threads are ribbons.

import { BufferAttribute, BufferGeometry, Color, DynamicDrawUsage, Mesh, ShaderMaterial, Vector3 } from 'three';
import { planeVertex, trailFragment } from '../shaders';
import { additiveMaterial, uniform } from './materials';

export interface RibbonUniforms {
  [name: string]: { value: unknown };
  uTime: { value: number };
  uColor: { value: Color };
  uCore: { value: Color };
  uIntensity: { value: number };
  uRainbow: { value: number };
  uSeed: { value: number };
}

export class Ribbon {
  readonly mesh: Mesh<BufferGeometry, ShaderMaterial>;
  readonly uniforms: RibbonUniforms;
  /** The points of the ribbon, head first. Fill them, then call `rebuild`. */
  readonly points: Vector3[];
  /** Width of the ribbon at each point. */
  readonly widths: Float32Array;
  readonly #positions: Float32Array;
  readonly #position: BufferAttribute;
  readonly #tangent = new Vector3();
  readonly #view = new Vector3();
  readonly #side = new Vector3();

  readonly segments: number;

  constructor(segments: number, seed = 0) {
    this.segments = segments;
    this.points = Array.from({ length: segments }, () => new Vector3());
    this.widths = new Float32Array(segments);
    this.#positions = new Float32Array(segments * 2 * 3);
    this.#position = new BufferAttribute(this.#positions, 3);
    this.#position.setUsage(DynamicDrawUsage);

    const uvs = new Float32Array(segments * 2 * 2);
    for (let i = 0; i < segments; i += 1) {
      const along = i / (segments - 1);
      uvs.set([along, 0, along, 1], i * 4);
    }
    const indices: number[] = [];
    for (let i = 0; i < segments - 1; i += 1) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', this.#position);
    geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
    geometry.setIndex(indices);

    this.uniforms = {
      uTime: uniform(0),
      uColor: uniform(new Color(1, 1, 1)),
      uCore: uniform(new Color(1, 1, 1)),
      uIntensity: uniform(1),
      uRainbow: uniform(0),
      uSeed: uniform(seed),
    };
    this.mesh = new Mesh(geometry, additiveMaterial(planeVertex, trailFragment, this.uniforms));
    this.mesh.frustumCulled = false;
  }

  /** Writes the vertices from `points` and `widths`, turning the ribbon to face `cameraPosition`. */
  rebuild(cameraPosition: Vector3): void {
    const last = this.segments - 1;
    for (let i = 0; i <= last; i += 1) {
      const point = this.points[i];
      const before = this.points[Math.max(0, i - 1)];
      const after = this.points[Math.min(last, i + 1)];
      if (point === undefined || before === undefined || after === undefined) {
        continue;
      }
      this.#tangent.subVectors(after, before);
      this.#view.subVectors(cameraPosition, point);
      this.#side.crossVectors(this.#tangent, this.#view);
      if (this.#side.lengthSq() < 1e-12) {
        this.#side.set(0, 0, 0);
      } else {
        this.#side.normalize().multiplyScalar((this.widths[i] ?? 0) * 0.5);
      }
      const o = i * 6;
      this.#positions[o] = point.x - this.#side.x;
      this.#positions[o + 1] = point.y - this.#side.y;
      this.#positions[o + 2] = point.z - this.#side.z;
      this.#positions[o + 3] = point.x + this.#side.x;
      this.#positions[o + 4] = point.y + this.#side.y;
      this.#positions[o + 5] = point.z + this.#side.z;
    }
    this.#position.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
