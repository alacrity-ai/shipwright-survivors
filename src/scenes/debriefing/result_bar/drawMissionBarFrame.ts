// src/scenes/debriefing/result_bar/drawMissionBarFrame.ts

let cachedCanvas: HTMLCanvasElement | null = null;
let cachedCtx: CanvasRenderingContext2D | null = null;
let lastWidth = 0;
let lastHeight = 0;

export function drawMissionBarFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  // Only re-render if dimensions have changed
  if (!cachedCanvas || width !== lastWidth || height !== lastHeight) {
    cachedCanvas = document.createElement('canvas');
    cachedCanvas.width = Math.ceil(width);
    cachedCanvas.height = Math.ceil(height);
    cachedCtx = cachedCanvas.getContext('2d')!;

    cachedCtx.clearRect(0, 0, width, height);

    // === Border Gradient ===
    const gradient = cachedCtx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#00FFFF');
    gradient.addColorStop(1, '#004466');

    cachedCtx.save();
    cachedCtx.lineWidth = 2;
    cachedCtx.strokeStyle = gradient;
    cachedCtx.shadowColor = '#00FFFF';
    cachedCtx.shadowBlur = 8;
    cachedCtx.fillStyle = 'transparent';

    // === Rounded Outer Frame ===
    const radius = Math.min(8, height / 2);
    cachedCtx.beginPath();
    cachedCtx.roundRect(1, 1, width - 2, height - 2, radius);
    cachedCtx.stroke();
    cachedCtx.restore();

    lastWidth = width;
    lastHeight = height;
  }

  ctx.drawImage(cachedCanvas!, x, y);
}
