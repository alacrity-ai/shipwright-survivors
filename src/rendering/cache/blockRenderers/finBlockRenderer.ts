export function renderFin(
  ctx: CanvasRenderingContext2D,
  blockSize: number,
  gradientStops: [number, string][]
): void {
  const gradient = ctx.createLinearGradient(0, 0, blockSize, blockSize);
  for (const [stop, color] of gradientStops) {
    gradient.addColorStop(stop, color);
  }

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(0, blockSize);            // Bottom-left
  ctx.lineTo(blockSize, blockSize);    // Bottom-right
  ctx.lineTo(blockSize, 0);            // Top-right
  ctx.closePath();
  ctx.fill();
}
