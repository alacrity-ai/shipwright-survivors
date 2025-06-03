// src/ui/primitives/UIResourceBar.ts

import { addAlphaToHex } from "@/shared/colorUtils";

export interface UIResourceBar {
  x: number;
  y: number;
  width: number;
  height: number;
  value: number; // In [0, 1]
  label?: string; // Optional label text like "90 / 100"

  style?: {
    barColor?: string;
    backgroundColor?: string;
    borderColor?: string;
    glow?: boolean;
    textColor?: string;
    font?: string;
    scanlineIntensity?: number; // 0-1, intensity of scanline effect
    chromaticAberration?: boolean;
    phosphorDecay?: boolean; // Adds subtle phosphor persistence effect
    cornerBevel?: boolean; // Adds beveled corners for that chunky 80s look
    warningThreshold?: number; // Value below which bar turns warning color
    criticalThreshold?: number; // Value below which bar turns critical color
    warningColor?: string;
    criticalColor?: string;
    animated?: boolean; // Adds subtle animation effects
  };
}

const DEFAULT_STYLE = {
  barColor: '#00ff41',
  backgroundColor: '#0a0a0a',
  borderColor: '#00ff41',
  textColor: '#00ff41',
  glow: true,
  font: '11px "Courier New", monospace',
  scanlineIntensity: 0.3,
  chromaticAberration: true,
  phosphorDecay: true,
  cornerBevel: true,
  warningThreshold: 0.3,
  criticalThreshold: 0.15,
  warningColor: '#ffaa00',
  criticalColor: '#ff0040',
  animated: true,
};

// Cache for static elements that don't change between frames
interface CacheEntry {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  cacheKey: string;
  timestamp: number;
}

class ResourceBarCache {
  private static instance: ResourceBarCache;
  private cache = new Map<string, CacheEntry>();
  private maxCacheSize = 50;
  private maxAge = 30000; // 30 seconds

  static getInstance(): ResourceBarCache {
    if (!ResourceBarCache.instance) {
      ResourceBarCache.instance = new ResourceBarCache();
    }
    return ResourceBarCache.instance;
  }

  private generateCacheKey(bar: UIResourceBar, type: 'background' | 'border' | 'scanlines'): string {
    const { width, height, style = {} } = bar;
    const mergedStyle = { ...DEFAULT_STYLE, ...style };
    const value = Math.max(0, Math.min(1, bar.value));

    let resolvedBorderColor = mergedStyle.borderColor;
    if (value <= mergedStyle.criticalThreshold) {
      resolvedBorderColor = mergedStyle.criticalColor;
    } else if (value <= mergedStyle.warningThreshold) {
      resolvedBorderColor = mergedStyle.warningColor;
    }

    switch (type) {
      case 'background':
        return `bg_${width}_${height}_${mergedStyle.backgroundColor}_${mergedStyle.cornerBevel}`;
      case 'border':
        return `border_${width}_${height}_${resolvedBorderColor}_${mergedStyle.cornerBevel}`;
      case 'scanlines':
        return `scan_${width}_${height}_${mergedStyle.scanlineIntensity}`;
      default:
        return '';
    }
  }

  getOrCreate(bar: UIResourceBar, type: 'background' | 'border' | 'scanlines'): CacheEntry | null {
    const cacheKey = this.generateCacheKey(bar, type);
    const cached = this.cache.get(cacheKey);
    
    // Return cached version if valid
    if (cached && (Date.now() - cached.timestamp) < this.maxAge) {
      return cached;
    }

    // Clean old entries
    this.cleanup();

    // Create new cache entry
    const canvas = document.createElement('canvas');
    canvas.width = bar.width + 20; // Extra space for effects
    canvas.height = bar.height + 20;
    const ctx = canvas.getContext('2d')!;
    
    const entry: CacheEntry = {
      canvas,
      ctx,
      cacheKey,
      timestamp: Date.now()
    };

    // Render the static element
    this.renderStaticElement(bar, type, ctx);
    
    this.cache.set(cacheKey, entry);
    return entry;
  }

