// src/systems/fx/DamageTextManager.ts

import { createDamageTextSOA, type DamageTextSOA } from '@/systems/damagetext/interfaces/DamageTextSOA';

let nextTextId = 0;
let _instance: DamageTextManager | null = null;

const MAX_DIGITS = 10000;
const MAX_CHANNELS = 512; // Preallocated channel capacity

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

interface ChannelSOA {
  /** Channel keys (hashed for GC neutrality) */
  keyHash: Int32Array;
  /** Current accumulated damage value */
  value: Float32Array;
  /** Position */
  x: Float32Array;
  y: Float32Array;
  /** Color */
  r: Float32Array;
  g: Float32Array;
  b: Float32Array;
  /** Lifetime */
  life: Float32Array;
  /** Critical hit flag */
  crit: Uint8Array;
  /** Offset into global digit ID pool */
  digitStart: Int32Array;
  /** Count of digits for this channel */
  digitCount: Uint16Array;
  /** Current count of active channels */
  count: number;
}

function createChannelSOA(capacity: number): ChannelSOA {
  return {
    keyHash: new Int32Array(capacity),
    value: new Float32Array(capacity),
    x: new Float32Array(capacity),
    y: new Float32Array(capacity),
    r: new Float32Array(capacity),
    g: new Float32Array(capacity),
    b: new Float32Array(capacity),
    life: new Float32Array(capacity),
    crit: new Uint8Array(capacity),
    digitStart: new Int32Array(capacity),
    digitCount: new Uint16Array(capacity),
    count: 0,
  };
}

// Simple string hash function for GC-neutral channel keys
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
}

/**
 * Central orchestrator for floating damage text.
 * GC-neutral: preallocated SOA, swap-with-last recycling, no per-frame allocations.
 * Now supports damage aggregation via channels using preallocated SOA structure.
 */
export class DamageTextManager {
  private readonly soa: DamageTextSOA = createDamageTextSOA(MAX_DIGITS);

  /** Scratch array for swaps (kept packed to avoid deopts) */
  private readonly scratchValues: any[] = new Array(20);

  /** Reusable pool of free indices for slot recycling */
  private readonly freeIndices: number[] = [];

  /** Stable ID → index mapping for external updates (e.g., merging) */
  private readonly idToIndex: Int32Array = new Int32Array(MAX_DIGITS);

  /** GC-neutral channel aggregation using SOA */
  private readonly channels: ChannelSOA = createChannelSOA(MAX_CHANNELS);

  /** Reusable pool of free channel indices */
  private readonly freeChannelIndices: number[] = [];

  /** Global digit ID pool for channel digit tracking */
  private readonly digitIdPool: Int32Array = new Int32Array(MAX_DIGITS);
  
  /** Next available slot in digit ID pool */
  private digitPoolIndex = 0;

  // Parallel stacks for freed digit blocks (GC-neutral)
  private readonly freeDigitStarts = new Int32Array(MAX_CHANNELS);
  private readonly freeDigitLengths = new Int32Array(MAX_CHANNELS);
  private freeDigitCount = 0;

  private readonly digitScratch = new Uint8Array(12); // Supports up to 12 digits
  private readonly channelBlockScratch = new Int32Array(2); 

  // Fixed-size hash table for key → channelIndex mapping (open addressing)
  private readonly channelKeys = new Int32Array(MAX_CHANNELS).fill(-1);
  private readonly channelValues = new Int32Array(MAX_CHANNELS).fill(-1);

  private constructor() {
    this.scratchValues.fill(null);
    this.idToIndex.fill(-1);
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
   * If channel is provided, aggregates with existing damage on that channel.
   * Digits are centered horizontally and use digitOffset for spacing,
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
    channel?: string,
  ): void {
    if (channel) {
      this.spawnOrUpdateChannel(channel, x, y, value, r, g, b, life, crit);
    } else {
      this.spawnDigitsForValue(x, y, value, r, g, b, life, crit);
    }
  }

