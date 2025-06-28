// src/rendering/cache/helpers/drawQuantumAttractor.ts

const SIZE = 32;
const CENTER = SIZE / 2;

export function drawQuantumAttractor(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, SIZE, SIZE);

  // === Outer glow ring ===
  const outerGradient = ctx.createRadialGradient(CENTER, CENTER, 4, CENTER, CENTER, CENTER);
  outerGradient.addColorStop(0.0, 'rgba(180, 255, 255, 0.6)');
  outerGradient.addColorStop(0.4, 'rgba(100, 200, 255, 0.2)');
  outerGradient.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = outerGradient;
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, CENTER - 1, 0, Math.PI * 2);
  ctx.fill();

  // === Core artifact: hexagon + glyph ===
  ctx.save();
  ctx.translate(CENTER, CENTER);
  ctx.rotate(Math.PI / 6);

  ctx.strokeStyle = '#33ffff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 / 6) * i;
    const x = Math.cos(angle) * 7;
    const y = Math.sin(angle) * 7;
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // === Central nucleus ===
  const coreGradient = ctx.createRadialGradient(CENTER, CENTER, 0, CENTER, CENTER, 6);
  coreGradient.addColorStop(0.0, '#00ffff');
  coreGradient.addColorStop(1.0, '#004466');

  ctx.fillStyle = coreGradient;
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // === Rotating "glyph ring" effect (static fake) ===
  ctx.save();
  ctx.translate(CENTER, CENTER);
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3;
    const x = Math.cos(angle) * 10;
    const y = Math.sin(angle) * 10;

    ctx.fillStyle = i % 2 === 0 ? '#00ccff' : '#99ffff';
    ctx.beginPath();
    ctx.arc(x, y, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  return canvas;
}
