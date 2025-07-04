// import type { Camera } from '@/core/Camera';
// import type { Particle } from '@/systems/fx/interfaces/Particle';
// import type { LightingOrchestrator } from '@/lighting/LightingOrchestrator';

// import { ParticleRendererGL } from './ParticleRendererGL';
// import { randomInRange, randomIntInclusive, randomAngle } from '@/shared/mathUtils';
// import { createPointLight } from '@/lighting/lights/createPointLight';
// import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';

// export type FadeMode = 'linear' | 'delayed';

// export interface ParticleOptions {
//   colors?: string[];
//   baseSpeed?: number;
//   sizeRange?: [number, number];
//   lifeRange?: [number, number];
//   velocity?: { x: number; y: number };
//   fadeOut?: boolean;
//   fadeMode?: FadeMode;
//   light?: boolean;
//   lightRadiusScalar?: number;
//   lightIntensity?: number;
//   lightColorOverride?: string;

//   randomDirection?: boolean;
//   speedRange?: [number, number]; // Optional: overrides baseSpeed randomness
// }

// const PARTICLE_SCALE = 3;

// export class ParticleManager {
//   // private renderer: ParticleRendererGL;

//   private activeParticles: Particle[] = [];
//   private particlePool: Particle[] = [];

//   private readonly CULL_PADDING = 128;
//   private emissionAccumulator = 0;

//   constructor(
//     // gl: WebGLRenderingContext,
//     // private readonly camera: Camera,
//     private readonly lightingOrchestrator: LightingOrchestrator
//   ) {
//     // this.renderer = new ParticleRendererGL(gl);
//   }

//   private _createAndRegisterParticle(origin: { x: number; y: number }, options: ParticleOptions): Particle {
//     const {
//       colors = ['#00f', '#009', '#00a9f4', '#1e90ff'],
//       sizeRange = [1, 4],
//       lifeRange = [1, 2],
//     } = options;

//     let vx: number, vy: number;

//     if (options.randomDirection) {
//       const angle = randomAngle();
//       const minSpeed = options.speedRange?.[0] ?? 0;
//       const maxSpeed = options.speedRange?.[1] ?? options.baseSpeed ?? 1;
//       const speed = randomInRange(minSpeed, maxSpeed);

//       vx = Math.cos(angle) * speed;
//       vy = Math.sin(angle) * speed;
//     } else if (options.velocity) {
//       vx = options.velocity.x;
//       vy = options.velocity.y;
//     } else {
//       // Legacy fallback — random angle with baseSpeed
//       const angle = randomAngle();
//       const speed = randomInRange(0, options.baseSpeed ?? 1);

//       vx = Math.cos(angle) * speed;
//       vy = Math.sin(angle) * speed;
//     }

//     const particle = this.getParticle();
//     particle.x = origin.x;
//     particle.y = origin.y;
//     particle.vx = vx;
//     particle.vy = vy;
//     particle.size = randomInRange(sizeRange[0], sizeRange[1]) * PARTICLE_SCALE;
//     particle.life = randomInRange(lifeRange[0], lifeRange[1]);
//     particle.initialLife = particle.life;
//     particle.fadeOut = options.fadeOut ?? false;
//     particle.fadeMode = options.fadeMode ?? 'linear';
//     particle.renderAlpha = 1.0;
//     particle.color = colors[randomIntInclusive(0, colors.length - 1)];

//     if (this.lightingOrchestrator && options.light) {
//       const light = createPointLight({
//         x: particle.x,
//         y: particle.y,
//         radius: particle.size * (options.lightRadiusScalar ?? 3),
//         color: options.lightColorOverride ?? particle.color,
//         intensity: options.lightIntensity ?? 1.0,
//         life: particle.life,
//         expires: true,
//         fadeMode: options.fadeMode ?? 'linear',
//       });

//       this.lightingOrchestrator.registerLight(light);
//       particle.lightId = light.id;
//     }

//     this.activeParticles.push(particle);
//     return particle;
//   }

//   emitBurst(origin: { x: number; y: number }, count: number, options: ParticleOptions = {}): void {
//     for (let i = 0; i < count; i++) {
//       this.spawnParticle(origin, options);
//     }
//   }

//   emitContinuous(origin: { x: number; y: number }, dt: number, ratePerSecond: number, options: ParticleOptions = {}): void {
//     const clampedDt = Math.min(dt, 0.05);
//     this.emissionAccumulator += ratePerSecond * clampedDt;
//     const particlesToEmit = Math.floor(this.emissionAccumulator);
//     this.emissionAccumulator -= particlesToEmit;

//     for (let i = 0; i < particlesToEmit; i++) {
//       this.spawnParticle(origin, options);
//     }
//   }

//   public emitParticle(origin: { x: number; y: number }, options: ParticleOptions = {}): Particle {
//     return this._createAndRegisterParticle(origin, options);
//   }

//   private spawnParticle(origin: { x: number; y: number }, options: ParticleOptions = {}): void {
//     this._createAndRegisterParticle(origin, options);
//   }

