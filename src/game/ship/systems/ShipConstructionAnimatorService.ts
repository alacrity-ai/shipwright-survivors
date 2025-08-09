// src/game/ship/systems/ShipConstructionAnimatorService.ts

import type { AuraLightOptions } from '@/game/ship/factories/ShipFactory';

import { constructionFrameBudgetMs } from '@/config/graphicsConfig';
import { Ship } from '@/game/ship/Ship';
import { getWorldPositionFromShipCoord } from '@/game/ship/utils/shipBlockUtils';
import { ShipBuilderEffectsSystem } from '@/systems/fx/ShipBuilderEffectsSystem';
import { playSpatialSfx } from '@/audio/utils/playSpatialSfx';
import { createLightFlash } from '@/lighting/helpers/createLightFlash';

type ConstructionPhase = 'building' | 'shockwave';
type DeconstructionPhase = 'deconstructing' | 'complete';

interface ConstructingShipState {
  ship: Ship;

  // Preallocated block queue
  queueIdx: Uint32Array;   // Block indices to reveal
  queueX: Int16Array;      // Local X (for FX)
  queueY: Int16Array;      // Local Y (for FX)
  queueLength: number;     // Total items in queue
  queueCursor: number;     // Next element to process

  revealedKeys: Uint32Array;
  revealedCount: number;

  timerKeys: Uint32Array;
  timerValues: Float32Array;
  timerCount: number;

  timeSinceLastReveal: number;
  blockRevealInterval: number;
  totalBlockCount: number;
  blocksRevealed: number;
  phase: ConstructionPhase;
  shockwaveTimer: number;
  auraLightOptions?: AuraLightOptions;

  _remove?: 0 | 1; // tombstone flag (absent/0 = keep, 1 = remove)
}

interface DeconstructingShipState {
  ship: Ship;

  // Preallocated block queue
  queueIdx: Uint32Array; 
  queueX: Int16Array;
  queueY: Int16Array;
  queueLength: number;
  queueCursor: number;

  hiddenKeys: Uint32Array;
  hiddenCount: number;

  timerKeys: Uint32Array;
  timerValues: Float32Array;
  timerCount: number;

  timeSinceLastHide: number;
  blockHideInterval: number;
  totalBlockCount: number;
  blocksHidden: number;
  phase: DeconstructionPhase;
  completeTimer: number;
  onComplete?: () => void;

  _remove?: 0 | 1; // tombstone flag (absent/0 = keep, 1 = remove)
}

export class ShipConstructionAnimatorService {
  private playerShip: Ship | null = null;
  private activeShips: ConstructingShipState[] = [];
  private deconstructingShips: DeconstructingShipState[] = [];

  private readonly animationDuration = 500;
  private readonly startBlockRevealInterval = 200;
  private readonly decrementPerBlock = 5;
  private readonly finalBlockRevealInterval = 5;

  private scratchConstructRemovals: ConstructingShipState[] = [];
  private scratchDeconstructRemovals: DeconstructingShipState[] = [];

  // cap for animated constructions
  private readonly maxAnimatedConstructions = 10;
  private readonly maxBlocksForFX = 50;

  // instant flash parameters
  private readonly instantFlashRadius = 800; // px world-space
  private readonly instantFlashColor = '#00ffff';
  private readonly shipPositionScratch = { x: 0, y: 0 };

  // Deconstruction timing (faster than construction)
  private readonly startBlockHideInterval = 150;
  private readonly deconstructionDecrementPerBlock = 3;
  private readonly finalBlockHideInterval = 10;

  private readonly basePitch = 0.5;
  private readonly pitchIncrement = 0.03;
  private readonly maxPitch = 2;

  // Deconstruction pitch (descending)
  private readonly deconstructionBasePitch = 1.5;
  private readonly deconstructionPitchDecrement = 0.02;
  private readonly deconstructionMinPitch = 0.3;

  private frameBudgetMs: number = constructionFrameBudgetMs;
  private lastShipIndex: number = 0;
  private lastDeconstructionIndex: number = 0;

