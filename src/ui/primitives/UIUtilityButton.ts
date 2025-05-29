// src/ui/primitives/UIUtilityButton.ts

export interface UIUtilityButton {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  isHovered: boolean;
  isActive: boolean;
  onClick: () => void;
}

export function drawUtilityButton(ctx: CanvasRenderingContext2D, button: UIUtilityButton): void {
  const { x, y, width, height, label, isHovered, isActive } = button;

  ctx.fillStyle = isActive
    ? '#4f4' // bright green for active
    : isHovered
    ? '#444'
    : '#222';

  ctx.strokeStyle = isActive ? '#0f0' : '#888';
  ctx.lineWidth = 1;

  ctx.fillRect(x, y, width, height);
  ctx.strokeRect(x, y, width, height);

  ctx.fillStyle = '#fff';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + width / 2, y + height / 2);
}
