// Everything that glows in the pull show, as one object that is told what the show is doing each frame. The scene gives it
// the time, the camera and the director's state; it moves the sky, the shooting star, the five threads, the shock waves,
// the rays behind a card and the particles. Nothing here decides what comes out of a pack.

import { Color, Group, Mesh, PlaneGeometry, ShaderMaterial, Vector2, Vector3, type PerspectiveCamera } from 'three';
import type { GraphicsLevel } from '../../../state/preferences';
import type { Rarity } from '../../../cards/model';
import type { DirectorState, PullMode } from '../director';
import { CARD_HOME_Y, IMPACT_POINT, clamp01, easeOutCubic, flightProgress, smoothstep, starPath } from '../motion';
import {
  HEART_COLORS,
  TIER_LOOK,
  burstCount,
  impactStrength,
  revealLook,
  starColors,
  threadStrength,
  tierOf,
  type Tier,
} from '../palette';
import { flashFragment, fullscreenVertex, glowFragment, planeVertex, raysFragment, ringFragment, skyFragment } from '../shaders';
import { additiveMaterial, displayColor, rainbowColor, uniform } from './materials';
import { ParticleField } from './particles';
import { Ribbon } from './ribbon';

export interface FxFrame {
  /** Seconds since the show was mounted. */
  readonly time: number;
  readonly delta: number;
  readonly camera: PerspectiveCamera;
  /** Height of the drawing buffer in pixels. */
  readonly pixelHeight: number;
  readonly aspect: number;
  readonly state: DirectorState;
  readonly mode: PullMode;
  /** The best rarity of the pack that is playing. */
  readonly best: Rarity;
  /** The rarity of the card that is on screen, or null in the cinematic. */
  readonly card: Rarity | null;
  /** 0..1 through the current phase. */
  readonly progress: number;
}

const TRAIL_SEGMENTS = 72;
const THREAD_SEGMENTS = 90;
const TRAIL_TIME = 0.34;
const THREAD_TIME = 0.5;
const IMPACT_RINGS = 4;
const CARD_RINGS = 2;

const TIER_COLORS: Readonly<Record<Tier, { readonly main: Color; readonly light: Color }>> = {
  blue: { main: displayColor(TIER_LOOK.blue.color), light: displayColor(TIER_LOOK.blue.light) },
  violet: { main: displayColor(TIER_LOOK.violet.color), light: displayColor(TIER_LOOK.violet.light) },
  rose: { main: displayColor(TIER_LOOK.rose.color), light: displayColor(TIER_LOOK.rose.light) },
  gold: { main: displayColor(TIER_LOOK.gold.color), light: displayColor(TIER_LOOK.gold.light) },
  rainbow: { main: displayColor(TIER_LOOK.rainbow.color), light: displayColor(TIER_LOOK.rainbow.light) },
};

const HEARTS: readonly Color[] = HEART_COLORS.map((hex) => displayColor(hex));
const WHITE = new Color(1, 1, 1);

interface Pulse {
  start: number;
  strength: number;
}

/** A plane of the given size that is drawn with an additive shader. */
function additivePlane(size: number, fragment: string, uniforms: Record<string, { value: unknown }>): Mesh<PlaneGeometry, ShaderMaterial> {
  const mesh = new Mesh(new PlaneGeometry(size, size), additiveMaterial(planeVertex, fragment, uniforms));
  mesh.frustumCulled = false;
  return mesh;
}

export class PullFx {
  /** Drawn first, with the bloom. */
  readonly background = new Group();
  /** Drawn on top of the card, without bloom. */
  readonly foreground = new Group();

