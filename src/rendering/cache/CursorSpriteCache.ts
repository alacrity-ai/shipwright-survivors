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

export function getCrosshairCursorSprite(): HTMLCanvasElement {
  return cursorSprite;
}

// === Target Crosshair Cursor (Cached) ===
const targetCrosshairSprite: HTMLCanvasElement = document.createElement('canvas');
targetCrosshairSprite.width = 24;
targetCrosshairSprite.height = 24;

{
  const ctx = targetCrosshairSprite.getContext('2d')!;
  ctx.clearRect(0, 0, 24, 24);
  const center = 12;

  // === OUTLINE LAYER ===
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 5;
  ctx.beginPath();
  // Shorter crosshair lines with gaps
  ctx.moveTo(center, 2);
  ctx.lineTo(center, 7);
  ctx.moveTo(center, 17);
  ctx.lineTo(center, 22);
  ctx.moveTo(2, center);
  ctx.lineTo(7, center);
  ctx.moveTo(17, center);
  ctx.lineTo(22, center);
  ctx.stroke();

  // === GLOWING GREEN LAYER ===
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#00ff00';
  ctx.shadowBlur = 4;
  ctx.beginPath();
  // Shorter crosshair lines
  ctx.moveTo(center, 2);
  ctx.lineTo(center, 7);
  ctx.moveTo(center, 17);
  ctx.lineTo(center, 22);
  ctx.moveTo(2, center);
  ctx.lineTo(7, center);
  ctx.moveTo(17, center);
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
}

export function getTargetCrosshairSprite(): HTMLCanvasElement {
  return targetCrosshairSprite;
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

function createArrowCursorSprite(direction: 'up' | 'right' | 'down' | 'left'): HTMLCanvasElement {
  const size = 28;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);
  ctx.lineJoin = 'round';

  // Define arrow pointing up at origin
  const cx = size / 2;
  const cy = size / 2;

  const path = new Path2D();
  path.moveTo(cx, cy - 10); // Tip
  path.lineTo(cx - 6, cy + 6); // Bottom left
  path.lineTo(cx, cy + 2);     // Center base
  path.lineTo(cx + 6, cy + 6); // Bottom right
  path.closePath();

  // Rotation
  ctx.save();
  ctx.translate(cx, cy);
  switch (direction) {
    case 'right': ctx.rotate(Math.PI / 2); break;
    case 'down':  ctx.rotate(Math.PI);     break;
    case 'left':  ctx.rotate(-Math.PI / 2); break;
    // 'up' needs no rotation
  }
  ctx.translate(-cx, -cy);

  // === Outline Layer ===
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 5;
  ctx.stroke(path);

  // === Glowing Green Layer ===
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#00ff00';
  ctx.shadowBlur = 4;
  ctx.stroke(path);

  // === Bright Center Dot (optional highlight) ===
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#00ff00';
  ctx.beginPath();
  ctx.arc(cx, cy, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // === Cleanup ===
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.restore();

  return canvas;
}

// === Arrow Cursor Sprites ===
const arrowUpCursor = createArrowCursorSprite('up');
const arrowRightCursor = createArrowCursorSprite('right');
const arrowDownCursor = createArrowCursorSprite('down');
const arrowLeftCursor = createArrowCursorSprite('left');

export function getArrowCursorSprite(direction: 'up' | 'right' | 'down' | 'left'): HTMLCanvasElement {
  switch (direction) {
    case 'up': return arrowUpCursor;
    case 'right': return arrowRightCursor;
    case 'down': return arrowDownCursor;
    case 'left': return arrowLeftCursor;
  }
}

// === Wrench Cursor (Cached) ===
const wrenchCursorSprite: HTMLCanvasElement = document.createElement('canvas');
wrenchCursorSprite.width = 28;
wrenchCursorSprite.height = 28;

{
  const ctx = wrenchCursorSprite.getContext('2d')!;
  ctx.clearRect(0, 0, 28, 28);
  const cx = 14;
  const cy = 14;
  
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Create wrench path
  const wrenchPath = new Path2D();
  
  // Handle (vertical part)
  wrenchPath.moveTo(cx, cy + 8);
  wrenchPath.lineTo(cx, cy - 4);
  
  // Top jaw
  wrenchPath.moveTo(cx - 4, cy - 8);
  wrenchPath.lineTo(cx + 4, cy - 8);
  wrenchPath.lineTo(cx + 4, cy - 4);
  
  // Bottom jaw  
  wrenchPath.moveTo(cx - 4, cy - 4);
  wrenchPath.lineTo(cx - 4, cy - 8);

  // === Outline Layer ===
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 5;
  ctx.stroke(wrenchPath);

  // === Glowing Green Layer ===
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#00ff00';
  ctx.shadowBlur = 4;
  ctx.stroke(wrenchPath);

  // === Bright Center Dot ===
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#00ff00';
  ctx.beginPath();
  ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // === Cleanup ===
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
}

export function getWrenchCursorSprite(): HTMLCanvasElement {
  return wrenchCursorSprite;
}

// === Small Circle Cursor (Cached) ===
const smallCircleCursorSprite: HTMLCanvasElement = document.createElement('canvas');
smallCircleCursorSprite.width = 18;
smallCircleCursorSprite.height = 18;

{
  const ctx = smallCircleCursorSprite.getContext('2d')!;
  ctx.clearRect(0, 0, 18, 18);
  const center = 9;

  // === Bright Center Dot ===
  ctx.shadowBlur = 4;
  ctx.fillStyle = '#00ff00';
  ctx.beginPath();
  ctx.arc(center, center, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // === Cleanup ===
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
}

export function getSmallCircleCursorSprite(): HTMLCanvasElement {
  return smallCircleCursorSprite;
}