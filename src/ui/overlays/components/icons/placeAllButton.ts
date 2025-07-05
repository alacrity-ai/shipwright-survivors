// src/ui/overlays/components/icons/placeAllButton.ts

// src/ui/overlays/components/icons/placeAllButton.ts

let cachedPlaceAllIconCanvas: HTMLCanvasElement | undefined;

/**
 * Returns a cached minimalist CRT-style "place all blocks" icon
 * with 3 rectangles arranged in an equilateral triangle pattern.
 */
export function getPlaceAllBlocksIcon(): HTMLCanvasElement {
  if (cachedPlaceAllIconCanvas) return cachedPlaceAllIconCanvas;

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;

  const ctx = canvas.getContext('2d')!;
  ctx.save();

  // Style constants
  const borderColor = '#00FFFF';
  const fillColor = '#001122';
  const blockColor = '#00FFFF';

  // Background
  ctx.fillStyle = fillColor;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  ctx.roundRect(0, 0, 64, 64, 8);
  ctx.fill();
  ctx.stroke();

  // Triangle geometry
  const centerX = 32;
  const centerY = 32;
  const triangleRadius = 14; // Distance from center to each corner
  const blockSize = 12;

  // Compute equilateral triangle corners
  const angles = [-Math.PI / 2, (2 * Math.PI) / 3 - Math.PI / 2, (4 * Math.PI) / 3 - Math.PI / 2];

  for (let i = 0; i < 3; i++) {
    const angle = angles[i];
    const cx = centerX + triangleRadius * Math.cos(angle);
    const cy = centerY + triangleRadius * Math.sin(angle);

    ctx.beginPath();
    ctx.fillStyle = blockColor;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.5;
    ctx.roundRect(cx - blockSize / 2, cy - blockSize / 2, blockSize, blockSize, 3);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();

  cachedPlaceAllIconCanvas = canvas;
  return canvas;
}
