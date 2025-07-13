// src/ui/overlays/components/icons/upgradeBlocksButton.ts

let cachedUpgradeBlocksIconCanvas: HTMLCanvasElement | undefined;

/**
 * Returns a cached minimalist CRT-style "upgrade blocks" icon
 * depicting a single block with an upward-pointing arrow above it.
 */
export function getCombineBlocksIcon(): HTMLCanvasElement {
  if (cachedUpgradeBlocksIconCanvas) return cachedUpgradeBlocksIconCanvas;

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;

  const ctx = canvas.getContext('2d')!;
  ctx.save();

  // ─── Style Constants ─────────────────────────────────────
  const BORDER = '#00FFFF';
  const FILL   = '#001122';
  const BLOCK  = '#00FFFF';
  const ARROW  = '#00FFFF';

  // ─── Background Frame ────────────────────────────────────
  ctx.fillStyle = FILL;
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 2;
  ctx.roundRect(0, 0, 64, 64, 8);
  ctx.fill();
  ctx.stroke();

  // ─── Block Glyph ─────────────────────────────────────────
  const blockSize = 20;
  const blockX = (64 - blockSize) / 2;
  const blockY = 36;

  ctx.beginPath();
  ctx.fillStyle = BLOCK;
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1.5;
  ctx.roundRect(blockX, blockY, blockSize, blockSize, 3);
  ctx.fill();
  ctx.stroke();

  // ─── Upward Arrow ────────────────────────────────────────
  ctx.beginPath();
  ctx.fillStyle = ARROW;
  const arrowCenterX = 32;
  const arrowBaseY = 28;

  ctx.moveTo(arrowCenterX, 12);               // Arrow tip
  ctx.lineTo(arrowCenterX - 6, arrowBaseY);   // Left base
  ctx.lineTo(arrowCenterX - 2.5, arrowBaseY); // Left stem
  ctx.lineTo(arrowCenterX - 2.5, blockY - 2); // Up to block top
  ctx.lineTo(arrowCenterX + 2.5, blockY - 2); // Across stem
  ctx.lineTo(arrowCenterX + 2.5, arrowBaseY); // Down right stem
  ctx.lineTo(arrowCenterX + 6, arrowBaseY);   // Right base
  ctx.closePath();
  ctx.fill();

  // ─── Cleanup ─────────────────────────────────────────────
  ctx.restore();
  cachedUpgradeBlocksIconCanvas = canvas;
  return canvas;
}
