// src/rendering/primitives/HighlightUtils.ts

import { BLOCK_SIZE } from '@/game/blocks/BlockRegistry';

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
