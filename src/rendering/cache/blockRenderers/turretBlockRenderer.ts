// src/rendering/cache/blockRenderers/turretBlockRenderer.ts

export function renderTurret(
  baseCtx: CanvasRenderingContext2D,
  overlayCtx: CanvasRenderingContext2D,
  blockSize: number,
  config: {
    baseGradientColors: string[];
    rotatingBaseColors: string[];
    barrelGradientStops: [number, string][];
    barrelWidth: number;
    barrelLength: number;
  }
): void {
  const cx = blockSize / 2;
  const cy = blockSize / 2;
  const baseRadius = blockSize * 0.35;

  // Base plate gradient - FIX: Use proper inner/outer radii
  const baseGradient = baseCtx.createRadialGradient(cx, cy, 0, cx, cy, blockSize / 2);
  config.baseGradientColors.forEach((color, idx, arr) =>
    baseGradient.addColorStop(idx / (arr.length - 1), color)
  );
  baseCtx.fillStyle = baseGradient;
  baseCtx.fillRect(0, 0, blockSize, blockSize);

  // Rotating base
  const rotatingGradient = overlayCtx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius);
  config.rotatingBaseColors.forEach((color, idx, arr) =>
    rotatingGradient.addColorStop(idx / (arr.length - 1), color)
  );
  drawRotatingBase(overlayCtx, cx, cy, baseRadius, rotatingGradient);
  drawDirectionalLines(overlayCtx, cx, cy, baseRadius);

  // Barrel
  const barrelGradient = overlayCtx.createLinearGradient(cx - config.barrelWidth / 2, 0, cx + config.barrelWidth / 2, 0);
  config.barrelGradientStops.forEach(([stop, color]) => barrelGradient.addColorStop(stop, color));
  drawBarrel(overlayCtx, cx, config.barrelWidth, config.barrelLength, barrelGradient);

  // Muzzle
  drawEnergyMuzzle(overlayCtx, cx);
}

// Draws a circular base with a radial gradient
function drawRotatingBase(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number, gradient: CanvasGradient) {
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
}

// Draws the directional lines of the rotating base
function drawDirectionalLines(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number) {
  ctx.strokeStyle = '#AAA';
  ctx.lineWidth = 1;
  ctx.beginPath();
  // Vertical line
  ctx.moveTo(centerX, centerY - radius * 0.8);
  ctx.lineTo(centerX, centerY + radius * 0.8);
  // Horizontal line
  ctx.moveTo(centerX - radius * 0.8, centerY);
  ctx.lineTo(centerX + radius * 0.8, centerY);
  ctx.stroke();
}

// Draws a barrel with gradient
function drawBarrel(ctx: CanvasRenderingContext2D, centerX: number, barrelWidth: number, barrelLength: number, gradient: CanvasGradient) {
  ctx.fillStyle = gradient;
  ctx.fillRect(centerX - barrelWidth / 2, 0, barrelWidth, barrelLength);
}

// Draws an energy muzzle (highlight)
function drawEnergyMuzzle(ctx: CanvasRenderingContext2D, centerX: number) {
  ctx.fillStyle = '#ff6666';
  ctx.fillRect(centerX - 2, 0, 4, 4);
}
