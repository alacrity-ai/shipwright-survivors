// src/ui/primitives/drawBlockCard.ts

const blockCardCache = new Map<string, HTMLCanvasElement>();

interface DrawBlockCardOptions {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius: number;
  backgroundColor: string;
  borderColor: string;
  alpha?: number;
  scale?: number; // Optional, defaults to 1.0
}

function getCacheKey(
  width: number,
  height: number,
  borderRadius: number,
  backgroundColor: string,
  borderColor: string,
  alpha: number,
  scale: number
): string {
  return [
    width, height, borderRadius,
    backgroundColor, borderColor,
    alpha.toFixed(3),
    scale.toFixed(2)
  ].join('|');
}

export function drawBlockCard(options: DrawBlockCardOptions): void {
  const {
    ctx,
    x, y,
    width, height,
    borderRadius,
    backgroundColor,
    borderColor,
    alpha = 1.0,
    scale = 1.0,
  } = options;

  const cacheKey = getCacheKey(width, height, borderRadius, backgroundColor, borderColor, alpha, scale);

  let cachedCanvas = blockCardCache.get(cacheKey);
  if (!cachedCanvas) {
    const w = Math.ceil(width * scale);
    const h = Math.ceil(height * scale);
    cachedCanvas = document.createElement('canvas');
    cachedCanvas.width = w;
    cachedCanvas.height = h;

    const cacheCtx = cachedCanvas.getContext('2d')!;
    cacheCtx.globalAlpha = alpha;

    cacheCtx.fillStyle = backgroundColor;
    cacheCtx.strokeStyle = borderColor;
    cacheCtx.lineWidth = 2 * scale;

    cacheCtx.beginPath();
    cacheCtx.roundRect(0, 0, w, h, borderRadius * scale);
    cacheCtx.fill();
    cacheCtx.stroke();

    blockCardCache.set(cacheKey, cachedCanvas);
  }

  ctx.save();
  ctx.globalAlpha = 1.0;
  ctx.drawImage(cachedCanvas, x, y, width, height);
  ctx.restore();
}
