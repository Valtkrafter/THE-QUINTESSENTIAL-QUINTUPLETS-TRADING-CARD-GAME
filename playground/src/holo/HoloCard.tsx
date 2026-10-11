import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { MeshBasicMaterial, PlaneGeometry, Vector3, type Group, type Mesh, type Texture } from 'three';
import { CARD_HEIGHT, CARD_THICKNESS, CARD_WIDTH, getCardGeometries } from './cardGeometry';
import { CardRig } from './cardRig';
import type { Finish } from './finishes';
import { frameInsetUv } from './frames';
import type { HoloSettings } from './settings';
import type { CardTexture } from './textures';

/** `hover`: tilt toward the pointer, click to select. `inspect`: also drag to spin and double-click to flip. */
export type CardInteraction = 'hover' | 'inspect';

export interface CardReach {
  readonly width: number;
  readonly height: number;
  /** How far the middle of the box lies above the middle of the card. */
  readonly centerY: number;
}

export interface HoloCardProps {
  readonly position: [number, number, number];
  readonly finish: Finish;
  readonly maskIndex: number;
  readonly art: CardTexture;
  readonly mask: CardTexture | null;
  readonly back: CardTexture | null;
  readonly settings: HoloSettings;
  /** World-space light position, mutated by the scene each frame. */
  readonly light: Vector3;
  readonly interaction: CardInteraction;
  /** Embossed foil layer strength (SAR / UR only); defaults to off. */
  readonly premium?: number | undefined;
  /** How worn the copy is (centering, corners, edges, surface; 0 perfect, 1 ruined) and a seed that makes the wear its own. */
  readonly wear?: readonly [number, number, number, number] | undefined;
  readonly wearSeed?: number | undefined;
  readonly shadowTexture: Texture;
  /** Something that goes around the card and moves with it, like the case of a slab. */
  readonly children?: ReactNode;
  /** The box around the card that takes the pointer and casts the shadow, when it is bigger than the card (a slab is). */
  readonly reach?: CardReach | undefined;
  readonly label?: Texture | undefined;
  /** Increment to flip the card over. */
  readonly flipRequest?: number | undefined;
  /** Offsets the idle sway so neighbouring cards don't move in sync. */
  readonly idlePhase?: number | undefined;
  readonly onSelect?: (() => void) | undefined;
}

// The hit area does not rotate with the card, so the pointer mapping stays stable while the card tilts.
const hitGeometry = new PlaneGeometry(CARD_WIDTH * 1.12, CARD_HEIGHT * 1.12);
const shadowGeometry = new PlaneGeometry(CARD_WIDTH * 1.5, CARD_HEIGHT * 1.35);
const labelGeometry = new PlaneGeometry(CARD_WIDTH, CARD_WIDTH / 8);

