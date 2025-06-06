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
}

export class ShipConstructionAnimatorService {
  private readonly activeShips: ConstructingShipState[] = [];

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

  constructor(playerShip: Ship, camera: Camera, canvasManager: CanvasManager) {
    this.playerShip = playerShip;
    this.camera = camera;
    this.ctx = canvasManager.getCanvas('fx').getContext('2d')!;
  }

  public animateShipConstruction(ship: Ship): void {
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
    });
  }

  public update(dt: number): void {
    const ms = dt * 1000;

    for (let i = this.activeShips.length - 1; i >= 0; i--) {
      const state = this.activeShips[i];
      state.timeSinceLastReveal += ms;

      let revealsThisFrame = 0;

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
        revealsThisFrame++;

        // === Play sound with increasing pitch ===
        const pitch = Math.min(this.basePitch + state.blocksRevealed * this.pitchIncrement, this.maxPitch);

        playSpatialSfx(state.ship, this.playerShip, {
          file: 'assets/sounds/sfx/ship/gather_00.wav',
          channel: 'sfx',
          baseVolume: 1,
          pitchRange: [pitch, pitch], // static pitch
          volumeJitter: 0.2,
          maxSimultaneous: 5,
        });

        // === Deterministic linear interval decay ===
        const initial = this.startBlockRevealInterval; // 400ms
        const decrement = this.decrementPerBlock;
        const minInterval = this.finalBlockRevealInterval; // 10ms

        state.blockRevealInterval = Math.max(
          minInterval,
          initial - decrement * state.blocksRevealed
        );

        state.blocksRevealed++; // <-- increment after use
      }

      // Decrement animation timers
      for (const [key, time] of state.animationTimers.entries()) {
        const newTime = time - ms;
        if (newTime <= 0) {
          state.animationTimers.delete(key);
        } else {
          state.animationTimers.set(key, newTime);
        }
      }

      // Remove completed ship
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
        }
      } else if (state.phase === 'shockwave') {
        state.shockwaveTimer -= ms;
        if (state.shockwaveTimer <= 0) {
          this.activeShips.splice(i, 1);
        }
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

        // Skip if not in shockwave phase
        if (shipState.phase !== 'shockwave') continue;

        const shipTransform = parent.getTransform();
        const shipScreen = this.camera.worldToScreen(shipTransform.position.x, shipTransform.position.y);

        const shockwaveProgress = 1 - shipState.shockwaveTimer / this.animationDuration;

        const blockCount = parent.getBlockMap().size;
        const baseRadius = 250;
        const scaleFactor = Math.sqrt(blockCount) * 20;
        const maxRadius = (baseRadius + scaleFactor) * this.camera.zoom;
        const thickness = Math.max(8, Math.sqrt(blockCount) * 2) * this.camera.zoom;

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