  // Reusable scratch for effect position; avoid allocating {x,y} every reveal/hide.
  private readonly fxPosScratch = { x: 0, y: 0 };

  // Reusable SFX option objects; safe in single-threaded main loop.
  private readonly sfxGatherOpts = {
    file: 'assets/sounds/sfx/ship/gather_00.wav',
    channel: 'sfx' as const,
    baseVolume: 1,
    pitchRange: [1, 1] as [number, number],
    volumeJitter: 0.2,
    maxSimultaneous: 5,
  };
  private readonly sfxRepairOpts = {
    file: 'assets/sounds/sfx/ship/repair_00.wav',
    channel: 'sfx' as const,
    baseVolume: 1,
    pitchRange: [1, 1] as [number, number],
    volumeJitter: 0.1,
    maxSimultaneous: 3,
  };
  private readonly sfxDeconGatherOpts = {
    file: 'assets/sounds/sfx/ship/gather_00.wav',
    channel: 'sfx' as const,
    baseVolume: 0.7,
    pitchRange: [1, 1] as [number, number],
    volumeJitter: 0.3,
    maxSimultaneous: 8,
  };
  private readonly sfxDeconRepairOpts = {
    file: 'assets/sounds/sfx/ship/repair_00.wav',
    channel: 'sfx' as const,
    baseVolume: 0.6,
    pitchRange: [1, 1] as [number, number],
    volumeJitter: 0.2,
    maxSimultaneous: 2,
  };

  // Hot-path transform: grid → world (BLOCK_SIZE scaling inline, no heap traffic).
  private worldFromGrid(
    gridX: number, gridY: number,
    shipX: number, shipY: number,
    cos: number, sin: number,
    out: {x:number;y:number}
  ): void {
    const lx = gridX * 32; // BLOCK_SIZE
    const ly = gridY * 32;
    out.x = shipX + lx * cos - ly * sin;
    out.y = shipY + lx * sin + ly * cos;
  }

  constructor(
    private readonly shipBuilderEffectsSystem: ShipBuilderEffectsSystem
  ) {}

  public setPlayerShip(ship: Ship): void {
    this.playerShip = ship;
  }

  // Count only states actively in the 'building' phase.
  private getActiveConstructionCount(): number {
    let n = 0;
    for (let i = 0; i < this.activeShips.length; i++) {
      if (this.activeShips[i].phase === 'building') n++;
    }
    return n;
  }

  // Instant construction path: reveal everything, set constructed, FX flash, SFX, aura/light toggles.
  private instantConstruct(ship: Ship, auraLightOptions?: AuraLightOptions): void {
    const orchestrator = ship.getBlockOrchestrator();
    const store = orchestrator.blockStore;

    // 0-alloc, 0-copy hot-path access
    const indices = orchestrator.getShipBlocksRawArray(ship.numericId);
    const blockCount = orchestrator.getShipBlockCount(ship.numericId);

    if (indices && blockCount) {
      const hidden = store.hidden; // micro-avoid repeated property lookups
      for (let i = 0; i < blockCount; i++) {
        hidden[indices[i]] = 0;
      }
    }

    // Optional aura light (if requested and ship still valid)
    if (auraLightOptions && !ship.isDestroyed()) {
      ship.registerAuraLight(
        auraLightOptions.color,
        auraLightOptions.radius,
        auraLightOptions.intensity
      );
    }

    // Turn on emissive block lights and finalize construction state
    ship.turnOnAllBlockLights();
    ship.setConstructed(true);

    // Position for the flash (ship origin)
    ship.getPositionFast(this.shipPositionScratch);

    // Big cyan flash to denote instant spawn
    createLightFlash(
      this.shipPositionScratch.x,
      this.shipPositionScratch.y,
      this.instantFlashRadius,
      1.4,
      0.5,
      this.instantFlashColor
    );

    // One concise SFX for feedback (low volume to avoid spam)
    playSpatialSfx(ship, this.playerShip, {
      file: 'assets/sounds/sfx/ship/repair_00.wav',
      channel: 'sfx',
      baseVolume: 0.6,
      pitchRange: [0.8, 0.9],
      volumeJitter: 0.1,
      maxSimultaneous: 3,
    });
  }