//   update(dt: number): void {
//     if (!PlayerSettingsManager.getInstance().isParticlesEnabled()) return;

//     for (const particle of this.activeParticles) {
//       particle.x += particle.vx * dt;
//       particle.y += particle.vy * dt;
//       particle.life -= dt;

//       if (particle.lightId) {
//         const light = this.lightingOrchestrator.getLightById(particle.lightId);
//         if (light && (light.type === 'point' || light.type === 'spot')) {
//           light.x = particle.x;
//           light.y = particle.y;
//         }
//       }

//       // === Compute renderAlpha based on fadeMode ===
//       const lifeRatio = particle.initialLife ? particle.life / particle.initialLife : 1.0;
//       const fadeThreshold = 0.10;

//       switch (particle.fadeMode) {
//         case 'delayed':
//           particle.renderAlpha = lifeRatio >= fadeThreshold
//             ? 1.0
//             : lifeRatio / fadeThreshold;
//           break;
//         case 'linear':
//         default:
//           particle.renderAlpha = lifeRatio;
//           break;
//       }
//     }

//     this.activeParticles = this.activeParticles.filter(p => {
//       const alive = p.life > 0;
//       if (!alive) this.recycleParticle(p);
//       return alive;
//     });
//   }

//   // render(): void {
//   //   if (!PlayerSettingsManager.getInstance().isParticlesEnabled()) return;
//   //   this.renderer.render(this.activeParticles, this.camera);
//   // }

//   public getActiveParticles(): Particle[] {
//     return this.activeParticles;
//   }

//   private getParticle(): Particle {
//     return this.particlePool.pop() || {
//       x: 0, y: 0, vx: 0, vy: 0,
//       size: 1, life: 1, color: '#fff', speed: 0,
//     };
//   }

//   public removeParticle(particle: Particle): void {
//     const index = this.activeParticles.indexOf(particle);
//     if (index !== -1) {
//       this.activeParticles.splice(index, 1);
//       this.recycleParticle(particle);
//     }
//   }

//   private recycleParticle(p: Particle): void {
//     if (p.lightId) {
//       this.lightingOrchestrator.removeLight(p.lightId);
//       p.lightId = undefined;
//     }

//     p.initialLife = undefined;
//     p.fadeOut = undefined;
//     p.fadeMode = undefined;
//     p.renderAlpha = undefined;

//     this.particlePool.push(p);
//   }

//   public destroy(): void {
//     // Remove all lights still attached to particles
//     for (const p of this.activeParticles) {
//       if (p.lightId) {
//         this.lightingOrchestrator.removeLight(p.lightId);
//         p.lightId = undefined;
//       }
//     }

//     this.activeParticles.length = 0;
//     this.particlePool.length = 0;
//     this.emissionAccumulator = 0;
//   }
// }


import type { Camera } from '@/core/Camera';
import type { Particle } from '@/systems/fx/interfaces/Particle';
import type { LightingOrchestrator } from '@/lighting/LightingOrchestrator';

import { ParticleRendererGL } from './ParticleRendererGL';
import { randomInRange, randomIntInclusive, randomAngle } from '@/shared/mathUtils';
import { createPointLight } from '@/lighting/lights/createPointLight';
import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';

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
  speedRange?: [number, number]; // Optional: overrides baseSpeed randomness
}

const PARTICLE_SCALE = 3;

export class ParticleManager {
  // private renderer: ParticleRendererGL;

  private activeParticles: Particle[] = [];
  private particlePool: Particle[] = [];

  private readonly CULL_PADDING = 128;
  private emissionAccumulator = 0;

  // Cache for performance optimizations
  private playerSettingsManager: PlayerSettingsManager;
  private cachedParticlesEnabled: boolean = true;
  private settingsCheckCounter = 0;
  private readonly SETTINGS_CHECK_INTERVAL = 60; // Check every 60 frames (~1 second at 60fps)

  constructor(
    // gl: WebGLRenderingContext,
    // private readonly camera: Camera,
    private readonly lightingOrchestrator: LightingOrchestrator
  ) {
    // this.renderer = new ParticleRendererGL(gl);
    this.playerSettingsManager = PlayerSettingsManager.getInstance();
    this.cachedParticlesEnabled = this.playerSettingsManager.isParticlesEnabled();
  }

  private _createAndRegisterParticle(origin: { x: number; y: number }, options: ParticleOptions): Particle {
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
      // Legacy fallback — random angle with baseSpeed
      const angle = randomAngle();
      const speed = randomInRange(0, options.baseSpeed ?? 1);

      vx = Math.cos(angle) * speed;
      vy = Math.sin(angle) * speed;
    }

    const particle = this.getParticle();
    particle.x = origin.x;
    particle.y = origin.y;
    particle.vx = vx;
    particle.vy = vy;
    particle.size = randomInRange(sizeRange[0], sizeRange[1]) * PARTICLE_SCALE;
    particle.life = randomInRange(lifeRange[0], lifeRange[1]);
    particle.initialLife = particle.life;
    particle.fadeOut = options.fadeOut ?? false;
    particle.fadeMode = options.fadeMode ?? 'linear';
    particle.renderAlpha = 1.0;
    particle.color = colors[randomIntInclusive(0, colors.length - 1)];

