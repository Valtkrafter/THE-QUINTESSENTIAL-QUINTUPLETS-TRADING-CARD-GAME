// The real foil shader in a grid of cards. A browser allows only about 16 WebGL views, so a binder with a hundred cards
// cannot give every card its own. Instead ONE hidden WebGL renderer draws each visible card with the same shader as the
// inspect view and copies the picture into that card's ordinary 2D canvas. The page then handles clipping, scrolling and
// stacking like for any other element, and only cards that are on screen (and have a finish) cost anything.

import { Mesh, NoColorSpace, Object3D, OrthographicCamera, PlaneGeometry, Scene, Texture, Vector3, WebGLRenderer } from 'three';
import { CARD_HEIGHT, CARD_THICKNESS, CARD_WIDTH } from './cardGeometry';
import { createFrontShader, type CardShader, type FrontUniforms } from './cardMaterials';
import { createMotion, idleInterval, isMoving, stepMotion, type TileMotion } from './tileMath';

/** Size of the picture the renderer draws; the canvas of a card never gets larger than this. */
export const TILE_WIDTH = 360;
export const TILE_HEIGHT = 504;
const MIN_TILE_WIDTH = 120;
/** Where the viewer's camera and light stand, in front of the card (the same as in the inspect view). */
const CAMERA_WORLD = new Vector3(0, 0, 8.6);
const LIGHT_WORLD = new Vector3(-3.5, 4.5, 9);
/** Most pictures drawn in one frame; with more cards on screen they take turns. */
const MAX_DRAWS_PER_FRAME = 10;
/** A card that has been off screen this long gives its textures back to the graphics chip, later its canvas too. */
const FREE_TEXTURES_AFTER_MS = 4000;
const FREE_CANVAS_AFTER_MS = 20000;
/** The whole renderer is thrown away when no card has needed it for this long. */
const ENGINE_IDLE_MS = 15000;
const MAX_STEP_SECONDS = 1 / 15;
/** After the pointer touched a card its springs need this long to settle; the card is drawn every frame meanwhile. */
const SETTLE_SECONDS = 1.6;
/** When frames come slower than this the chip is struggling and the cards that nobody touches are drawn less often. */
const SLOW_FRAME_SECONDS = 1 / 40;
const MAX_LOAD = 4;
const NO_WEBGL_RETRY_AFTER_MS = 60000;

/** What decides how the card looks; the grid fills it in from the card and its finish. */
export interface TileLook {
  readonly finishIndex: number;
  readonly maskIndex: number;
  readonly premium: number;
  readonly frameInset: readonly [number, number];
}

export interface HoloTileOptions {
  /** The card's own canvas; the renderer copies its pictures in. */
  readonly canvas: HTMLCanvasElement;
  /** The picture of the card face and the foil mask (red: foil, green: signature, blue: text), both decoded. */
  readonly face: HTMLImageElement;
  readonly mask: HTMLImageElement;
  readonly look: TileLook;
  /** Shifts the sway so neighbouring cards do not move in step. */
  readonly phase: number;
  /** `high` or `normal` graphics (the grid does not use this renderer on `low`). */
  readonly level: 'high' | 'normal';
  /** The slow sway and shimmer of a card nobody touches. Off, the card only moves while the pointer is on it. */
  readonly animateIdle: boolean;
  /** True once the canvas holds a picture, false when it was given back (the card shows its flat fallback again). */
  readonly onShown: (shown: boolean) => void;
  /** Called once when the shared renderer is gone (the graphics chip reset); the card should show its fallback. */
  readonly onLost: () => void;
}

export interface HoloTile {
  /** The pointer is over the card: x and y run from -1 to 1, y up. */
  pointer(x: number, y: number): void;
  leave(): void;
  /** Tell the renderer whether the card is on screen; only visible cards are drawn. */
  setVisible(visible: boolean): void;
  /** How many pixels wide the card is on screen; its canvas is made just big enough. */
  resize(pixelWidth: number): void;
  dispose(): void;
}

/** What a tile needs from the renderer that serves it. */
interface TileHost {
  wake(): void;
  remove(tile: LiveTile): void;
}

function nowSeconds(): number {
  return performance.now() / 1000;
}

function makeTexture(image: HTMLImageElement, anisotropy: number): Texture {
  const texture = new Texture(image);
  // The shaders blend in display space, so the texture is left undecoded and its sRGB values reach the shader as they are.
  texture.colorSpace = NoColorSpace;
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
  return texture;
}

