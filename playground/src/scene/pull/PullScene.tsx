// The 3D side of the pull show: the glowing sky and everything in it (see fx/PullFx), and the one card that is shown at
// a time, drawn by the same holo renderer as the inspect view. The director decides what happens; this component plays it.

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { MathUtils, PerspectiveCamera, Scene, Vector3, type Group } from 'three';
import { useComposedCard } from '../../cardface/useComposedCard';
import type { FrameStyle } from '../../cards/frameStyle';
import type { Rarity } from '../../cards/model';
import { findFinish, resolveMaskIndex } from '../../holo/finishes';
import { hasFrame } from '../../holo/frames';
import { HoloCard } from '../../holo/HoloCard';
import { premiumStrength } from '../../holo/premium';
import { DEFAULT_SETTINGS, type HoloSettings } from '../../holo/settings';
import { createShadowTexture } from '../../holo/textures';
import type { GraphicsLevel } from '../../state/preferences';
import { DEFAULT_LIGHT, useSceneLight } from '../sceneKit';
import { bestRarity, progress } from './director';
import { PullFx } from './fx/PullFx';
import { CARD_HOME_Y, cardPose } from './motion';
import { revealLook } from './palette';
import type { PullRunner } from './runner';
import { ordersOf, type ScenePack } from './types';
import { useGlowCompositor } from './useGlowCompositor';

export interface PullSceneProps {
  readonly runner: PullRunner;
  readonly packs: readonly ScenePack[];
  readonly graphics: GraphicsLevel;
  readonly frameStyle: FrameStyle;
  readonly idleMotion: boolean;
  readonly maxPixelRatio: number;
  /** False while the cards are still being prepared; the show waits at its start. */
  readonly running: boolean;
}

const CAMERA_Z = 12.6;
const CAMERA_FOV = 40;

