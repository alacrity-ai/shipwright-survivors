// src/systems/fx/DamageTextManager.ts

import { createDamageTextSOA, type DamageTextSOA } from '@/systems/damagetext/interfaces/DamageTextSOA';

let nextTextId = 0;
let _instance: DamageTextManager | null = null;

const MAX_DIGITS = 10000;

// Baseline glyph size (in world units). This controls the visual scale
// of all digits, independent of the atlas pixel size.
const BASE_SCALE = 48;

// Spacing between glyph centers, as a fraction of BASE_SCALE.
// 0.75 gives a slightly tight monospace look (digits visually adjacent).
const SPACING_FACTOR = 0.75;

// Time (seconds) for the "impact pop" scale to decay back to BASE_SCALE.
const POP_DECAY_TIME = 0.4;

// Speed at which text floats up
const FLOAT_SPEED = 160;

/**
 * Central orchestrator for floating damage text.
 * GC-neutral: preallocated SOA, swap-with-last recycling, no per-frame allocations.
 */
export class DamageTextManager {
  private readonly soa: DamageTextSOA = createDamageTextSOA(MAX_DIGITS);

  /** Scratch array for swaps (kept packed to avoid deopts) */
  private readonly scratchValues: any[] = new Array(20);

  /** Reusable pool of free indices for slot recycling */
  private readonly freeIndices: number[] = [];

  /** Stable ID → index mapping for external updates (e.g., merging) */
  private readonly idToIndex: Map<number, number> = new Map();

  private constructor() {
    this.scratchValues.fill(null);
  }

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
    const str = String(Math.floor(value));
    const glyphs = str.split('').map((c) => (c === '+' ? 10 : Number(c))); // 10 reserved for '+'

    // Space digits proportionally to BASE_SCALE
    const spacing = BASE_SCALE * SPACING_FACTOR;
    const startX = x - (glyphs.length - 1) * (spacing / 2);

    for (let i = 0; i < glyphs.length; i++) {
      const index = this.allocateIndex();
      if (index === -1) break;

      this.soa.x[index] = startX + i * spacing;
      this.soa.y[index] = y;
      this.soa.vx[index] = 0;
      this.soa.vy[index] = -FLOAT_SPEED; // upward drift
      this.soa.scale[index] = BASE_SCALE;
      this.soa.alpha[index] = 1;
      this.soa.r[index] = r;
      this.soa.g[index] = g;
      this.soa.b[index] = b;
      this.soa.glyphIndex[index] = glyphs[i];
      this.soa.life[index] = life;
      this.soa.initialLife[index] = life;
      this.soa.elapsed[index] = 0;

      // "Pop" effect scale on spawn: bigger if critical
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
    this.freeIndices.length = 0;
    this.idToIndex.clear();
  }

  /** Internal: allocate a slot for a new digit */
  private allocateIndex(): number {
    if (this.freeIndices.length > 0) {
      const idx = this.freeIndices.pop()!;
      if (idx >= this.soa.count) {
        this.soa.count = idx + 1; // Ensure count encompasses reused index
      }
      return idx;
    }
    if (this.soa.count >= MAX_DIGITS) return -1;
    return this.soa.count++;
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

    this.freeIndices.push(lastIndex);
    this.soa.count--;
  }

  /** Swaps two indices in the SOA */
  private swap(i: number, j: number): void {
    const s = this.scratchValues;
    const soa = this.soa;

    // Cache all fields for i
    s[0] = soa.x[i];           s[1] = soa.y[i];
    s[2] = soa.vx[i];          s[3] = soa.vy[i];
    s[4] = soa.scale[i];       s[5] = soa.alpha[i];
    s[6] = soa.r[i];           s[7] = soa.g[i];           s[8] = soa.b[i];
    s[9] = soa.glyphIndex[i];
    s[10] = soa.life[i];       s[11] = soa.initialLife[i];
    s[12] = soa.elapsed[i];    s[13] = soa.impactScale[i];
    s[14] = soa.neonPhase[i];  s[15] = soa.neonSpeed[i];
    s[16] = soa.neonEnabled[i];
    s[17] = soa.id[i];

    // Copy j → i
    soa.x[i] = soa.x[j];         soa.y[i] = soa.y[j];
    soa.vx[i] = soa.vx[j];       soa.vy[i] = soa.vy[j];
    soa.scale[i] = soa.scale[j]; soa.alpha[i] = soa.alpha[j];
    soa.r[i] = soa.r[j];         soa.g[i] = soa.g[j];         soa.b[i] = soa.b[j];
    soa.glyphIndex[i] = soa.glyphIndex[j];
    soa.life[i] = soa.life[j];   soa.initialLife[i] = soa.initialLife[j];
    soa.elapsed[i] = soa.elapsed[j];
    soa.impactScale[i] = soa.impactScale[j];
    soa.neonPhase[i] = soa.neonPhase[j]; soa.neonSpeed[i] = soa.neonSpeed[j];
    soa.neonEnabled[i] = soa.neonEnabled[j];
    soa.id[i] = soa.id[j];

    // Copy cached (i) → j
    soa.x[j] = s[0];             soa.y[j] = s[1];
    soa.vx[j] = s[2];            soa.vy[j] = s[3];
    soa.scale[j] = s[4];         soa.alpha[j] = s[5];
    soa.r[j] = s[6];             soa.g[j] = s[7];             soa.b[j] = s[8];
    soa.glyphIndex[j] = s[9];
    soa.life[j] = s[10];         soa.initialLife[j] = s[11];
    soa.elapsed[j] = s[12];      soa.impactScale[j] = s[13];
    soa.neonPhase[j] = s[14];    soa.neonSpeed[j] = s[15];
    soa.neonEnabled[j] = s[16];
    soa.id[j] = s[17];
  }
}