  /**
   * Spawns or updates damage for a specific channel.
   * If channel exists, adds to existing damage and refreshes the display.
   * If channel doesn't exist, creates a new channel.
   */
  private spawnOrUpdateChannel(
    channel: string,
    x: number,
    y: number,
    value: number,
    r: number,
    g: number,
    b: number,
    life: number,
    crit: boolean,
  ): void {
    const keyHash = hashString(channel);
    const existingIndex = this.findChannelIndexForKey(keyHash);

    if (existingIndex !== -1 && existingIndex < this.channels.count) {
      // Update existing channel
      this.updateExistingChannel(existingIndex, x, y, value, r, g, b, life, crit);
    } else {
      // Create new channel
      this.createNewChannel(keyHash, x, y, value, r, g, b, life, crit);
    }
  }

  /**
   * Updates an existing channel by aggregating new damage and refreshing its digits.
   * Removes old digits, updates aggregate values, and spawns a fresh set of glyphs.
   */
  private updateExistingChannel(
    channelIndex: number,
    x: number,
    y: number,
    value: number,
    r: number,
    g: number,
    b: number,
    life: number,
    crit: boolean,
  ): void {
    // Remove old digits for this channel
    const digitStart = this.channels.digitStart[channelIndex];
    const digitCount = this.channels.digitCount[channelIndex];

    for (let i = 0; i < digitCount; i++) {
      const digitId = this.digitIdPool[digitStart + i];
      this.removeById(digitId);
    }

    // Update aggregated values
    this.channels.value[channelIndex] += value;
    this.channels.x[channelIndex] = x;
    this.channels.y[channelIndex] = y;
    this.channels.crit[channelIndex] = this.channels.crit[channelIndex] || (crit ? 1 : 0);
    this.channels.life[channelIndex] = life;

    // Spawn new digits with the updated value (reuses channelBlockScratch)
    const block = this.spawnDigitsForValue(
      this.channels.x[channelIndex],
      this.channels.y[channelIndex],
      this.channels.value[channelIndex],
      this.channels.r[channelIndex],
      this.channels.g[channelIndex],
      this.channels.b[channelIndex],
      this.channels.life[channelIndex],
      this.channels.crit[channelIndex] === 1,
      true // track IDs for this channel
    ) as Int32Array;

    // Record the block slice for this channel (no allocations)
    this.channels.digitStart[channelIndex] = block[0];
    this.channels.digitCount[channelIndex] = block[1];
  }

  private createNewChannel(
    keyHash: number,
    x: number,
    y: number,
    value: number,
    r: number,
    g: number,
    b: number,
    life: number,
    crit: boolean,
  ): void {
    const channelIndex = this.allocateChannelIndex();
    if (channelIndex === -1) return; // No free channels available

    // Initialize channel data
    this.channels.keyHash[channelIndex] = keyHash;
    this.channels.value[channelIndex] = value;
    this.channels.x[channelIndex] = x;
    this.channels.y[channelIndex] = y;
    this.channels.r[channelIndex] = r;
    this.channels.g[channelIndex] = g;
    this.channels.b[channelIndex] = b;
    this.channels.life[channelIndex] = life;
    this.channels.crit[channelIndex] = crit ? 1 : 0;

    // Register mapping from key → channel index in our fixed-size table
    this.putChannelKey(keyHash, channelIndex);

    // Spawn digits and capture their location in the global ID pool
    const block = this.spawnDigitsForValue(x, y, value, r, g, b, life, crit, true) as Int32Array;

    // Record the block slice for this channel (preallocated scratch array)
    this.channels.digitStart[channelIndex] = block[0];
    this.channels.digitCount[channelIndex] = block[1];
  }

