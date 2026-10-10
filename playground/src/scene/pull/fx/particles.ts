// A pool of glowing particles. A particle is written once, when it is born, and the vertex shader moves it for the rest
// of its life, so a burst of hundreds costs the CPU almost nothing.

import { BufferAttribute, BufferGeometry, Color, DynamicDrawUsage, Points, ShaderMaterial, Vector3 } from 'three';
import { pointsFragment, pointsVertex } from '../shaders';
import { additiveMaterial, uniform } from './materials';

export interface EmitSpec {
  readonly count: number;
  /** The time the particles are born, in the same clock as `update`. */
  readonly time: number;
  readonly origin: Vector3;
  /** Random offset of the starting point, in world units. */
  readonly spread?: number;
  /** Speed range in world units per second. */
  readonly speed: readonly [number, number];
  /** Seconds a particle lives. */
  readonly life: readonly [number, number];
  /** Size range in world units. */
  readonly size: readonly [number, number];
  /** Each particle takes one of these colours at random. */
  readonly colors: readonly Color[];
  /** 1 sends particles in every direction; smaller values keep them close to `up`. */
  readonly sphere?: number;
  /** Added to every velocity (for example a gentle rise). */
  readonly drift?: Vector3;
}

interface PointsUniforms {
  [name: string]: { value: unknown };
  uTime: { value: number };
  uGravity: { value: number };
  uDrag: { value: number };
  uScale: { value: number };
  uBrightness: { value: number };
}

const INITIAL_BIRTH = -1_000_000;

function between(range: readonly [number, number]): number {
  return range[0] + Math.random() * (range[1] - range[0]);
}

export class ParticleField {
  readonly points: Points<BufferGeometry, ShaderMaterial>;
  readonly uniforms: PointsUniforms;
  readonly #capacity: number;
  readonly #position: BufferAttribute;
  readonly #velocity: BufferAttribute;
  readonly #birth: BufferAttribute;
  readonly #life: BufferAttribute;
  readonly #size: BufferAttribute;
  readonly #color: BufferAttribute;
  #cursor = 0;

  constructor(capacity: number, gravity = 0, drag = 1.4) {
    this.#capacity = capacity;
    const attribute = (itemSize: number, fill = 0): BufferAttribute => {
      const array = new Float32Array(capacity * itemSize).fill(fill);
      const result = new BufferAttribute(array, itemSize);
      result.setUsage(DynamicDrawUsage);
      return result;
    };
    this.#position = attribute(3);
    this.#velocity = attribute(3);
    this.#birth = attribute(1, INITIAL_BIRTH);
    this.#life = attribute(1, 0.001);
    this.#size = attribute(1);
    this.#color = attribute(3);

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', this.#position);
    geometry.setAttribute('aVelocity', this.#velocity);
    geometry.setAttribute('aBirth', this.#birth);
    geometry.setAttribute('aLife', this.#life);
    geometry.setAttribute('aSize', this.#size);
    geometry.setAttribute('aColor', this.#color);

    this.uniforms = {
      uTime: uniform(0),
      uGravity: uniform(gravity),
      uDrag: uniform(drag),
      uScale: uniform(600),
      uBrightness: uniform(1),
    };
    this.points = new Points(geometry, additiveMaterial(pointsVertex, pointsFragment, this.uniforms));
    this.points.frustumCulled = false;
  }

  emit(spec: EmitSpec): void {
    const sphere = spec.sphere ?? 1;
    for (let n = 0; n < spec.count; n += 1) {
      const i = this.#cursor;
      this.#cursor = (this.#cursor + 1) % this.#capacity;
      const spread = spec.spread ?? 0;
      this.#position.setXYZ(
        i,
        spec.origin.x + (Math.random() - 0.5) * spread,
        spec.origin.y + (Math.random() - 0.5) * spread,
        spec.origin.z + (Math.random() - 0.5) * spread,
      );
      // A random direction on a sphere, pulled towards "up" when `sphere` is below 1.
      const theta = Math.random() * Math.PI * 2;
      const z = Math.random() * 2 - 1;
      const ring = Math.sqrt(1 - z * z);
      const speed = between(spec.speed);
      const vx = ring * Math.cos(theta) * sphere;
      const vy = z * sphere + (1 - sphere);
      const vz = ring * Math.sin(theta) * sphere;
      this.#velocity.setXYZ(i, vx * speed + (spec.drift?.x ?? 0), vy * speed + (spec.drift?.y ?? 0), vz * speed + (spec.drift?.z ?? 0));
      this.#birth.setX(i, spec.time);
      this.#life.setX(i, between(spec.life));
      this.#size.setX(i, between(spec.size));
      const color = spec.colors[Math.floor(Math.random() * spec.colors.length)] ?? spec.colors[0];
      this.#color.setXYZ(i, color?.r ?? 1, color?.g ?? 1, color?.b ?? 1);
    }
    for (const attribute of [this.#position, this.#velocity, this.#birth, this.#life, this.#size, this.#color]) {
      attribute.needsUpdate = true;
    }
  }

  /** `scale` is the viewport height in pixels divided by twice the tangent of half the field of view. */
  update(time: number, scale: number): void {
    this.uniforms.uTime.value = time;
    this.uniforms.uScale.value = scale;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.points.material.dispose();
  }
}