export function PullScene(props: PullSceneProps) {
  return (
    <Canvas
      flat
      dpr={[1, props.maxPixelRatio]}
      camera={{ fov: CAMERA_FOV, near: 0.1, far: 150, position: [0, 0.2, CAMERA_Z] }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
    >
      <Stage {...props} />
    </Canvas>
  );
}

function Stage({ runner, packs, graphics, frameStyle, idleMotion, running }: PullSceneProps) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);

  const fx = useMemo(() => new PullFx(graphics), [graphics]);
  const background = useMemo(() => new Scene(), []);
  // The effects are put into the scenes in an effect, not while rendering: React may render twice and an object can only
  // have one parent.
  useEffect(() => {
    background.add(fx.background);
    scene.add(fx.foreground);
    return () => {
      background.remove(fx.background);
      scene.remove(fx.foreground);
      fx.dispose();
    };
  }, [background, scene, fx]);
  useGlowCompositor(background, graphics !== 'low');

  const orders = useMemo(() => ordersOf(packs), [packs]);
  const snapshot = useSyncExternalStore(runner.subscribe, runner.getSnapshot);
  const shown = packs[snapshot.pack]?.pulls[orders[snapshot.pack]?.[snapshot.card] ?? -1];
  const showingCard = snapshot.phase === 'enter' || snapshot.phase === 'flip' || snapshot.phase === 'show' || snapshot.phase === 'exit';

  const composed = useComposedCard(showingCard && shown !== undefined ? shown.card : null, frameStyle);
  const ready = composed !== null && shown !== undefined && composed.cardId === shown.card.id;
  const readyRef = useRef(false);
  useEffect(() => {
    readyRef.current = ready;
  }, [ready]);

  const shadowTexture = useMemo(() => createShadowTexture(), []);
  useEffect(() => () => shadowTexture.dispose(), [shadowTexture]);
  const light = useSceneLight(false);
  const settings = useMemo<HoloSettings>(() => ({ ...DEFAULT_SETTINGS, frameStyle, idleMotion }), [frameStyle, idleMotion]);

  const clock = useRef(0);
  const cardGroup = useRef<Group>(null);
  const push = useRef(0);
  const shake = useMemo(() => new Vector3(), []);

  useEffect(
    () =>
      runner.onEvent((event) => {
        if (event.type === 'impact') {
          const pack = runner.packs[event.pack];
          fx.impact(clock.current, pack === undefined ? 'C' : bestRarity(pack));
        } else if (event.type === 'flip-midpoint') {
          const index = orders[event.pack]?.[event.card];
          const rarity: Rarity | undefined = index === undefined ? undefined : runner.packs[event.pack]?.rarities[index];
          fx.flipMidpoint(clock.current, rarity ?? 'C');
        }
      }),
    [runner, fx, orders],
  );

  useFrame((_, delta) => {
    let dt = Math.min(delta, 0.25);
    if (import.meta.env.DEV && Reflect.get(window, '__pullFreeze') === true) {
      // Development only: the show stands still and moves by the amount of seconds set in __pullAdvance.
      const advance = Reflect.get(window, '__pullAdvance');
      dt = typeof advance === 'number' ? advance : 0;
      Reflect.set(window, '__pullAdvance', 0);
    }
    clock.current += dt;
    if (running) {
      runner.step(dt);
    }
    const state = runner.state;
    const pack = runner.packs[state.pack];
    const phaseShowsCard = state.phase === 'enter' || state.phase === 'flip' || state.phase === 'show' || state.phase === 'exit';
    const index = orders[state.pack]?.[state.card];
    const cardRarity: Rarity | null = phaseShowsCard && pack !== undefined && index !== undefined ? (pack.rarities[index] ?? null) : null;
    const look = cardRarity === null ? null : revealLook(cardRarity);
    const phaseProgress = progress(runner.mode, runner.packs, state);

    if (!(camera instanceof PerspectiveCamera)) {
      return;
    }
    fx.update({
      time: clock.current,
      delta: dt,
      camera,
      pixelHeight: size.height * gl.getPixelRatio(),
      aspect: size.width / Math.max(size.height, 1),
      state,
      mode: runner.mode,
      best: pack === undefined ? 'C' : bestRarity(pack),
      card: cardRarity,
      progress: phaseProgress,
    });

    // Camera: a shake from the bursts, and a slow push-in for the two best rarities.
    const pushTarget = look?.spotlight === true && (state.phase === 'flip' || state.phase === 'show') ? 1 : 0;
    push.current = MathUtils.damp(push.current, pushTarget, 2.6, dt);
    fx.cameraShake(clock.current, shake);
    camera.position.set(shake.x, 0.2 + shake.y, CAMERA_Z - push.current * 1.7);
    camera.lookAt(0, CARD_HOME_Y * 0.6, 0);

    // The card on show.
    const group = cardGroup.current;
    if (group !== null) {
      const pose = cardPose(state.phase, phaseProgress, look?.intensity ?? 0);
      group.visible = phaseShowsCard && readyRef.current;
      group.position.set(pose.x, pose.y, pose.z);
      group.rotation.set(0, pose.turn, pose.roll);
      group.scale.setScalar(pose.scale);
    }
  }, 0);

  const finish = findFinish(shown?.finish ?? 'standard');

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[DEFAULT_LIGHT.x, DEFAULT_LIGHT.y, DEFAULT_LIGHT.z]} intensity={1.4} />
      <group ref={cardGroup} visible={false}>
        {composed !== null && shown !== undefined && (
          <HoloCard
            position={[0, 0, 0]}
            finish={finish}
            maskIndex={resolveMaskIndex(settings.maskSetting, finish, true, hasFrame(frameStyle))}
            art={composed.face}
            mask={composed.mask}
            back={null}
            settings={settings}
            light={light}
            interaction="inspect"
            premium={premiumStrength(shown.card.rarity)}
            shadowTexture={shadowTexture}
          />
        )}
      </group>
    </>
  );
}
