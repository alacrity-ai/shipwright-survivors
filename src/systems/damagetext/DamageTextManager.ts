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
  private readonly idToIndex: Map<number, number> = new Map();

  /** GC-neutral channel aggregation using SOA */
  private readonly channels: ChannelSOA = createChannelSOA(MAX_CHANNELS);

  /** Reusable pool of free channel indices */
  private readonly freeChannelIndices: number[] = [];

  /** Global digit ID pool for channel digit tracking */
  private readonly digitIdPool: Int32Array = new Int32Array(MAX_DIGITS);
  
  /** Next available slot in digit ID pool */
  private digitPoolIndex = 0;

  /** Stack of freed digit blocks for reuse */
  private readonly freeDigitBlocks: { start: number; length: number }[] = [];

  /** Channel key → channel index mapping for fast lookups */
  private readonly channelKeyToIndex: Map<number, number> = new Map();

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
   * If channel doesn't exist, creates new channel.
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
    const existingIndex = this.channelKeyToIndex.get(keyHash);

    if (existingIndex !== undefined && existingIndex < this.channels.count) {
      // Update existing channel
      this.updateExistingChannel(existingIndex, x, y, value, r, g, b, life, crit);
    } else {
      // Create new channel
      this.createNewChannel(keyHash, x, y, value, r, g, b, life, crit);
    }
  }

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

    // Spawn new digits with updated value
    const newDigitIds = this.spawnDigitsForValue(
      this.channels.x[channelIndex],
      this.channels.y[channelIndex],
      this.channels.value[channelIndex],
      this.channels.r[channelIndex],
      this.channels.g[channelIndex],
      this.channels.b[channelIndex],
      this.channels.life[channelIndex],
      this.channels.crit[channelIndex] === 1,
      true
    ) as number[];

    this.storeDigitIds(channelIndex, newDigitIds);
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
    if (channelIndex === -1) return; // No free channels
    
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
    
    // Create digit mapping
    this.channelKeyToIndex.set(keyHash, channelIndex);
    
    // Spawn digits
    const digitIds = this.spawnDigitsForValue(x, y, value, r, g, b, life, crit, true) as number[];
    
    // Store digit IDs in pool
    this.storeDigitIds(channelIndex, digitIds);
  }

  private storeDigitIds(channelIndex: number, digitIds: number[]): void {
    let start: number;

    // If we have enough recycled space, reuse it
    if (this.freeDigitBlocks.length > 0) {
      // Reuse the last freed block (stack behavior)
      const block = this.freeDigitBlocks.pop()!;
      // If the freed block is too small, just allocate at the end
      if (block.length >= digitIds.length) {
        start = block.start;
      } else {
        start = this.digitPoolIndex;
      }
    } else {
      start = this.digitPoolIndex;
    }

    // Bounds check
    if (start + digitIds.length > MAX_DIGITS) {
      digitIds = digitIds.slice(0, MAX_DIGITS - start);
    }

    // Record the digit range for this channel
    this.channels.digitStart[channelIndex] = start;
    this.channels.digitCount[channelIndex] = digitIds.length;

    // Write the IDs into the pool
    for (let i = 0; i < digitIds.length; i++) {
      this.digitIdPool[start + i] = digitIds[i];
    }

    // Advance pool pointer if we wrote past the end
    if (start + digitIds.length > this.digitPoolIndex) {
      this.digitPoolIndex = start + digitIds.length;
    }
  }

  /**
   * Internal method to spawn digits for a value.
   * Can optionally return the IDs of created digits for channel tracking.
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
    returnIds: boolean = false,
  ): void | number[] {
    const str = String(Math.floor(value));
    const glyphs = str.split('').map((c) => (c === '+' ? 10 : Number(c))); // 10 reserved for '+'

    const glyphCount = glyphs.length;
    const centerOffset = (glyphCount - 1) * 0.5; // for -N..N digit offsets
    const digitIds: number[] = returnIds ? [] : [];

    for (let i = 0; i < glyphCount; i++) {
      const index = this.allocateIndex();
      if (index === -1) break;

      // Anchor: all glyphs share the same X (centered string)
      this.soa.x[index] = x;
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

      // Digit offset (-N..N) for dynamic spacing in shader
      this.soa.digitOffset[index] = i - centerOffset;

      // "Pop" effect scale on spawn: bigger if critical
      const popMultiplier = crit ? 3.0 : 2.0;
      this.soa.impactScale[index] = BASE_SCALE * popMultiplier;

      this.soa.neonPhase[index] = 0;
      this.soa.neonSpeed[index] = crit ? 6 : 0;
      this.soa.neonEnabled[index] = crit ? 1 : 0;
      this.soa.id[index] = nextTextId++;

      this.idToIndex.set(this.soa.id[index], index);

      if (returnIds) {
        digitIds.push(this.soa.id[index]);
      }
    }

    return returnIds ? digitIds : undefined;
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

    // Clean up channels whose digits have expired (GC-neutral)
    for (let i = 0; i < this.channels.count; ) {
      let hasLiveDigits = false;
      const digitStart = this.channels.digitStart[i];
      const digitCount = this.channels.digitCount[i];
      
      // Check if any digits for this channel are still alive
      for (let j = 0; j < digitCount; j++) {
        const digitId = this.digitIdPool[digitStart + j];
        if (this.idToIndex.has(digitId)) {
          hasLiveDigits = true;
          break;
        }
      }
      
      if (!hasLiveDigits) {
        this.recycleChannel(i);
        continue; // re-check this index after swap
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

  /** 
   * Removes all damage for a specific channel 
   */
  public removeChannel(channel: string): void {
    const keyHash = hashString(channel);
    const channelIndex = this.channelKeyToIndex.get(keyHash);
    if (channelIndex === undefined || channelIndex >= this.channels.count) return;

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
    this.idToIndex.clear();
    this.channels.count = 0;
    this.freeChannelIndices.length = 0;
    this.channelKeyToIndex.clear();
    this.digitPoolIndex = 0;
    this.freeDigitBlocks.length = 0;
  }

  /**
   * Gets current damage value for a channel (useful for debugging)
   */
  public getChannelValue(channel: string): number | undefined {
    const keyHash = hashString(channel);
    const channelIndex = this.channelKeyToIndex.get(keyHash);
    if (channelIndex === undefined || channelIndex >= this.channels.count) return undefined;
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
        this.idToIndex.set(swappedId, index);
      }
    }

    // Remove mapping for the dead element (now at lastIndex)
    const deadId = this.soa.id[lastIndex];
    if (deadId) {
      this.idToIndex.delete(deadId);
    }

    // Clear out old slot to prevent ghost lookups
    this.soa.id[lastIndex] = undefined as any;

    this.freeIndices.push(lastIndex);
    this.soa.count--;
  }

  /** Internal: swap-with-last recycling for channels */
  private recycleChannel(index: number): void {
    const lastIndex = this.channels.count - 1;

    // Delete the mapping for the element we are actually removing (lastIndex) first
    const deadKeyHash = this.channels.keyHash[lastIndex];
    this.channelKeyToIndex.delete(deadKeyHash);

    // If we're not deleting the last element, swap it with the one at `index`
    if (index !== lastIndex) {
      this.swapChannels(index, lastIndex);

      // Update mapping for the swapped-in channel now at `index`
      const swappedKeyHash = this.channels.keyHash[index];
      this.channelKeyToIndex.set(swappedKeyHash, index);
    }

    // Reclaim the digit ID block used by this channel
    const digitStart = this.channels.digitStart[lastIndex];
    const digitCount = this.channels.digitCount[lastIndex];
    if (digitCount > 0) {
      this.freeDigitBlocks.push({ start: digitStart, length: digitCount });
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
}
