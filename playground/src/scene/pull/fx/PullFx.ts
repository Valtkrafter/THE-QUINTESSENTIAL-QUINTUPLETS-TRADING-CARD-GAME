// Everything that glows in the pull show, as one object that is told what the show is doing each frame. The scene gives it
// the time, the camera and the director's state; it draws the storm, the needle of light with its trail and threads, the gate
// it dives into, the white-out, the shock waves, the ceremony of stars, the rays behind a card and the particles. Nothing
// here decides what comes out of a pack.

import { Color, Group, MathUtils, Mesh, PlaneGeometry, ShaderMaterial, Vector2, Vector3, type PerspectiveCamera } from 'three';
import type { GraphicsLevel } from '../../../state/preferences';
import type { Rarity } from '../../../cards/model';
import { ceremonyBeats, ceremonyFor, type DirectorState, type PullMode } from '../director';
import {
  CARD_HOME_Y,
  IMPACT_POINT,
  clamp01,
  diveBlur,
  easeOutCubic,
  gateEnergy,
  gateGlow,
  gateOpen,
  gateTime,
  gateZoom,
  needlePath,
  needleProgress,
  smoothstep,
  speedLines,
  stormFade,
  stormZoom,
  whiteOut,
} from '../motion';
import {
  HEART_COLORS,
  TIER_LOOK,
  burstCount,
  impactStrength,
  revealLook,
  starColors,
  threadStrength,
  tierOf,
  tierRank,
  type Tier,
} from '../palette';
import {
  burstFragment,
  ceremonyFragment,
  flashFragment,
  fullscreenVertex,
  gateFragment,
  glowFragment,
  planeVertex,
  raysFragment,
  ringFragment,
  skyFragment,
  stormFragment,
  streaksFragment,
} from '../shaders';
import type { PostState } from '../types';
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
/** How much of the flight the trail of the needle reaches back, as a share of the flight. */
const TRAIL_TIME = 0.3;
const THREAD_TIME = 0.42;
const IMPACT_RINGS = 4;
const CARD_RINGS = 2;
/** One "unit" of a distant effect is this share of the distance to the camera, so it keeps its size on the screen. */
const SCREEN_UNIT = 0.05;
/** Where the needle ends: the middle of the gate. */
const GATE_POINT: Vector3 = needlePath(1);
/** How quickly the glow of the gate dies down after the burst (per second). */
const AFTERGLOW_RATE = 3.2;

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

/** The trail of the needle is a point at the tip, widest a little behind it, and thins out again towards its tail. */
function trailProfile(back: number): number {
  return smoothstep(0, 0.16, back) ** 0.7 * (1 - 0.5 * back);
}

/** A plane of the given size that is drawn with an additive shader. */
function additivePlane(size: number, fragment: string, uniforms: Record<string, { value: unknown }>): Mesh<PlaneGeometry, ShaderMaterial> {
  const mesh = new Mesh(new PlaneGeometry(size, size), additiveMaterial(planeVertex, fragment, uniforms));
  mesh.frustumCulled = false;
  return mesh;
}