  public animateShipConstruction(ship: Ship, auraLightOptions?: AuraLightOptions): void {
    // Compute once
    const mustAnimate  = ship.hasTag('alwaysAnimateBuild');
    const overCapacity = this.getActiveConstructionCount() >= this.maxAnimatedConstructions;

    if (!mustAnimate && overCapacity) {
      this.instantConstruct(ship, auraLightOptions);
      return;
    }

    const orchestrator = ship.getBlockOrchestrator();
    const store = orchestrator.blockStore;

    // 0-alloc view: raw backing array + explicit count
    const indices = orchestrator.getShipBlocksRawArray(ship.numericId);
    const blockCount = orchestrator.getShipBlockCount(ship.numericId);
    if (!indices || blockCount === 0) return;

    // Preallocate typed queues (these are the unavoidable per-animation allocations unless you pool)
    const queueIdx = new Uint32Array(blockCount);
    const queueX   = new Int16Array(blockCount); // ensure your grid coords fit [-32768,32767]
    const queueY   = new Int16Array(blockCount);

    // Turn off all block lights to start
    ship.turnOffAllBlockLights();

    // Hoist references for tighter loops
    const hidden = store.hidden;
    const localX = store.localX;
    const localY = store.localY;

    for (let i = 0; i < blockCount; i++) {
      const idx = indices[i];
      hidden[idx] = 1;
      queueIdx[i] = idx;
      queueX[i]   = localX[idx];
      queueY[i]   = localY[idx];
    }

    this.activeShips.push({
      ship,
      queueIdx, queueX, queueY,
      queueLength: blockCount,
      queueCursor: 0,
      revealedKeys: new Uint32Array(blockCount),
      revealedCount: 0,
      timerKeys: new Uint32Array(blockCount),
      timerValues: new Float32Array(blockCount),
      timerCount: 0,
      timeSinceLastReveal: 0,
      blockRevealInterval: this.startBlockRevealInterval,
      totalBlockCount: blockCount,
      blocksRevealed: 0,
      phase: 'building',
      shockwaveTimer: this.animationDuration,
      auraLightOptions,
      _remove: 0,
    });
  }

  public animateShipDeconstruction(ship: Ship, onComplete?: () => void): void {
    const orchestrator = ship.getBlockOrchestrator();
    const store = orchestrator.blockStore;

    // 0-alloc read of indices
    const indices = orchestrator.getShipBlocksRawArray(ship.numericId);
    const blockCount = orchestrator.getShipBlockCount(ship.numericId);
    if (!indices || blockCount === 0) return;

    // Hoist frequently used SOA columns
    const hidden = store.hidden;
    const localX = store.localX;
    const localY = store.localY;

    // Ensure all blocks start visible
    for (let i = 0; i < blockCount; i++) {
      hidden[indices[i]] = 0;
    }

    // Remove aura light if present
    if (ship.getLightAuraId()) {
      ship.cleanupAuraLight();
    }

    // Preallocate typed queue buffers (consider pooling if this runs often)
    const queueIdx = new Uint32Array(blockCount);
    const queueX   = new Int16Array(blockCount); // ensure bounds; use Int32Array if your grid can exceed ±32767
    const queueY   = new Int16Array(blockCount);

    // Populate queues
    for (let i = 0; i < blockCount; i++) {
      const idx = indices[i];
      queueIdx[i] = idx;
      queueX[i]   = localX[idx];
      queueY[i]   = localY[idx];
    }

    // Shuffle queue order (Fisher–Yates on typed buffers)
    for (let i = blockCount - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const tmpIdx = queueIdx[i], tmpX = queueX[i], tmpY = queueY[i];
      queueIdx[i] = queueIdx[j]; queueX[i] = queueX[j]; queueY[i] = queueY[j];
      queueIdx[j] = tmpIdx;      queueX[j] = tmpX;      queueY[j] = tmpY;
    }

    this.deconstructingShips.push({
      ship,
      queueIdx, queueX, queueY,
      queueLength: blockCount,
      queueCursor: 0,

      hiddenKeys:  new Uint32Array(blockCount),
      hiddenCount: 0,

      timerKeys:   new Uint32Array(blockCount),
      timerValues: new Float32Array(blockCount),
      timerCount:  0,

      timeSinceLastHide: 0,
      blockHideInterval: this.startBlockHideInterval,
      totalBlockCount:   blockCount,
      blocksHidden:      0,
      phase:             'deconstructing',
      completeTimer:     this.animationDuration,
      onComplete,
      _remove: 0,
    });

    // Initial deconstruction SFX
    playSpatialSfx(ship, this.playerShip, {
      file: 'assets/sounds/sfx/ship/repair_00.wav',
      channel: 'sfx',
      baseVolume: 0.8,
      pitchRange: [0.4, 0.6],
      volumeJitter: 0.1,
      maxSimultaneous: 3,
    });
  }

