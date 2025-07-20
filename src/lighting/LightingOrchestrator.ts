// src/lighting/LightingOrchestrator.ts

import type { Camera } from '@/core/Camera';
import { hexToRgb } from '@/shared/colorUtils';
import type { PointLightInstance } from './lights/types';
import { MAX_LIGHTS, createSOABuffer, type LightSOA } from './interfaces/LightSOA';

let nextLightId = 0;
let _instance: LightingOrchestrator | null = null;

export const MAXIMUM_LIGHTS_PER_TAG = 8;

/**
 * Central controller for active point lights (SOA-driven).
 * Manages allocation, lifecycle, spatial culling, and tag-based caps.
 */
export class LightingOrchestrator {
  private readonly soa = createSOABuffer(MAX_LIGHTS);

  private readonly scratchValues: any[] = new Array(14);  // one slot per field

  private readonly visibleIndices = new Uint16Array(MAX_LIGHTS);
  private visibleCount = 0;

  private readonly freeIndices: number[] = [];
  private readonly idToIndex = new Map<number, number>();  // for stable lookup by ID

  private static readonly TAG_SET_POOL_SIZE = 1024;
  private readonly tagSetPool: Set<number>[] = [];
  private readonly tagMap: Map<string, Set<number>> = new Map();

  private lastCameraBounds: { x: number; y: number; width: number; height: number } | null = null;
  private lightsDirty = true;

  private constructor() {
    // Preallocate pool of empty sets
    for (let i = 0; i < LightingOrchestrator.TAG_SET_POOL_SIZE; i++) {
      this.tagSetPool.push(new Set<number>());
    }
  
    this.scratchValues.fill(null);  // Keep packed array, avoid deopt
  }

  public static getInstance(): LightingOrchestrator {
    if (!_instance) {
      _instance = new LightingOrchestrator();
    }
    return _instance;
  }

  public static hasInstance(): boolean {
    return !!_instance;
  }

  /** Exposes the SOA buffer directly for consumption by LightingPass. */
  public getLightSOA(): LightSOA {
    return this.soa;
  }

  private allocateLightIndex(): number {
    if (this.freeIndices.length > 0) {
      const reused = this.freeIndices.pop()!;
      if (reused >= this.soa.count) {
        this.soa.count = reused + 1;
      }
      return reused;
    }
    if (this.soa.count >= MAX_LIGHTS) return -1;
    return this.soa.count++;
  }

  public registerLight(light: PointLightInstance): number | null {
    // Generate ID if not provided
    if (light.id == null || light.id < 0) {
      light.id = nextLightId++;
    }

    // Enforce per-tag cap before allocating a slot
    if (light.tag) {
      let set = this.tagMap.get(light.tag);
      if (!set) {
        set = this.getPooledTagSet();       // <-- use pooled set
        this.tagMap.set(light.tag, set);
      } else if (set.size >= MAXIMUM_LIGHTS_PER_TAG) {
        return null; // Cap reached — reject
      }
    }

    const index = this.allocateLightIndex();
    if (index === -1) {
      return null; // No space left — reject
    }

    // Precompute RGB channels for performance
    const { r, g, b } = hexToRgb(light.color);

    // Write fields into SOA
    this.soa.x[index] = light.x;
    this.soa.y[index] = light.y;
    this.soa.radius[index] = light.radius;
    this.soa.r[index] = r;
    this.soa.g[index] = g;
    this.soa.b[index] = b;
    this.soa.intensity[index] = light.intensity;
    this.soa.life[index] = light.life ?? 0;
    this.soa.initialLife[index] = light.maxLife ?? light.life ?? 0;
    this.soa.fadeMode[index] = light.fadeMode === 'delayed' ? 1 : 0;
    this.soa.animationPhase[index] = light.animationPhase ?? 1.0;

    this.soa.id[index] = light.id;
    this.soa.tag[index] = light.tag;
    this.soa.colorHex[index] = light.color;

    // Map ID → index for dynamic updates
    this.idToIndex.set(light.id, index);
    if (light.tag) {
      this.tagMap.get(light.tag)!.add(index);
    }

    this.lightsDirty = true;
    return light.id;
  }

  public removeLight(id: number): void {
    const index = this.idToIndex.get(id);
    if (index == null || index < 0 || index >= this.soa.count) {
      return; // Already gone or invalid
    }

    const tag = this.soa.tag[index];
    if (tag) {
      const set = this.tagMap.get(tag);
      if (set) {
        set.delete(index);
        if (set.size === 0) {
          this.tagMap.delete(tag);
          this.releaseTagSet(set);  // <-- changed
        }
      }
    }

    // Swap-with-last removal to keep SOA tight
    const lastIndex = this.soa.count - 1;
    if (index !== lastIndex) {
      this.swapLight(index, lastIndex);

      // Update idToIndex for swapped element
      const swappedId = this.soa.id[index];
      if (swappedId) {
        this.idToIndex.set(swappedId, index);
      }

      // Fix tagMap for the swapped element
      const swappedTag = this.soa.tag[index];
      if (swappedTag) {
        const set = this.tagMap.get(swappedTag);
        if (set) {
          set.delete(lastIndex);
          set.add(index);
        }
      }
    }

    // Remove this light's ID mapping
    const deadId = this.soa.id[lastIndex];
    if (deadId) {
      this.idToIndex.delete(deadId);
    }

    this.freeIndices.push(lastIndex);
    this.soa.count--;

    // Clear dangling references
    this.soa.id[lastIndex] = undefined;
    this.soa.tag[lastIndex] = undefined;

    this.lightsDirty = true;
  }

