// src/systems/fx/ParticleManager.ts

import type { LightingOrchestrator } from '@/lighting/LightingOrchestrator';

import { randomInRange, randomIntInclusive, randomAngle } from '@/shared/mathUtils';
import { createPointLight } from '@/lighting/lights/createPointLight';

export type FadeMode = 'linear' | 'delayed';

export interface ParticleOptions {
  colors?: string[];
  baseSpeed?: number;
  sizeRange?: [number, number];
  lifeRange?: [number, number];
  velocity?: { x: number; y: number };
  fadeOut?: boolean;
  fadeMode?: FadeMode;
  light?: boolean;
  lightRadiusScalar?: number;
  lightIntensity?: number;
  lightColorOverride?: string;
  randomDirection?: boolean;
  speedRange?: [number, number];
}

// SOA structure for maximum performance
export interface ParticleSOA {
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  size: Float32Array;
  life: Float32Array;
  initialLife: Float32Array;
  renderAlpha: Float32Array;
  fadeOut: Uint8Array;      // bool as 0 or 1
  fadeMode: Uint8Array;     // enum as int (0 = linear, 1 = delayed)
  r: Float32Array;
  g: Float32Array;
  b: Float32Array;
  lightId: (string | undefined)[];
  color: string[];          // Keep for light creation
  count: number;
}

const colorCache = new Map<string, { r: number; g: number; b: number }>();

function hexToRgb(hex: string) {
  if (colorCache.has(hex)) return colorCache.get(hex)!;

  const clean = hex.startsWith('#') ? hex.slice(1) : hex;
  const result = {
    r: parseInt(clean.slice(0, 2), 16) / 255,
    g: parseInt(clean.slice(2, 4), 16) / 255,
    b: parseInt(clean.slice(4, 6), 16) / 255,
  };

  colorCache.set(hex, result);
  return result;
}

const PARTICLE_SCALE = 3;
const MAX_PARTICLES = 50000;

// Enum constants for fadeMode
const FADE_MODE_LINEAR = 0;
const FADE_MODE_DELAYED = 1;

function createSOABuffer(maxParticles: number): ParticleSOA {
  return {
    x: new Float32Array(maxParticles),
    y: new Float32Array(maxParticles),
    vx: new Float32Array(maxParticles),
    vy: new Float32Array(maxParticles),
    size: new Float32Array(maxParticles),
    life: new Float32Array(maxParticles),
    initialLife: new Float32Array(maxParticles),
    renderAlpha: new Float32Array(maxParticles),
    fadeOut: new Uint8Array(maxParticles),
    fadeMode: new Uint8Array(maxParticles),
    r: new Float32Array(maxParticles),
    g: new Float32Array(maxParticles),
    b: new Float32Array(maxParticles),
    lightId: new Array(maxParticles),
    color: new Array(maxParticles),
    count: 0
  };
}

function swapParticle(soa: ParticleSOA, i: number, j: number): void {
  // Swap all fields between indices i and j
  let temp: any;
  
  temp = soa.x[i]; soa.x[i] = soa.x[j]; soa.x[j] = temp;
  temp = soa.y[i]; soa.y[i] = soa.y[j]; soa.y[j] = temp;
  temp = soa.vx[i]; soa.vx[i] = soa.vx[j]; soa.vx[j] = temp;
  temp = soa.vy[i]; soa.vy[i] = soa.vy[j]; soa.vy[j] = temp;
  temp = soa.size[i]; soa.size[i] = soa.size[j]; soa.size[j] = temp;
  temp = soa.life[i]; soa.life[i] = soa.life[j]; soa.life[j] = temp;
  temp = soa.initialLife[i]; soa.initialLife[i] = soa.initialLife[j]; soa.initialLife[j] = temp;
  temp = soa.renderAlpha[i]; soa.renderAlpha[i] = soa.renderAlpha[j]; soa.renderAlpha[j] = temp;
  temp = soa.fadeOut[i]; soa.fadeOut[i] = soa.fadeOut[j]; soa.fadeOut[j] = temp;
  temp = soa.fadeMode[i]; soa.fadeMode[i] = soa.fadeMode[j]; soa.fadeMode[j] = temp;
  temp = soa.r[i]; soa.r[i] = soa.r[j]; soa.r[j] = temp;
  temp = soa.g[i]; soa.g[i] = soa.g[j]; soa.g[j] = temp;
  temp = soa.b[i]; soa.b[i] = soa.b[j]; soa.b[j] = temp;
  temp = soa.lightId[i]; soa.lightId[i] = soa.lightId[j]; soa.lightId[j] = temp;
  temp = soa.color[i]; soa.color[i] = soa.color[j]; soa.color[j] = temp;
}

