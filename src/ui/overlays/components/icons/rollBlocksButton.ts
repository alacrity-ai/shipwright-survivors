// src/ui/overlays/components/icons/rollBlocksButton.ts

let cachedRollBlocksIconCanvas: HTMLCanvasElement | undefined;

/**
 * Returns a cached minimalist CRT-style "roll blocks" icon
 * depicting a 6-pip die face centered in the canvas.
 */
export function getRollBlocksIcon(): HTMLCanvasElement {
  if (cachedRollBlocksIconCanvas) return cachedRollBlocksIconCanvas;

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;

  const ctx = canvas.getContext('2d')!;
  ctx.save();

  // Style constants
  const borderColor = '#00FFFF';
  const fillColor = '#001122';
  const pipColor = '#00FFFF';

  // Background
  ctx.fillStyle = fillColor;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  ctx.roundRect(0, 0, 64, 64, 8);
  ctx.fill();
  ctx.stroke();

  // Die geometry
  const dieSize = 28;
  const dieX = (64 - dieSize) / 2;
  const dieY = (64 - dieSize) / 2;
  const pipRadius = 2.5;

  // Draw die face
  ctx.fillStyle = fillColor;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1.5;
  ctx.roundRect(dieX, dieY, dieSize, dieSize, 4);
  ctx.fill();
  ctx.stroke();

  // Draw six pips in a 3x2 grid
  const pipSpacingX = dieSize / 3;
  const pipSpacingY = dieSize / 2;

  const baseX = dieX + pipSpacingX / 2;
  const baseY = dieY + pipSpacingY / 2;

  ctx.fillStyle = pipColor;

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const cx = baseX + col * pipSpacingX;
      const cy = baseY + row * pipSpacingY;

      ctx.beginPath();
      ctx.arc(cx, cy, pipRadius, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  ctx.restore();
  cachedRollBlocksIconCanvas = canvas;
  return canvas;
}
