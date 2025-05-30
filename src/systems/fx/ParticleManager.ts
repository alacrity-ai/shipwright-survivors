import type { Camera } from '@/core/Camera';
import type { Particle } from '@/systems/fx/interfaces/Particle';

export interface ParticleOptions {
  colors?: string[];
  baseSpeed?: number;
  sizeRange?: [number, number];
  lifeRange?: [number, number];
  velocity?: { x: number; y: number };
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

  emitParticle(origin: { x: number; y: number }, options: ParticleOptions = {}): Particle {
    const {
      colors = ['#00f', '#009', '#00a9f4', '#1e90ff'],
      baseSpeed = 0.75,
      sizeRange = [1, 4],
      lifeRange = [1, 2],
      velocity,
    } = options;

    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * baseSpeed;
    const vx = velocity ? velocity.x : Math.cos(angle) * speed;
    const vy = velocity ? velocity.y : Math.sin(angle) * speed;

    const particle = this.getParticle();
    particle.x = origin.x;
    particle.y = origin.y;
    particle.vx = vx;
    particle.vy = vy;
    particle.size = Math.random() * (sizeRange[1] - sizeRange[0]) + sizeRange[0];
    particle.life = Math.random() * (lifeRange[1] - lifeRange[0]) + lifeRange[0];
    particle.color = colors[Math.floor(Math.random() * colors.length)];

    this.activeParticles.push(particle);
    return particle;
  }

  private spawnParticle(origin: { x: number; y: number }, options: ParticleOptions): void {
    const {
      colors = ['#00f', '#009', '#00a9f4', '#1e90ff'],
      baseSpeed = 0.75,
      sizeRange = [1, 4],
      lifeRange = [1, 2],
      velocity,
    } = options;

    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * baseSpeed;
    const vx = velocity !== undefined ? velocity.x : Math.cos(angle) * speed;
    const vy = velocity !== undefined ? velocity.y : Math.sin(angle) * speed;

    const particle = this.getParticle();
    particle.x = origin.x;
    particle.y = origin.y;
    particle.vx = vx;
    particle.vy = vy;
    particle.size = Math.random() * (sizeRange[1] - sizeRange[0]) + sizeRange[0];
    particle.life = Math.random() * (lifeRange[1] - lifeRange[0]) + lifeRange[0];
    particle.color = colors[Math.floor(Math.random() * colors.length)];

    this.activeParticles.push(particle);
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
      const color = this.getColorRGBA(particle.color);
      this.drawPixelCircle(screenX, screenY, pixelRadius, color);
    }

    this.ctx.putImageData(this.imageData!, 0, 0);
  }

  private initializeImageData(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.imageData = this.ctx.createImageData(width, height);
    this.pixels = new Uint32Array(this.imageData.data.buffer);
  }

  private getColorRGBA(hex: string): number {
    if (this.colorCache.has(hex)) return this.colorCache.get(hex)!;

    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else {
      r = parseInt(hex.slice(1, 3), 16);
      g = parseInt(hex.slice(3, 5), 16);
      b = parseInt(hex.slice(5, 7), 16);
    }

    const rgba = (255 << 24) | (b << 16) | (g << 8) | r;
    this.colorCache.set(hex, rgba);
    return rgba;
  }

  private drawPixelCircle(centerX: number, centerY: number, radius: number, color: number): void {
    const mask = this.getCircleMask(radius);
    for (const { dx, dy } of mask) {
      const x = centerX + dx;
      const y = centerY + dy;
      if (x < 0 || x >= this.canvasWidth || y < 0 || y >= this.canvasHeight) continue;
      this.pixels![y * this.canvasWidth + x] = color;
    }
  }

  private getCircleMask(radius: number): { dx: number; dy: number }[] {
    if (this.circleMaskCache.has(radius)) {
      return this.circleMaskCache.get(radius)!;
    }

    const points: { dx: number; dy: number }[] = [];
    const r2 = radius * radius;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= r2) {
          points.push({ dx, dy });
        }
      }
    }

    this.circleMaskCache.set(radius, points);
    return points;
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
    this.particlePool.push(p);
  }
}
