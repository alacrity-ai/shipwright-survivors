// // ────────────────────────────────────────────────────────────────────────────────
// // src/systems/fx/FireManager.ts
// // SOA-based fire effect manager for procedural flames (explosions, burn, etc.)
// // Spawns optional point lights for each blob and hooks into GlobalEventBus.
// // Works with FirePass for instanced GPU rendering.
// // ────────────────────────────────────────────────────────────────────────────────

// import { GlobalEventBus } from '@/core/EventBus';
// import { randomInRange } from '@/shared/mathUtils';
// import { createPointLight } from '@/lighting/lights/createPointLight';
// import type { LightingOrchestrator } from '@/lighting/LightingOrchestrator';

// export interface FireSOA {
//   count: number;
//   x: Float32Array;
//   y: Float32Array;
//   radius: Float32Array;
//   age: Float32Array;
//   intensity: Float32Array;
//   rampIndex: Float32Array;
//   lightId: (number | undefined)[]; // Updated to Number
//   life: Float32Array;
//   initialLife: Float32Array;
// }

// export interface FireOptions {
//   x: number;
//   y: number;
//   radius?: number;
//   life?: number;
//   intensity?: number;
//   rampIndex?: number;
//   randomizeRadius?: boolean;
//   randomizeLife?: boolean;
//   light?: boolean;
//   lightRadiusScalar?: number;
//   lightIntensity?: number;
//   color?: string; // Optional override for light color
// }

// const MAX_FIRES = 4096;

// function createSOABuffer(max: number): FireSOA {
//   return {
//     count: 0,
//     x: new Float32Array(max),
//     y: new Float32Array(max),
//     radius: new Float32Array(max),
//     age: new Float32Array(max),
//     intensity: new Float32Array(max),
//     rampIndex: new Float32Array(max),
//     lightId: new Array(max),
//     life: new Float32Array(max),
//     initialLife: new Float32Array(max),
//   };
// }

// export class FireManager {
//   private readonly soa: FireSOA;
//   private readonly freeIndices: number[] = [];
//   private readonly onFireEmitBound: (payload: any) => void;

//   constructor(private readonly lightingOrchestrator: LightingOrchestrator) {
//     this.soa = createSOABuffer(MAX_FIRES);

//     // Handle fx:fire:emit event globally
//     this.onFireEmitBound = (payload) => {
//       const count = payload.count ?? 1;
//       for (let i = 0; i < count; i++) {
//         this.emitFire({
//           x: payload.x,
//           y: payload.y,
//           radius: payload.radius,
//           life: payload.life,
//           intensity: payload.intensity,
//           rampIndex: payload.rampIndex,
//           randomizeRadius: payload.randomizeRadius,
//           randomizeLife: payload.randomizeLife,
//           light: payload.light,
//           lightRadiusScalar: payload.lightRadiusScalar,
//           lightIntensity: payload.lightIntensity,
//           color: payload.color,
//         });
//       }
//     };

//     GlobalEventBus.on('fx:fire:emit', this.onFireEmitBound);
//   }

//   /** Emit a single fire blob (optionally with light). */
//   emitFire(options: FireOptions): number {
//     const idx = this.allocateIndex();
//     if (idx === -1) return -1;

//     const {
//       x,
//       y,
//       radius = 32,
//       life = 1.5,
//       intensity = 1.0,
//       rampIndex = 0,
//       randomizeRadius = true,
//       randomizeLife = true,
//       light = false,
//       lightRadiusScalar = 3.0,
//       lightIntensity = 1.0,
//       color,
//     } = options;

//     this.soa.x[idx] = x;
//     this.soa.y[idx] = y;
//     this.soa.radius[idx] = randomizeRadius ? radius * randomInRange(0.8, 1.2) : radius;
//     this.soa.age[idx] = 0;
//     this.soa.intensity[idx] = intensity;
//     this.soa.rampIndex[idx] = rampIndex;

//     const finalLife = randomizeLife ? life * randomInRange(0.8, 1.2) : life;
//     this.soa.life[idx] = finalLife;
//     this.soa.initialLife[idx] = finalLife;

//     // Create an accompanying point light if requested
//     if (light) {
//       const lightId = createPointLight({
//         x,
//         y,
//         radius: this.soa.radius[idx] * lightRadiusScalar,
//         color: color ?? '#ff9933',
//         intensity: lightIntensity,
//         life: finalLife,
//         expires: true,
//         fadeMode: 'linear',
//       });
//       // this.lightingOrchestrator.registerLight(lightInstance); // Registration occurs automatically in createPointLight
//       this.soa.lightId[idx] = lightId ?? undefined;
//     } else {
//       this.soa.lightId[idx] = undefined;
//     }

