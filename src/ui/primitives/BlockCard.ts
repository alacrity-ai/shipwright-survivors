// src/ui/primitives/drawBlockCard.ts

import { getBlockSprite } from '@/rendering/cache/BlockSpriteCache'; // To get block sprites by blocktype.id
import { getBlockType } from '@/game/blocks/BlockRegistry';

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
  brighten?: number;
  blockId?: string;
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
    blockId,
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

  ctx.drawImage(cachedCanvas, 0, 0, width, height);

  if (blockId) {
    const blockType = getBlockType(blockId);
    if (!blockType) return;

    const sprite = getBlockSprite(blockType);
    const spriteSize = sprite.base.width;
    const padding = 4;
    const drawSize = width - 2 * padding;

    // Draw sprite normally
    ctx.drawImage(
      sprite.base,
      0, 0, spriteSize, spriteSize,
      padding, padding, drawSize, drawSize
    );

    if (sprite.overlay) {
      ctx.drawImage(
        sprite.overlay,
        0, 0, spriteSize, spriteSize,
        padding, padding, drawSize, drawSize
      );
    }

    if (brightenAmt > 0.01) {
      // Apply screen-based brighten to the block sprite only
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `rgba(255, 255, 255, ${0.5 * brightenAmt})`; // 0.5 scale to avoid blowing out
      ctx.fillRect(padding, padding, drawSize, drawSize);
      ctx.restore();
    }
  } else if (brightenAmt > 0.01) {
    // If no sprite, brighten the background only
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `rgba(255, 255, 255, ${0.3 * brightenAmt})`; // Reduced alpha for subtlety
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  ctx.restore();
}