  /** Swap all fields between two indices */
  private swapLight(i: number, j: number): void {
    const s = this.scratchValues;
    const soa = this.soa;

    // Snapshot all fields from i into scratch
    s[0]  = soa.x[i];          s[1]  = soa.y[i]; 
    s[2]  = soa.radius[i];     s[3]  = soa.r[i];
    s[4]  = soa.g[i];          s[5]  = soa.b[i];
    s[6]  = soa.intensity[i];  s[7]  = soa.life[i];
    s[8]  = soa.initialLife[i];s[9]  = soa.fadeMode[i];
    s[10] = soa.animationPhase[i]; s[11] = soa.id[i];
    s[12] = soa.tag[i];        s[13] = soa.colorHex[i];

    // Copy j → i
    soa.x[i] = soa.x[j];       soa.y[i] = soa.y[j];
    soa.radius[i] = soa.radius[j];
    soa.r[i] = soa.r[j];       soa.g[i] = soa.g[j]; soa.b[i] = soa.b[j];
    soa.intensity[i] = soa.intensity[j];
    soa.life[i] = soa.life[j]; soa.initialLife[i] = soa.initialLife[j];
    soa.fadeMode[i] = soa.fadeMode[j];
    soa.animationPhase[i] = soa.animationPhase[j];
    soa.id[i] = soa.id[j];     soa.tag[i] = soa.tag[j]; soa.colorHex[i] = soa.colorHex[j];

    // Copy scratch → j
    soa.x[j] = s[0];           soa.y[j] = s[1];
    soa.radius[j] = s[2];
    soa.r[j] = s[3];           soa.g[j] = s[4]; soa.b[j] = s[5];
    soa.intensity[j] = s[6];
    soa.life[j] = s[7];        soa.initialLife[j] = s[8];
    soa.fadeMode[j] = s[9];
    soa.animationPhase[j] = s[10];
    soa.id[j] = s[11];         soa.tag[j] = s[12]; soa.colorHex[j] = s[13];
  }

  // == Tag management ==

  public getTagLightCount(tag: string): number {
    const set = this.tagMap.get(tag);
    return set ? set.size : 0;
  }

  private removeTagAssociation(index: number): void {
    const tag = this.soa.tag[index];
    if (!tag) return;

    const set = this.tagMap.get(tag);
    if (!set) return;

    set.delete(index);
    if (set.size === 0) {
      this.tagMap.delete(tag);
      this.releaseTagSet(set);
    }
  }

  // When needing a set:
  private getPooledTagSet(): Set<number> {
    return this.tagSetPool.pop() ?? this.tagSetPool[0]; // fallback to reuse first
  }

  // When releasing:
  private releaseTagSet(set: Set<number>): void {
    set.clear();
    if (this.tagSetPool.length < LightingOrchestrator.TAG_SET_POOL_SIZE) {
      this.tagSetPool.push(set);
    }
  }

  update(dt: number): void {
    const fadeThreshold = 0.10;
    const invFadeThreshold = 1.0 / fadeThreshold;

    for (let i = 0; i < this.soa.count; ) {
      // Decrement life if the light has one
      if (this.soa.initialLife[i] > 0) {
        this.soa.life[i] -= dt;

        // Remove if expired
        if (this.soa.life[i] <= 0) {
          this.recycleLight(i);  // Swap-with-last removal
          continue;              // Skip increment (recheck swapped index)
        }

        // Update animationPhase based on fade mode
        const lifeRatio = this.soa.initialLife[i]
          ? this.soa.life[i] / this.soa.initialLife[i]
          : 1.0;

        this.soa.animationPhase[i] = this.soa.fadeMode[i] === 1 // 1 = delayed
          ? (lifeRatio >= fadeThreshold ? 1.0 : lifeRatio * invFadeThreshold)
          : lifeRatio;
      }

      i++;
    }
  }

