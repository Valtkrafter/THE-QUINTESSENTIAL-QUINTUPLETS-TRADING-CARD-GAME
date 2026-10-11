// Which graphics level suits this device. The game looks at the graphics chip once, the first time it starts on a device, and
// picks the starting level from it; the player can change the level in Settings at any time. The choice itself is a plain
// function of a few facts, so it can be tested without a graphics chip.

import type { GraphicsLevel } from './preferences';

export interface GpuInfo {
  /** Whether WebGL could be started at all. */
  readonly webgl: boolean;
  /** The name of the graphics chip as the browser reports it, or null when the browser keeps it to itself. */
  readonly renderer: string | null;
  /** A phone or a tablet: the finger is the main pointer, and the battery matters. */
  readonly touch: boolean;
}

/** A graphics chip that is really the processor drawing: far too slow for the foil shaders. */
const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic|mesa offscreen/i;
/** The graphics chip of an Intel processor (HD, UHD, Iris, Xe). The separate Intel Arc cards are fast and are not meant here. */
const INTEL_INTEGRATED = /intel(?!.*\barc\b)/i;

/**
 * - No WebGL, or a software renderer: low (flat pictures with the CSS shimmer, the card drawn at its plain size).
 * - A phone or a tablet, or an Intel graphics chip built into the processor: medium.
 * - Everything else (NVIDIA, AMD, Apple, Intel Arc, or a browser that does not say): high.
 */
export function chooseGraphicsLevel(info: GpuInfo): GraphicsLevel {
  if (!info.webgl) {
    return 'low';
  }
  const name = info.renderer ?? '';
  if (SOFTWARE.test(name)) {
    return 'low';
  }
  if (info.touch || INTEL_INTEGRATED.test(name)) {
    return 'normal';
  }
  return 'high';
}

/** Looks at the browser's graphics chip. Never throws: a browser that refuses simply counts as having no WebGL. */
export function probeGpu(): GpuInfo {
  const touch = window.matchMedia('(pointer: coarse)').matches;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (gl === null) {
      return { webgl: false, renderer: null, touch };
    }
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debug === null ? null : String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL));
    // The page must not keep a context open just for this look: browsers allow only about 16.
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return { webgl: true, renderer, touch };
  } catch {
    return { webgl: false, renderer: null, touch };
  }
}
