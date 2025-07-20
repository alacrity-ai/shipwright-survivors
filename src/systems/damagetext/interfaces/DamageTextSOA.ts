// src/systems/fx/DamageTextSOA.ts
export interface DamageTextSOA {
  count: number;

  // World positions (screen projection is handled in shader via MVP)
  x: Float32Array;
  y: Float32Array;

  // Velocity
  vx: Float32Array;
  vy: Float32Array;

  // Visual properties
  scale: Float32Array;       // dynamic impact scaling
  alpha: Float32Array;
  r: Float32Array;
  g: Float32Array;
  b: Float32Array;

  // Glyph index (0–9, plus maybe ‘+’ or other symbols later)
  glyphIndex: Uint8Array;

  // Lifetime tracking
  life: Float32Array;        // total life span
  initialLife: Float32Array; // original life for alpha computation
  elapsed: Float32Array;     // replaces `entity.elapsed`

  // Impact scale decay (starts >1 for “pop” effect)
  impactScale: Float32Array;

  // Neon cycling state (only used if flagged)
  neonPhase: Float32Array;   // phase accumulator for sin/cos
  neonSpeed: Float32Array;   // frequency of cycling
  neonEnabled: Uint8Array;   // 0 = normal, 1 = neon cycling

  // Stable ID for recycling (optional bookkeeping)
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
    id: new Uint32Array(max),
  };
}
