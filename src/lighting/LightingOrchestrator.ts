// src/lighting/LightingOrchestrator.ts

import type { Camera } from '@/core/Camera';
import { hexToRgb } from '@/shared/colorUtils';
import type { PointLightInstance } from '@/lighting/lights/types';
import { MAX_LIGHTS, createSOABuffer, type LightSOA } from '@/lighting/interfaces/LightSOA';
import { LightAnimatorSystem } from '@/lighting/LightingAnimatorSystem';

let nextLightId = 0;
let _instance: LightingOrchestrator | null = null;

export const MAXIMUM_LIGHTS_PER_TAG = 8;

/**
 * Central controller for active point lights (SOA-driven).
 * Manages allocation, lifecycle, spatial culling, and tag-based caps.
 *
 * Immediate refactors applied:
 * - Removed free-list (buffer remains dense via swap-with-last).
 * - Replaced scratch array with scalar swaps to keep numeric paths monomorphic.
 * - Fixed truthiness checks for id==0 to use nullish checks.
 * - Made tag-set pooling safe (no aliasing); lazily allocate sets.
 * - Avoid per-call object allocation in collectVisibleLights by returning a stable view.
 * - Minor micro-opts on bounds copying.
 */
export class LightingOrchestrator {
  private readonly soa = createSOABuffer(MAX_LIGHTS);
  private animator: LightAnimatorSystem;

  // Visibility working set
  private readonly visibleIndices = new Uint16Array(MAX_LIGHTS);
  private visibleCount = 0;
  private readonly visibleView: { soa: LightSOA; indices: Uint16Array; count: number };

  // Lookup
  private readonly idToIndex = new Map<number, number>();

  // Tag management (string tag → set of indices)
  private readonly tagSetPool: Set<number>[] = [];
  private readonly tagMap: Map<string, Set<number>> = new Map();

  // Culling cache
  private lastCameraBounds: { x: number; y: number; width: number; height: number } | null = null;
  private lightsDirty = true;

  private constructor() {
    this.animator = new LightAnimatorSystem(this.soa, this.idToIndex);
    this.visibleView = { soa: this.soa, indices: this.visibleIndices, count: 0 };
  }

  public static getInstance(): LightingOrchestrator {
    if (!_instance) _instance = new LightingOrchestrator();
    return _instance;
  }

  public static hasInstance(): boolean {
    return !!_instance;
  }

  /** Exposes the SOA buffer directly for consumption by LightingPass. */
  public getLightSOA(): LightSOA {
    return this.soa;
  }

  /** Exposes Lighting Animator */
  public getAnimator(): LightAnimatorSystem | null {
    return this.animator;
  }

  /** Allocate next dense slot; buffer is kept compact via swap-with-last on removal. */
  private allocateLightIndex(): number {
    return this.soa.count < MAX_LIGHTS ? this.soa.count++ : -1;
  }

  public registerLight(light: PointLightInstance): number | null {
    // Assign ID if not provided
    if (light.id == null || light.id < 0) {
      light.id = nextLightId++;
    }

    // Enforce per-tag cap before allocating a slot
    if (light.tag) {
      let set = this.tagMap.get(light.tag);
      if (!set) {
        set = this.getPooledTagSet();
        this.tagMap.set(light.tag, set);
      } else if (set.size >= MAXIMUM_LIGHTS_PER_TAG) {
        return null; // Cap reached — reject
      }
    }

    const index = this.allocateLightIndex();
    if (index === -1) return null; // No space left — reject

    // Precompute RGB channels
    const { r, g, b } = hexToRgb(light.color);

    // Write fields into SOA
    this.soa.x[index] = light.x;
    this.soa.y[index] = light.y;
    this.soa.radius[index] = light.radius;
    this.soa.r[index] = r;
    this.soa.g[index] = g;
    this.soa.b[index] = b;
    this.soa.intensity[index] = light.intensity;
    this.soa.initialIntensity[index] = light.intensity;
    this.soa.initialRadius[index] = light.radius;
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
    if (index == null || index < 0 || index >= this.soa.count) return;
    this.recycleLight(index);
  }