//     return idx;
//   }

//   /** Updates fire blobs: age, intensity, size, light positions, and recycles dead. */
//   update(dt: number): void {
//     for (let i = 0; i < this.soa.count; ) {
//       this.soa.age[i] += dt;
//       this.soa.life[i] -= dt;

//       if (this.soa.life[i] <= 0) {
//         this.recycleIndex(i);
//         continue;
//       }

//       // Update light position to follow fire blob
//       const id = this.soa.lightId[i];
//       if (id !== undefined) {
//         this.lightingOrchestrator.updateLight(id, {
//           x: this.soa.x[i],
//           y: this.soa.y[i]
//         });
//       }

//       i++;
//     }
//   }

//   /** Get the SOA for rendering via FirePass. */
//   getFireSOA(): FireSOA {
//     return this.soa;
//   }

//   /** Clears all fire blobs and removes lights. */
//   clear(): void {
//     for (let i = 0; i < this.soa.count; i++) {
//       if (this.soa.lightId[i]) {
//         this.lightingOrchestrator.removeLight(this.soa.lightId[i]!);
//         this.soa.lightId[i] = undefined;
//       }
//     }
//     this.soa.count = 0;
//     this.freeIndices.length = 0;
//   }

//   // === Internal utilities ===
//   private allocateIndex(): number {
//     if (this.freeIndices.length > 0) {
//       const idx = this.freeIndices.pop()!;
//       if (idx >= this.soa.count) {
//         this.soa.count = idx + 1;
//       }
//       return idx;
//     }
//     if (this.soa.count >= MAX_FIRES) return -1;
//     return this.soa.count++;
//   }

//   private recycleIndex(index: number): void {
//     if (this.soa.lightId[index]) {
//       this.lightingOrchestrator.removeLight(this.soa.lightId[index]!);
//       this.soa.lightId[index] = undefined;
//     }

//     const last = this.soa.count - 1;
//     if (index !== last) {
//       this.swap(index, last);
//     }

//     this.freeIndices.push(last);
//     this.soa.count--;
//   }

//   private swap(i: number, j: number): void {
//     let t: number;
//     t = this.soa.x[i]; this.soa.x[i] = this.soa.x[j]; this.soa.x[j] = t;
//     t = this.soa.y[i]; this.soa.y[i] = this.soa.y[j]; this.soa.y[j] = t;
//     t = this.soa.radius[i]; this.soa.radius[i] = this.soa.radius[j]; this.soa.radius[j] = t;
//     t = this.soa.age[i]; this.soa.age[i] = this.soa.age[j]; this.soa.age[j] = t;
//     t = this.soa.intensity[i]; this.soa.intensity[i] = this.soa.intensity[j]; this.soa.intensity[j] = t;
//     t = this.soa.rampIndex[i]; this.soa.rampIndex[i] = this.soa.rampIndex[j]; this.soa.rampIndex[j] = t;
//     t = this.soa.life[i]; this.soa.life[i] = this.soa.life[j]; this.soa.life[j] = t;
//     t = this.soa.initialLife[i]; this.soa.initialLife[i] = this.soa.initialLife[j]; this.soa.initialLife[j] = t;

//     const tempId = this.soa.lightId[i];
//     this.soa.lightId[i] = this.soa.lightId[j];
//     this.soa.lightId[j] = tempId;
//   }

//   /** Clean up all resources and detach event listeners. */
//   destroy(): void {
//     // Unsubscribe from event bus to prevent dangling callbacks
//     GlobalEventBus.off('fx:fire:emit', this.onFireEmitBound);

//     // Remove any active lights and clear state
//     for (let i = 0; i < this.soa.count; i++) {
//       if (this.soa.lightId[i]) {
//         this.lightingOrchestrator.removeLight(this.soa.lightId[i]!);
//         this.soa.lightId[i] = undefined;
//       }
//     }

//     this.soa.count = 0;
//     this.freeIndices.length = 0;

//     // Zero all SOA fields for safety and GC friendliness
//     this.soa.x.fill(0);
//     this.soa.y.fill(0);
//     this.soa.radius.fill(0);
//     this.soa.age.fill(0);
//     this.soa.intensity.fill(0);
//     this.soa.rampIndex.fill(0);
//     this.soa.life.fill(0);
//     this.soa.initialLife.fill(0);
//     this.soa.lightId.fill(undefined);
//   }
// }

