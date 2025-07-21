// src/rendering/cache/blockRenderers/flameThrowerBlockRenderer.ts

export function renderFlameThrower(
  baseCtx: CanvasRenderingContext2D,
  overlayCtx: CanvasRenderingContext2D,
  blockSize: number,
  config?: {
    baseGradientColors?: string[];               // Outer → inner plate tones
    emitterGradientStops?: [number, string][];   // Barrel and nozzle tones
    fuelTubeColors?: string[];                   // Colors for side fuel tubes
    nozzleCoreColor?: string;                    // Bright core color for the nozzle
    nozzleOuterColor?: string;                   // Outer rim color for the nozzle
  }
): void {
  const cx = blockSize / 2;
  const cy = blockSize / 2;
  const baseRadius = blockSize * 0.35;

  // === Base Plate ===
  const baseGradient = baseCtx.createRadialGradient(cx, cy, 0, cx, cy, blockSize / 2);
  (config?.baseGradientColors ?? ['#222', '#333', '#111']).forEach((color, idx, arr) =>
    baseGradient.addColorStop(idx / (arr.length - 1), color)
  );
  baseCtx.fillStyle = baseGradient;
  baseCtx.fillRect(0, 0, blockSize, blockSize);

  // === Central Emitter Barrel ===
  const barrelLength = blockSize * 0.65;
  const barrelWidth = blockSize * 0.14;
  const barrelGradient = overlayCtx.createLinearGradient(cx - barrelWidth / 2, 0, cx + barrelWidth / 2, 0);
  (config?.emitterGradientStops ?? [
    [0, '#ff9933'],
    [0.5, '#cc3300'],
    [1, '#550000'],
  ]).forEach(([stop, color]) => barrelGradient.addColorStop(stop, color));
  overlayCtx.fillStyle = barrelGradient;
  overlayCtx.fillRect(cx - barrelWidth / 2, cy - barrelLength * 0.5, barrelWidth, barrelLength);

  // === Side Fuel Tubes ===
  const tubeRadius = blockSize * 0.07;
  const tubeOffsets = [-blockSize * 0.18, blockSize * 0.18]; // left/right
  tubeOffsets.forEach((offsetX) => {
    const tubeGradient = overlayCtx.createRadialGradient(cx + offsetX, cy, 0, cx + offsetX, cy, tubeRadius);
    (config?.fuelTubeColors ?? ['#ffaa33', '#772200']).forEach((color, idx, arr) =>
      tubeGradient.addColorStop(idx / (arr.length - 1), color)
    );
    overlayCtx.fillStyle = tubeGradient;
    overlayCtx.beginPath();
    overlayCtx.arc(cx + offsetX, cy, tubeRadius, 0, Math.PI * 2);
    overlayCtx.fill();
  });

  // === Nozzle Tip (where flames emerge) ===
  const nozzleOuter = config?.nozzleOuterColor ?? '#cc3300';
  const nozzleCore = config?.nozzleCoreColor ?? '#ffff66';
  const nozzleRadiusOuter = blockSize * 0.12;
  const nozzleRadiusCore = blockSize * 0.05;
  const nozzleY = cy - barrelLength * 0.5;

  // Outer rim
  overlayCtx.fillStyle = nozzleOuter;
  overlayCtx.beginPath();
  overlayCtx.arc(cx, nozzleY, nozzleRadiusOuter, 0, Math.PI * 2);
  overlayCtx.fill();

  // Inner hot core
  overlayCtx.fillStyle = nozzleCore;
  overlayCtx.beginPath();
  overlayCtx.arc(cx, nozzleY, nozzleRadiusCore, 0, Math.PI * 2);
  overlayCtx.fill();

  // === Directional Hints (subtle cross lines on base)
  overlayCtx.strokeStyle = 'rgba(255, 120, 0, 0.3)';
  overlayCtx.lineWidth = 1;
  overlayCtx.beginPath();
  overlayCtx.moveTo(cx, cy - baseRadius);
  overlayCtx.lineTo(cx, cy + baseRadius);
  overlayCtx.moveTo(cx - baseRadius, cy);
  overlayCtx.lineTo(cx + baseRadius, cy);
  overlayCtx.stroke();
}