  /**
   * Internal method to spawn digits for a value.
   * Writes IDs directly into the global digitIdPool (if tracking is needed),
   * avoiding transient arrays.
   *
   * Returns a { start, count } descriptor only when channel tracking
   * is enabled, otherwise undefined.
   */
  private spawnDigitsForValue(
    x: number,
    y: number,
    value: number,
    r: number,
    g: number,
    b: number,
    life: number,
    crit: boolean,
    trackIds: boolean = false
  ): Int32Array | void {
    const glyphCount = this.encodeDigits(value);
    const centerOffset = (glyphCount - 1) * 0.5;

    // If tracking IDs for a channel, reserve a contiguous slice
    let start = 0;
    if (trackIds) {
      start = this.allocateDigitBlock(glyphCount);
    }

    for (let i = 0; i < glyphCount; i++) {
      const index = this.allocateIndex();
      if (index === -1) break;

      // Position and movement
      this.soa.x[index] = x;
      this.soa.y[index] = y;
      this.soa.vx[index] = 0;
      this.soa.vy[index] = -FLOAT_SPEED;

      // Visual attributes
      this.soa.scale[index] = BASE_SCALE;
      this.soa.alpha[index] = 1;
      this.soa.r[index] = r;
      this.soa.g[index] = g;
      this.soa.b[index] = b;
      this.soa.glyphIndex[index] = this.digitScratch[i];

      // Lifetime
      this.soa.life[index] = life;
      this.soa.initialLife[index] = life;
      this.soa.elapsed[index] = 0;

      // Offset and pop
      this.soa.digitOffset[index] = i - centerOffset;
      const popMult = crit ? 2.5 : 2.0;
      this.soa.impactScale[index] = BASE_SCALE * popMult;

      // Neon (crit effect)
      this.soa.neonPhase[index] = 0;
      this.soa.neonSpeed[index] = crit ? 6 : 0;
      this.soa.neonEnabled[index] = crit ? 1 : 0;

      // Assign wrapped ID
      const id = nextTextId++ % MAX_DIGITS;
      this.soa.id[index] = id;
      this.idToIndex[id] = index;

      if (trackIds) {
        this.digitIdPool[start + i] = id;
      }
    }

    if (trackIds) {
      this.channelBlockScratch[0] = start;
      this.channelBlockScratch[1] = glyphCount;
      return this.channelBlockScratch;
    }
  }

  // Helper: converts a value to digits, stores in digitScratch, returns count.
  private encodeDigits(value: number): number {
    let n = Math.floor(value);
    let i = 0;

    if (n === 0) {
      this.digitScratch[0] = 0;
      return 1;
    }

    // Extract digits least-significant first
    while (n > 0 && i < this.digitScratch.length) {
      this.digitScratch[i++] = n % 10;
      n = Math.floor(n / 10);
    }

    // Reverse to most-significant first
    for (let l = 0, r = i - 1; l < r; l++, r--) {
      const tmp = this.digitScratch[l];
      this.digitScratch[l] = this.digitScratch[r];
      this.digitScratch[r] = tmp;
    }

    return i; // number of digits
  }

  /**
   * Allocates a contiguous block in the digitIdPool for channel tracking.
   * Reuses freed blocks when possible to avoid growing digitPoolIndex.
   */
  private allocateDigitBlock(count: number): number {
    if (this.freeDigitCount > 0) {
      this.freeDigitCount--;
      const start = this.freeDigitStarts[this.freeDigitCount];
      const length = this.freeDigitLengths[this.freeDigitCount];
      if (length >= count) return start;
      // If block is too small, ignore and continue
    }
    const start = this.digitPoolIndex;
    this.digitPoolIndex += count;
    return start;
  }

  /** Updates all text (movement, alpha, impact scaling, neon cycling) */
  public update(dt: number): void {
    // Update digits
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

      // Scale decay back to BASE_SCALE
      const pop = this.soa.impactScale[i];
      const decayT = Math.min(this.soa.elapsed[i] / POP_DECAY_TIME, 1);
      this.soa.scale[i] = BASE_SCALE + (pop - BASE_SCALE) * (1 - decayT);

      // Neon cycling for critical hits
      if (this.soa.neonEnabled[i]) {
        this.soa.neonPhase[i] += dt * this.soa.neonSpeed[i];
      }

      i++;
    }

