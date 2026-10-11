import { describe, expect, it } from 'vitest';
import { chooseGraphicsLevel, type GpuInfo } from './gpu';

function chip(renderer: string | null, touch = false): GpuInfo {
  return { webgl: true, renderer, touch };
}

describe('the starting graphics level', () => {
  it('is low without WebGL and on a processor that does the drawing itself', () => {
    expect(chooseGraphicsLevel({ webgl: false, renderer: null, touch: false })).toBe('low');
    expect(chooseGraphicsLevel(chip('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)'))).toBe('low');
    expect(chooseGraphicsLevel(chip('llvmpipe (LLVM 15.0.7, 256 bits)'))).toBe('low');
    expect(chooseGraphicsLevel(chip('Microsoft Basic Render Driver'))).toBe('low');
  });

  it('is medium on the graphics chip built into an Intel processor', () => {
    expect(chooseGraphicsLevel(chip('ANGLE (Intel, Intel(R) UHD Graphics 620 (0x00005917) Direct3D11 vs_5_0 ps_5_0, D3D11)'))).toBe('normal');
    expect(chooseGraphicsLevel(chip('ANGLE (Intel, Intel(R) HD Graphics 4000 Direct3D11 vs_5_0 ps_5_0, D3D11)'))).toBe('normal');
    expect(chooseGraphicsLevel(chip('ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)'))).toBe('normal');
  });

  it('is medium on a phone or a tablet, whatever its chip', () => {
    expect(chooseGraphicsLevel(chip('Apple GPU', true))).toBe('normal');
    expect(chooseGraphicsLevel(chip('Adreno (TM) 730', true))).toBe('normal');
    expect(chooseGraphicsLevel(chip(null, true))).toBe('normal');
  });

  it('is high on a separate graphics card, an Apple laptop or a browser that does not tell', () => {
    expect(chooseGraphicsLevel(chip('ANGLE (NVIDIA, NVIDIA GeForce RTX 4050 Laptop GPU (0x000028A1) Direct3D11 vs_5_0 ps_5_0, D3D11)'))).toBe('high');
    expect(chooseGraphicsLevel(chip('ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)'))).toBe('high');
    expect(chooseGraphicsLevel(chip('ANGLE (Intel, Intel(R) Arc(TM) A750 Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)'))).toBe('high');
    expect(chooseGraphicsLevel(chip('Apple M2'))).toBe('high');
    expect(chooseGraphicsLevel(chip(null))).toBe('high');
  });
});
