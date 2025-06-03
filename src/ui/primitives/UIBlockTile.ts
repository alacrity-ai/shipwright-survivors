// src/ui/primitives/UIBlockTile.ts

export interface UIBlockTile {
  x: number;
  y: number;
  size: number;
  sprite: CanvasImageSource;
  overlaySprite?: CanvasImageSource;
  isHovered: boolean;
  isSelected: boolean;
  isLocked?: boolean;
  onClick: () => void;
}


export function drawBlockTile(ctx: CanvasRenderingContext2D, tile: UIBlockTile): void {
  const { x, y, size, sprite, overlaySprite, isHovered, isSelected, isLocked } = tile;

  // Draw tile background
  ctx.fillStyle = isSelected ? '#4f4' : isHovered ? '#888' : '#333';
  ctx.fillRect(x, y, size - 4, size - 4);

  const iconSize = 32;
  const offsetX = x + (size - iconSize) / 2;
  const offsetY = y + (size - iconSize) / 2;

  // Draw base sprite
  ctx.drawImage(sprite, offsetX, offsetY, iconSize, iconSize);

  // Draw overlay sprite if available
  if (overlaySprite) {
    ctx.drawImage(overlaySprite, offsetX, offsetY, iconSize, iconSize);
  }

  // Dim and lock icon
  if (isLocked) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(x, y, size - 4, size - 4);

    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔒', x + (size - 4) / 2, y + (size - 4) / 2);
  }

  // Selection border
  if (isSelected) {
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, size - 6, size - 6);
  }
}
