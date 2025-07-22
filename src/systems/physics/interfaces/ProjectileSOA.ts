// src/systems/physics/interfaces/ProjectileSOA.ts

/**
 * Structure-of-Arrays (SOA) buffer for all active projectiles.
 * Each field is a contiguous typed array for SIMD/JIT friendliness.
 * No per-projectile objects are allocated; state is index-based.
 */
export interface ProjectileSOA {
  count: number;

  // Position & velocity
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;

  // Combat attributes
  damage: Float32Array;
  life: Float32Array;         // remaining life in seconds
  typeIndex: Int16Array;      // maps to a projectile type registry (string → index)
  faction: Uint8Array;        // 1=Player, 2=Enemy, 3=Neutral
  ownerShipId: Float64Array;

  // Behavioral flags
  split: Uint8Array;          // 0/1
  penetrate: Uint8Array;      // 0/1

  // Visual linkage
  particleHandle: Int32Array; // handle for particle trail/visual FX

  // Collision bookkeeping
  hitSetIndex: Int32Array;    // index into hitSet pool; -1 if none
}

/**
 * Creates a preallocated SOA buffer for projectiles.
 * The `count` tracks the current active entries; arrays are all `max` sized.
 */
export function createProjectileSOA(max: number): ProjectileSOA {
  return {
    count: 0,
    x: new Float32Array(max),
    y: new Float32Array(max),
    vx: new Float32Array(max),
    vy: new Float32Array(max),
    damage: new Float32Array(max),
    life: new Float32Array(max),
    typeIndex: new Int16Array(max),
    faction: new Uint8Array(max),
    ownerShipId: new Float64Array(max),
    split: new Uint8Array(max),
    penetrate: new Uint8Array(max),
    particleHandle: new Int32Array(max),
    hitSetIndex: new Int32Array(max).fill(-1),
  };
}
