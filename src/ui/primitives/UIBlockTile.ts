// src/ui/primitives/UIBlockTile.ts

export interface UIBlockTile {
  x: number;
  y: number;
  size: number;
  sprite: CanvasImageSource;
  isHovered: boolean;
  isSelected: boolean;
  isLocked?: boolean; // ← New
  onClick: () => void;
}

export function drawBlockTile(ctx: CanvasRenderingContext2D, tile: UIBlockTile): void {
  const { x, y, size, sprite, isHovered, isSelected, isLocked } = tile;

  ctx.fillStyle = isSelected ? '#4f4' : isHovered ? '#888' : '#333';
  ctx.fillRect(x, y, size - 4, size - 4);

  ctx.drawImage(
    sprite,
    x + (size - 32) / 2,
    y + (size - 32) / 2,
    32,
    32
  );

  if (isLocked) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(x, y, size - 4, size - 4);

    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔒', x + (size - 4) / 2, y + (size - 4) / 2);
  }

  if (isSelected) {
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, size - 6, size - 6);
  }
}
