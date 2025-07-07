// src/game/ship/artifacts/ui/ArtifactSlotRenderer.ts

import { getArtifactIconSprite } from '@/game/ship/artifacts/icons/ArtifactIconSpriteCache';
import { drawMinimalistWindow } from '@/ui/primitives/UIMinimalistWindow';

interface ArtifactSlotRenderParams {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  size: number;
  iconKey?: string;
  isHovered: boolean;
  isSelected: boolean;
  isEmpty: boolean;
}

export async function drawArtifactSlot(params: ArtifactSlotRenderParams): Promise<void> {
  const {
    ctx, x, y, size,
    iconKey,
    isHovered,
    isSelected,
    isEmpty
  } = params;

  ctx.save();

  // === Visual Theming ===
  const baseBorderColor = '#00FFFF';
  const hoverBorderColor = '#33FFFF';
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
  });

  // === Icon or Placeholder ===
  const iconSize = size * 0.8;
  const iconX = x + (size - iconSize) / 2;
  const iconY = y + (size - iconSize) / 2;

  if (!isEmpty && iconKey) {
    const img = await getArtifactIconSprite(iconKey);
    ctx.drawImage(img, iconX, iconY, iconSize, iconSize);
  } else {
    // Draw subtle glowing placeholder ring
    ctx.beginPath();
    ctx.strokeStyle = '#005577';
    ctx.lineWidth = 1.5;
    ctx.arc(x + size / 2, y + size / 2, iconSize * 0.4, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}
