// src/ui/primitives/ShipCard.ts

import { getUniformScaleFactor } from '@/config/view';
import { loadImage } from '@/shared/imageCache';
import { getAssetPath } from '@/shared/assetHelpers';
import { ShipBlueprintRegistry } from '@/game/ship/ShipBlueprintRegistry';

export interface DrawShipCardOptions {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  size: number;
  shipId: string;
  isHovered: boolean;
  isSelected: boolean;
  isLocked: boolean;
  hoverColorOverride?: string;
  alpha?: number;
  scale?: number; // kept for API parity (unused here)
}

// ──────────────────────────────────────────────────────────
// Small icon cache: sync get + async warm (idempotent).
// Avoids awaits in render; preserves z-order determinism.
// ──────────────────────────────────────────────────────────
const ICON_IMG = new Map<string, HTMLImageElement>();   // shipId -> img
const ICON_PEND = new Map<string, Promise<void>>();     // shipId -> inflight promise

function requestShipIcon(shipId: string, iconImagePath: string): HTMLImageElement | null {
  const existing = ICON_IMG.get(shipId);
  if (existing) return existing;

  if (!ICON_PEND.has(shipId)) {
    const p = loadImage(getAssetPath(iconImagePath))
      .then(img => { ICON_IMG.set(shipId, img); })
      .catch(() => { /* noop; draw placeholder until future tries */ })
      .finally(() => { ICON_PEND.delete(shipId); });

    ICON_PEND.set(shipId, p);
  }
  return null;
}

/** Preload a list of ship icons. Safe to call every frame; idempotent and cheap. */
export function preloadShipCards(shipIds: readonly string[]): void {
  for (let i = 0; i < shipIds.length; i++) {
    const shipId = shipIds[i];
    const def = ShipBlueprintRegistry.getByName(shipId);
    if (!def) continue;
    requestShipIcon(shipId, def.iconImagePath);
  }
}

/** Optional: single-id convenience */
export function preloadShipCard(shipId: string): void {
  const def = ShipBlueprintRegistry.getByName(shipId);
  if (!def) return;
  requestShipIcon(shipId, def.iconImagePath);
}

// Shared geometry helper (avoids function re-creation per draw)
function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Synchronous draw. If the image isn’t ready this frame,
 * a tasteful placeholder is rendered instead (no layout shift).
 */
export function drawShipCard(options: DrawShipCardOptions): void {
  const {
    ctx,
    x, y,
    size,
    shipId,
    isHovered,
    isSelected,
    isLocked,
    hoverColorOverride,
    alpha = 1.0,
  } = options;

  const uiScale = getUniformScaleFactor();
  const radius = 8 * uiScale;

  const shipDef = ShipBlueprintRegistry.getByName(shipId);
  if (!shipDef) {
    // Draw a muted box so the grid remains stable if an id is bad.
    ctx.save();
    ctx.globalAlpha *= alpha * 0.5;
    ctx.fillStyle = '#1a1a1a';
    roundedRect(ctx, x, y, size, size, radius);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Synchronous fetch (kicks off async warm if missing)
  const sprite = requestShipIcon(shipId, shipDef.iconImagePath);

  // === Card Background ===
  ctx.save();
  ctx.globalAlpha *= alpha;

  if (isHovered && !isLocked) {
    ctx.shadowColor = hoverColorOverride ?? '#14b8a6';
    ctx.shadowBlur = 8 * uiScale;
  } else if (isSelected && !isLocked) {
    ctx.shadowColor = '#60a5fa';
    ctx.shadowBlur = 12 * uiScale;
  } else {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }

  const gradient = ctx.createLinearGradient(x, y, x, y + size);
  if (isLocked) {
    gradient.addColorStop(0, '#2e2e2e');
    gradient.addColorStop(1, '#1e1e1e');
  } else if (isSelected) {
    gradient.addColorStop(0, '#3b82f6');
    gradient.addColorStop(1, '#1d4ed8');
  } else if (isHovered) {
    gradient.addColorStop(0, '#0f766e');
    gradient.addColorStop(1, '#134e4a');
  } else {
    gradient.addColorStop(0, '#1f2937');
    gradient.addColorStop(1, '#111827');
  }

  ctx.fillStyle = gradient;
  roundedRect(ctx, x, y, size, size, radius);
  ctx.fill();

  // === Inner Highlight ===
  const highlightGradient = ctx.createLinearGradient(x, y, x, y + size * 0.3);
  highlightGradient.addColorStop(0, isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)');
  highlightGradient.addColorStop(1, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = highlightGradient;
  roundedRect(ctx, x, y, size, size * 0.3, radius);
  ctx.fill();

  // === Ship Icon or Placeholder ===
  const iconSize = size * 0.72;
  const padding = (size - iconSize) / 2;

  if (sprite) {
    ctx.save();
    if ((isHovered || isSelected) && !isLocked) {
      ctx.shadowColor = isSelected ? '#3b82f6' : (hoverColorOverride ?? '#14b8a6');
      ctx.shadowBlur = 4 * uiScale;
    }
    ctx.drawImage(sprite, x + padding, y + padding, iconSize, iconSize);
    ctx.restore();
  } else {
    // Subtle placeholder to indicate pending load (keeps Z-order fixed).
    ctx.save();
    ctx.globalAlpha *= 0.35;
    ctx.fillStyle = '#0b111a';
    ctx.fillRect(x + padding, y + padding, iconSize, iconSize);

    // Gentle crossfade shimmer
    const g = ctx.createLinearGradient(x + padding, y + padding, x + padding + iconSize, y + padding);
    g.addColorStop(0.0, 'rgba(255,255,255,0.00)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.06)');
    g.addColorStop(1.0, 'rgba(255,255,255,0.00)');
    ctx.fillStyle = g;
    ctx.fillRect(x + padding, y + padding, iconSize, iconSize);
    ctx.restore();
  }

  ctx.restore();
}
