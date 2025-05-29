// src/rendering/cache/blockRenderers/facePlateBlockRenderer.ts

export function renderFacetPlate(
  ctx: CanvasRenderingContext2D,
  blockSize: number,
  gradientStops: [number, string][]
): void {
  const gradient = ctx.createLinearGradient(0, blockSize / 2, 0, blockSize);
  for (const [stop, color] of gradientStops) {
    gradient.addColorStop(stop, color);
  }

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(blockSize / 2, blockSize / 2); // Tip of the plate
  ctx.lineTo(0, blockSize);                 // Bottom-left corner
  ctx.lineTo(blockSize, blockSize);         // Bottom-right corner
  ctx.closePath();
  ctx.fill();
}
