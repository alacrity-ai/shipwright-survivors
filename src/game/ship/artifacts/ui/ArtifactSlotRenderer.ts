// // src/game/ship/artifacts/ui/ArtifactSlotRenderer.ts

// import { getArtifactIconSprite } from '@/game/ship/artifacts/icons/ArtifactIconSpriteCache';
// import { drawMinimalistWindow } from '@/ui/primitives/UIMinimalistWindow';
// import { getRarityColor, getRarityColorDarkened } from '../helpers/getRarityColor';
// import { getUniformScaleFactor } from '@/config/view';

// interface ArtifactSlotRenderParams {
//   ctx: CanvasRenderingContext2D;
//   x: number;
//   y: number;
//   size: number;
//   rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
//   iconKey?: string;
//   isHovered: boolean;
//   isSelected: boolean;
//   isEmpty: boolean;
// }

// export async function drawArtifactSlot(params: ArtifactSlotRenderParams): Promise<void> {
//   const {
//     ctx, x, y, size,
//     rarity,
//     iconKey,
//     isHovered,
//     isSelected,
//     isEmpty
//   } = params;

//   ctx.save();

//   const scale = getUniformScaleFactor();

//   // === Visual Theming ===
//   const baseBorderColor = getRarityColorDarkened(rarity) || '#00FFFF';
//   const hoverBorderColor = getRarityColor(rarity) || '#FFFFFF';
//   const selectedBorderColor = '#00FFAA';
//   const fillColor = '#001122';

//   const borderColor = isSelected
//     ? selectedBorderColor
//     : isHovered
//     ? hoverBorderColor
//     : baseBorderColor;

//   const borderAlpha = isHovered ? 1.0 : 0.8;

//   // === Frame ===
//   drawMinimalistWindow(ctx, x, y, size, size, {
//     borderRadius: 6,
//     borderColor,
//     fillColor,
//     alpha: borderAlpha,
//     borderWidth: 2 * scale,
//   });

//   // === Icon or Placeholder ===
//   const iconSize = size * 0.8;
//   const iconX = x + (size - iconSize) / 2;
//   const iconY = y + (size - iconSize) / 2;

//   if (!isEmpty && iconKey) {
//     const img = await getArtifactIconSprite(iconKey);
//     ctx.drawImage(img, iconX, iconY, iconSize, iconSize);
//   } else {
//     // Draw subtle glowing placeholder ring
//     ctx.beginPath();
//     ctx.strokeStyle = '#005577';
//     ctx.lineWidth = 2 * scale;
//     ctx.arc(x + size / 2, y + size / 2, iconSize * 0.4, 0, Math.PI * 2);
//     ctx.stroke();
//   }

//   ctx.restore();
// }


// src/game/ship/artifacts/ui/ArtifactSlotRenderer.ts

import { getArtifactIconSprite } from '@/game/ship/artifacts/icons/ArtifactIconSpriteCache';
import { drawMinimalistWindow } from '@/ui/primitives/UIMinimalistWindow';
import { getRarityColor, getRarityColorDarkened } from '../helpers/getRarityColor';
import { getUniformScaleFactor } from '@/config/view';

type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

interface ArtifactSlotRenderParams {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  size: number;
  rarity: Rarity;
  iconKey?: string;
  isHovered: boolean;
  isSelected: boolean;
  isEmpty: boolean;
}

// ──────────────────────────────────────────────────────────
// Minimal sprite cache: sync get + async warm (idempotent).
// Prevents async gaps in the render pass.
// ──────────────────────────────────────────────────────────
const ICON_IMG = new Map<string, HTMLImageElement>();   // iconKey -> img
const ICON_PEND = new Map<string, Promise<void>>();     // iconKey -> inflight

function requestArtifactIcon(iconKey: string): HTMLImageElement | null {
  const hit = ICON_IMG.get(iconKey);
  if (hit) return hit;

  if (!ICON_PEND.has(iconKey)) {
    const p = getArtifactIconSprite(iconKey)
      .then(img => { ICON_IMG.set(iconKey, img); })
      .catch(() => { /* swallow; draw placeholder until next frame */ })
      .finally(() => { ICON_PEND.delete(iconKey); });
    ICON_PEND.set(iconKey, p);
  }
  return null;
}

/** Preload multiple artifact icons (safe to call every frame). */
export function preloadArtifactIcons(iconKeys: readonly string[]): void {
  for (let i = 0; i < iconKeys.length; i++) {
    const k = iconKeys[i];
    if (k) requestArtifactIcon(k);
  }
}

/** Convenience: preload a single icon. */
export function preloadArtifactIcon(iconKey: string | undefined): void {
  if (iconKey) requestArtifactIcon(iconKey);
}

/**
 * Synchronous draw. If the icon is not ready this frame, we render
 * a subtle placeholder so Z-order remains deterministic.
 */
export function drawArtifactSlot(params: ArtifactSlotRenderParams): void {
  const {
    ctx, x, y, size,
    rarity,
    iconKey,
    isHovered,
    isSelected,
    isEmpty
  } = params;

  ctx.save();

  const scale = getUniformScaleFactor();

  // === Visual Theming ===
  const baseBorderColor = getRarityColorDarkened(rarity) || '#00FFFF';
  const hoverBorderColor = getRarityColor(rarity) || '#FFFFFF';
  const selectedBorderColor = '#00FFAA';
  const fillColor = '#001122';

  const borderColor = isSelected
    ? selectedBorderColor
    : isHovered
    ? hoverBorderColor
    : baseBorderColor;

  const borderAlpha = isHovered ? 1.0 : 0.8;

  // === Frame ===
  drawMinimalistWindow(ctx, x, y, size, size, {
    borderRadius: 6,
    borderColor,
    fillColor,
    alpha: borderAlpha,
    borderWidth: 2 * scale,
  });

  // === Icon or Placeholder ===
  const iconSize = size * 0.8;
  const iconX = x + (size - iconSize) / 2;
  const iconY = y + (size - iconSize) / 2;

  if (!isEmpty && iconKey) {
    const img = requestArtifactIcon(iconKey);
    if (img) {
      ctx.drawImage(img, iconX, iconY, iconSize, iconSize);
    } else {
      // Subtle pending shimmer (keeps Z-order stable, no layout jump)
      placeholderIcon(ctx, iconX, iconY, iconSize, scale);
    }
  } else {
    // Empty slot ring
    ctx.beginPath();
    ctx.strokeStyle = '#005577';
    ctx.lineWidth = 2 * scale;
    ctx.arc(x + size / 2, y + size / 2, iconSize * 0.4, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────
function placeholderIcon(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number, scale: number
): void {
  ctx.save();
  // Base tile
  ctx.globalAlpha *= 0.35;
  ctx.fillStyle = '#0b111a';
  ctx.fillRect(x, y, size, size);

  // Gentle shimmer
  const g = ctx.createLinearGradient(x, y, x + size, y);
  g.addColorStop(0.0, 'rgba(255,255,255,0.00)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.06)');
  g.addColorStop(1.0, 'rgba(255,255,255,0.00)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, size, size);

  // Inner ring hint
  ctx.globalAlpha *= 0.9;
  ctx.beginPath();
  ctx.strokeStyle = '#083a4a';
  ctx.lineWidth = 2 * scale;
  ctx.arc(x + size / 2, y + size / 2, size * 0.32, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}
