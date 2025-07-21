// src/systems/fx/DamageTextAggregator.ts

import { DamageTextManager } from '@/systems/damagetext/DamageTextManager';
import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';

/** Max number of simultaneous damage channels (e.g., unique targets). */
const MAX_CHANNELS = 512;

/** Time window (in seconds) to batch damage before spawning an aggregated number. */
const AGGREGATION_WINDOW = 0.4;

let _instance: DamageTextAggregator | null = null;

/**
 * GC-neutral intermediary between game systems and DamageTextManager.
 *
 * - Throttles damage text to one visible number per channel per window.
 * - Always shows the first hit immediately for satisfaction.
 * - Accumulates all subsequent hits in the window and emits the total at the end.
 * - Uses SOA, preallocated buffers, and scratch-based swapping to avoid allocations.
 */
export class DamageTextAggregator {
  // Per-channel SOA fields
  private readonly keyHash: Int32Array       = new Int32Array(MAX_CHANNELS);
  private readonly x: Float32Array           = new Float32Array(MAX_CHANNELS);
  private readonly y: Float32Array           = new Float32Array(MAX_CHANNELS);
  private readonly accumulated: Float32Array = new Float32Array(MAX_CHANNELS);
  private readonly cooldown: Float32Array    = new Float32Array(MAX_CHANNELS);
  private readonly r: Float32Array           = new Float32Array(MAX_CHANNELS);
  private readonly g: Float32Array           = new Float32Array(MAX_CHANNELS);
  private readonly b: Float32Array           = new Float32Array(MAX_CHANNELS);
  private readonly lifetime: Float32Array    = new Float32Array(MAX_CHANNELS);
  private readonly crit: Uint8Array          = new Uint8Array(MAX_CHANNELS);

  /** Scratch buffer for swapping (kept packed to avoid V8 deopts). */
  private readonly scratch: Float64Array = new Float64Array(10); 
  // Slots: [0]=keyHash, [1]=x, [2]=y, [3]=accumulated, [4]=cooldown,
  // [5]=r, [6]=g, [7]=b, [8]=lifetime, [9]=crit (casted to float64)

  /** Active channel count (compacted array). */
  private count: number = 0;

  /** Stable mapping from keyHash → index for O(1) lookup. */
  private readonly hashToIndex: Map<number, number> = new Map();

  private readonly damageTextManager: DamageTextManager;

  private constructor() {
    this.damageTextManager = DamageTextManager.getInstance();
  }

  public static getInstance(): DamageTextAggregator {
    if (!_instance) {
      _instance = new DamageTextAggregator();
    }
    return _instance;
  }

  public static hasInstance(): boolean {
    return !!_instance;
  }

  /**
   * Queue incoming damage for a channel.
   * Always spawns the first number immediately, then throttles to one per window.
   */
  public enqueueDamage(
    x: number,
    y: number,
    dmg: number,
    r: number,
    g: number,
    b: number,
    lifetime: number,
    isCrit: boolean,
    channelKey: string
  ): void {
    const keyHash = this.hash(channelKey);
    const index = this.hashToIndex.get(keyHash);

    if (index == null) {
      // New channel → spawn first hit immediately
      const slot = this.allocateIndex();
      if (slot === -1) return; // Pool exhausted

      this.keyHash[slot] = keyHash;
      this.x[slot] = x;
      this.y[slot] = y;
      this.accumulated[slot] = 0; // start empty buffer
      this.cooldown[slot] = AGGREGATION_WINDOW;
      this.r[slot] = r;
      this.g[slot] = g;
      this.b[slot] = b;
      this.lifetime[slot] = lifetime;
      this.crit[slot] = isCrit ? 1 : 0;

      this.hashToIndex.set(keyHash, slot);

      // Immediate first number
      this.damageTextManager.spawnNumber(x, y, dmg, r, g, b, lifetime, isCrit);
      return;
    }

    // Existing channel → aggregate
    this.accumulated[index] += dmg;
    this.x[index] = x; // track latest hit location
    this.y[index] = y;
    this.r[index] = r;
    this.g[index] = g;
    this.b[index] = b;
    this.lifetime[index] = lifetime;
    if (isCrit) this.crit[index] = 1; // any crit in window marks crit
  }

  /**
   * Update all channels; emit batched damage when cooldown expires.
   */
  public update(dt: number): void {
    for (let i = 0; i < this.count; ) {
      this.cooldown[i] -= dt;

      if (this.cooldown[i] <= 0) {
        const total = this.accumulated[i];

        if (total > 0) {
          this.damageTextManager.spawnNumber(
            this.x[i],
            this.y[i],
            total,
            this.r[i],
            this.g[i],
            this.b[i],
            this.lifetime[i],
            this.crit[i] === 1
          );
          this.accumulated[i] = 0;
          this.crit[i] = 0;
        }

        this.cooldown[i] = AGGREGATION_WINDOW;

        // Recycle if no new damage is accumulated next frame
        if (total === 0) {
          this.recycle(i);
          continue; // Re-check same index (swapped element)
        }
      }

      i++;
    }
  }

  /** Clears all active channels immediately. */
  public clear(): void {
    this.count = 0;
    this.hashToIndex.clear();
  }

  // --- Internals: Allocation, Recycling, Swap ---

  private allocateIndex(): number {
    if (this.count >= MAX_CHANNELS) {
      return -1;
    }
    return this.count++;
  }

  private recycle(index: number): void {
    const last = this.count - 1;

    // Remove mapping for the dead channel first
    const deadHash = this.keyHash[index];
    this.hashToIndex.delete(deadHash);

    if (index !== last) {
      this.swap(index, last);

      // Update mapping for the element now occupying `index`
      const swappedHash = this.keyHash[index];
      this.hashToIndex.set(swappedHash, index);
    }

    this.count--;
  }

  /** Performs a swap using a packed scratch buffer (monomorphic for V8). */
  private swap(i: number, j: number): void {
    const s = this.scratch;

    // Cache all fields for `i`
    s[0] = this.keyHash[i];
    s[1] = this.x[i];
    s[2] = this.y[i];
    s[3] = this.accumulated[i];
    s[4] = this.cooldown[i];
    s[5] = this.r[i];
    s[6] = this.g[i];
    s[7] = this.b[i];
    s[8] = this.lifetime[i];
    s[9] = this.crit[i]; // store as float

    // Copy `j → i`
    this.keyHash[i]   = this.keyHash[j];
    this.x[i]         = this.x[j];
    this.y[i]         = this.y[j];
    this.accumulated[i] = this.accumulated[j];
    this.cooldown[i]  = this.cooldown[j];
    this.r[i]         = this.r[j];
    this.g[i]         = this.g[j];
    this.b[i]         = this.b[j];
    this.lifetime[i]  = this.lifetime[j];
    this.crit[i]      = this.crit[j];

    // Copy cached `i → j`
    this.keyHash[j]   = s[0] as number;
    this.x[j]         = s[1] as number;
    this.y[j]         = s[2] as number;
    this.accumulated[j] = s[3] as number;
    this.cooldown[j]  = s[4] as number;
    this.r[j]         = s[5] as number;
    this.g[j]         = s[6] as number;
    this.b[j]         = s[7] as number;
    this.lifetime[j]  = s[8] as number;
    this.crit[j]      = s[9] as number;
  }

  private hash(key: string): number {
    // Simple 32-bit FNV-1a hash
    let h = 0x811c9dc5;
    for (let i = 0; i < key.length; i++) {
      h ^= key.charCodeAt(i);
      h = (h * 0x01000193) | 0;
    }
    return h;
  }
}
