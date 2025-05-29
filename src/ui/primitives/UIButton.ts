// src/ui/primitives/UIButton.ts

export interface UIButton {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  onClick: () => void;
  isHovered?: boolean;
}

export function drawButton(ctx: CanvasRenderingContext2D, button: UIButton) {
  ctx.fillStyle = button.isHovered ? '#333' : '#222';
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(button.x, button.y, button.width, button.height, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(button.label, button.x + button.width / 2, button.y + button.height / 2);
}
