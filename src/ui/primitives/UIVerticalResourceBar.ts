// src/ui/primitives/UIVerticalResourceBar.ts

import { getUniformScaleFactor } from '@/config/view';

export interface UIVerticalResourceBar {
  x: number;
  y: number;
  width: number;
  height: number;
  value: number;
  maxValue: number;

  style?: {
    barColor?: string;
    backgroundColor?: string;
    borderColor?: string;
    glow?: boolean;
    textColor?: string;
    showLabel?: boolean;
    unit?: string;
  };
}

const DEFAULT_STYLE = {
  barColor: '#0af',
  backgroundColor: '#111',
  borderColor: '#0ff',
  glow: true,
  textColor: '#fff',
  showLabel: true,
  unit: '',
};

// === Static Layer Cache ===

interface VBarCacheEntry {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  cacheKey: string;
  timestamp: number;
}

class StaticVerticalBarCache {
  private static instance: StaticVerticalBarCache;
  private cache = new Map<string, VBarCacheEntry>();
  private maxAge = 30_000;

  static getInstance(): StaticVerticalBarCache {
    if (!StaticVerticalBarCache.instance) {
      StaticVerticalBarCache.instance = new StaticVerticalBarCache();
    }
    return StaticVerticalBarCache.instance;
  }

  getOrCreate(bar: UIVerticalResourceBar, uiScale: number): VBarCacheEntry {
    const { width, height, style = {} } = bar;
    const merged = { ...DEFAULT_STYLE, ...style };

    const scaledW = Math.round(width * uiScale);
    const scaledH = Math.round(height * uiScale);
    const key = `vbar_${scaledW}_${scaledH}_${merged.backgroundColor}_${merged.borderColor}`;

    const existing = this.cache.get(key);
    if (existing && Date.now() - existing.timestamp < this.maxAge) {
      return existing;
    }

    const canvas = document.createElement('canvas');
    canvas.width = scaledW + 4;
    canvas.height = scaledH + 4;
    const ctx = canvas.getContext('2d')!;

    ctx.save();

    // Background
    ctx.fillStyle = merged.backgroundColor;
    ctx.fillRect(2, 2, scaledW, scaledH);

    // Border
    ctx.strokeStyle = merged.borderColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(1.5, 1.5, scaledW + 1, scaledH + 1);

    // Scanlines
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < scaledH; i += 2) {
      ctx.fillRect(2, 2 + i, scaledW, 1);
    }

    ctx.restore();

    const entry: VBarCacheEntry = {
      canvas,
      ctx,
      cacheKey: key,
      timestamp: Date.now(),
    };

    this.cache.set(key, entry);
    return entry;
  }

  clear(): void {
    this.cache.clear();
  }
}

export function clearVerticalBarCache(): void {
  StaticVerticalBarCache.getInstance().clear();
}

// === Main Draw Function ===

export function drawUIVerticalResourceBar(
  ctx: CanvasRenderingContext2D,
  bar: UIVerticalResourceBar,
  uiScale: number = 1.0
): void {
  const {
    x, y, width, height,
    value, maxValue,
    style = {},
  } = bar;

  const {
    barColor,
    glow,
    textColor,
    showLabel,
    unit,
  } = { ...DEFAULT_STYLE, ...style };

  const scaledW = width * uiScale;
  const scaledH = height * uiScale;

  const clampedValue = Math.max(0, Math.min(value, maxValue));
  const filledHeight = (clampedValue / maxValue) * scaledH;
  const filledTop = y + scaledH - filledHeight;

  // === Static Background Layer ===
  const staticCache = StaticVerticalBarCache.getInstance().getOrCreate(bar, uiScale);
  ctx.drawImage(staticCache.canvas, x - 2, y - 2);

  // === Filled Portion (grows upward from bottom) ===
  ctx.fillStyle = barColor;
  ctx.fillRect(x, filledTop, scaledW, filledHeight);

  if (glow) {
    ctx.save();
    ctx.shadowColor = barColor;
    ctx.shadowBlur = 8 * uiScale;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = barColor;
    ctx.fillRect(x, filledTop, scaledW, filledHeight);
    ctx.restore();
  }

  // === Text Label (above bar) ===
  if (showLabel) {
    ctx.save();
    ctx.font = `${Math.round(11 * getUniformScaleFactor())}px monospace`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    const labelText = `${Math.round(value)}${unit ? ` ${unit}` : ''}`;
    ctx.fillText(labelText, x + scaledW / 2, y - 4 * getUniformScaleFactor());

    ctx.restore();
  }
}
