export function renderReactorCore(
  ctx: CanvasRenderingContext2D,
  blockSize: number,
  config: {
    chassisStops: [number, string][];
    coreRingStops: [number, string][];
    coreRingInnerRadius: number;
    coreGlowStops: [number, string][];
    coreGlowRadius: number;
    boltColor: string;
  }
): void {
  const cx = blockSize / 2;
  const cy = blockSize / 2;

  // === Chassis (linear vertical gradient)
  const chassisGradient = ctx.createLinearGradient(0, 0, 0, blockSize);
  config.chassisStops.forEach(([stop, color]) => chassisGradient.addColorStop(stop, color));
  ctx.fillStyle = chassisGradient;
  ctx.fillRect(0, 0, blockSize, blockSize);

  // === Core Ring (radial fading ring)
  const coreRingGradient = ctx.createRadialGradient(cx, cy, config.coreRingInnerRadius, cx, cy, blockSize / 2);
  config.coreRingStops.forEach(([stop, color]) => coreRingGradient.addColorStop(stop, color));
  ctx.fillStyle = coreRingGradient;
  ctx.beginPath();
  ctx.arc(cx, cy, blockSize / 2, 0, Math.PI * 2);
  ctx.fill();

  // === Core Glow (central pulsing sphere)
  const coreGlowGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, config.coreGlowRadius);
  config.coreGlowStops.forEach(([stop, color]) => coreGlowGradient.addColorStop(stop, color));
  ctx.fillStyle = coreGlowGradient;
  ctx.beginPath();
  ctx.arc(cx, cy, config.coreGlowRadius, 0, Math.PI * 2);
  ctx.fill();

  // === Bolts / Circuit Lines
  ctx.strokeStyle = config.boltColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(4, 4);
  ctx.lineTo(blockSize - 4, 4);
  ctx.moveTo(4, blockSize - 4);
  ctx.lineTo(blockSize - 4, blockSize - 4);
  ctx.moveTo(4, 4);
  ctx.lineTo(4, blockSize - 4);
  ctx.moveTo(blockSize - 4, 4);
  ctx.lineTo(blockSize - 4, blockSize - 4);
  ctx.stroke();
}
