/**********************************************************************
 * LightningSystem.ts  –  pool-driven chain-lightning manager
 *********************************************************************/

import type { LightningSegment } from '@/rendering/unified/passes/fx/LightningPass';

import { GlobalEventBus } from '@/core/EventBus';
import type { LightningBoltSpawnEvent } from '@/core/interfaces/EventTypes';

import { createPointLight } from '@/lighting/lights/createPointLight';
import type { LightingOrchestrator } from '@/lighting/LightingOrchestrator';

/* ────────────────────────────────────────────────────────────────── */
/*  CONFIGURABLE CONSTANTS                                           */
/* ────────────────────────────────────────────────────────────────── */
const DEFAULT_LIFETIME    = 0.08;          // seconds per bolt
const DEFAULT_THICKNESS   = 0.5;           // world-units half-width
const MAX_SUBDIVISION     = 5;             // recursion depth
const JITTER_FRACTION     = 0.15;          // max offset = len * JITTER
const COLOR_CYAN          = [0.25, 0.9, 1.0, 1.0] as const; // premultiplied

/* ────────────────────────────────────────────────────────────────── */
/*  INTERNAL TYPES                                                   */
/* ────────────────────────────────────────────────────────────────── */
interface Bolt {
  /** index into `segments` where this bolt starts (inclusive) */
  start: number;
  /** exclusive end index */
  end: number;
  age: number;
  life: number;
  lightId?: number | null;
}

/* ────────────────────────────────────────────────────────────────── */
/*  IMPLEMENTATION                                                   */
/* ────────────────────────────────────────────────────────────────── */
export class LightningSystem {
  // ─── Active data ────────────────────────────────────────────────
  private readonly segments: LightningSegment[] = [];
  private readonly segmentPool: LightningSegment[] = [];
  private readonly bolts: Bolt[] = [];
  private readonly boltPool: Bolt[] = [];

  private segmentsDirty = true;   // cache invalidation
  private cachedReturn: LightningSegment[] = [];

  constructor(private readonly lightingOrchestrator: LightingOrchestrator | null = null) {
    // ADDED
    GlobalEventBus.on('lightning:bolt:spawn', this.handleSpawnBolt);
  }

  /**
   * Delegates an incoming `lightning:bolt:spawn` request to the
   * internal `spawnBolt` routine.  No allocations, no copies.
   */
  private readonly handleSpawnBolt = (
    { start, end, opts }: LightningBoltSpawnEvent,
  ): void => {
    this.spawnBolt(start, end, opts ?? {});
  };

  /* -------------------------------------------------------------- *
   * Public API                                                     *
   * -------------------------------------------------------------- */

  /**
   * Spawn a new jagged bolt from A → B.
   */
  spawnBolt(
    start: { x: number; y: number },
    end:   { x: number; y: number },
    opts: Partial<{
      lifetime: number;
      thickness: number;
      color: [number, number, number, number];
      subdivision: number;
      jitter: number;
      lightRadius: number;
      lightIntensity: number;
    }> = {},
  ): void {
    const depth      = Math.min(opts.subdivision ?? MAX_SUBDIVISION, MAX_SUBDIVISION);
    const jitterFrac = opts.jitter ?? JITTER_FRACTION;
    const thickness  = opts.thickness ?? DEFAULT_THICKNESS;
    const life       = opts.lifetime  ?? DEFAULT_LIFETIME;
    const color      = opts.color     ?? COLOR_CYAN;

    /* 1. produce polyline via midpoint-displacement */
    const pts: { x: number; y: number }[] = [];
    pts.push({ x: start.x, y: start.y });
    this._subdivide(start, end, depth, jitterFrac, pts);
    pts.push({ x: end.x,   y: end.y   });

    /* 2. build segments */
    const bolt = this._getBolt();
    bolt.start = this.segments.length;
    bolt.age   = 0;
    bolt.life  = life;

    for (let i = 0; i < pts.length - 1; ++i) {
      const p0 = pts[i], p1 = pts[i + 1];
      const seg = this._getSegment();
      seg.startX    = p0.x;
      seg.startY    = p0.y;
      seg.endX      = p1.x;
      seg.endY      = p1.y;
      seg.thickness = thickness;
      seg.age       = 0;          // updated each frame
      seg.r         = color[0];
      seg.g         = color[1];
      seg.b         = color[2];
      seg.a         = color[3];
      this.segments.push(seg);
    }
    bolt.end = this.segments.length;

    /* 3. optional point light along path midpoint */
    if (this.lightingOrchestrator) {
      const mid = { x: (start.x + end.x) * 0.5, y: (start.y + end.y) * 0.5 };
      const lightId = createPointLight({
        x: mid.x,
        y: mid.y,
        radius: opts.lightRadius ?? 8,
        intensity: opts.lightIntensity ?? 0.8,
        color: '#55d5ff',
        life,
        expires: true,
      }, 'lightning');
      bolt.lightId = lightId;
    }

    this.bolts.push(bolt);
    this.segmentsDirty = true;
  }

