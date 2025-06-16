// src/rendering/cache/blockRenderers/fuelTankBlockRenderer.ts

export function renderFuelTankBlock(
  ctx: CanvasRenderingContext2D,
  blockSize: number,
  config?: {
    casingStops?: [number, string][],       // Outer shell gradient
    coreColor?: string,                     // Central tank fluid glow
    stripeColor?: string,                   // Vertical mechanical stripes
    terminalHighlightColor?: string         // Cap or valve indicators
  }
): void {
  const cx = blockSize / 2;
  const cy = blockSize / 2;

  // === Outer Casing (vertical gradient)
  const casingGradient = ctx.createLinearGradient(0, 0, 0, blockSize);
  (config?.casingStops ?? [
    [0, '#2B2B2B'],
    [0.3, '#1F1F1F'],
    [0.6, '#0F0F0F'],
    [1, '#000000']
  ]).forEach(([stop, color]) => casingGradient.addColorStop(stop, color));
  ctx.fillStyle = casingGradient;
  ctx.fillRect(0, 0, blockSize, blockSize);

  // === Central Core (radial glowing chamber)
  const coreRadius = blockSize * 0.28;
  const coreGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
  coreGradient.addColorStop(0, config?.coreColor ?? '#FFD54F'); // fuel glow
  coreGradient.addColorStop(1, 'rgba(255, 213, 79, 0)');
  ctx.fillStyle = coreGradient;
  ctx.beginPath();
  ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
  ctx.fill();

  // === Vertical Stripes (reinforced clamps or plating)
  ctx.strokeStyle = config?.stripeColor ?? '#666';
  ctx.lineWidth = 2;
  const stripeCount = 4;
  for (let i = 0; i < stripeCount; i++) {
    const x = ((i + 1) / (stripeCount + 1)) * blockSize;
    ctx.beginPath();
    ctx.moveTo(x, 4);
    ctx.lineTo(x, blockSize - 4);
    ctx.stroke();
  }

  // === Terminal Caps (top & bottom indicators)
  ctx.fillStyle = config?.terminalHighlightColor ?? '#FFECB3';
  const capWidth = blockSize * 0.2;
  const capHeight = 4;

  // Top Cap
  ctx.fillRect(cx - capWidth / 2, 2, capWidth, capHeight);

  // Bottom Cap
  ctx.fillRect(cx - capWidth / 2, blockSize - capHeight - 2, capWidth, capHeight);
}