class LiveTile implements HoloTile {
  readonly motion: TileMotion = createMotion();
  readonly options: HoloTileOptions;
  readonly #host: TileHost;
  readonly #context: CanvasRenderingContext2D;
  #visible = false;
  #dirty = true;
  #shown = false;
  #width = TILE_WIDTH;
  #height = TILE_HEIGHT;
  #face: Texture | null = null;
  #mask: Texture | null = null;
  #lastDraw = Number.NEGATIVE_INFINITY;
  #lastStep = 0;
  /** Until this time (seconds) the card counts as touched; `Infinity` while the pointer is on it. */
  #touchedUntil = 0;
  #texturesTimer: number | undefined;
  #canvasTimer: number | undefined;

  constructor(host: TileHost, options: HoloTileOptions, context: CanvasRenderingContext2D) {
    this.#host = host;
    this.options = options;
    this.#context = context;
  }

  get visible(): boolean {
    return this.#visible;
  }

  pointer(x: number, y: number): void {
    this.motion.pointerX = x;
    this.motion.pointerY = y;
    this.motion.hovering = true;
    this.#touchedUntil = Number.POSITIVE_INFINITY;
    this.#host.wake();
  }

  leave(): void {
    this.motion.hovering = false;
    this.#touchedUntil = nowSeconds() + SETTLE_SECONDS;
    this.#host.wake();
  }

