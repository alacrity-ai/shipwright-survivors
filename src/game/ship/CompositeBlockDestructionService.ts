// src/game/ship/CompositeBlockDestructionService.ts

import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { ExplosionSystem } from '@/systems/fx/ExplosionSystem';
import type { PickupSpawner } from '@/systems/pickups/PickupSpawner';
import type { ShipRegistry } from '@/game/ship/ShipRegistry';
import type { AIOrchestratorSystem } from '@/systems/ai/AIOrchestratorSystem';

import type { BlockStore } from '@/game/blocks/system/BlockStore';
import { BlockManager } from '@/game/blocks/system/BlockManager';

import { createLightFlash } from '@/lighting/helpers/createLightFlash';
import { GlobalEventBus } from '@/core/EventBus';

import { Ship } from '@/game/ship/Ship';
import { MovementSystemRegistry } from '@/systems/physics/MovementSystemRegistry';
import { getConnectedBlockCoordsFast } from '@/game/ship/utils/shipBlockUtils';
import { DEFAULT_EXPLOSION_SPARK_PALETTE } from '@/game/blocks/BlockColorSchemes';
import { emitDefaultShockwave, emitHugeShockwave } from '@/core/interfaces/events/SpecialFxReporter';

export type DestructionCause =
  | 'projectile' | 'turret' | 'collision' | 'bomb' | 'flameThrower' | 'laser'
  | 'explosiveLance' | 'explosiveLanceAoE' | 'heatSeekerDirect' | 'heatSeekerAoE'
  | 'haloBlade' | 'self' | 'scripted' | 'reflected' | 'replaced' | 'dot';

const SHOCK_WAVE_COOLDOWN = 4.0;

// ──────────────────────────────────────────────────────────────────────────
// LOD controls
// ──────────────────────────────────────────────────────────────────────────

/** Threshold at/above which we enter “LOD mode”. */
const LARGE_SHIP_THRESHOLD = 800;

/** Hard cap for removals per frame in LOD mode (as requested). */
const LOD_STEPS_PER_FRAME_MAX = 200;

/**
 * Optional safety cap for “small” ships to prevent single-frame drains on long hitches.
 * If you want unlimited for small ships, set to Number.POSITIVE_INFINITY.
 */
const SMALL_STEPS_PER_FRAME_MAX = 400;

/** FX thinning bounds in LOD mode: 1 out of N blocks produce FX. */
const THIN_MIN = 2;    // densest
const THIN_MAX = 8;    // sparsest

/** Max window we’ll ever time-gate small-ship destruction. */
const MAX_DELAY_MS_SMALL = 500;

// ──────────────────────────────────────────────────────────────────────────
// SoA Buffer & Job
// ──────────────────────────────────────────────────────────────────────────

/**
 * Delays quantized to milliseconds to reduce bandwidth and stabilize comparison.
 * Executor multiplies by 0.001f once per check.
 */
interface SOADestructionBuffer {
  capacity: number;
  count: number;
  cursor: number;

  delaysMs: Uint16Array;   // 0–65535 ms (65.535s)
  blockIndex: Uint32Array; // optimistic index (validated at execution for small ships)
  coordX: Int16Array;      // local X at schedule time
  coordY: Int16Array;      // local Y at schedule time
  radius: Float32Array;
  scale: Float32Array;
}

interface DestructionJob {
  entity: Ship;
  buf: SOADestructionBuffer;

  // clock
  elapsed: number;

  // invariants (world frame snapshot at destruction start)
  originX: number;
  originY: number;
  rotation: number;
  dropRateMulti: number;

  // LOD controls
  isLarge: boolean;         // LOD mode flag
  stepsPerFrame: number;    // per-frame budget (LOD -> capped, small -> finite or Infinity)
  thinFactor: number;       // LOD FX thinning factor (1 = no thinning)
  perBlockPickups: boolean; // whether to spawn pickups per block (false in LOD)
}