  public update(dt: number): void {
    const ms = dt * 1000;
    const deadline = performance.now() + this.frameBudgetMs;

    this.updateConstruction(ms, deadline);
    this.updateDeconstruction(ms, deadline);
  }

  private updateConstruction(ms: number, deadline: number): void {
    const total = this.activeShips.length;
    if (total === 0) return;

    let index = this.lastShipIndex % total;
    let processed = 0;

    const shipsToRemove = this.scratchConstructRemovals;
    shipsToRemove.length = 0;

    // Pull a single timestamp, then only re-check occasionally.
    let now = performance.now();

    for (; processed < total; processed++) {
      const state = this.activeShips[index];
      if (!state) break;

      const orchestrator = state.ship.getBlockOrchestrator();
      const store = orchestrator.blockStore;
      const hidden = store.hidden;

      state.timeSinceLastReveal += ms;

      // Cache transform once per state tick; cache sin/cos.
      const tr = state.ship.getTransform();
      const shipX = tr.position.x;
      const shipY = tr.position.y;
      const cos = Math.cos(tr.rotation);
      const sin = Math.sin(tr.rotation);

      // === Block Reveal Phase ===
      while (
        state.timeSinceLastReveal >= state.blockRevealInterval &&
        state.queueCursor < state.queueLength
      ) {
        const cursorIdx = state.queueCursor++; // 0..queueLength-1
        const idx = state.queueIdx[cursorIdx];
        hidden[idx] = 0;

        // Append revealed + timer (linear write, no holes)
        state.revealedKeys[state.revealedCount++] = idx;

        const tIndex = state.timerCount++;
        state.timerKeys[tIndex] = idx;
        state.timerValues[tIndex] = this.animationDuration;

        state.timeSinceLastReveal -= state.blockRevealInterval;

        // Pitch evolves monotonically; branchless cap
        const pitch = this.basePitch + state.blocksRevealed * this.pitchIncrement;
        this.sfxGatherOpts.pitchRange[0] = this.sfxGatherOpts.pitchRange[1] =
          pitch > this.maxPitch ? this.maxPitch : pitch;
        playSpatialSfx(state.ship, this.playerShip, this.sfxGatherOpts);

        // Grid → world without allocating {x,y}
        const gx = state.queueX[cursorIdx];
        const gy = state.queueY[cursorIdx];
        this.worldFromGrid(gx, gy, shipX, shipY, cos, sin, this.fxPosScratch);
        this.shipBuilderEffectsSystem.createRepairEffect(this.fxPosScratch); // or createRepairEffectXY(...)

        // Interval decay
        const next = this.startBlockRevealInterval - this.decrementPerBlock * state.blocksRevealed;
        state.blockRevealInterval = next > this.finalBlockRevealInterval
          ? next : this.finalBlockRevealInterval;

        state.blocksRevealed++;

        // Re-check time budget every N reveals (e.g., every 8) instead of every iteration
        if ( (cursorIdx & 7) === 0 ) {
          now = performance.now();
          if (now > deadline) {
            this.lastShipIndex = (index + 1) % total;
            this.compactActiveShips();
            return;
          }
        }
      }

      // === Timer Cleanup (in-place compaction) ===
      let write = 0;
      const tVals = state.timerValues;
      const tKeys = state.timerKeys;
      for (let i = 0, n = state.timerCount; i < n; i++) {
        const nt = tVals[i] - ms;
        if (nt > 0) {
          tKeys[write] = tKeys[i];
          tVals[write] = nt;
          write++;
        }
      }
      state.timerCount = write;

      // Budget check once per ship, not multiple times
      now = performance.now();
      if (now > deadline) {
        this.lastShipIndex = (index + 1) % total;
        this.compactActiveShips();
        return;
      }

      // === Phase Transition ===
      if (state.phase === 'building') {
        // Use cached totalBlockCount instead of ship.getBlockCount()
        if (state.revealedCount === state.totalBlockCount) {
          state.phase = 'shockwave';
          state.shockwaveTimer = this.animationDuration;

          this.sfxRepairOpts.baseVolume = 1;
          this.sfxRepairOpts.pitchRange[0] = 0.7;
          this.sfxRepairOpts.pitchRange[1] = 1.2;
          playSpatialSfx(state.ship, this.playerShip, this.sfxRepairOpts);

          if (state.auraLightOptions && !state.ship.isDestroyed()) {
            state.ship.registerAuraLight(
              state.auraLightOptions.color,
              state.auraLightOptions.radius,
              state.auraLightOptions.intensity
            );
          }
          state.ship.turnOnAllBlockLights();
        }
      } else if (state.phase === 'shockwave') {
        state.shockwaveTimer -= ms;
        if (state.shockwaveTimer <= 0) {
          state.ship.setConstructed(true);
          // Reset cursors for reuse; keep arrays to avoid churn
          state.queueCursor = 0;
          state.revealedCount = 0;
          state.blocksRevealed = 0;
          state.timerCount = 0;
          state._remove = 1 as const;
        }
      }

      index = (index + 1) % total;
    }

    this.lastShipIndex = 0;
    this.compactActiveShips();
  }

