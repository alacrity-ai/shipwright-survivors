import type { Camera } from '@/core/Camera';
import type { Particle } from '@/systems/fx/interfaces/Particle';
import { hexToRgba32 } from '@/shared/colorUtils';
import { generateCircleMask } from '@/shared/maskUtils';
import { randomInRange, randomIntInclusive, randomAngle } from '@/shared/mathUtils';

export interface ParticleOptions {
  colors?: string[];
  baseSpeed?: number;
  sizeRange?: [number, number];
  lifeRange?: [number, number];
  velocity?: { x: number; y: number };
  fadeOut?: boolean;
}

const ZOOM_EXPONENT = 2;

export class ParticleManager {
  private activeParticles: Particle[] = [];
  private particlePool: Particle[] = [];

  private readonly CULL_PADDING = 128;
  private emissionAccumulator = 0;

  private imageData: ImageData | null = null;
  private pixels: Uint32Array | null = null;
  private canvasWidth = 0;
  private canvasHeight = 0;

  private colorCache = new Map<string, number>();
  private circleMaskCache = new Map<number, { dx: number; dy: number }[]>();

  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private readonly camera: Camera
  ) {}

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
    particle.size = randomInRange(sizeRange[0], sizeRange[1]);
    particle.life = randomInRange(lifeRange[0], lifeRange[1]);
    particle.initialLife = particle.life;
    particle.fadeOut = options.fadeOut ?? false;
    particle.color = colors[randomIntInclusive(0, colors.length - 1)];

    this.activeParticles.push(particle);
    return particle;
  }

  private initializeImageData(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.imageData = this.ctx.createImageData(width, height);
    this.pixels = new Uint32Array(this.imageData.data.buffer);
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
    for (const particle of this.activeParticles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.life -= dt;
    }

    this.activeParticles = this.activeParticles.filter(p => {
      const alive = p.life > 0;
      if (!alive) this.recycleParticle(p);
      return alive;
    });
  }

  render(): void {
    const canvas = this.ctx.canvas;
    const needResize = !this.imageData || this.canvasWidth !== canvas.width || this.canvasHeight !== canvas.height;

    if (needResize) {
      this.initializeImageData(canvas.width, canvas.height);
    }

    this.pixels!.fill(0);

    const screenWidth = canvas.width;
    const screenHeight = canvas.height;
    const zoom = this.camera.zoom;

    for (const particle of this.activeParticles) {
      const screen = this.camera.worldToScreen(particle.x, particle.y);
      const screenX = Math.round(screen.x);
      const screenY = Math.round(screen.y);

      if (
        screenX < -this.CULL_PADDING || screenX >= screenWidth + this.CULL_PADDING ||
        screenY < -this.CULL_PADDING || screenY >= screenHeight + this.CULL_PADDING
      ) continue;

      const pixelRadius = Math.max(1, Math.round(particle.size * zoom * ZOOM_EXPONENT));

      let baseColor = this.colorCache.get(particle.color);
      if (baseColor === undefined) {
        baseColor = hexToRgba32(particle.color);
        this.colorCache.set(particle.color, baseColor);
      }

      let color = baseColor;

      if (particle.fadeOut && particle.initialLife && particle.initialLife > 0) {
        const alphaFraction = Math.max(0, particle.life / particle.initialLife);
        const clampedAlpha = Math.min(1, alphaFraction);
        const alphaByte = Math.round(clampedAlpha * 255);

        // Mask out existing alpha and set new alpha
        color = (alphaByte << 24) | (baseColor & 0x00FFFFFF);
      }

      this.drawPixelCircle(screenX, screenY, pixelRadius, color);
    }

    this.ctx.putImageData(this.imageData!, 0, 0);
  }

  private drawPixelCircle(centerX: number, centerY: number, radius: number, color: number): void {
    const mask = this.circleMaskCache.get(radius) ?? (() => {
      const m = generateCircleMask(radius);
      this.circleMaskCache.set(radius, m);
      return m;
    })();
    for (const { dx, dy } of mask) {
      const x = centerX + dx;
      const y = centerY + dy;
      if (x < 0 || x >= this.canvasWidth || y < 0 || y >= this.canvasHeight) continue;
      this.pixels![y * this.canvasWidth + x] = color;
    }
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
    p.initialLife = undefined;
    p.fadeOut = undefined;
    this.particlePool.push(p);
  }
}