// ──────────────────────────────────────────────────────────────────────────

export class CompositeBlockDestructionService {
  private destructionCallbacks = new Set<(entity: CompositeBlockObject, cause: DestructionCause) => void>();
  private activeDestructions = new Map<string, DestructionJob>();
  private store: BlockStore;

  private explosionSounds = [
    'assets/sounds/sfx/explosions/explosion_00.wav',
    'assets/sounds/sfx/explosions/explosion_00.wav',
    'assets/sounds/sfx/explosions/explosion_01.wav',
  ];

  // Random ring buffers (deterministic cadence without per-step RNG calls)
  private readonly RANDOM_BUFFER_SIZE = 64;
  private readonly radiusRandBuffer: number[] = [];
  private readonly scaleRandBuffer: number[] = [];
  private readonly delayRandBuffer: number[] = [];
  private randPtr = 0;

  // Reusable connectivity work
  private reusableConnectedSet?: Set<number>;
  private reusableWorkQueue?: GridCoord[];

  // Typed scratch for block indices
  private indicesScratch: Uint32Array = new Uint32Array(0);

  // Pool of reusable SoA buffers (bounded to avoid unbounded growth)
  private soaPool: SOADestructionBuffer[] = [];
  private readonly SOA_POOL_MAX = 8;

  // Typed → JS array conversion buffer for final sweep
  private scratchIndexList: number[] = [];

  // Temporary limit to shockwaves until multiple rendering fixed
  private shockwaveTimer = 0;

  // Tiny reusable objects to avoid ephemeral allocs when invoking FX
  private tmpOrigin = { x: 0, y: 0 };
  private tmpCoord  = { x: 0, y: 0 };

