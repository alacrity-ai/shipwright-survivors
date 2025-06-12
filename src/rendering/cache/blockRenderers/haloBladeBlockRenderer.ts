// src/rendering/cache/blockRenderers/haloBladeBlockRenderer.ts

export function renderHaloBladeBlock(
  ctx: CanvasRenderingContext2D,
  blockSize: number,
  config: {
    ringColor: string;
    coreColor: string;
    glowColor: string;
    casingStops: [number, string][];
  }
): void {
  const cx = blockSize / 2;
  const cy = blockSize / 2;
  const outerRadius = blockSize * 0.45;
  const coreRadius = outerRadius * 0.2;
  const ringWidth = 4;

  // === Outer Casing Background ===
  const casingGradient = ctx.createLinearGradient(0, 0, 0, blockSize);
  for (const [stop, color] of config.casingStops) {
    casingGradient.addColorStop(stop, color);
  }
  ctx.fillStyle = casingGradient;
  ctx.fillRect(0, 0, blockSize, blockSize);

  // === Subtle Bloom Glow ===
  const glowGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, outerRadius);
  glowGradient.addColorStop(0, config.glowColor);
  glowGradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
  ctx.fill();

  // === Halo Ring ===
  ctx.strokeStyle = config.ringColor;
  ctx.lineWidth = ringWidth;
  ctx.beginPath();
  ctx.arc(cx, cy, outerRadius - ringWidth / 2, 0, Math.PI * 2);
  ctx.stroke();

  // === Central Core ===
  ctx.fillStyle = config.coreColor;
  ctx.beginPath();
  ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
  ctx.fill();
}
