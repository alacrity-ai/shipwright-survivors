// // src/lighting/LightingOrchestrator.ts

// import type { Camera } from '@/core/Camera';
// import type {
//   AnyLightInstance,
//   PointLightInstance,
// } from './lights/types';

// let nextLightId = 0;
// let _instance: LightingOrchestrator | null = null;

// export const MAXIMUM_LIGHTS_PER_TAG = 10;

// /**
//  * Central controller for active light instances.
//  * Handles registration, lifecycle management, spatial culling, and pooling.
//  */
// export class LightingOrchestrator {
//   private lights = new Map<string, AnyLightInstance>();
//   private lightPool: PointLightInstance[] = [];

//   private tagMap: Map<string, Set<string>> = new Map();

//   private cachedVisibleLights: AnyLightInstance[] = [];
//   private lastCameraBounds: { x: number; y: number; width: number; height: number } | null = null;
//   private lightsDirty = true;

//   private constructor() {}

//   public static getInstance(): LightingOrchestrator {
//     if (!_instance) {
//       _instance = new LightingOrchestrator();
//     }
//     return _instance;
//   }

//   public static hasInstance(): boolean {
//     return !!_instance;
//   }

//   registerLight(light: AnyLightInstance): void {
//     if (!light.id) light.id = `light_${nextLightId++}`;

//     // Enforce tag-based cap
//     if (light.tag) {
//       let set = this.tagMap.get(light.tag);
//       if (!set) {
//         set = new Set();
//         this.tagMap.set(light.tag, set);
//       } else if (set.size >= MAXIMUM_LIGHTS_PER_TAG) {
//         return; // Cap reached — silently ignore
//       }
//       set.add(light.id);
//     }

//     this.lights.set(light.id, light);
//     this.lightsDirty = true;
//   }

//   removeLight(id: string): void {
//     const light = this.lights.get(id);
//     if (light) {
//       this.recycleLight(light);

//       // Remove from tag map
//       if (light.tag) {
//         const set = this.tagMap.get(light.tag);
//         set?.delete(id);
//         if (set?.size === 0) this.tagMap.delete(light.tag);
//       }
//     }

//     this.lights.delete(id);
//     this.lightsDirty = true;
//   }

//   public getTagLightCount(tag: string): number {
//     const set = this.tagMap.get(tag);
//     return set ? set.size : 0;
//   }

//   private removeTagAssociation(light: AnyLightInstance): void {
//     if (!light.tag) return;
//     const set = this.tagMap.get(light.tag);
//     set?.delete(light.id);
//     if (set?.size === 0) {
//       this.tagMap.delete(light.tag);
//     }
//   }

//   clear(): void {
//     for (const light of this.lights.values()) {
//       this.recycleLight(light);
//     }
//     this.lights.clear();
//     this.tagMap.clear();
//     this.lightsDirty = true;
//   }

//   update(dt: number): void {
//     for (const [id, light] of this.lights) {
//       if (light.life !== undefined && light.maxLife !== undefined) {
//         light.life -= dt;
//         if (light.expires && light.life <= 0) {
//           this.removeTagAssociation(light);
//           this.recycleLight(light);
//           this.lights.delete(id);
//           this.lightsDirty = true;
//           continue;
//         }

//         const ratio = Math.max(0, light.life / light.maxLife);
//         if (light.fadeMode === 'delayed') {
//           const fadeThreshold = 0.10;
//           light.animationPhase = ratio >= fadeThreshold
//             ? 1.0
//             : ratio / fadeThreshold;
//         } else {
//           light.animationPhase = ratio;
//         }
//       }

//       // Optional: insert per-frame animation logic here
//     }
//   }


//   /**
//    * Computes or returns memoized list of visible lights within the camera viewport.
//    */
//   collectVisibleLights(camera: Camera): AnyLightInstance[] {
//     const bounds = camera.getViewportBounds();

//     const boundsChanged =
//       !this.lastCameraBounds ||
//       bounds.x !== this.lastCameraBounds.x ||
//       bounds.y !== this.lastCameraBounds.y ||
//       bounds.width !== this.lastCameraBounds.width ||
//       bounds.height !== this.lastCameraBounds.height;

//     if (!this.lightsDirty && !boundsChanged) {
//       return this.cachedVisibleLights;
//     }

//     const left = bounds.x;
//     const right = bounds.x + bounds.width;
//     const top = bounds.y;
//     const bottom = bounds.y + bounds.height;

