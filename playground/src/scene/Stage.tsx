import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useComposedCard } from '../cardface/useComposedCard';
import type { Card } from '../cards/model';
import { CARD_HEIGHT, CARD_WIDTH } from '../holo/cardGeometry';
import { FINISHES, findFinish, resolveMaskIndex, type Finish, type FinishId } from '../holo/finishes';
import { hasFrame } from '../holo/frames';
import { premiumStrength } from '../holo/premium';
import { HoloCard } from '../holo/HoloCard';
import type { HoloSettings, ViewMode } from '../holo/settings';
import {
  createEmptyArtTexture,
  createLabelTexture,
  createShadowTexture,
  useCardTexture,
} from '../holo/textures';
import { DEFAULT_LIGHT, useCameraFit, useSceneLight } from './sceneKit';

/** What goes on the card face: a composed catalog card, or a raw image (with an optional mask). */
export type FaceSource =
  | { readonly kind: 'card'; readonly card: Card }
  | { readonly kind: 'art'; readonly artUrl: string; readonly maskUrl: string | null }
  | { readonly kind: 'none' };

export interface StageProps {
  readonly mode: ViewMode;
  readonly finishId: FinishId;
  readonly settings: HoloSettings;
  readonly source: FaceSource;
  readonly backUrl: string | null;
  readonly flipRequest: number;
  readonly onSelectFinish: (id: FinishId) => void;
  readonly onGpuDetected: (name: string) => void;
  readonly fpsRef: RefObject<HTMLSpanElement | null>;
}

interface GalleryItem {
  readonly finish: Finish;
  readonly position: [number, number, number];
}

interface GalleryLayout {
  readonly items: readonly GalleryItem[];
  readonly width: number;
  readonly height: number;
}

const GALLERY_GAP_X = 0.55;
/** Includes room for the finish label under each card. */
const GALLERY_GAP_Y = 1.05;

export function Stage(props: StageProps) {
  return (
    <Canvas
      flat
      dpr={[1, 2]}
      camera={{ fov: 30, near: 0.1, far: 100, position: [0, 0, 18] }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
    >
      <Scene {...props} />
    </Canvas>
  );
}

function createGalleryLayout(aspect: number): GalleryLayout {
  const columns = aspect >= 1.45 ? 4 : aspect >= 0.85 ? 3 : 2;
  const rows = Math.ceil(FINISHES.length / columns);
  const stepX = CARD_WIDTH + GALLERY_GAP_X;
  const stepY = CARD_HEIGHT + GALLERY_GAP_Y;
  const items = FINISHES.map((finish, index): GalleryItem => {
    const row = Math.floor(index / columns);
    const cardsInRow = Math.min(columns, FINISHES.length - row * columns);
    const column = index - row * columns;
    const x = (column - (cardsInRow - 1) / 2) * stepX;
    const y = ((rows - 1) / 2 - row) * stepY + GALLERY_GAP_Y * 0.25;
    return { finish, position: [x, y, 0] };
  });
  return { items, width: columns * stepX - GALLERY_GAP_X, height: rows * stepY - GALLERY_GAP_Y * 0.5 };
}

function Scene({
  mode,
  finishId,
  settings,
  source,
  backUrl,
  flipRequest,
  onSelectFinish,
  onGpuDetected,
  fpsRef,
}: StageProps) {
  const composed = useComposedCard(source.kind === 'card' ? source.card : null, settings.frameStyle);
  const loadedArt = useCardTexture(source.kind === 'art' ? source.artUrl : null);
  const loadedMask = useCardTexture(source.kind === 'art' ? source.maskUrl : null);
  const mask = composed?.mask ?? loadedMask;
  const back = useCardTexture(backUrl);
  const emptyArt = useMemo(() => createEmptyArtTexture(), []);
  const shadowTexture = useMemo(() => createShadowTexture(), []);
  const labels = useMemo(() => new Map(FINISHES.map((finish) => [finish.id, createLabelTexture(finish.label)])), []);
  const light = useSceneLight(settings.lightFollowsPointer);

  useEffect(
    () => () => {
      emptyArt.texture.dispose();
      shadowTexture.dispose();
      for (const texture of labels.values()) {
        texture.dispose();
      }
    },
    [emptyArt, shadowTexture, labels],
  );

  const viewport = useThree((state) => state.size);
  const gallery = useMemo(
    () => createGalleryLayout(viewport.width / Math.max(viewport.height, 1)),
    [viewport.width, viewport.height],
  );
  const art = composed?.face ?? loadedArt ?? emptyArt;
  const premium = source.kind === 'card' ? premiumStrength(source.card.rarity) : 0;
  const inspectedFinish = findFinish(finishId);

  useCameraFit(
    mode === 'gallery' ? gallery.width : CARD_WIDTH * 1.5,
    mode === 'gallery' ? gallery.height : CARD_HEIGHT * 1.18,
  );

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[DEFAULT_LIGHT.x, DEFAULT_LIGHT.y, DEFAULT_LIGHT.z]} intensity={1.4} />
      {mode === 'gallery' ? (
        gallery.items.map(({ finish, position }, index) => (
          <HoloCard
            key={finish.id}
            position={position}
            finish={finish}
            maskIndex={resolveMaskIndex(settings.maskSetting, finish, mask !== null, hasFrame(settings.frameStyle))}
            art={art}
            mask={mask}
            back={back}
            settings={settings}
            light={light}
            interaction="hover"
            premium={premium}
            shadowTexture={shadowTexture}
            label={labels.get(finish.id)}
            idlePhase={index * 1.37}
            onSelect={() => onSelectFinish(finish.id)}
          />
        ))
      ) : (
        <HoloCard
          key="inspect"
          position={[0, 0, 0]}
          finish={inspectedFinish}
          maskIndex={resolveMaskIndex(settings.maskSetting, inspectedFinish, mask !== null, hasFrame(settings.frameStyle))}
          art={art}
          mask={mask}
          back={back}
          settings={settings}
          light={light}
          interaction="inspect"
          premium={premium}
          shadowTexture={shadowTexture}
          flipRequest={flipRequest}
        />
      )}
      <PerfProbe fpsRef={fpsRef} onGpuDetected={onGpuDetected} />
    </>
  );
}

interface PerfProbeProps {
  readonly fpsRef: RefObject<HTMLSpanElement | null>;
  readonly onGpuDetected: (name: string) => void;
}

function readGpuName(context: WebGLRenderingContext | WebGL2RenderingContext): string {
  const debugInfo = context.getExtension('WEBGL_debug_renderer_info');
  const name: unknown = context.getParameter(debugInfo === null ? context.RENDERER : debugInfo.UNMASKED_RENDERER_WEBGL);
  return typeof name === 'string' && name.length > 0 ? name : 'Unknown GPU';
}

/** Reports the GPU once and writes the frame rate straight to the DOM, so measuring never re-renders React. */
function PerfProbe({ fpsRef, onGpuDetected }: PerfProbeProps) {
  const renderer = useThree((state) => state.gl);
  const counterRef = useRef({ frames: 0, seconds: 0 });

  useEffect(() => {
    onGpuDetected(readGpuName(renderer.getContext()));
  }, [renderer, onGpuDetected]);

  useFrame((_, delta) => {
    const counter = counterRef.current;
    counter.frames += 1;
    counter.seconds += delta;
    if (counter.seconds >= 0.5) {
      const element = fpsRef.current;
      if (element !== null) {
        element.textContent = `${Math.round(counter.frames / counter.seconds)} fps`;
      }
      counter.frames = 0;
      counter.seconds = 0;
    }
  });

  return null;
}
