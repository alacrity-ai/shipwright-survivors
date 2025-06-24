// src/rendering/cache/blockRenderers/heatSeekerBlockRenderer.ts

// src/rendering/cache/blockRenderers/heatSeekerRenderer.ts

export function renderHeatSeeker(
  baseCtx: CanvasRenderingContext2D,
  overlayCtx: CanvasRenderingContext2D,
  blockSize: number,
  config: {
    baseGradientColors: string[];
    launcherColors: string[];
    tubeGradientStops: [number, string][];
    missileColors: string[];
  }
): void {
  const cx = blockSize / 2;
  const cy = blockSize / 2;
  const baseRadius = blockSize * 0.35;

  // === Base Plate ===
  const baseGradient = baseCtx.createRadialGradient(cx, cy, 0, cx, cy, blockSize / 2);
  config.baseGradientColors.forEach((color, idx, arr) =>
    baseGradient.addColorStop(idx / (arr.length - 1), color)
  );
  baseCtx.fillStyle = baseGradient;
  baseCtx.fillRect(0, 0, blockSize, blockSize);

  // === Launcher Pods ===
  const podRadius = baseRadius * 0.8;
  const podOffsets = [
    { dx: -blockSize * 0.18, dy: -blockSize * 0.05 },
    { dx: blockSize * 0.18, dy: -blockSize * 0.05 },
  ];

  podOffsets.forEach(({ dx, dy }) => {
    const gx = cx + dx;
    const gy = cy + dy;
    const launcherGradient = overlayCtx.createRadialGradient(gx, gy, 0, gx, gy, podRadius);
    config.launcherColors.forEach((color, idx, arr) =>
      launcherGradient.addColorStop(idx / (arr.length - 1), color)
    );
    overlayCtx.fillStyle = launcherGradient;
    overlayCtx.beginPath();
    overlayCtx.arc(gx, gy, podRadius, 0, Math.PI * 2);
    overlayCtx.fill();
  });

  // === Launch Tubes ===
  const tubeWidth = 6;
  const tubeHeight = blockSize * 0.6;
  const tubeGradient = overlayCtx.createLinearGradient(cx - tubeWidth / 2, 0, cx + tubeWidth / 2, 0);
  config.tubeGradientStops.forEach(([stop, color]) => tubeGradient.addColorStop(stop, color));
  overlayCtx.fillStyle = tubeGradient;
  overlayCtx.fillRect(cx - tubeWidth / 2, 0, tubeWidth, tubeHeight);

  // === Missile Tips ===
  const tipSize = 4;
  const tipOffsets = [-6, 6];
  config.missileColors.forEach((color, idx) => {
    const offsetX = tipOffsets[idx % tipOffsets.length];
    overlayCtx.fillStyle = color;
    overlayCtx.beginPath();
    overlayCtx.moveTo(cx + offsetX, 2);
    overlayCtx.lineTo(cx + offsetX + tipSize / 2, tipSize + 2);
    overlayCtx.lineTo(cx + offsetX - tipSize / 2, tipSize + 2);
    overlayCtx.closePath();
    overlayCtx.fill();
  });
}
