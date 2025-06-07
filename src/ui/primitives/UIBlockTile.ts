// src/ui/primitives/UIBlockTile.ts

export interface UIBlockTile {
  x: number;
  y: number;
  size: number; // scaled tile size in pixels
  sprite: CanvasImageSource;
  overlaySprite?: CanvasImageSource;
  isHovered: boolean;
  isSelected: boolean;
  isLocked?: boolean;
  onClick: () => void;
}

/**
 * Renders a UI block tile with selection, hover, and lock states.
 *
 * @param ctx - Canvas 2D context
 * @param tile - UIBlockTile configuration (with pre-scaled x/y/size)
 * @param uiScale - Optional scale factor for font and stroke (default = 1.0)
 */
export function drawBlockTile(
  ctx: CanvasRenderingContext2D,
  tile: UIBlockTile,
  uiScale: number = 1.0
): void {
  const {
    x, y, size,
    sprite,
    overlaySprite,
    isHovered,
    isSelected,
    isLocked
  } = tile;

  const innerPadding = 4 * uiScale;
  const innerSize = size - innerPadding;

  // === Background ===
  ctx.fillStyle = isSelected ? '#4f4' : isHovered ? '#888' : '#333';
  ctx.fillRect(x, y, innerSize, innerSize);

  // === Sprite ===
  const iconSize = 32 * uiScale;
  const offsetX = x + (size - iconSize) / 2;
  const offsetY = y + (size - iconSize) / 2;

  ctx.drawImage(sprite, offsetX, offsetY, iconSize, iconSize);

  if (overlaySprite) {
    ctx.drawImage(overlaySprite, offsetX, offsetY, iconSize, iconSize);
  }

  // === Lock Overlay ===
  if (isLocked) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(x, y, innerSize, innerSize);

    ctx.fillStyle = '#ccc';
    ctx.font = `bold ${Math.round(12 * uiScale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔒', x + innerSize / 2, y + innerSize / 2);
  }

  // === Selection Border ===
  if (isSelected) {
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 2 * uiScale;
    ctx.strokeRect(
      x + 1 * uiScale,
      y + 1 * uiScale,
      innerSize - 2 * uiScale,
      innerSize - 2 * uiScale
    );
  }
}
