// One card in 3D, for the inspect screen: drag to turn it, double-click to flip it, the finish reacts to the tilt.
// This is the only WebGL view the collection screens use; every grid shows flat thumbnails instead.

import { Canvas } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { useComposedCard } from '../cardface/useComposedCard';
import type { Card } from '../cards/model';
import { CARD_HEIGHT, CARD_WIDTH } from '../holo/cardGeometry';
import { findFinish, resolveMaskIndex, type FinishId } from '../holo/finishes';
import { hasFrame } from '../holo/frames';
import { HoloCard } from '../holo/HoloCard';
import { premiumStrength } from '../holo/premium';
import type { HoloSettings } from '../holo/settings';
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

function ViewerScene({ card, finishId, settings, flipRequest, onReady }: CardViewerProps) {
  const composed = useComposedCard(card, settings.frameStyle);
  const shadowTexture = useMemo(() => createShadowTexture(), []);
  const light = useSceneLight(settings.lightFollowsPointer);
  const finish = findFinish(finishId);

  useEffect(() => () => shadowTexture.dispose(), [shadowTexture]);
  useEffect(() => {
    if (composed !== null) {
      onReady?.();
    }
  }, [composed, onReady]);

  useCameraFit(CARD_WIDTH * 1.3, CARD_HEIGHT * 1.14);

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[DEFAULT_LIGHT.x, DEFAULT_LIGHT.y, DEFAULT_LIGHT.z]} intensity={1.4} />
      {composed !== null && (
        <HoloCard
          position={[0, 0, 0]}
          finish={finish}
          maskIndex={resolveMaskIndex(settings.maskSetting, finish, true, hasFrame(settings.frameStyle))}
          art={composed.face}
          mask={composed.mask}
          back={null}
          settings={settings}
          light={light}
          interaction="inspect"
          premium={premiumStrength(card.rarity)}
          shadowTexture={shadowTexture}
          flipRequest={flipRequest}
        />
      )}
    </>
  );
}
