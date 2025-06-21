// src/systems/fx/ShieldEffectsSystem.ts

import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import { CanvasManager } from '@/core/CanvasManager';
import { Camera } from '@/core/Camera';
import { drawBlockHighlightWithMask } from '@/rendering/primitives/HighlightUtils';
import { BLOCK_SIZE } from '@/config/view';
import { ShipRegistry } from '@/game/ship/ShipRegistry';
import { SHIELD_COLOR_PALETTES, SHIELDED_BLOCK_HIGHLIGHT_COLOR_PALETTES } from '@/game/blocks/BlockColorSchemes';

interface ShieldVisual {
  block: BlockInstance;
  radius: number;
  age: number;
}

export class ShieldEffectsSystem {
  private static instance: ShieldEffectsSystem | null = null;

  private ctx: CanvasRenderingContext2D;
  private camera: Camera;
  private activeVisuals: ShieldVisual[] = [];

  private shieldedBlocks: Set<BlockInstance> = new Set();

  private constructor(canvasManager: CanvasManager, camera: Camera) {
    this.ctx = canvasManager.getContext('fx');
    this.camera = camera;
  }

  public static getInstance(): ShieldEffectsSystem {
    if (!ShieldEffectsSystem.instance) {
      throw new Error('ShieldEffectsSystem not initialized. Call initialize(canvasManager, camera) first.');
    }
    return ShieldEffectsSystem.instance;
  }

  public static initialize(canvasManager: CanvasManager, camera: Camera): void {
    if (!ShieldEffectsSystem.instance) {
      ShieldEffectsSystem.instance = new ShieldEffectsSystem(canvasManager, camera);
    }
  }

  public registerShield(block: BlockInstance, radius: number): void {
    this.activeVisuals.push({ block, radius, age: 0 });
  }

  public registerShieldedBlock(block: BlockInstance): void {
    this.shieldedBlocks.add(block);
  }

  public unregisterShieldedBlock(block: BlockInstance): void {
    this.shieldedBlocks.delete(block);
  }

  public clearShieldedBlocks(): void {
    this.shieldedBlocks.clear();
  }

  /** Removes all visuals associated with a given ship */
  public clearVisualsForShip(shipId: string): void {
    this.activeVisuals = this.activeVisuals.filter(v => v.block.ownerShipId !== shipId);
    for (const block of Array.from(this.shieldedBlocks)) {
      if (block.ownerShipId === shipId) {
        this.shieldedBlocks.delete(block);
      }
    }
  }

  public update(dt: number): void {
    for (const visual of this.activeVisuals) {
      visual.age += dt;
    }

    // Retain visuals only for current emitters (i.e. blocks with isShielded + shieldRadius)
    this.activeVisuals = this.activeVisuals.filter(v =>
      v.block.type.behavior?.shieldRadius != null || v.block.isShielded
    );
  }

  public render(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.camera.getZoom(), this.camera.getZoom());

    // === 1. Render radial shield circles around active emitter blocks
    for (const visual of this.activeVisuals) {
      const blockPos = visual.block.position;
      if (!blockPos) continue;
      const screen = this.camera.worldToScreen(blockPos.x, blockPos.y);
      const x = screen.x / this.camera.getZoom();
      const y = screen.y / this.camera.getZoom();

      const radius = visual.radius;
      const alpha = 0.75 + 0.1 * Math.sin(visual.age * 3);

      const palette = SHIELD_COLOR_PALETTES[visual.block.type.id] ?? ['#88ddff', '#44bbff', '#00aaff'];
      const [innerColor, midColor, outerColor] = palette;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, innerColor + `${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`);
      gradient.addColorStop(1, outerColor + '00');

      ctx.globalAlpha = alpha;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // === 2. Render cyan highlights on registered shielded blocks
    for (const block of this.shieldedBlocks) {
      const ship = ShipRegistry.getInstance().getById(block.ownerShipId);
      if (!ship) continue;

      const coord = ship.getBlockCoord(block);
      if (!coord) continue;

      const transform = ship.getTransform();

      const localX = coord.x * BLOCK_SIZE;
      const localY = coord.y * BLOCK_SIZE;

      const cos = Math.cos(transform.rotation);
      const sin = Math.sin(transform.rotation);

      const rotatedX = localX * cos - localY * sin;
      const rotatedY = localX * sin + localY * cos;

      const worldX = transform.position.x + rotatedX;
      const worldY = transform.position.y + rotatedY;

      const screen = this.camera.worldToScreen(worldX, worldY);

      ctx.save();
      ctx.translate(screen.x / this.camera.getZoom(), screen.y / this.camera.getZoom());
      ctx.rotate(transform.rotation);
      const glowColor = block.shieldHighlightColor ?? 'rgba(255, 0, 0, 0.4)';
      drawBlockHighlightWithMask(ctx, block.type.id, block.rotation, glowColor);
      ctx.restore();
    }
    ctx.restore();
  }

  public clear(): void {
    this.activeVisuals.length = 0;
    this.shieldedBlocks.clear();
  }
}
