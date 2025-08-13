// src/ui/primitives/UIImageBox.ts
//
// Minimal, GC-neutral image box primitive with object-fit: contain semantics,
// rounded-rect clipping, optional letterbox backdrop, and optional border.
//
// Usage patterns:
//  - drawUIImageBox(ctx, x, y, w, h, htmlImageOrNull, options)
//  - preloadUIImage('/assets/tutorials/tutorial1.png')
//  - getCachedUIImage('/assets/tutorials/tutorial1.png')
//
// All path-based loaders resolve through getAssetPath().
//
// Notes:
//  - This primitive avoids per-frame allocations; it uses only local scalars.
//  - If a string path is passed to drawUIImageBox, it will request a preload
//    (fire-and-forget) and render a placeholder until the asset is ready.

import { getAssetPath } from '@/shared/assetHelpers';

export interface UIImageBoxOptions {
  alpha?: number;               // overall opacity for the box (default 1.0)
  borderRadius?: number;        // px radius for rounded rect clipping (default 6)
  letterboxFill?: string;       // backdrop fill color inside the clip (default rgba(10,14,18,0.65))
  borderColor?: string;         // stroke color for the border (default rgba(120,150,180,0.4))
  borderWidth?: number;         // stroke width in px (default 1)
  placeholderColor?: string;    // primary placeholder color (default #12161C)
  placeholderAccent?: string;   // hatch/accent color (default #283244)
}

type ImgLike = HTMLImageElement | null;

// ─────────────────────────────────────────────────────────────────────────────
// Simple module-local cache for UI images
// ─────────────────────────────────────────────────────────────────────────────
const IMAGE_CACHE = new Map<string, HTMLImageElement>();
const INFLIGHT = new Map<string, Promise<HTMLImageElement>>();

/**
 * Preload a UI image by logical path (e.g., '/assets/tutorials/tutorial1.png').
 * Returns a promise that resolves with the HTMLImageElement once loaded.
 */
export function preloadUIImage(path: string): Promise<HTMLImageElement> {
  const url = getAssetPath(path);
  if (IMAGE_CACHE.has(url)) return Promise.resolve(IMAGE_CACHE.get(url)!);
  if (INFLIGHT.has(url)) return INFLIGHT.get(url)!;

  const p = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      IMAGE_CACHE.set(url, img);
      INFLIGHT.delete(url);
      resolve(img);
    };
    img.onerror = () => {
      INFLIGHT.delete(url);
      reject(new Error(`[UIImageBox] Failed to load image: ${url}`));
    };
    img.src = url;
  });

  INFLIGHT.set(url, p);
  return p;
}

/** Returns a cached image if present (synchronous), else null. */
export function getCachedUIImage(path: string): HTMLImageElement | null {
  const url = getAssetPath(path);
  return IMAGE_CACHE.get(url) ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Drawing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Draw an image into a rounded-rect box with `contain` fit and letterboxing.
 * If `imgOrSrc` is a string, a preload will be initiated and a placeholder drawn.
 */
export function drawUIImageBox(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  imgOrSrc: ImgLike | string,
  options?: UIImageBoxOptions
): void {
  const {
    alpha = 1.0,
    borderRadius = 6,
    letterboxFill = 'rgba(10,14,18,0.65)',
    borderColor = 'rgba(120,150,180,0.4)',
    borderWidth = 1,
    placeholderColor = '#12161C',
    placeholderAccent = '#283244',
  } = options ?? {};

  // Resolve image if a string path was provided; kick off a preload.
  let img: ImgLike = null;
  if (typeof imgOrSrc === 'string') {
    const url = getAssetPath(imgOrSrc);
    img = IMAGE_CACHE.get(url) ?? null;
    if (!img && !INFLIGHT.has(url)) {
      // Fire-and-forget preload; caller need not await.
      void preloadUIImage(imgOrSrc);
    }
  } else {
    img = imgOrSrc;
  }

  // Guard: nothing sensible to draw if box is degenerate
  if (w <= 1 || h <= 1) return;

  // Clip to rounded rect and draw backdrop + image (or placeholder)
  ctx.save();
  if (alpha !== 1.0) ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

  roundedRectPath(ctx, x, y, w, h, borderRadius);
  ctx.clip();

  // Letterbox backdrop
  ctx.fillStyle = letterboxFill;
  ctx.fillRect(x, y, w, h);

  if (img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
    // Contain-fit compute
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.min(w / iw, h / ih);
    const dw = Math.max(1, Math.floor(iw * scale));
    const dh = Math.max(1, Math.floor(ih * scale));
    const dx = Math.floor(x + (w - dw) / 2);
    const dy = Math.floor(y + (h - dh) / 2);

    // High-quality sampling without allocations
    const prevSmooth = ctx.imageSmoothingEnabled;
    const prevQuality = (ctx as any).imageSmoothingQuality;

    ctx.imageSmoothingEnabled = true;
    try { (ctx as any).imageSmoothingQuality = 'high'; } catch { /* noop */ }

    ctx.drawImage(img, dx, dy, dw, dh);

    // restore
    ctx.imageSmoothingEnabled = prevSmooth;
    try { (ctx as any).imageSmoothingQuality = prevQuality; } catch { /* noop */ }
  } else {
    // Placeholder: subtle hatch + center mark
    drawPlaceholder(ctx, x, y, w, h, placeholderColor, placeholderAccent);
  }

  ctx.restore();

  // Border on top for crispness
  if (borderWidth > 0) {
    ctx.save();
    roundedRectPath(ctx, x, y, w, h, borderRadius);
    ctx.lineWidth = borderWidth;
    ctx.strokeStyle = borderColor;
    ctx.stroke();
    ctx.restore();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers (allocation-free)
// ─────────────────────────────────────────────────────────────────────────────

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
): void {
  // Clamp radius to sane limits
  const radius = Math.max(0, Math.min(r, Math.min(w, h) * 0.5));

  ctx.beginPath();
  if (radius <= 0.0001) {
    ctx.rect(x, y, w, h);
    return;
  }

  const r2 = radius;
  const x2 = x + w;
  const y2 = y + h;

  ctx.moveTo(x + r2, y);
  ctx.lineTo(x2 - r2, y);
  ctx.quadraticCurveTo(x2, y, x2, y + r2);
  ctx.lineTo(x2, y2 - r2);
  ctx.quadraticCurveTo(x2, y2, x2 - r2, y2);
  ctx.lineTo(x + r2, y2);
  ctx.quadraticCurveTo(x, y2, x, y2 - r2);
  ctx.lineTo(x, y + r2);
  ctx.quadraticCurveTo(x, y, x + r2, y);
  // leave path open for stroke/clip by caller
}

function drawPlaceholder(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  base: string,
  accent: string
): void {
  // Base fill already applied by letterbox; overlay a subtle hatch
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  // Diagonal hatch lines
  ctx.strokeStyle = accent;
  ctx.globalAlpha *= 0.6;
  ctx.lineWidth = 1;

  const step = 8;
  // Draw lines with a single loop; no arrays allocated
  for (let d = -h; d < w; d += step) {
    ctx.beginPath();
    ctx.moveTo(x + d, y);
    ctx.lineTo(x + d + h, y + h);
    ctx.stroke();
  }

  // Center mark (small crosshair)
  const cx = Math.floor(x + w / 2);
  const cy = Math.floor(y + h / 2);
  ctx.globalAlpha *= 0.8;
  ctx.strokeStyle = '#445066';
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy); ctx.lineTo(cx + 8, cy);
  ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy + 8);
  ctx.stroke();

  ctx.restore();
}
