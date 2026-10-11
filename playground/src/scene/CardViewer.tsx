// One card in 3D, for the inspect screen: drag to turn it, double-click to flip it, the finish reacts to the tilt.
// This is the only WebGL view the collection screens use; every grid shows flat thumbnails instead.

import { Canvas } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { useComposedCard } from '../cardface/useComposedCard';
import type { Card } from '../cards/model';
import type { Condition } from '../domain/ownership';
import { CARD_HEIGHT, CARD_WIDTH } from '../holo/cardGeometry';
import { findFinish, resolveMaskIndex, type FinishId } from '../holo/finishes';
import { hasFrame } from '../holo/frames';
import { HoloCard } from '../holo/HoloCard';
import { premiumStrength } from '../holo/premium';
import type { HoloSettings } from '../holo/settings';
import { Slab } from '../holo/Slab';
import { SLAB_EXTENT } from '../holo/slabShape';
import type { SlabLabelInfo } from '../holo/slabLabel';
import { useSlabLabel } from '../holo/useSlabLabel';
import { wearSeedOf, wearVector } from '../holo/wear';
import { createShadowTexture } from '../holo/textures';
import { DEFAULT_LIGHT, useCameraFit, useSceneLight } from './sceneKit';

export interface CardViewerProps {
  readonly card: Card;
  readonly finishId: FinishId;
  readonly settings: HoloSettings;
  /** Highest pixel ratio to draw at (lower it on weak graphics cards). */
  readonly maxPixelRatio: number;
  /** Increment to flip the card over. */
  readonly flipRequest: number;
  /** How handled the copy is: scratches, white edges and an off-centre print show in the shader. Left out, the card is perfect. */
  readonly condition?: Condition | null | undefined;
  /** Makes the wear of this copy its own (the copy's uid). */
  readonly wearKey?: string | undefined;
  /** The label of the slab around a graded copy. Left out, the card is shown bare. */
  readonly slab?: SlabLabelInfo | null | undefined;
  /** Called once the card face is painted and on screen. */
  readonly onReady?: (() => void) | undefined;
}

export function CardViewer(props: CardViewerProps) {
  return (
    <Canvas
      flat
      dpr={[1, props.maxPixelRatio]}
      camera={{ fov: 30, near: 0.1, far: 100, position: [0, 0, 18] }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
    >
      <ViewerScene {...props} />
    </Canvas>
  );
}

function ViewerScene({ card, finishId, settings, flipRequest, onReady, condition, wearKey, slab }: CardViewerProps) {
  const composed = useComposedCard(card, settings.frameStyle);
  const slabLabel = useSlabLabel(slab ?? null);
  const wear = useMemo(() => (condition === null || condition === undefined ? undefined : wearVector(condition)), [condition]);
  const wearSeed = useMemo(() => wearSeedOf(wearKey ?? ''), [wearKey]);
  const shadowTexture = useMemo(() => createShadowTexture(), []);
  const light = useSceneLight(settings.lightFollowsPointer);
  const finish = findFinish(finishId);
  const slabbed = slab !== null && slab !== undefined;
  // A slab is shown only once its label is painted, so the bare card never flashes before the case appears.
  const ready = composed !== null && (!slabbed || slabLabel !== null);

  useEffect(() => () => shadowTexture.dispose(), [shadowTexture]);
  useEffect(() => {
    if (ready) {
      onReady?.();
    }
  }, [ready, onReady]);

  useCameraFit(slabbed ? SLAB_EXTENT.width * 1.22 : CARD_WIDTH * 1.3, slabbed ? SLAB_EXTENT.height * 1.1 : CARD_HEIGHT * 1.14);

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[DEFAULT_LIGHT.x, DEFAULT_LIGHT.y, DEFAULT_LIGHT.z]} intensity={1.4} />
      {composed !== null && ready && (
        <HoloCard
          position={[0, slabbed ? -SLAB_EXTENT.centerY : 0, 0]}
          reach={slabbed ? SLAB_EXTENT : undefined}
          finish={finish}
          maskIndex={resolveMaskIndex(settings.maskSetting, finish, true, hasFrame(settings.frameStyle))}
          art={composed.face}
          mask={composed.mask}
          back={null}
          settings={settings}
          light={light}
          interaction="inspect"
          premium={premiumStrength(card.rarity)}
          wear={wear}
          wearSeed={wearSeed}
          shadowTexture={shadowTexture}
          flipRequest={flipRequest}
        >
          {slabbed && slabLabel !== null && <Slab label={slabLabel} band={slab.band} light={light} />}
        </HoloCard>
      )}
    </>
  );
}