// ────────────────────────────────────────────────────────────────────────────────
// src/systems/fx/FireManager.ts
// SOA-based fire effect manager for procedural flames (explosions, burn, etc.)
// Spawns optional point lights for each blob and hooks into GlobalEventBus.
// Works with FirePass for instanced GPU rendering.
// Enhanced with velocity support for moving flames.
// ────────────────────────────────────────────────────────────────────────────────

import { GlobalEventBus } from '@/core/EventBus';
import { randomInRange } from '@/shared/mathUtils';
import { createPointLight } from '@/lighting/lights/createPointLight';
import type { LightingOrchestrator } from '@/lighting/LightingOrchestrator';

export interface FireSOA {
  count: number;
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;     // Velocity X component
  vy: Float32Array;     // Velocity Y component
  radius: Float32Array;
  age: Float32Array;
  intensity: Float32Array;
  rampIndex: Float32Array;
  lightId: (number | undefined)[]; // Updated to Number
  life: Float32Array;
  initialLife: Float32Array;
}

export interface FireOptions {
  x: number;
  y: number;
  vx?: number;          // Initial velocity X
  vy?: number;          // Initial velocity Y
  radius?: number;
  life?: number;
  intensity?: number;
  rampIndex?: number;
  randomizeRadius?: boolean;
  randomizeLife?: boolean;
  light?: boolean;
  lightRadiusScalar?: number;
  lightIntensity?: number;
  color?: string; // Optional override for light color
}

const MAX_FIRES = 4096;

function createSOABuffer(max: number): FireSOA {
  return {
    count: 0,
    x: new Float32Array(max),
    y: new Float32Array(max),
    vx: new Float32Array(max),
    vy: new Float32Array(max),
    radius: new Float32Array(max),
    age: new Float32Array(max),
    intensity: new Float32Array(max),
    rampIndex: new Float32Array(max),
    lightId: new Array(max),
    life: new Float32Array(max),
    initialLife: new Float32Array(max),
  };
}

export class FireManager {
  private readonly soa: FireSOA;
  private readonly freeIndices: number[] = [];
  private readonly onFireEmitBound: (payload: any) => void;

  constructor(private readonly lightingOrchestrator: LightingOrchestrator) {
    this.soa = createSOABuffer(MAX_FIRES);

    // Handle fx:fire:emit event globally
    this.onFireEmitBound = (payload) => {
      const count = payload.count ?? 1;
      for (let i = 0; i < count; i++) {
        this.emitFire({
          x: payload.x,
          y: payload.y,
          vx: payload.vx,
          vy: payload.vy,
          radius: payload.radius,
          life: payload.life,
          intensity: payload.intensity,
          rampIndex: payload.rampIndex,
          randomizeRadius: payload.randomizeRadius,
          randomizeLife: payload.randomizeLife,
          light: payload.light,
          lightRadiusScalar: payload.lightRadiusScalar,
          lightIntensity: payload.lightIntensity,
          color: payload.color,
        });
      }
    };

    GlobalEventBus.on('fx:fire:emit', this.onFireEmitBound);
  }

  /** Emit a single fire blob (optionally with light and velocity). */
  emitFire(options: FireOptions): number {
    const idx = this.allocateIndex();
    if (idx === -1) return -1;

    const {
      x,
      y,
      vx = 0,
      vy = 0,
      radius = 32,
      life = 1.5,
      intensity = 1.0,
      rampIndex = 0,
      randomizeRadius = true,
      randomizeLife = true,
      light = false,
      lightRadiusScalar = 3.0,
      lightIntensity = 1.0,
      color,
    } = options;

    this.soa.x[idx] = x;
    this.soa.y[idx] = y;
    this.soa.vx[idx] = vx;
    this.soa.vy[idx] = vy;
    this.soa.radius[idx] = randomizeRadius ? radius * randomInRange(0.8, 1.2) : radius;
    this.soa.age[idx] = 0;
    this.soa.intensity[idx] = intensity;
    this.soa.rampIndex[idx] = rampIndex;

    const finalLife = randomizeLife ? life * randomInRange(0.8, 1.2) : life;
    this.soa.life[idx] = finalLife;
    this.soa.initialLife[idx] = finalLife;

    // Create an accompanying point light if requested
    if (light) {
      const lightId = createPointLight({
        x,
        y,
        radius: this.soa.radius[idx] * lightRadiusScalar,
        color: color ?? '#ff9933',
        intensity: lightIntensity,
        life: finalLife,
        expires: true,
        fadeMode: 'linear',
      });
      // this.lightingOrchestrator.registerLight(lightInstance); // Registration occurs automatically in createPointLight
      this.soa.lightId[idx] = lightId ?? undefined;
    } else {
      this.soa.lightId[idx] = undefined;
    }

    return idx;
  }