  setVisible(visible: boolean): void {
    if (visible === this.#visible) {
      return;
    }
    this.#visible = visible;
    window.clearTimeout(this.#texturesTimer);
    window.clearTimeout(this.#canvasTimer);
    if (visible) {
      this.#dirty = true;
      this.#lastStep = nowSeconds();
      this.#host.wake();
    } else {
      this.#texturesTimer = window.setTimeout(() => this.#freeTextures(), FREE_TEXTURES_AFTER_MS);
      this.#canvasTimer = window.setTimeout(() => this.#freeCanvas(), FREE_CANVAS_AFTER_MS);
    }
  }

  resize(pixelWidth: number): void {
    const width = Math.min(Math.max(Math.round(pixelWidth), MIN_TILE_WIDTH), TILE_WIDTH);
    if (width !== this.#width) {
      this.#width = width;
      this.#height = Math.round((width * TILE_HEIGHT) / TILE_WIDTH);
      this.#dirty = true;
      this.#host.wake();
    }
  }

  dispose(): void {
    window.clearTimeout(this.#texturesTimer);
    window.clearTimeout(this.#canvasTimer);
    this.#visible = false;
    this.#host.remove(this);
    this.#freeTextures();
  }

  #touched(now: number): boolean {
    return this.motion.hovering || now < this.#touchedUntil;
  }

  /** True while the card keeps changing by itself, so the frame loop has to keep running for it. */
  animating(now: number): boolean {
    return this.#visible && (this.#dirty || this.#touched(now) || this.options.animateIdle || isMoving(this.motion));
  }

  /** True when the card needs a new picture at `now` (seconds). `load` stretches the gap between pictures of idle cards. */
  due(now: number, load: number): boolean {
    if (!this.#visible) {
      return false;
    }
    if (this.#dirty || this.#touched(now)) {
      return true;
    }
    if (this.options.animateIdle) {
      const interval = idleInterval(this.options.level, false, load);
      return interval !== null && now - this.#lastDraw >= interval;
    }
    return false;
  }

  /** The card is being held or just let go: it gets a picture in every frame, before the idle cards. */
  urgent(now: number): boolean {
    return this.#visible && this.#touched(now);
  }

  /** Moves the springs on to `now`. */
  step(now: number): void {
    const delta = Math.min(Math.max(now - this.#lastStep, 0), MAX_STEP_SECONDS);
    this.#lastStep = now;
    stepMotion(this.motion, { delta, time: now, phase: this.options.phase, sway: this.options.animateIdle });
  }

  /** The textures of this card, made on first use. */
  textures(anisotropy: number): { readonly face: Texture; readonly mask: Texture } {
    this.#face ??= makeTexture(this.options.face, anisotropy);
    this.#mask ??= makeTexture(this.options.mask, anisotropy);
    return { face: this.#face, mask: this.#mask };
  }

  /** Puts the finished picture on the card's own canvas. */
  show(source: HTMLCanvasElement, now: number): void {
    const { canvas } = this.options;
    if (canvas.width !== this.#width || canvas.height !== this.#height) {
      canvas.width = this.#width;
      canvas.height = this.#height;
    }
    this.#context.clearRect(0, 0, canvas.width, canvas.height);
    this.#context.drawImage(source, 0, 0, TILE_WIDTH, TILE_HEIGHT, 0, 0, canvas.width, canvas.height);
    this.#lastDraw = now;
    this.#dirty = false;
    if (!this.#shown) {
      this.#shown = true;
      this.options.onShown(true);
    }
  }

  /** The shared renderer is gone for good. */
  lost(): void {
    this.#face = null;
    this.#mask = null;
    this.#visible = false;
    window.clearTimeout(this.#texturesTimer);
    window.clearTimeout(this.#canvasTimer);
    this.options.onLost();
  }

  #freeTextures(): void {
    this.#face?.dispose();
    this.#mask?.dispose();
    this.#face = null;
    this.#mask = null;
  }

  #freeCanvas(): void {
    if (this.#shown) {
      this.#shown = false;
      this.options.canvas.width = 0;
      this.options.canvas.height = 0;
      this.options.onShown(false);
    }
  }
}

class Engine implements TileHost {
  readonly #renderer: WebGLRenderer;
  readonly #scene = new Scene();
  readonly #camera = new OrthographicCamera(-CARD_WIDTH / 2, CARD_WIDTH / 2, CARD_HEIGHT / 2, -CARD_HEIGHT / 2, 0.1, 20);
  readonly #front: CardShader<FrontUniforms> = createFrontShader();
  readonly #geometry = new PlaneGeometry(CARD_WIDTH, CARD_HEIGHT);
  /** Never drawn: it carries the tilt, so the shader gets the camera and the light as seen from the tilted card. */
  readonly #pivot = new Object3D();
  readonly #face = new Object3D();
  readonly #tiles = new Set<LiveTile>();
  readonly #onGone: () => void;
  readonly #maxAnisotropy: number;
  #frame = 0;
  #running = false;
  #ready = false;
  #gone = false;
  #turn = 0;
  #load = 1;
  #lastFrame = 0;
  #idleTimer: number | undefined;
  /** How many pictures were drawn, and how many milliseconds of the page's own time that took (for the development checks). */
  draws = 0;
  drawMs = 0;
  readonly #handleLost = (event: Event): void => {
    event.preventDefault();
    const tiles = [...this.#tiles];
    this.destroy();
    for (const tile of tiles) {
      tile.lost();
    }
  };

  constructor(onGone: () => void) {
    this.#onGone = onGone;
    const canvas = document.createElement('canvas');
    this.#renderer = new WebGLRenderer({ canvas, alpha: false, antialias: false });
    this.#renderer.setPixelRatio(1);
    this.#renderer.setSize(TILE_WIDTH, TILE_HEIGHT, false);
    this.#maxAnisotropy = Math.min(this.#renderer.capabilities.getMaxAnisotropy(), 4);
    canvas.addEventListener('webglcontextlost', this.#handleLost);

    this.#camera.position.set(0, 0, 10);
    const mesh = new Mesh(this.#geometry, this.#front.material);
    mesh.frustumCulled = false;
    this.#scene.add(mesh);
    this.#face.position.z = CARD_THICKNESS / 2;
    this.#pivot.add(this.#face);

    // Compiling the heavy shader takes a moment; nothing is drawn (and nothing stalls) until it is ready.
    const ready = (): void => {
      this.#ready = true;
      this.wake();
    };
    this.#renderer.compileAsync(this.#scene, this.#camera).then(ready, ready);
  }

  get size(): number {
    return this.#tiles.size;
  }

  get load(): number {
    return this.#load;
  }

  add(tile: LiveTile): void {
    window.clearTimeout(this.#idleTimer);
    this.#tiles.add(tile);
  }

  remove(tile: LiveTile): void {
    this.#tiles.delete(tile);
    if (this.#tiles.size === 0 && !this.#gone) {
      window.clearTimeout(this.#idleTimer);
      this.#idleTimer = window.setTimeout(() => this.destroy(), ENGINE_IDLE_MS);
    }
  }

  /** Starts the frame loop if it is not running. */
  wake(): void {
    if (this.#running || this.#gone || !this.#ready) {
      return;
    }
    this.#running = true;
    this.#lastFrame = 0;
    this.#frame = requestAnimationFrame(this.#tick);
  }

  /** Gives the graphics chip everything back. A new renderer is made when a card asks for one again. */
  destroy(): void {
    if (this.#gone) {
      return;
    }
    this.#gone = true;
    this.#running = false;
    cancelAnimationFrame(this.#frame);
    window.clearTimeout(this.#idleTimer);
    this.#renderer.domElement.removeEventListener('webglcontextlost', this.#handleLost);
    this.#geometry.dispose();
    this.#front.material.dispose();
    this.#renderer.dispose();
    this.#renderer.forceContextLoss();
    this.#tiles.clear();
    this.#onGone();
  }

  readonly #tick = (time: number): void => {
    if (!this.#running) {
      return;
    }
    const now = time / 1000;
    if (this.#lastFrame > 0) {
      const gap = now - this.#lastFrame;
      this.#load = gap > SLOW_FRAME_SECONDS ? Math.min(MAX_LOAD, this.#load * 1.12) : Math.max(1, this.#load * 0.985);
    }
    this.#lastFrame = now;

    const clock = nowSeconds();
    let busy = false;
    const urgent: LiveTile[] = [];
    const calm: LiveTile[] = [];
    for (const tile of this.#tiles) {
      if (!tile.visible) {
        continue;
      }
      tile.step(clock);
      busy = busy || tile.animating(clock);
      (tile.urgent(clock) ? urgent : calm).push(tile);
    }
    if (!busy) {
      this.#running = false;
      return;
    }

    let drawn = 0;
    for (const tile of urgent) {
      if (tile.due(clock, this.#load)) {
        this.#draw(tile, clock);
        drawn += 1;
      }
    }
    // The other cards take turns, starting where the last frame stopped.
    const offset = calm.length === 0 ? 0 : this.#turn % calm.length;
    for (let i = 0; i < calm.length && drawn < MAX_DRAWS_PER_FRAME; i += 1) {
      const tile = calm[(offset + i) % calm.length];
      if (tile !== undefined && tile.due(clock, this.#load)) {
        this.#draw(tile, clock);
        drawn += 1;
        this.#turn = offset + i + 1;
      }
    }
    this.#frame = requestAnimationFrame(this.#tick);
  };

  #draw(tile: LiveTile, now: number): void {
    const started = performance.now();
    const uniforms = this.#front.uniforms;
    const { look } = tile.options;
    const textures = tile.textures(this.#maxAnisotropy);
    uniforms.uMap.value = textures.face;
    uniforms.uMask.value = textures.mask;
    uniforms.uHasMask.value = 1;
    uniforms.uFinish.value = look.finishIndex;
    uniforms.uMaskMode.value = look.maskIndex;
    uniforms.uPremium.value = look.premium;
    uniforms.uFrameInset.value.set(look.frameInset[0], look.frameInset[1]);
    uniforms.uTime.value = now;
    uniforms.uHover.value = tile.motion.hover.value;
    uniforms.uPointer.value.set(tile.motion.pointerX * 0.5 + 0.5, tile.motion.pointerY * 0.5 + 0.5);

    this.#pivot.rotation.set(tile.motion.tiltX.value, tile.motion.tiltY.value, 0);
    this.#pivot.updateMatrixWorld(true);
    this.#face.worldToLocal(uniforms.uCameraLocal.value.copy(CAMERA_WORLD));
    this.#face.worldToLocal(uniforms.uLightLocal.value.copy(LIGHT_WORLD));

    this.#front.material.uniformsNeedUpdate = true;
    this.#renderer.render(this.#scene, this.#camera);
    tile.show(this.#renderer.domElement, now);
    this.draws += 1;
    this.drawMs += performance.now() - started;
  }
}

let engine: Engine | null = null;
let retryAt = 0;

function getEngine(): Engine | null {
  if (engine !== null) {
    return engine;
  }
  if (performance.now() < retryAt) {
    return null;
  }
  try {
    const created: Engine = new Engine(() => {
      if (engine === created) {
        engine = null;
      }
    });
    engine = created;
  } catch {
    // No WebGL here: the grid keeps its flat cards with the CSS shimmer.
    retryAt = performance.now() + NO_WEBGL_RETRY_AFTER_MS;
    return null;
  }
  return engine;
}

/**
 * Puts the foil shader on a card of a grid. Returns null when WebGL is not available (the card then keeps its flat picture).
 * Call `dispose` when the card leaves the page.
 */
export function createHoloTile(options: HoloTileOptions): HoloTile | null {
  const context = options.canvas.getContext('2d');
  if (context === null) {
    return null;
  }
  const shared = getEngine();
  if (shared === null) {
    return null;
  }
  const tile = new LiveTile(shared, options, context);
  shared.add(tile);
  return tile;
}

/** What the shared renderer is doing right now (for the development checks): cards served, pictures drawn, time spent, load factor. */
export function holoTileStats(): { readonly tiles: number; readonly draws: number; readonly drawMs: number; readonly load: number } {
  return { tiles: engine?.size ?? 0, draws: engine?.draws ?? 0, drawMs: engine?.drawMs ?? 0, load: engine?.load ?? 1 };
}
