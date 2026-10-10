// Draws the glowing background with bloom and puts the card scene on top without it. The cards must look exactly like in
// the inspect view, so only the background (sky, star, threads, rays, particles) goes through the bloom.

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { HalfFloatType, Mesh, PlaneGeometry, Scene, ShaderMaterial, Vector2, WebGLRenderTarget, type Texture, type WebGLRenderer } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { compositeFragment, fullscreenVertex } from './shaders';

export interface GlowSettings {
  readonly strength: number;
  readonly radius: number;
  readonly threshold: number;
}

export const DEFAULT_GLOW: GlowSettings = { strength: 0.62, radius: 0.5, threshold: 0.82 };

function applyGlow(pass: UnrealBloomPass, glow: GlowSettings): void {
  pass.strength = glow.strength;
  pass.radius = glow.radius;
  pass.threshold = glow.threshold;
}

function showTexture(uniforms: { uTexture: { value: Texture | null } }, texture: Texture): void {
  uniforms.uTexture.value = texture;
}

function configureComposer(composer: EffectComposer, pixelRatio: number): void {
  composer.renderToScreen = false;
  composer.setPixelRatio(pixelRatio);
}

function setAutoClear(renderer: WebGLRenderer, value: boolean): boolean {
  const previous = renderer.autoClear;
  renderer.autoClear = value;
  return previous;
}

interface Pipeline {
  readonly composer: EffectComposer;
  readonly bloom: UnrealBloomPass;
  readonly target: WebGLRenderTarget;
}

/**
 * Takes over the rendering of the canvas. `background` is drawn first (with bloom when `bloom` is on), then the canvas's own
 * scene on top. When the browser cannot do float render targets the bloom is skipped and everything is still drawn.
 */
export function useGlowCompositor(background: Scene, bloom: boolean, glow: GlowSettings = DEFAULT_GLOW): void {
  const gl = useThree((state) => state.gl);
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);
  const size = useThree((state) => state.size);
  const readSize = useThree((state) => state.get);

  const quad = useMemo(() => {
    const uniforms: { uTexture: { value: Texture | null } } = { uTexture: { value: null } };
    const material = new ShaderMaterial({
      vertexShader: fullscreenVertex,
      fragmentShader: compositeFragment,
      uniforms,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new Mesh(new PlaneGeometry(2, 2), material);
    mesh.frustumCulled = false;
    const quadScene = new Scene();
    quadScene.add(mesh);
    return { scene: quadScene, material, mesh, uniforms };
  }, []);

  const pipeline = useMemo<Pipeline | null>(() => {
    if (!bloom) {
      return null;
    }
    try {
      const { size: initial } = readSize();
      const ratio = gl.getPixelRatio();
      const target = new WebGLRenderTarget(Math.max(1, Math.floor(initial.width * ratio)), Math.max(1, Math.floor(initial.height * ratio)), {
        type: HalfFloatType,
      });
      const composer = new EffectComposer(gl, target);
      configureComposer(composer, ratio);
      const bloomPass = new UnrealBloomPass(new Vector2(initial.width, initial.height), DEFAULT_GLOW.strength, DEFAULT_GLOW.radius, DEFAULT_GLOW.threshold);
      return { composer, bloom: bloomPass, target };
    } catch {
      return null;
    }
  }, [gl, bloom, readSize]);

  useEffect(() => {
    if (pipeline === null) {
      return undefined;
    }
    const renderPass = new RenderPass(background, camera);
    pipeline.composer.addPass(renderPass);
    pipeline.composer.addPass(pipeline.bloom);
    return () => {
      pipeline.composer.removePass(renderPass);
      pipeline.composer.removePass(pipeline.bloom);
      renderPass.dispose();
      pipeline.bloom.dispose();
      pipeline.composer.dispose();
      pipeline.target.dispose();
    };
  }, [pipeline, background, camera]);

  useEffect(() => {
    pipeline?.composer.setSize(size.width, size.height);
  }, [pipeline, size.width, size.height]);

  useEffect(() => {
    if (pipeline !== null) {
      applyGlow(pipeline.bloom, glow);
    }
  }, [pipeline, glow]);

  useEffect(
    () => () => {
      quad.mesh.geometry.dispose();
      quad.material.dispose();
    },
    [quad],
  );

  useEffect(() => {
    const previous = setAutoClear(gl, false);
    return () => {
      setAutoClear(gl, previous);
    };
  }, [gl]);

  // Priority 1 switches off the canvas's own rendering: from here on this function draws every frame.
  useFrame(() => {
    gl.setRenderTarget(null);
    gl.clear();
    if (pipeline === null) {
      gl.render(background, camera);
    } else {
      pipeline.composer.render();
      showTexture(quad.uniforms, pipeline.composer.readBuffer.texture);
      gl.setRenderTarget(null);
      gl.render(quad.scene, camera);
    }
    gl.clearDepth();
    gl.render(scene, camera);
  }, 1);
}
