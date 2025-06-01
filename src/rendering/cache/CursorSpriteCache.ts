// src/rendering/cache/CursorSpriteCache.ts

const cursorSprite: HTMLCanvasElement = document.createElement('canvas');
cursorSprite.width = 16;
cursorSprite.height = 16;

const ctx = cursorSprite.getContext('2d')!;
ctx.clearRect(0, 0, 16, 16);

// Draw green crosshair
ctx.strokeStyle = '#0f0';
ctx.lineWidth = 1;

ctx.beginPath();
ctx.moveTo(8, 0);
ctx.lineTo(8, 16);
ctx.moveTo(0, 8);
ctx.lineTo(16, 8);
ctx.stroke();

export function getCursorSprite(): HTMLCanvasElement {
  return cursorSprite;
}