//     this.cachedVisibleLights = Array.from(this.lights.values()).filter(light => {
//       switch (light.type) {
//         case 'directional':
//           return true;
//         case 'point':
//         case 'spot': {
//           const { x, y, radius } = light;
//           return (
//             x + radius > left &&
//             x - radius < right &&
//             y + radius > top &&
//             y - radius < bottom
//           );
//         }
//         default:
//           return true;
//       }
//     });

//     this.lastCameraBounds = bounds;
//     this.lightsDirty = false;

//     return this.cachedVisibleLights;
//   }

//   getLightCount(): number {
//     return this.lights.size;
//   }

//   getActiveLights(): AnyLightInstance[] {
//     return Array.from(this.lights.values());
//   }

//   getActiveLightEntries(): [string, AnyLightInstance][] {
//     return Array.from(this.lights.entries());
//   }

//   getLightById(id: string): AnyLightInstance | undefined {
//     return this.lights.get(id);
//   }

//   getPooledLight(): PointLightInstance {
//     const light = this.lightPool.pop() ?? {
//       id: '',
//       x: 0,
//       y: 0,
//       radius: 32,
//       color: '#ffffff',
//       intensity: 1,
//       type: 'point',
//     };
//     return light;
//   }

//   updateLight(
//     id: string,
//     updates: Partial<Omit<PointLightInstance, 'id' | 'type'>>
//   ): void {
//     const light = this.lights.get(id);
//     if (!light || light.type !== 'point') return;

//     Object.assign(light, updates);
//     this.lightsDirty = true;
//   }

//   private recycleLight(light: AnyLightInstance): void {
//     if (this.isPoolableLight(light)) {
//       light.id = '';
//       light.life = undefined;
//       light.maxLife = undefined;
//       light.animationPhase = undefined;
//       light.tag = undefined;
//       this.lightPool.push(light);
//     }
//   }

//   private isPoolableLight(light: AnyLightInstance): light is PointLightInstance {
//     return light.type === 'point';
//   }

//   destroy(): void {
//     if (_instance !== this) return;

//     this.clear();

//     this.lightPool.forEach(light => {
//       light.id = '';
//       light.life = undefined;
//       light.maxLife = undefined;
//       light.animationPhase = undefined;
//     });

//     this.lightPool.length = 0;
//     this.cachedVisibleLights.length = 0;
//     this.lastCameraBounds = null;

//     _instance = null;
//     nextLightId = 0;
//   }
// }

import type { Camera } from '@/core/Camera';
import type {
  AnyLightInstance,
  PointLightInstance,
} from './lights/types';

let nextLightId = 0;
let _instance: LightingOrchestrator | null = null;

export const MAXIMUM_LIGHTS_PER_TAG = 10;

/**
 * Central controller for active light instances.
 * Handles registration, lifecycle management, spatial culling, and pooling.
 */
export class LightingOrchestrator {
  private lights = new Map<string, AnyLightInstance>();
  private lightPool: PointLightInstance[] = [];

  private tagMap: Map<string, Set<string>> = new Map();
  private tagSetPool: Set<string>[] = [];

  private cachedVisibleLights: AnyLightInstance[] = [];
  private visibleLightsScratch: AnyLightInstance[] = [];

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

  registerLight(light: AnyLightInstance): void {
    if (!light.id) light.id = `light_${nextLightId++}`;

    // Enforce tag-based cap
    if (light.tag) {
      let set = this.tagMap.get(light.tag);
      if (!set) {
        set = this.tagSetPool.pop() ?? new Set();
        this.tagMap.set(light.tag, set);
      } else if (set.size >= MAXIMUM_LIGHTS_PER_TAG) {
        return; // Cap reached — silently ignore
      }
      set.add(light.id);
    }

    this.lights.set(light.id, light);
    this.lightsDirty = true;
  }

  removeLight(id: string): void {
    const light = this.lights.get(id);
    if (light) {
      this.recycleLight(light);

      // Remove from tag map
      if (light.tag) {
        const set = this.tagMap.get(light.tag);
        set?.delete(id);
        if (set && set.size === 0) {
          this.tagMap.delete(light.tag);
          this.tagSetPool.push(set); // Pool the emptied set
        }
      }
    }

    this.lights.delete(id);
    this.lightsDirty = true;
  }

  public getTagLightCount(tag: string): number {
    const set = this.tagMap.get(tag);
    return set ? set.size : 0;
  }