/** A picture that covers the whole screen, drawn with its own shader: added to what is there, or replacing it. */
function screenQuad(fragment: string, uniforms: Record<string, { value: unknown }>, additive: boolean, order: number): Mesh<PlaneGeometry, ShaderMaterial> {
  const material = additive
    ? additiveMaterial(fullscreenVertex, fragment, uniforms)
    : new ShaderMaterial({ vertexShader: fullscreenVertex, fragmentShader: fragment, uniforms, depthTest: false, depthWrite: false });
  const mesh = new Mesh(new PlaneGeometry(2, 2), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = order;
  return mesh;
}

export class PullFx {
  /** Drawn first, with the bloom. */
  readonly background = new Group();
  /** Drawn on top of the card, without bloom. */
  readonly foreground = new Group();
  /** What the final picture is put through; the compositor reads it every frame. */
  readonly post: PostState = { blur: 0, aberration: 0 };

  readonly #quality: GraphicsLevel;
  readonly #sky: Mesh<PlaneGeometry, ShaderMaterial>;
  readonly #skyUniforms = {
    uTime: uniform(0),
    uAspect: uniform(1),
    uDim: uniform(0),
    uGlow: uniform(0),
    uSpace: uniform(0),
    uLevel: uniform(1),
    uGlowColor: uniform(new Color(1, 1, 1)),
    uGlowPos: uniform(new Vector2(0.5, 0.45)),
  };

  readonly #storm: Mesh<PlaneGeometry, ShaderMaterial>;
  readonly #stormUniforms = {
    uTime: uniform(0),
    uAspect: uniform(1),
    uCenter: uniform(new Vector2(0.5, 0.5)),
    uZoom: uniform(1),
    uFade: uniform(0),
    uTint: uniform(new Color(0.5, 0.7, 1)),
  };
  readonly #streaks: Mesh<PlaneGeometry, ShaderMaterial>;
  readonly #streaksUniforms = {
    uTime: uniform(0),
    uAspect: uniform(1),
    uCenter: uniform(new Vector2(0.5, 0.5)),
    uFlow: uniform(0),
    uSpeed: uniform(0),
    uArcs: uniform(0),
    uColor: uniform(new Color(1, 1, 1)),
    uRainbow: uniform(0),
  };
  readonly #gate: Mesh<PlaneGeometry, ShaderMaterial>;
  readonly #gateUniforms = {
    uTime: uniform(0),
    uAspect: uniform(1),
    uCenter: uniform(new Vector2(0.5, 0.5)),
    uOpen: uniform(0),
    uZoom: uniform(0.5),
    uEnergy: uniform(0),
    uRainbow: uniform(0),
    uDetail: uniform(1),
    uColor: uniform(new Color(1, 1, 1)),
  };
  readonly #whiteout: Mesh<PlaneGeometry, ShaderMaterial>;
  readonly #whiteoutUniforms = {
    uTime: uniform(0),
    uAspect: uniform(1),
    uCenter: uniform(new Vector2(0.5, 0.5)),
    uStrength: uniform(0),
    uGrow: uniform(1),
    uRainbow: uniform(0),
    uColor: uniform(new Color(1, 1, 1)),
  };
  readonly #ceremony: Mesh<PlaneGeometry, ShaderMaterial>;
  readonly #ceremonyUniforms = {
    uTime: uniform(0),
    uAspect: uniform(1),
    uDraw: uniform(0),
    uSpike: uniform(0),
    uCount: uniform(5),
    uFade: uniform(1),
    uHearts: uniform(0),
    uLit: uniform<number[]>([0, 0, 0, 0, 0]),
    uPop: uniform<number[]>([0, 0, 0, 0, 0]),
    uColor: uniform(new Color(1, 1, 1)),
    uHeart: uniform<Color[]>(HEARTS.map((color) => color.clone())),
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
  readonly #dust: ParticleField;

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
  #rumble = 0;
  #dim = 0;
  #space = 0;
  #level = 1;
  #flow = 0;
  #moteClock = 0;
  #starsFired = 0;
  readonly #gateCentre = new Vector2(0.5, 0.5);
  readonly #scratch = new Vector3();
  readonly #drift = new Vector3(0, 0.3, 0);
  readonly #color = new Color();
  readonly #color2 = new Color();

  constructor(quality: GraphicsLevel) {
    this.#quality = quality;
    const particleCapacity = quality === 'high' ? 2600 : quality === 'normal' ? 1500 : 800;

    this.#sky = screenQuad(skyFragment, this.#skyUniforms, false, -100);
    this.#storm = screenQuad(stormFragment, this.#stormUniforms, false, -99);
    this.#streaks = screenQuad(streaksFragment, this.#streaksUniforms, true, -90);
    this.#gate = screenQuad(gateFragment, this.#gateUniforms, true, -85);
    this.#whiteout = screenQuad(burstFragment, this.#whiteoutUniforms, true, -8);
    this.#ceremony = screenQuad(ceremonyFragment, this.#ceremonyUniforms, true, -7);

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
    this.#dust = new ParticleField(Math.round(particleCapacity / 3), 0, 1.1);
    this.#dust.points.renderOrder = -14;

    const flashMesh = new Mesh(new PlaneGeometry(2, 2), additiveMaterial(fullscreenVertex, flashFragment, this.#flashUniforms));
    flashMesh.frustumCulled = false;
    flashMesh.renderOrder = 1000;
    this.#flash = flashMesh;

    this.background.add(
      this.#sky,
      this.#storm,
      this.#streaks,
      this.#gate,
      this.#stageRays,
      this.#impactRays,
      this.#halo,
      this.#trail.mesh,
      ...this.#threads.map((thread) => thread.mesh),
      this.#head,
      this.#dust.points,
      this.#burst.points,
      this.#motes.points,
      this.#whiteout,
      this.#ceremony,
    );
    for (const ring of this.#rings) {
      this.background.add(ring.mesh);
    }
    this.foreground.add(this.#flash);
    for (const hidden of [this.#storm, this.#streaks, this.#gate, this.#whiteout, this.#ceremony, this.#head, this.#trail.mesh, ...this.#threads.map((thread) => thread.mesh)]) {
      hidden.visible = false;
    }
  }

  // --- Events ------------------------------------------------------------------------------------------------

  /** The needle has gone through the gate: flash, shock waves, burst. */
  impact(time: number, best: Rarity): void {
    const strength = impactStrength(best);
    const tier = tierOf(best);
    this.#impactStart = time;
    this.#impactStrength = strength;
    this.#impactTier = tier;
    this.#flashStart = time;
    // The white-out already fills the screen; the flash only adds a short extra kick on top of it.
    this.#flashStrength = 0.1 + strength * 0.22;
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

  /** How far the camera is pushed off its place by a shake and by the rumble of the dive, written into `out`. */
  cameraShake(time: number, out: Vector3): Vector3 {
    const age = time - this.#shakeStart;
    const amplitude = this.#shake * Math.exp(-age * 5.5) * (age < 0 ? 0 : 1) + this.#rumble;
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

    this.#locateGate(camera);
    this.#updateSky(frame, showingCard, stageTier);
    this.#updateStorm(frame);
    this.#updateFlight(frame);
    this.#updateImpact(frame);
    this.#updateCeremony(frame);
    this.#updateStage(frame, showingCard, stageTier, stageLook?.intensity ?? 0);
    this.#updateFlash(frame);

    const scale = frame.pixelHeight / (2 * Math.tan((camera.fov * Math.PI) / 360));
    for (const field of [this.#burst, this.#motes, this.#dust]) {
      field.update(time, scale);
    }
    this.#burst.uniforms.uBrightness.value = 1.1;
    this.#motes.uniforms.uBrightness.value = 0.9;
    this.#dust.uniforms.uBrightness.value = 1.0;
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

  /** Finds where the gate is on the screen: the needle always ends in its middle, whatever the shape of the window. */
  #locateGate(camera: PerspectiveCamera): void {
    camera.updateMatrixWorld();
    this.#scratch.copy(GATE_POINT).project(camera);
    this.#gateCentre.set(this.#scratch.x * 0.5 + 0.5, this.#scratch.y * 0.5 + 0.5);
  }

  #updateSky(frame: FxFrame, showingCard: boolean, stageTier: Tier): void {
    const phase = frame.state.phase;
    const hold = phase === 'ceremony' || (phase === 'impact' && ceremonyFor(frame.mode, frame.best) > 0);
    const space = phase === 'intro' || phase === 'flight' || hold ? 1 : 0;
    const level = hold ? 0 : 1;
    // Space comes quickly and goes slowly (under the white-out); the sky goes dark fast and returns gently after a ceremony.
    this.#space = MathUtils.damp(this.#space, space, space > this.#space ? 10 : 2.4, frame.delta);
    this.#level = MathUtils.damp(this.#level, level, level < this.#level ? 4 : 2.2, frame.delta);

    const target = showingCard ? 0.52 : phase === 'summary' ? 0.68 : 0;
    this.#dim += (target - this.#dim) * (1 - Math.exp(-frame.delta * 3));
    const uniforms = this.#skyUniforms;
    uniforms.uTime.value = frame.time;
    uniforms.uAspect.value = frame.aspect;
    uniforms.uDim.value = this.#dim;
    uniforms.uSpace.value = this.#space;
    uniforms.uLevel.value = this.#level;
    this.#sky.visible = this.#level > 0.003;
    if (showingCard) {
      this.#setTierColor(stageTier, frame.time, this.#color, this.#color2);
      uniforms.uGlowColor.value.copy(this.#color);
      uniforms.uGlowPos.value.set(0.5, 0.52);
    }
  }

  /** The first shot: a stormy planet from above, the camera falling towards the eye, then black. */
  #updateStorm(frame: FxFrame): void {
    const visible = frame.state.phase === 'intro' && frame.mode === 'full';
    this.#storm.visible = visible;
    if (!visible) {
      return;
    }
    const u = frame.progress;
    const storm = this.#stormUniforms;
    storm.uTime.value = frame.time;
    storm.uAspect.value = frame.aspect;
    storm.uCenter.value.copy(this.#gateCentre);
    storm.uZoom.value = stormZoom(u);
    storm.uFade.value = smoothstep(0, 0.14, u) * stormFade(u);
    storm.uTint.value.copy(TIER_COLORS[starColors(frame.best)[0] ?? 'blue'].main);
  }

  /** The needle of light, its trail and threads, the gate it dives into, the speed lines and the white-out. */
  #updateFlight(frame: FxFrame): void {
    const { state, time, camera, delta } = frame;
    const flying = state.phase === 'flight';
    const afterglow = state.phase === 'impact';
    const active = flying || afterglow;
    const threadPower = frame.mode === 'full' ? threadStrength(frame.best) : 0;
    const hang = threadPower > 0;

    this.#head.visible = flying;
    this.#trail.mesh.visible = flying;
    for (const thread of this.#threads) {
      thread.mesh.visible = flying && hang;
    }
    if (!active) {
      this.#gate.visible = false;
      this.#streaks.visible = false;
      this.#whiteout.visible = false;
      this.post.blur = 0;
      this.post.aberration = 0;
      this.#rumble = 0;
      if (state.phase === 'intro') {
        this.#skyUniforms.uGlow.value = 0;
      }
      return;
    }

    // During the burst the picture of the end of the flight stays and dies down, so the cut to the cards is not a jump.
    const age = afterglow ? Math.max(0, time - this.#impactStart) : 0;
    const decay = afterglow ? Math.exp(-age * AFTERGLOW_RATE) : 1;
    const u = flying ? frame.progress : 1;
    const gt = gateTime(u, hang);

    // Colour: the needle upgrades on its way (blue, then violet, then gold ...) and the gate wears the same colour.
    const tiers = starColors(frame.best);
    const stops = tiers.length;
    const position = Math.min(stops - 1e-6, u * stops);
    const index = Math.floor(position);
    const local = position - index;
    const tier = tiers[index] ?? 'blue';
    const previous = tiers[index - 1];
    const blend = previous === undefined ? 1 : smoothstep(0, 0.1, local);
    const rainbow = tier === 'rainbow' && blend > 0.5;
    const pulse = flying && index > 0 ? Math.exp(-local * 12) : 0;
    this.#setTierColor(tier, time, this.#color, this.#color2);
    if (previous !== undefined && blend < 1) {
      const from = TIER_COLORS[previous];
      this.#color.lerpColors(from.main, this.#color, blend);
      this.#color2.lerpColors(from.light, this.#color2, blend);
    }

    // The gate.
    const dive = diveBlur(gt);
    const gate = this.#gateUniforms;
    this.#gate.visible = decay > 0.01;
    gate.uTime.value = time;
    gate.uAspect.value = frame.aspect;
    gate.uCenter.value.copy(this.#gateCentre);
    gate.uOpen.value = gateOpen(gt) * decay;
    gate.uZoom.value = gateZoom(gt) + age * 1.4;
    gate.uEnergy.value = gateGlow(gt) + pulse * 0.4;
    gate.uRainbow.value = rainbow ? 1 : 0;
    gate.uDetail.value = this.#quality === 'low' ? 0 : 1;
    gate.uColor.value.copy(this.#color);

    // Speed lines and the thin orbits.
    const speed = speedLines(gt);
    this.#flow += delta * (0.35 + speed * 1.8);
    const streaks = this.#streaksUniforms;
    this.#streaks.visible = decay > 0.01;
    streaks.uTime.value = time;
    streaks.uAspect.value = frame.aspect;
    streaks.uCenter.value.copy(this.#gateCentre);
    streaks.uFlow.value = this.#flow;
    streaks.uSpeed.value = speed * decay;
    streaks.uArcs.value = smoothstep(0, 0.25, u) * decay * (1 - 0.7 * whiteOut(gt));
    streaks.uColor.value.copy(this.#color);
    streaks.uRainbow.value = rainbow ? 1 : 0;

    // The white-out: it builds up at the end of the dive and dies down during the burst.
    const white = flying ? whiteOut(gt) : Math.exp(-age * 2.4);
    const whiteout = this.#whiteoutUniforms;
    this.#whiteout.visible = white > 0.004;
    whiteout.uTime.value = time;
    whiteout.uAspect.value = frame.aspect;
    whiteout.uCenter.value.copy(this.#gateCentre);
    whiteout.uStrength.value = white;
    whiteout.uGrow.value = 0.75 + 0.9 * white + age * 0.9;
    whiteout.uRainbow.value = rainbow ? 1 : 0;
    whiteout.uColor.value.copy(this.#color);

    this.post.blur = dive * decay;
    this.post.aberration = (0.18 + 0.7 * dive) * decay;
    this.#rumble = 0.06 * dive * decay;

    const sky = this.#skyUniforms;
    sky.uGlow.value = (0.04 + 0.22 * gateEnergy(gt) + pulse * 0.2) * decay;
    sky.uGlowColor.value.copy(this.#color);
    sky.uGlowPos.value.copy(this.#gateCentre);

    if (!flying) {
      return;
    }

    // The needle.
    const path = needleProgress(u, hang);
    needlePath(path, this.#scratch);
    const unit = camera.position.distanceTo(this.#scratch) * SCREEN_UNIT;
    this.#head.position.copy(this.#scratch);
    this.#head.quaternion.copy(camera.quaternion);
    this.#head.scale.setScalar(unit * ((hang ? 0.4 : 0.55) + 0.25 * path * path + pulse * 0.8));
    const head = this.#headUniforms;
    head.uColor.value.copy(this.#color);
    head.uCore.value.copy(this.#color2);
    head.uIntensity.value = 0.8 + 0.2 * path + pulse * 0.5;
    head.uFlare.value = 0.4 + 0.3 * path + pulse * 1.1;
    head.uRainbow.value = rainbow ? 1 : 0;
    head.uTime.value = time;

    // Trail: the needle's own earlier positions, seen from the front, so it rushes towards the viewer.
    for (let i = 0; i < TRAIL_SEGMENTS; i += 1) {
      const back = i / (TRAIL_SEGMENTS - 1);
      const point = this.#trail.points[i];
      if (point === undefined) {
        continue;
      }
      needlePath(needleProgress(Math.max(0, u - back * TRAIL_TIME), hang), point);
      this.#trail.widths[i] = camera.position.distanceTo(point) * SCREEN_UNIT * trailProfile(back) * (0.8 + 0.9 * path);
    }
    this.#trail.rebuild(camera.position);
    const trail = this.#trail.uniforms;
    trail.uColor.value.copy(this.#color);
    trail.uCore.value.copy(this.#color2);
    trail.uTime.value = time;
    trail.uIntensity.value = 1.0 + pulse * 0.5;
    trail.uRainbow.value = rainbow ? 1 : 0;

    if (hang) {
      this.#updateThreads(frame, u, threadPower);
    }

    // Sparks that stream off the needle, more for the better tiers.
    const rank = tierRank(tier);
    const sparks = Math.round(clamp01(delta * 60) * (1 + rank * 0.7) * (this.#quality === 'low' ? 0.5 : 1));
    if (sparks > 0) {
      const colors = tier === 'rainbow' ? HEARTS : [TIER_COLORS[tier].main, TIER_COLORS[tier].light];
      const behind = needleProgress(Math.max(0, u - Math.random() * 0.05), hang);
      needlePath(behind, this.#scratch);
      this.#dust.emit({
        count: sparks,
        time,
        origin: this.#scratch,
        spread: unit * 0.9,
        speed: [unit * 0.6, unit * 3.2],
        life: [0.4, 1.1],
        size: [unit * 0.08, unit * 0.26],
        colors,
      });
    }
  }

  readonly #centre = new Vector3();
  readonly #ahead = new Vector3();
  readonly #tangent = new Vector3();
  readonly #right = new Vector3();
  readonly #up = new Vector3();
  readonly #worldUp = new Vector3(0, 1, 0);

  /** The five Heart-coloured threads: they spiral round the path of the needle and tighten round it before it plunges. */
  #updateThreads(frame: FxFrame, u: number, power: number): void {
    const fadeIn = smoothstep(0.1, 0.38, u) * (1 - smoothstep(0.985, 1, u));
    const tighten = smoothstep(0.5, 1, u);
    for (const [k, thread] of this.#threads.entries()) {
      const phase = (k / this.#threads.length) * Math.PI * 2;
      for (let i = 0; i < THREAD_SEGMENTS; i += 1) {
        const back = i / (THREAD_SEGMENTS - 1);
        const earlier = Math.max(0, u - back * THREAD_TIME);
        needlePath(needleProgress(earlier, true), this.#centre);
        needlePath(needleProgress(Math.min(1, earlier + 0.01), true), this.#ahead);
        this.#tangent.subVectors(this.#ahead, this.#centre);
        if (this.#tangent.lengthSq() < 1e-10) {
          this.#tangent.set(0.5, -0.4, -1);
        }
        this.#tangent.normalize();
        this.#right.crossVectors(this.#tangent, this.#worldUp).normalize();
        this.#up.crossVectors(this.#right, this.#tangent);
        const around = frame.camera.position.distanceTo(this.#centre) * SCREEN_UNIT;
        const angle = phase + back * 9 - frame.time * 2.4;
        const radius = around * (0.8 + 2.4 * back) * (1 - tighten * 0.93);
        const point = thread.points[i] ?? this.#centre;
        point.copy(this.#centre).addScaledVector(this.#right, Math.cos(angle) * radius).addScaledVector(this.#up, Math.sin(angle) * radius);
        thread.widths[i] = around * (0.15 + 0.15 * (1 - back)) * (1 - back) ** 0.35;
      }
      thread.rebuild(frame.camera.position);
      const heart = HEARTS[k] ?? WHITE;
      thread.uniforms.uColor.value.copy(heart);
      thread.uniforms.uCore.value.copy(heart).lerp(WHITE, 0.55);
      thread.uniforms.uTime.value = frame.time;
      thread.uniforms.uIntensity.value = 1.5 * power * fadeIn;
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
      rays.uIntensity.value = strength * 0.85 * Math.exp(-t * 2.2) * smoothstep(0, 0.06, t);
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

  /** The ceremony of Art Rare and better: a black screen, a thin line, and one star after the other lights up on it. */
  #updateCeremony(frame: FxFrame): void {
    const active = frame.state.phase === 'ceremony';
    this.#ceremony.visible = active;
    if (!active) {
      this.#starsFired = 0;
      return;
    }
    const stars = ceremonyFor(frame.mode, frame.best);
    const beats = ceremonyBeats(stars);
    const t = frame.state.time;
    const tier = tierOf(frame.best);
    const rainbow = tier === 'rainbow';
    const base = rainbow ? TIER_COLORS.gold.light : TIER_COLORS[tier].main;

    const ceremony = this.#ceremonyUniforms;
    ceremony.uTime.value = frame.time;
    ceremony.uAspect.value = frame.aspect;
    ceremony.uCount.value = stars;
    ceremony.uDraw.value = smoothstep(beats.lineFrom, beats.lineTo, t);
    ceremony.uSpike.value = easeOutCubic(smoothstep(beats.spike, beats.spike + 0.35, t));
    ceremony.uFade.value = 1 - smoothstep(beats.fadeFrom, beats.duration, t);
    ceremony.uHearts.value = rainbow ? 1 : 0;
    ceremony.uColor.value.copy(base);
    for (let i = 0; i < 5; i += 1) {
      const since = t - (beats.firstStar + i * beats.starGap);
      ceremony.uLit.value[i] = smoothstep(0, 0.16, since);
      ceremony.uPop.value[i] = since > 0 ? Math.exp(-since * 7) : 0;
    }

    // A puff of sparks where each star lights up. The line is as wide as the ornament in the shader (see GAP there).
    const fit = Math.min(1, 0.8 * frame.aspect);
    const halfHeight = Math.tan(MathUtils.degToRad(frame.camera.fov / 2)) * frame.camera.position.z;
    const colors = rainbow ? HEARTS : [base, TIER_COLORS.gold.light];
    while (this.#starsFired < stars && t >= beats.firstStar + this.#starsFired * beats.starGap) {
      const x = (this.#starsFired - 0.5 * (stars - 1)) * 0.24 * fit * halfHeight;
      this.#scratch.set(x, 0.27, 0);
      const burstColors = rainbow ? [HEARTS[this.#starsFired] ?? WHITE, WHITE] : colors;
      this.#motes.emit({ count: this.#quality === 'low' ? 10 : 22, time: frame.time, origin: this.#scratch, spread: 0.1, speed: [0.5, 2.6], life: [0.7, 1.5], size: [0.04, 0.1], colors: burstColors });
      this.#starsFired += 1;
    }

    // Golden dust that drifts up through the whole picture.
    this.#moteClock += frame.delta;
    if (this.#moteClock > 0.05 && this.#quality !== 'low') {
      this.#moteClock = 0;
      this.#scratch.set((Math.random() - 0.5) * 2 * halfHeight * frame.aspect * 0.9, (Math.random() - 0.5) * halfHeight * 1.8, 0);
      this.#motes.emit({ count: 2, time: frame.time, origin: this.#scratch, spread: 0.4, speed: [0.1, 0.45], life: [1.6, 3.2], size: [0.025, 0.07], colors, drift: this.#drift });
    }
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
    for (const mesh of [this.#sky, this.#storm, this.#streaks, this.#gate, this.#whiteout, this.#ceremony, this.#head, this.#impactRays, this.#stageRays, this.#halo, this.#flash]) {
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
    this.#dust.dispose();
  }
}