  /** Swap all fields between two indices using scalar temps (no mixed-kind arrays). */
  private swapLight(i: number, j: number): void {
    if (i === j) return;
    const s = this.soa;
    let t: number;

    // Numeric typed arrays
    t = s.x[i]; s.x[i] = s.x[j]; s.x[j] = t;
    t = s.y[i]; s.y[i] = s.y[j]; s.y[j] = t;
    t = s.radius[i]; s.radius[i] = s.radius[j]; s.radius[j] = t;
    t = s.r[i]; s.r[i] = s.r[j]; s.r[j] = t;
    t = s.g[i]; s.g[i] = s.g[j]; s.g[j] = t;
    t = s.b[i]; s.b[i] = s.b[j]; s.b[j] = t;
    t = s.intensity[i]; s.intensity[i] = s.intensity[j]; s.intensity[j] = t;
    t = s.initialIntensity[i]; s.initialIntensity[i] = s.initialIntensity[j]; s.initialIntensity[j] = t;
    t = s.initialRadius[i]; s.initialRadius[i] = s.initialRadius[j]; s.initialRadius[j] = t;
    t = s.life[i]; s.life[i] = s.life[j]; s.life[j] = t;
    t = s.initialLife[i]; s.initialLife[i] = s.initialLife[j]; s.initialLife[j] = t;
    t = s.fadeMode[i]; s.fadeMode[i] = s.fadeMode[j]; s.fadeMode[j] = t;
    t = s.animationPhase[i]; s.animationPhase[i] = s.animationPhase[j]; s.animationPhase[j] = t;

    // String / meta arrays kept separate
    const idI = s.id[i]; s.id[i] = s.id[j]; s.id[j] = idI;
    const tagI = s.tag[i]; s.tag[i] = s.tag[j]; s.tag[j] = tagI;
    const hexI = s.colorHex[i]; s.colorHex[i] = s.colorHex[j]; s.colorHex[j] = hexI;
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

  // Safe pooled Set creation; never alias an in-use set.
  private getPooledTagSet(): Set<number> {
    const s = this.tagSetPool.pop();
    return s ?? new Set<number>();
  }

  private releaseTagSet(set: Set<number>): void {
    set.clear();
    this.tagSetPool.push(set);
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
          continue;              // Re-check swapped index now at i
        }

        // Update animationPhase based on fade mode
        const lifeInit = this.soa.initialLife[i];
        const lifeRatio = lifeInit ? (this.soa.life[i] / lifeInit) : 1.0;

        this.soa.animationPhase[i] = this.soa.fadeMode[i] === 1 // 1 = delayed
          ? (lifeRatio >= fadeThreshold ? 1.0 : lifeRatio * invFadeThreshold)
          : lifeRatio;
      }

      i++;
    }

    this.animator.update(dt);
  }

  public collectVisibleLights(camera: Camera): { soa: LightSOA; indices: Uint16Array; count: number } {
    const bounds = camera.getViewportBounds();
    const b0 = this.lastCameraBounds;
    const boundsChanged =
      !b0 ||
      bounds.x !== b0.x ||
      bounds.y !== b0.y ||
      bounds.width !== b0.width ||
      bounds.height !== b0.height;

    if (!this.lightsDirty && !boundsChanged) {
      this.visibleView.count = this.visibleCount;
      return this.visibleView;
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

    if (!this.lastCameraBounds) {
      this.lastCameraBounds = { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
    } else {
      this.lastCameraBounds.x = bounds.x;
      this.lastCameraBounds.y = bounds.y;
      this.lastCameraBounds.width = bounds.width;
      this.lastCameraBounds.height = bounds.height;
    }

    this.lightsDirty = false;
    this.visibleView.count = this.visibleCount;
    return this.visibleView;
  }

  getLightCount(): number {
    return this.soa.count;
  }

  setLightsDirty(): void {
    this.lightsDirty = true;
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

    // tag/id are immutable post-creation
    this.lightsDirty = true;
  }

  turnOffLight(id: number): void {
    this.updateLight(id, { intensity: 0 });
  }

  turnOnLight(id: number): void {
    const index = this.idToIndex.get(id);
    if (index == null) return;
    this.updateLight(id, {
      intensity: this.soa.initialIntensity[index],
      radius: this.soa.initialRadius[index],
    });
  }

  private recycleLight(index: number): void {
    const id = this.soa.id[index];
    if (id != null) this.idToIndex.delete(id);

    this.removeTagAssociation(index);

    const lastIndex = this.soa.count - 1;
    if (index !== lastIndex) {
      this.swapLight(index, lastIndex);

      // Fix mapping for swapped light
      const swappedId = this.soa.id[index];
      if (swappedId != null) this.idToIndex.set(swappedId, index);

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
    const deadId = this.soa.id[lastIndex];
    if (deadId != null) this.idToIndex.delete(deadId);

    this.soa.id[lastIndex] = undefined as any;
    this.soa.tag[lastIndex] = undefined as any;

    this.soa.count--;
    this.lightsDirty = true;
  }

  // == Cleanup

  clear(): void {
    // Clean up tag associations for all active lights
    for (let i = 0; i < this.soa.count; i++) {
      this.removeTagAssociation(i);
    }

    // Reset SOA count
    this.soa.count = 0;

    // Pool and clear all tag sets
    for (const set of this.tagMap.values()) {
      this.releaseTagSet(set);
    }
    this.tagMap.clear();

    this.visibleCount = 0;
    this.lightsDirty = true;

    this.animator.clear();
  }

  destroy(): void {
    if (_instance !== this) return;

    // Reset counts
    this.soa.count = 0;

    // Zero-out the SOA slots (optional but safest)
    this.soa.x.fill(0);
    this.soa.y.fill(0);
    this.soa.radius.fill(0);
    this.soa.r.fill(0);
    this.soa.g.fill(0);
    this.soa.b.fill(0);
    this.soa.intensity.fill(0);
    this.soa.initialIntensity.fill(0);
    this.soa.initialRadius.fill(0);
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
    this.idToIndex.clear();

    // Clear tag associations and pools
    for (const set of this.tagMap.values()) {
      this.releaseTagSet(set);
    }
    this.tagMap.clear();

    this.lastCameraBounds = null;
    this.lightsDirty = true;

    // Reset global IDs and singleton
    _instance = null;
    nextLightId = 0;
  }
}