  private removeTagAssociation(light: AnyLightInstance): void {
    if (!light.tag) return;
    const set = this.tagMap.get(light.tag);
    set?.delete(light.id);
    if (set && set.size === 0) {
      this.tagMap.delete(light.tag);
      this.tagSetPool.push(set);
    }
  }

  clear(): void {
    for (const light of this.lights.values()) {
      this.recycleLight(light);
    }
    this.lights.clear();

    for (const set of this.tagMap.values()) {
      set.clear();
      this.tagSetPool.push(set);
    }

    this.tagMap.clear();
    this.lightsDirty = true;
  }

  update(dt: number): void {
    for (const [id, light] of this.lights) {
      if (light.life !== undefined && light.maxLife !== undefined) {
        light.life -= dt;
        if (light.expires && light.life <= 0) {
          this.removeTagAssociation(light);
          this.recycleLight(light);
          this.lights.delete(id);
          this.lightsDirty = true;
          continue;
        }

        const ratio = Math.max(0, light.life / light.maxLife);
        if (light.fadeMode === 'delayed') {
          const fadeThreshold = 0.10;
          light.animationPhase = ratio >= fadeThreshold
            ? 1.0
            : ratio / fadeThreshold;
        } else {
          light.animationPhase = ratio;
        }
      }
    }
  }

  collectVisibleLights(camera: Camera): AnyLightInstance[] {
    const bounds = camera.getViewportBounds();

    const boundsChanged =
      !this.lastCameraBounds ||
      bounds.x !== this.lastCameraBounds.x ||
      bounds.y !== this.lastCameraBounds.y ||
      bounds.width !== this.lastCameraBounds.width ||
      bounds.height !== this.lastCameraBounds.height;

    if (!this.lightsDirty && !boundsChanged) {
      return this.cachedVisibleLights;
    }

    const left = bounds.x;
    const right = bounds.x + bounds.width;
    const top = bounds.y;
    const bottom = bounds.y + bounds.height;

    const visible = this.visibleLightsScratch;
    visible.length = 0;

    for (const light of this.lights.values()) {
      switch (light.type) {
        case 'directional':
          visible.push(light);
          break;
        case 'point':
        case 'spot': {
          const { x, y, radius } = light;
          if (
            x + radius > left &&
            x - radius < right &&
            y + radius > top &&
            y - radius < bottom
          ) {
            visible.push(light);
          }
          break;
        }
        default:
          visible.push(light);
          break;
      }
    }

    this.cachedVisibleLights = visible.slice(); // safe return
    this.lastCameraBounds = this.lastCameraBounds || { x: 0, y: 0, width: 0, height: 0 };
    Object.assign(this.lastCameraBounds, bounds);
    this.lightsDirty = false;
    return this.cachedVisibleLights;
  }

  getLightCount(): number {
    return this.lights.size;
  }

  getActiveLights(): AnyLightInstance[] {
    return Array.from(this.lights.values());
  }

  getActiveLightEntries(): [string, AnyLightInstance][] {
    return Array.from(this.lights.entries());
  }

  getLightById(id: string): AnyLightInstance | undefined {
    return this.lights.get(id);
  }

  getPooledLight(): PointLightInstance {
    const light = this.lightPool.pop() ?? {
      id: '',
      x: 0,
      y: 0,
      radius: 32,
      color: '#ffffff',
      intensity: 1,
      type: 'point',
    };
    return light;
  }

  updateLight(
    id: string,
    updates: Partial<Omit<PointLightInstance, 'id' | 'type'>>
  ): void {
    const light = this.lights.get(id);
    if (!light || light.type !== 'point') return;

    Object.assign(light, updates);
    this.lightsDirty = true;
  }

  private recycleLight(light: AnyLightInstance): void {
    if (this.isPoolableLight(light)) {
      light.id = '';
      light.life = undefined;
      light.maxLife = undefined;
      light.animationPhase = undefined;
      light.tag = undefined;
      this.lightPool.push(light);
    }
  }

  private isPoolableLight(light: AnyLightInstance): light is PointLightInstance {
    return light.type === 'point';
  }

  destroy(): void {
    if (_instance !== this) return;

    this.clear();

    this.lightPool.forEach(light => {
      light.id = '';
      light.life = undefined;
      light.maxLife = undefined;
      light.animationPhase = undefined;
    });

    this.lightPool.length = 0;
    this.cachedVisibleLights.length = 0;
    this.visibleLightsScratch.length = 0;
    this.tagSetPool.length = 0;
    this.lastCameraBounds = null;

    _instance = null;
    nextLightId = 0;
  }
}