  readonly #quality: GraphicsLevel;
  readonly #sky: Mesh<PlaneGeometry, ShaderMaterial>;
  readonly #skyUniforms = {
    uTime: uniform(0),
    uAspect: uniform(1),
    uDim: uniform(0),
    uGlow: uniform(0),
    uGlowColor: uniform(new Color(1, 1, 1)),
    uGlowPos: uniform(new Vector2(0.5, 0.45)),
  };

  readonly #head: Mesh<PlaneGeometry, ShaderMaterial>;
  readonly #headUniforms = {
    uColor: uniform(new Color(1, 1, 1)),
    uCore: uniform(new Color(1, 1, 1)),
    uIntensity: uniform(1),
    uFlare: uniform(0.3),
    uRainbow: uniform(0),
    uTime: uniform(0),
  };
  readonly #trail = new Ribbon(TRAIL_SEGMENTS, 0.3);
  readonly #threads = HEARTS.map((_, index) => new Ribbon(THREAD_SEGMENTS, index + 1));

  readonly #rings: { readonly mesh: Mesh<PlaneGeometry, ShaderMaterial>; readonly uniforms: { uColor: { value: Color }; uProgress: { value: number }; uStrength: { value: number }; uRainbow: { value: number }; uTime: { value: number } } }[] = [];
  readonly #impactRays: Mesh<PlaneGeometry, ShaderMaterial>;
  readonly #impactRaysUniforms = { uColor: uniform(new Color(1, 1, 1)), uTime: uniform(0), uIntensity: uniform(0), uCount: uniform(18), uSpin: uniform(0.5), uRainbow: uniform(0) };
  readonly #stageRays: Mesh<PlaneGeometry, ShaderMaterial>;
  readonly #stageRaysUniforms = { uColor: uniform(new Color(1, 1, 1)), uTime: uniform(0), uIntensity: uniform(0), uCount: uniform(12), uSpin: uniform(0.35), uRainbow: uniform(0) };
  readonly #halo: Mesh<PlaneGeometry, ShaderMaterial>;
  readonly #haloUniforms = {
    uColor: uniform(new Color(1, 1, 1)),
    uCore: uniform(new Color(1, 1, 1)),
    uIntensity: uniform(0),
    uFlare: uniform(0),
    uRainbow: uniform(0),
    uTime: uniform(0),
  };
  readonly #flash: Mesh<PlaneGeometry, ShaderMaterial>;
  readonly #flashUniforms = { uColor: uniform(new Color(1, 1, 1)), uAlpha: uniform(0) };
  readonly #burst: ParticleField;
  readonly #motes: ParticleField;

  readonly #impactRingPulses: Pulse[] = Array.from({ length: IMPACT_RINGS }, () => ({ start: -1000, strength: 0 }));
  readonly #cardRingPulses: Pulse[] = Array.from({ length: CARD_RINGS }, () => ({ start: -1000, strength: 0 }));
  #impactStart = -1000;
  #impactStrength = 0;
  #impactTier: Tier = 'blue';
  #flashStart = -1000;
  #flashStrength = 0;
  #flashTier: Tier = 'blue';
  #shake = 0;
  #shakeStart = -1000;
  #dim = 0;
  #moteClock = 0;
  readonly #scratch = new Vector3();
  readonly #color = new Color();
  readonly #color2 = new Color();

  constructor(quality: GraphicsLevel) {
    this.#quality = quality;
    const particleCapacity = quality === 'high' ? 2600 : quality === 'normal' ? 1500 : 800;

    this.#sky = new Mesh(new PlaneGeometry(2, 2), new ShaderMaterial({ vertexShader: fullscreenVertex, fragmentShader: skyFragment, uniforms: this.#skyUniforms, depthTest: false, depthWrite: false }));
    this.#sky.frustumCulled = false;
    this.#sky.renderOrder = -100;

    this.#impactRays = additivePlane(34, raysFragment, this.#impactRaysUniforms);
    this.#impactRays.renderOrder = -60;
    this.#stageRays = additivePlane(30, raysFragment, this.#stageRaysUniforms);
    this.#stageRays.renderOrder = -55;
    this.#halo = additivePlane(14, glowFragment, this.#haloUniforms);
    this.#halo.renderOrder = -50;

    for (let i = 0; i < IMPACT_RINGS + CARD_RINGS; i += 1) {
      const uniforms = { uColor: uniform(new Color(1, 1, 1)), uProgress: uniform(0), uStrength: uniform(0), uRainbow: uniform(0), uTime: uniform(0) };
      const mesh = additivePlane(1, ringFragment, uniforms);
      mesh.renderOrder = -40 + i;
      mesh.visible = false;
      this.#rings.push({ mesh, uniforms });
    }

    this.#head = additivePlane(1, glowFragment, this.#headUniforms);
    this.#head.renderOrder = -20;
    this.#trail.mesh.renderOrder = -30;
    for (const [index, thread] of this.#threads.entries()) {
      thread.mesh.renderOrder = -25 + index * 0.1;
    }

    this.#burst = new ParticleField(particleCapacity, 0.9, 1.7);
    this.#burst.points.renderOrder = -10;
    this.#motes = new ParticleField(Math.round(particleCapacity / 3), 0, 0.6);
    this.#motes.points.renderOrder = -12;

    const flashMesh = new Mesh(new PlaneGeometry(2, 2), additiveMaterial(fullscreenVertex, flashFragment, this.#flashUniforms));
    flashMesh.frustumCulled = false;
    flashMesh.renderOrder = 1000;
    this.#flash = flashMesh;

    this.background.add(this.#sky, this.#stageRays, this.#impactRays, this.#halo, this.#trail.mesh, ...this.#threads.map((thread) => thread.mesh), this.#head, this.#burst.points, this.#motes.points);
    for (const ring of this.#rings) {
      this.background.add(ring.mesh);
    }
    this.foreground.add(this.#flash);
    this.#head.visible = false;
    this.#trail.mesh.visible = false;
    for (const thread of this.#threads) {
      thread.mesh.visible = false;
    }
  }

  // --- Events ------------------------------------------------------------------------------------------------

  /** The star has landed: flash, shock waves, burst. */
  impact(time: number, best: Rarity): void {
    const strength = impactStrength(best);
    const tier = tierOf(best);
    this.#impactStart = time;
    this.#impactStrength = strength;
    this.#impactTier = tier;
    this.#flashStart = time;
    this.#flashStrength = 0.3 + strength * 0.4;
    this.#flashTier = tier;
    this.#shake = 0.12 + strength * 0.4;
    this.#shakeStart = time;
    const ringCount = best === 'UR' ? 4 : best === 'SAR' ? 3 : best === 'AR' || best === 'RR' ? 2 : 1;
    this.#impactRingPulses.forEach((pulse, index) => {
      pulse.start = index < ringCount ? time + index * 0.13 : -1000;
      pulse.strength = strength * (1 - index * 0.18);
    });
    const count = Math.round(burstCount(best) * (this.#quality === 'low' ? 0.5 : 1));
    const colors = tier === 'rainbow' ? HEARTS : [TIER_COLORS[tier].main, TIER_COLORS[tier].light];
    this.#burst.emit({ count, time, origin: IMPACT_POINT, spread: 0.3, speed: [2.5, 4 + strength * 9], life: [0.9, 1.9 + strength], size: [0.07, 0.2 + strength * 0.12], colors });
    if (threadStrength(best) > 0) {
      this.#burst.emit({ count: Math.round(count * 0.5), time, origin: IMPACT_POINT, spread: 0.2, speed: [5, 12], life: [1.2, 2.6], size: [0.08, 0.2], colors: HEARTS });
    }
  }

  /** A card is half-way through its flip: a small burst around it, bigger for better cards. */
  flipMidpoint(time: number, rarity: Rarity): void {
    const look = revealLook(rarity);
    const tier = look.tier;
    this.#cardRingPulses.forEach((pulse, index) => {
      pulse.start = time + index * 0.11;
      pulse.strength = look.intensity * (index === 0 ? 1 : 0.6);
    });
    this.#flashStart = time;
    this.#flashStrength = 0.12 + look.intensity * 0.5;
    this.#flashTier = tier;
    if (look.spotlight) {
      this.#shake = 0.1 + look.intensity * 0.14;
      this.#shakeStart = time;
    }
    const colors = tier === 'rainbow' ? HEARTS : [TIER_COLORS[tier].main, TIER_COLORS[tier].light];
    const count = Math.round((50 + look.intensity * 330) * (this.#quality === 'low' ? 0.5 : 1));
    this.#scratch.set(0, CARD_HOME_Y, 1.2);
    this.#burst.emit({ count, time, origin: this.#scratch, spread: 1.4, speed: [1.5, 3.5 + look.intensity * 5], life: [0.8, 1.6 + look.intensity], size: [0.05, 0.14 + look.intensity * 0.1], colors });
  }

  /** How far the camera is pushed off its place by a shake, written into `out`. */
  cameraShake(time: number, out: Vector3): Vector3 {
    const age = time - this.#shakeStart;
    const amplitude = this.#shake * Math.exp(-age * 5.5) * (age < 0 ? 0 : 1);
    return out.set(Math.sin(time * 61) * amplitude, Math.cos(time * 53) * amplitude * 0.8, 0);
  }

  // --- Frame -----------------------------------------------------------------------------------------------

  update(frame: FxFrame): void {
    const { time, camera, state } = frame;
    const phase = state.phase;
    const showingCard = phase === 'enter' || phase === 'flip' || phase === 'show' || phase === 'exit';

    // Tier of the card on screen (or the pack's best, during the cinematic).
    const stageTier = tierOf(frame.card ?? frame.best);
    const stageLook = frame.card === null ? null : revealLook(frame.card);

    this.#updateSky(frame, showingCard, stageTier);
    this.#updateStar(frame);
    this.#updateImpact(frame);
    this.#updateStage(frame, showingCard, stageTier, stageLook?.intensity ?? 0);
    this.#updateFlash(frame);

    const scale = frame.pixelHeight / (2 * Math.tan((camera.fov * Math.PI) / 360));
    this.#burst.update(time, scale);
    this.#motes.update(time, scale);
    this.#burst.uniforms.uBrightness.value = 1.1;
    this.#motes.uniforms.uBrightness.value = 0.9;
  }

  #setTierColor(tier: Tier, time: number, main: Color, light: Color): boolean {
    if (tier === 'rainbow') {
      rainbowColor(time, 0.45, main);
      light.copy(WHITE);
      return true;
    }
    main.copy(TIER_COLORS[tier].main);
    light.copy(TIER_COLORS[tier].light);
    return false;
  }

  #updateSky(frame: FxFrame, showingCard: boolean, stageTier: Tier): void {
    const target = showingCard ? 0.52 : frame.state.phase === 'summary' ? 0.68 : 0;
    this.#dim += (target - this.#dim) * (1 - Math.exp(-frame.delta * 3));
    const uniforms = this.#skyUniforms;
    uniforms.uTime.value = frame.time;
    uniforms.uAspect.value = frame.aspect;
    uniforms.uDim.value = this.#dim;
    if (showingCard) {
      this.#setTierColor(stageTier, frame.time, this.#color, this.#color2);
      uniforms.uGlowColor.value.copy(this.#color);
      uniforms.uGlowPos.value.set(0.5, 0.52);
    }
  }

  #updateStar(frame: FxFrame): void {
    const { state, time, camera } = frame;
    const flying = state.phase === 'flight';
    this.#head.visible = flying;
    this.#trail.mesh.visible = flying;
    const threadPower = frame.mode === 'full' ? threadStrength(frame.best) : 0;
    for (const thread of this.#threads) {
      thread.mesh.visible = flying && threadPower > 0;
    }
    if (!flying) {
      if (state.phase === 'intro') {
        this.#skyUniforms.uGlow.value = 0;
      }
      return;
    }

    const u = frame.progress;
    const hang = threadPower > 0;
    const path = flightProgress(u, hang);
    const tiers = starColors(frame.best);
    const n = tiers.length;
    const position = Math.min(n - 1e-6, u * n);
    const index = Math.floor(position);
    const local = position - index;
    const tier = tiers[index] ?? 'blue';
    const previous = tiers[index - 1];
    const blend = previous === undefined ? 1 : smoothstep(0, 0.1, local);
    const rainbow = tier === 'rainbow' && blend > 0.5;
    const pulse = index > 0 ? Math.exp(-local * 12) : 0;

    // Colour: cross-fade from the earlier tier.
    this.#setTierColor(tier, time, this.#color, this.#color2);
    if (previous !== undefined && blend < 1) {
      const from = TIER_COLORS[previous];
      this.#color.lerpColors(from.main, this.#color, blend);
      this.#color2.lerpColors(from.light, this.#color2, blend);
    }

    // Head.
    const size = 0.7 + 1.25 * path * path + pulse * 0.9;
    starPath(path, this.#scratch);
    this.#head.position.copy(this.#scratch);
    this.#head.quaternion.copy(camera.quaternion);
    this.#head.scale.setScalar(size);
    const head = this.#headUniforms;
    head.uColor.value.copy(this.#color);
    head.uCore.value.copy(this.#color2);
    head.uIntensity.value = 0.55 + 0.25 * path + pulse * 0.5;
    head.uFlare.value = 0.3 + pulse * 1.1;
    head.uRainbow.value = rainbow ? 1 : 0;
    head.uTime.value = time;

    // Trail: the star's own earlier positions.
    for (let i = 0; i < TRAIL_SEGMENTS; i += 1) {
      const back = i / (TRAIL_SEGMENTS - 1);
      const earlier = Math.max(0, u - back * TRAIL_TIME);
      starPath(flightProgress(earlier, hang), this.#trail.points[i] ?? this.#scratch);
      this.#trail.widths[i] = (0.42 + 0.55 * path) * (1 - back) ** 0.7;
    }
    this.#trail.rebuild(camera.position);
    const trail = this.#trail.uniforms;
    trail.uColor.value.copy(this.#color);
    trail.uCore.value.copy(this.#color2);
    trail.uTime.value = time;
    trail.uIntensity.value = 1.0 + pulse * 0.5;
    trail.uRainbow.value = rainbow ? 1 : 0;

    // The five threads, spiralling round the path and tightening round the star.
    if (threadPower > 0) {
      this.#updateThreads(frame, u, hang, threadPower);
    }

    const sky = this.#skyUniforms;
    sky.uGlow.value = 0.12 + 0.6 * path + pulse * 0.25;
    sky.uGlowColor.value.copy(this.#color);
    sky.uGlowPos.value.set(0.5 + (this.#scratch.x / 24) * 0.5, 0.5 + (this.#scratch.y / 14) * 0.5);
  }

  readonly #centre = new Vector3();
  readonly #ahead = new Vector3();
  readonly #tangent = new Vector3();
  readonly #right = new Vector3();
  readonly #up = new Vector3();
  readonly #worldUp = new Vector3(0, 1, 0);

  #updateThreads(frame: FxFrame, u: number, hang: boolean, power: number): void {
    const fadeIn = smoothstep(0.1, 0.38, u) * (1 - smoothstep(0.985, 1, u));
    const tighten = smoothstep(0.5, 1, u);
    for (const [k, thread] of this.#threads.entries()) {
      const phase = (k / this.#threads.length) * Math.PI * 2;
      for (let i = 0; i < THREAD_SEGMENTS; i += 1) {
        const back = i / (THREAD_SEGMENTS - 1);
        const earlier = Math.max(0, u - back * THREAD_TIME);
        starPath(flightProgress(earlier, hang), this.#centre);
        starPath(flightProgress(Math.min(1, earlier + 0.01), hang), this.#ahead);
        this.#tangent.subVectors(this.#ahead, this.#centre);
        if (this.#tangent.lengthSq() < 1e-10) {
          this.#tangent.set(0.5, -0.4, 1);
        }
        this.#tangent.normalize();
        this.#right.crossVectors(this.#tangent, this.#worldUp).normalize();
        this.#up.crossVectors(this.#right, this.#tangent);
        const angle = phase + back * 9 - frame.time * 2.4;
        const radius = (0.5 + 1.6 * back) * (1 - tighten * 0.93);
        const point = thread.points[i] ?? this.#centre;
        point.copy(this.#centre).addScaledVector(this.#right, Math.cos(angle) * radius).addScaledVector(this.#up, Math.sin(angle) * radius);
        thread.widths[i] = (0.3 + 0.3 * (1 - back)) * (1 - back) ** 0.35;
      }
      thread.rebuild(frame.camera.position);
      const heart = HEARTS[k] ?? WHITE;
      thread.uniforms.uColor.value.copy(heart);
      thread.uniforms.uCore.value.copy(heart).lerp(WHITE, 0.55);
      thread.uniforms.uTime.value = frame.time;
      thread.uniforms.uIntensity.value = 2.1 * power * fadeIn;
      thread.uniforms.uRainbow.value = 0;
    }
  }

  #updateImpact(frame: FxFrame): void {
    const { time, camera } = frame;
    const t = time - this.#impactStart;
    const strength = this.#impactStrength;
    const rays = this.#impactRaysUniforms;
    if (t >= 0 && t < 3.5) {
      const rainbow = this.#setTierColor(this.#impactTier, time, this.#color, this.#color2);
      rays.uColor.value.copy(this.#color);
      rays.uRainbow.value = rainbow ? 1 : 0;
      rays.uIntensity.value = strength * 0.85 * Math.exp(-t * 1.6) * smoothstep(0, 0.06, t);
      rays.uTime.value = time;
      this.#impactRays.visible = rays.uIntensity.value > 0.003;
      this.#impactRays.position.copy(IMPACT_POINT);
      this.#impactRays.quaternion.copy(camera.quaternion);
    } else {
      this.#impactRays.visible = false;
    }
    this.#placeRings(0, this.#impactRingPulses, frame, IMPACT_POINT, 17, this.#impactTier, 1.1);
    this.#scratch.set(0, CARD_HOME_Y, 1.4);
    this.#placeRings(IMPACT_RINGS, this.#cardRingPulses, frame, this.#scratch, 9, frame.card === null ? 'blue' : tierOf(frame.card), 0.8);
  }

  #placeRings(offset: number, pulses: readonly Pulse[], frame: FxFrame, centre: Vector3, size: number, tier: Tier, duration: number): void {
    pulses.forEach((pulse, index) => {
      const ring = this.#rings[offset + index];
      if (ring === undefined) {
        return;
      }
      const age = frame.time - pulse.start;
      const progress = age / (duration + index * 0.15);
      if (age < 0 || progress >= 1) {
        ring.mesh.visible = false;
        return;
      }
      const rainbow = this.#setTierColor(tier, frame.time, this.#color, this.#color2);
      ring.mesh.visible = true;
      ring.mesh.position.copy(centre);
      ring.mesh.quaternion.copy(frame.camera.quaternion);
      ring.mesh.scale.setScalar(size);
      ring.uniforms.uColor.value.copy(this.#color);
      ring.uniforms.uProgress.value = easeOutCubic(clamp01(progress));
      ring.uniforms.uStrength.value = pulse.strength * 1.6;
      ring.uniforms.uRainbow.value = rainbow ? 1 : 0;
      ring.uniforms.uTime.value = frame.time;
    });
  }

  #updateStage(frame: FxFrame, showingCard: boolean, tier: Tier, cardIntensity: number): void {
    const { state, progress } = frame;
    let ramp = 0;
    if (state.phase === 'enter') {
      ramp = progress * 0.5;
    } else if (state.phase === 'flip') {
      ramp = 0.5 + 0.5 * easeOutCubic(progress);
    } else if (state.phase === 'show') {
      ramp = 1;
    } else if (state.phase === 'exit') {
      ramp = 1 - progress;
    }
    const intensity = showingCard ? cardIntensity * ramp : 0;
    const rainbow = this.#setTierColor(tier, frame.time, this.#color, this.#color2);

    const rays = this.#stageRaysUniforms;
    rays.uColor.value.copy(this.#color);
    rays.uRainbow.value = rainbow ? 1 : 0;
    rays.uTime.value = frame.time;
    rays.uIntensity.value = intensity * 0.95;
    this.#stageRays.visible = intensity > 0.01;
    this.#stageRays.position.set(0, CARD_HOME_Y, -2.4);
    this.#stageRays.quaternion.copy(frame.camera.quaternion);

    const halo = this.#haloUniforms;
    halo.uColor.value.copy(this.#color);
    halo.uCore.value.copy(this.#color2).multiplyScalar(0.3);
    halo.uRainbow.value = rainbow ? 1 : 0;
    halo.uIntensity.value = intensity * 0.55 + (showingCard ? 0.1 : 0);
    halo.uFlare.value = 0;
    halo.uTime.value = frame.time;
    this.#halo.visible = intensity > 0.01 || showingCard;
    this.#halo.position.set(0, CARD_HOME_Y, -1.8);
    this.#halo.quaternion.copy(frame.camera.quaternion);

    const sky = this.#skyUniforms;
    if (showingCard) {
      sky.uGlow.value = 0.15 + intensity * 0.55;
    } else if (frame.state.phase === 'impact') {
      const t = frame.time - this.#impactStart;
      sky.uGlow.value = this.#impactStrength * 0.6 * Math.exp(-Math.max(t, 0) * 1.3);
      this.#setTierColor(this.#impactTier, frame.time, this.#color, this.#color2);
      sky.uGlowColor.value.copy(this.#color);
      sky.uGlowPos.value.set(0.5, 0.5);
    } else if (frame.state.phase === 'summary') {
      sky.uGlow.value *= 0.96;
    }

    // Floating sparks around the card while it is shown.
    this.#moteClock += frame.delta;
    if (state.phase === 'show' && cardIntensity > 0.3 && this.#moteClock > 0.06 && this.#quality !== 'low') {
      this.#moteClock = 0;
      const colors = tier === 'rainbow' ? HEARTS : [TIER_COLORS[tier].main, TIER_COLORS[tier].light];
      this.#scratch.set((Math.random() - 0.5) * 3.2, CARD_HOME_Y - 1.6 + Math.random() * 0.6, 0.5);
      this.#motes.emit({ count: Math.round(1 + cardIntensity * 3), time: frame.time, origin: this.#scratch, spread: 1.2, speed: [0.4, 1.1], life: [1.4, 2.6], size: [0.04, 0.1], colors, sphere: 0.25 });
    }
  }

  #updateFlash(frame: FxFrame): void {
    const t = frame.time - this.#flashStart;
    const uniforms = this.#flashUniforms;
    if (t < 0 || t > 1.5) {
      uniforms.uAlpha.value = 0;
      this.#flash.visible = false;
      return;
    }
    const alpha = this.#flashStrength * (1 - Math.exp(-t * 70)) * Math.exp(-t * 5.2);
    uniforms.uAlpha.value = alpha;
    this.#flash.visible = alpha > 0.004;
    this.#setTierColor(this.#flashTier, frame.time, this.#color, this.#color2);
    uniforms.uColor.value.copy(this.#color2).lerp(this.#color, 0.35);
  }

  dispose(): void {
    this.#sky.geometry.dispose();
    this.#sky.material.dispose();
    for (const mesh of [this.#head, this.#impactRays, this.#stageRays, this.#halo, this.#flash]) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    for (const ring of this.#rings) {
      ring.mesh.geometry.dispose();
      ring.mesh.material.dispose();
    }
    this.#trail.dispose();
    for (const thread of this.#threads) {
      thread.dispose();
    }
    this.#burst.dispose();
    this.#motes.dispose();
  }
}