export class ParticleManager {
  private readonly instanceName: string;
  private readonly soa: ParticleSOA;
  private readonly freeIndices: number[] = [];  // Pool of recycled indices
  
  // Handle system for stable particle references
  private nextHandle = 1;                       // Auto-incrementing handle counter
  private readonly handleToIndex = new Map<number, number>();  // handle -> SOA index
  private readonly indexToHandle: number[] = new Array(MAX_PARTICLES).fill(0);  // SOA index -> handle
  
  private randPtr = 0;          // cheap palette cycling index
  private randState = 0x12345678 ^ performance.now();   // seed once

  constructor(private readonly lightingOrchestrator: LightingOrchestrator, instanceName: string = 'default') {
    this.soa = createSOABuffer(MAX_PARTICLES);
    this.instanceName = instanceName;
  }

  private _createAndRegisterParticle(origin: { x: number; y: number }, options: ParticleOptions): number {
    if (this.soa.count >= MAX_PARTICLES && this.freeIndices.length === 0) {
      return -1; // No space available
    }

    const {
      colors = ['#00f', '#009', '#00a9f4', '#1e90ff'],
      sizeRange = [1, 4],
      lifeRange = [1, 2],
    } = options;

    let vx: number, vy: number;

    if (options.randomDirection) {
      const angle = randomAngle();
      const minSpeed = options.speedRange?.[0] ?? 0;
      const maxSpeed = options.speedRange?.[1] ?? options.baseSpeed ?? 1;
      const speed = randomInRange(minSpeed, maxSpeed);
      vx = Math.cos(angle) * speed;
      vy = Math.sin(angle) * speed;
    } else if (options.velocity) {
      vx = options.velocity.x;
      vy = options.velocity.y;
    } else {
      const angle = randomAngle();
      const speed = randomInRange(0, options.baseSpeed ?? 1);
      vx = Math.cos(angle) * speed;
      vy = Math.sin(angle) * speed;
    }

    // Determine insertion index
    const i = this.allocateParticleIndex();
    if (i === -1) return -1;

    // Defensive bounds check in case of unexpected mutation or overflow
    if (i >= MAX_PARTICLES) {
      return -1;
    }

    // Sanitize color array in case user passed an empty array
    const safeColors = colors.length > 0 ? colors : ['#00f', '#009', '#00a9f4', '#1e90ff'];
    const chosenColor = safeColors[randomIntInclusive(0, safeColors.length - 1)];
    const { r, g, b } = hexToRgb(chosenColor);

    // Initialize SOA fields
    this.soa.x[i] = origin.x;
    this.soa.y[i] = origin.y;
    this.soa.vx[i] = vx;
    this.soa.vy[i] = vy;
    this.soa.size[i] = randomInRange(sizeRange[0], sizeRange[1]) * PARTICLE_SCALE;
    this.soa.life[i] = randomInRange(lifeRange[0], lifeRange[1]);
    this.soa.initialLife[i] = this.soa.life[i];
    this.soa.fadeOut[i] = options.fadeOut ? 1 : 0;
    this.soa.fadeMode[i] = options.fadeMode === 'delayed' ? FADE_MODE_DELAYED : FADE_MODE_LINEAR;
    this.soa.renderAlpha[i] = 1.0;

    this.soa.color[i] = chosenColor;
    this.soa.r[i] = r;
    this.soa.g[i] = g;
    this.soa.b[i] = b;
    this.soa.lightId[i] = undefined;

    if (this.lightingOrchestrator && options.light) {
      const light = createPointLight({
        x: this.soa.x[i],
        y: this.soa.y[i],
        radius: this.soa.size[i] * (options.lightRadiusScalar ?? 3),
        color: options.lightColorOverride ?? this.soa.color[i],
        intensity: options.lightIntensity ?? 1.0,
        life: this.soa.life[i],
        expires: true,
        fadeMode: options.fadeMode ?? 'linear',
      });

      this.lightingOrchestrator.registerLight(light);
      this.soa.lightId[i] = light.id;
    }

    return i;
  }