    if (this.lightingOrchestrator && options.light) {
      const light = createPointLight({
        x: particle.x,
        y: particle.y,
        radius: particle.size * (options.lightRadiusScalar ?? 3),
        color: options.lightColorOverride ?? particle.color,
        intensity: options.lightIntensity ?? 1.0,
        life: particle.life,
        expires: true,
        fadeMode: options.fadeMode ?? 'linear',
      });

      this.lightingOrchestrator.registerLight(light);
      particle.lightId = light.id;
    }

    this.activeParticles.push(particle);
    return particle;
  }

  emitBurst(origin: { x: number; y: number }, count: number, options: ParticleOptions = {}): void {
    for (let i = 0; i < count; i++) {
      this.spawnParticle(origin, options);
    }
  }

  emitContinuous(origin: { x: number; y: number }, dt: number, ratePerSecond: number, options: ParticleOptions = {}): void {
    const clampedDt = Math.min(dt, 0.05);
    this.emissionAccumulator += ratePerSecond * clampedDt;
    const particlesToEmit = Math.floor(this.emissionAccumulator);
    this.emissionAccumulator -= particlesToEmit;

    for (let i = 0; i < particlesToEmit; i++) {
      this.spawnParticle(origin, options);
    }
  }

  public emitParticle(origin: { x: number; y: number }, options: ParticleOptions = {}): Particle {
    return this._createAndRegisterParticle(origin, options);
  }

  private spawnParticle(origin: { x: number; y: number }, options: ParticleOptions = {}): void {
    this._createAndRegisterParticle(origin, options);
  }

  update(dt: number): void {
    // Cache settings check - only check every N frames instead of every frame
    if (++this.settingsCheckCounter >= this.SETTINGS_CHECK_INTERVAL) {
      this.cachedParticlesEnabled = this.playerSettingsManager.isParticlesEnabled();
      this.settingsCheckCounter = 0;
    }

    if (!this.cachedParticlesEnabled) return;

    // Pre-calculate constants outside the loop
    const fadeThreshold = 0.10;
    const invFadeThreshold = 1.0 / fadeThreshold; // Pre-calculate division

    // Use traditional for loop for better performance
    let writeIndex = 0;
    for (let readIndex = 0; readIndex < this.activeParticles.length; readIndex++) {
      const particle = this.activeParticles[readIndex];
      
      // Update position
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.life -= dt;

      // Check if particle is still alive first (early exit)
      if (particle.life <= 0) {
        this.recycleParticle(particle);
        continue;
      }

      // Update light position if present
      if (particle.lightId) {
        const light = this.lightingOrchestrator.getLightById(particle.lightId);
        if (light && (light.type === 'point' || light.type === 'spot')) {
          light.x = particle.x;
          light.y = particle.y;
        }
      }

      // Compute renderAlpha based on fadeMode
      const lifeRatio = particle.initialLife ? particle.life / particle.initialLife : 1.0;

      if (particle.fadeMode === 'delayed') {
        particle.renderAlpha = lifeRatio >= fadeThreshold
          ? 1.0
          : lifeRatio * invFadeThreshold;
      } else {
        // Default to linear
        particle.renderAlpha = lifeRatio;
      }

      // Keep this particle (compact array in-place)
      this.activeParticles[writeIndex] = particle;
      writeIndex++;
    }

    // Truncate array to remove dead particles
    this.activeParticles.length = writeIndex;
  }

  // render(): void {
  //   if (!this.cachedParticlesEnabled) return;
  //   this.renderer.render(this.activeParticles, this.camera);
  // }

  public getActiveParticles(): Particle[] {
    return this.activeParticles;
  }

  private getParticle(): Particle {
    return this.particlePool.pop() || {
      x: 0, y: 0, vx: 0, vy: 0,
      size: 1, life: 1, color: '#fff', speed: 0,
    };
  }

  public removeParticle(particle: Particle): void {
    const index = this.activeParticles.indexOf(particle);
    if (index !== -1) {
      this.activeParticles.splice(index, 1);
      this.recycleParticle(particle);
    }
  }

  private recycleParticle(p: Particle): void {
    if (p.lightId) {
      this.lightingOrchestrator.removeLight(p.lightId);
      p.lightId = undefined;
    }

    p.initialLife = undefined;
    p.fadeOut = undefined;
    p.fadeMode = undefined;
    p.renderAlpha = undefined;

    this.particlePool.push(p);
  }

  public destroy(): void {
    // Remove all lights still attached to particles
    for (const p of this.activeParticles) {
      if (p.lightId) {
        this.lightingOrchestrator.removeLight(p.lightId);
        p.lightId = undefined;
      }
    }

    this.activeParticles.length = 0;
    this.particlePool.length = 0;
    this.emissionAccumulator = 0;
  }
}