  public collectVisibleLights(camera: Camera): { soa: LightSOA, indices: Uint16Array, count: number } {
    const bounds = camera.getViewportBounds();
    const boundsChanged =
      !this.lastCameraBounds ||
      bounds.x !== this.lastCameraBounds.x ||
      bounds.y !== this.lastCameraBounds.y ||
      bounds.width !== this.lastCameraBounds.width ||
      bounds.height !== this.lastCameraBounds.height;

    if (!this.lightsDirty && !boundsChanged) {
      return { soa: this.soa, indices: this.visibleIndices, count: this.visibleCount };
    }

    const left = bounds.x;
    const right = bounds.x + bounds.width;
    const top = bounds.y;
    const bottom = bounds.y + bounds.height;

    this.visibleCount = 0;
    for (let i = 0; i < this.soa.count; i++) {
      const x = this.soa.x[i];
      const y = this.soa.y[i];
      const radius = this.soa.radius[i];
      if (x + radius > left && x - radius < right &&
          y + radius > top  && y - radius < bottom) {
        this.visibleIndices[this.visibleCount++] = i;
      }
    }

    this.lastCameraBounds ??= { x: 0, y: 0, width: 0, height: 0 };
    Object.assign(this.lastCameraBounds, bounds);

    this.lightsDirty = false;
    return { soa: this.soa, indices: this.visibleIndices, count: this.visibleCount };
  }

  getLightCount(): number {
    return this.soa.count;
  }

  updateLight(id: number, updates: Partial<Omit<PointLightInstance, 'id' | 'type'>>): void {
    const index = this.idToIndex.get(id);
    if (index == null || index < 0 || index >= this.soa.count) return;

    if (updates.x !== undefined) this.soa.x[index] = updates.x;
    if (updates.y !== undefined) this.soa.y[index] = updates.y;
    if (updates.radius !== undefined) this.soa.radius[index] = updates.radius;
    if (updates.intensity !== undefined) this.soa.intensity[index] = updates.intensity;

    if (updates.color !== undefined) {
      this.soa.colorHex[index] = updates.color;
      const rgb = hexToRgb(updates.color);
      this.soa.r[index] = rgb.r;
      this.soa.g[index] = rgb.g;
      this.soa.b[index] = rgb.b;
    }

    if (updates.life !== undefined) this.soa.life[index] = updates.life;
    if (updates.maxLife !== undefined) this.soa.initialLife[index] = updates.maxLife;

    if (updates.fadeMode !== undefined) {
      this.soa.fadeMode[index] = updates.fadeMode === 'delayed' ? 1 : 0;
    }

    // We do *not* touch tag/id here—they're fixed at creation time.
    this.lightsDirty = true;
  }

  private recycleLight(index: number): void {
    const id = this.soa.id[index];
    if (id) this.idToIndex.delete(id);

    this.removeTagAssociation(index);

    const lastIndex = this.soa.count - 1;
    if (index !== lastIndex) {
      this.swapLight(index, lastIndex);

      // Fix mapping for swapped light
      const swappedId = this.soa.id[index];
      if (swappedId) {
        this.idToIndex.set(swappedId, index);
      }

      // Fix tagMap for the swapped light
      const swappedTag = this.soa.tag[index];
      if (swappedTag) {
        const set = this.tagMap.get(swappedTag);
        if (set) {
          set.delete(lastIndex);
          set.add(index);
        }
      }
    }

    // Clear old slot (at lastIndex)
    this.soa.id[lastIndex] = undefined;
    this.soa.tag[lastIndex] = undefined;

    this.freeIndices.push(lastIndex);
    this.soa.count--;

    this.lightsDirty = true;
  }

  // == Cleanup
  
  clear(): void {
    // Clean up tag associations for all active lights
    for (let i = 0; i < this.soa.count; i++) {
      this.removeTagAssociation(i);
    }

    // Reset SOA counts and free list
    this.soa.count = 0;
    this.freeIndices.length = 0;

    // Pool and clear all tag sets
    for (const set of this.tagMap.values()) {
      this.releaseTagSet(set);  // clears and returns to pool
    }
    this.tagMap.clear();

    this.lightsDirty = true;
  }

  destroy(): void {
    if (_instance !== this) return;

    // Reset counts
    this.soa.count = 0;

    // Zero-out the SOA slots (optional but safest)
    // Ensures no stale positions/colors if anything inspects beyond count.
    this.soa.x.fill(0);
    this.soa.y.fill(0);
    this.soa.radius.fill(0);
    this.soa.r.fill(0);
    this.soa.g.fill(0);
    this.soa.b.fill(0);
    this.soa.intensity.fill(0);
    this.soa.life.fill(0);
    this.soa.initialLife.fill(0);
    this.soa.fadeMode.fill(0);
    this.soa.animationPhase.fill(0);
    this.soa.id.fill(undefined as any);
    this.soa.tag.fill(undefined as any);
    this.soa.colorHex.fill(undefined as any);

    // Reset visible light state
    this.visibleCount = 0;
    this.visibleIndices.fill(0);

    // Reset bookkeeping
    this.freeIndices.length = 0;
    this.idToIndex.clear();

    // Clear tag associations and pools
    for (const set of this.tagMap.values()) {
      this.releaseTagSet(set);  // centralized pooling logic
    }
    this.tagMap.clear();

    this.lastCameraBounds = null;
    this.lightsDirty = true;

    // Reset global IDs and singleton
    _instance = null;
    nextLightId = 0;
  }
}
