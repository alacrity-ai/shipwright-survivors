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
  scale?: number;
}

export async function drawShipCard(options: DrawShipCardOptions): Promise<void> {
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
    scale = 1.0,
  } = options;

  const uiScale = getUniformScaleFactor();
  const radius = 8 * uiScale;

  const shipDef = ShipBlueprintRegistry.getByName(shipId);
  if (!shipDef) {
    console.warn(`[drawShipCard] Unknown shipId: ${shipId}`);
    return;
  }

  const sprite = await loadImage(getAssetPath(shipDef.iconImagePath));

  // === Card Background ===
  ctx.save();
  ctx.globalAlpha *= alpha;

  const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number) => {
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
  };

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
  drawRoundedRect(x, y, size, size, radius);
  ctx.fill();

  // === Inner Highlight ===
  const highlightGradient = ctx.createLinearGradient(x, y, x, y + size * 0.3);
  highlightGradient.addColorStop(0, isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)');
  highlightGradient.addColorStop(1, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = highlightGradient;
  drawRoundedRect(x, y, size, size * 0.3, radius);
  ctx.fill();

  // === Ship Icon ===
  const iconSize = size * 0.72;
  const padding = (size - iconSize) / 2;

  ctx.save();
  if ((isHovered || isSelected) && !isLocked) {
    ctx.shadowColor = isSelected ? '#3b82f6' : (hoverColorOverride ?? '#14b8a6');
    ctx.shadowBlur = 4 * uiScale;
  }
  ctx.drawImage(sprite, x + padding, y + padding, iconSize, iconSize);
  ctx.restore();
}
