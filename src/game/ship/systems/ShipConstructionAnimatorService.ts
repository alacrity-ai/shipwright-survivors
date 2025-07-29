// src/game/ship/systems/ShipConstructionAnimatorService.ts

import type { AuraLightOptions } from '@/game/ship/factories/ShipFactory';

import { constructionFrameBudgetMs } from '@/config/graphicsConfig';
import { Ship } from '@/game/ship/Ship';
import { getWorldPositionFromShipCoord } from '@/game/ship/utils/shipBlockUtils';
import { ShipBuilderEffectsSystem } from '@/systems/fx/ShipBuilderEffectsSystem';
import { playSpatialSfx } from '@/audio/utils/playSpatialSfx';

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

  constructor(
    private readonly shipBuilderEffectsSystem: ShipBuilderEffectsSystem
  ) {}

  public setPlayerShip(ship: Ship): void {
    this.playerShip = ship;
  }

  public animateShipConstruction(ship: Ship, auraLightOptions?: AuraLightOptions): void {
    const orchestrator = ship.getBlockOrchestrator();
    const store = orchestrator.blockStore;
    const indices = orchestrator.getShipBlocksView(ship.numericId);
    const blockCount = indices.length;

    // Preallocate typed queue buffers
    const queueIdx = new Uint32Array(blockCount);
    const queueX = new Int16Array(blockCount);
    const queueY = new Int16Array(blockCount);

    // Turn off all block lights to start
    ship.turnOffAllBlockLights();

    for (let i = 0; i < blockCount; i++) {
      const idx = indices[i];

      // Hide each block at the start
      store.hidden[idx] = 1;
      queueIdx[i] = idx;
      queueX[i] = store.localX[idx];
      queueY[i] = store.localY[idx];
    }

    this.activeShips.push({
      ship,

      // Typed queue
      queueIdx,
      queueX,
      queueY,
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
    });
  }

  public animateShipDeconstruction(ship: Ship, onComplete?: () => void): void {
    const orchestrator = ship.getBlockOrchestrator();
    const store = orchestrator.blockStore;
    const indices = orchestrator.getShipBlocksView(ship.numericId);
    const blockCount = indices.length;

    // Ensure all blocks start visible
    for (let i = 0; i < blockCount; i++) {
      const idx = indices[i];
      store.hidden[idx] = 0;
    }

    // Remove aura light if present
    if (ship.getLightAuraId()) {
      ship.cleanupAuraLight();
    }

    // Preallocate typed queue buffers
    const queueIdx = new Uint32Array(blockCount);
    const queueX = new Int16Array(blockCount);
    const queueY = new Int16Array(blockCount);

    for (let i = 0; i < blockCount; i++) {
      const idx = indices[i];
      queueIdx[i] = idx;
      queueX[i] = store.localX[idx];
      queueY[i] = store.localY[idx];
    }

    // Shuffle queue order (Fisher–Yates on typed buffers)
    for (let i = blockCount - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const tmpIdx = queueIdx[i], tmpX = queueX[i], tmpY = queueY[i];
      queueIdx[i] = queueIdx[j]; queueX[i] = queueX[j]; queueY[i] = queueY[j];
      queueIdx[j] = tmpIdx; queueX[j] = tmpX; queueY[j] = tmpY;
    }

    this.deconstructingShips.push({
      ship,

      // Typed queue
      queueIdx,
      queueX,
      queueY,
      queueLength: blockCount,
      queueCursor: 0,

      hiddenKeys: new Uint32Array(blockCount),
      hiddenCount: 0,

      timerKeys: new Uint32Array(blockCount),
      timerValues: new Float32Array(blockCount),
      timerCount: 0,

      timeSinceLastHide: 0,
      blockHideInterval: this.startBlockHideInterval,
      totalBlockCount: blockCount,
      blocksHidden: 0,
      phase: 'deconstructing',
      completeTimer: this.animationDuration,
      onComplete,
    });

    // Play initial deconstruction sound
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
    
    // Use preallocated scratch array for removals
    const shipsToRemove = this.scratchConstructRemovals;
    shipsToRemove.length = 0;

    for (; processed < total; processed++) {
      const state = this.activeShips[index];
      if (!state) break;

      const orchestrator = state.ship.getBlockOrchestrator();
      const store = orchestrator.blockStore;

      state.timeSinceLastReveal += ms;

      // === Block Reveal Phase (cursor-based queue iteration) ===
      while (
        state.timeSinceLastReveal >= state.blockRevealInterval &&
        state.queueCursor < state.queueLength
      ) {
        const idx = state.queueIdx[state.queueCursor++];
        store.hidden[idx] = 0;

        // Append revealed index
        state.revealedKeys[state.revealedCount++] = idx;

        // Add timer
        const tIndex = state.timerCount++;
        state.timerKeys[tIndex] = idx;
        state.timerValues[tIndex] = this.animationDuration;

        state.timeSinceLastReveal -= state.blockRevealInterval;

        const pitch = Math.min(
          this.basePitch + state.blocksRevealed * this.pitchIncrement,
          this.maxPitch
        );

        playSpatialSfx(state.ship, this.playerShip, {
          file: 'assets/sounds/sfx/ship/gather_00.wav',
          channel: 'sfx',
          baseVolume: 1,
          pitchRange: [pitch, pitch],
          volumeJitter: 0.2,
          maxSimultaneous: 5,
        });

        // Safe FX position access with bounds check
        const cursorIdx = state.queueCursor - 1;
        const x = cursorIdx >= 0 && cursorIdx < state.queueLength ? state.queueX[cursorIdx] : 0;
        const y = cursorIdx >= 0 && cursorIdx < state.queueLength ? state.queueY[cursorIdx] : 0;
        
        const position = getWorldPositionFromShipCoord(
          state.ship.getTransform(),
          { x, y }
        );
        this.shipBuilderEffectsSystem.createRepairEffect(position);

        state.blockRevealInterval = Math.max(
          this.finalBlockRevealInterval,
          this.startBlockRevealInterval - this.decrementPerBlock * state.blocksRevealed
        );

        state.blocksRevealed++;

        if (performance.now() > deadline) {
          this.lastShipIndex = (index + 1) % total;
          this.compactActiveShips(shipsToRemove);
          return;
        }
      }

      // === Timer Cleanup ===
      let write = 0;
      for (let i = 0; i < state.timerCount; i++) {
        const newTime = state.timerValues[i] - ms;
        if (newTime > 0) {
          state.timerKeys[write] = state.timerKeys[i];
          state.timerValues[write] = newTime;
          write++;
        }
      }
      state.timerCount = write;

      if (performance.now() > deadline) {
        this.lastShipIndex = (index + 1) % total;
        this.compactActiveShips(shipsToRemove);
        return;
      }

      // === Phase Transition ===
      if (state.phase === 'building') {
        if (state.revealedCount === state.ship.getBlockCount()) {
          state.phase = 'shockwave';
          state.shockwaveTimer = this.animationDuration;

          playSpatialSfx(state.ship, this.playerShip, {
            file: 'assets/sounds/sfx/ship/repair_00.wav',
            channel: 'sfx',
            baseVolume: 1,
            pitchRange: [0.7, 1.2],
            volumeJitter: 0.1,
            maxSimultaneous: 3,
          });
          // Register aura light
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
          // Reset cursor for potential reuse
          state.queueCursor = 0;
          state.revealedCount = 0;
          state.blocksRevealed = 0;
          state.timerCount = 0;
          shipsToRemove.push(state);
        }
      }

      index = (index + 1) % total;
    }

    this.lastShipIndex = 0;
    this.compactActiveShips(shipsToRemove);
  }

  private updateDeconstruction(ms: number, deadline: number): void {
    const total = this.deconstructingShips.length;
    if (total === 0) return;

    let index = this.lastDeconstructionIndex % total;
    let processed = 0;
    
    // Use preallocated scratch array for removals
    const shipsToRemove = this.scratchDeconstructRemovals;
    shipsToRemove.length = 0;

    for (; processed < total; processed++) {
      const state = this.deconstructingShips[index];
      if (!state) break;

      const orchestrator = state.ship.getBlockOrchestrator();
      const store = orchestrator.blockStore;

      state.timeSinceLastHide += ms;

      // === Block Hide Phase (cursor-based queue iteration) ===
      while (
        state.timeSinceLastHide >= state.blockHideInterval &&
        state.queueCursor < state.queueLength &&
        state.phase === 'deconstructing'
      ) {
        const idx = state.queueIdx[state.queueCursor++];
        store.hidden[idx] = 1;

        state.hiddenKeys[state.hiddenCount++] = idx;

        const tIndex = state.timerCount++;
        state.timerKeys[tIndex] = idx;
        state.timerValues[tIndex] = this.animationDuration;

        state.timeSinceLastHide -= state.blockHideInterval;

        const pitch = Math.max(
          this.deconstructionBasePitch - state.blocksHidden * this.deconstructionPitchDecrement,
          this.deconstructionMinPitch
        );

        playSpatialSfx(state.ship, this.playerShip, {
          file: 'assets/sounds/sfx/ship/gather_00.wav',
          channel: 'sfx',
          baseVolume: 0.7,
          pitchRange: [pitch, pitch],
          volumeJitter: 0.3,
          maxSimultaneous: 8,
        });

        // Safe FX position access with bounds check
        const cursorIdx = state.queueCursor - 1;
        const x = cursorIdx >= 0 && cursorIdx < state.queueLength ? state.queueX[cursorIdx] : 0;
        const y = cursorIdx >= 0 && cursorIdx < state.queueLength ? state.queueY[cursorIdx] : 0;
        
        const position = getWorldPositionFromShipCoord(
          state.ship.getTransform(),
          { x, y }
        );
        this.shipBuilderEffectsSystem.createRepairEffect(position);

        state.blockHideInterval = Math.max(
          this.finalBlockHideInterval,
          this.startBlockHideInterval - this.deconstructionDecrementPerBlock * state.blocksHidden
        );

        state.blocksHidden++;

        if (performance.now() > deadline) {
          this.lastDeconstructionIndex = (index + 1) % total;
          this.compactDeconstructingShips(shipsToRemove);
          return;
        }
      }

      // === Timer Cleanup ===
      let write = 0;
      for (let i = 0; i < state.timerCount; i++) {
        const newTime = state.timerValues[i] - ms;
        if (newTime > 0) {
          state.timerKeys[write] = state.timerKeys[i];
          state.timerValues[write] = newTime;
          write++;
        }
      }
      state.timerCount = write;

      if (performance.now() > deadline) {
        this.lastDeconstructionIndex = (index + 1) % total;
        this.compactDeconstructingShips(shipsToRemove);
        return;
      }

      // === Phase Transition ===
      if (state.phase === 'deconstructing') {
        if (state.hiddenCount === state.ship.getBlockCount()) {
          state.phase = 'complete';
          state.completeTimer = this.animationDuration;

          playSpatialSfx(state.ship, this.playerShip, {
            file: 'assets/sounds/sfx/ship/repair_00.wav',
            channel: 'sfx',
            baseVolume: 0.6,
            pitchRange: [0.3, 0.5],
            volumeJitter: 0.2,
            maxSimultaneous: 2,
          });
        }
      } else if (state.phase === 'complete') {
        state.completeTimer -= ms;
        if (state.completeTimer <= 0) {
          state.onComplete?.();
          // Reset cursor for potential reuse
          state.queueCursor = 0;
          state.hiddenCount = 0;
          state.blocksHidden = 0;
          state.timerCount = 0;
          shipsToRemove.push(state);
        }
      }

      index = (index + 1) % total;
    }

    this.lastDeconstructionIndex = 0;
    this.compactDeconstructingShips(shipsToRemove);
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
  private compactActiveShips(removals: ConstructingShipState[]): void {
    if (removals.length === 0) return;

    // GC-neutral compaction using double loop instead of flagging
    let write = 0;
    for (let i = 0; i < this.activeShips.length; i++) {
      const state = this.activeShips[i];
      let shouldRemove = false;
      
      // Check if this state is in the removal list
      for (let j = 0; j < removals.length; j++) {
        if (removals[j] === state) {
          shouldRemove = true;
          break;
        }
      }
      
      if (!shouldRemove) {
        this.activeShips[write++] = state;
      }
    }

    this.activeShips.length = write;
    removals.length = 0;
  }

  private compactDeconstructingShips(removals: DeconstructingShipState[]): void {
    if (removals.length === 0) return;

    // GC-neutral compaction using double loop instead of flagging
    let write = 0;
    for (let i = 0; i < this.deconstructingShips.length; i++) {
      const state = this.deconstructingShips[i];
      let shouldRemove = false;
      
      // Check if this state is in the removal list
      for (let j = 0; j < removals.length; j++) {
        if (removals[j] === state) {
          shouldRemove = true;
          break;
        }
      }
      
      if (!shouldRemove) {
        this.deconstructingShips[write++] = state;
      }
    }

    this.deconstructingShips.length = write;
    removals.length = 0;
  }
}
