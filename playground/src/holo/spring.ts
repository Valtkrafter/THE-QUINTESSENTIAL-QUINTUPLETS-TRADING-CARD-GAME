export interface Spring {
  value: number;
  velocity: number;
}

export interface SpringConfig {
  readonly stiffness: number;
  readonly damping: number;
}

const MAX_SUBSTEP_SECONDS = 1 / 240;
const MAX_FRAME_SECONDS = 1 / 15;

export function createSpring(value = 0): Spring {
  return { value, velocity: 0 };
}

/**
 * Advances a damped spring toward `target` in place (no allocation, it runs every frame).
 * Fixed substeps keep stiff springs stable when the frame rate drops.
 */
export function stepSpring(spring: Spring, target: number, config: SpringConfig, deltaSeconds: number): void {
  let remaining = Math.min(Math.max(deltaSeconds, 0), MAX_FRAME_SECONDS);
  while (remaining > 0) {
    const step = Math.min(remaining, MAX_SUBSTEP_SECONDS);
    const acceleration = config.stiffness * (target - spring.value) - config.damping * spring.velocity;
    spring.velocity += acceleration * step;
    spring.value += spring.velocity * step;
    remaining -= step;
  }
}
