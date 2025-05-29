// src/rendering/cache/blockRenderers/hullBlockRenderer.ts

export function renderHullBlock(
  ctx: CanvasRenderingContext2D,
  blockSize: number,
  gradientStops: [number, string][]
): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, blockSize);
  for (const [stop, color] of gradientStops) {
    gradient.addColorStop(stop, color);
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, blockSize, blockSize);
}
