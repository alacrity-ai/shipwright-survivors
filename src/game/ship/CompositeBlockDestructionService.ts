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
import { audioManager } from '@/audio/Audio';

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
  blockIndex: Uint32Array; // optimistic index (validated at execution)
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

  // invariants
  originX: number;
  originY: number;
  rotation: number;
  dropRateMulti: number;
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

      // Execute all due steps; delays are monotone increasing
      while (i < n && (buf.delaysMs[i] * 0.001) <= job.elapsed) {
        this.executeStep(job, i);
        i++;
      }
      buf.cursor = i;

      if (i >= n) {
        // finalize
        try {
          job.entity.destroy();
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
      // Validate index; compaction may have invalidated saved index
      let idx = buf.blockIndex[i] >>> 0;
      const store = this.store;

      if (!this.isIndexAtCoord(store, idx, buf.coordX[i], buf.coordY[i])) {
        // Slow path: re-lookup by coord
        const lookedUp = this.lookupIndexByCoord(job.entity, buf.coordX[i], buf.coordY[i]);
        if (lookedUp < 0) {
          // Already removed or moved away irrecoverably; still show FX at coord
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

      this.pickupSpawner.spawnPickupOnBlockDestruction(idx, job.dropRateMulti);
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

    const totalBlocks = ship.getBlockCount?.() ?? 0;
    if (this.shockwaveTimer > SHOCK_WAVE_COOLDOWN) {
      if (totalBlocks > 40) {
        emitHugeShockwave(originX, originY);
        this.shockwaveTimer = 0;
      } else if (totalBlocks > 20) {
        emitDefaultShockwave(originX, originY);
        this.shockwaveTimer = 0;
      }
    }

    // Slightly cheaper int cast than Math.floor
    audioManager.play(this.explosionSounds[(Math.random() * this.explosionSounds.length) | 0], 'sfx', { maxSimultaneous: 5 });

    // Gather indices
    const [indices, count] = this.getIndicesIntoScratch(ship);

    // Prepare connectivity
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
        const key = ((lx & 0xffff) << 16) | (ly & 0xffff);
        if (!connected.has(key)) continue;

        if (buf.count + 1 > buf.capacity) buf = this.ensureSOACapacity(buf, buf.count + 1);

        const j = buf.count++;
        buf.delaysMs[j]  = tMs as unknown as number;          // Uint16 downcast
        buf.blockIndex[j]= idx;
        buf.coordX[j]    = lx;
        buf.coordY[j]    = ly;
        buf.radius[j]    = 50 + this.nextRandom(this.radiusRandBuffer) * 40;
        buf.scale[j]     = 0.5 + this.nextRandom(this.scaleRandBuffer)  * 0.5;

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
        const key = ((lx & 0xffff) << 16) | (ly & 0xffff);
        if (connected.has(key)) continue;
      }

      // jittered delay: base 5ms + [0..500]ms
      const jitterMs = (this.nextRandom(this.delayRandBuffer) * 500) | 0;
      tMs += 5 + jitterMs;
      if (tMs > 65535) tMs = 65535;

      if (buf.count + 1 > buf.capacity) buf = this.ensureSOACapacity(buf, buf.count + 1);

      const j = buf.count++;
      buf.delaysMs[j]  = tMs as unknown as number;
      buf.blockIndex[j]= idx;
      buf.coordX[j]    = lx;
      buf.coordY[j]    = ly;
      buf.radius[j]    = 60 + this.nextRandom(this.radiusRandBuffer) * 20;
      buf.scale[j]     = 0.5 + this.nextRandom(this.scaleRandBuffer)  * 0.3;
    }

    ship.setDestructionCause(cause);

    // Register job
    this.activeDestructions.set(entityId, {
      entity: ship,
      buf,
      elapsed: 0,
      originX, originY, rotation,
      dropRateMulti: ship.getAffixes?.().blockDropRateMulti ?? 1,
    });
  }

  // ── Indices helper ──────────────────────────────────────────────────────
  private getIndicesIntoScratch(ship: Ship): [Uint32Array, number] {
    const view: any = (ship as any).getAllBlockIndicesView?.();
    if (view && typeof view.length === 'number') {
      const len = view.length >>> 0;
      if (this.indicesScratch.length < len) {
        this.indicesScratch = new Uint32Array(this.nextPow2(len));
      }
      for (let i = 0; i < len; i++) this.indicesScratch[i] = view[i] >>> 0;
      return [this.indicesScratch, len];
    }

    // Fallback: iterate the iterator into scratch
    let needed = 0;
    const expected = ship.getBlockCount?.();
    const minCap = expected && expected > 0 ? expected : 64;
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
}
