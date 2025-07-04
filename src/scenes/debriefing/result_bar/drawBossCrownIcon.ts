// src/scenes/debriefing/result_bar/drawBossCrownIcon.ts

interface CrownRenderOptions {
  glow?: boolean;
  alpha?: number;
}

let cachedCanvas: HTMLCanvasElement | null = null;
let cachedCtx: CanvasRenderingContext2D | null = null;
let cachedGlow: boolean = false;

const BASE_SIZE = 64; // internal raster size

export function drawBossCrownIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  options: CrownRenderOptions = {}
): void {
  const glow = options.glow ?? false;
  const alpha = options.alpha ?? 1.0;

  // === Rebuild cache if glow state changes ===
  if (!cachedCanvas || cachedGlow !== glow) {
    cachedCanvas = document.createElement('canvas');
    cachedCanvas.width = BASE_SIZE;
    cachedCanvas.height = BASE_SIZE;
    cachedCtx = cachedCanvas.getContext('2d')!;
    cachedCtx.clearRect(0, 0, BASE_SIZE, BASE_SIZE);

    // === Crown Geometry ===
    const cx = BASE_SIZE / 2;
    const cy = BASE_SIZE / 2;
    const w = 40;
    const h = 28;
    const spikeHeight = 16;

    cachedCtx.save();

    if (glow) {
      cachedCtx.shadowColor = '#00FFFF';
      cachedCtx.shadowBlur = 12;
    }

    // === Gradient Fill ===
    const grad = cachedCtx.createLinearGradient(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2);
    grad.addColorStop(0, '#00FFFF');
    grad.addColorStop(1, '#0077AA');

    cachedCtx.fillStyle = grad;
    cachedCtx.strokeStyle = '#00CCFF';
    cachedCtx.lineWidth = 2;

    // === Path: Flat crown base with 3 triangular spikes ===
    cachedCtx.beginPath();
    cachedCtx.moveTo(cx - w / 2, cy + h / 2);

    // Left spike
    cachedCtx.lineTo(cx - w / 3, cy - spikeHeight);
    // Middle spike
    cachedCtx.lineTo(cx, cy + h / 6 - spikeHeight * 1.4);
    // Right spike
    cachedCtx.lineTo(cx + w / 3, cy - spikeHeight);

    cachedCtx.lineTo(cx + w / 2, cy + h / 2);
    cachedCtx.lineTo(cx - w / 2, cy + h / 2);
    cachedCtx.closePath();

    cachedCtx.fill();
    cachedCtx.stroke();

    cachedCtx.restore();
    cachedGlow = glow;
  }

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(cachedCanvas, x, y, size, size);
  ctx.restore();
}
