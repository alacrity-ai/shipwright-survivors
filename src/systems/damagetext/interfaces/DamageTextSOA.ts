// src/systems/fx/DamageTextSOA.ts

export interface DamageTextSOA {
  count: number;

  x: Float32Array;
  y: Float32Array;

  vx: Float32Array;
  vy: Float32Array;

  scale: Float32Array;
  alpha: Float32Array;
  r: Float32Array;
  g: Float32Array;
  b: Float32Array;

  glyphIndex: Uint8Array;

  life: Float32Array;
  initialLife: Float32Array;
  elapsed: Float32Array;

  impactScale: Float32Array;

  neonPhase: Float32Array;
  neonSpeed: Float32Array;
  neonEnabled: Uint8Array;

  /** Per-glyph horizontal slot index (relative to center). */
  digitOffset: Float32Array;

  id: Uint32Array;
}

export function createDamageTextSOA(max: number): DamageTextSOA {
  return {
    count: 0,
    x: new Float32Array(max),
    y: new Float32Array(max),
    vx: new Float32Array(max),
    vy: new Float32Array(max),
    scale: new Float32Array(max),
    alpha: new Float32Array(max),
    r: new Float32Array(max),
    g: new Float32Array(max),
    b: new Float32Array(max),
    glyphIndex: new Uint8Array(max),
    life: new Float32Array(max),
    initialLife: new Float32Array(max),
    elapsed: new Float32Array(max),
    impactScale: new Float32Array(max),
    neonPhase: new Float32Array(max),
    neonSpeed: new Float32Array(max),
    neonEnabled: new Uint8Array(max),
    digitOffset: new Float32Array(max),
    id: new Uint32Array(max),
  };
}