  private updateDeconstruction(ms: number, deadline: number): void {
    const total = this.deconstructingShips.length;
    if (total === 0) return;

    let index = this.lastDeconstructionIndex % total;
    let processed = 0;

    const shipsToRemove = this.scratchDeconstructRemovals;
    shipsToRemove.length = 0;

    let now = performance.now();

    for (; processed < total; processed++) {
      const state = this.deconstructingShips[index];
      if (!state) break;

      const orchestrator = state.ship.getBlockOrchestrator();
      const store = orchestrator.blockStore;
      const hidden = store.hidden;

      state.timeSinceLastHide += ms;

      // Cache transform once per state tick; cache sin/cos.
      const tr = state.ship.getTransform();
      const shipX = tr.position.x;
      const shipY = tr.position.y;
      const cos = Math.cos(tr.rotation);
      const sin = Math.sin(tr.rotation);

      // === Hide Phase ===
      while (
        state.timeSinceLastHide >= state.blockHideInterval &&
        state.queueCursor < state.queueLength &&
        state.phase === 'deconstructing'
      ) {
        const cursorIdx = state.queueCursor++;
        const idx = state.queueIdx[cursorIdx];
        hidden[idx] = 1;

        state.hiddenKeys[state.hiddenCount++] = idx;

        const tIndex = state.timerCount++;
        state.timerKeys[tIndex] = idx;
        state.timerValues[tIndex] = this.animationDuration;

        state.timeSinceLastHide -= state.blockHideInterval;

        // Pitch down, capped
        let pitch = this.deconstructionBasePitch - state.blocksHidden * this.deconstructionPitchDecrement;
        if (pitch < this.deconstructionMinPitch) pitch = this.deconstructionMinPitch;
        this.sfxDeconGatherOpts.pitchRange[0] = this.sfxDeconGatherOpts.pitchRange[1] = pitch;
        playSpatialSfx(state.ship, this.playerShip, this.sfxDeconGatherOpts);

        // Grid → world, no temp objects
        const gx = state.queueX[cursorIdx];
        const gy = state.queueY[cursorIdx];
        this.worldFromGrid(gx, gy, shipX, shipY, cos, sin, this.fxPosScratch);
        this.shipBuilderEffectsSystem.createRepairEffect(this.fxPosScratch);

        // Interval decay
        const next = this.startBlockHideInterval - this.deconstructionDecrementPerBlock * state.blocksHidden;
        state.blockHideInterval = next > this.finalBlockHideInterval
          ? next : this.finalBlockHideInterval;

        state.blocksHidden++;

        if ( (cursorIdx & 7) === 0 ) {
          now = performance.now();
          if (now > deadline) {
            this.lastDeconstructionIndex = (index + 1) % total;
            this.compactDeconstructingShips();
            return;
          }
        }
      }

      // === Timer Cleanup ===
      let write = 0;
      const tVals = state.timerValues;
      const tKeys = state.timerKeys;
      for (let i = 0, n = state.timerCount; i < n; i++) {
        const nt = tVals[i] - ms;
        if (nt > 0) {
          tKeys[write] = tKeys[i];
          tVals[write] = nt;
          write++;
        }
      }
      state.timerCount = write;

      now = performance.now();
      if (now > deadline) {
        this.lastDeconstructionIndex = (index + 1) % total;
        this.compactDeconstructingShips();
        return;
      }

      // === Phase Transition ===
      if (state.phase === 'deconstructing') {
        if (state.hiddenCount === state.totalBlockCount) {
          state.phase = 'complete';
          state.completeTimer = this.animationDuration;

          this.sfxDeconRepairOpts.pitchRange[0] = 0.3;
          this.sfxDeconRepairOpts.pitchRange[1] = 0.5;
          playSpatialSfx(state.ship, this.playerShip, this.sfxDeconRepairOpts);
        }
      } else if (state.phase === 'complete') {
        state.completeTimer -= ms;
        if (state.completeTimer <= 0) {
          state.onComplete?.();
          state.queueCursor = 0;
          state.hiddenCount = 0;
          state.blocksHidden = 0;
          state.timerCount = 0;
          state._remove = 1 as const;
        }
      }

      index = (index + 1) % total;
    }

    this.lastDeconstructionIndex = 0;
    this.compactDeconstructingShips();
  }