export function HoloCard({
  position,
  finish,
  maskIndex,
  art,
  mask,
  back,
  settings,
  light,
  interaction,
  premium = 0,
  wear,
  wearSeed,
  shadowTexture,
  children,
  reach,
  label,
  flipRequest = 0,
  idlePhase = 0,
  onSelect,
}: HoloCardProps) {
  const geometries = getCardGeometries();
  const [rig] = useState(() => new CardRig(shadowTexture));
  const [scratch] = useState(() => new Vector3());
  const labelMaterial = useMemo(
    () => (label === undefined ? null : new MeshBasicMaterial({ map: label, transparent: true, depthWrite: false })),
    [label],
  );

  const pivotRef = useRef<Group>(null);
  const frontRef = useRef<Mesh>(null);
  const backRef = useRef<Mesh>(null);
  const hitRef = useRef<Mesh>(null);
  const shadowRef = useRef<Mesh>(null);
  const releaseDragRef = useRef<(() => void) | null>(null);
  const lastFlipRef = useRef(flipRequest);

  useEffect(() => () => rig.dispose(), [rig]);
  useEffect(() => () => labelMaterial?.dispose(), [labelMaterial]);
  useEffect(() => () => releaseDragRef.current?.(), []);

  useEffect(() => {
    rig.setShadowTexture(shadowTexture);
  }, [rig, shadowTexture]);

  useEffect(() => {
    rig.setLook({
      finishIndex: finish.shaderIndex,
      maskIndex,
      intensity: settings.intensity,
      glare: settings.glare,
      frameInset: frameInsetUv(settings.frameStyle),
      premium,
      wear,
      wearSeed,
    });
  }, [rig, finish, maskIndex, settings.intensity, settings.glare, settings.frameStyle, premium, wear, wearSeed]);

  useEffect(() => {
    rig.setArt(art, mask, settings.artFit, settings.artFocus);
  }, [rig, art, mask, settings.artFit, settings.artFocus]);

  useEffect(() => {
    rig.setBack(back);
  }, [rig, back]);

  useEffect(() => {
    if (flipRequest !== lastFlipRef.current) {
      lastFlipRef.current = flipRequest;
      rig.flip();
    }
  }, [rig, flipRequest]);

  const handlePointerEnter = () => {
    document.body.style.cursor = interaction === 'inspect' ? 'grab' : 'pointer';
  };

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    const hit = hitRef.current;
    if (hit !== null) {
      const local = hit.worldToLocal(scratch.copy(event.point));
      rig.pointerMove(local.x / (CARD_WIDTH / 2), local.y / (CARD_HEIGHT / 2));
    }
  };

  const handlePointerLeave = () => {
    rig.pointerLeave();
    if (!rig.dragging) {
      document.body.style.cursor = 'auto';
    }
  };

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (interaction !== 'inspect') {
      return;
    }
    event.stopPropagation();
    releaseDragRef.current?.();
    rig.beginDrag(event.nativeEvent.clientX, performance.now());
    document.body.style.cursor = 'grabbing';

    const handleMove = (moveEvent: PointerEvent) => {
      rig.dragTo(moveEvent.clientX, performance.now());
    };
    const release = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      releaseDragRef.current = null;
      rig.endDrag(performance.now());
      document.body.style.cursor = rig.hovering ? 'grab' : 'auto';
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    releaseDragRef.current = release;
  };

  const handleClick = () => {
    if (interaction === 'hover') {
      onSelect?.();
    }
  };

  const handleDoubleClick = () => {
    if (interaction === 'inspect') {
      rig.flip();
    }
  };

  useFrame((state, delta) => {
    const pivot = pivotRef.current;
    const front = frontRef.current;
    const backMesh = backRef.current;
    const shadow = shadowRef.current;
    if (pivot === null || front === null || backMesh === null || shadow === null) {
      return;
    }
    rig.update(
      { pivot, front, back: backMesh, shadow },
      {
        time: state.clock.elapsedTime,
        delta,
        camera: state.camera,
        light,
        tilt: settings.tilt,
        idleMotion: settings.idleMotion,
        idlePhase,
        liftOnHover: interaction === 'hover',
      },
    );
  });

  const hitScale: [number, number, number] =
    reach === undefined
      ? [1, 1, 1]
      : [Math.max(1, reach.width / (CARD_WIDTH * 1.12)), Math.max(1, (Math.abs(reach.centerY) + reach.height / 2) / ((CARD_HEIGHT * 1.12) / 2)), 1];
  const shadowFit: [number, number, number] = reach === undefined ? [1, 1, 1] : [reach.width / CARD_WIDTH, reach.height / CARD_HEIGHT, 1];

  return (
    <group position={position}>
      <mesh
        ref={hitRef}
        geometry={hitGeometry}
        scale={hitScale}
        visible={false}
        onPointerEnter={handlePointerEnter}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      />
      <group position={[0, reach?.centerY ?? 0, 0]} scale={shadowFit}>
        <mesh ref={shadowRef} geometry={shadowGeometry} material={rig.shadowMaterial} renderOrder={-1} />
      </group>
      <group ref={pivotRef}>
        <mesh geometry={geometries.edge} material={rig.edgeMaterials} />
        <mesh ref={frontRef} geometry={geometries.front} material={rig.front.material} position={[0, 0, CARD_THICKNESS / 2]} />
        <mesh ref={backRef} geometry={geometries.back} material={rig.back.material} position={[0, 0, -CARD_THICKNESS / 2]} />
        {children}
      </group>
      {labelMaterial !== null && (
        <mesh geometry={labelGeometry} material={labelMaterial} position={[0, -CARD_HEIGHT / 2 - 0.42, 0]} />
      )}
    </group>
  );
}
