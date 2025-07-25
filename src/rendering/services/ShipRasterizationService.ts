// src/rendering/unified/services/ShipRasterizationService.ts

import type { Ship } from '@/game/ship/Ship';
import { getDamageLevel, getBlockSprite } from '@/rendering/cache/BlockSpriteCache';
import { createGL2TextureFromCanvasFlipped } from '@/rendering/gl/glTextureUtils';
import { BLOCK_SIZE } from '@/config/view';
import { BlockTypesByIndex } from '@/game/blocks/BlockRegistry';

export interface RasterizedShipTexture {
  texture: WebGLTexture;
  offset: { x: number; y: number }; // in world units from ship origin
  size: { width: number; height: number }; // in pixels
}

export class ShipRasterizationService {
  constructor(private readonly gl: WebGL2RenderingContext) {}

  rasterize(entity: Ship): RasterizedShipTexture | null {
    const orchestrator = entity.getBlockOrchestrator();
    const store = orchestrator.blockStore;
    const indices = orchestrator.getShipBlocksView(entity.numericId);

    // Filter only visible blocks
    const visibleIndices: number[] = [];
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      if (store.hidden[idx] === 0 && store.destroyed[idx] === 0) {
        visibleIndices.push(idx);
      }
    }

    if (visibleIndices.length === 0) {
      console.warn('[ShipRasterizationService] Ship has no visible blocks');
      return null;
    }

    // === Step 1: Determine bounding box in local coords ===
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const idx of visibleIndices) {
      const x = store.localX[idx];
      const y = store.localY[idx];
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }

    const maxDeltaX = Math.max(Math.abs(minX), Math.abs(maxX));
    const maxDeltaY = Math.max(Math.abs(minY), Math.abs(maxY));
    const maxDelta = Math.max(maxDeltaX, maxDeltaY); // Square canvas for uniformity

    const blocksPerSide = maxDelta * 2 + 1;
    const canvasSize = blocksPerSide * BLOCK_SIZE;

    // === Step 2: Create and prepare canvas ===
    const canvas = document.createElement('canvas');
    canvas.width = canvasSize;
    canvas.height = canvasSize;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create 2D context');

    // Center origin to (0,0) of ship grid
    ctx.translate(canvasSize / 2 - BLOCK_SIZE / 2, canvasSize / 2 - BLOCK_SIZE / 2);

    // === Step 3: Draw each block ===
    for (const idx of visibleIndices) {
      const x = store.localX[idx];
      const y = store.localY[idx];
      const rotation = store.rotation[idx] || 0;
      const hp = store.hp[idx];
      const typeIndex = store.typeIndex[idx];

      const blockType = BlockTypesByIndex[typeIndex];
      if (!blockType) continue;

      const damage = getDamageLevel(hp, blockType.armor ?? 1);
      const sprite = getBlockSprite(blockType, damage);

      const pixelX = x * BLOCK_SIZE;
      const pixelY = y * BLOCK_SIZE;

      ctx.save();
      ctx.translate(pixelX + BLOCK_SIZE / 2, pixelY + BLOCK_SIZE / 2);
      ctx.rotate(rotation);

      if (sprite.base) {
        ctx.drawImage(sprite.base, -BLOCK_SIZE / 2, -BLOCK_SIZE / 2, BLOCK_SIZE, BLOCK_SIZE);
      }
      if (sprite.overlay) {
        ctx.drawImage(sprite.overlay, -BLOCK_SIZE / 2, -BLOCK_SIZE / 2, BLOCK_SIZE, BLOCK_SIZE);
      }

      ctx.restore();
    }

    // === Step 4: Convert to GPU texture ===
    const texture = createGL2TextureFromCanvasFlipped(this.gl, canvas);

    return {
      texture,
      offset: { x: 0, y: 0 },
      size: { width: canvasSize, height: canvasSize },
    };
  }
}