  private _createAndRegisterParticleWithHandle(origin: { x: number; y: number }, options: ParticleOptions): number {
    const index = this._createAndRegisterParticle(origin, options);
    if (index === -1) return -1;

    // Create handle and establish mappings
    const handle = this.nextHandle++;
    this.handleToIndex.set(handle, index);
    this.indexToHandle[index] = handle;

    return handle;
  }

  // Used to emit a burst of particles by consumers
  emitBurst(origin: { x: number; y: number }, count: number, options: ParticleOptions = {}): void {
    for (let i = 0; i < count; i++) this._createAndRegisterParticle(origin, options);
  }

  // Used to emit a single particle by consumers
  public emitParticle(origin: { x: number; y: number }, options: ParticleOptions = {}): number {
    const particleIndex = this._createAndRegisterParticle(origin, options);
    return particleIndex;
  }

  // New method: emit particle with stable handle
  public emitParticleWithHandle(origin: { x: number; y: number }, options: ParticleOptions = {}): number {
    const handle = this._createAndRegisterParticleWithHandle(origin, options);
    return handle;
  }

  // Handle utility methods
  public getIndexFromHandle(handle: number): number {
    return this.handleToIndex.get(handle) ?? -1;
  }

  public getHandleFromIndex(index: number): number {
    return this.indexToHandle[index] ?? -1;
  }

  update(dt: number): void {
    const fadeThreshold = 0.10;
    const invFadeThreshold = 1.0 / fadeThreshold;

    // Process all active particles using tight SOA loop
    for (let i = 0; i < this.soa.count; ) {
      // Update position
      this.soa.x[i] += this.soa.vx[i] * dt;
      this.soa.y[i] += this.soa.vy[i] * dt;
      this.soa.life[i] -= dt;

      if (this.soa.life[i] <= 0) {
        this.recycleParticle(i);
        continue; // Don't increment i, as we swapped with last
      }

      // Update associated light
      if (this.soa.lightId[i]) {
        const light = this.lightingOrchestrator.getLightById(this.soa.lightId[i]!);
        if (light && (light.type === 'point' || light.type === 'spot')) {
          light.x = this.soa.x[i];
          light.y = this.soa.y[i];
        }
      }

      // Update alpha
      const lifeRatio = this.soa.initialLife[i] ? this.soa.life[i] / this.soa.initialLife[i] : 1.0;
      this.soa.renderAlpha[i] = this.soa.fadeMode[i] === FADE_MODE_DELAYED
        ? (lifeRatio >= fadeThreshold ? 1.0 : lifeRatio * invFadeThreshold)
        : lifeRatio;

      i++;
    }
  }

  // Used by ParticlePass to Render SOA data directly
  public getParticleSOA(): ParticleSOA {
    return this.soa;
  }

  public removeParticle(particleIndex: number): void {
    if (particleIndex >= 0 && particleIndex < this.soa.count) {
      this.recycleParticle(particleIndex);
    }
  }

