// src/systems/fx/DamageTextManager.ts

import { createDamageTextSOA, type DamageTextSOA } from '@/systems/damagetext/interfaces/DamageTextSOA';

let nextTextId = 0;
let _instance: DamageTextManager | null = null;

const MAX_DIGITS = 10000;

// Baseline glyph size (in world units). This controls the visual scale
// of all digits, independent of the atlas pixel size.
export const BASE_SCALE = 48;

// Spacing between glyph centers, as a fraction of BASE_SCALE.
// 0.75 gives a slightly tight monospace look (digits visually adjacent).
export const SPACING_FACTOR = 0.75;

// Time (seconds) for the "impact pop" scale to decay back to BASE_SCALE.
const POP_DECAY_TIME = 0.4;

// Speed at which text floats up
const FLOAT_SPEED = 200;

/**
 * Central orchestrator for floating damage text.
 * GC-neutral: preallocated SOA, swap-with-last recycling, no per-frame allocations.
 */
export class DamageTextManager {
  private readonly soa: DamageTextSOA = createDamageTextSOA(MAX_DIGITS);

  /** Scratch array for swaps (kept packed to avoid deopts) */
  private readonly scratchValues: Float64Array = new Float64Array(19); 

  /** Fixed-size free list stack for slot recycling */
  private readonly freeIndices: Int32Array = new Int32Array(MAX_DIGITS);
  private freeTop: number = 0; // stack size (next write position)

  /** Scratch buffer for digit extraction (supports up to 16-digit numbers) */
  private readonly glyphBuffer: Int8Array = new Int8Array(16);
  private glyphCount: number = 0;

  /** Stable ID → index mapping for external updates (e.g., merging) */
  private readonly idToIndex: Map<number, number> = new Map();

  private constructor() {}

  public static getInstance(): DamageTextManager {
    if (!_instance) {
      _instance = new DamageTextManager();
    }
    return _instance;
  }

  public static hasInstance(): boolean {
    return !!_instance;
  }

  /** Direct SOA accessor for DamageTextPass */
  public getSOA(): DamageTextSOA {
    return this.soa;
  }

  /**
   * Spawns a new number (splits into digits) with optional neon (crit) flag.
   * Digits are centered horizontally and use `digitOffset` for spacing,
   * so the vertex shader can dynamically scale spacing during the impact pop.
   */
  public spawnNumber(
    x: number,
    y: number,
    value: number,
    r: number,
    g: number,
    b: number,
    life: number,
    crit: boolean = false,
  ): void {
    this.extractGlyphs(value);

    const glyphCount = this.glyphCount;
    const centerOffset = (glyphCount - 1) * 0.5;

    for (let i = 0; i < glyphCount; i++) {
      const index = this.allocateIndex();
      if (index === -1) break;

      // Anchor: all glyphs share the same X (centered string)
      this.soa.x[index] = x;
      this.soa.y[index] = y;

      this.soa.vx[index] = 0;
      this.soa.vy[index] = -FLOAT_SPEED;
      this.soa.scale[index] = BASE_SCALE;
      this.soa.alpha[index] = 1;
      this.soa.r[index] = r;
      this.soa.g[index] = g;
      this.soa.b[index] = b;
      this.soa.glyphIndex[index] = this.glyphBuffer[i];
      this.soa.life[index] = life;
      this.soa.initialLife[index] = life;
      this.soa.elapsed[index] = 0;

      this.soa.digitOffset[index] = i - centerOffset;

      const popMultiplier = crit ? 4.0 : 2.0;
      this.soa.impactScale[index] = BASE_SCALE * popMultiplier;

      this.soa.neonPhase[index] = 0;
      this.soa.neonSpeed[index] = crit ? 6 : 0;
      this.soa.neonEnabled[index] = crit ? 1 : 0;
      this.soa.id[index] = nextTextId++;

      this.idToIndex.set(this.soa.id[index], index);
    }
  }

  /** Updates all text (movement, alpha, impact scaling, neon cycling) */
  public update(dt: number): void {
    for (let i = 0; i < this.soa.count; ) {
      this.soa.elapsed[i] += dt;

      // Lifetime + fade-out
      const remaining = this.soa.life[i] - this.soa.elapsed[i];
      if (remaining <= 0) {
        this.recycle(i);
        continue; // re-check this index after swap
      }

      this.soa.alpha[i] = Math.max(0, remaining / this.soa.initialLife[i]);

      // Motion (simple vertical drift)
      this.soa.x[i] += this.soa.vx[i] * dt;
      this.soa.y[i] += this.soa.vy[i] * dt;

      // Decay the scale back toward BASE_SCALE smoothly
      const pop = this.soa.impactScale[i];
      const decayT = Math.min(this.soa.elapsed[i] / POP_DECAY_TIME, 1);
      this.soa.scale[i] = BASE_SCALE + (pop - BASE_SCALE) * (1 - decayT);

      // Neon cycling
      if (this.soa.neonEnabled[i]) {
        this.soa.neonPhase[i] += dt * this.soa.neonSpeed[i];
      }

      i++;
    }
  }