  /**
   * Advance simulation and recycle expired bolts.
   */
  update(dt: number): void {
    if (this.bolts.length === 0) return;

    let segWrite = 0;
    const segArr = this.segments;

    for (let b = 0; b < this.bolts.length; ++b) {
      const bolt = this.bolts[b];
      bolt.age  += dt;

      const alive = bolt.age < bolt.life;
      const ageRatio = bolt.age / bolt.life;

      // Update segments belonging to this bolt
      for (let i = bolt.start; i < bolt.end; ++i) {
        const seg = segArr[i];
        if (alive) {
          seg.age = ageRatio;
          segArr[segWrite++] = seg;
        } else {
          this._recycleSegment(seg);
        }
      }

      if (!alive) {
        if (bolt.lightId && this.lightingOrchestrator) {
          this.lightingOrchestrator.removeLight(bolt.lightId);
        }
        this._recycleBolt(bolt);
        this.bolts.splice(b--, 1); // remove dead bolt
      } else {
        // renormalise bolt indices
        bolt.start = segWrite - (bolt.end - bolt.start);
        bolt.end   = segWrite;
      }
    }
    // truncate segments array
    segArr.length = segWrite;
    this.segmentsDirty = true;
  }

  /**
   * Renderer pull-API — returns *live* segments.
   * The array is recycled every frame; **copy if you need to keep it.**
   */
  getSegments(): LightningSegment[] {
    if (this.segmentsDirty) {
      this.cachedReturn = this.segments.slice(); // shallow copy; ~O(n) but small
      this.segmentsDirty = false;
    }
    return this.cachedReturn;
  }

  destroy(): void {
    this.segments.length = 0;
    this.segmentPool.length = 0;
    this.bolts.length = 0;
    this.boltPool.length = 0;
    this.cachedReturn.length = 0;
    GlobalEventBus.off('lightning:bolt:spawn', this.handleSpawnBolt);
  }

  /* -------------------------------------------------------------- *
   * Internal helpers                                               *
   * -------------------------------------------------------------- */

  /** Classic midpoint-displacement recursion. */
  private _subdivide(
    a: { x: number; y: number },
    b: { x: number; y: number },
    depth: number,
    jitter: number,
    out: { x: number; y: number }[],
  ): void {
    if (depth === 0) return;

    const midX = (a.x + b.x) * 0.5;
    const midY = (a.y + b.y) * 0.5;
    const dx   = b.y - a.y;
    const dy   = a.x - b.x;
    const len  = Math.hypot(b.x - a.x, b.y - a.y);
    const offset = (len * jitter) * (Math.random() * 2 - 1);

    const nx = midX + dx / len * offset;
    const ny = midY + dy / len * offset;

    const m = { x: nx, y: ny };
    this._subdivide(a, m, depth - 1, jitter, out);
    out.push(m);
    this._subdivide(m, b, depth - 1, jitter, out);
  }

  // ─── Pool helpers ───────────────────────────────────────────────
  private _getSegment(): LightningSegment {
    return this.segmentPool.pop() || ({
      startX:0,startY:0,endX:0,endY:0,thickness:1,age:0,r:1,g:1,b:1,a:1,
    } as LightningSegment);
  }
  private _recycleSegment(s: LightningSegment): void { this.segmentPool.push(s); }

  private _getBolt(): Bolt {
    return this.boltPool.pop() || { start:0,end:0,age:0,life:1 };
  }
  private _recycleBolt(b: Bolt): void { this.boltPool.push(b); }
}
