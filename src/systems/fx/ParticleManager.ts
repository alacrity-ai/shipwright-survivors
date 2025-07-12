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