  public render(): void {
    // NOOP — all visual effects are now handled via particle system
  }

  public isShipConstructing(ship: Ship): boolean {
    for (let i = 0; i < this.activeShips.length; i++) {
      if (this.activeShips[i].ship === ship) return true;
    }
    return false;
  }

  public isShipDeconstructing(ship: Ship): boolean {
    for (let i = 0; i < this.deconstructingShips.length; i++) {
      if (this.deconstructingShips[i].ship === ship) return true;
    }
    return false;
  }

  public cancelShipConstruction(ship: Ship): void {
    let write = 0;
    for (let i = 0; i < this.activeShips.length; i++) {
      const state = this.activeShips[i];
      if (state.ship !== ship) {
        this.activeShips[write++] = state;
      }
    }
    this.activeShips.length = write;
  }

  public cancelShipDeconstruction(ship: Ship): void {
    let write = 0;
    for (let i = 0; i < this.deconstructingShips.length; i++) {
      const state = this.deconstructingShips[i];
      if (state.ship !== ship) {
        this.deconstructingShips[write++] = state;
      }
    }
    this.deconstructingShips.length = write;
  }

  // == Private Helpers
  private compactActiveShips(): void {
    const arr = this.activeShips;
    let write = 0;
    for (let i = 0, n = arr.length; i < n; i++) {
      const st = arr[i];
      if (st._remove) {
        continue;
      }
      arr[write++] = st;
    }
    arr.length = write;
  }

  private compactDeconstructingShips(): void {
    const arr = this.deconstructingShips;
    let write = 0;
    for (let i = 0, n = arr.length; i < n; i++) {
      const st = arr[i];
      if (st._remove) {
        continue;
      }
      arr[write++] = st;
    }
    arr.length = write;
  }
}