  /** Removes a digit entry by ID */
  public removeById(id: number): void {
    const index = this.idToIndex.get(id);
    if (index == null || index < 0 || index >= this.soa.count) return;
    this.recycle(index);
  }

  /** Clears all active text immediately */
  public clear(): void {
    this.soa.count = 0;
    this.freeTop = 0;
    this.idToIndex.clear();
  }

  /** Internal: allocate a slot for a new digit */
  private allocateIndex(): number {
    if (this.freeTop > 0) {
      const idx = this.freeIndices[--this.freeTop]; // Pop from stack
      if (idx >= this.soa.count) {
        this.soa.count = idx + 1; // Expand count to cover reused slot
      }
      return idx;
    }

    if (this.soa.count >= MAX_DIGITS) {
      return -1; // Pool exhausted
    }

    return this.soa.count++; // Use next sequential index
  }

  /** Converts a value into digit codes in glyphBuffer (10 reserved for '+') */
  private extractGlyphs(value: number): void {
    const s = String(Math.floor(value)); // minimal unavoidable string alloc
    const len = s.length;
    this.glyphCount = len;

    for (let i = 0; i < len; i++) {
      const c = s.charCodeAt(i);
      // 43 = '+', 48 = '0'
      this.glyphBuffer[i] = (c === 43) ? 10 : (c - 48);
    }
  }

  /** Internal: swap-with-last recycling */
  private recycle(index: number): void {
    const lastIndex = this.soa.count - 1;

    if (index !== lastIndex) {
      this.swap(index, lastIndex);

      // Fix mapping for the element that was swapped into `index`
      const swappedId = this.soa.id[index];
      if (swappedId) {
        this.idToIndex.set(swappedId, index);
      }
    }

    // Remove mapping for the dead element (now at `lastIndex`)
    const deadId = this.soa.id[lastIndex];
    if (deadId) {
      this.idToIndex.delete(deadId);
    }

    // Clear out old slot to prevent ghost lookups
    this.soa.id[lastIndex] = undefined as any;

    // Push recycled slot onto stack (manual free list)
    this.freeIndices[this.freeTop++] = lastIndex;

    this.soa.count--;
  }

  /** Swaps two indices in the SOA */
  private swap(i: number, j: number): void {
    const s   = this.scratchValues;
    const soa = this.soa;

    // Cache all fields for i (no boxing; packed order)
    s[0]  = soa.x[i];              s[1]  = soa.y[i];               // Position
    s[2]  = soa.vx[i];             s[3]  = soa.vy[i];              // Velocity
    s[4]  = soa.scale[i];          s[5]  = soa.alpha[i];           // Scale/Alpha
    s[6]  = soa.r[i];              s[7]  = soa.g[i];               s[8]  = soa.b[i]; // Color
    s[9]  = soa.glyphIndex[i];                                      // Glyph
    s[10] = soa.life[i];           s[11] = soa.initialLife[i];     // Lifetime
    s[12] = soa.elapsed[i];        s[13] = soa.impactScale[i];     // Timing/Impact
    s[14] = soa.neonPhase[i];      s[15] = soa.neonSpeed[i];       // Neon animation
    s[16] = soa.neonEnabled[i];                                     // Neon flag
    s[17] = soa.id[i];                                             // Stable ID
    s[18] = soa.digitOffset[i];                                     // Digit offset

    // Copy j → i
    soa.x[i]            = soa.x[j];            soa.y[i]            = soa.y[j];
    soa.vx[i]           = soa.vx[j];           soa.vy[i]           = soa.vy[j];
    soa.scale[i]        = soa.scale[j];        soa.alpha[i]        = soa.alpha[j];
    soa.r[i]            = soa.r[j];            soa.g[i]            = soa.g[j];       soa.b[i] = soa.b[j];
    soa.glyphIndex[i]   = soa.glyphIndex[j];
    soa.life[i]         = soa.life[j];         soa.initialLife[i]  = soa.initialLife[j];
    soa.elapsed[i]      = soa.elapsed[j];
    soa.impactScale[i]  = soa.impactScale[j];
    soa.neonPhase[i]    = soa.neonPhase[j];    soa.neonSpeed[i]    = soa.neonSpeed[j];
    soa.neonEnabled[i]  = soa.neonEnabled[j];
    soa.id[i]           = soa.id[j];
    soa.digitOffset[i]  = soa.digitOffset[j];

    // Copy cached (i) → j
    soa.x[j]            = s[0];                soa.y[j]            = s[1];
    soa.vx[j]           = s[2];                soa.vy[j]           = s[3];
    soa.scale[j]        = s[4];                soa.alpha[j]        = s[5];
    soa.r[j]            = s[6];                soa.g[j]            = s[7];           soa.b[j] = s[8];
    soa.glyphIndex[j]   = s[9];
    soa.life[j]         = s[10];               soa.initialLife[j]  = s[11];
    soa.elapsed[j]      = s[12];               soa.impactScale[j]  = s[13];
    soa.neonPhase[j]    = s[14];               soa.neonSpeed[j]    = s[15];
    soa.neonEnabled[j]  = s[16];
    soa.id[j]           = s[17];
    soa.digitOffset[j]  = s[18];
  }
}