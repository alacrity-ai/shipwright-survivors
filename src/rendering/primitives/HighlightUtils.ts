// src/rendering/primitives/HighlightUtils.ts

import { BLOCK_SIZE } from '@/config/view';
import { getBlockSprite } from '@/rendering/cache/BlockSpriteCache';

const highlightCache = new Map<string, HTMLCanvasElement>();

export function drawBlockHighlightWithMask(
  ctx: CanvasRenderingContext2D,
  blockId: string,
  rotation: number = 0, // degrees: 0, 90, 180, 270
  color: string = 'rgba(100, 255, 255, 0.4)'
): void {
  const cacheKey = `${blockId}_${rotation}_${color}`;
  let cached = highlightCache.get(cacheKey);

  if (!cached) {
    const sprite = getBlockSprite(blockId);
    const base = sprite.base;
    if (!base) return;

    const tmp = document.createElement('canvas');
    tmp.width = BLOCK_SIZE;
    tmp.height = BLOCK_SIZE;
    const tmpCtx = tmp.getContext('2d')!;

    // Step 1: Fill highlight tint
    tmpCtx.fillStyle = color;
    tmpCtx.fillRect(0, 0, BLOCK_SIZE, BLOCK_SIZE);

    // Step 2: Apply rotated mask using base sprite
    tmpCtx.save();
    tmpCtx.translate(BLOCK_SIZE / 2, BLOCK_SIZE / 2);
    tmpCtx.rotate((rotation * Math.PI) / 180);
    tmpCtx.translate(-BLOCK_SIZE / 2, -BLOCK_SIZE / 2);
    tmpCtx.globalCompositeOperation = 'destination-in';
    tmpCtx.drawImage(base, 0, 0);
    tmpCtx.restore();

    tmpCtx.globalCompositeOperation = 'source-over';

    cached = tmp;
    highlightCache.set(cacheKey, cached);
  }

  // Step 3: Draw the cached, masked highlight
  ctx.drawImage(cached, -BLOCK_SIZE / 2, -BLOCK_SIZE / 2);
}

export function drawBlockHighlight(
  ctx: CanvasRenderingContext2D,
  color: string = 'rgba(0,255,0,0.3)'
): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(
    -BLOCK_SIZE / 2,
    -BLOCK_SIZE / 2,
    BLOCK_SIZE,
    BLOCK_SIZE
  );
  ctx.restore();
}

export function drawBlockDeletionHighlight(
  ctx: CanvasRenderingContext2D,
  isSafeToDelete: boolean
): void {
  ctx.save();
  ctx.fillStyle = isSafeToDelete ? 'rgba(0,255,0,0.3)' : 'rgba(255,0,0,0.3)';
  ctx.fillRect(
    -BLOCK_SIZE / 2,
    -BLOCK_SIZE / 2,
    BLOCK_SIZE,
    BLOCK_SIZE
  );
  ctx.restore();
}
