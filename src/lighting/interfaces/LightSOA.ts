// src/lighting/interfaces/LightSOA.ts

export interface LightSOA {
  count: number;
  x: Float32Array;
  y: Float32Array;
  radius: Float32Array;
  r: Float32Array;
  g: Float32Array;
  b: Float32Array;
  intensity: Float32Array;
  initialIntensity: Float32Array;
  life: Float32Array;
  initialLife: Float32Array;
  fadeMode: Uint8Array;         // 0 = linear, 1 = delayed
  animationPhase: Float32Array;
  colorHex: string[];           // Store original hex for fast lookups
  tag: (string | undefined)[];
  id: (number | undefined)[];
}

export const MAX_LIGHTS = 10000;

export function createSOABuffer(max: number): LightSOA {
  return {
    count: 0,
    x: new Float32Array(max),
    y: new Float32Array(max),
    radius: new Float32Array(max),
    r: new Float32Array(max),
    g: new Float32Array(max),
    b: new Float32Array(max),
    intensity: new Float32Array(max),
    initialIntensity: new Float32Array(max),
    life: new Float32Array(max),
    initialLife: new Float32Array(max),
    fadeMode: new Uint8Array(max),
    animationPhase: new Float32Array(max),
    colorHex: new Array(max),        // Allocate string slots
    tag: new Array(max),
    id: new Array(max),
  };
}
