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

const PARTICLE_SCALE = 3;

export class ParticleManager {
  private activeParticles: Particle[] = [];
  private particlePool: Particle[] = [];

  private readonly CULL_PADDING = 128;
  private readonly GRID_SIZE = 128;

  private readonly GRID_OFFSET = 32768;

  // Optimization 1: Use packed integer keys instead of string keys
  private readonly spatialGrid = new Map<number, Particle[]>();
  private particleToGridKey = new WeakMap<Particle, number>();

  private emissionAccumulator = 0;
  private cachedVisibleParticles: Particle[] = [];
  
  // Optimization 3: Reuse scratch array to avoid allocations
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

  // Optimization 1: Pack grid coordinates into single integer
  private getGridKey(x: number, y: number): number {
    const gx = Math.floor(x / this.GRID_SIZE) + this.GRID_OFFSET;
    const gy = Math.floor(y / this.GRID_SIZE) + this.GRID_OFFSET;
    return (gx << 16) | gy;
  }

  private addToGrid(p: Particle, key: number): void {
    this.particleToGridKey.set(p, key);
    if (!this.spatialGrid.has(key)) {
      this.spatialGrid.set(key, []);
    }
    this.spatialGrid.get(key)!.push(p);
  }

  private removeFromGrid(p: Particle): void {
    const key = this.particleToGridKey.get(p);
    if (key !== undefined) {
      const bucket = this.spatialGrid.get(key);
      if (bucket) {
        const index = bucket.indexOf(p);
        if (index !== -1) bucket.splice(index, 1);
        if (bucket.length === 0) this.spatialGrid.delete(key);
      }
      this.particleToGridKey.delete(p);
    }
  }

  // Check if grid cell overlaps with view bounds
  private cellOverlapsView(gx: number, gy: number, left: number, right: number, top: number, bottom: number): boolean {
    const cellLeft = gx * this.GRID_SIZE;
    const cellRight = (gx + 1) * this.GRID_SIZE;
    const cellTop = gy * this.GRID_SIZE;
    const cellBottom = (gy + 1) * this.GRID_SIZE;

    return !(cellRight < left || cellLeft > right || cellBottom < top || cellTop > bottom);
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
    const key = this.getGridKey(particle.x, particle.y);
    this.addToGrid(particle, key);
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
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;

      if (p.life <= 0) {
        this.recycleParticle(p);
        continue;
      }

      if (p.lightId) {
        const light = this.lightingOrchestrator.getLightById(p.lightId);
        if (light && (light.type === 'point' || light.type === 'spot')) {
          light.x = p.x;
          light.y = p.y;
        }
      }

      const lifeRatio = p.initialLife ? p.life / p.initialLife : 1.0;
      p.renderAlpha = p.fadeMode === 'delayed'
        ? (lifeRatio >= fadeThreshold ? 1.0 : lifeRatio * invFadeThreshold)
        : lifeRatio;

      this.activeParticles[writeIndex++] = p;

      // Reindex only if particle moved to a new cell
      this.reindexParticle(p);
    }

    this.activeParticles.length = writeIndex;
  }

  public collectVisibleParticles(camera: Camera): Particle[] {
    const raw = camera.getViewportBounds();
    
    // Reuse bounds object to avoid allocation
    this.cachedBounds.x = Math.floor(raw.x);
    this.cachedBounds.y = Math.floor(raw.y);
    this.cachedBounds.width = Math.floor(raw.width);
    this.cachedBounds.height = Math.floor(raw.height);

    const changed =
      !this.lastCameraBounds ||
      this.cachedBounds.x !== this.lastCameraBounds.x ||
      this.cachedBounds.y !== this.lastCameraBounds.y ||
      this.cachedBounds.width !== this.lastCameraBounds.width ||
      this.cachedBounds.height !== this.lastCameraBounds.height;

    if (!this.particlesDirty && !changed) return this.cachedVisibleParticles;

    const pad = this.CULL_PADDING;
    const left = this.cachedBounds.x - pad;
    const right = this.cachedBounds.x + this.cachedBounds.width + pad;
    const top = this.cachedBounds.y - pad;
    const bottom = this.cachedBounds.y + this.cachedBounds.height + pad;

    const minGX = Math.floor(left / this.GRID_SIZE);
    const maxGX = Math.floor(right / this.GRID_SIZE);
    const minGY = Math.floor(top / this.GRID_SIZE);
    const maxGY = Math.floor(bottom / this.GRID_SIZE);

    // Reuse scratch array
    const visible = this.visibleScratch;
    visible.length = 0;

    for (let gx = minGX; gx <= maxGX; gx++) {
      for (let gy = minGY; gy <= maxGY; gy++) {
        // Skip cells that don't overlap with view
        if (!this.cellOverlapsView(gx, gy, left, right, top, bottom)) {
          continue;
        }

        const key = this.getGridKey(gx * this.GRID_SIZE, gy * this.GRID_SIZE);
        const bucket = this.spatialGrid.get(key);
        if (!bucket) continue;

        for (const p of bucket) {
          const { x, y, size } = p;
          if (
            x + size >= left &&
            x - size <= right &&
            y + size >= top &&
            y - size <= bottom
          ) {
            visible.push(p);
          }
        }
      }
    }

    this.cachedVisibleParticles = visible.slice(); // Create a copy for caching
    
    // Reuse one object and mutate
    this.lastCameraBounds = this.lastCameraBounds || { x: 0, y: 0, width: 0, height: 0 };
    Object.assign(this.lastCameraBounds, this.cachedBounds);

    this.particlesDirty = false;
    return this.cachedVisibleParticles;
  }

  private getParticle(): Particle {
    return this.particlePool.pop() || {
      x: 0, y: 0, vx: 0, vy: 0,
      size: 1, life: 1, color: '#fff', speed: 0,
    };
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
    this.removeFromGrid(p);

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

  private reindexParticle(p: Particle): void {
    const oldKey = this.particleToGridKey.get(p);
    const newKey = this.getGridKey(p.x, p.y);
    if (newKey === oldKey) return;

    this.removeFromGrid(p);
    this.addToGrid(p, newKey);
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
    this.spatialGrid.clear();
    this.particleToGridKey = new WeakMap();
    this.emissionAccumulator = 0;
    this.particlesDirty = true;
  }
}