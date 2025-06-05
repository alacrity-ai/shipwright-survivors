import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { Camera } from '@/core/Camera';
import type { CanvasManager } from '@/core/CanvasManager';

import { Ship } from '@/game/ship/Ship';
import { BLOCK_SIZE } from '@/game/blocks/BlockRegistry';
import { toKey, fromKey } from '@/game/ship/utils/shipBlockUtils';
import { BlockToObjectIndex } from '@/game/blocks/BlockToObjectIndexRegistry';
import { drawBlockHighlightWithMask } from '@/rendering/primitives/HighlightUtils';
import { drawShockwave } from '@/game/ship/utils/drawShockwave';
import { playSpatialSfx } from '@/audio/utils/playSpatialSfx';

interface ConstructingShipState {
  ship: Ship;
  queue: [GridCoord, BlockInstance][];
  revealed: Set<string>;
  animationTimers: Map<string, number>;
  timeSinceLastReveal: number;
  blockRevealInterval: number;
  totalBlockCount: number;
}

export class ShipConstructionAnimatorService {
  private readonly activeShips: ConstructingShipState[] = [];

  private readonly animationDuration = 500; // ms
  private readonly startBlockRevealInterval = 360; // ms
  private readonly finalBlockRevealInterval = 30;  // ms
  private readonly decayFactor = 5; // exponential decay aggressiveness

  private readonly playerShip: Ship;
  private readonly camera: Camera;
  private readonly ctx: CanvasRenderingContext2D;

  constructor(playerShip: Ship, camera: Camera, canvasManager: CanvasManager) {
    this.playerShip = playerShip;
    this.camera = camera;
    this.ctx = canvasManager.getCanvas('fx').getContext('2d')!;
  }

  public animateShipConstruction(ship: Ship): void {
    const blocks = ship.getAllBlocks();
    console.log('Constructing SHIP: ', ship.id);

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
    });

    playSpatialSfx(ship, this.playerShip, {
      file: 'assets/sounds/sfx/ship/repair_00.wav',
      channel: 'sfx',
      baseVolume: 1,
      pitchRange: [0.7, 1.2],
      volumeJitter: 0.2,
    });
  }

  public update(dt: number): void {
    const ms = dt * 1000;

    for (let i = this.activeShips.length - 1; i >= 0; i--) {
      const state = this.activeShips[i];
      state.timeSinceLastReveal += ms;

      let revealsThisFrame = 0;

      if (state.timeSinceLastReveal >= state.blockRevealInterval && state.queue.length > 0) {
        const [coord, block] = state.queue.shift()!;
        block.hidden = false;
        const key = toKey(coord);
        state.revealed.add(key);
        state.animationTimers.set(key, this.animationDuration);
        state.timeSinceLastReveal = 0;
        revealsThisFrame++;

        // === Decay the interval toward finalBlockRevealInterval ===
        const progress = state.revealed.size / state.totalBlockCount;
        const decay = Math.exp(-this.decayFactor * progress);
        state.blockRevealInterval =
          this.finalBlockRevealInterval +
          (this.startBlockRevealInterval - this.finalBlockRevealInterval) * decay;
      }

      for (const [key, time] of state.animationTimers.entries()) {
        const newTime = time - ms;
        if (newTime <= 0) {
          state.animationTimers.delete(key);
        } else {
          state.animationTimers.set(key, newTime);
        }
      }

      if (state.revealed.size === state.ship.getBlockCount()) {
        this.activeShips.splice(i, 1);
      }

      if (revealsThisFrame > 0) {
        console.log(
          `Revealed ${revealsThisFrame} block(s) on ship ${state.ship.id} (interval = ${Math.round(
            state.blockRevealInterval
          )}ms)`
        );
      }
    }
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
        
        const shipTransform = parent.getTransform();
        const shipScreen = this.camera.worldToScreen(shipTransform.position.x, shipTransform.position.y);
        
        // Calculate progress for the shockwave (0 = start, 1 = end)
        const shockwaveProgress = 1 - timer / this.animationDuration;
        
        // Scale shockwave size based on ship's block count
        const blockCount = parent.getBlockMap().size;
        const baseRadius = 150; // Minimum radius for small ships
        const scaleFactor = Math.sqrt(blockCount) * 20; // Scale with square root for better visual balance
        const maxRadius = (baseRadius + scaleFactor) * this.camera.zoom;
        const thickness = Math.max(8, Math.sqrt(blockCount) * 2) * this.camera.zoom;
        
        // Draw the shockwave at the ship's center
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
      this.ctx.scale(this.camera.zoom, this.camera.zoom);

      // Apply local block rotation (not ship rotation)
      const blockRotation = (block.rotation ?? 0) * Math.PI / 180;
      this.ctx.rotate(blockRotation);

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

