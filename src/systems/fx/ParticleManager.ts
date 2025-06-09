import type { Camera } from '@/core/Camera';
import type { Particle } from '@/systems/fx/interfaces/Particle';
import type { LightingOrchestrator } from '@/lighting/LightingOrchestrator';

import { ParticleRendererGL } from './ParticleRendererGL';
import { randomInRange, randomIntInclusive, randomAngle } from '@/shared/mathUtils';
import { createPointLight } from '@/lighting/lights/createPointLight'; // or wherever your factory lives
import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';

export interface ParticleOptions {
  colors?: string[];
  baseSpeed?: number;
  sizeRange?: [number, number];
  lifeRange?: [number, number];
  velocity?: { x: number; y: number };
  fadeOut?: boolean;
  light?: boolean;
  lightRadiusScalar?: number;
  lightIntensity?: number;
}

const PARTICLE_SCALE = 3;

export class ParticleManager {
  private renderer: ParticleRendererGL;

  private activeParticles: Particle[] = [];
  private particlePool: Particle[] = [];

  private readonly CULL_PADDING = 128;
  private emissionAccumulator = 0;

  constructor(
    gl: WebGLRenderingContext,
    private readonly camera: Camera,
    private readonly lightingOrchestrator: LightingOrchestrator
  ) {
    this.renderer = new ParticleRendererGL(gl);
  }

  private _createAndRegisterParticle(origin: { x: number; y: number }, options: ParticleOptions): Particle {
    const {
      colors = ['#00f', '#009', '#00a9f4', '#1e90ff'],
      baseSpeed = 0.75,
      sizeRange = [1, 4],
      lifeRange = [1, 2],
      velocity,
    } = options;

    const angle = randomAngle();
    const speed = randomInRange(0, baseSpeed);
    const vx = velocity?.x ?? Math.cos(angle) * speed;
    const vy = velocity?.y ?? Math.sin(angle) * speed;

    const particle = this.getParticle();
    particle.x = origin.x;
    particle.y = origin.y;
    particle.vx = vx;
    particle.vy = vy;
    particle.size = randomInRange(sizeRange[0], sizeRange[1]) * PARTICLE_SCALE; // Scale up particle size for better visibility
    particle.life = randomInRange(lifeRange[0], lifeRange[1]);
    particle.initialLife = particle.life;
    particle.fadeOut = options.fadeOut ?? false;
    particle.color = colors[randomIntInclusive(0, colors.length - 1)];

    if (this.lightingOrchestrator && options.light) {
      // --- Create light tied to particle ---
      const light = createPointLight({
        x: particle.x,
        y: particle.y,
        radius: particle.size * (options.lightRadiusScalar ?? 3),
        color: particle.color,
        intensity: options.lightIntensity ?? 1.0,
        life: particle.life,
        expires: true,
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
    if (!PlayerSettingsManager.getInstance().isParticlesEnabled()) return;

    for (const particle of this.activeParticles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.life -= dt;

      // Sync light position, if exists
      if (particle.lightId) {
        const light = this.lightingOrchestrator.getLightById(particle.lightId);

        if (light && (light.type === 'point' || light.type === 'spot')) {
          light.x = particle.x;
          light.y = particle.y;
        }
      }
    }

    this.activeParticles = this.activeParticles.filter(p => {
      const alive = p.life > 0;
      if (!alive) this.recycleParticle(p);
      return alive;
    });
  }

  render(): void {
    if (!PlayerSettingsManager.getInstance().isParticlesEnabled()) return;
    this.renderer.render(this.activeParticles, this.camera);
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

    this.particlePool.push(p);
  }
}
