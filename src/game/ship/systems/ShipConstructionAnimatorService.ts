import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { Camera } from '@/core/Camera';
import type { CanvasManager } from '@/core/CanvasManager';
import type { AuraLightOptions } from '@/game/ship/ShipFactory';

import { constructionFrameBudgetMs } from '@/config/graphicsConfig';

import { Ship } from '@/game/ship/Ship';
import { BLOCK_SIZE } from '@/config/view';
import { toKey, fromKey } from '@/game/ship/utils/shipBlockUtils';
import { BlockToObjectIndex } from '@/game/blocks/BlockToObjectIndexRegistry';
import { drawBlockHighlightWithMask } from '@/rendering/primitives/HighlightUtils';
import { drawShockwave } from '@/game/ship/utils/drawShockwave';
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
  private activeShips: ConstructingShipState[] = [];

  private readonly animationDuration = 500;
  private readonly startBlockRevealInterval = 200; // ms
  private readonly decrementPerBlock = 5;
  private readonly finalBlockRevealInterval = 5;  // ms

  private readonly basePitch = 0.5;
  private readonly pitchIncrement = 0.03;
  private readonly maxPitch = 2;

  private readonly playerShip: Ship;
  private readonly camera: Camera;
  private readonly ctx: CanvasRenderingContext2D;

  private frameBudgetMs: number = constructionFrameBudgetMs;
  private lastShipIndex: number = 0;

  constructor(playerShip: Ship, camera: Camera, canvasManager: CanvasManager) {
    this.playerShip = playerShip;
    this.camera = camera;
    this.ctx = canvasManager.getCanvas('fx').getContext('2d')!;
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
    const now = performance.now();
    const deadline = now + this.frameBudgetMs;

    const total = this.activeShips.length;
    if (total === 0) return;

    let index = this.lastShipIndex % total;
    let processed = 0;

    const shipsToRemove = new Set<ConstructingShipState>();

    for (; processed < total; processed++) {
      const state = this.activeShips[index];
      if (!state) break;

      state.timeSinceLastReveal += ms;

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
          shipsToRemove.add(state);
        }
      }

      index = (index + 1) % total;
    }

    this.lastShipIndex = 0;
    this.activeShips = this.activeShips.filter(s => !shipsToRemove.has(s));
  }

  public render(dt: number): void {
    const playerPos = this.playerShip.getTransform().position;
    const grid = this.playerShip.getGrid();

    const viewRadius = 3000;
    const minX = playerPos.x - viewRadius;
    const minY = playerPos.y - viewRadius;
    const maxX = playerPos.x + viewRadius;
    const maxY = playerPos.y + viewRadius;

    const nearbyBlocks = grid.getBlocksInArea(minX, minY, maxX, maxY);

    // Track ships that have been processed for shockwaves
    const processedShips = new Set<Ship>();

    for (const block of nearbyBlocks) {
      const parent = BlockToObjectIndex.getObject(block);
      if (!parent || !(parent instanceof Ship)) continue;

      const shipState = this.activeShips.find(s => s.ship === parent);
      if (!shipState) continue;

      const coord = [...shipState.ship.getBlockMap().entries()]
        .find(([, b]) => b === block)?.[0];
      if (!coord) continue;

      const key = coord;
      const timer = shipState.animationTimers.get(key);
      if (!timer) continue;

      // Draw shockwave for this ship (only once per ship)
      if (!processedShips.has(parent)) {
        processedShips.add(parent);

        // Skip if not in shockwave phase
        if (shipState.phase !== 'shockwave') continue;

        const shipTransform = parent.getTransform();
        const shipScreen = this.camera.worldToScreen(shipTransform.position.x, shipTransform.position.y);

        const shockwaveProgress = 1 - shipState.shockwaveTimer / this.animationDuration;

        const blockCount = parent.getBlockMap().size;
        const baseRadius = 250;
        const scaleFactor = Math.sqrt(blockCount) * 20;
        const maxRadius = (baseRadius + scaleFactor) * this.camera.getZoom();
        const thickness = Math.max(8, Math.sqrt(blockCount) * 2) * this.camera.getZoom();

        drawShockwave(
          this.ctx,
          shipScreen.x,
          shipScreen.y,
          shockwaveProgress,
          maxRadius,
          '#00AAFF',
          thickness
        );
      }

      const transform = parent.getTransform();
      const local = fromKey(coord);

      // Step 1: local block grid coord → block-local position
      const localX = local.x * BLOCK_SIZE;
      const localY = local.y * BLOCK_SIZE;

      // Step 2: rotate into world-space using ship transform
      const cos = Math.cos(transform.rotation);
      const sin = Math.sin(transform.rotation);
      const rotatedX = localX * cos - localY * sin;
      const rotatedY = localX * sin + localY * cos;

      const worldX = transform.position.x + rotatedX;
      const worldY = transform.position.y + rotatedY;

      // Step 3: convert to screen space
      const screen = this.camera.worldToScreen(worldX, worldY);

      const progress = 1 - timer / this.animationDuration;
      const alpha = (1 - progress) * 0.6;

      this.ctx.save();
      this.ctx.translate(screen.x, screen.y);
      this.ctx.scale(this.camera.getZoom(), this.camera.getZoom());

      // // Apply local block rotation (not ship rotation)
      // const blockRotation = (block.rotation ?? 0) * Math.PI / 180;
      // this.ctx.rotate(blockRotation);

      drawBlockHighlightWithMask(
        this.ctx,
        block.type.id,
        block.rotation ?? 0,
        `rgba(0,255,255,${alpha.toFixed(3)})`
      );

      this.ctx.restore();
    }
  }
}