  private recycleParticle(index: number): void {
    if (this.soa.lightId[index]) {
      this.lightingOrchestrator.removeLight(this.soa.lightId[index]!);
      this.soa.lightId[index] = undefined;
    }

    // Clean up handle mappings if this particle has a handle
    const handle = this.indexToHandle[index];
    if (handle) {
      this.handleToIndex.delete(handle);
      this.indexToHandle[index] = 0;
    }

    const lastIndex = this.soa.count - 1;
    if (index !== lastIndex) {
      // Update handle mapping for the particle we're swapping from the end
      const lastHandle = this.indexToHandle[lastIndex];
      if (lastHandle) {
        this.handleToIndex.set(lastHandle, index);
        this.indexToHandle[index] = lastHandle;
        this.indexToHandle[lastIndex] = 0;
      }

      swapParticle(this.soa, index, lastIndex);
      this.freeIndices.push(lastIndex);
    } else {
      this.freeIndices.push(index);
    }

    this.soa.count--;
  }

  private allocateParticleIndex(): number {
    if (this.freeIndices.length > 0) {
      const reused = this.freeIndices.pop()!;
      if (reused >= this.soa.count) {
        this.soa.count = reused + 1;
      }
      return reused;
    }

    if (this.soa.count >= MAX_PARTICLES) return -1;
    return this.soa.count++;
  }

  public destroy(): void {
    for (let i = 0; i < this.soa.count; i++) {
      if (this.soa.lightId[i]) {
        this.lightingOrchestrator.removeLight(this.soa.lightId[i]!);
      }
    }

    this.soa.count = 0;
    this.freeIndices.length = 0;
    this.handleToIndex.clear();
    this.indexToHandle.fill(0);
  }

  // Utility methods for debugging/monitoring
  public getActiveParticleCount(): number {
    return this.soa.count;
  }

  /* VERY small, inlineable RNG: one 32‑bit multiply + two XORs */
  private nextRand(): number {
    // scramble a private 32‑bit state field
    this.randState ^= this.randState << 13;
    this.randState ^= this.randState >>> 17;
    this.randState ^= this.randState << 5;
    // convert to [0,1) float
    return (this.randState >>> 0) * 2.3283064365386963e-10;
  }

  private allocateParticleSlot(): number {
    const index = this.freeIndices.length > 0 ? this.freeIndices.pop()! : this.soa.count++;
    if (index >= this.soa.count) {
      this.soa.count = index + 1;
    }
    return index;
  }

  /** Ultra‑hot path for two small flame particles.
   *  – Avoids option parsing, random array indexing, extra trig, and object churn.
   *  – palette is a pre‑resolved array of THREE hex strings (r‑g‑b already cached). */
  emitPairFast(
    origin: { x: number; y: number },
    vx: number,
    vy: number,
    palette: readonly [string, string, string]
  ): void {
    const availableSlots = this.freeIndices.length + (MAX_PARTICLES - this.soa.count);
    if (availableSlots < 2) {
      return; // Not enough capacity to emit both particles
    }

    const r1 = this.nextRand();
    const r2 = this.nextRand();
    const r3 = this.nextRand();

    // Allocate indices safely
    const i0 = this.allocateParticleSlot();
    const i1 = this.allocateParticleSlot();

    if (i0 >= MAX_PARTICLES || i1 >= MAX_PARTICLES) return;

    // --- First Particle ---
    this.soa.x[i0] = origin.x;
    this.soa.y[i0] = origin.y;
    this.soa.vx[i0] = vx + (r1 - 0.5) * 20;
    this.soa.vy[i0] = vy + (r2 - 0.5) * 20;
    this.soa.size[i0] = (1.9 + r1) * PARTICLE_SCALE;
    this.soa.life[i0] = 0.09 + r2 * 0.06;
    this.soa.initialLife[i0] = this.soa.life[i0];
    this.soa.fadeOut[i0] = 1;
    this.soa.fadeMode[i0] = FADE_MODE_LINEAR;
    this.soa.renderAlpha[i0] = 1.0;
    this.soa.lightId[i0] = undefined;

    const c0 = palette[(this.randPtr = (this.randPtr + 1) % palette.length)];
    const rgb0 = hexToRgb(c0);
    this.soa.color[i0] = c0;
    this.soa.r[i0] = rgb0.r;
    this.soa.g[i0] = rgb0.g;
    this.soa.b[i0] = rgb0.b;

    // --- Second Particle ---
    this.soa.x[i1] = origin.x;
    this.soa.y[i1] = origin.y;
    this.soa.vx[i1] = vx + (r2 - 0.5) * 20;
    this.soa.vy[i1] = vy + (r3 - 0.5) * 20;
    this.soa.size[i1] = (1.2 + r3) * PARTICLE_SCALE;
    this.soa.life[i1] = 0.08 + r1 * 0.05;
    this.soa.initialLife[i1] = this.soa.life[i1];
    this.soa.fadeOut[i1] = 1;
    this.soa.fadeMode[i1] = FADE_MODE_LINEAR;
    this.soa.renderAlpha[i1] = 1.0;
    this.soa.lightId[i1] = undefined;

    const c1 = palette[(this.randPtr = (this.randPtr + 1) % palette.length)];
    const rgb1 = hexToRgb(c1);
    this.soa.color[i1] = c1;
    this.soa.r[i1] = rgb1.r;
    this.soa.g[i1] = rgb1.g;
    this.soa.b[i1] = rgb1.b;
  }

