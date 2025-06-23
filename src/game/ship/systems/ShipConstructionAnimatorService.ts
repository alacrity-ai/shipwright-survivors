import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { AuraLightOptions } from '@/game/ship/factories/ShipFactory';

import { spawnSpecialFx } from '@/core/interfaces/events/SpecialFxReporter';
import { constructionFrameBudgetMs } from '@/config/graphicsConfig';
import { Ship } from '@/game/ship/Ship';
import { toKey, getWorldPositionFromShipCoord } from '@/game/ship/utils/shipBlockUtils';
import { ShipBuilderEffectsSystem } from '@/systems/fx/ShipBuilderEffectsSystem';
import { playSpatialSfx } from '@/audio/utils/playSpatialSfx';

type ConstructionPhase = 'building' | 'shockwave';

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

export class ShipConstructionAnimatorService {
  private playerShip: Ship | null = null;
  private activeShips: ConstructingShipState[] = [];

  private readonly animationDuration = 500;
  private readonly startBlockRevealInterval = 200;
  private readonly decrementPerBlock = 5;
  private readonly finalBlockRevealInterval = 5;

  private readonly basePitch = 0.5;
  private readonly pitchIncrement = 0.03;
  private readonly maxPitch = 2;

  private frameBudgetMs: number = constructionFrameBudgetMs;
  private lastShipIndex: number = 0;

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

  public update(dt: number): void {
    const ms = dt * 1000;
    const deadline = performance.now() + this.frameBudgetMs;

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
            state.ship.registerAuraLight(
              state.auraLightOptions.color,
              state.auraLightOptions.radius,
              state.auraLightOptions.intensity
            );
          }
        }
      } else if (state.phase === 'shockwave') {
        state.shockwaveTimer -= ms;
        if (state.shockwaveTimer <= 0) {
          // spawnSpecialFx({
          //   worldX: state.ship.getTransform().position.x,
          //   worldY: state.ship.getTransform().position.y,
          //   radius: 1200,
          //   strength: 2.0,
          //   duration: 1.2,
          //   type: 0, // e.g. shockwave
          // });
          shipsToRemove.add(state);
        }
      }

      index = (index + 1) % total;
    }

    this.lastShipIndex = 0;
    this.activeShips = this.activeShips.filter(s => !shipsToRemove.has(s));
  }

  public render(): void {
    // NOOP — all visual effects are now handled via particle system
  }
}
