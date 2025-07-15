// src/systems/fx/ParticleManager.ts

import type { Camera } from '@/core/Camera';
import type { Particle } from '@/systems/fx/interfaces/Particle';
import type { LightingOrchestrator } from '@/lighting/LightingOrchestrator';

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
  speedRange?: [number, number];
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

export class ParticleManager {
  private activeParticles: Particle[] = [];
  private particlePool: Particle[] = [];

  private emissionAccumulator = 0;
  private cachedVisibleParticles: Particle[] = [];
  
  private randPtr = 0;          // cheap palette cycling index
  private randState = 0x12345678 ^ performance.now();   // seed once

  // Reuse scratch array to avoid allocations
  private readonly visibleScratch: Particle[] = [];
  
  // Cache bounds object to avoid repeated allocations
  private readonly cachedBounds = { x: 0, y: 0, width: 0, height: 0 };
  private lastCameraBounds: { x: number; y: number; width: number; height: number } | null = null;
  private particlesDirty = true;

  private playerSettingsManager: PlayerSettingsManager;
  private cachedParticlesEnabled: boolean = true;
  private settingsCheckCounter = 0;
  private readonly SETTINGS_CHECK_INTERVAL = 60;

  constructor(private readonly lightingOrchestrator: LightingOrchestrator) {
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

    const chosenColor = colors[randomIntInclusive(0, colors.length - 1)];
    const { r, g, b } = hexToRgb(chosenColor);

    particle.color = chosenColor;
    particle.r = r;
    particle.g = g;
    particle.b = b;

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
    this.particlesDirty = true;
    return particle;
  }

  emitBurst(origin: { x: number; y: number }, count: number, options: ParticleOptions = {}): void {
    for (let i = 0; i < count; i++) this._createAndRegisterParticle(origin, options);
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

  /** Ultra‑hot path for two small flame particles.
   *  – Avoids option parsing, random array indexing, extra trig, and object churn.
   *  – `palette` is a pre‑resolved array of THREE hex strings (r‑g‑b already cached). */
  emitPairFast(
    origin: { x: number; y: number },
    vx: number,
    vy: number,
    palette: readonly [string, string, string]
  ): void {
    const r1 = this.nextRand();
    const r2 = this.nextRand();

    /* --- first particle --- */
    const p0 = this.getParticle();
    p0.x = origin.x;
    p0.y = origin.y;
    p0.vx = vx + (r1 - 0.5) * 20;                 // ±10 px/s spray
    p0.vy = vy + (r2 - 0.5) * 20;
    p0.size = (1.9 + r1) * PARTICLE_SCALE;        // 1.5–2.5
    p0.life = 0.09 + r2 * 0.06;                   // 0.09–0.15
    p0.initialLife = p0.life;
    p0.fadeOut = true;
    p0.renderAlpha = 1.0;
    const c0 = palette[(this.randPtr = (this.randPtr + 1) % 3)];
    const rgb0 = hexToRgb(c0);
    p0.color = c0;  p0.r = rgb0.r;  p0.g = rgb0.g;  p0.b = rgb0.b;

    /* --- second particle --- */
    const r3 = this.nextRand();
    const p1 = this.getParticle();
    p1.x = origin.x;
    p1.y = origin.y;
    p1.vx = vx + (r2 - 0.5) * 20;
    p1.vy = vy + (r3 - 0.5) * 20;
    p1.size = (1.2 + r3) * PARTICLE_SCALE;        // 1.2–2.2
    p1.life = 0.08 + r1 * 0.05;                   // 0.08–0.13
    p1.initialLife = p1.life;
    p1.fadeOut = true;
    p1.renderAlpha = 1.0;
    const c1 = palette[(this.randPtr = (this.randPtr + 1) % 3)];
    const rgb1 = hexToRgb(c1);
    p1.color = c1;  p1.r = rgb1.r;  p1.g = rgb1.g;  p1.b = rgb1.b;

    this.activeParticles.push(p0, p1);
  }


  emitContinuous(origin: { x: number; y: number }, dt: number, ratePerSecond: number, options: ParticleOptions = {}): void {
    const clampedDt = Math.min(dt, 0.05);
    this.emissionAccumulator += ratePerSecond * clampedDt;
    const toEmit = Math.floor(this.emissionAccumulator);
    this.emissionAccumulator -= toEmit;
    for (let i = 0; i < toEmit; i++) this._createAndRegisterParticle(origin, options);
  }

  public emitParticle(origin: { x: number; y: number }, options: ParticleOptions = {}): Particle {
    return this._createAndRegisterParticle(origin, options);
  }

  update(dt: number): void {
    if (++this.settingsCheckCounter >= this.SETTINGS_CHECK_INTERVAL) {
      this.cachedParticlesEnabled = this.playerSettingsManager.isParticlesEnabled();
      this.settingsCheckCounter = 0;
    }

    if (!this.cachedParticlesEnabled) return;
    
    this.particlesDirty = true;

    const fadeThreshold = 0.10;
    const invFadeThreshold = 1.0 / fadeThreshold;

    let writeIndex = 0;

    for (let i = 0; i < this.activeParticles.length; i++) {
      const p = this.activeParticles[i];
      
      // Update position
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;

      if (p.life <= 0) {
        this.recycleParticle(p);
        continue;
      }

      // Update associated light
      if (p.lightId) {
        const light = this.lightingOrchestrator.getLightById(p.lightId);
        if (light && (light.type === 'point' || light.type === 'spot')) {
          light.x = p.x;
          light.y = p.y;
        }
      }

      // Update alpha
      const lifeRatio = p.initialLife ? p.life / p.initialLife : 1.0;
      p.renderAlpha = p.fadeMode === 'delayed'
        ? (lifeRatio >= fadeThreshold ? 1.0 : lifeRatio * invFadeThreshold)
        : lifeRatio;

      this.activeParticles[writeIndex++] = p;
    }

    this.activeParticles.length = writeIndex;
  }

  public collectVisibleParticles(camera: Camera): Particle[] {
    // Simply return all active particles - no spatial culling
    return this.activeParticles;
  }

  private getParticle(): Particle {
    const particle = this.particlePool.pop() || {
      x: 0, y: 0, vx: 0, vy: 0,
      size: 1, life: 1, color: '#fff', speed: 0,
      r: 1, g: 1, b: 1,
    };
    
    return particle;
  }

  public removeParticle(p: Particle): void {
    const idx = this.activeParticles.indexOf(p);
    if (idx !== -1) {
      this.activeParticles.splice(idx, 1);
      this.recycleParticle(p);
      this.particlesDirty = true;
    }
  }

  private recycleParticle(p: Particle): void {
    if (p.lightId) {
      this.lightingOrchestrator.removeLight(p.lightId);
      p.lightId = undefined;
    }

    // Reset all properties
    p.initialLife = undefined;
    p.fadeOut = undefined;
    p.fadeMode = undefined;
    p.renderAlpha = undefined;

    p.r = 1;
    p.g = 1;
    p.b = 1;

    this.particlePool.push(p);
  }

  public destroy(): void {
    for (const p of this.activeParticles) {
      if (p.lightId) {
        this.lightingOrchestrator.removeLight(p.lightId);
      }
    }

    this.activeParticles.length = 0;
    this.particlePool.length = 0;
    this.cachedVisibleParticles.length = 0;
    this.visibleScratch.length = 0;
    this.lastCameraBounds = null;
    this.emissionAccumulator = 0;
    this.particlesDirty = true;
  }
}