  // == Public Mutators

  /**
   * Kill a particle by its handle.
   * No allocations, constant‑time.
   * If the handle is invalid or already gone, this is a no‑op.
   *
   * @param handle – the value returned from emitParticleWithHandle(...)
   */
  public killParticle(handle: number): void {
    // Look up the SOA index
    const idx = this.handleToIndex.get(handle);
    if (idx == null || idx < 0) {
      return; // invalid or already removed
    }

    // Delegate to existing removal path.
    this.removeParticle(idx);
  }

  /**
   * Sets the size of a particle by handle.
   * No effect if the handle is invalid or the particle has been recycled.
   *
   * @param handle – The particle handle returned from emitParticleWithHandle(...)
   * @param newSize – The new size to assign (will be scaled by PARTICLE_SCALE internally if needed)
   */
  public setParticleSize(handle: number, newSize: number): void {
    const index = this.handleToIndex.get(handle);
    if (index == null || index < 0 || index >= this.soa.count) {
      return; // Invalid or dead handle
    }

    this.soa.size[index] = newSize;
  }

  /**
   * Sets the velocity of a particle by handle.
   * No effect if the handle is invalid or refers to a recycled particle.
   *
   * @param handle – The particle handle returned from emitParticleWithHandle(...)
   * @param vx – New velocity in the X direction
   * @param vy – New velocity in the Y direction
   */
  public setParticleVelocity(handle: number, vx: number, vy: number): void {
    const index = this.handleToIndex.get(handle);
    if (index == null || index < 0 || index >= this.soa.count) {
      return; // Invalid or stale handle
    }

    this.soa.vx[index] = vx;
    this.soa.vy[index] = vy;
  }

  /**
   * Sets the position of a particle by handle.
   * No effect if the handle is invalid or the particle has already been recycled.
   *
   * @param handle – The particle handle returned from emitParticleWithHandle(...)
   * @param x – New X coordinate
   * @param y – New Y coordinate
   */
  public setParticlePosition(handle: number, x: number, y: number): void {
    const index = this.handleToIndex.get(handle);
    if (index == null || index < 0 || index >= this.soa.count) {
      return; // Invalid or expired handle
    }

    this.soa.x[index] = x;
    this.soa.y[index] = y;
  }

  /**
   * Extends the life of a particle by a delta (in seconds).
   * Updates both `life` and `initialLife` to preserve consistent fading behavior.
   * No effect if the handle is invalid or the particle is no longer active.
   *
   * @param handle – The particle handle returned from emitParticleWithHandle(...)
   * @param delta – Amount of time (seconds) to add to the particle’s lifetime
   */
  public extendParticleLife(handle: number, delta: number): void {
    const index = this.handleToIndex.get(handle);
    if (index == null || index < 0 || index >= this.soa.count) {
      return; // Invalid or dead handle
    }

    this.soa.life[index] += delta;
    this.soa.initialLife[index] += delta;
  }
}