// src/systems/fx/ShieldEffectsSystem.ts

import { CanvasManager } from '@/core/CanvasManager';
import { Camera } from '@/core/Camera';
import { drawBlockHighlightWithMask } from '@/rendering/primitives/HighlightUtils';
import { BLOCK_SIZE } from '@/config/view';
import { ShipRegistry } from '@/game/ship/ShipRegistry';
import { SHIELD_COLOR_PALETTES } from '@/game/blocks/BlockColorSchemes';
import { BlockManager } from '@/game/blocks/system/BlockManager';
import { getBlockTypeByIndex } from '@/game/blocks/BlockRegistry';

interface ShieldVisual {
  blockIndex: number;  // SOA block index
  radius: number;
  age: number;
}

export class ShieldEffectsSystem {
  private static instance: ShieldEffectsSystem | null = null;

  private ctx: CanvasRenderingContext2D;
  private camera: Camera;
  private activeVisuals: ShieldVisual[] = [];

  private shieldedBlocks: Set<number> = new Set(); // store block indices

  private constructor(canvasManager: CanvasManager, camera: Camera) {
    this.ctx = canvasManager.getContext('overlay'); // TODO: migrate to WebGL2
    this.camera = camera;
  }

  public static getInstance(): ShieldEffectsSystem {
    if (!ShieldEffectsSystem.instance) {
      throw new Error('ShieldEffectsSystem not initialized. Call initialize() first.');
    }
    return ShieldEffectsSystem.instance;
  }

  public static initialize(canvasManager: CanvasManager, camera: Camera): void {
    if (!ShieldEffectsSystem.instance) {
      ShieldEffectsSystem.instance = new ShieldEffectsSystem(canvasManager, camera);
    }
  }

  /** Registers a shield emitter visual (circle FX) */
  public registerShield(blockIndex: number, radius: number): void {
    this.activeVisuals.push({ blockIndex, radius, age: 0 });
  }

  /** Registers a block as visually shielded (cyan highlight) */
  public registerShieldedBlock(blockIndex: number): void {
    this.shieldedBlocks.add(blockIndex);
  }

  public unregisterShieldedBlock(blockIndex: number): void {
    this.shieldedBlocks.delete(blockIndex);
  }

  public clearShieldedBlocks(): void {
    this.shieldedBlocks.clear();
  }

  /** Removes all visuals associated with a given ship */
  public clearVisualsForShip(shipNumericId: number): void {
    const store = BlockManager.getInstance().getBlockStore();

    this.activeVisuals = this.activeVisuals.filter(
      v => store.ownerShipId[v.blockIndex] !== shipNumericId
    );

    for (const idx of Array.from(this.shieldedBlocks)) {
      if (store.ownerShipId[idx] === shipNumericId) {
        this.shieldedBlocks.delete(idx);
      }
    }
  }

  public update(dt: number): void {
    const store = BlockManager.getInstance().getBlockStore();

    for (const visual of this.activeVisuals) {
      visual.age += dt;
    }

    // Retain visuals only for valid emitters (still allocated and has any shield effect)
    this.activeVisuals = this.activeVisuals.filter(v => {
      const idx = v.blockIndex;
      return (
        store.isAllocated(idx) &&
        (store.shieldEfficiency[idx] > 0 || store.shieldRadius[idx] > 0)
      );
    });
  }

  public render(): void {
    const ctx = this.ctx;
    const store = BlockManager.getInstance().getBlockStore();

    ctx.save();
    ctx.scale(this.camera.getZoom(), this.camera.getZoom());

    // === 1. Render radial shield bubbles around emitter blocks
    for (const visual of this.activeVisuals) {
      const idx = visual.blockIndex;
      if (!store.isAllocated(idx)) continue;

      const worldX = store.worldX[idx];
      const worldY = store.worldY[idx];
      const screen = this.camera.worldToScreen(worldX, worldY);
      const x = screen.x / this.camera.getZoom();
      const y = screen.y / this.camera.getZoom();

      const radius = visual.radius;
      const alpha = 0.75 + 0.1 * Math.sin(visual.age * 3);

      // Use tier directly to select palette
      const tier = store.tier[idx];
      const palette = SHIELD_COLOR_PALETTES[tier] ?? ['#88ddff', '#44bbff', '#00aaff'];
      const [innerColor, , outerColor] = palette;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, innerColor + `${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`);
      gradient.addColorStop(1, outerColor + '00');

      ctx.globalAlpha = alpha;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // === 2. Render cyan highlights for shielded blocks
    for (const idx of this.shieldedBlocks) {
      if (!store.isAllocated(idx)) continue;

      const ship = ShipRegistry.getInstance().getByNumericId(store.ownerShipId[idx]);
      if (!ship) continue;

      const localX = store.localX[idx] * BLOCK_SIZE;
      const localY = store.localY[idx] * BLOCK_SIZE;

      const transform = ship.getTransform();
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

      // Need to render this in EntityPass WebGL2
      // // Mask highlight (legacy 2D fallback, slated for removal in WebGL2)
      // const packedColor = store.shieldHighlightColor[idx];
      // const glowColor = typeof packedColor === 'number'
      //   ? `#${(packedColor >>> 0).toString(16).padStart(8, '0')}`
      //   : 'rgba(255, 0, 0, 0.4)';

      // // // Pass tier or id? We only need tier now (remove id dependency entirely)
      // // drawBlockHighlightWithMask(ctx, `tier-${store.tier[idx]}`, store.localRotation[idx], glowColor);

      ctx.restore();
    }

    ctx.restore();
  }

  
  public clear(): void {
    this.activeVisuals.length = 0;
    this.shieldedBlocks.clear();
  }
}
