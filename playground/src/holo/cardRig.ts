import {
  CustomBlending,
  MeshBasicMaterial,
  OneFactor,
  OneMinusSrcAlphaFactor,
  SrcAlphaFactor,
  Vector2,
  type Camera,
  type Group,
  type Mesh,
  type Texture,
  type Vector3,
} from 'three';
import { CARD_ASPECT } from './cardGeometry';
import {
  createBackShader,
  createEdgeMaterials,
  createFrontShader,
  type BackUniforms,
  type CardShader,
  type FrontUniforms,
} from './cardMaterials';
import { createSpring, stepSpring, type SpringConfig } from './spring';
import type { ArtFit } from './settings';
import { fitTransform, type CardTexture } from './textures';

export interface CardRigMeshes {
  readonly pivot: Group;
  readonly front: Mesh;
  readonly back: Mesh;
  readonly shadow: Mesh;
}

export interface CardLook {
  readonly finishIndex: number;
  readonly maskIndex: number;
  readonly intensity: number;
  readonly glare: number;
  /** Printed border width in card uv (x, y); see frames.ts. */
  readonly frameInset: readonly [number, number];
  /** Embossed foil layer strength; 0 for every rarity except SAR and UR (see premium.ts). */
  readonly premium: number;
  /** How worn the copy is: centering, corners, edges, surface, each from 0 (perfect) to 1 (ruined). */
  readonly wear?: readonly [number, number, number, number] | undefined;
  /** 0..1, different for every copy, so no two worn cards wear alike. */
  readonly wearSeed?: number | undefined;
}

export interface CardFrameInput {
  readonly time: number;
  readonly delta: number;
  readonly camera: Camera;
  /** World-space light position. */
  readonly light: Vector3;
  /** Multiplier on the maximum hover tilt. */
  readonly tilt: number;
  readonly idleMotion: boolean;
  readonly idlePhase: number;
  /** Raise and enlarge the card while hovered (gallery behaviour). */
  readonly liftOnHover: boolean;
}

const MAX_TILT_RADIANS = 0.32;
const TILT_SPRING: SpringConfig = { stiffness: 120, damping: 14 };
const HOVER_SPRING: SpringConfig = { stiffness: 160, damping: 24 };
const SPIN_SPRING: SpringConfig = { stiffness: 55, damping: 10 };
const DRAG_RADIANS_PER_PIXEL = 0.012;
const RELEASE_LOOKAHEAD_SECONDS = 0.18;
const RELEASE_STALE_MS = 80;
const HOVER_LIFT = 0.4;
const HOVER_SCALE = 0.04;

function nearestHalfTurn(angle: number): number {
  return Math.round(angle / Math.PI) * Math.PI;
}

function clampUnit(value: number): number {
  return Math.min(Math.max(value, -1), 1);
}

/**
 * Imperative side of a card: owns its materials and motion springs and drives the meshes every frame.
 * Kept outside React so per-frame mutation never touches component state.
 */
export class CardRig {
  readonly front: CardShader<FrontUniforms> = createFrontShader();
  readonly back: CardShader<BackUniforms> = createBackShader();
  readonly edgeMaterials = createEdgeMaterials();
  readonly shadowMaterial: MeshBasicMaterial;

  #tiltX = createSpring();
  #tiltY = createSpring();
  #spin = createSpring();
  #hover = createSpring();
  /** Pointer position across the card, -1..1 on both axes. */
  #pointer = new Vector2(0, 0);
  #hovering = false;
  #dragging = false;
  #spinTarget = 0;
  #dragStartX = 0;
  #dragStartSpin = 0;
  #lastDragTime = 0;
  #dragVelocity = 0;

  constructor(shadowTexture: Texture) {
    // Drawn in the opaque pass before the cards (renderOrder -1) without depth testing, so a tilted
    // card's corner can never dip behind its own shadow. Custom blending keeps alpha compositing there.
    this.shadowMaterial = new MeshBasicMaterial({
      map: shadowTexture,
      opacity: 0.5,
      blending: CustomBlending,
      blendSrc: SrcAlphaFactor,
      blendDst: OneMinusSrcAlphaFactor,
      blendSrcAlpha: OneFactor,
      blendDstAlpha: OneMinusSrcAlphaFactor,
      depthWrite: false,
      depthTest: false,
    });
  }

  get hovering(): boolean {
    return this.#hovering;
  }

  get dragging(): boolean {
    return this.#dragging;
  }

  setShadowTexture(texture: Texture): void {
    if (this.shadowMaterial.map !== texture) {
      this.shadowMaterial.map = texture;
      this.shadowMaterial.needsUpdate = true;
    }
  }

  setLook({ finishIndex, maskIndex, intensity, glare, frameInset, premium, wear, wearSeed }: CardLook): void {
    const uniforms = this.front.uniforms;
    uniforms.uFinish.value = finishIndex;
    uniforms.uMaskMode.value = maskIndex;
    uniforms.uIntensity.value = intensity;
    uniforms.uGlare.value = glare;
    uniforms.uFrameInset.value.set(frameInset[0], frameInset[1]);
    uniforms.uPremium.value = premium;
    uniforms.uWear.value.set(wear?.[0] ?? 0, wear?.[1] ?? 0, wear?.[2] ?? 0, wear?.[3] ?? 0);
    uniforms.uWearSeed.value = wearSeed ?? 0;
    this.back.uniforms.uIntensity.value = intensity;
  }