    // Clean up channels whose digits have expired
    for (let i = 0; i < this.channels.count; ) {
      const digitStart = this.channels.digitStart[i];
      const digitCount = this.channels.digitCount[i];

      // Skip empty channels immediately
      if (digitCount === 0) {
        this.recycleChannel(i);
        continue;
      }

      // Check if any digit IDs in this channel are still alive
      let hasLiveDigits = false;
      for (let j = 0; j < digitCount; j++) {
        const digitId = this.digitIdPool[digitStart + j];
        // Use the Int32Array lookup table: -1 = dead, otherwise holds SOA index
        if (this.idToIndex[digitId] !== -1) {
          hasLiveDigits = true;
          break;
        }
      }

      if (!hasLiveDigits) {
        this.recycleChannel(i);
        continue; // re-check same index after swap
      }

      i++;
    }
  }

  /** Removes a digit entry by ID */
  public removeById(id: number): void {
    const index = this.idToIndex[id];
    if (index == null || index < 0 || index >= this.soa.count) return;
    this.recycle(index);
  }

  /**
   * Removes all damage for a specific channel
   */
  public removeChannel(channel: string): void {
    const keyHash = hashString(channel);
    const channelIndex = this.findChannelIndexForKey(keyHash);
    if (channelIndex === -1 || channelIndex >= this.channels.count) return;

    // Remove all digits associated with this channel
    const digitStart = this.channels.digitStart[channelIndex];
    const digitCount = this.channels.digitCount[channelIndex];
    
    for (let i = 0; i < digitCount; i++) {
      const digitId = this.digitIdPool[digitStart + i];
      this.removeById(digitId);
    }

    // Recycle the channel
    this.recycleChannel(channelIndex);
  }

  /** Clears all active text immediately */
  public clear(): void {
    this.soa.count = 0;
    this.freeIndices.length = 0;
    this.idToIndex.fill(-1);
    this.channels.count = 0;
    this.freeChannelIndices.length = 0;
    this.clearChannelKeys(); // Reset our fixed-size hash table
    this.digitPoolIndex = 0;
    this.freeDigitCount = 0;
  }

  /**
   * Gets current damage value for a channel (useful for debugging)
   */
  public getChannelValue(channel: string): number | undefined {
    const keyHash = hashString(channel);
    const channelIndex = this.findChannelIndexForKey(keyHash);
    if (channelIndex === -1 || channelIndex >= this.channels.count) return undefined;
    return this.channels.value[channelIndex];
  }

  /**
   * Gets all active channel names (useful for debugging)
   * Note: Returns hash values since we don't store original strings
   */
  public getActiveChannels(): number[] {
    const activeChannels: number[] = [];
    for (let i = 0; i < this.channels.count; i++) {
      activeChannels.push(this.channels.keyHash[i]);
    }
    return activeChannels;
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

  /** Internal: allocate a slot for a new channel */
  private allocateChannelIndex(): number {
    if (this.freeChannelIndices.length > 0) {
      const idx = this.freeChannelIndices.pop()!;
      if (idx >= this.channels.count) {
        this.channels.count = idx + 1;
      }
      return idx;
    }
    if (this.channels.count >= MAX_CHANNELS) return -1;
    return this.channels.count++;
  }

  /** Internal: swap-with-last recycling for digits */
  private recycle(index: number): void {
    const lastIndex = this.soa.count - 1;

    if (index !== lastIndex) {
      this.swap(index, lastIndex);

      // Fix mapping for the element that was swapped into index
      const swappedId = this.soa.id[index];
      if (swappedId) {
        this.idToIndex[swappedId] = index;
      }
    }

    // Remove mapping for the dead element (now at lastIndex)
    const deadId = this.soa.id[lastIndex];
    if (deadId) {
      this.idToIndex[deadId] = -1; // mark as dead
    }

    // Clear out old slot to prevent ghost lookups
    this.soa.id[lastIndex] = undefined as any;

    this.freeIndices.push(lastIndex);
    this.soa.count--;
  }

  /** Internal: swap-with-last recycling for channels */
  private recycleChannel(index: number): void {
    const lastIndex = this.channels.count - 1;

    // Remove the mapping for the element being deleted (lastIndex) first
    const deadKeyHash = this.channels.keyHash[lastIndex];
    this.removeChannelKey(deadKeyHash);

    // If we're not deleting the last element, swap it with the one at `index`
    if (index !== lastIndex) {
      this.swapChannels(index, lastIndex);

      // Update mapping for the swapped-in channel now at `index`
      const swappedKeyHash = this.channels.keyHash[index];
      this.putChannelKey(swappedKeyHash, index);
    }

    // Reclaim the digit ID block used by this channel
    const digitStart = this.channels.digitStart[lastIndex];
    const digitCount = this.channels.digitCount[lastIndex];
    if (digitCount > 0) {
      const i = this.freeDigitCount++;
      this.freeDigitStarts[i] = digitStart;
      this.freeDigitLengths[i] = digitCount;
    }

    // Compact the pool only if this freed block was at the tail
    if (digitStart + digitCount === this.digitPoolIndex) {
      this.digitPoolIndex = digitStart;
    }

    this.freeChannelIndices.push(lastIndex);
    this.channels.count--;
  }

  /** Swaps two indices in the digit SOA */
  private swap(i: number, j: number): void {
    const s = this.scratchValues;
    const soa = this.soa;

    // Cache all fields for i
    s[0]  = soa.x[i];            s[1]  = soa.y[i];
    s[2]  = soa.vx[i];           s[3]  = soa.vy[i];
    s[4]  = soa.scale[i];        s[5]  = soa.alpha[i];
    s[6]  = soa.r[i];            s[7]  = soa.g[i];             s[8]  = soa.b[i];
    s[9]  = soa.glyphIndex[i];
    s[10] = soa.life[i];         s[11] = soa.initialLife[i];
    s[12] = soa.elapsed[i];      s[13] = soa.impactScale[i];
    s[14] = soa.neonPhase[i];    s[15] = soa.neonSpeed[i];
    s[16] = soa.neonEnabled[i];
    s[17] = soa.id[i];
    s[18] = soa.digitOffset[i];

    // Copy j → i
    soa.x[i] = soa.x[j];           soa.y[i] = soa.y[j];
    soa.vx[i] = soa.vx[j];         soa.vy[i] = soa.vy[j];
    soa.scale[i] = soa.scale[j];   soa.alpha[i] = soa.alpha[j];
    soa.r[i] = soa.r[j];           soa.g[i] = soa.g[j];            soa.b[i] = soa.b[j];
    soa.glyphIndex[i] = soa.glyphIndex[j];
    soa.life[i] = soa.life[j];     soa.initialLife[i] = soa.initialLife[j];
    soa.elapsed[i] = soa.elapsed[j];
    soa.impactScale[i] = soa.impactScale[j];
    soa.neonPhase[i] = soa.neonPhase[j]; soa.neonSpeed[i] = soa.neonSpeed[j];
    soa.neonEnabled[i] = soa.neonEnabled[j];
    soa.id[i] = soa.id[j];
    soa.digitOffset[i] = soa.digitOffset[j];

    // Copy cached (i) → j
    soa.x[j] = s[0];               soa.y[j] = s[1];
    soa.vx[j] = s[2];              soa.vy[j] = s[3];
    soa.scale[j] = s[4];           soa.alpha[j] = s[5];
    soa.r[j] = s[6];               soa.g[j] = s[7];                 soa.b[j] = s[8];
    soa.glyphIndex[j] = s[9];
    soa.life[j] = s[10];           soa.initialLife[j] = s[11];
    soa.elapsed[j] = s[12];        soa.impactScale[j] = s[13];
    soa.neonPhase[j] = s[14];      soa.neonSpeed[j] = s[15];
    soa.neonEnabled[j] = s[16];
    soa.id[j] = s[17];
    soa.digitOffset[j] = s[18];
  }

  /** Swaps two channel indices in the channel SOA */
  private swapChannels(i: number, j: number): void {
    const channels = this.channels;

    // Cache channel i data
    const tempKeyHash = channels.keyHash[i];
    const tempValue = channels.value[i];
    const tempX = channels.x[i];
    const tempY = channels.y[i];
    const tempR = channels.r[i];
    const tempG = channels.g[i];
    const tempB = channels.b[i];
    const tempLife = channels.life[i];
    const tempCrit = channels.crit[i];
    const tempDigitStart = channels.digitStart[i];
    const tempDigitCount = channels.digitCount[i];

    // Copy j → i
    channels.keyHash[i] = channels.keyHash[j];
    channels.value[i] = channels.value[j];
    channels.x[i] = channels.x[j];
    channels.y[i] = channels.y[j];
    channels.r[i] = channels.r[j];
    channels.g[i] = channels.g[j];
    channels.b[i] = channels.b[j];
    channels.life[i] = channels.life[j];
    channels.crit[i] = channels.crit[j];
    channels.digitStart[i] = channels.digitStart[j];
    channels.digitCount[i] = channels.digitCount[j];

    // Copy cached (i) → j
    channels.keyHash[j] = tempKeyHash;
    channels.value[j] = tempValue;
    channels.x[j] = tempX;
    channels.y[j] = tempY;
    channels.r[j] = tempR;
    channels.g[j] = tempG;
    channels.b[j] = tempB;
    channels.life[j] = tempLife;
    channels.crit[j] = tempCrit;
    channels.digitStart[j] = tempDigitStart;
    channels.digitCount[j] = tempDigitCount;
  }

  /** Finds the index in channelKeys for a given keyHash, or -1 if not found */
  private findChannelIndexForKey(keyHash: number): number {
    const mask = MAX_CHANNELS - 1; // MAX_CHANNELS should be power of 2 ideally
    let idx = keyHash & mask;
    for (let i = 0; i < MAX_CHANNELS; i++) {
      const k = this.channelKeys[idx];
      if (k === keyHash) return this.channelValues[idx];
      if (k === -1) break; // Empty slot
      idx = (idx + 1) & mask;
    }
    return -1;
  }

  /** Inserts or updates a key → channelIndex mapping */
  private putChannelKey(keyHash: number, channelIndex: number): void {
    const mask = MAX_CHANNELS - 1;
    let idx = keyHash & mask;
    for (let i = 0; i < MAX_CHANNELS; i++) {
      const k = this.channelKeys[idx];
      if (k === -1 || k === keyHash) {
        this.channelKeys[idx] = keyHash;
        this.channelValues[idx] = channelIndex;
        return;
      }
      idx = (idx + 1) & mask;
    }
  }

  /** Deletes a key from the table */
  private removeChannelKey(keyHash: number): void {
    const mask = MAX_CHANNELS - 1;
    let idx = keyHash & mask;
    for (let i = 0; i < MAX_CHANNELS; i++) {
      if (this.channelKeys[idx] === keyHash) {
        this.channelKeys[idx] = -1;
        this.channelValues[idx] = -1;
        return;
      }
      if (this.channelKeys[idx] === -1) return; // Not found
      idx = (idx + 1) & mask;
    }
  }

  /** Clears the table */
  private clearChannelKeys(): void {
    this.channelKeys.fill(-1);
    this.channelValues.fill(-1);
  }
}
