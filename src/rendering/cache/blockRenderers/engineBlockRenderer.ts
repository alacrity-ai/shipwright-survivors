// src/rendering/cache/blockRenderers/engineBlockRenderer.ts

export function renderEngine(
  ctx: CanvasRenderingContext2D,
  blockSize: number,
  config: {
    bodyStops: [number, string][];
    thrustColor: string;
    thrustInsetX?: number;
    thrustHeight?: number;
    thrustInsetY?: number;
  }
): void {
  // === Engine Body Gradient ===
  const gradient = ctx.createLinearGradient(0, 0, 0, blockSize);
  config.bodyStops.forEach(([stop, color]) => gradient.addColorStop(stop, color));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, blockSize, blockSize);

  // === Thrust Rectangle ===
  const insetX = config.thrustInsetX ?? 6;
  const thrustHeight = config.thrustHeight ?? 4;
  const insetY = config.thrustInsetY ?? 6;

  ctx.fillStyle = config.thrustColor;
  ctx.fillRect(insetX, blockSize - insetY, blockSize - insetX * 2, thrustHeight);
}