  setArt(art: CardTexture, mask: CardTexture | null, fit: ArtFit, focus: number): void {
    const uniforms = this.front.uniforms;
    uniforms.uMap.value = art.texture;
    fitTransform(art.aspect, CARD_ASPECT, fit, focus, uniforms.uMapTransform.value);
    uniforms.uMask.value = mask?.texture ?? null;
    uniforms.uHasMask.value = mask === null ? 0 : 1;
  }

  setBack(back: CardTexture | null): void {
    const uniforms = this.back.uniforms;
    uniforms.uBackMap.value = back?.texture ?? null;
    uniforms.uHasBackMap.value = back === null ? 0 : 1;
    if (back !== null) {
      fitTransform(back.aspect, CARD_ASPECT, 'cover', 0.5, uniforms.uBackTransform.value);
    }
  }

  flip(): void {
    this.#spinTarget = nearestHalfTurn(this.#spinTarget) + Math.PI;
  }

  /** x and y are the pointer position across the card, where -1..1 spans each axis. */
  pointerMove(x: number, y: number): void {
    this.#pointer.set(clampUnit(x), clampUnit(y));
    this.#hovering = true;
  }

  pointerLeave(): void {
    this.#hovering = false;
  }

  beginDrag(clientX: number, now: number): void {
    this.#dragging = true;
    this.#dragStartX = clientX;
    this.#dragStartSpin = this.#spin.value;
    this.#lastDragTime = now;
    this.#dragVelocity = 0;
  }

  dragTo(clientX: number, now: number): void {
    const next = this.#dragStartSpin + (clientX - this.#dragStartX) * DRAG_RADIANS_PER_PIXEL;
    const elapsedSeconds = Math.max((now - this.#lastDragTime) / 1000, 1 / 240);
    this.#dragVelocity = this.#dragVelocity * 0.6 + ((next - this.#spin.value) / elapsedSeconds) * 0.4;
    this.#spin.value = next;
    this.#spin.velocity = 0;
    this.#lastDragTime = now;
  }

  /** Lets the spin coast with its release velocity, then settle face-up or face-down. */
  endDrag(now: number): void {
    if (now - this.#lastDragTime > RELEASE_STALE_MS) {
      this.#dragVelocity = 0;
    }
    this.#dragging = false;
    this.#spinTarget = nearestHalfTurn(this.#spin.value + this.#dragVelocity * RELEASE_LOOKAHEAD_SECONDS);
    this.#spin.velocity = this.#dragVelocity;
  }

  update(meshes: CardRigMeshes, input: CardFrameInput): void {
    const { time, delta } = input;
    const maxTilt = MAX_TILT_RADIANS * input.tilt;
    let targetTiltX = 0;
    let targetTiltY = 0;
    if (this.#hovering && !this.#dragging) {
      // Press-down feel: the side under the pointer dips away from the viewer.
      targetTiltX = -this.#pointer.y * maxTilt;
      targetTiltY = this.#pointer.x * maxTilt;
    } else if (input.idleMotion && !this.#dragging) {
      targetTiltX = Math.sin(time * 0.7 + input.idlePhase) * maxTilt * 0.28;
      targetTiltY = Math.cos(time * 0.55 + input.idlePhase * 1.7) * maxTilt * 0.4;
    }
    stepSpring(this.#tiltX, targetTiltX, TILT_SPRING, delta);
    stepSpring(this.#tiltY, targetTiltY, TILT_SPRING, delta);
    stepSpring(this.#hover, this.#hovering ? 1 : 0, HOVER_SPRING, delta);
    if (!this.#dragging) {
      stepSpring(this.#spin, this.#spinTarget, SPIN_SPRING, delta);
    }

    const { pivot, front, back, shadow } = meshes;
    const lift = input.liftOnHover ? this.#hover.value : 0;
    pivot.rotation.set(this.#tiltX.value, this.#tiltY.value + this.#spin.value, 0);
    pivot.position.z = lift * HOVER_LIFT;
    pivot.scale.setScalar(1 + lift * HOVER_SCALE);
    pivot.updateMatrixWorld();

    const frontUniforms = this.front.uniforms;
    frontUniforms.uTime.value = time;
    frontUniforms.uHover.value = this.#hover.value;
    frontUniforms.uPointer.value.set(this.#pointer.x * 0.5 + 0.5, this.#pointer.y * 0.5 + 0.5);
    front.worldToLocal(frontUniforms.uCameraLocal.value.copy(input.camera.position));
    front.worldToLocal(frontUniforms.uLightLocal.value.copy(input.light));

    const backUniforms = this.back.uniforms;
    back.worldToLocal(backUniforms.uCameraLocal.value.copy(input.camera.position));
    back.worldToLocal(backUniforms.uLightLocal.value.copy(input.light));

    shadow.position.set(0.1 - this.#tiltY.value * 0.5, -0.16 + this.#tiltX.value * 0.5, -0.3);
    shadow.scale.setScalar(1 + lift * 0.08);
    this.shadowMaterial.opacity = 0.5 + lift * 0.15;
  }

  dispose(): void {
    this.front.material.dispose();
    this.back.material.dispose();
    for (const material of this.edgeMaterials) {
      material.dispose();
    }
    this.shadowMaterial.dispose();
  }
}
