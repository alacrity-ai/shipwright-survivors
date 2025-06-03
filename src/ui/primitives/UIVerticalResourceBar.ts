// src/ui/primitives/UIVerticalResourceBar.ts

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
    unit?: string; // e.g., 'm/s', 'kg', '°C'
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
  private maxAge = 30000; // 30 seconds

  static getInstance(): StaticVerticalBarCache {
    if (!StaticVerticalBarCache.instance) {
      StaticVerticalBarCache.instance = new StaticVerticalBarCache();
    }
    return StaticVerticalBarCache.instance;
  }

  getOrCreate(bar: UIVerticalResourceBar): VBarCacheEntry {
    const { width, height, style = {} } = bar;
    const merged = { ...DEFAULT_STYLE, ...style };

    const key = `vbar_${width}_${height}_${merged.backgroundColor}_${merged.borderColor}`;

    const existing = this.cache.get(key);
    if (existing && Date.now() - existing.timestamp < this.maxAge) return existing;

    const canvas = document.createElement('canvas');
    canvas.width = width + 4;
    canvas.height = height + 4;
    const ctx = canvas.getContext('2d')!;

    // Render static background, border, scanlines
    ctx.save();

    // === Background ===
    ctx.fillStyle = merged.backgroundColor;
    ctx.fillRect(2, 2, width, height);

    // === Border ===
    ctx.strokeStyle = merged.borderColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(1.5, 1.5, width + 1, height + 1);

    // === Scanlines ===
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < height; i += 2) {
      ctx.fillRect(2, 2 + i, width, 1);
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
  bar: UIVerticalResourceBar
): void {
  const {
    x, y, width, height,
    value, maxValue,
    style = {}
  } = bar;

  const {
    barColor,
    backgroundColor,
    borderColor,
    glow,
    textColor,
    showLabel,
    unit,
  } = { ...DEFAULT_STYLE, ...style };

  const clampedValue = Math.max(0, Math.min(value, maxValue));
  const fillHeight = (clampedValue / maxValue) * height;

  // === Cached static layer ===
  const staticCache = StaticVerticalBarCache.getInstance().getOrCreate(bar);
  ctx.drawImage(staticCache.canvas, x - 2, y - 2);

  // === Filled segment ===
  ctx.fillStyle = barColor;
  ctx.fillRect(x, y + height - fillHeight, width, fillHeight);

  // === Glow effect ===
  if (glow) {
    ctx.save();
    ctx.shadowColor = barColor;
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = barColor;
    ctx.fillRect(x, y + height - fillHeight, width, fillHeight);
    ctx.restore();
  }

  // === Label ===
  if (showLabel) {
    ctx.save();
    ctx.font = '11px monospace';
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const unitSuffix = unit ? ` ${unit}` : '';
    ctx.fillText(`${Math.round(value)}${unitSuffix}`, x + width / 2, y - 4);
    ctx.restore();
  }
}
