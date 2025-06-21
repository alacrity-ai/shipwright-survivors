// src/rendering/unified/services/ShipRasterizationService.ts

import type { Ship } from '@/game/ship/Ship';
import { getDamageLevel, getBlockSprite } from '@/rendering/cache/BlockSpriteCache';
import { createGL2TextureFromCanvasFlipped } from '@/rendering/gl/glTextureUtils';
import { BLOCK_SIZE } from '@/config/view';

export interface RasterizedShipTexture {
  texture: WebGLTexture;
  offset: { x: number; y: number }; // in world units from ship origin (always {0,0} here)
  size: { width: number; height: number }; // in pixels
}

export class ShipRasterizationService {
  constructor(private readonly gl: WebGL2RenderingContext) {}

  rasterize(entity: Ship): RasterizedShipTexture | null {
    const blocks = Array.from(entity.getAllBlocks()).filter(([, block]) => !block.hidden);
    if (blocks.length === 0) {
      console.warn('[ShipRasterizationService] Ship has no visible blocks');
      return null;
    }

    // === Step 1: Determine max reach from origin in both axes ===
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [coord] of blocks) {
      minX = Math.min(minX, coord.x);
      minY = Math.min(minY, coord.y);
      maxX = Math.max(maxX, coord.x);
      maxY = Math.max(maxY, coord.y);
    }

    const maxDeltaX = Math.max(Math.abs(minX), Math.abs(maxX));
    const maxDeltaY = Math.max(Math.abs(minY), Math.abs(maxY));
    const maxDelta = Math.max(maxDeltaX, maxDeltaY); // ensures square bounding area

    const blocksPerSide = maxDelta * 2 + 1;
    const canvasSize = blocksPerSide * BLOCK_SIZE;

    // === Step 2: Create and fill square canvas ===
    const canvas = document.createElement('canvas');
    canvas.width = canvasSize;
    canvas.height = canvasSize;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create 2D context');

    // // Optional: red background for diagnostics
    // ctx.fillStyle = 'rgb(255, 0, 0)';
    // ctx.fillRect(0, 0, canvas.width, canvas.height);

    // === Step 3: Translate so that (0,0) block center is canvas center ===
    ctx.translate(canvasSize / 2 - BLOCK_SIZE / 2, canvasSize / 2 - BLOCK_SIZE / 2);

    // === Step 4: Draw all blocks ===
    for (const [coord, block] of blocks) {
      const damage = getDamageLevel(block.hp, block.type.armor ?? 1);
      const sprite = getBlockSprite(block.type.id, damage);

      const pixelX = coord.x * BLOCK_SIZE;
      const pixelY = coord.y * BLOCK_SIZE;
      const rotation = (block.rotation ?? 0) * (Math.PI / 180);

      ctx.save();
      ctx.translate(pixelX + BLOCK_SIZE / 2, pixelY + BLOCK_SIZE / 2);
      ctx.rotate(rotation);

      if (sprite.base) {
        ctx.drawImage(
          sprite.base,
          -BLOCK_SIZE / 2,
          -BLOCK_SIZE / 2,
          BLOCK_SIZE,
          BLOCK_SIZE
        );
      }

      if (sprite.overlay) {
        ctx.drawImage(
          sprite.overlay,
          -BLOCK_SIZE / 2,
          -BLOCK_SIZE / 2,
          BLOCK_SIZE,
          BLOCK_SIZE
        );
      }

      ctx.restore();
    }

    const texture = createGL2TextureFromCanvasFlipped(this.gl, canvas);

    return {
      texture,
      offset: { x: 0, y: 0 }, // Already centered
      size: { width: canvasSize, height: canvasSize },
    };
  }
}
