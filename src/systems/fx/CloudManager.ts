import { setCloudParamsFront, setCloudParamsBack } from '@/core/interfaces/events/SpecialFxReporter';

type Vec2 = { x: number; y: number };

type CloudParams = {
  speed?: number;
  density?: number;
  quantity?: number;
  scale?: number;
  alpha?: number;
  color?: [number, number, number];
};

type CloudRegion = {
  id: string;
  center: Vec2;
  radius: number;
  frontParams: CloudParams;
  backParams: CloudParams;
};

function distanceSquared(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class CloudManager {
  private readonly ship: { getTransform: () => { position: Vec2 } };
  private readonly regions: CloudRegion[];

  private readonly regionCoordsBuffer: { x: number; y: number; radius: number }[] = [];

  private currentRegion: CloudRegion | null = null;

  private alphaFront: number = 0;
  private alphaBack: number = 0;

  private lastEmittedFrontAlpha: number = -1;
  private lastEmittedBackAlpha: number = -1;

  private readonly FADE_SPEED = 2.0; // Units per second

  constructor(ship: { getTransform: () => { position: Vec2 } }, regions: CloudRegion[]) {
    this.ship = ship;
    this.regions = regions;
  }

  update(dt: number): void {
    const position = this.ship.getTransform().position;

    // Find region that contains current position
    let matchingRegion: CloudRegion | null = null;

    for (let i = 0; i < this.regions.length; i++) {
      const region = this.regions[i];
      const distSq = distanceSquared(position, region.center);
      if (distSq <= region.radius * region.radius) {
        matchingRegion = region;
        break;
      }
    }

    if (matchingRegion?.id !== this.currentRegion?.id) {
      this.currentRegion = matchingRegion;
    }

    // Target alpha
    const targetAlphaFront = this.currentRegion?.frontParams.alpha ?? 0;
    const targetAlphaBack = this.currentRegion?.backParams.alpha ?? 0;

    // Lerp alpha over time
    this.alphaFront = lerp(this.alphaFront, targetAlphaFront, 1 - Math.exp(-this.FADE_SPEED * dt));
    this.alphaBack = lerp(this.alphaBack, targetAlphaBack, 1 - Math.exp(-this.FADE_SPEED * dt));

    // Emit only if alpha changed significantly
    const EPSILON = 0.001;

    if (Math.abs(this.alphaFront - this.lastEmittedFrontAlpha) > EPSILON) {
      const base = this.currentRegion?.frontParams ?? {};
      setCloudParamsFront({ ...base, alpha: this.alphaFront });
      this.lastEmittedFrontAlpha = this.alphaFront;
    }

    if (Math.abs(this.alphaBack - this.lastEmittedBackAlpha) > EPSILON) {
      const base = this.currentRegion?.backParams ?? {};
      setCloudParamsBack({ ...base, alpha: this.alphaBack });
      this.lastEmittedBackAlpha = this.alphaBack;
    }
  }

  // == Public API ==
  
  getRegionCoords(): readonly { x: number; y: number; radius: number }[] {
    // Reuse preallocated buffer to avoid GC churn
    const buf = this.regionCoordsBuffer;
    buf.length = 0;

    for (let i = 0; i < this.regions.length; i++) {
      const r = this.regions[i];
      buf.push({
        x: r.center.x,
        y: r.center.y,
        radius: r.radius,
      });
    }

    return buf;
  }
}
