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
  private readonly visibleIndices = new Uint16Array(MAX_LIGHTS);
  private visibleCount = 0;
  private readonly freeIndices: number[] = [];
  private readonly idToIndex = new Map<number, number>();  // for stable lookup by ID

  private readonly tagMap: Map<string, Set<number>> = new Map(); // tag -> SOA indices
  private readonly tagSetPool: Set<number>[] = [];

  private lastCameraBounds: { x: number; y: number; width: number; height: number } | null = null;
  private lightsDirty = true;

  private constructor() {}

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
        set = this.tagSetPool.pop() ?? new Set();
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
      set?.delete(index);
      if (set && set.size === 0) {
        this.tagMap.delete(tag);
        this.tagSetPool.push(set);
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
    const soa = this.soa;
    let tmp: any;

    tmp = soa.x[i]; soa.x[i] = soa.x[j]; soa.x[j] = tmp;
    tmp = soa.y[i]; soa.y[i] = soa.y[j]; soa.y[j] = tmp;
    tmp = soa.radius[i]; soa.radius[i] = soa.radius[j]; soa.radius[j] = tmp;
    tmp = soa.r[i]; soa.r[i] = soa.r[j]; soa.r[j] = tmp;
    tmp = soa.g[i]; soa.g[i] = soa.g[j]; soa.g[j] = tmp;
    tmp = soa.b[i]; soa.b[i] = soa.b[j]; soa.b[j] = tmp;
    tmp = soa.intensity[i]; soa.intensity[i] = soa.intensity[j]; soa.intensity[j] = tmp;
    tmp = soa.life[i]; soa.life[i] = soa.life[j]; soa.life[j] = tmp;
    tmp = soa.initialLife[i]; soa.initialLife[i] = soa.initialLife[j]; soa.initialLife[j] = tmp;
    tmp = soa.fadeMode[i]; soa.fadeMode[i] = soa.fadeMode[j]; soa.fadeMode[j] = tmp;
    tmp = soa.animationPhase[i]; soa.animationPhase[i] = soa.animationPhase[j]; soa.animationPhase[j] = tmp;
    tmp = soa.id[i]; soa.id[i] = soa.id[j]; soa.id[j] = tmp;
    tmp = soa.tag[i]; soa.tag[i] = soa.tag[j]; soa.tag[j] = tmp;
    tmp = soa.colorHex[i]; soa.colorHex[i] = soa.colorHex[j]; soa.colorHex[j] = tmp;
  }

  public getTagLightCount(tag: string): number {
    const set = this.tagMap.get(tag);
    return set ? set.size : 0;
  }

  private removeTagAssociation(index: number): void {
    const tag = this.soa.tag[index];
    if (!tag) return;

    const set = this.tagMap.get(tag);
    set?.delete(index);
    if (set && set.size === 0) {
      this.tagMap.delete(tag);
      this.tagSetPool.push(set);
    }
  }

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
      set.clear();
      this.tagSetPool.push(set);
    }
    this.tagMap.clear();

    this.lightsDirty = true;
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

  getLightById(id: number): PointLightInstance | undefined {
    const index = this.idToIndex.get(id);
    if (index == null) return undefined;

    return {
      id: this.soa.id[index]!,
      x: this.soa.x[index],
      y: this.soa.y[index],
      radius: this.soa.radius[index],
      color: this.soa.colorHex[index] ?? '#ffffff',  // direct lookup
      intensity: this.soa.intensity[index],
      life: this.soa.life[index],
      maxLife: this.soa.initialLife[index],
      fadeMode: this.soa.fadeMode[index] === 1 ? 'delayed' : 'linear',
      animationPhase: this.soa.animationPhase[index],
      type: 'point',
      tag: this.soa.tag[index]
    };
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
      set.clear();
      this.tagSetPool.push(set);
    }
    this.tagMap.clear();

    this.lastCameraBounds = null;
    this.lightsDirty = true;

    // Reset global IDs and singleton
    _instance = null;
    nextLightId = 0;
  }
}