  /** Updates fire blobs: age, position via velocity, intensity, size, light positions, and recycles dead. */
  update(dt: number): void {
    for (let i = 0; i < this.soa.count; ) {
      this.soa.age[i] += dt;
      this.soa.life[i] -= dt;

      if (this.soa.life[i] <= 0) {
        this.recycleIndex(i);
        continue;
      }

      // Update position based on velocity
      this.soa.x[i] += this.soa.vx[i] * dt;
      this.soa.y[i] += this.soa.vy[i] * dt;

      // Update light position to follow fire blob
      const id = this.soa.lightId[i];
      if (id !== undefined) {
        this.lightingOrchestrator.updateLight(id, {
          x: this.soa.x[i],
          y: this.soa.y[i]
        });
      }

      i++;
    }
  }

  /** Get the SOA for rendering via FirePass. */
  getFireSOA(): FireSOA {
    return this.soa;
  }

  /** Clears all fire blobs and removes lights. */
  clear(): void {
    for (let i = 0; i < this.soa.count; i++) {
      if (this.soa.lightId[i]) {
        this.lightingOrchestrator.removeLight(this.soa.lightId[i]!);
        this.soa.lightId[i] = undefined;
      }
    }
    this.soa.count = 0;
    this.freeIndices.length = 0;
  }

  // === Internal utilities ===
  private allocateIndex(): number {
    if (this.freeIndices.length > 0) {
      const idx = this.freeIndices.pop()!;
      if (idx >= this.soa.count) {
        this.soa.count = idx + 1;
      }
      return idx;
    }
    if (this.soa.count >= MAX_FIRES) return -1;
    return this.soa.count++;
  }

  private recycleIndex(index: number): void {
    if (this.soa.lightId[index]) {
      this.lightingOrchestrator.removeLight(this.soa.lightId[index]!);
      this.soa.lightId[index] = undefined;
    }

    const last = this.soa.count - 1;
    if (index !== last) {
      this.swap(index, last);
    }

    this.freeIndices.push(last);
    this.soa.count--;
  }

  private swap(i: number, j: number): void {
    let t: number;
    t = this.soa.x[i]; this.soa.x[i] = this.soa.x[j]; this.soa.x[j] = t;
    t = this.soa.y[i]; this.soa.y[i] = this.soa.y[j]; this.soa.y[j] = t;
    t = this.soa.vx[i]; this.soa.vx[i] = this.soa.vx[j]; this.soa.vx[j] = t;
    t = this.soa.vy[i]; this.soa.vy[i] = this.soa.vy[j]; this.soa.vy[j] = t;
    t = this.soa.radius[i]; this.soa.radius[i] = this.soa.radius[j]; this.soa.radius[j] = t;
    t = this.soa.age[i]; this.soa.age[i] = this.soa.age[j]; this.soa.age[j] = t;
    t = this.soa.intensity[i]; this.soa.intensity[i] = this.soa.intensity[j]; this.soa.intensity[j] = t;
    t = this.soa.rampIndex[i]; this.soa.rampIndex[i] = this.soa.rampIndex[j]; this.soa.rampIndex[j] = t;
    t = this.soa.life[i]; this.soa.life[i] = this.soa.life[j]; this.soa.life[j] = t;
    t = this.soa.initialLife[i]; this.soa.initialLife[i] = this.soa.initialLife[j]; this.soa.initialLife[j] = t;

    const tempId = this.soa.lightId[i];
    this.soa.lightId[i] = this.soa.lightId[j];
    this.soa.lightId[j] = tempId;
  }

  /** Clean up all resources and detach event listeners. */
  destroy(): void {
    // Unsubscribe from event bus to prevent dangling callbacks
    GlobalEventBus.off('fx:fire:emit', this.onFireEmitBound);

    // Remove any active lights and clear state
    for (let i = 0; i < this.soa.count; i++) {
      if (this.soa.lightId[i]) {
        this.lightingOrchestrator.removeLight(this.soa.lightId[i]!);
        this.soa.lightId[i] = undefined;
      }
    }

    this.soa.count = 0;
    this.freeIndices.length = 0;

    // Zero all SOA fields for safety and GC friendliness
    this.soa.x.fill(0);
    this.soa.y.fill(0);
    this.soa.vx.fill(0);
    this.soa.vy.fill(0);
    this.soa.radius.fill(0);
    this.soa.age.fill(0);
    this.soa.intensity.fill(0);
    this.soa.rampIndex.fill(0);
    this.soa.life.fill(0);
    this.soa.initialLife.fill(0);
    this.soa.lightId.fill(undefined);
  }
}