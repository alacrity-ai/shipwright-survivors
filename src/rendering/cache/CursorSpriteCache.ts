// src/rendering/cache/CursorSpriteCache.ts

const cursorSprite: HTMLCanvasElement = document.createElement('canvas');
cursorSprite.width = 24;
cursorSprite.height = 24;

const ctx = cursorSprite.getContext('2d')!;
ctx.clearRect(0, 0, 24, 24);

const center = 12;

// === OUTLINE LAYER ===
ctx.strokeStyle = 'black';
ctx.lineWidth = 5;
ctx.beginPath();
ctx.moveTo(center, 2);
ctx.lineTo(center, 22);
ctx.moveTo(2, center);
ctx.lineTo(22, center);
ctx.stroke();

// === GLOWING GREEN LAYER ===
ctx.strokeStyle = '#00ff00';
ctx.lineWidth = 2;
ctx.shadowColor = '#00ff00';
ctx.shadowBlur = 4;
ctx.beginPath();
ctx.moveTo(center, 2);
ctx.lineTo(center, 22);
ctx.moveTo(2, center);
ctx.lineTo(22, center);
ctx.stroke();

// === BRIGHT CENTER DOT ===
ctx.shadowBlur = 6;
ctx.fillStyle = '#00ff00';
ctx.beginPath();
ctx.arc(center, center, 2.2, 0, Math.PI * 2);
ctx.fill();

// === Reset shadow settings ===
ctx.shadowBlur = 0;
ctx.shadowColor = 'transparent';

export function getCursorSprite(): HTMLCanvasElement {
  return cursorSprite;
}

// === Hovered Cursor (Cached) ===
const hoveredCursorSprite: HTMLCanvasElement = document.createElement('canvas');
hoveredCursorSprite.width = 28;
hoveredCursorSprite.height = 28;

{
  const ctx = hoveredCursorSprite.getContext('2d')!;
  ctx.clearRect(0, 0, 28, 28);
  const cx = 14;
  const cy = 14;

  // Outline diamond
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 10);
  ctx.lineTo(cx + 10, cy);
  ctx.lineTo(cx, cy + 10);
  ctx.lineTo(cx - 10, cy);
  ctx.closePath();
  ctx.stroke();

  // Glowing inner diamond
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#00ff00';
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 10);
  ctx.lineTo(cx + 10, cy);
  ctx.lineTo(cx, cy + 10);
  ctx.lineTo(cx - 10, cy);
  ctx.closePath();
  ctx.stroke();

  // Center dot
  ctx.fillStyle = '#00ff00';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
}

export function getHoveredCursorSprite(): HTMLCanvasElement {
  return hoveredCursorSprite;
}