  private renderStaticElement(bar: UIResourceBar, type: string, ctx: CanvasRenderingContext2D): void {
    const { width, height, style = {} } = bar;
    const mergedStyle = { ...DEFAULT_STYLE, ...style };
    const x = 10; // Offset for extra space
    const y = 10;

    switch (type) {
      case 'background':
        this.renderBackground(ctx, x, y, width, height, mergedStyle);
        break;
      case 'border':
        const value = Math.max(0, Math.min(1, bar.value));
        let effectiveColor = mergedStyle.borderColor;
        if (value <= mergedStyle.criticalThreshold) {
          effectiveColor = mergedStyle.criticalColor;
        } else if (value <= mergedStyle.warningThreshold) {
          effectiveColor = mergedStyle.warningColor;
        }
        this.renderBorder(ctx, x, y, width, height, { ...mergedStyle, borderColor: effectiveColor });
        break;
      case 'scanlines':
        this.renderScanlines(ctx, x, y, width, height, mergedStyle);
        break;
    }
  }

  private renderBackground(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, style: any): void {
    ctx.save();
    
    // Corner beveling setup
    if (style.cornerBevel) {
      const bevelSize = Math.min(3, height * 0.2);
      ctx.beginPath();
      ctx.moveTo(x + bevelSize, y);
      ctx.lineTo(x + width - bevelSize, y);
      ctx.lineTo(x + width, y + bevelSize);
      ctx.lineTo(x + width, y + height - bevelSize);
      ctx.lineTo(x + width - bevelSize, y + height);
      ctx.lineTo(x + bevelSize, y + height);
      ctx.lineTo(x, y + height - bevelSize);
      ctx.lineTo(x, y + bevelSize);
      ctx.closePath();
      ctx.clip();
    }

    // Background gradient
    const bgGradient = ctx.createLinearGradient(x, y, x, y + height);
    bgGradient.addColorStop(0, addAlphaToHex(style.backgroundColor, 'ff'));
    bgGradient.addColorStop(0.5, addAlphaToHex(style.backgroundColor, 'cc'));
    bgGradient.addColorStop(1, addAlphaToHex(style.backgroundColor, 'ff'));
    ctx.fillStyle = bgGradient;
    ctx.fillRect(x, y, width, height);
    
    ctx.restore();
  }

  private renderBorder(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, style: any): void {
    ctx.save();
    ctx.strokeStyle = style.borderColor;
    ctx.lineWidth = 2;
    
    if (style.cornerBevel) {
      const bevelSize = Math.min(3, height * 0.2);
      ctx.beginPath();
      ctx.moveTo(x + bevelSize, y);
      ctx.lineTo(x + width - bevelSize, y);
      ctx.lineTo(x + width, y + bevelSize);
      ctx.lineTo(x + width, y + height - bevelSize);
      ctx.lineTo(x + width - bevelSize, y + height);
      ctx.lineTo(x + bevelSize, y + height);
      ctx.lineTo(x, y + height - bevelSize);
      ctx.lineTo(x, y + bevelSize);
      ctx.closePath();
      ctx.stroke();
    } else {
      ctx.strokeRect(x, y, width, height);
    }
    
    // Inner highlight
    ctx.strokeStyle = `${style.borderColor}40`;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);
    
    // Corner brackets
    ctx.strokeStyle = style.borderColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7;
    
    const bracketSize = Math.min(8, height * 0.4);
    
    // Top-left bracket
    ctx.beginPath();
    ctx.moveTo(x - 4, y + bracketSize);
    ctx.lineTo(x - 4, y - 4);
    ctx.lineTo(x + bracketSize, y - 4);
    ctx.stroke();
    
    // Top-right bracket
    ctx.beginPath();
    ctx.moveTo(x + width - bracketSize, y - 4);
    ctx.lineTo(x + width + 4, y - 4);
    ctx.lineTo(x + width + 4, y + bracketSize);
    ctx.stroke();
    
    // Bottom-right bracket
    ctx.beginPath();
    ctx.moveTo(x + width + 4, y + height - bracketSize);
    ctx.lineTo(x + width + 4, y + height + 4);
    ctx.lineTo(x + width - bracketSize, y + height + 4);
    ctx.stroke();
    
    // Bottom-left bracket
    ctx.beginPath();
    ctx.moveTo(x + bracketSize, y + height + 4);
    ctx.lineTo(x - 4, y + height + 4);
    ctx.lineTo(x - 4, y + height - bracketSize);
    ctx.stroke();
    
