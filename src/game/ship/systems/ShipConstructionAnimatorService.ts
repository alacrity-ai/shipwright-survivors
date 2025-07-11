// src/game/ship/systems/ShipConstructionAnimatorService.ts

import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { AuraLightOptions } from '@/game/ship/factories/ShipFactory';

import { constructionFrameBudgetMs } from '@/config/graphicsConfig';
import { Ship } from '@/game/ship/Ship';
import { toKey, getWorldPositionFromShipCoord } from '@/game/ship/utils/shipBlockUtils';
import { ShipBuilderEffectsSystem } from '@/systems/fx/ShipBuilderEffectsSystem';
import { playSpatialSfx } from '@/audio/utils/playSpatialSfx';

type ConstructionPhase = 'building' | 'shockwave';
type DeconstructionPhase = 'deconstructing' | 'complete';

interface ConstructingShipState {
  ship: Ship;
  queue: [GridCoord, BlockInstance][];
  revealed: Set<string>;
  animationTimers: Map<string, number>;
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
  queue: [GridCoord, BlockInstance][];
  hidden: Set<string>;
  animationTimers: Map<string, number>;
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
    const blocks = ship.getAllBlocks();

    for (const [, block] of blocks) {
      block.hidden = true;
    }

    this.activeShips.push({
      ship,
      queue: [...blocks],
      revealed: new Set(),
      animationTimers: new Map(),
      timeSinceLastReveal: 0,
      blockRevealInterval: this.startBlockRevealInterval,
      totalBlockCount: blocks.length,
      blocksRevealed: 0,
      phase: 'building',
      shockwaveTimer: this.animationDuration,
      auraLightOptions,
    });
  }

  public animateShipDeconstruction(ship: Ship, onComplete?: () => void): void {
    const blocks = ship.getAllBlocks();

    // Ensure all blocks are visible at start
    for (const [, block] of blocks) {
      block.hidden = false;
    }

    // Remove aura light if present
    if (ship.getLightAuraId()) {
      ship.cleanupAuraLight();
    }

    // Shuffle blocks for more interesting deconstruction pattern
    const shuffledBlocks = [...blocks];
    for (let i = shuffledBlocks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledBlocks[i], shuffledBlocks[j]] = [shuffledBlocks[j], shuffledBlocks[i]];
    }

    this.deconstructingShips.push({
      ship,
      queue: shuffledBlocks,
      hidden: new Set(),
      animationTimers: new Map(),
      timeSinceLastHide: 0,
      blockHideInterval: this.startBlockHideInterval,
      totalBlockCount: blocks.length,
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
    const shipsToRemove = new Set<ConstructingShipState>();

    for (; processed < total; processed++) {
      const state = this.activeShips[index];
      if (!state) break;

      state.timeSinceLastReveal += ms;

      // === Block Reveal Phase ===
      while (
        state.timeSinceLastReveal >= state.blockRevealInterval &&
        state.queue.length > 0
      ) {
        const [coord, block] = state.queue.shift()!;
        block.hidden = false;

        const key = toKey(coord);
        state.revealed.add(key);
        state.animationTimers.set(key, this.animationDuration);
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

        const position = getWorldPositionFromShipCoord(state.ship.getTransform(), coord);
        this.shipBuilderEffectsSystem.createRepairEffect(position);

        state.blockRevealInterval = Math.max(
          this.finalBlockRevealInterval,
          this.startBlockRevealInterval - this.decrementPerBlock * state.blocksRevealed
        );

        state.blocksRevealed++;

        if (performance.now() > deadline) {
          this.lastShipIndex = (index + 1) % total;
          this.activeShips = this.activeShips.filter(s => !shipsToRemove.has(s));
          return;
        }
      }

      // === Timer Cleanup ===
      for (const [key, time] of state.animationTimers.entries()) {
        const newTime = time - ms;
        if (newTime <= 0) {
          state.animationTimers.delete(key);
        } else {
          state.animationTimers.set(key, newTime);
        }

        if (performance.now() > deadline) {
          this.lastShipIndex = (index + 1) % total;
          this.activeShips = this.activeShips.filter(s => !shipsToRemove.has(s));
          return;
        }
      }

      // === Phase Transition ===
      if (state.phase === 'building') {
        if (state.revealed.size === state.ship.getBlockCount()) {
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

          if (state.auraLightOptions) {
            if (!state.ship.isDestroyed()) {
              state.ship.registerAuraLight(
                state.auraLightOptions.color,
                state.auraLightOptions.radius,
                state.auraLightOptions.intensity
              );
            }
          }
        }
      } else if (state.phase === 'shockwave') {
        state.shockwaveTimer -= ms;
        if (state.shockwaveTimer <= 0) {
          state.ship.setConstructed(true);
          shipsToRemove.add(state);
        }
      }

      index = (index + 1) % total;
    }

    this.lastShipIndex = 0;
    this.activeShips = this.activeShips.filter(s => !shipsToRemove.has(s));
  }

  private updateDeconstruction(ms: number, deadline: number): void {
    const total = this.deconstructingShips.length;
    if (total === 0) return;

    let index = this.lastDeconstructionIndex % total;
    let processed = 0;
    const shipsToRemove = new Set<DeconstructingShipState>();

    for (; processed < total; processed++) {
      const state = this.deconstructingShips[index];
      if (!state) break;

      state.timeSinceLastHide += ms;

      // === Block Hide Phase ===
      while (
        state.timeSinceLastHide >= state.blockHideInterval &&
        state.queue.length > 0 &&
        state.phase === 'deconstructing'
      ) {
        const [coord, block] = state.queue.shift()!;
        block.hidden = true;

        const key = toKey(coord);
        state.hidden.add(key);
        state.animationTimers.set(key, this.animationDuration);
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

        const position = getWorldPositionFromShipCoord(state.ship.getTransform(), coord);
        this.shipBuilderEffectsSystem.createRepairEffect(position);

        state.blockHideInterval = Math.max(
          this.finalBlockHideInterval,
          this.startBlockHideInterval - this.deconstructionDecrementPerBlock * state.blocksHidden
        );

        state.blocksHidden++;

        if (performance.now() > deadline) {
          this.lastDeconstructionIndex = (index + 1) % total;
          this.deconstructingShips = this.deconstructingShips.filter(s => !shipsToRemove.has(s));
          return;
        }
      }

      // === Timer Cleanup ===
      for (const [key, time] of state.animationTimers.entries()) {
        const newTime = time - ms;
        if (newTime <= 0) {
          state.animationTimers.delete(key);
        } else {
          state.animationTimers.set(key, newTime);
        }

        if (performance.now() > deadline) {
          this.lastDeconstructionIndex = (index + 1) % total;
          this.deconstructingShips = this.deconstructingShips.filter(s => !shipsToRemove.has(s));
          return;
        }
      }

      // === Phase Transition ===
      if (state.phase === 'deconstructing') {
        if (state.hidden.size === state.ship.getBlockCount()) {
          state.phase = 'complete';
          state.completeTimer = this.animationDuration;

          // Play completion sound
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
          if (state.onComplete) {
            state.onComplete();
          }
          shipsToRemove.add(state);
        }
      }

      index = (index + 1) % total;
    }

    this.lastDeconstructionIndex = 0;
    this.deconstructingShips = this.deconstructingShips.filter(s => !shipsToRemove.has(s));
  }

  public render(): void {
    // NOOP — all visual effects are now handled via particle system
  }

  public isShipConstructing(ship: Ship): boolean {
    return this.activeShips.some(state => state.ship === ship);
  }

  public isShipDeconstructing(ship: Ship): boolean {
    return this.deconstructingShips.some(state => state.ship === ship);
  }

  public cancelShipConstruction(ship: Ship): void {
    this.activeShips = this.activeShips.filter(state => state.ship !== ship);
  }

  public cancelShipDeconstruction(ship: Ship): void {
    this.deconstructingShips = this.deconstructingShips.filter(state => state.ship !== ship);
  }
}