  constructor(
    private readonly explosionSystem: ExplosionSystem,
    private readonly pickupSpawner: PickupSpawner,
    private readonly shipRegistry: ShipRegistry,
    private readonly aiOrchestrator: AIOrchestratorSystem
  ) {
    this.store = BlockManager.getInstance().getBlockStore();
    GlobalEventBus.on('entity:destroy', this.handleDestroyEntity);
    this.seedRandomBuffers();
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────

  public destroy(): void {
    GlobalEventBus.off('entity:destroy', this.handleDestroyEntity);
    this.destructionCallbacks.clear();
    this.activeDestructions.clear();
    this.indicesScratch = new Uint32Array(0);
    // Optional: reclaim memory fully
    // this.soaPool.length = 0;
  }

  // ── Random buffers ──────────────────────────────────────────────────────

  private seedRandomBuffers(): void {
    for (let i = 0; i < this.RANDOM_BUFFER_SIZE; i++) {
      this.radiusRandBuffer[i] = Math.random();
      this.scaleRandBuffer[i]  = Math.random();
      this.delayRandBuffer[i]  = Math.random();
    }
    this.injectSpikesEveryNth(this.radiusRandBuffer, 20, 4);
    this.injectSpikesEveryNth(this.scaleRandBuffer,  20, 4);
    this.injectSpikesEveryNth(this.delayRandBuffer,  20, 4);
  }

  private injectSpikesEveryNth(buffer: number[], every: number, magnitude: number, offset = 0): void {
    for (let i = offset; i < buffer.length; i += every) buffer[i] = magnitude;
  }

  private nextRandom(buffer: number[]): number {
    const val = buffer[this.randPtr];
    this.randPtr = (this.randPtr + 1) % this.RANDOM_BUFFER_SIZE;
    return val;
  }

  // ── Pooling: SoA buffers ────────────────────────────────────────────────

  private acquireSOA(minCapacity: number): SOADestructionBuffer {
    const cap = this.nextPow2(minCapacity > 0 ? minCapacity : 1);

    // First-fit from pool
    for (let i = 0; i < this.soaPool.length; i++) {
      const buf = this.soaPool[i];
      if (buf.capacity >= cap) {
        this.soaPool[i] = this.soaPool[this.soaPool.length - 1];
        this.soaPool.pop();
        buf.count = 0;
        buf.cursor = 0;
        return buf;
      }
    }

    // Allocate fresh
    return {
      capacity: cap,
      count: 0,
      cursor: 0,
      delaysMs:  new Uint16Array(cap),
      blockIndex:new Uint32Array(cap),
      coordX:    new Int16Array(cap),
      coordY:    new Int16Array(cap),
      radius:    new Float32Array(cap),
      scale:     new Float32Array(cap),
    };
  }

  private ensureSOACapacity(buf: SOADestructionBuffer, needed: number): SOADestructionBuffer {
    if (needed <= buf.capacity) return buf;
    const newCap = this.nextPow2(needed);
    const nb: SOADestructionBuffer = {
      capacity: newCap,
      count: buf.count,
      cursor: buf.cursor,
      delaysMs:  new Uint16Array(newCap),
      blockIndex:new Uint32Array(newCap),
      coordX:    new Int16Array(newCap),
      coordY:    new Int16Array(newCap),
      radius:    new Float32Array(newCap),
      scale:     new Float32Array(newCap),
    };
    nb.delaysMs.set(buf.delaysMs.subarray(0, buf.count));
    nb.blockIndex.set(buf.blockIndex.subarray(0, buf.count));
    nb.coordX.set(buf.coordX.subarray(0, buf.count));
    nb.coordY.set(buf.coordY.subarray(0, buf.count));
    nb.radius.set(buf.radius.subarray(0, buf.count));
    nb.scale.set(buf.scale.subarray(0, buf.count));

    this.releaseSOA(buf);
    return nb;
  }

  private releaseSOA(buf: SOADestructionBuffer): void {
    buf.count = 0;
    buf.cursor = 0;

    // Bound pool size and prefer keeping smaller buffers.
    if (this.soaPool.length >= this.SOA_POOL_MAX) {
      // Drop the largest buffer currently in pool if the incoming one is smaller
      let largestIdx = -1;
      let largestCap = -1;
      for (let i = 0; i < this.soaPool.length; i++) {
        if (this.soaPool[i].capacity > largestCap) {
          largestCap = this.soaPool[i].capacity;
          largestIdx = i;
        }
      }
      if (largestIdx >= 0 && buf.capacity < largestCap) {
        this.soaPool[largestIdx] = buf;
        return;
      }
      // Otherwise, drop the returned buffer (do nothing)
      return;
    }
    this.soaPool.push(buf);
  }

  // ── Frame update ────────────────────────────────────────────────────────

  public update(dt: number): void {
    for (const [entityId, job] of this.activeDestructions) {
      job.elapsed += dt;

      const buf = job.buf;
      const n = buf.count;
      let i = buf.cursor;

      const budget = job.stepsPerFrame;

      if (job.isLarge) {
        // LOD path: ignore delays entirely; just process the next chunk.
        const end = Math.min(i + budget, n);
        for (; i < end; i++) {
          this.executeStep(job, i);
        }
        buf.cursor = i;
      } else {
        // Small-ship path: respect delays, but they’ve been capped when scheduled.
        let processed = 0;
        // Delays are monotone increasing
        while (i < n && (buf.delaysMs[i] * 0.001) <= job.elapsed && processed < budget) {
          this.executeStep(job, i);
          i++;
          processed++;
        }
        buf.cursor = i;
      }

      if (buf.cursor >= n) {
        // Final sweep: if anything somehow remains, remove with no FX then finalize.
        try {
          const remainingAny: any = job.entity.getAllBlockIndices();
          const len: number = (remainingAny?.length ?? 0) >>> 0;

          if (len > 0) {
            let list: number[];
            if (Array.isArray(remainingAny)) {
              // Already a plain number[]
              list = remainingAny as number[];
            } else {
              // TypedArray (e.g., Uint32Array) → copy into reusable number[]
              list = this.scratchIndexList;
              list.length = len;
              for (let k = 0; k < len; k++) {
                list[k] = (remainingAny[k] as number) >>> 0;
              }
            }
            job.entity.removeBlocksByIndexFast(list);
          }

          job.entity.destroyInstantly();
        } catch (err) {
          console.error('[CompositeBlockDestructionService] Error finalizing entity destroy:', err);
        }
        this.releaseSOA(buf);
        this.activeDestructions.delete(entityId);
      }
    }

    this.shockwaveTimer += dt;
  }

  private executeStep(job: DestructionJob, i: number): void {
    const buf = job.buf;

    // Reuse small objects to avoid ephemeral allocs in FX calls
    this.tmpOrigin.x = job.originX;
    this.tmpOrigin.y = job.originY;
    this.tmpCoord.x  = buf.coordX[i];
    this.tmpCoord.y  = buf.coordY[i];

    try {
      if (job.isLarge) {
        // LOD mode:
        //  - Thin FX by hashing on coord.
        //  - Remove by coordinate to avoid index staleness scans.
        //  - Suppress per-block pickups (aggregate or skip).
        const doFx = (job.thinFactor <= 1) ||
          ((this.hashCoord(this.tmpCoord.x, this.tmpCoord.y) % job.thinFactor) === 0);

        if (doFx) {
          // Slightly larger FX to compensate for thinning
          const r = buf.radius[i] * 1.15;
          const s = buf.scale[i]  * 1.15;
          this.explosionSystem.createBlockExplosion(
            job.entity.id,
            this.tmpOrigin,
            job.rotation,
            this.tmpCoord,
            r, s,
            undefined,
            DEFAULT_EXPLOSION_SPARK_PALETTE
          );
        }

        // Coordinate-based removal: robust against swap-with-last compaction.
        job.entity.removeBlock(this.tmpCoord);
        return;
      }

      // ── Small ship path (original semantics with validation) ────────────
      let idx = buf.blockIndex[i] >>> 0;
      const store = this.store;

      if (!this.isIndexAtCoord(store, idx, buf.coordX[i], buf.coordY[i])) {
        // Slow path: re-lookup by coord
        const lookedUp = this.lookupIndexByCoord(job.entity, buf.coordX[i], buf.coordY[i]);
        if (lookedUp < 0) {
          // Already removed or moved; still show FX at coord
          this.explosionSystem.createBlockExplosion(
            job.entity.id, this.tmpOrigin, job.rotation, this.tmpCoord,
            buf.radius[i], buf.scale[i], undefined, DEFAULT_EXPLOSION_SPARK_PALETTE
          );
          return;
        }
        idx = lookedUp >>> 0;
        buf.blockIndex[i] = idx; // Patch for future consistency
      }

      this.explosionSystem.createBlockExplosion(
        job.entity.id,
        this.tmpOrigin,
        job.rotation,
        this.tmpCoord,
        buf.radius[i],
        buf.scale[i],
        undefined,
        DEFAULT_EXPLOSION_SPARK_PALETTE
      );

      if (job.perBlockPickups) {
        this.pickupSpawner.spawnPickupOnBlockDestruction(idx, job.dropRateMulti);
      }
      job.entity.removeBlockByIndex(idx);

    } catch (err) {
      console.error('[CompositeBlockDestructionService] Error executing block destruction step:', err);
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────

  public onEntityDestroyed(callback: (entity: CompositeBlockObject, cause: DestructionCause) => void): void {
    this.destructionCallbacks.add(callback);
  }
  public offEntityDestroyed(callback: (entity: CompositeBlockObject, cause: DestructionCause) => void): void {
    this.destructionCallbacks.delete(callback);
  }

  private handleDestroyEntity = ({ entity, cause }: { entity: CompositeBlockObject; cause: DestructionCause }): void => {
    this.destroyEntity(entity, cause);
  };

  public destroyEntity(entity: CompositeBlockObject, cause: DestructionCause = 'scripted'): void {
    if (this.activeDestructions.has(entity.id)) return;

    for (const cb of this.destructionCallbacks) {
      try { cb(entity, cause); } catch (err) {
        console.error('[CompositeBlockDestructionService] Error in destruction callback:', err);
      }
    }

    entity.setDestroying(true);

    if (!(entity instanceof Ship)) {
      entity.destroy();
      return;
    }

    const ship = entity as Ship;
    const entityId = ship.id;
    const replaced = cause === 'replaced';

    // Make the destruction exclusive to this service
    ship.addTag?.('destructing');          // Prevent combat/other systems from touching this ship mid-destruction
    ship.setCanFire?.(false);

    // Deregister / cleanup
    this.shipRegistry.remove(ship, cause, replaced);
    MovementSystemRegistry.unregister(ship);
    this.aiOrchestrator.removeControllersForShip?.(entityId);
    ship.clearAllStatusEffects();

    if (replaced) {
      ship.setDestructionCause('replaced');
      ship.destroy();
      return;
    }

    // Invariants snapshot
    const transform = ship.getTransform();
    const originX = transform.position.x;
    const originY = transform.position.y;
    const rotation = transform.rotation;

    // One-shot FX
    createLightFlash(originX, originY, 4 * ship.getTotalMass(), 1.25, 0.5, '#ffffff', `explosion-${entityId}`);

    // Robust block count (avoid getBlockCount? which may be undefined/stale)
    const totalBlocks = (ship.getAllBlockIndices?.() as any)?.length ?? 0;

    // Shockwave gating using robust count
    if (this.shockwaveTimer > SHOCK_WAVE_COOLDOWN) {
      if (totalBlocks > 40) {
        emitHugeShockwave(originX, originY);
        this.shockwaveTimer = 0;
      } else if (totalBlocks > 20) {
        emitDefaultShockwave(originX, originY);
        this.shockwaveTimer = 0;
      }
    }

    // Extra decoupling for very large ships
    if (totalBlocks >= LARGE_SHIP_THRESHOLD) {
      try { ship.clearCollisionBox(); } catch { /* noop */ }
      try { ship.turnOffAllBlockLights(); } catch { /* noop */ }
    }

    // ── Gather indices (⚠ include disconnected via ownerId scan when available) ──
    let indices: Uint32Array, count: number;
    if ((this.store as any).ownerShipId != null) {
      [indices, count] = this.getAllIndicesForShipSOA(ship);
    } else {
      [indices, count] = this.getIndicesViaShipIter(ship);
    }

    // Prepare connectivity (for scheduling aesthetics)
    const cockpitCoord = ship.getCockpitCoord();
    const connected = this.reusableConnectedSet ??= new Set<number>();
    const workQ     = this.reusableWorkQueue ??= [];
    connected.clear();
    workQ.length = 0;

    if (cockpitCoord) {
      getConnectedBlockCoordsFast(ship, cockpitCoord, connected, workQ);
    }

    // Acquire SoA buffer sized for all blocks (upper bound)
    let buf = this.acquireSOA(count);

    // Build schedule in two passes (monotone delays → no sort)
    let tMs = 0; // milliseconds, int

    const { localX, localY } = this.store;

    // Pass 1: connected core (tight cadence)
    if (cockpitCoord) {
      for (let i = 0; i < count; i++) {
        const idx = indices[i] >>> 0;
        const lx = localX[idx];
        const ly = localY[idx];
        // IMPORTANT: key encoding must match producer from getConnectedBlockCoordsFast
        // Fix: match (x << 16) | (y & 0xffff)
        const key = (lx << 16) | (ly & 0xffff);
        if (!connected.has(key)) continue;

        if (buf.count + 1 > buf.capacity) buf = this.ensureSOACapacity(buf, buf.count + 1);

        const j = buf.count++;
        // Delays capped for small ships (ignored in LOD at runtime)
        const capped = Math.min(tMs, MAX_DELAY_MS_SMALL);
        buf.delaysMs[j]   = capped as unknown as number; // Uint16 downcast
        buf.blockIndex[j] = idx;
        buf.coordX[j]     = lx;
        buf.coordY[j]     = ly;
        buf.radius[j]     = 50 + this.nextRandom(this.radiusRandBuffer) * 40;
        buf.scale[j]      = 0.5 + this.nextRandom(this.scaleRandBuffer)  * 0.5;

        tMs += 5; // +5 ms cadence
        if (tMs > 65535) tMs = 65535; // clamp to range
      }
    }

    // Pass 2: fringe (stochastic offsets)
    for (let i = 0; i < count; i++) {
      const idx = indices[i] >>> 0;
      const lx = localX[idx];
      const ly = localY[idx];

      if (cockpitCoord) {
        // Fix: match (x << 16) | (y & 0xffff)
        const key = (lx << 16) | (ly & 0xffff);
        if (connected.has(key)) continue;
      }

      // jittered delay: base 5ms + [0..500]ms
      const jitterMs = (this.nextRandom(this.delayRandBuffer) * 500) | 0;
      tMs += 5 + jitterMs;
      if (tMs > 65535) tMs = 65535;

      if (buf.count + 1 > buf.capacity) buf = this.ensureSOACapacity(buf, buf.count + 1);

      const j = buf.count++;
      // Cap small-ship gating so the tail doesn't look “stuck”
      const capped = Math.min(tMs, MAX_DELAY_MS_SMALL);
      buf.delaysMs[j]   = capped as unknown as number;
      buf.blockIndex[j] = idx;
      buf.coordX[j]     = lx;
      buf.coordY[j]     = ly;
      buf.radius[j]     = 60 + this.nextRandom(this.radiusRandBuffer) * 20;
      buf.scale[j]      = 0.5 + this.nextRandom(this.scaleRandBuffer)  * 0.3;
    }

    ship.setDestructionCause(cause);

    // LOD classification from the *actual* count
    const isLarge = count >= LARGE_SHIP_THRESHOLD;

    // Compute LOD thin factor (only affects FX density; all blocks still removed)
    const thinFactor = isLarge
      ? Math.min(THIN_MAX, Math.max(THIN_MIN, (count / LARGE_SHIP_THRESHOLD) | 0))
      : 1;

    // Register job
    this.activeDestructions.set(entityId, {
      entity: ship,
      buf,
      elapsed: 0,
      originX, originY, rotation,
      dropRateMulti: ship.getAffixes?.().blockDropRateMulti ?? 1,

      isLarge,
      stepsPerFrame: isLarge ? LOD_STEPS_PER_FRAME_MAX : SMALL_STEPS_PER_FRAME_MAX,
      thinFactor,
      perBlockPickups: !isLarge, // suppress per-block pickups in LOD for perf
    });
  }

  // ── Indices helpers ─────────────────────────────────────────────────────

  /**
   * Collect *all* indices from the SOA that are owned by this ship, including
   * disconnected islands, using the ownerShipId map.
   */
  private getAllIndicesForShipSOA(ship: Ship): [Uint32Array, number] {
    const store = this.store as any;
    const ownerArr = store.ownerShipId as (Uint32Array | Int32Array | number[]);
    const N = ownerArr?.length ?? 0;

    const ownerId = (ship as any).numericId ?? (ship as any).id ?? ship.id;

    // Start with a reasonable capacity; will grow if needed.
    const expected = ship.getBlockCount?.() ?? 0;
    const minCap = Math.max(64, expected);
    if (this.indicesScratch.length < minCap) {
      this.indicesScratch = new Uint32Array(this.nextPow2(minCap));
    }

    let n = 0;
    for (let i = 0; i < N; i++) {
      if (ownerArr[i] !== ownerId) continue;

      if (n >= this.indicesScratch.length) {
        const grow = new Uint32Array(this.indicesScratch.length << 1);
        grow.set(this.indicesScratch);
        this.indicesScratch = grow;
      }
      this.indicesScratch[n++] = i >>> 0;
    }

    return [this.indicesScratch, n];
  }

  /**
   * Fallback: iterate via ship’s index iterator/view when ownerShipId is absent.
   */
  private getIndicesViaShipIter(ship: Ship): [Uint32Array, number] {
    const view: any = (ship as any).getAllBlockIndicesView?.();
    if (view && typeof view.length === 'number') {
      const len = view.length >>> 0;
      if (this.indicesScratch.length < len) {
        this.indicesScratch = new Uint32Array(this.nextPow2(len));
      }
      for (let i = 0; i < len; i++) this.indicesScratch[i] = view[i] >>> 0;
      return [this.indicesScratch, len];
    }

    let needed = 0;
    const expected = (ship.getAllBlockIndices?.() as any)?.length ?? 0;
    const minCap = expected > 0 ? expected : 64;
    if (this.indicesScratch.length < minCap) {
      this.indicesScratch = new Uint32Array(this.nextPow2(minCap));
    }
    for (const idx of ship.getAllBlockIndices() as Iterable<number>) {
      if (needed >= this.indicesScratch.length) {
        const next = new Uint32Array(this.indicesScratch.length << 1);
        next.set(this.indicesScratch, 0);
        this.indicesScratch = next;
      }
      this.indicesScratch[needed++] = (idx as number) >>> 0;
    }
    return [this.indicesScratch, needed];
  }

  // ── Index validation / lookup (compaction-safe) ─────────────────────────

  /**
   * Fast check: does current index still correspond to (lx, ly)?
   * If arrays are compacted via swap-with-last, this detects staleness.
   */
  private isIndexAtCoord(store: BlockStore, idx: number, lx: number, ly: number): boolean {
    if ((idx as number) >>> 0 !== idx) return false;
    // Guard against out-of-range due to concurrent removals
    if (idx < 0 || idx >= store.localX.length) return false;
    return (store.localX[idx] === lx) && (store.localY[idx] === ly);
  }

  /**
   * Robust re-lookup by local coordinate.
   * Attempts O(1) grid or ship API, falls back to linear scan of current view.
   * Returns -1 if not found (already removed).
   */
  private lookupIndexByCoord(ship: Ship, lx: number, ly: number): number {
    // Preferred fast path: ship/grid API if present
    const byCoord = (ship as any).getBlockIndexByLocalCoord?.(lx, ly);
    if (typeof byCoord === 'number') return byCoord;

    // Secondary: stable view if exposed
    const view: any = (ship as any).getAllBlockIndicesView?.();
    const store = this.store;
    if (view && typeof view.length === 'number') {
      for (let i = 0; i < view.length; i++) {
        const idx = view[i] >>> 0;
        if (store.localX[idx] === lx && store.localY[idx] === ly) return idx;
      }
      return -1;
    }

    // Fallback: iterator scan (rare path)
    for (const idx of ship.getAllBlockIndices() as Iterable<number>) {
      const j = (idx as number) >>> 0;
      if (this.store.localX[j] === lx && this.store.localY[j] === ly) return j;
    }
    return -1;
  }

  // ── Utils ───────────────────────────────────────────────────────────────

  private nextPow2(n: number): number { let p = 1; while (p < n) p <<= 1; return p; }

  /** Cheap deterministic hash for coord-based FX thinning. */
  private hashCoord(lx: number, ly: number): number {
    let h = (lx | 0) * 73856093 ^ (ly | 0) * 19349663;
    h ^= h >>> 16; h = Math.imul(h, 2246822519); h ^= h >>> 13;
    return (h >>> 0);
  }
}
