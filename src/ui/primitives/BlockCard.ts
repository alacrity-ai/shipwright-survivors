// // src/ui/primitives/drawBlockCard.ts

// const MAX_CACHE_ENTRIES = 256; // Tune as needed

// class LRUCache<K, V> {
//   private map = new Map<K, V>();

//   constructor(private readonly maxSize: number) {}

//   get(key: K): V | undefined {
//     if (!this.map.has(key)) return undefined;
//     const val = this.map.get(key)!;
//     this.map.delete(key);
//     this.map.set(key, val);
//     return val;
//   }

//   set(key: K, value: V): void {
//     if (this.map.has(key)) {
//       this.map.delete(key);
//     } else if (this.map.size >= this.maxSize) {
//       const firstKey = this.map.keys().next().value;
//       if (firstKey !== undefined) {
//         this.map.delete(firstKey);
//       }
//     }
//     this.map.set(key, value);
//   }

//   size(): number {
//     return this.map.size;
//   }
// }

// const blockCardCache = new LRUCache<string, HTMLCanvasElement>(MAX_CACHE_ENTRIES);

// interface DrawBlockCardOptions {
//   ctx: CanvasRenderingContext2D;
//   x: number;
//   y: number;
//   width: number;
//   height: number;
//   borderRadius: number;
//   backgroundColor: string;
//   borderColor: string;
//   alpha?: number;
//   scale?: number; // Optional, defaults to 1.0
// }

// function getCacheKey(
//   width: number,
//   height: number,
//   borderRadius: number,
//   backgroundColor: string,
//   borderColor: string,
//   alpha: number,
//   scale: number
// ): string {
//   const quantAlpha = Math.round(alpha * 10); // 0.1 granularity
//   const quantScale = Math.round(scale * 10); // 0.1 granularity

//   return [
//     width, height, borderRadius,
//     backgroundColor, borderColor,
//     quantAlpha, quantScale
//   ].join('|');
// }

// export function drawBlockCard(options: DrawBlockCardOptions): void {
//   const {
//     ctx,
//     x, y,
//     width, height,
//     borderRadius,
//     backgroundColor,
//     borderColor,
//     alpha = 1.0,
//     scale = 1.0,
//   } = options;

//   const cacheKey = getCacheKey(width, height, borderRadius, backgroundColor, borderColor, alpha, scale);

//   let cachedCanvas = blockCardCache.get(cacheKey);
//   if (!cachedCanvas) {
//     const w = Math.ceil(width * scale);
//     const h = Math.ceil(height * scale);
//     cachedCanvas = document.createElement('canvas');
//     cachedCanvas.width = w;
//     cachedCanvas.height = h;

//     const cacheCtx = cachedCanvas.getContext('2d')!;
//     cacheCtx.globalAlpha = alpha;

//     cacheCtx.fillStyle = backgroundColor;
//     cacheCtx.strokeStyle = borderColor;
//     cacheCtx.lineWidth = 2 * scale;

//     cacheCtx.beginPath();
//     cacheCtx.roundRect(0, 0, w, h, borderRadius * scale);
//     cacheCtx.fill();
//     cacheCtx.stroke();

//     blockCardCache.set(cacheKey, cachedCanvas);
//   }

//   ctx.save();
//   ctx.globalAlpha = 1.0;
//   ctx.drawImage(cachedCanvas, x, y, width, height);
//   ctx.restore();

//   // Optional dev logging
//   if (blockCardCache.size() > MAX_CACHE_ENTRIES * 0.9) {
//     console.warn('[drawBlockCard] Cache size nearing limit:', blockCardCache.size());
//   }
// }


// src/ui/primitives/drawBlockCard.ts

const blockCardCache = new Map<string, HTMLCanvasElement>();

interface DrawBlockCardOptions {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius: number;
  baseStyleId: string; // 'gray' | 'green' | 'blue' | 'purple'
  alpha?: number;
  scale?: number;
  brighten?: number; // optional 0.0–1.0 pulse effect
}

interface StyleDef {
  backgroundColor: string;
  borderColor: string;
}

const STYLE_MAP: Record<string, StyleDef> = {
  gray:   { backgroundColor: '#444444', borderColor: '#888888' },
  green:  { backgroundColor: '#003300', borderColor: '#00ff00' },
  blue:   { backgroundColor: '#002244', borderColor: '#00ccff' },
  purple: { backgroundColor: '#220033', borderColor: '#cc66ff' },
};

function brighten(hex: string, amt: number): string {
  // Simple linear brighten
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const num = parseInt(hex.slice(1), 16);
  const r = clamp(((num >> 16) & 0xff) + amt * 255);
  const g = clamp(((num >> 8) & 0xff) + amt * 255);
  const b = clamp((num & 0xff) + amt * 255);
  return `rgb(${r},${g},${b})`;
}

export function drawBlockCard(options: DrawBlockCardOptions): void {
  const {
    ctx,
    x, y,
    width, height,
    borderRadius,
    baseStyleId,
    alpha = 1.0,
    scale = 1.0,
    brighten: brightenAmt = 0.0,
  } = options;

  const style = STYLE_MAP[baseStyleId];
  if (!style) {
    console.warn(`[drawBlockCard] Unknown style: ${baseStyleId}`);
    return;
  }

  const cacheKey = baseStyleId;

  let cachedCanvas = blockCardCache.get(cacheKey);
  if (!cachedCanvas) {
    cachedCanvas = document.createElement('canvas');
    cachedCanvas.width = width;
    cachedCanvas.height = height;

    const cacheCtx = cachedCanvas.getContext('2d')!;
    cacheCtx.fillStyle = style.backgroundColor;
    cacheCtx.strokeStyle = style.borderColor;
    cacheCtx.lineWidth = 2;

    cacheCtx.beginPath();
    cacheCtx.roundRect(0, 0, width, height, borderRadius);
    cacheCtx.fill();
    cacheCtx.stroke();

    blockCardCache.set(cacheKey, cachedCanvas);
  }

  // === Runtime rendering ===
  ctx.save();
  ctx.globalAlpha *= alpha;

  const centerX = x + width / 2;
  const centerY = y + height / 2;
  ctx.translate(centerX, centerY);
  ctx.scale(scale, scale);
  ctx.translate(-width / 2, -height / 2);

  if (brightenAmt > 0.01) {
    // Apply brightness overlay
    ctx.drawImage(cachedCanvas, 0, 0, width, height);
    ctx.fillStyle = brighten(style.backgroundColor, brightenAmt);
    ctx.globalAlpha *= 0.2;
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.drawImage(cachedCanvas, 0, 0, width, height);
  }

  ctx.restore();
}