    ctx.restore();
  }

  private renderScanlines(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, style: any): void {
    if (style.scanlineIntensity <= 0) return;
    
    ctx.save();
    const scanlineSpacing = 2;
    const scanlineThickness = 1;
    
    ctx.fillStyle = `rgba(255, 255, 255, ${style.scanlineIntensity * 0.08})`;
    
    for (let i = 0; i < height + scanlineSpacing; i += scanlineSpacing) {
      if (y + i >= y && y + i < y + height) {
        ctx.fillRect(x, y + i, width, scanlineThickness);
      }
    }
    
    ctx.restore();
  }

  private cleanup(): void {
    if (this.cache.size <= this.maxCacheSize) return;
    
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    
    // Remove old entries
    entries.forEach(([key, entry]) => {
      if (now - entry.timestamp > this.maxAge) {
        this.cache.delete(key);
      }
    });
    
    // If still too large, remove oldest entries
    if (this.cache.size > this.maxCacheSize) {
      const sortedEntries = entries
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, this.cache.size - this.maxCacheSize);
      
      sortedEntries.forEach(([key]) => this.cache.delete(key));
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

// Gradient cache for frequently used gradients
class GradientCache {
  private static instance: GradientCache;
  private cache = new Map<string, CanvasGradient>();

  static getInstance(): GradientCache {
    if (!GradientCache.instance) {
      GradientCache.instance = new GradientCache();
    }
    return GradientCache.instance;
  }

  getBarGradient(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, color: string, alpha: number): CanvasGradient {
    const key = `bar_${width}_${height}_${color}_${alpha}`;
    
    if (!this.cache.has(key)) {
      const gradient = ctx.createLinearGradient(x, y, x, y + height);
      const alphaFull = Math.floor(alpha * 255).toString(16).padStart(2, '0');
      const alphaMid = Math.floor(alpha * 180).toString(16).padStart(2, '0');

      gradient.addColorStop(0, addAlphaToHex(color, alphaFull));
      gradient.addColorStop(0.5, addAlphaToHex(color, alphaMid));
      gradient.addColorStop(1, addAlphaToHex(color, alphaFull));
      
      this.cache.set(key, gradient);
    }
    
    return this.cache.get(key)!;
  }

  getPhosphorGradient(ctx: CanvasRenderingContext2D, x: number, width: number, color: string, alpha: number): CanvasGradient {
    const key = `phosphor_${width}_${color}_${alpha}`;
    
    if (!this.cache.has(key)) {
      const gradient = ctx.createLinearGradient(x, 0, x + width, 0);
      gradient.addColorStop(0, addAlphaToHex(color, '08'));
      gradient.addColorStop(0.7, addAlphaToHex(color, '15'));
      gradient.addColorStop(1, addAlphaToHex(color, Math.floor(alpha * 255).toString(16).padStart(2, '0')));
      
      this.cache.set(key, gradient);
    }
    
    return this.cache.get(key)!;
  }

  clear(): void {
    this.cache.clear();
  }
}

export function drawUIResourceBar(
  ctx: CanvasRenderingContext2D,
  bar: UIResourceBar,
  time: number = Date.now()
): void {
  const {
    x, y, width, height,
    value,
    label,
    style = {},
  } = bar;

  const mergedStyle = { ...DEFAULT_STYLE, ...style };
  const {
    barColor,
    backgroundColor,
    borderColor,
    glow,
    textColor,
    font,
    scanlineIntensity,
    chromaticAberration,
    phosphorDecay,
    cornerBevel,
    warningThreshold,
    criticalThreshold,
    warningColor,
    criticalColor,
    animated,
  } = mergedStyle;

  const clampedValue = Math.max(0, Math.min(1, value));
  const filledWidth = clampedValue * width;

  // Determine current colors
  let currentBarColor = barColor;
  let currentBorderColor = borderColor;
  if (clampedValue <= criticalThreshold) {
    currentBarColor = criticalColor;
    currentBorderColor = criticalColor;
  } else if (clampedValue <= warningThreshold) {
    currentBarColor = warningColor;
    currentBorderColor = warningColor;
  }

  // Animation calculations
  let pulseIntensity = 1;
  let scanlineOffset = 0;
  if (animated) {
    if (clampedValue <= criticalThreshold) {
      pulseIntensity = 0.7 + 0.3 * Math.sin(time * 0.008);
    }
    scanlineOffset = (time * 0.02) % 4;
  }

  const cache = ResourceBarCache.getInstance();
  const gradientCache = GradientCache.getInstance();

  // === Render cached background ===
  const bgCache = cache.getOrCreate(bar, 'background');
  if (bgCache) {
    ctx.drawImage(bgCache.canvas, x - 10, y - 10);
  }

  // === Phosphor decay effect ===
  if (phosphorDecay && filledWidth > 0) {
    const decayGradient = gradientCache.getPhosphorGradient(ctx, x, filledWidth, currentBarColor, pulseIntensity);
    ctx.fillStyle = decayGradient;
    ctx.fillRect(x, y, filledWidth, height);
  }

  // === Main filled bar ===
  if (filledWidth > 0) {
    const barGradient = gradientCache.getBarGradient(ctx, x, y, width, height, currentBarColor, pulseIntensity);
    ctx.fillStyle = barGradient;
    ctx.fillRect(x, y, filledWidth, height);
  }

  // === Enhanced phosphor glow ===
  if (glow && filledWidth > 0) {
    ctx.save();
    
    // Outer glow
    ctx.shadowColor = currentBarColor;
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.globalAlpha = 0.4 * pulseIntensity;
    ctx.fillStyle = currentBarColor;
    ctx.fillRect(x - 1, y - 1, filledWidth + 2, height + 2);
    
    // Inner glow
    ctx.shadowBlur = 6;
    ctx.globalAlpha = 0.6 * pulseIntensity;
    ctx.fillRect(x, y, filledWidth, height);
    
    ctx.restore();
  }

  // === Chromatic aberration effect ===
  if (chromaticAberration && filledWidth > 0) {
    ctx.save();
    ctx.globalAlpha = 0.15;
    
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(x - 0.5, y, filledWidth, height);
    
    ctx.fillStyle = '#0000ff';
    ctx.fillRect(x + 0.5, y, filledWidth, height);
    
    ctx.restore();
  }

  // === Render cached scanlines with animation offset ===
  if (scanlineIntensity > 0) {
    const scanCache = cache.getOrCreate(bar, 'scanlines');
    if (scanCache) {
      ctx.save();
      ctx.globalAlpha = 1;
      
      // Draw with animation offset
      ctx.drawImage(scanCache.canvas, x - 10, y - 10 - scanlineOffset);
      
      // Draw moving horizontal interference (if animated)
      if (animated && Math.sin(time * 0.003) > 0.95) {
        ctx.fillStyle = `rgba(255, 255, 255, ${scanlineIntensity * 0.2})`;
        const interferenceY = y + (Math.sin(time * 0.007) * 0.5 + 0.5) * height;
        ctx.fillRect(x, interferenceY, width, 1);
      }
      
      ctx.restore();
    }
  }

  // === Render cached border with dynamic color ===
  const borderCache = cache.getOrCreate(bar, 'border');
  if (borderCache) {
    ctx.save();
    
    ctx.globalAlpha = pulseIntensity;
    ctx.drawImage(borderCache.canvas, x - 10, y - 10);
    ctx.restore();
  }

  // === Label with retro styling ===
  if (label) {
    ctx.save();
    ctx.font = font;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = pulseIntensity;
    
    if (glow) {
      ctx.shadowColor = textColor;
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }
    
    if (chromaticAberration) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#ff000040';
      ctx.fillText(label, x + width / 2 - 0.5, y + height / 2);
      ctx.fillStyle = '#0000ff40';
      ctx.fillText(label, x + width / 2 + 0.5, y + height / 2);
      ctx.restore();
    }
    
    ctx.fillText(label, x + width / 2, y + height / 2);
    ctx.restore();
  }

  // === Status indicators ===
  if (clampedValue <= criticalThreshold) {
    ctx.save();
    ctx.fillStyle = criticalColor;
    ctx.globalAlpha = (Math.sin(time * 0.015) + 1) * 0.3;
    ctx.fillRect(x - 2, y - 2, 4, 4);
    ctx.fillRect(x + width - 2, y - 2, 4, 4);
    ctx.restore();
  }
}

// Utility function to clear all caches (useful for cleanup)
export function clearResourceBarCaches(): void {
  ResourceBarCache.getInstance().clear();
  GradientCache.getInstance().clear();
}