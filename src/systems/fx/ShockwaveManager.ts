// ────────────────────────────────────────────────────────────────────────────────
// src/systems/fx/ShockwaveManager.ts
// SOA-based manager for procedural radial shockwave distortions
// Projects world-space shockwaves into screen-space using view-projection matrix
// Integrates with ShockwavePass for GPU-rendered screen-space displacement
// ────────────────────────────────────────────────────────────────────────────────

import { GlobalEventBus } from '@/core/EventBus';
import { Camera } from '@/core/Camera';

export interface ShockwaveSOA {
  count: number;
  x: Float32Array; // world-space X
  y: Float32Array; // world-space Y
  startRadius: Float32Array;
  size: Float32Array;
  strength: Float32Array;
  initialStrength: Float32Array; // Initial strength, for scaling over lifetime
  age: Float32Array;
  life: Float32Array;
}

export interface ShockwaveOptions {
  x: number;              // World-space center X
  y: number;              // World-space center Y
  size?: number;          // Width of the wavefront
  strength?: number;      // Displacement intensity
  life?: number;          // Total lifespan (seconds)
  startRadius?: number;   // Optional initial radius (typically 0)
}

const MAX_SHOCKWAVES = 32;

function createShockwaveSOA(max: number): ShockwaveSOA {
  return {
    count: 0,
    x: new Float32Array(max),
    y: new Float32Array(max),
    startRadius: new Float32Array(max),
    size: new Float32Array(max),
    strength: new Float32Array(max),
    initialStrength: new Float32Array(max),
    age: new Float32Array(max),
    life: new Float32Array(max),
  };
}

export class ShockwaveManager {
  private readonly soa: ShockwaveSOA;
  private readonly freeIndices: number[] = [];

  private camera: Camera;

  private readonly onShockwaveEmit: (payload: any) => void;

  constructor() {
    this.soa = createShockwaveSOA(MAX_SHOCKWAVES);
    this.camera = Camera.getInstance();

    this.onShockwaveEmit = (payload: ShockwaveOptions) => this.emitShockwave(payload);
    GlobalEventBus.on('fx:shockwave:emit', this.onShockwaveEmit);
  }

  /** Creates a new shockwave and returns its index. */
  emitShockwave(options: ShockwaveOptions): number {
    const idx = this.allocateIndex();
    if (idx === -1) return -1;

    const {
      x, y,
      startRadius = 0,
      size = 128,
      strength = 0.015,
      life = 1.0,
    } = options;

    this.soa.x[idx] = x;
    this.soa.y[idx] = y;
    this.soa.startRadius[idx] = startRadius;
    this.soa.size[idx] = size;
    this.soa.strength[idx] = strength;
    this.soa.initialStrength[idx] = strength;
    this.soa.age[idx] = 0;
    this.soa.life[idx] = life;

    return idx;
  }


  /** Updates shockwave lifespans. Call once per frame. */
  update(dt: number): void {
    for (let i = 0; i < this.soa.count;) {
      this.soa.age[i] += dt;

      const t = this.soa.age[i] / this.soa.life[i];
      const clampedT = Math.min(t, 1.0); // Prevent overshoot

      // Linear fade-out: strength decreases proportionally over time
      this.soa.strength[i] = this.soa.initialStrength[i] * (1.0 - clampedT);

      if (this.soa.age[i] >= this.soa.life[i]) {
        this.recycleIndex(i);
        continue;
      }

      i++;
    }
  }

  /** Returns the screen-space SOA (UV coordinates) for GPU rendering. */
  getSOA(): ShockwaveSOA {
    return this.soa;
  }

  /** Destroys all listeners and resets internal state. */
  destroy(): void {
    GlobalEventBus.off('fx:shockwave:emit', this.onShockwaveEmit);
    this.clear();
  }

  /** Removes all current shockwaves. */
  clear(): void {
    this.soa.count = 0;
    this.freeIndices.length = 0;
  }

  private allocateIndex(): number {
    if (this.freeIndices.length > 0) {
      const idx = this.freeIndices.pop()!;
      if (idx >= this.soa.count) this.soa.count = idx + 1;
      return idx;
    }
    if (this.soa.count >= MAX_SHOCKWAVES) return -1;
    return this.soa.count++;
  }

  private recycleIndex(index: number): void {
    const last = this.soa.count - 1;
    if (index !== last) this.swap(index, last);
    this.freeIndices.push(last);
    this.soa.count--;
  }

  private swap(i: number, j: number): void {
    const swapf = (a: Float32Array) => {
      const tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    };

    swapf(this.soa.x);
    swapf(this.soa.y);
    swapf(this.soa.startRadius);
    swapf(this.soa.size);
    swapf(this.soa.strength);
    swapf(this.soa.initialStrength);
    swapf(this.soa.age);
    swapf(this.soa.life);
  }
}
