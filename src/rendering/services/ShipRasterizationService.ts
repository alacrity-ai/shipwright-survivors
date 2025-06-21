// src/rendering/unified/services/ShipRasterizationService.ts

import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';

import { BLOCK_SIZE } from '@/game/blocks/BlockRegistry';
import { getDamageLevel, getBlockSprite } from '@/rendering/cache/BlockSpriteCache';
import { createGL2TextureFromCanvas } from '@/rendering/gl/glTextureUtils';

export interface RasterizedShipTexture {
  texture: WebGLTexture;
  offset: { x: number; y: number }; // offset in world units from ship origin
  size: { width: number; height: number }; // in pixels
}

export class ShipRasterizationService {
  constructor(private readonly gl: WebGL2RenderingContext) {}

  rasterize(entity: CompositeBlockObject): RasterizedShipTexture {
    const blocks = Array.from(entity.getAllBlocks()).filter(([, block]) => !block.hidden);
    if (blocks.length === 0) throw new Error('Ship has no visible blocks');

    // Compute bounds in local space
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const [coord] of blocks) {
      const px = coord.x * BLOCK_SIZE;
      const py = coord.y * BLOCK_SIZE;
      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
      maxX = Math.max(maxX, px + BLOCK_SIZE);
      maxY = Math.max(maxY, py + BLOCK_SIZE);
    }

    const width = maxX - minX;
    const height = maxY - minY;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create 2D context');

    ctx.translate(-minX, -minY); // Align ship origin to top-left of canvas

    for (const [coord, block] of blocks) {
      const localX = coord.x * BLOCK_SIZE;
      const localY = coord.y * BLOCK_SIZE;
      const damage = getDamageLevel(block.hp, block.type.armor ?? 1);
      const sprite = getBlockSprite(block.type.id, damage);

      const rotation = (block.rotation ?? 0) * (Math.PI / 180);
      ctx.save();
      ctx.translate(localX + BLOCK_SIZE / 2, localY + BLOCK_SIZE / 2);
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

    const texture = createGL2TextureFromCanvas(this.gl, canvas);

    return {
      texture,
      offset: { x: minX, y: minY },
      size: { width, height },
    };
  }
}
